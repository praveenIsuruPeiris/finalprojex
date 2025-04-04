/* eslint-disable */'use client';


import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  darkMode?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, darkMode = false }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
  });

  if (!editor) return null;

  return (
    <div className={darkMode ? 'dark-mode' : 'light-mode'}>
      <EditorContent editor={editor} />
      <style jsx global>{`
        .light-mode .ProseMirror {
          color: #374151;
          background-color: #ffffff;
        }
        
        .dark-mode .ProseMirror {
          color: #f3f4f6;
          background-color: #1f2937;
        }
        
        .ProseMirror {
          padding: 1rem;
          min-height: 150px;
          outline: none;
        }
        
        .ProseMirror p {
          margin-bottom: 0.75rem;
        }
        
        .ProseMirror h1,
        .ProseMirror h2,
        .ProseMirror h3,
        .ProseMirror h4,
        .ProseMirror h5,
        .ProseMirror h6 {
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        
        .light-mode .ProseMirror h1,
        .light-mode .ProseMirror h2,
        .light-mode .ProseMirror h3,
        .light-mode .ProseMirror h4,
        .light-mode .ProseMirror h5,
        .light-mode .ProseMirror h6 {
          color: #111827;
        }
        
        .dark-mode .ProseMirror h1,
        .dark-mode .ProseMirror h2,
        .dark-mode .ProseMirror h3,
        .dark-mode .ProseMirror h4,
        .dark-mode .ProseMirror h5,
        .dark-mode .ProseMirror h6 {
          color: #f9fafb;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
