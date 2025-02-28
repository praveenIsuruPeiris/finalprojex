import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    console.log("📩 Incoming Webhook Request...");

    // Parse the request body
    const body = await req.json();
    console.log("Received Webhook Data:", body);

    // Destructure using correct field names
    const { clerkId, email, username, firstName, lastName, profileImage } = body;

    if (!clerkId || !email) {
      console.error("❌ Missing required user fields!");
      return NextResponse.json({ error: "Missing required user fields" }, { status: 400 });
    }

    // Directus API Config
    const apiUrl = process.env.DIRECTUS_API_URL || "http://crm.lahirupeiris.com";
    const apiToken = process.env.DIRECTUS_API_TOKEN;

    if (!apiUrl || !apiToken) {
      console.error("❌ Missing Directus API configuration");
      return NextResponse.json({ error: "Missing Directus API configuration" }, { status: 500 });
    }

    console.log("🔄 Syncing user with Directus...");

    // Make API request to Directus to create/update user
    const directusResponse = await fetch(`${apiUrl}/items/directus_users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clerk_id: clerkId,
        email: email,
        username: username || email.split("@")[0], // Fallback if username is missing
        first_name: firstName || "",
        last_name: lastName || "",
        profile_image: profileImage || "",
      }),
    });

    const responseText = await directusResponse.text(); // Capture error text if needed

    if (!directusResponse.ok) {
      console.error("❌ Failed to sync user with Directus:", responseText);
      return NextResponse.json({ error: responseText }, { status: directusResponse.status });
    }

    console.log("✅ User synced successfully with Directus!");
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("❌ Internal Server Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
