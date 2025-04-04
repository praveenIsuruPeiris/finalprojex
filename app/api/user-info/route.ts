// This file uses getAuth from @clerk/nextjs/server for server-side authentication
import { NextResponse, NextRequest } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_DIRECTUS_API_URL;
    const apiToken = process.env.DIRECTUS_API_TOKEN;

    if (!apiUrl || !apiToken) {
      throw new Error('Directus API configuration missing');
    }

    // First, try to find the user in the Directus users collection
    const response = await fetch(
      `${apiUrl}/items/users?filter[clerk_id][_eq]=${userId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.errors?.[0]?.message || `Failed to fetch user: ${response.status}`);
    }

    // If user exists in Directus, return their information
    if (data.data && data.data.length > 0) {
      return NextResponse.json(data.data[0]);
    }

    // If user doesn't exist in Directus, return a basic structure with the Clerk ID
    return NextResponse.json({
      id: userId,
      clerk_id: userId,
      first_name: '',
      last_name: '',
    });
  } catch (error) {
    console.error('❌ Error in GET /api/user-info:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch user information' },
      { status: 500 }
    );
  }
} 