// GroupChatButton.tsx
'use client';
import { useState } from 'react';
import { Button } from 'flowbite-react';
import GroupChat from './GroupChat';

interface GroupChatButtonProps {
  isVisible: boolean;
}

export default function GroupChatButton({ isVisible }: GroupChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isVisible) return null;

  return (
    <>
      <Button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-4 right-4">
        {isOpen ? 'Close Chat' : 'Open Group Chat'}
      </Button>
      {isOpen && <GroupChat onClose={() => setIsOpen(false)} />}
    </>
  );
}



