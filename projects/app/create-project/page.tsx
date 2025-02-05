'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import RichTextEditor from '../components/RichTextEditor';

export default function CreateProjectPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    location: string;
    status: string;
    images: { content: string; type: string; name: string }[];
  }>({
    title: '',
    description: '',
    location: '',
    status: 'ongoing',
    images: [],
  });

  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  // Dark mode toggle
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  // Load theme from localStorage
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) return <p>Loading...</p>;
  if (!isSignedIn) return null;

  // Event handlers
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDescriptionChange = (html: string) => {
    setFormData(prev => ({ ...prev, description: html }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const newFileErrors: string[] = [];
    const validFiles: File[] = Array.from(files).filter(file => {
      if (!validImageTypes.includes(file.type)) {
        newFileErrors.push(`Unsupported file type: ${file.name}`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        newFileErrors.push(`File too large (max 10MB): ${file.name}`);
        return false;
      }
      return true;
    });

    setFileErrors(newFileErrors);
    if (newFileErrors.length > 0) return;

    try {
      const processedFiles = await Promise.all(
        validFiles.map(
          file =>
            new Promise<{ content: string; type: string; name: string }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                resolve({
                  content: result.split(',')[1],
                  type: file.type,
                  name: file.name,
                });
              };
              reader.onerror = error => reject(error);
              reader.readAsDataURL(file);
            })
        )
      );

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...processedFiles],
      }));
    } catch (error) {
      console.error('Error processing files:', error);
    }
  };
  const uploadImages = async (
    files: { content: string; type: string; name: string }[]
  ) => {
    const formDataFiles = new FormData();
    files.forEach(file => {
      const blob = new Blob([Buffer.from(file.content, 'base64')], { type: file.type });
      formDataFiles.append('file', blob, file.name);
    });

    const apiUrl = process.env.NEXT_PUBLIC_DIRECTUS_API_URL || 'http://127.0.0.1:8055';
    const apiToken = process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN;
    if (!apiUrl || !apiToken) {
      throw new Error('Missing API configuration');
    }

    const response = await fetch(`${apiUrl}/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      body: formDataFiles,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `File upload failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    if (!data.data) {
      throw new Error('Unexpected response structure: `data.data` is missing');
    }

    if (Array.isArray(data.data)) {
      return data.data.map((file: { id: string }) => file.id);
    } else if (typeof data.data === 'object' && data.data.id) {
      return [data.data.id];
    } else {
      throw new Error(
        'Unexpected response structure: `data.data` is not an array or valid object'
      );
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalLoading(true);
    setError(null);

    try {
      let uploadedImageIds: string[] = [];
      if (formData.images.length > 0) {
        uploadedImageIds = await uploadImages(formData.images);
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        status: formData.status,
        images: uploadedImageIds,
      };

      const response = await fetch('/api/create-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to create project.');
      }

      alert('Project created successfully!');
      router.push('/');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      console.error('Error during submission:', errorMessage);
      setError(errorMessage);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar />
      <main className="flex-grow py-10">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Create a New Project
          </h1>
          {error && <p className="text-red-500 mt-4">{error}</p>}
          {fileErrors.length > 0 && (
            <ul className="text-red-500 mt-4">
              {fileErrors.map((fileError, index) => (
                <li key={index}>{fileError}</li>
              ))}
            </ul>
          )}
          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Title
              </label>
              <input
                type="text"
                name="title"
                id="title"
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Description
              </label>
              <RichTextEditor
                value={formData.description}
                onChange={handleDescriptionChange}
                darkMode={darkMode}
              />
            </div>
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Location
              </label>
              <input
                type="text"
                name="location"
                id="location"
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Status
              </label>
              <select
                name="status"
                id="status"
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                onChange={handleInputChange}
              >
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="images"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Images (JPEG, PNG, GIF, WEBP | Max: 10MB)
              </label>
              <input
                type="file"
                name="images"
                id="images"
                accept="image/*"
                multiple
                className="mt-1 block w-full text-gray-700 dark:text-gray-300"
                onChange={handleFileChange}
              />
              {formData.images.length > 0 && (
                <ul className="mt-2">
                  {formData.images.map((file, index) => (
                    <li key={index} className="text-gray-500 dark:text-gray-400 text-sm">
                      {file.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="submit"
              disabled={localLoading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                localLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {localLoading ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        </div>
      </main>
      <Footer  />
    </div>
  );
}