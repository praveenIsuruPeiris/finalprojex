'use client';

import { useEffect, useState } from 'react';
import Fuse from 'fuse.js';
import { Dropdown } from 'flowbite-react';
import styles from './ProjectsFeed.module.css'; // Import CSS Module
import ProjectCard from '../components/ProjectCard';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

type Project = {
  id: number;
  title: string;
  description: string;
  status: string;
  location: string;
  date_created: string;
};

export default function ProjectsFeed() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchResults, setSearchResults] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects');
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }
        const data = await response.json();
        setProjects(data.data);
        setSearchResults(data.data);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults(projects);
      return;
    }

    const fuse = new Fuse(projects, {
      keys: ['title', 'description', 'location'],
      threshold: 0.3,
    });

    const results = fuse.search(query).map((result) => result.item);
    setSearchResults(results);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: string | null) => {
    setSelectedStatus(status);
    if (!status) {
      setSearchResults(projects);
    } else {
      const filtered = projects.filter((project) => project.status === status);
      setSearchResults(filtered);
    }
    setCurrentPage(1);
  };

  const paginatedResults = searchResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(searchResults.length / itemsPerPage);

  if (loading) return <p>Loading projects...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <Navbar />
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Projects Feed</h1>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        {/* Search Input */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search projects by title, description, or location..."
          className={styles.searchInput}
        />

        {/* Dropdown */}
        <div className={styles.dropdown}>
          <Dropdown label={selectedStatus || 'Filter by Status'}>
            <Dropdown.Item onClick={() => handleStatusFilter(null)}>All Statuses</Dropdown.Item>
            <Dropdown.Item onClick={() => handleStatusFilter('ongoing')}>Ongoing</Dropdown.Item>
            <Dropdown.Item onClick={() => handleStatusFilter('completed')}>Completed</Dropdown.Item>
            <Dropdown.Item onClick={() => handleStatusFilter('pending')}>Pending</Dropdown.Item>
          </Dropdown>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {paginatedResults.map((project) => (
          <a key={project.id} href={`/projects-feed/${project.id}`} className="no-underline">
            <ProjectCard
              title={project.title || 'Untitled'}
              description={project.description || 'No description provided'}
              status={project.status || 'N/A'}
              location={project.location || 'N/A'}
              createdAt={project.date_created}
            />
          </a>
        ))}
      </div>

      {/* Pagination */}
      <div className={styles.paginationContainer}>
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className={styles.paginationButton}
        >
          Previous
        </button>
        <span className="mx-4">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className={styles.paginationButton}
        >
          Next
        </button>
      </div>

      <Footer />
    </div>
  );
}
