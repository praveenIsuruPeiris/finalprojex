'use client';

import { LoadScript } from '@react-google-maps/api';
import { ReactNode } from 'react';

interface GoogleMapsWrapperProps {
  children: ReactNode;
}

export default function GoogleMapsWrapper({ children }: GoogleMapsWrapperProps) {
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';

  return (
    <LoadScript googleMapsApiKey={googleApiKey} libraries={['places']}>
      {children}
    </LoadScript>
  );
} 