'use client';

import { LoadScript } from '@react-google-maps/api';
import { ReactNode, useEffect, useState } from 'react';

interface GoogleMapsWrapperProps {
  children: ReactNode;
}

// Singleton instance to track if the API is loaded
let isGoogleMapsLoaded = false;

export default function GoogleMapsWrapper({ children }: GoogleMapsWrapperProps) {
  const [isApiKeyValid, setIsApiKeyValid] = useState(false);
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';

  useEffect(() => {
    if (!googleApiKey) {
      console.error('Google Maps API key is not set. Please check your environment variables.');
      return;
    }
    setIsApiKeyValid(true);
  }, [googleApiKey]);

  if (!isApiKeyValid) {
    return (
      <div className="w-full p-4 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 rounded-lg">
        Google Maps API key is not configured. Please check your environment variables.
      </div>
    );
  }

  // If the API is already loaded, just render the children
  if (isGoogleMapsLoaded) {
    return <>{children}</>;
  }

  return (
    <LoadScript 
      googleMapsApiKey={googleApiKey} 
      libraries={['places']}
      loadingElement={
        <div className="w-full h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      }
      onLoad={() => {
        isGoogleMapsLoaded = true;
      }}
    >
      {children}
    </LoadScript>
  );
} 