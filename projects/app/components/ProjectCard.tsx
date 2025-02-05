import React from 'react';

export type ProjectCardProps = {
  title: string;
  description: string;
  status: string;
  location: string;
  createdAt: string;
  images?: Array<number | { id: string }>;
};

export default function ProjectCard({
  title,
  description,
  status,
  location,
  createdAt,
  images = [],
}: ProjectCardProps) {
  const directusUrl = process.env.DIRECTUS_API_URL || 'http://localhost:8055';

  let firstImageId: string | number | undefined;
  if (images.length > 0) {
    const firstImage = images[0];
    if (typeof firstImage === 'number') {
      firstImageId = firstImage;
    } else if (typeof firstImage === 'object' && firstImage.id) {
      firstImageId = firstImage.id;
    }
  }

  const imageUrl = images.length > 0 && firstImageId
    ? `${directusUrl}/assets/${firstImageId}`
    : 'https://dummyimage.com/320x180';

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="relative w-full h-48">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = 'https://dummyimage.com/320x180';
          }}
        />
      </div>
      <div className="p-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 line-clamp-2">{title}</h2>
        <div className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-3"
  dangerouslySetInnerHTML={{ __html: description }} 
/> 

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          <strong>Status:</strong> {status}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          <strong>Location:</strong> {location}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
          <strong>Created At:</strong> {new Date(createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
