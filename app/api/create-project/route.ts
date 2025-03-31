/* eslint-disable */

import { NextResponse, NextRequest } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    console.log("📩 Incoming Project Creation Request...");

    // Authenticate the user using Clerk's getAuth function with NextRequest
    const { userId: clerkId } = getAuth(req);

    if (!clerkId) {
      console.error("❌ Unauthorized: No user ID found.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, status, location, images } = body;

    const apiUrl = process.env.DIRECTUS_API_URL;
    const apiToken = process.env.DIRECTUS_API_TOKEN;

    if (!apiUrl || !apiToken) {
      console.error('❌ Missing API configuration.');
      return NextResponse.json({ error: 'Missing API configuration' }, { status: 500 });
    }

    if (!title || !description || !status || !location) {
      console.error('❌ Missing required fields:', { title, description, status, location });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`🔍 Fetching Directus user ID for Clerk ID: ${clerkId}...`);

    // Fetch Directus user by Clerk ID
    const userResponse = await fetch(
      `${apiUrl}/items/users?filter[clerk_id][_eq]=${encodeURIComponent(clerkId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!userResponse.ok) {
      console.error('❌ Failed to fetch Directus user ID:', await userResponse.text());
      return NextResponse.json({ error: 'Failed to fetch Directus user ID' }, { status: 500 });
    }

    const userData = await userResponse.json();

    if (!userData?.data?.length) {
      console.error('❌ No Directus user found for Clerk ID:', clerkId);
      return NextResponse.json({ error: 'No Directus user found' }, { status: 404 });
    }

    const directusUserId = userData.data[0].id;
    console.log(`✅ Mapped Clerk ID to Directus User ID: ${directusUserId}`);

    let uploadedImageIds: string[] = [];

    if (images?.length) {
      const newImages = images.filter((img: any) => typeof img === 'object');
      const existingImageIds = images.filter((img: any) => typeof img === 'string');
      uploadedImageIds = [...existingImageIds];

      if (newImages.length > 0) {
        const invalidFiles = newImages.filter((file: any) => !file.content || !file.type || !file.name);
        if (invalidFiles.length > 0) {
          console.error('❌ Invalid file data:', invalidFiles);
          return NextResponse.json(
            { error: 'Invalid file data: Each image must include content, type, and name.' },
            { status: 400 }
          );
        }

        try {
          const formData = createFormData(newImages);
          const uploadResponse = await fetch(`${apiUrl}/files`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiToken}` },
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('❌ File upload failed:', errorText);
            return NextResponse.json({ error: 'File upload failed' }, { status: uploadResponse.status });
          }

          const uploadData = await uploadResponse.json();
          if (Array.isArray(uploadData.data)) {
            uploadedImageIds = uploadedImageIds.concat(
              uploadData.data.map((file: { id: string }) => file.id)
            );
          } else if (uploadData.data?.id) {
            uploadedImageIds.push(uploadData.data.id);
          } else {
            console.error('❌ Unexpected upload response structure:', uploadData);
            throw new Error('Unexpected response structure from file upload API.');
          }
        } catch (uploadError) {
          console.error('❌ Error during image upload:', uploadError);
          return NextResponse.json({ error: 'Image upload process failed' }, { status: 500 });
        }
      }
    }

    // Create the project with the authenticated user as the creator
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
        created_by: directusUserId,
      }),
    });

    if (!projectResponse.ok) {
      const errorText = await projectResponse.text();
      console.error('❌ Project creation failed:', errorText);
      return NextResponse.json({ error: 'Project creation failed' }, { status: projectResponse.status });
    }

    const projectData = await projectResponse.json();
    const projectId = projectData.data.id;

    console.log('✅ Project created successfully with ID:', projectId);

    // Automatically add the creator as an admin to the project
    console.log('🔄 Adding user to the project as admin...');

    const projectUserResponse = await fetch(`${apiUrl}/items/Projects_Users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        user_id: directusUserId,
        role: 'admin',
        subscribed: true
      }),
    });
    
    if (!projectUserResponse.ok) {
      const errorText = await projectUserResponse.text();
      console.error('❌ Failed to add user as admin:', errorText);
      return NextResponse.json({ error: 'Failed to assign project admin' }, { status: projectUserResponse.status });
    }
    
    console.log('✅ User assigned as project admin successfully!');
    return NextResponse.json({ success: true, projectId }, { status: 200 });

  } catch (error) {
    console.error('❌ Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to create FormData for file uploads
function createFormData(files: { content: string; type: string; name: string }[]): FormData {
  const formData = new FormData();

  files.forEach((file, index) => {
    if (!file.content || !file.type || !file.name) {
      throw new Error(`Invalid file data at index ${index}: Missing content, type, or name.`);
    }

    const blob = new Blob([Buffer.from(file.content, 'base64')], { type: file.type });
    formData.append('file', blob, file.name);
  });

  return formData;
}
