'use client';

import { useEffect, useState } from 'react';
import { Autocomplete, LoadScript } from '@react-google-maps/api';
import RichTextEditor from './RichTextEditor';
import { processFiles } from '../utils/processFiles'; // <- import the helper here

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
    location: '',
    images: [] as { content: string; type: string; name: string }[],
  });

  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDescriptionChange = (html: string) => {
    setFormData((prev) => ({ ...prev, description: html }));
  };

  const handlePlaceSelect = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      let country = '',
        state = '',
        city = '';

      place.address_components?.forEach((component) => {
        if (component.types.includes('country')) country = component.long_name;
        if (component.types.includes('administrative_area_level_1')) state = component.long_name;
        if (component.types.includes('locality')) city = component.long_name;
      });

      const locationArray = [city, state, country].filter(Boolean);
      const formattedLocation = locationArray.join(', ');

      setFormData((prev) => ({ ...prev, location: formattedLocation }));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // 1. Define which file types and max size
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxFileSize = 10 * 1024 * 1024;

    // 2. Use the helper function to process & validate
    const { processedFiles, errors } = await processFiles(files, validTypes, maxFileSize);

    // 3. Update state accordingly
    setFileErrors(errors);
    if (errors.length === 0) {
      // Only update formData if no errors
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...processedFiles],
      }));
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(formData);
      }}
      className="space-y-6 mt-4"
    >
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Title
        </label>
        <input
          type="text"
          name="title"
          className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-2"
          onChange={handleInputChange}
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description
        </label>
        <RichTextEditor
          value={formData.description}
          onChange={handleDescriptionChange}
          darkMode={darkMode}
        />
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Location
        </label>
        <LoadScript googleMapsApiKey={googleApiKey} libraries={['places']}>
          <Autocomplete onLoad={setAutocomplete} onPlaceChanged={handlePlaceSelect}>
            <input
              type="text"
              placeholder="Select location"
              className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-2"
            />
          </Autocomplete>
        </LoadScript>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Selected: {formData.location || 'No location selected'}
        </p>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Status
        </label>
        <select
          name="status"
          className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-2"
          onChange={handleInputChange}
        >
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Images (JPEG, PNG, GIF, WEBP | Max: 10MB)
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          className="mt-1 block w-full text-gray-700 dark:text-gray-300 px-4 py-2"
          onChange={handleFileChange}
        />

        {/* Show file errors */}
        {fileErrors.length > 0 &&
          fileErrors.map((err, idx) => (
            <p key={idx} className="text-red-500">
              {err}
            </p>
          ))}

        {/* Show selected file names */}
        {formData.images.length > 0 &&
          formData.images.map((file, idx) => (
            <p key={idx} className="text-sm text-gray-700 dark:text-gray-300">
              {file.name}
            </p>
          ))}
      </div>

      {/* Submit */}
      <button
        type="submit"
        className={`w-full flex justify-center py-2 px-4 rounded-lg shadow-md text-sm font-medium text-white ${
          loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
        }`}
        disabled={loading}
      >
        {loading ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
