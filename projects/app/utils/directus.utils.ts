// directus.utils.ts
const FILE_MAX_SIZE = 10 * 1024 * 1024; // 10MB in bytes

export async function uploadFiles(
  files: File[],
  validTypes: string[],
  directusUrl: string,
  token: string
): Promise<{ fileIds: string[]; errors: string[] }> {
  const errors: string[] = [];
  const validFiles: File[] = [];

  // Validate files
  files.forEach((file) => {
    if (!validTypes.includes(file.type)) {
      errors.push(`Unsupported file type: ${file.name}`);
    } else if (file.size > FILE_MAX_SIZE) {
      errors.push(`File too large (max 10MB): ${file.name}`);
    } else {
      validFiles.push(file);
    }
  });

  if (errors.length > 0) return { fileIds: [], errors };

  try {
    const uploadPromises = validFiles.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      // Add required fields for Directus file upload
      const fileTitle = `Journal Image - ${file.name}`;
      formData.append('title', fileTitle);
      formData.append('folder', 'journal_images'); // Optional: specify a folder

      const uploadRes = await fetch(`${directusUrl}/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorBody = await uploadRes.text();
        throw new Error(`Upload failed: ${uploadRes.status} - ${errorBody}`);
      }

      // Try to read the response text
      const responseText = await uploadRes.text();

      let fileId: string | undefined;
      if (!responseText) {
        // Fallback: Query for the file by title if the response is empty.
        console.warn(
          'Upload succeeded but response was empty. Attempting fallback query...'
        );
        const queryRes = await fetch(
          `${directusUrl}/files?filter[title][_eq]=${encodeURIComponent(fileTitle)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!queryRes.ok) {
          const queryError = await queryRes.text();
          throw new Error(
            `Fallback query failed: ${queryRes.status} - ${queryError}`
          );
        }

        const queryData = await queryRes.json();
        if (queryData?.data && queryData.data.length > 0) {
          fileId = queryData.data[0].id;
        } else {
          throw new Error('Fallback query returned no file data.');
        }
      } else {
        // Parse the response JSON
        let fileData;
        try {
          fileData = JSON.parse(responseText).data;
        } catch (e) {
          throw new Error(`Failed to parse response as JSON: ${e}`);
        }
        fileId = fileData?.id;
      }

      if (!fileId) {
        throw new Error('No file ID obtained after upload.');
      }
      return fileId;
    });

    const fileIds = (await Promise.all(uploadPromises)).filter(Boolean) as string[];
    return { fileIds, errors: [] };

  } catch (err) {
    console.error('File upload error:', err);
    return {
      fileIds: [],
      errors: ['Failed to upload files. Check console for details.']
    };
  }
}
