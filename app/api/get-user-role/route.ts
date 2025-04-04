import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    const clerkId = user?.id;
    
    if (!clerkId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    // First get the user's Directus ID
    const userResponse = await fetch(
      `${process.env.DIRECTUS_API_URL}/items/users?filter[clerk_id][_eq]=${clerkId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!userResponse.ok) {
      return NextResponse.json({ message: 'Failed to fetch user' }, { status: userResponse.status });
    }

    const userData = await userResponse.json();
    const userId = userData.data[0]?.id;

    if (!userId) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Then get their role in the project
    const roleResponse = await fetch(
      `${process.env.DIRECTUS_API_URL}/items/Projects_Users?filter[project_id][_eq]=${projectId}&filter[user_id][_eq]=${userId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!roleResponse.ok) {
      return NextResponse.json({ message: 'Failed to fetch user role' }, { status: roleResponse.status });
    }

    const roleData = await roleResponse.json();
    const role = roleData.data[0]?.role || null;

    return NextResponse.json({ role });
  } catch (error) {
    console.error('Error in get-user-role:', error);
    return NextResponse.json(
      { message: 'Failed to get user role' },
      { status: 500 }
    );
  }
} 