import { useState } from 'react';
import { HiX } from 'react-icons/hi';

interface ImageUploadProps {
  images: File[];
  setImages: (images: File[]) => void;
  existingImages: { id: string }[];
  setExistingImages: (images: { id: string }[]) => void;
}

export default function ImageUpload({
  images,
  setImages,
  existingImages,
  setExistingImages,
}: ImageUploadProps) {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages([...images, ...files]);

    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls([...previewUrls, ...newPreviewUrls]);
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);

    URL.revokeObjectURL(previewUrls[index]);
    const newPreviewUrls = [...previewUrls];
    newPreviewUrls.splice(index, 1);
    setPreviewUrls(newPreviewUrls);
  };

  const removeExistingImage = (index: number) => {
    const newExistingImages = [...existingImages];
    newExistingImages.splice(index, 1);
    setExistingImages(newExistingImages);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {existingImages.map((image, index) => (
          <div key={image.id} className="relative group">
            <img
              src={`${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/assets/${image.id}`}
              alt={`Existing image ${index + 1}`}
              className="w-32 h-32 object-cover rounded-lg"
            />
            <button
              onClick={() => removeExistingImage(index)}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <HiX className="w-4 h-4" />
            </button>
          </div>
        ))}

        {previewUrls.map((url, index) => (
          <div key={url} className="relative group">
            <img
              src={url}
              alt={`Preview ${index + 1}`}
              className="w-32 h-32 object-cover rounded-lg"
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