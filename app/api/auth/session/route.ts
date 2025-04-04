import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const { userId } = getAuth(request as any);
  const userData = await request.json();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user from Directus
    const response = await fetch(
      `${process.env.DIRECTUS_API_URL}/items/users?filter[clerk_id][_eq]=${userId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
        },
      }
    );

    const data = await response.json();
    let user = data.data?.[0];

    // If user doesn't exist in Directus, create them
    if (!user) {
      console.log("❌ No Directus user found, creating one now...");
      
      const createResponse = await fetch(
        `${process.env.DIRECTUS_API_URL}/items/users`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clerk_id: userId,
            email: userData.email,
            username: userData.username || userData.email.split("@")[0],
            first_name: userData.firstName || "",
            last_name: userData.lastName || "",
            profile_image: userData.profileImage || "",
          }),
        }
      );

      if (!createResponse.ok) {
        console.error("❌ Failed to create Directus user:", await createResponse.text());
        return NextResponse.json(
          { error: 'Failed to create Directus user' },
          { status: 500 }
        );
      }

      const newUserData = await createResponse.json();
      user = newUserData.data;
      console.log("✅ Created new Directus user:", user.id);
    }

    // Create session cookie
    const cookieStore = await cookies();
    cookieStore.set('session', JSON.stringify({
      userId: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      profileImage: user.profile_image,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('session');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing session:', error);
    return NextResponse.json(
      { error: 'Failed to clear session' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session');
    
    if (!session) {
      return NextResponse.json({ error: 'No active session' }, { status: 401 });
    }

    return NextResponse.json(JSON.parse(session.value));
  } catch (error) {
    console.error('Error getting session:', error);
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
} 