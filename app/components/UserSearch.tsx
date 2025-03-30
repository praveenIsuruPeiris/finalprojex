'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, TextInput } from 'flowbite-react';
import { HiSearch } from 'react-icons/hi';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_image?: { id: string };
}

export default function UserSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setUsers([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/users?` +
            new URLSearchParams({
              filter: JSON.stringify({
                _or: [
                  { first_name: { _contains: searchQuery } },
                  { last_name: { _contains: searchQuery } },
                  { email: { _contains: searchQuery } },
                ],
              }),
              limit: '10',
            })
        );

        if (response.ok) {
          const data = await response.json();
          setUsers(data.data);
        }
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleUserClick = (userId: string) => {
    router.push(`/profile/${userId}`);
    setSearchQuery('');
    setUsers([]);
  };

  return (
    <div className="relative">
      <div className="flex items-center">
        <TextInput
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
          icon={HiSearch}
        />
      </div>

      {/* Search Results */}
      {searchQuery.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          {isLoading ? (
            <div className="p-4 text-center text-gray-600 dark:text-gray-400">
              Searching...
            </div>
          ) : users.length > 0 ? (
            <ul className="py-2">
              {users.map((user) => (
                <li
                  key={user.id}
                  onClick={() => handleUserClick(user.id)}
                  className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <img
                    src={
                      user.profile_image
                        ? `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/assets/${user.profile_image.id}`
                        : '/default-avatar.png'
                    }
                    alt={`${user.first_name} ${user.last_name}`}
                    className="w-8 h-8 rounded-full mr-3"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {user.email}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-gray-600 dark:text-gray-400">
              No users found
            </div>
          )}
        </div>
      )}
    </div>
  );
} 