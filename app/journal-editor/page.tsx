'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { uploadFiles } from '../utils/directus.utils';
import { Button } from 'flowbite-react';
import { useTheme } from '../theme';
import {
  TextB,
  TextItalic,
  ListBullets,
  ListNumbers,
  ImageSquare,
  LinkBreak,
  AlignLeft,
  AlignCenterHorizontal,
  TextH,
} from '@phosphor-icons/react';

const API_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'https://crm.lahirupeiris.com';
const API_TOKEN = process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN || '';
const COLLECTION_NAME = 'project_journal';

const editorStyles = `
  .ProseMirror {
    min-height: 300px;
    padding: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    background-color: white;
    color: #111827;
  }
  .dark .ProseMirror {
    background-color: #1f2937;
    border-color: #374151;
    color: #e5e7eb;
  }
  .ProseMirror h2 {
    font-size: 1.875rem !important;
    font-weight: bold !important;
    margin-top: 1.5rem !important;
    margin-bottom: 0.75rem !important;
    line-height: 1.2 !important;
    color: #111827;
  }
  .dark .ProseMirror h2 {
    color: #f3f4f6;
  }
  .ProseMirror h3 {
    font-size: 1.5rem !important;
    font-weight: bold !important;
    margin-top: 1.25rem !important;
    margin-bottom: 0.5rem !important;
    line-height: 1.3 !important;
    color: #111827;
  }
  .dark .ProseMirror h3 {
    color: #f3f4f6;
  }
  .ProseMirror ul {
    list-style-type: disc !important;
    padding-left: 1.5rem !important;
    margin: 0.75rem 0 !important;
  }
  .ProseMirror ol {
    list-style-type: decimal !important;
    padding-left: 1.5rem !important;
    margin: 0.75rem 0 !important;
  }
  .ProseMirror li {
    margin: 0.25rem 0 !important;
    color: #111827;
  }
  .dark .ProseMirror li {
    color: #e5e7eb;
  }
  .ProseMirror a {
    color: #2563eb !important;
    text-decoration: underline !important;
    font-weight: 500 !important;
    padding: 0.125rem 0.25rem !important;
    border-radius: 0.25rem !important;
    background-color: rgba(37, 99, 235, 0.1) !important;
    transition: all 0.2s ease !important;
  }
  .dark .ProseMirror a {
    color: #60a5fa !important;
    background-color: rgba(96, 165, 250, 0.1) !important;
  }
  .ProseMirror a:hover {
    color: #1d4ed8 !important;
    background-color: rgba(37, 99, 235, 0.2) !important;
  }
  .dark .ProseMirror a:hover {
    color: #93c5fd !important;
    background-color: rgba(96, 165, 250, 0.2) !important;
  }
  .ProseMirror p {
    margin: 0.75rem 0 !important;
    color: #111827;
  }
  .dark .ProseMirror p {
    color: #e5e7eb;
  }
  .ProseMirror img {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
    margin: 1rem 0;
  }
  .dark .ProseMirror img {
    filter: brightness(0.9);
  }
  .ProseMirror em {
    color: #111827;
  }
  .dark .ProseMirror em {
    color: #e5e7eb;
  }
  .ProseMirror strong {
    color: #111827;
    font-weight: 600;
  }
  .dark .ProseMirror strong {
    color: #f3f4f6;
  }
`;

interface DirectusUser {
  id: string;
  clerk_id?: string;
}

