/* eslint-disable */

import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, username } = await request.json();

    // First fetch the user by username
    const userResponse = await fetch(
      `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/users?filter[username][_eq]=${encodeURIComponent(username)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
        },
      }
    );

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user');
    }

    const userData = await userResponse.json();
    if (!userData.data || userData.data.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const targetUserId = userData.data[0].id;

    // Check if the user is already a member
    const checkResponse = await fetch(
      `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/Projects_Users?filter[project_id][_eq]=${projectId}&filter[user_id][_eq]=${targetUserId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
        },
      }
    );

    if (!checkResponse.ok) {
      throw new Error('Failed to check existing membership');
    }

    const existingMembership = await checkResponse.json();
    if (existingMembership.data && existingMembership.data.length > 0) {
      return NextResponse.json(
        { message: 'User is already a member of this project' },
        { status: 409 }
      );
    }

    // If not already a member, add them
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/Projects_Users`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
        },
        body: JSON.stringify({
          project_id: projectId,
          user_id: targetUserId,
          role: 'member',
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to add user to project');
    }

    return NextResponse.json({ message: 'User added successfully' });
  } catch (error) {
    console.error('Error adding user to project:', error);
    return NextResponse.json(
      { message: 'Failed to add user to project' },
      { status: 500 }
    );
  }
}

