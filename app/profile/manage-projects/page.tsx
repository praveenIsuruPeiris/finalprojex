'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button, Table, Badge, Modal, Label, Select, Dropdown } from 'flowbite-react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import AddUserToProject from '@/app/components/AddUserToProject';

interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  user: {
    first_name: string;
    last_name: string;
    email: string;
    username: string;
  };
}

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  location: string;
  created_at: string;
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

export default function ManageProjects() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(null);
  const [newRole, setNewRole] = useState('member');
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Redirect to sign-in page if the user is not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    const fetchAdminProjects = async () => {
      if (!isSignedIn) return;

      try {
        const directusUserId = await fetchCurrentUserId(user.id);
        if (!directusUserId) {
          throw new Error('Failed to get user ID');
        }

        // Fetch projects where user is an admin
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/Projects_Users?filter[user_id][_eq]=${directusUserId}&filter[role][_eq]=admin&fields=project_id`
        );
        
        if (response.ok) {
          const memberships = await response.json();
          const projectIds = memberships.data
            .map((m: any) => m.project_id)
            .filter((id: string) => id && id.trim() !== '');
          
          if (projectIds.length === 0) {
            setProjects([]);
            setIsLoading(false);
            return;
          }
          
          // Fetch project details
          const projectsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/projects?filter[id][_in]=${projectIds.join(',')}`
          );
          
          if (projectsResponse.ok) {
            const projectsData = await projectsResponse.json();
            setProjects(projectsData.data);
          }
        }
      } catch (error) {
        console.error('Error fetching admin projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminProjects();
  }, [isSignedIn]);

  const fetchProjectMembers = async (projectId: string) => {
    try {
      const apiToken = process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN;
      if (!apiToken) {
        throw new Error('Directus API token missing');
      }

      // First fetch the project members
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/Projects_Users?filter[project_id][_eq]=${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('Project members data:', data);
        
        // Get all user IDs from the members
        const userIds = data.data.map((member: any) => member.user_id);
        
        // Fetch all users in one request
        const usersResponse = await fetch(
          `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/users?filter[id][_in]=${userIds.join(',')}`,
          {
            headers: {
              Authorization: `Bearer ${apiToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          console.log('Users data:', usersData);
          
          // Create a map of user data for easy lookup
          const userMap = new Map(usersData.data.map((user: any) => [user.id, user]));
          
          // Combine member and user data
          const transformedMembers = data.data.map((member: any) => ({
            id: member.id,
            project_id: member.project_id,
            user_id: member.user_id,
            role: member.role,
            user: userMap.get(member.user_id) || {
              first_name: '',
              last_name: '',
              email: '',
              username: '',
            }
          }));
          
          console.log('Transformed members data:', transformedMembers);
          setMembers(transformedMembers);
        }
      }
    } catch (error) {
      console.error('Error fetching project members:', error);
    }
  };

  const handleViewMembers = async (project: Project) => {
    setSelectedProject(project);
    await fetchProjectMembers(project.id);
  };

  const handleEditMember = (project: Project, member: ProjectMember) => {
    setSelectedProject(project);
    setSelectedMember(member);
    setNewRole(member.role);
    setShowModal(true);
  };

  const handleUpdateMember = async () => {
    if (!selectedProject || !selectedMember) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/Projects_Users/${selectedMember.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: newRole,
          }),
        }
      );

      if (response.ok) {
        fetchProjectMembers(selectedProject.id);
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error updating member:', error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedProject) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/Projects_Users/${memberId}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        fetchProjectMembers(selectedProject.id);
      }
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  if (!isLoaded) return <p className="text-center text-gray-800 dark:text-gray-300">Loading...</p>;
  if (!isSignedIn) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Manage Projects</h1>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No projects to manage</h2>
            <p className="text-gray-600 dark:text-gray-400">You need to be an admin of a project to manage it</p>
          </div>
        ) : (
          <div className="space-y-6">
            {projects.map((project) => (
              <div key={project.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{project.title}</h2>
                  <div className="flex space-x-2">
                    <Button
                      gradientDuoTone="purpleToBlue"
                      onClick={() => handleViewMembers(project)}
                      className="shadow-md hover:shadow-lg transition-shadow"
                    >
                      View Members
                    </Button>
                    <Button
                      gradientDuoTone="purpleToBlue"
                      onClick={() => {
                        setSelectedProject(project);
                        setShowAddUserModal(true);
                      }}
                      className="shadow-md hover:shadow-lg transition-shadow"
                    >
                      Add User
                    </Button>
                  </div>
                </div>

                {selectedProject?.id === project.id && members.length > 0 && (
                  <div className="mt-4">
                    <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
                      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                          <tr>
                            <th scope="col" className="px-6 py-3">First Name</th>
                            <th scope="col" className="px-6 py-3">Last Name</th>
                            <th scope="col" className="px-6 py-3">Email</th>
                            <th scope="col" className="px-6 py-3">Role</th>
                            <th scope="col" className="px-6 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            console.log('Rendering table for project:', project.id);
                            console.log('Current members state:', members);
                            return members.map((member) => {
                              console.log('Rendering member row:', member);
                              return (
                                <tr 
                                  key={member.id} 
                                  className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                                >
                                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                    {member.user?.first_name || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                    {member.user?.last_name || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                    {member.user?.email || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4">
                                    <Badge color={member.role === 'admin' ? 'purple' : 'blue'}>
                                      {member.role || 'N/A'}
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-4">
                                    <Dropdown
                                      label={
                                        <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                        </svg>
                                      }
                                      dismissOnClick={true}
                                      size="xs"
                                      className="bg-white dark:bg-gray-800"
                                    >
                                      <Dropdown.Item
                                        onClick={() => handleEditMember(project, member)}
                                        className="flex items-center"
                                      >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit Role
                                      </Dropdown.Item>
                                      <Dropdown.Item
                                        onClick={() => handleRemoveMember(member.id)}
                                        className="flex items-center text-red-600 dark:text-red-400"
                                      >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Remove Member
                                      </Dropdown.Item>
                                      <Dropdown.Item
                                        onClick={() => window.location.href = `/profile/${member.user.username}`}
                                        className="flex items-center"
                                      >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        View Profile
                                      </Dropdown.Item>
                                    </Dropdown>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedProject?.id === project.id && members.length === 0 && (
                  <div className="mt-4 text-center py-4 text-gray-600 dark:text-gray-400">
                    No members found for this project.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Member Modal */}
      <Modal show={showModal} onClose={() => setShowModal(false)}>
        <Modal.Header className="text-gray-900 dark:text-white">Edit Member Role</Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            <div>
              <Label htmlFor="role" className="text-gray-900 dark:text-white">Role</Label>
              <Select
                id="role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="member">Member</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button gradientDuoTone="purpleToBlue" onClick={handleUpdateMember}>
            Update
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add User Modal */}
      {selectedProject && (
        <AddUserToProject
          projectId={selectedProject.id}
          show={showAddUserModal}
          onClose={() => setShowAddUserModal(false)}
          onUserAdded={() => {
            fetchProjectMembers(selectedProject.id);
            setShowAddUserModal(false);
          }}
        />
      )}

      <Footer />
    </div>
  );
} 