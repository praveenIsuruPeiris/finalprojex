/* eslint-disable */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// GET all projects
export async function GET() {
  try {
    const apiUrl = process.env.DIRECTUS_API_URL;
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

// Create a new project
export async function POST(request: NextRequest) {
  try {
    const projectData = await request.json();
    const apiUrl = process.env.DIRECTUS_API_URL;
    const apiToken = process.env.DIRECTUS_ADMIN_TOKEN;

    if (!apiUrl || !apiToken) {
      return NextResponse.json({ error: 'Missing API configuration' }, { status: 500 });
    }

    const response = await fetch(`${apiUrl}/items/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ message: error.errors?.[0]?.message || 'Failed to create project' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ id: data.data.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ message: 'Failed to create project' }, { status: 500 });
  }
}

// Update an existing project (expects an ID in the URL)
export async function PATCH(request: NextRequest) {
  try {
    const apiUrl = process.env.DIRECTUS_API_URL;
    const apiToken = process.env.DIRECTUS_ADMIN_TOKEN;

    if (!apiUrl || !apiToken) {
      return NextResponse.json({ error: 'Missing API configuration' }, { status: 500 });
    }

    const projectData = await request.json();
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const response = await fetch(`${apiUrl}/items/projects/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ message: error.errors?.[0]?.message || 'Failed to update project' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ id: data.data.id }, { status: 200 });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ message: 'Failed to update project' }, { status: 500 });
  }
}

// Delete a project
export async function DELETE(request: NextRequest) {
  try {
    const apiUrl = process.env.DIRECTUS_API_URL;
    const apiToken = process.env.DIRECTUS_ADMIN_TOKEN;

    if (!apiUrl || !apiToken) {
      return NextResponse.json({ error: 'Missing API configuration' }, { status: 500 });
    }

    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const response = await fetch(`${apiUrl}/items/projects/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ message: error.errors?.[0]?.message || 'Failed to delete project' }, { status: response.status });
    }

    return NextResponse.json({ message: 'Project deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ message: 'Failed to delete project' }, { status: 500 });
  }
}