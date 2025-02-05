'use client';

import { useEffect, useState } from "react";
import "flowbite";
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton
} from "@clerk/nextjs";

// interface NavbarProps {
//   darkMode: boolean;
//   toggleDarkMode: () => void;
// }


export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

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

    if (newMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <ClerkProvider>
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto px-4 py-3">
          {/* Logo Section */}
          <a href="/" className="flex items-center space-x-3 rtl:space-x-reverse">
            <img
              src="https://flowbite.com/docs/images/logo.svg"
              className="h-8"
              alt="Flowbite Logo"
            />
            <span className="self-center text-2xl font-semibold whitespace-nowrap text-gray-900 dark:text-white">
              Projex
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4 lg:space-x-6">
            <div className="flex items-center space-x-4 lg:space-x-6">
              <a href="/" className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2.5 rounded-lg transition-colors duration-300">
                Home
              </a>
              <a href="create-project" className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2.5 rounded-lg transition-colors duration-300">
                Create Project
              </a>
              <a href="projects-feed" className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2.5 rounded-lg transition-colors duration-300">
                Projects
              </a>
              <a href="announcements" className="relative text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2.5 rounded-lg transition-colors duration-300 flex items-center">
                Announcements
                <span className="absolute -top-1.5 right-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                </span>
              </a>
            </div>

            <div className="flex items-center space-x-4 lg:space-x-6 ml-4 border-l border-gray-200 dark:border-gray-700 pl-4">
              <button 
                onClick={toggleDarkMode} 
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-2.5 rounded-lg transition-colors duration-300"
                aria-label="Toggle dark mode"
              >
                {darkMode ? "☀️" : "🌙"}
              </button>
              <SignedOut>
                <SignInButton>
                  <button className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2.5 rounded-lg transition-colors duration-300">
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <div className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors duration-300">
                  <UserButton appearance={{
                    elements: {
                      userButtonAvatarBox: "w-9 h-9",
                    }
                  }} />
                </div>
              </SignedIn>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="md:hidden text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors duration-300"
            aria-label="Open navigation menu"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 5h14a1 1 0 110 2H3a1 1 0 010-2zm0 5h14a1 1 0 110 2H3a1 1 0 010-2zm0 5h14a1 1 0 110 2H3a1 1 0 010-2z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        <div className={`md:hidden ${isOpen ? "block" : "hidden"} bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700`}>
          <div className="px-4 py-2 space-y-1">
            <a href="/" className="block text-gray-700 dark:text-gray-300 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-300">
              Home
            </a>
            <a href="/create-project" className="block text-gray-700 dark:text-gray-300 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-300">
              Create Project
            </a>
            <a href="/projects-feed" className="block text-gray-700 dark:text-gray-300 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-300">
              Projects
            </a>
            <a href="/announcements" className="block text-gray-700 dark:text-gray-300 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-300">
              <div className="flex items-center justify-between">
                <span>Announcements</span>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </div>
            </a>
            <button 
              onClick={toggleDarkMode} 
              className="w-full text-left text-gray-700 dark:text-gray-300 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-300"
            >
              {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
            </button>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <SignedOut>
                <SignInButton>
                  <button className="w-full text-left text-gray-700 dark:text-gray-300 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-300">
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <div className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-300">
                  <UserButton appearance={{
                    elements: {
                      userButtonAvatarBox: "w-9 h-9",
                      userButtonPopoverCard: "dark:bg-gray-800"
                    }
                  }} />
                </div>
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>
    </ClerkProvider>
  );
}