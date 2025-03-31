'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button } from 'flowbite-react';
import ProjectCard from '@/app/components/ProjectCard';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import Link from 'next/link';

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  location: string;
  images: { id: string }[];
  created_at: string;
  user_role: string;
}

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

export default function MyProjects() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect to sign-in page if the user is not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    const fetchUserProjects = async () => {
      if (!isSignedIn) return;

      try {
        const directusUserId = await fetchCurrentUserId(user.id);
        if (!directusUserId) {
          throw new Error('Failed to get user ID');
        }

        // Fetch all projects where the user is a member
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/Projects_Users?filter[user_id][_eq]=${directusUserId}&fields=project_id,role`
        );
        
        if (response.ok) {
          const memberships = await response.json();
          const projectIds = memberships.data
            .map((m: any) => m.project_id)
            .filter((id: string) => id && id.trim() !== ''); // Filter out empty IDs
          
          if (projectIds.length === 0) {
            setProjects([]);
            setIsLoading(false);
            return;
          }
          
          // Fetch project details
          const projectsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/projects?filter[id][_in]=${projectIds.join(',')}&fields=*,images.directus_files_id`
          );
          
          if (projectsResponse.ok) {
            const projectsData = await projectsResponse.json();
            
            // Combine project data with membership data and transform images
            const projectsWithRoles = projectsData.data.map((project: any) => {
              const membership = memberships.data.find((m: any) => m.project_id === project.id);
              return {
                ...project,
                user_role: membership?.role || 'member',
                images: (project.images || [])
                  .map((item: any) => {
                    // Handle both direct file ID and nested structure
                    if (typeof item === 'string') {
                      return { id: item };
                    }
                    if (item.directus_files_id) {
                      return { id: item.directus_files_id.id || item.directus_files_id };
                    }
                    return null;
                  })
                  .filter((img: any) => img !== null)
              };
            });
            
            setProjects(projectsWithRoles);
          }
        }
      } catch (error) {
        console.error('Error fetching user projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProjects();
  }, [isSignedIn]);

  if (!isLoaded) return <p className="text-center text-gray-800 dark:text-gray-300">Loading...</p>;
  if (!isSignedIn) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Navbar />
      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Projects</h1>
          <Link href="/create-project">
            <Button gradientDuoTone="purpleToBlue">Create New Project</Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No projects yet</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Start by creating your first project</p>
            <Link href="/create-project">
              <Button gradientDuoTone="purpleToBlue">Create Project</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="relative group">
                <ProjectCard {...project} createdAt={project.created_at} />
                <div className="absolute top-2 right-2 flex items-center space-x-2 z-10">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    project.user_role === 'admin'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    {project.user_role}
                  </span>
                  {(project.user_role === 'admin' || project.user_role === 'editor') && (
                    <Link
                      href={`/edit-project?id=${project.id}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <Button
                        gradientDuoTone="purpleToBlue"
                        size="sm"
                        className="bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
} 