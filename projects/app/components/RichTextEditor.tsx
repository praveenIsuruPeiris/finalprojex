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
    <div className={darkMode ? 'dark-mode' : ''}>
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
