/* eslint-disable */
'use client';

import { useEffect, useState } from "react";
import "flowbite";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser
} from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const { user, isSignedIn } = useUser();
  const router = useRouter();

  // Load theme from localStorage
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle("dark", newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
  };

  // Handle sign in and create session
  useEffect(() => {
    const createSession = async () => {
      if (!isSignedIn || !user) return;
  
      try {
        // First, sync the user with Directus
        const syncResponse = await fetch("/api/sync-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clerkId: user.id,
            email: user.emailAddresses[0]?.emailAddress,
            username: user.username || user.emailAddresses[0]?.emailAddress.split("@")[0],
            firstName: user.firstName,
            lastName: user.lastName,
            profileImage: user.imageUrl,
          }),
        });
  
        if (!syncResponse.ok) {
          console.error("❌ Failed to sync user with Directus:", await syncResponse.text());
        } else {
          console.log("✅ User synced successfully with Directus");
        }
  
        // Then create the session
        const sessionResponse = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clerkId: user.id,
            email: user.emailAddresses[0]?.emailAddress,
            username: user.username || user.emailAddresses[0]?.emailAddress.split("@")[0],
            firstName: user.firstName,
            lastName: user.lastName,
            profileImage: user.imageUrl,
          }),
        });
  
        if (!sessionResponse.ok) {
          console.error("❌ Failed to create session:", await sessionResponse.text());
        } else {
          console.log("✅ Session created successfully");
        }
      } catch (error) {
        console.error("❌ Error in user sync/session creation:", error);
      }
    };
  
    createSession();
  }, [user, isSignedIn]);

  // Handle sign out and clear session
  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/session", {
        method: "DELETE",
      });
      router.push("/");
    } catch (error) {
      console.error("❌ Error clearing session:", error);
    }
  };
  
  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-3 rtl:space-x-reverse">
          <img
            src="https://flowbite.com/docs/images/logo.svg"
            className="h-8"
            alt="Flowbite Logo"
          />
          <span className="text-2xl font-semibold text-gray-900 dark:text-white">
            Projex
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:space-x-6">
          <Link href="/" className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2 rounded-lg transition">
            Home
          </Link>
          <Link href="/create-project" className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2 rounded-lg transition">
            Create Project
          </Link>
          <Link href="/projects-feed" className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2 rounded-lg transition">
            Projects
          </Link>
          <Link href="/announcements" className="relative text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2 rounded-lg transition flex items-center">
            Announcements
            <span className="absolute -top-1.5 right-2.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </Link>
          <button onClick={toggleDarkMode} className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg transition">
            {darkMode ? "☀️" : "🌙"}
          </button>

          {/* Authentication */}
          <SignedOut>
            <SignInButton>
              <button className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2 rounded-lg transition">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <div className="flex items-center space-x-4">
              <div className="relative group">
                <button className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2 rounded-lg transition flex items-center">
                  My Account
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute top-full right-0 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 hidden group-hover:block z-50">
                  <SignedIn>
                    <Link href="/profile/projects" className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                      My Projects
                    </Link>
                    <Link href="/profile/manage-projects" className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                      Manage Projects
                    </Link>
                  </SignedIn>
                </div>
              </div>
              <div className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition">
                <UserButton 
                  appearance={{ 
                    elements: { userButtonAvatarBox: "w-9 h-9" },
                    variables: {
                      colorPrimary: "rgb(59 130 246)",
                      colorBackground: "rgb(255 255 255)",
                      colorInputBackground: "rgb(255 255 255)",
                      colorInputText: "rgb(17 24 39)",
                    }
                  }}
                  afterSignOutUrl="/"
                  userProfileMode="navigation"
                  userProfileUrl={user?.username ? `/profile/${user.username}` : '/profile/projects'}
                />
              </div>
            </div>
          </SignedIn>
        </div>

        {/* Mobile Menu Button */}
        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg transition">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 5h14a1 1 0 110 2H3a1 1 0 010-2zm0 5h14a1 1 0 110 2H3a1 1 0 010-2zm0 5h14a1 1 0 110 2H3a1 1 0 010-2z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 py-2">
          <Link href="/" className="block px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">Home</Link>
          <Link href="/create-project" className="block px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">Create Project</Link>
          <Link href="/projects-feed" className="block px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">Projects</Link>
          <Link href="/announcements" className="block px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">Announcements</Link>
          <button onClick={toggleDarkMode} className="block w-full text-left px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
          
          {/* Authentication */}
          <div className="flex justify-between items-center px-4 py-3">
            <SignedOut>
              <SignInButton>
                <button className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2 rounded-lg transition">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <div className="flex flex-col space-y-2">
                <Link href="/profile/projects" className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                  My Projects
                </Link>
                <Link href="/profile/manage-projects" className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                  Manage Projects
                </Link>
                <div className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition">
                  <UserButton 
                    appearance={{ 
                      elements: { userButtonAvatarBox: "w-9 h-9" },
                      variables: {
                        colorPrimary: "rgb(59 130 246)",
                        colorBackground: "rgb(255 255 255)",
                        colorInputBackground: "rgb(255 255 255)",
                        colorInputText: "rgb(17 24 39)",
                      }
                    }}
                    afterSignOutUrl="/"
                    userProfileMode="navigation"
                    userProfileUrl={user?.username ? `/profile/${user.username}` : '/profile/projects'}
                  />
                </div>
              </div>
            </SignedIn>
          </div>
        </div>
      )}
    </nav>
  );
}
