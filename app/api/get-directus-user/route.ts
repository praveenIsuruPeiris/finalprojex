import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { clerkId } = await request.json();

    const response = await fetch(
      `${process.env.DIRECTUS_API_URL}/items/users?filter[clerk_id][_eq]=${clerkId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch user from Directus');
    }

    const data = await response.json();
    if (!data.data || data.data.length === 0) {
      return NextResponse.json(
        { message: 'User not found in Directus' },
        { status: 404 }
      );
    }

    return NextResponse.json({ directusId: data.data[0].id });
  } catch (error) {
    console.error('Error in get-directus-user:', error);
    return NextResponse.json(
      { message: 'Failed to get user ID' },
      { status: 500 }
    );
  }
} 