function JournalEditorContent() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { darkMode } = useTheme();
  const searchParams = useSearchParams();
  const journalId = searchParams.get('journalId');
  const projectId = searchParams.get('projectId') ?? '';

  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [directusUserId, setDirectusUserId] = useState<string | null>(null);
  const [insertedFileIds, setInsertedFileIds] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bold: { HTMLAttributes: { class: 'font-bold' } },
        italic: { HTMLAttributes: { class: 'italic' } },
      }),
      Image.configure({ 
        inline: true, 
        allowBase64: false,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      LinkExtension.configure({ 
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 hover:text-blue-700 underline',
        },
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: 'bg-yellow-200 dark:bg-yellow-800',
        },
      }),
      TextAlign.configure({ 
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center'],
      }),
    ],
    content: '<p>Start writing your project journal...</p>',
    editorProps: {
      attributes: {
        class: `prose prose-lg focus:outline-none max-w-none ${darkMode ? 'dark:prose-invert' : ''}`,
      },
      handleDOMEvents: {
        keydown: (view, event) => {
          // Prevent default behavior for formatting shortcuts
          if (event.key === 'b' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            editor?.chain().focus().toggleBold().run();
            return true;
          }
          if (event.key === 'i' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            editor?.chain().focus().toggleItalic().run();
            return true;
          }
          return false;
        },
      },
    },
  });

  // Add authentication check
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in?redirect_url=' + encodeURIComponent(window.location.href));
    }
  }, [isLoaded, user, router]);

  // Fetch Directus user ID based on Clerk ID
  useEffect(() => {
    const fetchDirectusUserId = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/users?filter[clerk_id][_eq]=${user.id}&${Date.now()}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
            },
          }
        );
        if (res.ok) {
          const json = await res.json();
          setDirectusUserId(json.data[0]?.id);
        }
      } catch (err) {
        console.error('Error fetching Directus user ID:', err);
      }
    };
    fetchDirectusUserId();
  }, [user]);

  // Inject editor styles
  useEffect(() => {
    if (!editor) return;
    const styleEl = document.createElement('style');
    styleEl.innerHTML = editorStyles;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, [editor]);

  // Fetch journal content if editing
  useEffect(() => {
    if (!journalId || !editor) return;
    const fetchJournal = async () => {
      try {
        setErrorMsg(null);
        setSuccessMsg(null);
        const res = await fetch(`${API_URL}/items/${COLLECTION_NAME}/${journalId}`, {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const { data } = await res.json();
        if (!data) return;
        setTitle(data.title || '');
        
        // Process the content to ensure YouTube embeds are properly handled
        let content = data.content || '<p></p>';
        
        // Check if the content contains YouTube embeds that need to be converted
        if (content.includes('data-youtube') || content.includes('youtube.com/embed')) {
          // The content already contains YouTube embeds, use it as is
          editor.commands.setContent(content);
        } else {
          // Set the content as is
          editor.commands.setContent(content);
        }
      } catch (err) {
        console.error('Error fetching journal:', err);
        setErrorMsg('Failed to load journal data. Please try refreshing the page.');
      }
    };
    fetchJournal();
  }, [journalId, editor]);

  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
      const { fileIds, errors } = await uploadFiles(
        [file],
        ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        API_URL,
        API_TOKEN
      );
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }
      const fileId = fileIds[0];
      setInsertedFileIds((prev) => [...prev, fileId]);
      return fileId;
    } catch (err) {
      console.error('File upload error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'File upload failed');
      return null;
    }
  };

  const handleSave = async () => {
    if (!editor) {
      setErrorMsg('Editor is not initialized. Please refresh the page.');
      return;
    }
    
    if (!title.trim()) {
      setErrorMsg('Please enter a title for your journal entry');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      if (!journalId) {
        if (!projectId.trim()) {
          throw new Error('Project ID is required in URL parameters');
        }
        if (!directusUserId) {
          throw new Error('User authentication failed - please refresh the page');
        }
      }

      const content = editor.getHTML();
      if (content === '<p>Start writing your project journal...</p>' || content === '<p></p>') {
        throw new Error('Please add some content to your journal entry');
      }

      const journalPayload = {
        title: title.trim(),
        content,
        ...(!journalId && { project_id: projectId, user_id: directusUserId }),
      };
      const endpoint = journalId
        ? `${API_URL}/items/${COLLECTION_NAME}/${journalId}`
        : `${API_URL}/items/${COLLECTION_NAME}`;
      const method = journalId ? 'PATCH' : 'POST';
      const journalRes = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(journalPayload),
      });
      if (!journalRes.ok) {
        const errorBody = await journalRes.text();
        console.error('Directus error:', errorBody);
        throw new Error(journalId ? 'Failed to update journal' : 'Failed to create journal');
      }
      const { data } = await journalRes.json();
      const newJournalId = data?.id ?? journalId;
      if (!newJournalId) {
        throw new Error('No journal ID received from server');
      }
      if (insertedFileIds.length > 0) {
        await Promise.all(
          insertedFileIds.map((fileId) =>
            fetch(`${API_URL}/items/journal_attachments`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ journal_id: newJournalId, file_id: fileId }),
            })
          )
        );
      }
      if (journalId) {
        setSuccessMsg('Journal updated successfully!');
      } else {
        setSuccessMsg('Journal created successfully!');
        editor.commands.setContent('<p>Start writing your project journal...</p>');
        setTitle('');
      }
      setInsertedFileIds([]);
      
      // Redirect to the journal page after a short delay
      setTimeout(() => {
        if (projectId) {
          // Use window.location for more reliable redirection
          window.location.href = `/journal/${projectId}`;
        } else {
          console.error('No project ID available for redirection');
        }
      }, 1000);
    } catch (err) {
      console.error('Error saving journal:', err);
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto p-6 space-y-8 w-full">
        <div className="flex justify-between items-center">
          <h1 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {journalId ? 'Edit Journal' : 'Create Journal'}
          </h1>
          {projectId && (
            <Link href={`/journal/${projectId}`}>
              <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                Back to Journals
              </button>
            </Link>
          )}
        </div>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Journal Title"
            className={`text-4xl font-bold w-full bg-transparent outline-none border-b-2 border-transparent focus:border-blue-500 transition-all ${
              darkMode 
                ? 'text-white placeholder-gray-400' 
                : 'text-gray-900 placeholder-gray-500'
            }`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-10 rounded-full" />
        </div>
        <EditorToolbar editor={editor} handleImageUpload={handleImageUpload} />
        <div className="relative group">
          <EditorContent
            editor={editor}
            className={`min-h-[500px] p-6 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
              darkMode 
                ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          />
          <div className="absolute inset-0 pointer-events-none border-2 border-transparent group-focus-within:border-blue-500 rounded-xl transition-all" />
        </div>
        <div className="flex justify-end items-center gap-4">
          {successMsg && (
            <div className={`px-4 py-2 rounded-lg text-sm ${
              darkMode 
                ? 'bg-green-900/30 text-green-200' 
                : 'bg-green-100 text-green-800'
            }`}>
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className={`px-4 py-2 rounded-lg text-sm ${
              darkMode 
                ? 'bg-red-900/30 text-red-200' 
                : 'bg-red-100 text-red-800'
            }`}>
              {errorMsg}
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            gradientDuoTone="purpleToBlue"
            className={`shadow-lg transition-all ${
              darkMode 
                ? 'shadow-blue-500/20 hover:shadow-blue-500/40 text-white' 
                : 'shadow-blue-500/40 hover:shadow-blue-500/60 text-white font-bold'
            }`}
          >
            {isSaving ? 'Saving...' : 'Publish Journal'}
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function JournalEditorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JournalEditorContent />
    </Suspense>
  );
}

interface EditorToolbarProps {
  editor: any;
  handleImageUpload: (file: File) => Promise<string | null>;
}

function EditorToolbar({ editor, handleImageUpload }: EditorToolbarProps) {
  const handleImageInsert = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (evt) => {
      const file = (evt.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const fileId = await handleImageUpload(file);
      if (fileId) {
        const url = `${API_URL}/assets/${fileId}`;
        editor.chain().focus().setImage({ src: url }).run();
      }
    };
    input.click();
  };

  if (!editor) return null;

  return (
    <div className="flex flex-wrap gap-1 p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
      <ToolbarButton
        title="Heading 2"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <TextH size={20} weight="bold" className="w-5 h-5" />
        <span className="text-xs">2</span>
      </ToolbarButton>
      <ToolbarButton
        title="Heading 3"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <TextH size={20} weight="bold" className="w-5 h-5" />
        <span className="text-xs">3</span>
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        title="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <TextB size={20} className="w-5 h-5" />
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <TextItalic size={20} className="w-5 h-5" />
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        title="Bullet List"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <ListBullets size={20} className="w-5 h-5" />
      </ToolbarButton>
      <ToolbarButton
        title="Numbered List"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListNumbers size={20} className="w-5 h-5" />
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        title="Align Left"
        active={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      >
        <AlignLeft size={20} className="w-5 h-5" />
      </ToolbarButton>
      <ToolbarButton
        title="Align Center"
        active={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      >
        <AlignCenterHorizontal size={20} className="w-5 h-5" />
      </ToolbarButton>
      <Divider />
      <ToolbarButton title="Insert Image" onClick={handleImageInsert}>
        <ImageSquare size={20} className="w-5 h-5" />
      </ToolbarButton>
      <ToolbarButton
        title="Insert Link"
        active={editor.isActive('link')}
        onClick={() => {
          const url = prompt('Enter URL');
          if (url) editor.chain().focus().toggleLink({ href: url }).run();
        }}
      >
        <LinkBreak size={20} className="w-5 h-5" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  children,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-2 rounded-md flex items-center gap-1 transition-colors ${
        active
          ? 'bg-blue-500 text-white'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-6 mx-1 bg-gray-200 dark:bg-gray-700" />;
}