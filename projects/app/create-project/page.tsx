'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function CreateProjectPage() {
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    location: string;
    status: string;
    images: File[];
  }>({
    title: '',
    description: '',
    location: '',
    status: 'ongoing',
    images: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const newFileErrors: string[] = [];
    const validFiles = Array.from(files).filter((file) => {
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

    setFormData({ ...formData, images: validFiles });
  };

  const uploadImages = async (files: File[]): Promise<string[]> => {
    const formDataFiles = new FormData();
    files.forEach((file) => formDataFiles.append('file', file));
  
    try {
      const response = await fetch('/api/proxy/files', {
        method: 'POST',
        body: formDataFiles,
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`File upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
  
      const data = await response.json();
      return data.data.map((file: { id: string }) => file.id);
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error('An error occurred while uploading files.');
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Upload images first
      let uploadedImageIds: string[] = [];
      if (formData.images.length > 0) {
        uploadedImageIds = await uploadImages(formData.images);
      }

      // Submit project data to the API
      const response = await fetch('/api/create-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          location: formData.location,
          status: formData.status,
          images: uploadedImageIds, // Pass the uploaded image IDs
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create project.');
      }

      alert('Project created successfully!');
      router.push('/'); // Redirect to homepage or projects list
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow bg-gray-100 py-10">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800">Create a New Project</h1>
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
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                name="title"
                id="title"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                onChange={handleInputChange}
                required
              ></textarea>
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <input
                type="text"
                name="location"
                id="location"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                name="status"
                id="status"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                onChange={handleInputChange}
              >
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div>
              <label htmlFor="images" className="block text-sm font-medium text-gray-700">
                Images (JPEG, PNG, GIF, WEBP | Max: 10MB)
              </label>
              <input
                type="file"
                name="images"
                id="images"
                accept="image/*"
                multiple
                className="mt-1 block w-full"
                onChange={handleFileChange}
              />
              {formData.images.length > 0 && (
                <ul className="mt-2">
                  {formData.images.map((file) => (
                    <li key={file.name} className="text-gray-500 text-sm">
                      {file.name} - {(file.size / 1024 / 1024).toFixed(2)} MB
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
              ) : (
                'Submit'
              )}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
