'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button, Table, Badge, Modal, Label, Select, Dropdown } from 'flowbite-react';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import AddUserToProject from '@/app/components/AddUserToProject';
import Pagination from '@/app/components/Pagination';
import Fuse from 'fuse.js';
import Notification from '@/app/components/Notification';
import GroupChatPanel from '@/app/components/GroupChatPanel';

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Project[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

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
    // Check if this is the last admin trying to change their own role
    const adminCount = members.filter(m => m.role === 'admin').length;
    const isLastAdmin = adminCount <= 1 && member.role === 'admin';
    const isCurrentUser = member.user_id === user?.id;

    if (isLastAdmin && isCurrentUser) {
      setNotification({
        message: "You cannot change your role as you are the last admin of this project.",
        type: 'error'
      });
      return;
    }

    setSelectedProject(project);
    setSelectedMember(member);
    setNewRole(member.role);
    setShowModal(true);
  };

  const handleUpdateMember = async () => {
    if (!selectedProject || !selectedMember) return;

    // Check if this is the last admin trying to change their own role
    const adminCount = members.filter(m => m.role === 'admin').length;
    const isLastAdmin = adminCount <= 1 && selectedMember.role === 'admin';
    const isCurrentUser = selectedMember.user_id === user?.id;
    const isChangingToNonAdmin = newRole !== 'admin';

    if (isLastAdmin && isCurrentUser && isChangingToNonAdmin) {
      setNotification({
        message: "You cannot change your role as you are the last admin of this project.",
        type: 'error'
      });
      setShowModal(false);
      return;
    }

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
        setNotification({
          message: "Member role updated successfully!",
          type: 'success'
        });
      } else {
        throw new Error('Failed to update member role');
      }
    } catch (error) {
      console.error('Error updating member:', error);
      setNotification({
        message: "Failed to update member role. Please try again.",
        type: 'error'
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedProject) return;

    try {
      // Check if this is the last admin
      const adminCount = members.filter(m => m.role === 'admin').length;
      const memberToRemove = members.find(m => m.id === memberId);
      
      if (adminCount <= 1 && memberToRemove?.role === 'admin') {
        setNotification({
          message: "Cannot remove the last admin from the project. Please assign another admin first.",
          type: 'error'
        });
        return;
      }

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
      setNotification({
        message: "Failed to remove member. Please try again.",
        type: 'error'
      });
    }
  };

  const handleDeleteProject = async (project: Project) => {
    setProjectToDelete(project);
    setShowDeleteModal(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      // First fetch all project members to get their IDs
      const membersResponse = await fetch(
        `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/Projects_Users?filter[project_id][_eq]=${projectToDelete.id}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
          },
        }
      );

      if (!membersResponse.ok) {
        throw new Error('Failed to fetch project members');
      }

      const membersData = await membersResponse.json();
      const memberIds = membersData.data.map((member: any) => member.id);

      // Delete each member individually
      for (const memberId of memberIds) {
        const deleteMemberResponse = await fetch(
          `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/Projects_Users/${memberId}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
            },
          }
        );

        if (!deleteMemberResponse.ok) {
          console.error(`Failed to delete member ${memberId}`);
        }
      }

      // Then delete the project
      const projectResponse = await fetch(
        `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/projects/${projectToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
          },
        }
      );

      if (projectResponse.ok) {
        // Remove the project from the state
        setProjects(projects.filter(p => p.id !== projectToDelete.id));
        setShowDeleteModal(false);
        setProjectToDelete(null);
        
        // Show success message
        setNotification({
          message: "Project deleted successfully!",
          type: 'success'
        });
      } else {
        const errorData = await projectResponse.json();
        console.error('Delete project error:', errorData);
        throw new Error('Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      setNotification({
        message: "Failed to delete project. Please try again.",
        type: 'error'
      });
    }
  };

  // Calculate paginated projects
  const paginatedProjects = searchQuery 
    ? searchResults.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : projects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  
  const totalPages = Math.ceil((searchQuery ? searchResults.length : projects.length) / itemsPerPage);

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
    
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    
    // Configure Fuse.js options
    const options = {
      keys: ['title', 'description', 'status', 'location'],
      threshold: 0.3,
      includeScore: true
    };
    
    // Create a new Fuse instance
    const fuse = new Fuse(projects, options);
    
    // Perform the search
    
    const results = fuse.search(query);
    
    // Extract the items from the results
    const searchResults = results.map(result => result.item);
    setSearchResults(searchResults);
  };

  // Reset search when projects change
  useEffect(() => {
    if (searchQuery) {
      handleSearch(searchQuery);
    }
  }, [projects]);

  const handleOpenChat = (projectId: string) => {
    setActiveProjectId(projectId);
    setShowChat(true);
  };

  const handleCloseChat = () => {
    setShowChat(false);
    setActiveProjectId(null);
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

        {notification && (
          <Notification 
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No projects to manage</h2>
            <p className="text-gray-600 dark:text-gray-400">You need to be an admin of a project to manage it</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              {isSearching && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Found {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
                </p>
              )}
            </div>

            {paginatedProjects.map((project) => (
              <div key={project.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{project.title}</h2>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <Button
                      color="blue"
                      onClick={() => handleViewMembers(project)}
                      className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto text-white bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700"
                    >
                      View Members
                    </Button>
                    <Button
                      color="blue"
                      onClick={() => {
                        setSelectedProject(project);
                        setShowAddUserModal(true);
                      }}
                      className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto text-white bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700"
                    >
                      Add User
                    </Button>
                    <Button
                      color="blue"
                      onClick={() => router.push(`/edit-project?id=${project.id}`)}
                      className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto text-white bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700"
                    >
                      Edit Project
                    </Button>
                    <Button
                      color="blue"
                      onClick={() => handleOpenChat(project.id)}
                      className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto text-white bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700"
                    >
                      Chat
                    </Button>
                    <Button
                      color="failure"
                      onClick={() => handleDeleteProject(project)}
                      className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto text-white bg-gray-500 hover:bg-gray-600 dark:bg-gray-500 dark:hover:bg-gray-600"
                    >
                      Delete Project
                    </Button>
                  </div>
                </div>

                {selectedProject?.id === project.id && members.length > 0 && (
                  <div className="mt-4 w-full">
                    <div className="w-full overflow-x-auto">
                      <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
                        {members.map((member) => (
                          <div 
                            key={member.id} 
                            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 w-full"
                          >
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                              <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">
                                  <Link 
                                    href={`/profile/${member.user.username}`}
                                    className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                  >
                                    {member.user.first_name} {member.user.last_name}
                                  </Link>
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {member.user.email}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge color={member.role === 'admin' ? 'purple' : 'blue'}>
                                  {member.role}
                                </Badge>
                                <div className="flex space-x-2">
                                  <Button
                                    size="xs"
                                    color="blue"
                                    onClick={() => handleEditMember(project, member)}
                                    className="text-white bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700"
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="xs"
                                    color="failure"
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="text-white bg-gray-500 hover:bg-gray-600 dark:bg-gray-500 dark:hover:bg-gray-600"
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
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
            
            {/* Pagination */}
            {projects.length > 0 && totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                startResult={(currentPage - 1) * itemsPerPage + 1}
                endResult={Math.min(currentPage * itemsPerPage, projects.length)}
                totalResults={projects.length}
              />
            )}
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
          <Button color="blue" onClick={handleUpdateMember} className="text-white bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700">
            Update
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Project Modal */}
      <Modal show={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <Modal.Header className="text-gray-900 dark:text-white">Delete Project</Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to delete the project "{projectToDelete?.title}"? This action cannot be undone.
            </p>
            <p className="text-red-600 dark:text-red-400 font-bold">
              Warning: This will remove all members from the project and delete all project data.
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <div className="flex justify-between w-full">
            <Button color="gray" onClick={() => setShowDeleteModal(false)} className="text-gray-900">
              Cancel
            </Button>
            <Button color="failure" onClick={confirmDeleteProject} className="text-white bg-gray-500 hover:bg-gray-600 dark:bg-gray-500 dark:hover:bg-gray-600">
              Delete Project
            </Button>
          </div>
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

      {/* Group Chat Panel */}
      {showChat && activeProjectId && (
        <GroupChatPanel 
          projectId={activeProjectId} 
          closeChat={handleCloseChat} 
        />
      )}

      <Footer />
    </div>
  );
} 
