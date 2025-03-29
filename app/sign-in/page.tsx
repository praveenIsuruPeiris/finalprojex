'use client';

import { SignIn, useUser } from '@clerk/nextjs';
import { useEffect } from 'react';

export default function SignInPage() {
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    if (isSignedIn && user) {
      const userData = {
        id: user.id, 
        username: user.username, 
        first_name: user.firstName, 
        last_name: user.lastName, 
        email: user.primaryEmailAddress?.emailAddress,
      };

      fetch('/api/clerk-webhook', {
        method: 'POST',
        body: JSON.stringify({ data: userData }),
        headers: { 'Content-Type': 'application/json' },
      })
      .then((res) => res.json())
      .then((data) => console.log("User sync response:", data))
      .catch((err) => console.error("Sync error:", err));
    }
  }, [isSignedIn, user]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <SignIn routing="hash" />
    </div>
  );
}
