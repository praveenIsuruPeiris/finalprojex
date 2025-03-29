'use client';

import { useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import { Button } from 'flowbite-react';

interface User {
  id: string;
  username: string;
  // any other fields you might need
}

interface AddUserToProjectProps {
  projectId: string;
}

export default function AddUserToProject({ projectId }: AddUserToProjectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [matches, setMatches] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch all users once (or adjust to use dynamic search)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Example API endpoint to fetch all users; adjust as needed.
        const response = await fetch('/api/get-all-users');
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        setAllUsers(data.users); // assuming { users: [...] }
      } catch (err) {
        setError('Failed to fetch users');
      }
    };

    fetchUsers();
  }, []);

  // Fuse search options
  const fuseOptions = {
    keys: ['username'],
    threshold: 0.4,
  };

  // Update matches on search query change
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setMatches([]);
      return;
    }
    const fuse = new Fuse(allUsers, fuseOptions);
    const result = fuse.search(searchQuery.trim());
    setMatches(result.slice(0, 3).map((r) => r.item));
  }, [searchQuery, allUsers]);

  const handleAddUser = async (selectedUsername: string) => {
    try {
      const response = await fetch(`/api/add-user-to-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, username: selectedUsername }),
      });
      if (!response.ok) throw new Error('Failed to add user to project');
      alert(`User "${selectedUsername}" added successfully`);
      setSearchQuery('');
      setMatches([]);
    } catch (err) {
      setError('Failed to add user to project');
    }
  };

  return (
    <div className="mt-4 p-4 border-t dark:border-gray-700">
      <h3 className="text-lg font-medium mb-2">Add User to Project</h3>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search by username..."
        className="w-full p-2 border rounded-md mb-2"
      />
      {matches.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow-md rounded p-2 mb-2">
          {matches.map((user) => (
            <div
              key={user.id}
              onClick={() => handleAddUser(user.username)}
              className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              {user.username}
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-red-500">{error}</p>}
      <Button onClick={() => searchQuery && handleAddUser(searchQuery)} className="mt-2 w-full">
        Add User
      </Button>
    </div>
  );
}
