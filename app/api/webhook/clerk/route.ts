import { NextResponse } from "next/server";
import * as crypto from "crypto";

export async function POST(req: Request) {
  try {
    // Read the raw request body
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    console.log("📩 Received Clerk Webhook Data:", body);

    // Extract Clerk signature from headers
    const clerkSignature = req.headers.get("clerk-signature");
    if (!clerkSignature) {
      console.error("❌ Missing Clerk signature");
      return NextResponse.json({ error: "Missing Clerk signature" }, { status: 400 });
    }

    // Verify the signature
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) {
      console.error("❌ Missing Clerk webhook secret");
      return NextResponse.json({ error: "Missing Clerk webhook secret" }, { status: 500 });
    }

    const timestamp = clerkSignature.split(",")[0].split("=")[1];
    const signature = clerkSignature.split(",")[1].split("=")[1];

    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(`${timestamp}.${rawBody}`);
    const expectedSignature = hmac.digest("hex");

    if (signature !== expectedSignature) {
      console.error("❌ Invalid Clerk signature");
      return NextResponse.json({ error: "Invalid Clerk signature" }, { status: 400 });
    }

    // Check the webhook event type
    const eventType = body.type;
    console.log(`🔍 Processing Clerk webhook event: ${eventType}`);

    // Only process user creation events
    if (eventType !== 'user.created') {
      console.log(`⏭️ Skipping non-user creation event: ${eventType}`);
      return NextResponse.json({ success: true, message: "Event skipped" }, { status: 200 });
    }

    const { id, email_addresses, first_name, last_name, image_url, username } = body.data;
    console.log(`👤 Processing user: ${id} (${email_addresses?.[0]?.email_address || 'No email'})`);

    // Directus API Config
    const apiUrl = process.env.DIRECTUS_API_URL || "http://crm.lahirupeiris.com";
    const apiToken = process.env.DIRECTUS_API_TOKEN;

    if (!apiUrl || !apiToken) {
      console.error("❌ Missing Directus API configuration");
      return NextResponse.json({ error: "Missing Directus API configuration" }, { status: 500 });
    }

    // Check if user already exists in Directus
    console.log("🔍 Checking if user already exists in Directus...");
    const checkUserResponse = await fetch(
      `${apiUrl}/items/users?filter[clerk_id][_eq]=${id}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!checkUserResponse.ok) {
      const errorText = await checkUserResponse.text();
      console.error("❌ Failed to check for existing user:", errorText);
      return NextResponse.json({ error: "Failed to check for existing user" }, { status: 500 });
    }

    const existingUserData = await checkUserResponse.json();
    if (existingUserData?.data?.length > 0) {
      console.log("✅ User already exists in Directus. Skipping creation.");
      return NextResponse.json({ success: true, message: "User already exists" }, { status: 200 });
    }

    // Create user in Directus
    console.log("🔄 Creating user in Directus...");
    const directusResponse = await fetch(`${apiUrl}/items/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clerk_id: id,
        email: email_addresses?.[0]?.email_address || "",
        username: username || email_addresses?.[0]?.email_address?.split("@")[0] || "",
        first_name: first_name || "",
        last_name: last_name || "",
        profile_image: image_url || "",
      }),
    });

    if (!directusResponse.ok) {
      const errorText = await directusResponse.text();
      console.error("❌ Failed to create user in Directus:", errorText);
      return NextResponse.json({ error: "Directus user creation failed" }, { status: 500 });
    }

    console.log("✅ User created successfully in Directus!");
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("❌ Internal Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}