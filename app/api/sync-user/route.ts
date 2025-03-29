import { NextResponse } from "next/server";
import * as crypto from "crypto";

export async function POST(req: Request) {
  try {
    // Read the raw request body
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    console.log("📩 Incoming Webhook Request...");
    console.log("Received Webhook Data:", body);

    // Check if in Dev Mode
    const isDevMode = process.env.NODE_ENV === "development";

    if (!isDevMode) {
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
    } else {
      console.log("⚠️ Skipping Clerk signature verification for development...");
    }

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