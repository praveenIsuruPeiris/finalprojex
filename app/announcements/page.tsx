'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Script from 'next/script';

export default function AnnouncementsPage() {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      {/* Load Lottie player script */}
      <Script 
        src="https://unpkg.com/@dotlottie/player-component@2.7.12/dist/dotlottie-player.mjs" 
        type="module"
        onLoad={() => setIsScriptLoaded(true)}
      />
      
      {/* Main Content */}
      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl mb-6">
            Announcements
          </h1>
          <p className="text-xl text-gray-500 dark:text-gray-400 mb-8">
            Coming Soon! Stay tuned for exciting updates.
          </p>
          
          {/* Lottie Animation */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-8 mb-8 w-full max-w-[500px]">
            {isScriptLoaded ? (
              <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                <iframe 
                  src="https://lottie.host/embed/495fac8e-edc5-4b3f-b062-ff242615bb79/19q90yCWPx.lottie"
                  style={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                  title="Coming Soon Animation"
                />
              </div>
            ) : (
              <div className="w-full aspect-square flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>

          <p className="text-lg text-gray-600 dark:text-gray-300">
            We're working on something amazing. Check back soon!
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
  