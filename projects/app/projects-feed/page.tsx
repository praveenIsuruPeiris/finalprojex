'use client';

import { useEffect, useState } from 'react';
import Fuse from 'fuse.js';
import { Dropdown } from 'flowbite-react';
import ProjectCard from '../components/ProjectCard';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Pagination from '../components/Pagination';


// Define the Project type with images as an array of objects with an id (file UUID)
type Project = {
  id: number;
  title: string;
  description: string;
  status: string;
  location: string;
  date_created: string;
  images: { id: string }[];
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
        const response = await fetch('http://localhost:8055/items/projects?fields=*,images.directus_files_id');
        if (!response.ok) throw new Error('Failed to fetch projects');

        const data = await response.json();
        console.log('Raw project data:', data.data);

        const transformedProjects = data.data.map((project: any) => ({
          ...project,
          images: Array.isArray(project.images)
            ? project.images
                .map((item: any) => (item.directus_files_id ? { id: item.directus_files_id } : null))
                .filter((img: any) => img && img.id)
            : []
        }));

        console.log('Transformed project data:', transformedProjects);
        setProjects(transformedProjects);
        setSearchResults(transformedProjects);
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
    const fuse = new Fuse(projects, { keys: ['title', 'description', 'location'], threshold: 0.3 });
    setSearchResults(fuse.search(query).map((result) => result.item));
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: string | null) => {
    setSelectedStatus(status);
    setSearchResults(status ? projects.filter((project) => project.status === status) : projects);
    setCurrentPage(1);
  };

  const paginatedResults = searchResults.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(searchResults.length / itemsPerPage);

  if (loading) return <p className="text-gray-800 text-center mt-10">Loading projects...</p>;
  if (error) return <p className="text-red-500 text-center mt-10">Error: {error}</p>;

  return (
<div className="bg-gray-100 dark:bg-gray-900 min-h-screen flex flex-col">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 flex-grow space-y-6">
        <h1 className="text-4xl font-bold text-center text-gray-900">Projects Feed</h1>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full md:w-1/2 p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Dropdown label={selectedStatus || 'Filter by Status'} className="w-48">
            <Dropdown.Item onClick={() => handleStatusFilter(null)}>All Statuses</Dropdown.Item>
            <Dropdown.Item onClick={() => handleStatusFilter('ongoing')}>Ongoing</Dropdown.Item>
            <Dropdown.Item onClick={() => handleStatusFilter('completed')}>Completed</Dropdown.Item>
            <Dropdown.Item onClick={() => handleStatusFilter('pending')}>Pending</Dropdown.Item>
          </Dropdown>
        </div>

        {/* No Results Message */}
        {searchResults.length === 0 && (
          <p className="text-center text-gray-600 text-lg mt-10">
            🚀 No projects found. Try a different search or check back later.
          </p>
        )}

        {/* Projects Grid */}
        {searchResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {paginatedResults.map((project) => (
              <a key={project.id} href={`/projects-feed/${project.id}`} className="no-underline">
                <ProjectCard
                  title={project.title || 'Untitled'}
                  description={project.description || 'No description provided'}
                  status={project.status || 'N/A'}
                  location={project.location || 'N/A'}
                  createdAt={project.date_created}
                  images={project.images}
                />
              </a>
            ))}
          </div>
        )}

        {/* Pagination */}
        {searchResults.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            startResult={(currentPage - 1) * itemsPerPage + 1}
            endResult={Math.min(currentPage * itemsPerPage, searchResults.length)}
            totalResults={searchResults.length}
          />
        )}
      </div>
      <Footer />
    </div>
  );
}
