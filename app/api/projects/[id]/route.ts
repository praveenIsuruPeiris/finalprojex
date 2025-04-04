/* eslint-disable */

import { NextResponse, NextRequest } from 'next/server';

export async function GET(req: NextRequest): Promise<Response> {
  try {
    console.log("📩 Fetching project...");

    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_DIRECTUS_API_URL;
    const apiToken = process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN;

    if (!apiUrl || !apiToken) {
      throw new Error('Directus API configuration missing');
    }

    const response = await fetch(
      `${apiUrl}/items/projects/${id}?fields=*,images.directus_files_id.*,created_by.id,created_by.first_name,created_by.last_name,created_by.username`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.errors?.[0]?.message || `Failed to fetch project: ${response.status}`);
    }

    return NextResponse.json(data.data);
  } catch (error) {
    console.error('❌ Error in GET /api/projects/[id]:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest): Promise<Response> {
  try {
    console.log("📩 Updating project...");

    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_DIRECTUS_API_URL;
    const apiToken = process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN;

    if (!apiUrl || !apiToken) {
      throw new Error('Directus API configuration missing');
    }

    const body = await req.json();
    const response = await fetch(`${apiUrl}/items/projects/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update project');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error updating project:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest): Promise<Response> {
  try {
    console.log("🗑️ Deleting project...");

    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_DIRECTUS_API_URL;
    const apiToken = process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN;

    if (!apiUrl || !apiToken) {
      throw new Error('Directus API configuration missing');
    }

    const response = await fetch(`${apiUrl}/items/projects/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.message || 'Failed to delete project' }, { status: response.status });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('❌ Error deleting project:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
