'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, SignIn } from '@clerk/nextjs';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ProjectForm from '../components/ProjectForm';
import dynamic from 'next/dynamic';
import Notification from '../components/Notification';
import GoogleMapsWrapper from '../components/GoogleMapsWrapper';

// Dynamic import for Lottie (no SSR)
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

export default function CreateProjectPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [animationData, setAnimationData] = useState(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [userInfo, setUserInfo] = useState<{ id: string; first_name: string; last_name: string } | null>(null);

  useEffect(() => {
    fetch('https://lottie.host/c70fcd40-dfb5-4cc5-a7a8-8a65df1a840f/FRg3oQ54HX.json')
      .then(res => res.json())
      .then(setAnimationData);

    // Detect dark mode
    setDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  // Fetch user information
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user) return;
      
      try {
        const response = await fetch('/api/user-info');
        if (!response.ok) throw new Error('Failed to fetch user information');
        
        const data = await response.json();
        setUserInfo({
          id: data.id,
          first_name: data.first_name || user.firstName || '',
          last_name: data.last_name || user.lastName || ''
        });
      } catch (err) {
        console.error('Error fetching user info:', err);
      }
    };
    
    if (isLoaded && isSignedIn && user) {
      fetchUserInfo();
    }
  }, [isLoaded, isSignedIn, user]);

  // Redirect to sign-in page if the user is not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

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
      
      setNotification({
        message: 'Project created successfully!',
        type: 'success'
      });
      
      // Redirect after a short delay to show the success message
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (err) {
      setNotification({
        message: err instanceof Error ? err.message : 'An unexpected error occurred.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section with Animation */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-12">
          <div className="text-center md:text-left mb-8 md:mb-0">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
              Create New Project
            </h1>
            <p className="mt-3 text-base text-gray-500 dark:text-gray-400 sm:text-lg md:mt-5 md:text-xl">
              Bring your ideas to life with our intuitive project creation tools
            </p>
          </div>
          
          {/* Animation Container */}
          <div className="w-48 h-48 md:w-64 md:h-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            {animationData && (
              <Lottie
                animationData={animationData}
                loop={true}
                className="w-full h-full"
              />
            )}
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <GoogleMapsWrapper>
            <ProjectForm 
              onSubmit={handleSubmit} 
              loading={loading} 
              darkMode={darkMode} 
              created_by={userInfo}
            />
          </GoogleMapsWrapper>
        </div>
      </div>

      <Footer />
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}
