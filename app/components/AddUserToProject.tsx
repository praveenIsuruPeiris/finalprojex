'use client';

import { useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import { Button, Modal, Label } from 'flowbite-react';
import Image from 'next/image';
import { useUser } from '@clerk/nextjs';

interface User {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
}

interface AddUserToProjectProps {
  projectId: string;
  show?: boolean;
  onClose?: () => void;
  onUserAdded?: () => void;
  defaultRole?: 'member' | 'editor' | 'admin';
  context?: 'chat' | 'management';
}

export default function AddUserToProject({ 
  projectId, 
  show, 
  onClose, 
  onUserAdded,
  defaultRole = 'member',
  context = 'management'
}: AddUserToProjectProps) {
  const { user: currentUser } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [matches, setMatches] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(defaultRole);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  // Fetch current user's role in the project
  useEffect(() => {
    const fetchCurrentUserRole = async () => {
      if (!currentUser) return;

      try {
        const response = await fetch(`/api/get-user-role?projectId=${projectId}`);
        if (response.ok) {
          const data = await response.json();
          setCurrentUserRole(data.role);
          const hasAdminOrEditorRole = data.role === 'admin' || data.role === 'editor';
          setHasPermission(hasAdminOrEditorRole);
          
          if (!hasAdminOrEditorRole) {
            setError('Only admins and editors can add users to this project.');
          }
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
        setHasPermission(false);
        setError('Failed to verify user permissions.');
      }
    };

    fetchCurrentUserRole();
  }, [projectId, currentUser]);

  // Fetch all users once
  useEffect(() => {
    const fetchUsers = async () => {
      if (!hasPermission || !currentUser) return;

      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch('/api/get-all-users', {
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          if (response.status === 401) {
            setError('Please sign in to view users.');
            return;
          }
          throw new Error(data.message || 'Failed to fetch users');
        }
        
        if (!data.users || !Array.isArray(data.users)) {
          throw new Error('Invalid response format from server');
        }
        
        // Filter out the current user from the list
        const filteredUsers = data.users.filter((user: User) => user.id !== currentUser.id);
        setAllUsers(filteredUsers);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch users. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    if (show && hasPermission && currentUser) {
      fetchUsers();
    }
  }, [show, hasPermission, currentUser]);

  // Fuse search options
  const fuseOptions = {
    keys: ['username', 'first_name', 'last_name'],
    threshold: 0.3,
    includeScore: true,
    minMatchCharLength: 1,
    useExtendedSearch: true
  };

  // Update matches on search query change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setMatches([]);
      return;
    }

    try {
      const fuse = new Fuse(allUsers, fuseOptions);
      const result = fuse.search(searchQuery.trim());
      const matchedUsers = result.map((r) => r.item);
      setMatches(matchedUsers.slice(0, 5));
    } catch (err) {
      console.error('Search error:', err);
      setMatches([]);
    }
  }, [searchQuery, allUsers]);

  const handleAddUser = async (username: string) => {
    if (!hasPermission) {
      setError('You do not have permission to add users to this project. Only admins and editors can add users.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/add-user-to-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId, 
          username,
          role: selectedRole 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
          setError('You do not have permission to add users to this project. Only admins and editors can add users.');
        } else if (response.status === 404) {
          setError('User not found.');
        } else {
          setError(errorData.message || 'Failed to add user to project. Please try again.');
        }
        return;
      }

      setSearchQuery('');
      setMatches([]);
      if (onUserAdded) {
        onUserAdded();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal show={show} onClose={onClose} size="md">
      <Modal.Header className="text-gray-900 dark:text-white flex justify-between items-center">
        <span>Add User to Project</span>
        <Button
          color="gray"
          size="xs"
          onClick={onClose}
          className="hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          ×
        </Button>
      </Modal.Header>
      <Modal.Body>
        <div className="space-y-4">
          {error && !hasPermission ? (
            <div className="p-4 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="relative">
                <Label htmlFor="search" className="text-gray-900 dark:text-white mb-2 block">
                  Search Users
                </Label>
                <input
                  id="search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username or name..."
                  className="w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>

              {context === 'management' && (
                <div>
                  <Label htmlFor="role" className="text-gray-900 dark:text-white mb-2 block">
                    Role
                  </Label>
                  <select
                    id="role"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as 'member' | 'editor' | 'admin')}
                    className="w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <option value="member">Member</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}

              {isLoading && (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              )}

              {error && hasPermission && (
                <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg">
                  {error}
                </div>
              )}

              {matches.length > 0 ? (
                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
                  {matches.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <div className="relative w-10 h-10 rounded-full overflow-hidden mr-3 bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <span className="text-gray-600 dark:text-gray-300 text-lg">
                          {user.first_name?.[0] || user.username[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          @{user.username}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        gradientDuoTone="purpleToBlue"
                        disabled={isLoading}
                        onClick={() => handleAddUser(user.username)}
                        className="ml-4"
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              ) : searchQuery.trim().length > 0 && !isLoading && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                  No users found matching your search.
                </div>
              )}
            </>
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
}
