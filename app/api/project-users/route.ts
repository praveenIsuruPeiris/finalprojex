import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const projectUserData = await request.json();

    const response = await fetch(
      `${process.env.DIRECTUS_API_URL}/items/Projects_Users`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
        },
        body: JSON.stringify(projectUserData),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { message: error.errors?.[0]?.message || 'Failed to create project user relationship' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ id: data.data.id });
  } catch (error) {
    console.error('Error in create project user:', error);
    return NextResponse.json(
      { message: 'Failed to create project user relationship' },
      { status: 500 }
    );
  }
} 