import { NextResponse, NextRequest } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    console.log("📩 Incoming Add User to Project Request...");

    // Authenticate the request using Clerk's getAuth function
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) {
      console.error("❌ Unauthorized: No user ID found.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the request body expecting { projectId, username }
    const body = await req.json();
    const { projectId, username } = body;
    if (!projectId || !username) {
      console.error("❌ Missing required fields: projectId or username", body);
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Use private environment variables (not NEXT_PUBLIC) for server-side Directus access.
    const apiUrl = process.env.DIRECTUS_API_URL;
    const apiToken = process.env.DIRECTUS_API_TOKEN;
    if (!apiUrl || !apiToken) {
      console.error("❌ Missing API configuration.");
      return NextResponse.json({ error: "Missing API configuration" }, { status: 500 });
    }

    // 1. Fetch the user by username from Directus
    console.log(`🔍 Fetching user by username: ${username}...`);
    const userRes = await fetch(
      `${apiUrl}/items/users?filter[username][_eq]=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!userRes.ok) {
      const errorText = await userRes.text();
      console.error("❌ Failed to fetch user:", errorText);
      return NextResponse.json({ error: "Failed to fetch user" }, { status: userRes.status });
    }

    const userData = await userRes.json();
    if (!userData?.data?.length) {
      console.error("❌ User not found for username:", username);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userObj = userData.data[0];
    const userId = userObj.id;
    console.log(`✅ Found user: ${username} with Directus ID: ${userId}`);

    // 2. Check if the user is already added to the project
    console.log(`🔍 Checking if user ${userId} is already added to project ${projectId}...`);
    const membershipCheckRes = await fetch(
      `${apiUrl}/items/Projects_Users?filter[project_id][_eq]=${projectId}&filter[user_id][_eq]=${userId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!membershipCheckRes.ok) {
      const errorText = await membershipCheckRes.text();
      console.error("❌ Failed to check project membership:", errorText);
      return NextResponse.json({ error: "Failed to check membership" }, { status: membershipCheckRes.status });
    }
    const membershipData = await membershipCheckRes.json();
    if (membershipData.data && membershipData.data.length > 0) {
      console.error("❌ User is already added to the project");
      return NextResponse.json({ error: "User is already added to the project" }, { status: 409 });
    }

    // 3. Create the project membership record
    // Instead of fetching a role ID, we'll use a literal "member"
    console.log(`🔄 Adding user ${userId} to project ${projectId} as a member...`);
    const membershipRes = await fetch(`${apiUrl}/items/Projects_Users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project_id: projectId,
        user_id: userId,
        role: "member", // Use the string "member" here
        subscribed: false,
      }),
    });

    const membershipText = await membershipRes.text();
    console.log("Membership response:", membershipText);

    if (!membershipRes.ok) {
      console.error("❌ Failed to add user to project as member.");
      return NextResponse.json({ error: "Failed to add user to project" }, { status: membershipRes.status });
    }

    console.log("✅ User added as project member successfully!");
    return NextResponse.json({ success: true, projectId }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Internal server error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
