// GroupChat.tsx
import { useState, useEffect } from 'react';
import { Button } from 'flowbite-react';


interface GroupChatProps {
  onClose: () => void;
}

interface Message {
  user: string;
  content: string;
  timestamp: string;
}

export default function GroupChat({ onClose }: GroupChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    const message: Message = {
      user: 'Current User',
      content: newMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages([...messages, message]);
    setNewMessage('');
  };

  return (
    <div className="fixed bottom-0 right-0 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-t-lg">
      <div className="flex justify-between items-center p-4 bg-blue-600 text-white">
        <h2 className="text-lg font-semibold">Group Chat</h2>
        <Button color="gray" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="p-4 h-64 overflow-y-auto space-y-2">
        {messages.map((msg, index) => (
          <div key={index} className="bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
            <p className="text-sm text-gray-700 dark:text-gray-200">{msg.user}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{msg.content}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </p>
          </div>
        ))}
      </div>
      <div className="p-4 flex items-center space-x-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none"
        />
        <Button onClick={handleSendMessage}>Send</Button>
      </div>
    </div>
  );
}