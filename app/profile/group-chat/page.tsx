'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button, Card, TextInput, Badge, Tabs } from 'flowbite-react';
import { HiChat, HiUserGroup, HiStar } from 'react-icons/hi';
import Navbar from '@/app/components/Navbar';

interface Message {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    profile_image?: { id: string };
  };
}

interface Project {
  id: string;
  title: string;
  description: string;
  is_admin: boolean;
  last_message?: {
    content: string;
    created_at: string;
  };
  unread_count?: number;
}

interface ProjectCategory {
  id: string;
  name: string;
  projects: Project[];
}

export default function GroupChat() {
  const { user } = useUser();
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUserProjects = async () => {
      if (!user) return;

      try {
        // Fetch projects where user is a member
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/project_members?filter[user_id][_eq]=${user.id}&fields=project_id,role,is_admin`
        );
        
        if (response.ok) {
          const memberships = await response.json();
          const projectIds = memberships.data.map((m: any) => m.project_id);
          
          // Fetch project details with last message
          const projectsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/projects?filter[id][_in]=${projectIds.join(',')}&fields=*,project_messages.*`
          );
          
          if (projectsResponse.ok) {
            const projectsData = await projectsResponse.json();
            
            // Organize projects into categories
            const adminProjects = projectsData.data
              .filter((project: any) => {
                const membership = memberships.data.find((m: any) => m.project_id === project.id);
                return membership?.is_admin;
              })
              .map((project: any) => ({
                ...project,
                is_admin: true,
                last_message: project.project_messages?.[0],
                unread_count: 0 // Implement unread count logic
              }));

            const memberProjects = projectsData.data
              .filter((project: any) => {
                const membership = memberships.data.find((m: any) => m.project_id === project.id);
                return !membership?.is_admin;
              })
              .map((project: any) => ({
                ...project,
                is_admin: false,
                last_message: project.project_messages?.[0],
                unread_count: 0 // Implement unread count logic
              }));

            setCategories([
              {
                id: 'admin',
                name: 'Projects I Manage',
                projects: adminProjects
              },
              {
                id: 'member',
                name: 'Projects I\'m Part Of',
                projects: memberProjects
              }
            ]);
          }
        }
      } catch (error) {
        console.error('Error fetching user projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProjects();
  }, [user]);

  useEffect(() => {
    if (selectedProject) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedProject]);

  const fetchMessages = async () => {
    if (!selectedProject) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/project_messages?filter[project_id][_eq]=${selectedProject.id}&sort=-created_at&limit=50&fields=*,user.*`
      );
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.data.reverse());
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedProject || !newMessage.trim() || !user) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/project_messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project_id: selectedProject.id,
            user_id: user.id,
            content: newMessage.trim(),
          }),
        }
      );

      if (response.ok) {
        setNewMessage('');
        fetchMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const filteredProjects = activeTab === 'all'
    ? categories.flatMap(cat => cat.projects)
    : categories.find(cat => cat.id === activeTab)?.projects || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Group Chat</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Project List */}
          <div className="lg:col-span-1">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Projects</h2>
                <Tabs>
                  <Tabs.Item active={activeTab === 'all'} onClick={() => setActiveTab('all')} title="All" icon={HiChat} />
                  <Tabs.Item active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} title="Admin" icon={HiStar} />
                  <Tabs.Item active={activeTab === 'member'} onClick={() => setActiveTab('member')} title="Member" icon={HiUserGroup} />
                </Tabs>
              </div>
              <div className="space-y-2">
                {filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition relative ${
                      selectedProject?.id === project.id
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{project.title}</span>
                      {project.is_admin && (
                        <Badge color="purple" className="ml-2">Admin</Badge>
                      )}
                    </div>
                    {project.last_message && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                        {project.last_message.content}
                      </p>
                    )}
                    {project.unread_count && project.unread_count > 0 && (
                      <Badge color="red" className="absolute top-2 right-2">
                        {project.unread_count}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            {selectedProject ? (
              <Card>
                <div className="flex flex-col h-[600px]">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedProject.title}
                    </h2>
                    {selectedProject.is_admin && (
                      <Badge color="purple">Admin</Badge>
                    )}
                  </div>
                  
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.user.id === user?.id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.user.id === user?.id
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}
                        >
                          <div className="flex items-center mb-1">
                            <img
                              src={
                                message.user.profile_image
                                  ? `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/assets/${message.user.profile_image.id}`
                                  : '/default-avatar.png'
                              }
                              alt={`${message.user.first_name} ${message.user.last_name}`}
                              className="w-6 h-6 rounded-full mr-2"
                            />
                            <span className="text-sm font-medium">
                              {message.user.first_name} {message.user.last_name}
                            </span>
                          </div>
                          <p className="text-sm">{message.content}</p>
                          <span className="text-xs opacity-75 mt-1 block">
                            {new Date(message.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="flex space-x-2">
                    <TextInput
                      type="text"
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button
                      gradientDuoTone="purpleToBlue"
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                    >
                      Send
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card>
                <div className="text-center py-12">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Select a Project
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Choose a project from the list to start chatting
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 