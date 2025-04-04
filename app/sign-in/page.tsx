'use client';

import { SignIn, useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SignInPage() {
  const { isSignedIn, user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isSignedIn && user) {
      const userData = {
        id: user.id, 
        username: user.username, 
        first_name: user.firstName, 
        last_name: user.lastName, 
        email: user.primaryEmailAddress?.emailAddress,
        profile_image: user.imageUrl,
      };

      // Sync user with Directus
      fetch('/api/sync-user', {
        method: 'POST',
        body: JSON.stringify({
          clerkId: userData.id,
          email: userData.email,
          username: userData.username,
          firstName: userData.first_name,
          lastName: userData.last_name,
          profileImage: userData.profile_image,
        }),
        headers: { 'Content-Type': 'application/json' },
      })
      .then((res) => res.json())
      .then((data) => {
        console.log("User sync response:", data);
        
        // Check if there's a redirect URL in the query parameters
        const redirectUrl = searchParams.get('redirect_url');
        if (redirectUrl) {
          // Decode and navigate to the redirect URL
          router.push(decodeURIComponent(redirectUrl));
        } else {
          // Default redirect to profile page
          router.push('/profile');
        }
      })
      .catch((err) => {
        console.error("Sync error:", err);
        // Still redirect even if sync fails
        const redirectUrl = searchParams.get('redirect_url');
        if (redirectUrl) {
          router.push(decodeURIComponent(redirectUrl));
        } else {
          router.push('/profile');
        }
      });
    }
  }, [isSignedIn, user, router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <SignIn routing="hash" />
    </div>
  );
}
