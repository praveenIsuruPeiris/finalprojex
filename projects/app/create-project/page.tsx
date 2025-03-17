'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ProjectForm from '../components/ProjectForm';

export default function CreateProjectPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Detect dark mode from HTML root class
    setDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  if (!isLoaded) return <p className="text-center text-gray-800 dark:text-gray-300">Loading...</p>;
  if (!isSignedIn) return null;

  const handleSubmit = async (formData: any) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/create-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include', // Ensures cookies (sessions) are sent
      });

      if (!response.ok) throw new Error('Failed to create project.');
      alert('Project created successfully!');
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <Navbar />
      <main className="flex-grow py-10">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-6 shadow-md rounded-lg">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create a New Project</h1>
          {error && <p className="text-red-500 dark:text-red-400 mt-4">{error}</p>}
          <ProjectForm onSubmit={handleSubmit} loading={loading} darkMode={darkMode} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
