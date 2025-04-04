import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
/* eslint-disable */

export type ProjectCardProps = {
  id: string;
  title: string;
  description: string;
  status: string;
  location: string;
  createdAt: string | null;
  images?: Array<number | { id: string }>;
  created_by?: { id: string; first_name: string; last_name: string } | null;
};

export default function ProjectCard({
  id,
  title,
  description,
  status,
  location,
  createdAt,
  images = [],
  created_by = null,
}: ProjectCardProps) {
  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_API_URL || 'https://crm.lahirupeiris.com';
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { userId: clerkId } = useAuth();

  let firstImageId = images.length > 0 
    ? (typeof images[0] === 'object' 
        ? images[0].id 
        : images[0]) 
    : null;
  const imageUrl = firstImageId ? `${directusUrl}/assets/${firstImageId}` : 'https://dummyimage.com/320x180';

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        if (!clerkId || !id) return;

        const response = await fetch(`/api/user-role?projectId=${id}`);
        if (!response.ok) throw new Error('Failed to fetch user role');

        const data = await response.json();
        setUserRole(data.role || null);
      } catch (err: any) {
        console.error('Error fetching user role:', err.message);
      }
    };

    fetchUserRole();
  }, [id, clerkId]);

  // Check if user has admin or editor role
  const isAdminOrEditor = userRole === 'admin' || userRole === 'editor';

  // Handle share functionality
  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (navigator.share) {
      navigator.share({
        title: title || 'Project',
        url: `${window.location.origin}/projects-feed/${id}`,
      })
      .catch(err => console.error('Error sharing:', err));
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(`${window.location.origin}/projects-feed/${id}`)
        .then(() => alert('Link copied to clipboard!'))
        .catch(err => console.error('Error copying to clipboard:', err));
    }
    setShowMenu(false);
  };

  // Handle edit functionality
  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = `/profile/manage-projects?edit=${id}`;
    setShowMenu(false);
  };

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
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
        {/* Image Section */}
        <div className="relative w-full h-56">
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
          
          {/* Three-dot menu */}
          <div className="absolute top-2 right-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1.5 rounded-full bg-gray-900/60 text-white hover:bg-gray-900 transition-colors"
              aria-label="More options"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            
            {/* Dropdown menu */}
            {showMenu && (
              <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700">
                {isAdminOrEditor && (
                  <button
                    onClick={handleEdit}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Project
                  </button>
                )}
                <button
                  onClick={handleShare}
                  className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share Project
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5 flex-grow flex flex-col">
          <div className="flex justify-between items-start">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
          </div>

          {/* Rich Text Description with Read More */}
          <div 
            className="text-sm text-gray-600 dark:text-gray-300 mt-2 overflow-hidden transition-all duration-300 flex-grow"
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
          <div className="mt-4 space-y-3">
            <div className="flex items-center">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {status}
              </span>
            </div>
            <div className="flex flex-col space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {location}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formattedDate}
              </p>
              
              {/* Project Creator */}
              {created_by && (
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  By {created_by.first_name} {created_by.last_name}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}