'use client';

import { useState, useEffect, use } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from 'flowbite-react';
import { Tabs } from 'flowbite-react';
import { HiUser, HiFolder, HiHeart, HiChat } from 'react-icons/hi';
import ProjectCard from '@/app/components/ProjectCard';
import Navbar from '@/app/components/Navbar';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_image?: string;
  date_created: string;
  clerk_id: string;
  username: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  location: string;
  images: Array<number | { id: string }>;
  date_created: string;
  created_at: string;
}

interface UserStats {
  projectsCount: number;
  likesReceived: number;
}

export default function UserProfile({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { user } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [likedProjects, setLikedProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<UserStats>({
    projectsCount: 0,
    likesReceived: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [directusUserId, setDirectusUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    // Set username from params
    setUsername(resolvedParams.id);
  }, [resolvedParams.id]);

  useEffect(() => {
    const fetchUserByUsername = async () => {
      if (!username) return;
      
      try {
        console.log('Fetching user with username:', username);
        const response = await fetch(
          `https://crm.lahirupeiris.com/items/users?filter[username][_eq]=${username}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );
        console.log('Response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('Response data:', data);
          if (data.data && data.data.length > 0) {
            const userData = data.data[0];
            console.log('Found user:', userData);
            setDirectusUserId(userData.id);
            setProfile(userData);
            return userData;
          }
        }
        console.log('No user found with username:', username);
        return null;
      } catch (error) {
        console.error('Error fetching user by username:', error);
        return null;
      }
    };

    const fetchUserProjects = async (directusId: string) => {
      try {
        const response = await fetch(
          `https://crm.lahirupeiris.com/items/projects?filter[created_by][_eq]=${directusId}&fields=*,images.directus_files_id`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          // Transform the images data to match the expected format
          const transformedProjects = data.data.map((project: any) => ({
            id: project.id,
            title: project.title,
            description: project.description,
            status: project.status,
            location: project.location,
            date_created: project.date_created,
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
          }));
          setProjects(transformedProjects);
          return transformedProjects;
        }
        return [];
      } catch (error) {
        console.error('Error fetching user projects:', error);
        return [];
      }
    };

    const fetchLikedProjects = async (directusId: string) => {
      try {
        const response = await fetch(
          `https://crm.lahirupeiris.com/items/project_likes?filter[user_id][_eq]=${directusId}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          const projectIds = data.data.map((like: any) => like.project_id);
          if (projectIds.length > 0) {
            const projectsResponse = await fetch(
              `https://crm.lahirupeiris.com/items/projects?filter[id][_in]=${projectIds.join(',')}&fields=*,images.directus_files_id`,
              {
                headers: {
                  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            if (projectsResponse.ok) {
              const projectsData = await projectsResponse.json();
              // Transform the images data to match the expected format
              const transformedProjects = projectsData.data.map((project: any) => ({
                id: project.id,
                title: project.title,
                description: project.description,
                status: project.status,
                location: project.location,
                date_created: project.date_created,
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
              }));
              setLikedProjects(transformedProjects);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching liked projects:', error);
      }
    };

    const fetchUserStats = async (directusId: string, userProjects: Project[]) => {
      try {
        const projectIds = userProjects.map(p => p.id);
        let likesData = { data: [] };
        
        if (projectIds.length > 0) {
          const likesRes = await fetch(
            `https://crm.lahirupeiris.com/items/project_likes?filter[project_id][_in]=${projectIds.join(',')}`,
            {
              headers: {
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
                'Content-Type': 'application/json',
              },
            }
          );
          if (likesRes.ok) {
            likesData = await likesRes.json();
          }
        }

        setStats({
          projectsCount: userProjects.length,
          likesReceived: likesData.data?.length || 0,
        });
      } catch (error) {
        console.error('Error fetching user stats:', error);
      }
    };

    const initializeProfile = async () => {
      setIsLoading(true);
      try {
        const userData = await fetchUserByUsername();
        if (!userData) {
          setIsLoading(false);
          return;
        }

        await Promise.all([
          fetchLikedProjects(userData.id)
        ]);
        
        const userProjects = await fetchUserProjects(userData.id);
        await fetchUserStats(userData.id, userProjects);
        
        if (user) {
          setIsCurrentUser(user.id === userData.clerk_id);
        }
      } catch (error) {
        console.error('Error initializing profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (username) {
      initializeProfile();
    }
  }, [username, user]);

  const handleFollow = async () => {
    // Implement follow functionality
    setIsFollowing(!isFollowing);
  };

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

  if (!profile || !directusUserId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile not found</h2>
            <p className="text-gray-600 dark:text-gray-400">The requested profile could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center space-x-6">
            <div className="relative">
              {profile.profile_image ? (
                <img
                  src={profile.profile_image}
                  alt={`${profile.first_name} ${profile.last_name}`}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <HiUser className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {profile.first_name} {profile.last_name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">@{profile.username}</p>
              <div className="mt-4 flex space-x-4">
                <div className="text-center">
                  <div className="text-xl font-semibold text-gray-900 dark:text-white">{stats.projectsCount}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Projects</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-semibold text-gray-900 dark:text-white">{stats.likesReceived}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Likes</div>
                </div>
              </div>
            </div>
            {!isCurrentUser && (
              <Button
                onClick={handleFollow}
                gradientDuoTone={isFollowing ? "redToPink" : "purpleToBlue"}
                className="mt-4"
              >
                {isFollowing ? 'Unfollow' : 'Follow'}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs>
          <Tabs.Item active title="Projects" icon={HiFolder}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard 
                  key={project.id} 
                  {...project} 
                  createdAt={project.date_created} 
                />
              ))}
            </div>
          </Tabs.Item>
          <Tabs.Item title="Liked Projects" icon={HiHeart}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {likedProjects.map((project) => (
                <ProjectCard 
                  key={project.id} 
                  {...project} 
                  createdAt={project.date_created} 
                />
              ))}
            </div>
          </Tabs.Item>
          <Tabs.Item title="Activity" icon={HiChat}>
            {/* Implement activity feed */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <p className="text-gray-600 dark:text-gray-400">Activity feed coming soon...</p>
            </div>
          </Tabs.Item>
        </Tabs>
      </div>
    </div>
  );
} 