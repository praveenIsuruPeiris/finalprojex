'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ProjectForm from '../components/ProjectForm';
import dynamic from 'next/dynamic';

// Dynamic import for Lottie with no SSR
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

export default function CreateProjectPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);


  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    fetch('https://lottie.host/c70fcd40-dfb5-4cc5-a7a8-8a65df1a840f/FRg3oQ54HX.json')
      .then(res => res.json())
      .then(setAnimationData);

    
    // Detect dark mode
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
        credentials: 'include',
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
          {/* Hero Section with Lottie */}
          <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
            <div className="w-full md:w-1/2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Create a New Project
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Bring your ideas to life with our intuitive project creation tools
              </p>
            </div>
            
            {/* Lottie Animation - Right side on desktop, top on mobile */}
            <div className="w-full md:w-1/2 flex justify-center">
              {animationData ? (
                <Lottie 
                  animationData={animationData} 
                  loop={true}
                  autoplay={true}
                  className="w-64 h-64 md:w-80 md:h-80"
                  aria-label="Project creation animation"
                />
              ) : (
                <div className="w-64 h-64 md:w-80 md:h-80 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              )}
            </div>
          </div>

          {/* Form Section */}
          <div className="mt-8">
            {error && (
              <p className="text-red-500 dark:text-red-400 mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                {error}
              </p>
            )}
            <ProjectForm onSubmit={handleSubmit} loading={loading} darkMode={darkMode} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}