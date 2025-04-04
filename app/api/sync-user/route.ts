import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    console.log("📩 Incoming User Sync Request...");

    // Parse the request body
    const body = await req.json();
    console.log("Received User Data:", body);

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

    // Clean up API URL (remove trailing slashes)
    apiUrl = apiUrl.replace(/\/+$/, "");

    console.log(`🔍 Checking if user already exists for Clerk ID: ${clerkId}...`);

    // Check if the user already exists in Directus
    const checkUserResponse = await fetch(
      `${apiUrl}/items/users?filter[clerk_id][_eq]=${encodeURIComponent(clerkId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!checkUserResponse.ok) {
      const errorText = await checkUserResponse.text();
      console.error(`❌ Failed to check for existing user: ${errorText}`);
      return NextResponse.json({ error: "Failed to check for existing user" }, { status: 500 });
    }

    const existingUserData = await checkUserResponse.json();

    if (existingUserData?.data?.length > 0) {
      console.log(`✅ User already exists with Directus ID: ${existingUserData.data[0].id}`);
      return NextResponse.json({ 
        success: true, 
        message: "User already exists.",
        directusId: existingUserData.data[0].id
      }, { status: 200 });
    }

    console.log("🔄 Creating new user in Directus...");

    // Generate a username if not provided
    const generatedUsername = username || email.split("@")[0];
    
    // Create user in Directus
    const directusResponse = await fetch(`${apiUrl}/items/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clerk_id: clerkId,
        email: email,
        username: generatedUsername,
        first_name: firstName || "",
        last_name: lastName || "",
        profile_image: profileImage || "",
      }),
    });

    if (!directusResponse.ok) {
      const responseText = await directusResponse.text();
      console.error(`❌ Failed to create user in Directus: ${responseText}`);
      return NextResponse.json({ error: responseText }, { status: directusResponse.status });
    }

    const newUserData = await directusResponse.json();
    console.log(`✅ User created successfully in Directus with ID: ${newUserData.data.id}`);
    
    return NextResponse.json({ 
      success: true, 
      message: "User created successfully",
      directusId: newUserData.data.id
    }, { status: 200 });

  } catch (error) {
    console.error("❌ Internal Server Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}