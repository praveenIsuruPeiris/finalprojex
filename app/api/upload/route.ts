import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_DIRECTUS_API_URL) {
      throw new Error('Directus API URL is not configured');
    }

    if (!process.env.DIRECTUS_Admin_TOKEN) {
      throw new Error('Directus admin token is not configured');
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400 }
      );
    }

    // Create a new FormData instance for the Directus API
    const directusFormData = new FormData();
    directusFormData.append('file', file);

    // Upload to Directus
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/files`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DIRECTUS_Admin_TOKEN}`,
        },
        body: directusFormData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Directus upload error:', errorText);
      throw new Error('Failed to upload file to Directus');
    }

    const data = await response.json();
    return NextResponse.json(data.data);
  } catch (error) {
    console.error('Error in upload:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to upload file' },
      { status: 500 }
    );
  }
} 