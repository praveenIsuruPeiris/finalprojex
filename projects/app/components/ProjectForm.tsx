'use client';

import { useEffect, useState } from 'react';
import { Autocomplete, LoadScript } from '@react-google-maps/api';
import RichTextEditor from './RichTextEditor';

interface ProjectFormProps {
  onSubmit: (formData: any) => void;
  loading: boolean;
  darkMode: boolean;
}

export default function ProjectForm({ onSubmit, loading, darkMode }: ProjectFormProps) {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'ongoing',
    location: '', //string
    images: [] as { content: string; type: string; name: string }[],
  });
  

  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDescriptionChange = (html: string) => {
    setFormData(prev => ({ ...prev, description: html }));
  };

  const handlePlaceSelect = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      let country = '', state = '', city = '';
  
      place.address_components?.forEach(component => {
        if (component.types.includes('country')) country = component.long_name;
        if (component.types.includes('administrative_area_level_1')) state = component.long_name;
        if (component.types.includes('locality')) city = component.long_name;
      });
  
      // Format the location string properly (remove empty values)
      const locationArray = [city, state, country].filter(Boolean);
      const formattedLocation = locationArray.join(', ');
  
      setFormData(prev => ({ ...prev, location: formattedLocation }));
    }
  };
  

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const newErrors: string[] = [];
    const validFiles: File[] = [];

    Array.from(files).forEach(file => {
      if (!validTypes.includes(file.type)) {
        newErrors.push(`Unsupported file type: ${file.name}`);
      } else if (file.size > 10 * 1024 * 1024) {
        newErrors.push(`File too large (max 10MB): ${file.name}`);
      } else {
        validFiles.push(file);
      }
    });

    setFileErrors(newErrors);
    if (newErrors.length > 0) return;

    try {
      const processedFiles = await Promise.all(
        validFiles.map(file =>
          new Promise<{ content: string; type: string; name: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ content: (reader.result as string).split(',')[1], type: file.type, name: file.name });
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
          })
        )
      );

      setFormData(prev => ({ ...prev, images: [...prev.images, ...processedFiles] }));
    } catch (error) {
      console.error('Error processing files:', error);
    }
  };

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(formData); }} className="space-y-6 mt-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
        <input type="text" name="title" className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-2" onChange={handleInputChange} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
        <RichTextEditor value={formData.description} onChange={handleDescriptionChange} darkMode={darkMode} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
        <LoadScript googleMapsApiKey={googleApiKey} libraries={['places']}>
          <Autocomplete onLoad={setAutocomplete} onPlaceChanged={handlePlaceSelect}>
            <input type="text" placeholder="Select location" className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-2" />
          </Autocomplete>
        </LoadScript>
       <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
  Selected: {formData.location || 'No location selected'}
</p>

      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
        <select name="status" className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-2" onChange={handleInputChange}>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Images (JPEG, PNG, GIF, WEBP | Max: 10MB)</label>
        <input type="file" accept="image/*" multiple className="mt-1 block w-full text-gray-700 dark:text-gray-300 px-4 py-2" onChange={handleFileChange} />
        {fileErrors.length > 0 && fileErrors.map((err, idx) => <p key={idx} className="text-red-500">{err}</p>)}
        {formData.images.length > 0 && formData.images.map((file, idx) => <p key={idx} className="text-sm text-gray-700 dark:text-gray-300">{file.name}</p>)}
      </div>
      <button type="submit" className={`w-full flex justify-center py-2 px-4 rounded-lg shadow-md text-sm font-medium text-white ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`} disabled={loading}>
        {loading ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
