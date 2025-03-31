import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiUrl =process.env.DIRECTUS_API_URL;
    const apiToken = process.env.DIRECTUS_API_TOKEN;

    if (!apiUrl || !apiToken) {
      console.error('Missing API configuration');
      return NextResponse.json({ error: 'Missing API configuration' }, { status: 500 });
    }

    const response = await fetch(`${apiUrl}/items/projects`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Directus API Error:', errorText);
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const projectData = await request.json();

    const response = await fetch(
      `${process.env.DIRECTUS_API_URL}/items/projects`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
        },
        body: JSON.stringify(projectData),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { message: error.errors?.[0]?.message || 'Failed to create project' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ id: data.data.id });
  } catch (error) {
    console.error('Error in create project:', error);
    return NextResponse.json(
      { message: 'Failed to create project' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const projectData = await request.json();
    const { id } = projectData;

    const response = await fetch(
      `${process.env.DIRECTUS_API_URL}/items/projects/${id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
        },
        body: JSON.stringify(projectData),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { message: error.errors?.[0]?.message || 'Failed to update project' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ id: data.data.id });
  } catch (error) {
    console.error('Error in update project:', error);
    return NextResponse.json(
      { message: 'Failed to update project' },
      { status: 500 }
    );
  }
}
