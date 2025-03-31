'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button, Label, TextInput, Select } from 'flowbite-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Notification from '../components/Notification';
import ImageUpload from '../components/ImageUpload';
import GoogleMapsWrapper from '../components/GoogleMapsWrapper';
import { Autocomplete } from '@react-google-maps/api';

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  location: string;
  images: { id: string }[];
}

export default function EditProject() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');

  const [formData, setFormData] = useState({
    title: '',
    status: 'active',
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
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4 bg-white dark:bg-gray-700 rounded-lg',
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
        
        // Set the project data
        setProject(data);
        
        // Initialize form state with project data
        setFormData({
          title: data.title || '',
          status: data.status || 'active',
          location: data.location || '',
        });
        setExistingImages(data.images || []);
        
        // Set editor content
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
      // Upload new images first
      const uploadedImages = await Promise.all(
        images.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to upload image');
          }

          const data = await response.json();
          return { directus_files_id: data.id };
        })
      );

      // Combine existing and new image IDs
      const allImages = [...existingImages.map(img => ({ directus_files_id: img.id })), ...uploadedImages];

      // Update project with all images
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

      // Redirect after a short delay
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

  const handlePlaceSelect = (autocomplete: google.maps.places.Autocomplete) => {
    const place = autocomplete.getPlace();
    let country = '',
      state = '',
      city = '';

    place.address_components?.forEach((component: google.maps.GeocoderAddressComponent) => {
      if (component.types.includes('country')) country = component.long_name;
      if (component.types.includes('administrative_area_level_1')) state = component.long_name;
      if (component.types.includes('locality')) city = component.long_name;
    });

    const locationArray = [city, state, country].filter(Boolean);
    const formattedLocation = locationArray.join(', ');

    setFormData(prev => ({ ...prev, location: formattedLocation }));
  };

  if (!mounted || !isLoaded) {
    return null;
  }

  if (!user) {
    return null;
  }

  if (isLoading) {
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
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="location" className="text-gray-900 dark:text-white text-lg">Location</Label>
                <Autocomplete onLoad={(autocomplete) => {
                  autocomplete.addListener('place_changed', () => {
                    handlePlaceSelect(autocomplete);
                  });
                }}>
                  <TextInput
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    required
                    className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
                    placeholder="Enter project location"
                  />
                </Autocomplete>
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