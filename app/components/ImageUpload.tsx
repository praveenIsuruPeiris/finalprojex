import { useState, useEffect } from 'react';
import { HiX } from 'react-icons/hi';

interface ImageUploadProps {
  images: File[];
  setImages: (images: File[]) => void;
  existingImages: { id: string }[];
  setExistingImages: (images: { id: string }[]) => void;
}

interface PreviewImage {
  url: string;
  id: string;
  file: File;
}

export default function ImageUpload({
  images,
  setImages,
  existingImages,
  setExistingImages,
}: ImageUploadProps) {
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});
  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_API_URL || 'https://crm.lahirupeiris.com';

  // Cleanup URLs when component unmounts or previews change
  useEffect(() => {
    return () => {
      previewImages.forEach(preview => URL.revokeObjectURL(preview.url));
    };
  }, [previewImages]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Create previews for new files
    const newPreviews = files.map(file => ({
      url: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9),
      file: file
    }));

    // Update both states
    setImages([...images, ...files]);
    setPreviewImages([...previewImages, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previewImages[index].url);
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previewImages.filter((_, i) => i !== index);
    setImages(newImages);
    setPreviewImages(newPreviews);
  };

  const removeExistingImage = (index: number) => {
    const newExistingImages = existingImages.filter((_, i) => i !== index);
    setExistingImages(newExistingImages);
  };

  const handleImageError = (imageId: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('Image failed to load:', `${directusUrl}/assets/${imageId}`);
    // Try without the /assets/ path
    const alternativeUrl = `${directusUrl}/${imageId}`;
    console.log('Trying alternative URL:', alternativeUrl);
    (e.target as HTMLImageElement).src = alternativeUrl;
    setImageErrors(prev => ({ ...prev, [imageId]: true }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {existingImages.map((image, index) => (
          <div 
            key={`existing-${image.id || `temp-${index}-${Math.random().toString(36).substr(2, 9)}`}`} 
            className="relative group"
          >
            {!imageErrors[image.id] ? (
              <img
                src={`${directusUrl}/assets/${image.id}?width=128&height=128&fit=cover`}
                alt={`Existing image ${index + 1}`}
                className="w-32 h-32 object-cover rounded-lg"
                onError={(e) => handleImageError(image.id, e)}
              />
            ) : (
              <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <button
              onClick={() => removeExistingImage(index)}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <HiX className="w-4 h-4" />
            </button>
          </div>
        ))}

        {previewImages.map((preview, index) => (
          <div key={`preview-${preview.id}`} className="relative group">
            <img
              src={preview.url}
              alt={`Preview ${index + 1}`}
              className="w-32 h-32 object-cover rounded-lg"
              onError={(e) => {
                console.error('Error loading preview image:', e);
              }}
            />
            <button
              onClick={() => removeImage(index)}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <HiX className="w-4 h-4" />
            </button>
          </div>
        ))}

        <div className="w-32 h-32 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <label className="cursor-pointer w-full h-full flex items-center justify-center">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="hidden"
            />
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Add images</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
} 