'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import CommentSection from '@/app/components/CommentSection';

/** Define your Project type. **/
type Project = {
  id: number;
  title: string;
  description: string;
  status: string;
  location: string;
  date_created: string;
  images: { id: string }[];
};

export default function ProjectDetails() {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track which image is currently being shown
  const [currentIndex, setCurrentIndex] = useState(0);

  // Grab the "id" from the URL
  const params = useParams();
  const projectId = params.id;

  useEffect(() => {
    if (!projectId) return;

    const fetchProject = async () => {
      try {
        const response = await fetch(
          `https://crm.lahirupeiris.com/items/projects/${projectId}?fields=*,images.directus_files_id`
        );
        if (!response.ok) throw new Error('Failed to fetch project');
        const data = await response.json();

        // Transform images if needed
        const transformedProject = {
          ...data.data,
          images: Array.isArray(data.data.images)
            ? data.data.images
                .map((item: any) =>
                  item.directus_files_id ? { id: item.directus_files_id } : null
                )
                .filter((img: any) => img && img.id)
            : [],
        };

        setProject(transformedProject);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  /**
   * Loading State
   */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  /**
   * Error State
   */
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="p-4 max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="text-red-500 dark:text-red-400 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="mt-4 font-medium">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  /**
   * No Project Found
   */
  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="p-4 max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mx-auto text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Project not found
          </p>
        </div>
      </div>
    );
  }

  /**
   * Handlers for Previous/Next arrows
   */
  const handlePrevImage = () => {
    setCurrentIndex(prev =>
      prev === 0 ? project.images.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentIndex(prev =>
      prev === project.images.length - 1 ? 0 : prev + 1
    );
  };

  /**
   * Main Content
   */
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Navbar />
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Main Image Section */}
          <div className="relative aspect-video bg-gray-200 dark:bg-gray-700">
            {project.images.length > 0 && (
              <>
                <img
                  src={`${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/assets/${project.images[currentIndex].id}`}

                  alt={project.title}
                  className="w-full h-full object-cover"
                />
                {project.images.length > 1 && (
                  <>
                    {/* Left Arrow */}
                    <button
                      type="button"
                      onClick={handlePrevImage}
                      className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-gray-900/60 text-white p-2 rounded-full hover:bg-gray-900 focus:outline-none"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>

                    {/* Right Arrow */}
                    <button
                      type="button"
                      onClick={handleNextImage}
                      className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-gray-900/60 text-white p-2 rounded-full hover:bg-gray-900 focus:outline-none"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Thumbnail Carousel (clicking a thumbnail changes the main image) */}
          {project.images.length > 1 && (
            <div className="px-6 py-4 overflow-x-auto scrollbar-hide">
              <div className="flex space-x-2">
                {project.images.map((img, index) => (
                  <img
                    key={img.id}
                    src={`https://crm.lahirupeiris.com/assets/${img.id}`}
                    alt={project.title}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-32 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border-2 ${
                      index === currentIndex
                        ? 'border-blue-500'
                        : 'border-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Project Details */}
          <div className="px-6 py-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {project.title}
            </h1>

            <div className="flex items-start gap-4 flex-wrap">
              {/* Metadata Section */}
              <div className="flex-grow space-y-2 min-w-[300px]">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded-full text-sm font-medium">
                    {project.status}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                    <svg
                      className="w-5 h-5 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {project.location}
                  </span>
                </div>

                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Posted on{' '}
                  {new Date(project.date_created).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>

              {/* Action Buttons (example placeholder) */}
              <div className="flex items-center gap-3">
              <Link 
        href={`/project-blog/${projectId}`} 
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
    >
        <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
        </svg>
        Read Blog
    </Link>
              </div>
            </div>

            {/* Description */}
            <div className="mt-6 border-t dark:border-gray-700 pt-6">
              <div
                className="prose max-w-none dark:prose-invert text-gray-600 dark:text-gray-300"
                dangerouslySetInnerHTML={{ __html: project.description }}
              />
            </div>
          </div>

          {/* Comment Section */}
          <div className="border-t dark:border-gray-700 mt-4">
            <CommentSection projectId={project.id.toString()} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
