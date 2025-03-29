'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';

// Types
type Journal = {
  id: number | string;
  title: string;
  content: string;       // Rich text / HTML
  date_created: string;  // For display
};

type Attachment = {
  id: string | number;
  journal_id: string | number;
  file_id: string;       // The Directus file ID
};

export default function ProjectJournalPage() {
  const { id: projectId } = useParams();
  const { user } = useUser();

  const [directusUserId, setDirectusUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_DIRECTUS_API_URL || 'https://crm.lahirupeiris.com';
  const apiToken = process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN || '';

  /**
   * 1) Fetch the current user's Directus user ID
   *    by matching clerk_id in the Directus "users" table
   */
  useEffect(() => {
    const fetchDirectusUser = async () => {
      if (!user?.id) return;
      try {
        // GET /items/users?filter[clerk_id][_eq]=<clerkId>
        const res = await fetch(
          `${apiUrl}/items/users?filter[clerk_id][_eq]=${user.id}`,
          {
            headers: {
              Authorization: `Bearer ${apiToken}`,
            },
          }
        );
        if (!res.ok) {
          console.error('Failed to fetch Directus user. Status:', res.status);
          return;
        }
        const json = await res.json();
        const foundUserId = json.data?.[0]?.id || null;
        setDirectusUserId(foundUserId);
      } catch (err) {
        console.error('Error fetching Directus user ID:', err);
      }
    };
    fetchDirectusUser();
  }, [user, apiUrl, apiToken]);

  /**
   * 2) Once we have `directusUserId`, fetch the role from Projects_Users
   */
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!projectId || !directusUserId) return;
      try {
        // GET /items/Projects_Users?filter[project_id][_eq]=<pId>&filter[user_id][_eq]=<uId>
        const res = await fetch(
          `${apiUrl}/items/Projects_Users?filter[project_id][_eq]=${projectId}&filter[user_id][_eq]=${directusUserId}`,
          {
            headers: {
              Authorization: `Bearer ${apiToken}`,
            },
          }
        );
        if (!res.ok) {
          console.error('Failed to fetch user role from Projects_Users. Status:', res.status);
          return;
        }
        const data = await res.json();
        const role = data.data?.[0]?.role || null;
        setUserRole(role);
      } catch (err) {
        console.error('Error fetching user role:', err);
      }
    };
    fetchUserRole();
  }, [projectId, directusUserId, apiUrl, apiToken]);

  /**
   * 3) Fetch the project's journals
   */
  useEffect(() => {
    if (!projectId) return;

    const fetchJournals = async () => {
      try {
        // GET /items/project_journal?filter[project_id][_eq]=<pId>&sort=-date_created
        const res = await fetch(
          `${apiUrl}/items/project_journal?filter[project_id][_eq]=${projectId}&sort=-date_created`,
          { headers: { Authorization: `Bearer ${apiToken}` } }
        );
        if (!res.ok) {
          throw new Error('Failed to fetch project journals');
        }
        const data = await res.json();
        setJournals(data?.data || []);
      } catch (err: any) {
        setError(err.message || 'Error fetching journals');
      } finally {
        setLoading(false);
      }
    };
    fetchJournals();
  }, [projectId, apiUrl, apiToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="p-4 max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg text-center">
          <p className="text-red-500 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Navbar />

      <main className="flex-grow max-w-5xl mx-auto px-4 py-8 w-full">
        {/* If user is "admin", show Create Journal button */}
        {userRole === 'admin' && (
          <div className="mb-6">
            <Link href={`/journal-editor?projectId=${projectId}`}>
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                Create Journal
              </button>
            </Link>
          </div>
        )}

        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-gray-100">
          Project Journals
        </h1>

        {journals.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <p className="text-gray-700 dark:text-gray-200">
              No journals found for this project.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {journals.map((journal) => (
              <JournalEntry
                key={journal.id}
                journal={journal}
                userRole={userRole}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function JournalEntry({
  journal,
  userRole,
}: {
  journal: Journal;
  userRole: string | null;
}) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const apiUrl = process.env.NEXT_PUBLIC_DIRECTUS_API_URL || 'https://crm.lahirupeiris.com';
  const apiToken = process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN || '';

  useEffect(() => {
    const fetchAttachments = async () => {
      try {
        // GET /items/journal_attachments?filter[journal_id][_eq]=<journal.id>
        const res = await fetch(
          `${apiUrl}/items/journal_attachments?filter[journal_id][_eq]=${journal.id}`,
          { headers: { Authorization: `Bearer ${apiToken}` } }
        );
        if (!res.ok) {
          throw new Error('Failed to fetch journal attachments');
        }
        const data = await res.json();
        setAttachments(data?.data || []);
      } catch (err) {
        console.error('Error fetching attachments:', err);
      }
    };
    fetchAttachments();
  }, [journal.id, apiUrl, apiToken]);

  return (
    <article className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
        {journal.title}
      </h2>

      {journal.date_created && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Created on: {new Date(journal.date_created).toLocaleDateString()}
        </p>
      )}

      {/* Render rich text HTML */}
      <div
        className="prose dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: journal.content }}
      />

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
            Attachments
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="bg-gray-100 dark:bg-gray-700 p-2 rounded"
              >
                <img
                  src={`${apiUrl}/assets/${att.file_id}`}
                  alt={`Attachment ${att.id}`}
                  className="w-full h-auto rounded"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit button if user is admin */}
      {userRole === 'admin' && (
        <div className="mt-4">
          <Link href={`/journal-editor?journalId=${journal.id}`}>
            <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
              Edit Journal
            </button>
          </Link>
        </div>
      )}
    </article>
  );
}
