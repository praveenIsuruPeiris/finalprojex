import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    const clerkId = user?.id;
    
    if (!clerkId) {
      return NextResponse.json({ role: null }, { status: 200 });
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Fetch the current user's Directus ID
    const directusResponse = await fetch(
      `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/users?filter[clerk_id][_eq]=${encodeURIComponent(clerkId)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!directusResponse.ok) {
      console.error('Error fetching Directus user:', await directusResponse.text());
      return NextResponse.json({ role: null }, { status: 200 });
    }

    const directusData = await directusResponse.json();
    const directusUserId = directusData.data[0]?.id;

    if (!directusUserId) {
      return NextResponse.json({ role: null }, { status: 200 });
    }

    // Fetch the user's role for the project
    const roleResponse = await fetch(
      `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/Projects_Users?filter[project_id][_eq]=${projectId}&filter[user_id][_eq]=${directusUserId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!roleResponse.ok) {
      console.error('Error fetching user role:', await roleResponse.text());
      return NextResponse.json({ role: null }, { status: 200 });
    }

    const roleData = await roleResponse.json();
    const role = roleData.data[0]?.role || null;

    return NextResponse.json({ role });
  } catch (error) {
    console.error('Error in user-role API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 