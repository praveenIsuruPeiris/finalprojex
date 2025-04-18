'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { uploadFiles } from '../utils/directus.utils';
import { Button } from 'flowbite-react';
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
  .ProseMirror h2 {
    font-size: 1.875rem !important;
    font-weight: bold !important;
    margin-top: 1.5rem !important;
    margin-bottom: 0.75rem !important;
    line-height: 1.2 !important;
  }
  .ProseMirror h3 {
    font-size: 1.5rem !important;
    font-weight: bold !important;
    margin-top: 1.25rem !important;
    margin-bottom: 0.5rem !important;
    line-height: 1.3 !important;
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
  }
`;

interface DirectusUser {
  id: string;
  clerk_id?: string;
}

function JournalEditorContent() {
  const { user } = useUser();
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
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Image.configure({ inline: true, allowBase64: false }),
      Link.configure({ openOnClick: false }),
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: '<p>Start writing your project journal...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert focus:outline-none max-w-none',
      },
    },
  });

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
        editor.commands.setContent(data.content || '<p></p>');
      } catch (err) {
        console.error('Error fetching journal:', err);
        setErrorMsg('Failed to load journal data');
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
    if (!editor || !title.trim()) return;
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
      const journalPayload = {
        title,
        content: editor.getHTML(),
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
        editor.commands.insertContent('<p><em>Journal updated successfully!</em></p>');
      } else {
        setSuccessMsg('Journal created successfully!');
        editor.commands.setContent('<p>Journal created successfully!</p>');
        setTitle('');
      }
      setInsertedFileIds([]);
    } catch (err) {
      console.error('Error saving journal:', err);
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto p-6 space-y-8 w-full">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">
          {journalId ? 'Edit Journal' : 'Create Journal'}
        </h1>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Journal Title"
            className="text-4xl font-bold w-full bg-transparent outline-none border-b-2 border-transparent focus:border-blue-500 transition-all placeholder-gray-400 dark:placeholder-gray-600"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-10 rounded-full" />
        </div>
        <EditorToolbar editor={editor} handleImageUpload={handleImageUpload} />
        <div className="relative group">
          <EditorContent
            editor={editor}
            className="min-h-[500px] p-6 rounded-xl border-2 border-gray-100 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:border-gray-200 dark:hover:border-gray-700"
          />
          <div className="absolute inset-0 pointer-events-none border-2 border-transparent group-focus-within:border-blue-500 rounded-xl transition-all" />
        </div>
        <div className="flex justify-end items-center gap-4">
          {successMsg && (
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm">
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="bg-red-100 text-red-800 px-4 py-2 rounded-lg text-sm">
              {errorMsg}
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            gradientDuoTone="purpleToBlue"
            className="shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all"
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
