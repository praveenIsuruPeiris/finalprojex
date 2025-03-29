import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    console.log("📩 Incoming Webhook Request...");

    // Parse the request body
    const body = await req.json();
    console.log("Received Webhook Data:", body);

    const { clerkId, email, username, firstName, lastName, profileImage } = body;

    if (!clerkId || !email) {
      console.error("❌ Missing required user fields!");
      return NextResponse.json({ error: "Missing required user fields" }, { status: 400 });
    }

    let apiUrl = process.env.DIRECTUS_API_URL || "http://crm.lahirupeiris.com";
    const apiToken = process.env.DIRECTUS_API_TOKEN;

    if (!apiUrl || !apiToken) {
      console.error("❌ Missing Directus API configuration");
      return NextResponse.json({ error: "Missing Directus API configuration" }, { status: 500 });
    }

    apiUrl = apiUrl.replace(/\/+$/, "");

    console.log("🔍 Checking if user already exists...");

    // Check if the user already exists in Directus
    const checkUserResponse = await fetch(
      `${apiUrl}/items/users?filter[clerk_id][_eq]=${clerkId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const existingUserData = await checkUserResponse.json();

    if (existingUserData?.data?.length > 0) {
      console.log("✅ User already exists. Skipping creation.");
      return NextResponse.json({ success: true, message: "User already exists." }, { status: 200 });
    }

    console.log("🔄 Syncing user with Directus...");

    const directusResponse = await fetch(`${apiUrl}/items/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clerk_id: clerkId,
        email: email,
        username: username || email.split("@")[0],
        first_name: firstName || "",
        last_name: lastName || "",
        profile_image: profileImage || "",
      }),
    });

    const responseText = await directusResponse.text();

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