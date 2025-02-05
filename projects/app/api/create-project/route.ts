import { NextResponse } from 'next/server';

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { title, description, status, location, images } = body;

    const apiUrl = process.env.DIRECTUS_API_URL;
    const apiToken = process.env.DIRECTUS_API_TOKEN;

    // Validate environment variables
    if (!apiUrl || !apiToken) {
      console.error('Missing API configuration: Ensure DIRECTUS_API_URL and DIRECTUS_API_TOKEN are set.');
      return NextResponse.json({ error: 'Missing API configuration' }, { status: 500 });
    }

    // Validate required fields
    if (!title || !description || !status || !location) {
      console.error('Missing required fields:', { title, description, status, location });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let uploadedImageIds: string[] = [];

    if (images?.length) {
      // Separate new images (objects with file data) from existing image IDs (strings)
      const newImages = images.filter((img: any) => typeof img === 'object');
      const existingImageIds = images.filter((img: any) => typeof img === 'string');

      // Start with the existing IDs
      uploadedImageIds = [...existingImageIds];

      if (newImages.length > 0) {
        // Validate new image file objects
        const invalidFiles = newImages.filter((file: any) => !file.content || !file.type || !file.name);
        if (invalidFiles.length > 0) {
          console.error('Invalid file data in images:', invalidFiles);
          return NextResponse.json(
            { error: 'Invalid file data: Each new image must include content, type, and name.' },
            { status: 400 }
          );
        }

        try {
          const formData = createFormData(newImages);
          const uploadResponse = await fetch(`${apiUrl}/files`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiToken}`,
            },
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('File upload failed:', errorText);
            return NextResponse.json(
              { error: 'File upload failed' },
              { status: uploadResponse.status }
            );
          }

          const uploadData = await uploadResponse.json();

          // Process the response: it could be an array or an object
          if (Array.isArray(uploadData.data)) {
            uploadedImageIds = uploadedImageIds.concat(
              uploadData.data.map((file: { id: string }) => file.id)
            );
          } else if (uploadData.data?.id) {
            uploadedImageIds.push(uploadData.data.id);
          } else {
            console.error('Unexpected upload response structure:', uploadData);
            throw new Error('Unexpected response structure from file upload API.');
          }
        } catch (uploadError) {
          console.error('Error during image upload:', uploadError);
          return NextResponse.json({ error: 'Image upload process failed' }, { status: 500 });
        }
      }
    }

    // Create the project using the combined image IDs
    try {
      const projectResponse = await fetch(`${apiUrl}/items/projects`, {
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
          images: uploadedImageIds.map((id) => ({ directus_files_id: id })),
        }),
      });

      if (!projectResponse.ok) {
        const errorText = await projectResponse.text();
        console.error('Project creation failed:', errorText);
        return NextResponse.json({ error: 'Project creation failed' }, { status: projectResponse.status });
      }

      const projectData = await projectResponse.json();
      return NextResponse.json(projectData, { status: 200 });
    } catch (projectError) {
      console.error('Error during project creation:', projectError);
      return NextResponse.json({ error: 'Project creation process failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to create FormData for file uploads
function createFormData(files: { content: string; type: string; name: string }[]): FormData {
  const formData = new FormData();

  files.forEach((file, index) => {
    // This check should pass since newImages have been validated above.
    if (!file.content || !file.type || !file.name) {
      throw new Error(`Invalid file data at index ${index}: Missing content, type, or name.`);
    }

    const blob = new Blob([Buffer.from(file.content, 'base64')], {
      type: file.type,
    });
    formData.append('file', blob, file.name);
  });

  return formData;
}
