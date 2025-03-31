// app/api/projects/[id]/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log('Fetching project with ID:', id);

    if (!process.env.NEXT_PUBLIC_DIRECTUS_API_URL) {
      throw new Error('Directus API URL is not configured');
    }

    if (!process.env.DIRECTUS_Admin_TOKEN) {
      throw new Error('Directus admin token is not configured');
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/projects/${id}?fields=*,images.directus_files_id.*`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DIRECTUS_Admin_TOKEN}`,
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
    );

    const responseText = await response.text();
    
    if (responseText.trim().startsWith('<!DOCTYPE')) {
      throw new Error('Invalid API response: received HTML instead of JSON');
    }

    const data = JSON.parse(responseText);

    if (!response.ok) {
      throw new Error(data.errors?.[0]?.message || `Failed to fetch project: ${response.status}`);
    }
    
    if (!data.data) {
      throw new Error('No project data received');
    }

    const project = {
      ...data.data,
      images: (data.data.images || [])
        .map((item: any) => ({
          id: typeof item === 'string' ? item : item.directus_files_id?.id || item.directus_files_id
        }))
        .filter(Boolean)
    };

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error in GET /api/projects/[id]:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!process.env.NEXT_PUBLIC_DIRECTUS_API_URL) {
      throw new Error('Directus API URL is not configured');
    }

    if (!process.env.DIRECTUS_Admin_TOKEN) {
      throw new Error('Directus admin token is not configured');
    }

    const body = await request.json();
    const { title, description, status, location, images } = body;

    // Verify project exists
    const getResponse = await fetch(
      `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/projects/${id}`,
      { headers: { 'Authorization': `Bearer ${process.env.DIRECTUS_Admin_TOKEN}` } }
    );

    if (!getResponse.ok) {
      throw new Error('Project not found');
    }

    // Update project
    const updateResponse = await fetch(
      `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/projects/${id}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.DIRECTUS_Admin_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          status,
          location,
          images: images.map((img: any) => img.id),
        }),
      }
    );

    const data = await updateResponse.json();

    if (!updateResponse.ok) {
      throw new Error(data.errors?.[0]?.message || `Failed to update project: ${updateResponse.status}`);
    }

    return NextResponse.json({
      ...data.data,
      images: (data.data.images || []).map((item: any) => ({
        id: typeof item === 'string' ? item : item.directus_files_id?.id || item.directus_files_id
      })).filter(Boolean)
    });

  } catch (error) {
    console.error('Error in PATCH /api/projects/[id]:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!process.env.NEXT_PUBLIC_DIRECTUS_API_URL) {
      throw new Error('Directus API URL is not configured');
    }

    if (!process.env.DIRECTUS_Admin_TOKEN) {
      throw new Error('Directus admin token is not configured');
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/projects/${id}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${process.env.DIRECTUS_Admin_TOKEN}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Deletion failed: ${response.status}`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in DELETE /api/projects/[id]:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Deletion failed' },
      { status: 500 }
    );
  }
}