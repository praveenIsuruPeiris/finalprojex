import React, { useState } from 'react';
import Link from 'next/link';
/* eslint-disable */

export type ProjectCardProps = {
  id: string;
  title: string;
  description: string;
  status: string;
  location: string;
  createdAt: string | null;
  images?: Array<number | { id: string }>;
};

export default function ProjectCard({
  id,
  title,
  description,
  status,
  location,
  createdAt,
  images = [],
}: ProjectCardProps) {
  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_API_URL || 'https://crm.lahirupeiris.com';
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  let firstImageId = images.length > 0 
    ? (typeof images[0] === 'object' 
        ? images[0].id 
        : images[0]) 
    : null;
  const imageUrl = firstImageId ? `${directusUrl}/assets/${firstImageId}` : 'https://dummyimage.com/320x180';

  // Improved date formatting
  let formattedDate = 'Unknown Date';
  if (createdAt) {
    try {
      const date = new Date(createdAt);
      if (!isNaN(date.getTime())) {
        formattedDate = new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(date);
      }
    } catch (error) {
      console.error('Error formatting date:', error);
    }
  }

  return (
    <Link href={`/projects-feed/${id}`} className="block">
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
        {/* Image Section */}
        <div className="relative w-full h-48">
          <img 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Image failed to load:', imageUrl);
              // Try without the /assets/ path
              const alternativeUrl = `${directusUrl}/${firstImageId}`;
              console.log('Trying alternative URL:', alternativeUrl);
              (e.target as HTMLImageElement).src = alternativeUrl;
              setImageError(true);
            }}
          />
          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4">
          <div className="flex justify-between items-start">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
          </div>

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
                e.preventDefault();
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="text-blue-500 text-sm mt-1 self-start hover:underline"
            >
              {expanded ? 'Show Less' : 'Read More'}
            </button>
          )}

          {/* Project Metadata */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {status}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <svg className="inline-block w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {location}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              <svg className="inline-block w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formattedDate}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}