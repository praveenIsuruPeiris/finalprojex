'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button, Label, TextInput, Select } from 'flowbite-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Autocomplete } from '@react-google-maps/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Notification from '../components/Notification';
import ImageUpload from '../components/ImageUpload';
import GoogleMapsWrapper from '../components/GoogleMapsWrapper';

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  location: string;
  latitude: number;
  longitude: number;
  images: { id: string }[];
}

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
}

const LocationInput = ({ value, onChange }: LocationInputProps) => {
  return (
    <Autocomplete
      onLoad={(autocomplete) => {
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.formatted_address) {
            onChange(place.formatted_address);
          }
        });
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg w-full rounded-lg px-4 py-2"
        placeholder="Enter project location"
      />
    </Autocomplete>
  );
};

function EditProjectContent() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');

  const [formData, setFormData] = useState({
    title: '',
    status: 'ongoing',
    location: '',
  });
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<{ id: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg',
      },
    },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) {
        router.push('/profile/projects');
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch project');
        }
        const data = await response.json();
        
        setProject(data);
        setFormData({
          title: data.title || '',
          status: data.status || 'ongoing',
          location: data.location || '',
        });
        
        // Transform the images data structure
        const transformedImages = (data.images || [])
          .map((item: any) => {
            if (typeof item === 'string') {
              return { id: item };
            }
            if (item.directus_files_id) {
              return { id: item.directus_files_id.id || item.directus_files_id };
            }
            return null;
          })
          .filter((img: any) => img !== null);
        
        setExistingImages(transformedImages);
        
        if (editor && data.description) {
          editor.commands.setContent(data.description);
        }
      } catch (error) {
        console.error('Error fetching project:', error);
        setError(error instanceof Error ? error.message : 'Failed to load project data');
        setNotification({
          message: error instanceof Error ? error.message : 'Failed to load project data',
          type: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (mounted && user) {
      fetchProjectData();
    }
  }, [projectId, mounted, router, user, editor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const uploadedImages = await Promise.all(
        images.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to upload image');
          }

          const data = await response.json();
          return { directus_files_id: data.id };
        })
      );

      const allImages = [...existingImages.map(img => ({ directus_files_id: img.id })), ...uploadedImages];

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          description: editor?.getHTML() || '',
          images: allImages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update project');
      }

      setNotification({
        message: 'Project updated successfully!',
        type: 'success'
      });

      setTimeout(() => {
        router.push('/profile/projects');
      }, 1500);
    } catch (error) {
      console.error('Error updating project:', error);
      setError(error instanceof Error ? error.message : 'Failed to update project');
      setNotification({
        message: error instanceof Error ? error.message : 'Failed to update project',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted || !isLoaded) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-8"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Edit Project</h1>
          
          {error && (
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
            <GoogleMapsWrapper>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="title" className="text-gray-900 dark:text-white text-lg">Title</Label>
                  <TextInput
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
                    placeholder="Enter project title"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-gray-900 dark:text-white text-lg">Description</Label>
                  <div className="mt-2">
                    <EditorContent editor={editor} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="status" className="text-gray-900 dark:text-white text-lg">Status</Label>
                  <Select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
                  >
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="location" className="text-gray-900 dark:text-white text-lg">Location</Label>
                  <LocationInput
                    value={formData.location}
                    onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
                  />
                </div>

                <div>
                  <Label className="text-gray-900 dark:text-white text-lg">Images</Label>
                  <ImageUpload
                    images={images}
                    setImages={setImages}
                    existingImages={existingImages}
                    setExistingImages={setExistingImages}
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-6">
                  <Button
                    type="button"
                    gradientDuoTone="redToPink"
                    onClick={() => router.back()}
                    size="lg"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    gradientDuoTone="purpleToBlue"
                    disabled={isLoading}
                    size="lg"
                  >
                    {isLoading ? 'Saving...' : 'Update Project'}
                  </Button>
                </div>
              </form>
            </GoogleMapsWrapper>
          </div>
        </div>
      </div>
      <Footer />
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}

export default function EditProject() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditProjectContent />
    </Suspense>
  );
} 