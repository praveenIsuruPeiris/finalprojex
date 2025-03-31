/* eslint-disable */

// app/api/get-all-users/route.ts

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(
      `${process.env.DIRECTUS_API_URL}/items/users?fields=id,username,first_name,last_name`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Directus API error:', errorText);
      return NextResponse.json(
        { message: `Failed to fetch users: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Ensure we have the correct data structure
    if (!data || !Array.isArray(data.data)) {
      console.error('Invalid data structure from Directus:', data);
      return NextResponse.json(
        { message: 'Invalid response format from server' },
        { status: 500 }
      );
    }

    return NextResponse.json({ users: data.data });
  } catch (error) {
    console.error('Error in get-all-users:', error);
    return NextResponse.json(
      { message: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
