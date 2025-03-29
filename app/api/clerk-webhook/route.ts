import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // ⚠️ Temporarily disable signature check for local development
    console.log("Skipping Clerk signature verification for testing...");

    const body = await req.json();
    console.log("Received Webhook Data:", body);

    const { id, email_addresses, first_name, last_name, image_url } = body.data;

    // Directus API Config
    const apiUrl = process.env.DIRECTUS_API_URL || "http://crm.lahirupeiris.com";
    const apiToken = process.env.DIRECTUS_API_TOKEN;

    if (!apiUrl || !apiToken) {
      console.error("❌ Missing Directus API configuration");
      return NextResponse.json({ error: "Missing Directus API configuration" }, { status: 500 });
    }

    // Sync user to Directus
    const directusResponse = await fetch(`${apiUrl}/items/directus_users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clerk_id: id,
        email: email_addresses?.[0]?.email_address || "",
        first_name: first_name || "",
        last_name: last_name || "",
        profile_image: image_url || "",
      }),
    });

    if (!directusResponse.ok) {
      const errorText = await directusResponse.text();
      console.error("❌ Failed to sync user with Directus:", errorText);
      return NextResponse.json({ error: "Directus user sync failed" }, { status: 500 });
    }

    console.log("✅ User synced successfully with Directus!");
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("❌ Internal Server Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
