'use client';

import { useState, useEffect } from 'react';
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
  profile_image?: { id: string };
  created_at: string;
  clerk_id: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  location: string;
  images: any[];
  created_at: string;
}

interface UserStats {
  projectsCount: number;
  likesReceived: number;
  commentsCount: number;
  followersCount: number;
}

export default function UserProfile({ params }: { params: { id: string } }) {
  const { user } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [likedProjects, setLikedProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<UserStats>({
    projectsCount: 0,
    likesReceived: 0,
    commentsCount: 0,
    followersCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isCurrentUser, setIsCurrentUser] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/users/${params.id}`
        );
        if (response.ok) {
          const data = await response.json();
          setProfile(data.data);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    const fetchUserProjects = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/projects?filter[created_by][_eq]=${params.id}`
        );
        if (response.ok) {
          const data = await response.json();
          setProjects(data.data);
        }
      } catch (error) {
        console.error('Error fetching user projects:', error);
      }
    };

    const fetchLikedProjects = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/project_likes?filter[user_id][_eq]=${params.id}`
        );
        if (response.ok) {
          const data = await response.json();
          const projectIds = data.data.map((like: any) => like.project_id);
          const projectsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/projects?filter[id][_in]=${projectIds.join(',')}`
          );
          if (projectsResponse.ok) {
            const projectsData = await projectsResponse.json();
            setLikedProjects(projectsData.data);
          }
        }
      } catch (error) {
        console.error('Error fetching liked projects:', error);
      }
    };

    const fetchUserStats = async () => {
      try {
        const [projectsRes, likesRes, commentsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/projects?filter[created_by][_eq]=${params.id}`),
          fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/project_likes?filter[project_id][_in]=${projects.map(p => p.id).join(',')}`),
          fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/project_comments?filter[user_id][_eq]=${params.id}`)
        ]);

        const [projectsData, likesData, commentsData] = await Promise.all([
          projectsRes.json(),
          likesRes.json(),
          commentsRes.json()
        ]);

        setStats({
          projectsCount: projectsData.data.length,
          likesReceived: likesData.data.length,
          commentsCount: commentsData.data.length,
          followersCount: 0, // Implement followers system later
        });
      } catch (error) {
        console.error('Error fetching user stats:', error);
      }
    };

    fetchUserProfile();
    fetchUserProjects();
    fetchLikedProjects();
    fetchUserStats();
    setIsLoading(false);
  }, [params.id]);

  useEffect(() => {
    if (user && profile) {
      setIsCurrentUser(user.id === profile.clerk_id);
    }
  }, [user, profile]);

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
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User not found</h1>
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
            <img
              src={profile.profile_image ? `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/assets/${profile.profile_image.id}` : '/default-avatar.png'}
              alt={`${profile.first_name} ${profile.last_name}`}
              className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-700 shadow-lg"
            />
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {profile.first_name} {profile.last_name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">{profile.email}</p>
              <div className="flex space-x-4 mt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.projectsCount}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Projects</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.likesReceived}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Likes Received</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.commentsCount}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Comments</div>
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
        </div>

        {/* Tabs */}
        <Tabs>
          <Tabs.Item active title="Projects" icon={HiFolder}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard key={project.id} {...project} createdAt={project.created_at} />
              ))}
            </div>
          </Tabs.Item>
          <Tabs.Item title="Liked Projects" icon={HiHeart}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {likedProjects.map((project) => (
                <ProjectCard key={project.id} {...project} createdAt={project.created_at} />
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