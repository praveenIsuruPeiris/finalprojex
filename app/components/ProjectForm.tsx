'use client';

import { useEffect, useState } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import RichTextEditor from './RichTextEditor';
import { processFiles } from '../utils/processFiles'; // <- import the helper here
import Notification from './Notification';

interface ProjectFormProps {
  onSubmit: (formData: any) => void;
  loading: boolean;
  darkMode: boolean;
  created_by?: { id: string; first_name: string; last_name: string } | null;
}

// Create a wrapper component for the Autocomplete
const LocationAutocomplete = ({ value, onChange, onPlaceSelect }: { 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPlaceSelect: (autocomplete: google.maps.places.Autocomplete) => void;
}) => {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  return (
    <Autocomplete onLoad={setAutocomplete} onPlaceChanged={() => autocomplete && onPlaceSelect(autocomplete)}>
      <input
        type="text"
        name="location"
        placeholder="Search for a location"
        className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent px-4 py-2.5 transition-colors"
        value={value}
        onChange={onChange}
      />
    </Autocomplete>
  );
};

export default function ProjectForm({ onSubmit, loading, darkMode, created_by = null }: ProjectFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'ongoing',
    location: '',
    images: [] as { content: string; type: string; name: string }[],
  });

  const [errors, setErrors] = useState({
    title: '',
    description: '',
    location: '',
  });

  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'title':
        return value.trim() === '' ? 'Project title is required' : '';
      case 'description':
        return value.trim() === '' ? 'Project description is required' : '';
      case 'location':
        return value.trim() === '' ? 'Project location is required' : '';
      default:
        return '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleDescriptionChange = (html: string) => {
    setFormData((prev) => ({ ...prev, description: html }));
    const error = validateField('description', html);
    setErrors(prev => ({ ...prev, description: error }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxFileSize = 10 * 1024 * 1024;

    const { processedFiles, errors } = await processFiles(files, validTypes, maxFileSize);

    setFileErrors(errors);
    if (errors.length === 0) {
      // Create preview URL for the first image
      if (processedFiles.length > 0) {
        const previewUrl = `data:${processedFiles[0].type};base64,${processedFiles[0].content}`;
        setImagePreview(previewUrl);
      }

      setFormData((prev) => ({
        ...prev,
        images: processedFiles,
      }));
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

    setFormData((prev) => ({ ...prev, location: formattedLocation }));
    const error = validateField('location', formattedLocation);
    setErrors(prev => ({ ...prev, location: error }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors = {
      title: validateField('title', formData.title),
      description: validateField('description', formData.description),
      location: validateField('location', formData.location),
    };
    
    setErrors(newErrors);

    // Check if there are any errors
    if (Object.values(newErrors).some(error => error !== '')) {
      return;
    }

    onSubmit(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 mt-4"
    >
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Project Title
        </label>
        <input
          type="text"
          name="title"
          className={`mt-1 block w-full rounded-lg border ${
            errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          } bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent px-4 py-2.5 transition-colors`}
          onChange={handleInputChange}
          required
          placeholder="Enter your project title"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.title}</p>
        )}
      </div>

      {/* Project Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Project Image
        </label>
        <div className="mt-1 flex items-center gap-4">
          <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Project image preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                <span className="text-gray-400 dark:text-gray-500 text-sm">No image</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
              onChange={handleFileChange}
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Recommended: 800x600px, max 10MB
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Project Description
        </label>
        <div className={`mt-1 rounded-lg border ${
          errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
        } overflow-hidden`}>
          <RichTextEditor
            value={formData.description}
            onChange={handleDescriptionChange}
            darkMode={darkMode}
          />
        </div>
        {errors.description && (
          <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.description}</p>
        )}
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Project Location
        </label>
        <div className="space-y-2">
          <LocationAutocomplete
            value={formData.location}
            onChange={handleInputChange}
            onPlaceSelect={handlePlaceSelect}
          />
          {errors.location && (
            <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.location}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            You can either select from suggestions or type your own location
          </p>
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Project Status
        </label>
        <select
          name="status"
          className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent px-4 py-2.5 transition-colors"
          onChange={handleInputChange}
        >
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Project Creator */}
      {created_by && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Project Creator
          </label>
          <div className="flex items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
            <svg className="inline-block w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {created_by.first_name} {created_by.last_name}
            </span>
          </div>
        </div>
      )}

      {/* Show file errors */}
      {fileErrors.length > 0 && (
        <div className="mt-2 space-y-1">
          {fileErrors.map((err, idx) => (
            <p key={idx} className="text-sm text-red-500 dark:text-red-400">
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Show selected file names */}
      {formData.images.length > 0 && (
        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
          {formData.images.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    images: prev.images.filter((_, i) => i !== idx)
                  }));
                }}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        className={`w-full flex justify-center py-3 px-4 rounded-lg shadow-md text-sm font-medium text-white transition-colors ${
          loading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
        }`}
        disabled={loading}
      >
        {loading ? 'Creating Project...' : 'Create Project'}
      </button>
    </form>
  );
}
