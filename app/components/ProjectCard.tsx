import React, { useState } from 'react';
/* eslint-disable */

export type ProjectCardProps = {
  title: string;
  description: string;
  status: string;
  location: string;
  createdAt: string | null;
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
  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_API_URL || 'https://crm.lahirupeiris.com';
  const [expanded, setExpanded] = useState(false);

  let firstImageId = images.length > 0 ? (typeof images[0] === 'object' ? images[0].id : images[0]) : null;
  const imageUrl = firstImageId ? `${directusUrl}/assets/${firstImageId}` : 'https://dummyimage.com/320x180';

  // ✅ Ensure valid date formatting
  let formattedDate = 'Unknown Date';
  if (createdAt) {
    const parsedDate = new Date(createdAt);
    if (!isNaN(parsedDate.getTime())) {
      formattedDate = parsedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Image Section */}
      <div className="relative w-full h-48">
        <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
      </div>

      {/* Content Section */}
      <div className="p-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>

        {/* Rich Text Description with Read More */}
        <div 
          className="text-sm text-gray-600 dark:text-gray-300 mt-2 overflow-hidden transition-all duration-300"
          dangerouslySetInnerHTML={{
            __html: expanded 
              ? description 
              : description.length > 120 
                ? `${description.slice(0, 120)}...` 
                : description
          }}
        />

        {/* Read More Toggle (Only if the description is long) */}
        {description.length > 120 && (
          <button
            onClick={(e) => {
              e.preventDefault(); // Prevents navigation when clicking Read More
              setExpanded(!expanded);
            }}
            className="text-blue-500 text-sm mt-1 self-start hover:underline"
          >
            {expanded ? 'Show Less' : 'Read More'}
          </button>
        )}

        {/* Project Metadata */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2"><strong>Status:</strong> {status}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400"><strong>Location:</strong> {location}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4"><strong>Created At:</strong> {formattedDate}</p>
      </div>
    </div>
  );
}
