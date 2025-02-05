import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

export const runtime = 'nodejs'; // "nodejs" or "edge", but signature verification is easier on node.

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const DIRECTUS_ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN || '';
const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || '';

/**
 * Helper to create or update a Directus user by Clerk user data.
 * We'll store Clerk user IDs in a custom field `clerk_user_id`.
 */
async function upsertDirectusUser({
  clerkUserId,
  email,
  firstName,
  lastName,
  username,
}: {
  clerkUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
}) {
  // 1. Check if we already have a Directus user with clerk_user_id = clerkUserId
  const searchUrl = `${DIRECTUS_URL}/users?filter[clerk_user_id][_eq]=${clerkUserId}&limit=1`;
  const searchRes = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${DIRECTUS_ADMIN_TOKEN}`,
    },
  });

  if (!searchRes.ok) {
    throw new Error(
      `Failed to search Directus user with clerk_user_id=${clerkUserId}. Status: ${searchRes.status}`
    );
  }

  const searchData = await searchRes.json();
  const existingUser = searchData.data?.[0];

  // Prepare the body for either POST or PATCH
  const userPayload = {
    clerk_user_id: clerkUserId,
    email,
    first_name: firstName || '',
    last_name: lastName || '',
    username: username || '',
    // Optionally set a role if you want. e.g.:
    // role: "ab12cd34-ef56-..." 
  };

  if (!existingUser) {
    // 2. If not found, create a new Directus user (POST /users)
    const createRes = await fetch(`${DIRECTUS_URL}/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DIRECTUS_ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userPayload),
    });

    if (!createRes.ok) {
      const errorBody = await createRes.text();
      throw new Error(`Failed to create Directus user: ${errorBody}`);
    }
  } else {
    // 3. Otherwise, update the existing user (PATCH /users/:id)
    const userId = existingUser.id;
    const updateRes = await fetch(`${DIRECTUS_URL}/users/${userId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${DIRECTUS_ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userPayload),
    });

    if (!updateRes.ok) {
      const errorBody = await updateRes.text();
      throw new Error(`Failed to update Directus user: ${errorBody}`);
    }
  }
}

/**
 * Main webhook handler
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Read the raw request body so we can verify the signature.
    const rawBody = await req.text();

    // 2. Get Clerk signature header
    const signatureHeader = req.headers.get('clerk-signature');
    if (!signatureHeader) {
      throw new Error('Missing Clerk signature header');
    }

    // 3. Verify the signature with HMAC SHA-256
    const hmac = createHmac('sha256', CLERK_WEBHOOK_SECRET);
    hmac.update(rawBody);
    const expectedSignature = `sha256=${hmac.digest('hex')}`;

    if (signatureHeader !== expectedSignature) {
      throw new Error('Invalid Clerk signature');
    }

    // 4. Parse the JSON (now that we've read the raw body)
    const body = JSON.parse(rawBody);
    const { type, data } = body;

    // Ensure we only process user.created or user.updated
    if (!['user.created', 'user.updated'].includes(type)) {
      return NextResponse.json({ message: 'Event ignored' }, { status: 200 });
    }

    // Extract relevant user info from Clerk's payload
    const {
      id: clerkUserId,
      email_addresses,
      first_name,
      last_name,
      primary_email_address_id,
      username,
    } = data;

    // Find the primary email
    const primaryEmail = email_addresses?.find(
      (e: any) => e.id === primary_email_address_id
    );
    const email = primaryEmail?.email_address || '';

    // Now upsert the user in Directus
    await upsertDirectusUser({
      clerkUserId,
      email,
      firstName: first_name,
      lastName: last_name,
      username,
    });

    return NextResponse.json({ message: 'OK' }, { status: 200 });
  } catch (err: any) {
    console.error('Error in Clerk Webhook Handler:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
