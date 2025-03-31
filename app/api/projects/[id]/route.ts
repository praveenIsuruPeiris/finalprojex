import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Fetching project with ID:', params.id);
    console.log('Using API URL:', process.env.NEXT_PUBLIC_DIRECTUS_API_URL);
    console.log('Admin token exists:', !!process.env.DIRECTUS_Admin_TOKEN);

    if (!process.env.NEXT_PUBLIC_DIRECTUS_API_URL) {
      throw new Error('Directus API URL is not configured');
    }

    if (!process.env.DIRECTUS_Admin_TOKEN) {
      throw new Error('Directus admin token is not configured');
    }

    const url = `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/projects/${params.id}?fields=*,images.directus_files_id.*`;
    console.log('Full URL:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.DIRECTUS_Admin_TOKEN}`,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // First try to get the response as text
    const responseText = await response.text();
    console.log('Raw response:', responseText);

    // If the response starts with <!DOCTYPE, it's HTML
    if (responseText.trim().startsWith('<!DOCTYPE')) {
      console.error('Received HTML response instead of JSON');
      throw new Error('Invalid API response: received HTML instead of JSON');
    }

    // Try to parse the response as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', e);
      throw new Error('Invalid JSON response from API');
    }

    if (!response.ok) {
      console.error('API error response:', data);
      throw new Error(data.errors?.[0]?.message || `Failed to fetch project: ${response.status}`);
    }
    
    if (!data.data) {
      throw new Error('No project data received from Directus');
    }

    // Transform the images data to match the expected format
    const project = {
      ...data.data,
      images: (data.data.images || [])
        .map((item: any) => {
          if (typeof item === 'string') {
            return { id: item };
          }
          if (item.directus_files_id) {
            return { id: item.directus_files_id.id || item.directus_files_id };
          }
          return null;
        })
        .filter((img: any) => img !== null)
    };

    console.log('Transformed project data:', project);
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
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!process.env.NEXT_PUBLIC_DIRECTUS_API_URL) {
      throw new Error('Directus API URL is not configured');
    }

    if (!process.env.DIRECTUS_Admin_TOKEN) {
      throw new Error('Directus admin token is not configured');
    }

    const body = await request.json();
    const { title, description, status, location, images } = body;

    console.log('Updating project with data:', {
      id: params.id,
      title,
      description,
      status,
      location,
      images,
    });

    // First, get the current project data to ensure it exists
    const getResponse = await fetch(
      `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/projects/${params.id}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DIRECTUS_Admin_TOKEN}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!getResponse.ok) {
      throw new Error('Project not found');
    }

    // Now update the project
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/projects/${params.id}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.DIRECTUS_Admin_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          status,
          location,
          images: images.map((img: any) => ({ directus_files_id: img.directus_files_id })),
        }),
      }
    );

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // First try to get the response as text
    const responseText = await response.text();
    console.log('Raw response:', responseText);

    // If the response starts with <!DOCTYPE, it's HTML
    if (responseText.trim().startsWith('<!DOCTYPE')) {
      console.error('Received HTML response instead of JSON');
      throw new Error('Invalid API response: received HTML instead of JSON');
    }

    // Try to parse the response as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', e);
      throw new Error('Invalid JSON response from API');
    }

    if (!response.ok) {
      console.error('API error response:', data);
      throw new Error(data.errors?.[0]?.message || `Failed to update project: ${response.status}`);
    }

    // Transform the images data to match the expected format
    const project = {
      ...data.data,
      images: (data.data.images || [])
        .map((item: any) => {
          if (typeof item === 'string') {
            return { id: item };
          }
          if (item.directus_files_id) {
            return { id: item.directus_files_id.id || item.directus_files_id };
          }
          return null;
        })
        .filter((img: any) => img !== null)
    };

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error in PATCH /api/projects/[id]:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to update project' },
      { status: 500 }
    );
  }
} 