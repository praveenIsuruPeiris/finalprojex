'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import CommentSection from '@/app/components/CommentSection';
import GroupChatPanel from '@/app/components/GroupChatPanel';
import { useAuth } from '@clerk/nextjs';

type Project = {
  id: string;
  title: string;
  description: string;
  status: string;
  location: string;
  date_created: string;
  images: { id: string }[];
  created_by?: { id: string; first_name: string; last_name: string; username?: string } | null;
};

type ProjectLike = {
  id: string;
  project_id: string;
  user_id: string;
  type: string;
};

const fetchCurrentUserId = async (clerkId: string): Promise<string | null> => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_DIRECTUS_API_URL;
    const apiToken = process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN;
    
    if (!apiUrl || !apiToken) {
      throw new Error('Directus API configuration missing');
    }

    const response = await fetch(
      `${apiUrl}/items/users?filter[clerk_id][_eq]=${encodeURIComponent(clerkId)}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) throw new Error('Failed to fetch user ID');
    const data = await response.json();
    return data.data[0]?.id || null;
  } catch (error) {
    console.error('Error fetching Directus user ID:', error);
    return null;
  }
};

export default function ProjectDetails() {
  const { userId: clerkId } = useAuth();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likes, setLikes] = useState<ProjectLike[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  // Fetch project details
  useEffect(() => {
    if (!projectId) return;

    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) throw new Error('Failed to fetch project');
        
        const data = await response.json();
        console.log('Raw project data:', data);

        const transformedProject = {
          ...data,
          images: (data.images || [])
            .map((item: any) => {
              if (typeof item === 'string') {
                return { id: item };
              }
              if (item.directus_files_id) {
                return { id: item.directus_files_id.id || item.directus_files_id };
              }
              return null;
            })
            .filter((img: any) => img !== null),
          created_by: data.created_by ? {
            id: data.created_by.id,
            first_name: data.created_by.first_name,
            last_name: data.created_by.last_name,
            username: data.created_by.username
          } : null
        };

        console.log('Transformed project:', transformedProject);
        setProject(transformedProject);
      } catch (err: any) {
        console.error('Error fetching project:', err);
        setError(err.message || 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  // Fetch likes
  useEffect(() => {
    const fetchLikes = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_DIRECTUS_API_URL;
        const apiToken = process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN;

        if (!apiUrl || !apiToken) {
          throw new Error('Directus API configuration missing');
        }

        const response = await fetch(
          `${apiUrl}/items/project_likes?filter[project_id][_eq]=${projectId}`,
          {
            headers: {
              Authorization: `Bearer ${apiToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (!response.ok) throw new Error('Failed to fetch likes');
        
        const data = await response.json();
        setLikes(data.data);
        setLikeCount(data.data.length);

        // Check if current user has liked the project
        if (clerkId) {
          const currentUserId = await fetchCurrentUserId(clerkId);
          if (currentUserId) {
            const userLike = data.data.find((like: ProjectLike) => like.user_id === currentUserId);
            setIsLiked(!!userLike);
          }
        }
      } catch (err) {
        console.error('Error fetching likes:', err);
      }
    };

    fetchLikes();
  }, [projectId, clerkId]);

  // Handle like/unlike
  const handleLike = async () => {
    if (!clerkId || !projectId) return;

    try {
      const currentUserId = await fetchCurrentUserId(clerkId);
      if (!currentUserId) return;

      const apiUrl = process.env.NEXT_PUBLIC_DIRECTUS_API_URL;
      const apiToken = process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN;

      if (!apiUrl || !apiToken) {
        throw new Error('Directus API configuration missing');
      }

      if (isLiked) {
        // Unlike
        const userLike = likes.find(like => like.user_id === currentUserId);
        if (userLike) {
          const response = await fetch(
            `${apiUrl}/items/project_likes/${userLike.id}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (response.ok) {
            setLikes(likes.filter(like => like.id !== userLike.id));
            setLikeCount(prev => prev - 1);
            setIsLiked(false);
          }
        }
      } else {
        // Like
        const response = await fetch(
          `${apiUrl}/items/project_likes`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              project_id: projectId,
              user_id: currentUserId,
              type: 'heart'
            }),
          }
        );

        if (response.ok) {
          const newLike = await response.json();
          setLikes([...likes, newLike.data]);
          setLikeCount(prev => prev + 1);
          setIsLiked(true);
        }
      }
    } catch (err) {
      console.error('Error handling like:', err);
    }
  };

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        if (!clerkId || !projectId) return;

        const currentUserId = await fetchCurrentUserId(clerkId);
        if (!currentUserId) return;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/Projects_Users?filter[project_id][_eq]=${projectId}&filter[user_id][_eq]=${currentUserId}`
        );
        if (!response.ok) throw new Error('Failed to fetch user role');

        const data = await response.json();
        setUserRole(data.data[0]?.role || null);
      } catch (err: any) {
        console.error('Error fetching user role:', err.message);
      }
    };

    fetchUserRole();
  }, [projectId, clerkId]);

  // Image navigation handlers
  const handlePrevImage = () => {
    if (!project) return;
    setCurrentIndex(prev => prev === 0 ? project.images.length - 1 : prev - 1);
  };

  const handleNextImage = () => {
    if (!project) return;
    setCurrentIndex(prev => prev === project.images.length - 1 ? 0 : prev + 1);
  };

  // Check if user has admin or editor role
  const isAdminOrEditor = userRole === 'admin' || userRole === 'editor';

  // Handle share functionality
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: project?.title || 'Project',
        url: window.location.href,
      })
      .catch(err => console.error('Error sharing:', err));
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link copied to clipboard!'))
        .catch(err => console.error('Error copying to clipboard:', err));
    }
    setShowMenu(false);
  };

  // Handle edit functionality
  const handleEdit = () => {
    window.location.href = `/profile/manage-projects?edit=${projectId}`;
    setShowMenu(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="p-4 max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg text-center">
          <div className="text-red-500 dark:text-red-400">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="mt-4 font-medium">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // No project found
  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="p-4 max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg text-center">
          <svg className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Project not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Navbar />
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Image carousel */}
          <div className="relative aspect-video bg-gray-200 dark:bg-gray-700">
            {project?.images?.length > 0 && project.images[currentIndex] && (() => {
              const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_API_URL || 'https://crm.lahirupeiris.com';
              const mainImageUrl = `${directusUrl}/assets/${project.images[currentIndex].id}`;
              return (
                <>
                  <img
                    src={mainImageUrl}
                    alt={project.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Image failed to load:', mainImageUrl);
                      const alternativeUrl = `${directusUrl}/${project.images[currentIndex].id}`;
                      (e.target as HTMLImageElement).src = alternativeUrl;
                    }}
                  />
                  {/* Like button overlay */}
                  <button
                    onClick={handleLike}
                    className={`absolute bottom-4 right-4 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg transition-all duration-200 ${
                      isLiked
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-gray-900/80 text-white hover:bg-gray-900'
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      fill={isLiked ? 'currentColor' : 'none'}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    <span className="text-sm font-medium">{likeCount}</span>
                  </button>
                  
                  {/* Three-dot menu */}
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="p-2 rounded-full bg-gray-900/60 text-white hover:bg-gray-900 transition-colors"
                      aria-label="More options"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                    
                    {/* Dropdown menu */}
                    {showMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700">
                        {isAdminOrEditor && (
                          <button
                            onClick={handleEdit}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Project
                          </button>
                        )}
                        <button
                          onClick={handleShare}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          Share Project
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {project.images.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevImage}
                        className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-gray-900/60 text-white p-2 rounded-full hover:bg-gray-900"
                      >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-gray-900/60 text-white p-2 rounded-full hover:bg-gray-900"
                      >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}
                </>
              );
            })()}
            {/* Like button for when there's no image */}
            {(!project?.images || project.images.length === 0) && (
              <button
                onClick={handleLike}
                className={`absolute bottom-4 right-4 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg transition-all duration-200 ${
                  isLiked
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gray-900/80 text-white hover:bg-gray-900'
                }`}
              >
                <svg
                  className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  fill={isLiked ? 'currentColor' : 'none'}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <span className="text-sm font-medium">{likeCount}</span>
              </button>
            )}
          </div>

          {/* Project details */}
          <div className="px-6 py-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {project.title}
            </h1>
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex-grow space-y-2 min-w-[300px]">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded-full text-sm font-medium">
                    {project.status}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {project.location}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Posted on {new Date(project.date_created).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                
                {/* Creator information */}
                {project.created_by && (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500 dark:text-gray-400">Created by</span>
                    <Link
                      href={`/profile/${project.created_by.username || project.created_by.id}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {project.created_by.first_name} {project.created_by.last_name}
                    </Link>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                <Link
                  href={`/journal/${projectId}`}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-300 shadow-md hover:shadow-lg w-full sm:w-[180px] transform hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>Project journal</span>
                </Link>

                {userRole && (
                  <button
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-300 shadow-md hover:shadow-lg w-full sm:w-[180px] transform hover:-translate-y-0.5"
                    onClick={() => setShowChat(!showChat)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>{showChat ? 'Close Chat' : 'Open Chat'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 border-t dark:border-gray-700 pt-6 prose max-w-none dark:prose-invert">
              <div dangerouslySetInnerHTML={{ __html: project.description }} />
            </div>
          </div>

          {/* Comment Section */}
          <div className="border-t dark:border-gray-700 mt-4">
            <CommentSection key={project.id} projectId={project.id} />
          </div>
        </div>
      </main>

      {showChat && (
        <GroupChatPanel projectId={project.id} closeChat={() => setShowChat(false)} />
      )}
      <Footer />
    </div>
  );
}