import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Request body:', body);

    const { title, description, status, location, images } = body;

    const apiUrl = 'http://127.0.0.1:8055';
    const apiToken = process.env.DIRECTUS_API_TOKEN;

    // Validate API configuration
    if (!apiUrl || !apiToken) {
      console.error('Missing API configuration');
      return NextResponse.json({ error: 'Missing API configuration' }, { status: 500 });
    }

    // Handle image uploads if provided
    let uploadedImageIds: string[] = [];
    if (images && Array.isArray(images) && images.length > 0) {
      const uploadResponse = await fetch(`${apiUrl}/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        body: createFormData(images), // Helper function to create FormData
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Image upload failed:', errorText);
        return NextResponse.json(
          { error: `Image upload failed: ${uploadResponse.statusText}` },
          { status: uploadResponse.status }
        );
      }

      const uploadData = await uploadResponse.json();
      uploadedImageIds = uploadData.data.map((file: { id: string }) => file.id);
    }

    // Create the project in Directus
    const response = await fetch(`${apiUrl}/items/projects`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        description,
        status,
        location,
        images: uploadedImageIds, // Attach uploaded image IDs to the project
      }),
    });

    console.log('Directus response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error Response from Directus:', errorText);
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    console.log('Project created successfully:', data);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to create FormData for file uploads
function createFormData(files: File[]): FormData {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('file', file);
  });
  return formData;
}
