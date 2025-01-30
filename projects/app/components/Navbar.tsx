"use client"; // Enable client-side features for Flowbite interactivity

import { useEffect } from "react";
import "flowbite"; // Ensure Flowbite's JavaScript is imported

export default function Navbar() {
  useEffect(() => {
    // Initialize Flowbite for dropdowns and other components
    import("flowbite").then((flowbite) => {
      flowbite.initFlowbite();
    });
  }, []);

  return (
    <nav className="bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700">
      <div className="max-w-screen-xl flex items-center justify-between mx-auto p-4">
        {/* Logo Section */}
        <a href="/" className="flex items-center space-x-3">
          <img
            src="https://flowbite.com/docs/images/logo.svg"
            className="h-8"
            alt="Flowbite Logo"
          />
          <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">
            Projex
          </span>
        </a>

        {/* Navigation Menu */}
        <div className="hidden md:flex md:items-center md:space-x-8">
          <a
            href="/"
            className="text-gray-900 hover:text-blue-700 dark:text-white dark:hover:text-blue-500 px-3 py-2"
          >
            Home
          </a>
          <a
            href="create-project"
            className="text-gray-900 hover:text-blue-700 dark:text-white dark:hover:text-blue-500 px-3 py-2"
          >
            Create Project
          </a>
          <a
            href="projects-feed"
            className="text-gray-900 hover:text-blue-700 dark:text-white dark:hover:text-blue-500 px-3 py-2"
          >
            Projects
          </a>
          <a
            href="announcements"
            className="text-gray-900 hover:text-blue-700 dark:text-white dark:hover:text-blue-500 px-3 py-2 flex items-center"
          >
            Announcements
            <svg
              className="w-5 h-5 ml-1"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M17.133 12.632v-1.8a5.406 5.406 0 0 0-4.154-5.262.955.955 0 0 0 .021-.106V3.1a1 1 0 0 0-2 0v2.364a.955.955 0 0 0 .021.106 5.406 5.406 0 0 0-4.154 5.262v1.8C6.867 15.018 5 15.614 5 16.807 5 17.4 5 18 5.538 18h12.924C19 18 19 17.4 19 16.807c0-1.193-1.867-1.789-1.867-4.175ZM8.823 19a3.453 3.453 0 0 0 6.354 0H8.823Z" />
            </svg>
          </a>
        </div>

        {/* Account Dropdown */}
        <div className="relative">
          <button
            id="dropdownNavbarLink"
            data-dropdown-toggle="dropdownNavbar"
            className="flex items-center space-x-2 text-gray-900 hover:text-blue-700 dark:text-white dark:hover:text-blue-500 px-3 py-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5.121 17.804A15.89 15.89 0 0112 15c2.125 0 4.09.52 5.879 1.804M15 12a3 3 0 11-6 0 3 3 0 016 0zm7 3c0 7-10 10-10 10s-10-3-10-10a10 10 0 0120 0z"
              />
            </svg>
            <span>Account</span>
          </button>
          <div
            id="dropdownNavbar"
            className="z-10 hidden font-normal bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-gray-700 dark:divide-gray-600"
          >
            <ul
              className="py-2 text-sm text-gray-700 dark:text-gray-400"
              aria-labelledby="dropdownNavbarLink"
            >
              <li>
                <a
                  href="#"
                  className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                >
                  Dashboard
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                >
                  Settings
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                >
                  Earnings
                </a>
              </li>
            </ul>
            <div className="py-1">
              <a
                href="#"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white"
              >
                Sign out
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
