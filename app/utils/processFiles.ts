/**
 * processFiles()
 *
 * @param files - The file list to process
 * @param validTypes - An array of valid MIME types (e.g., image/jpeg)
 * @param maxSize - Maximum file size in bytes
 * @returns { processedFiles, errors }
 */
export async function processFiles(
    files: FileList,
    validTypes: string[],
    maxSize = 10 * 1024 * 1024
  ): Promise<{
    processedFiles: { content: string; type: string; name: string }[];
    errors: string[];
  }> {
    const newErrors: string[] = [];
    const validFiles: File[] = [];
  
    // 1. Validate each file
    Array.from(files).forEach((file) => {
      if (!validTypes.includes(file.type)) {
        newErrors.push(`Unsupported file type: ${file.name}`);
      } else if (file.size > maxSize) {
        newErrors.push(`File too large (max 10MB): ${file.name}`);
      } else {
        validFiles.push(file);
      }
    });
  
    // If there are any errors, return immediately
    if (newErrors.length > 0) {
      return { processedFiles: [], errors: newErrors };
    }
  
    // 2. Convert each valid file to base64
    const processedFiles = await Promise.all(
      validFiles.map(
        (file) =>
          new Promise<{ content: string; type: string; name: string }>(
            (resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({
                  content: (reader.result as string).split(',')[1],
                  type: file.type,
                  name: file.name,
                });
              reader.onerror = (error) => reject(error);
              reader.readAsDataURL(file);
            }
          )
      )
    );
  
    return { processedFiles, errors: [] };
  }
  