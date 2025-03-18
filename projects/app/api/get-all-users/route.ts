/* eslint-disable */

// app/api/get-all-users/route.ts

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_API_URL;
    const token = process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN;

    if (!directusUrl || !token) {
      return NextResponse.json({ error: 'Directus API configuration missing' }, { status: 500 });
    }

    // Fetch all users from Directus
    const res = await fetch(`${directusUrl}/items/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: res.status });
    }

    const data = await res.json();
    // Assuming Directus returns an object with a "data" key containing the users array.
    return NextResponse.json({ users: data.data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
