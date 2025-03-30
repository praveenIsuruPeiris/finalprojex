'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from 'flowbite-react';
import AddUserToProject from './AddUserToProject';
import debounce from 'lodash/debounce';
import Link from 'next/link';

interface ChatMessage {
  id: string;
  message: string;
  date_created: string;
  user_id: {
    id: string;
    first_name?: string;
    last_name?: string;
    profile_image?: { id: string } | string;
  };
}

interface GroupMember {
  id: string;
  first_name: string;
  last_name: string;
  profile_image?: { id: string } | string;
}

type GroupChatPanelProps = {
  projectId: string;
  closeChat: () => void;
};

const getProfileImageURL = (profile_image: any): string | null => {
  if (!profile_image) return null;
  if (typeof profile_image === 'string') {
    return profile_image.startsWith('http')
      ? profile_image
      : `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/assets/${profile_image}?key=thumb`;
  } else if (typeof profile_image === 'object' && profile_image.id) {
    return `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/assets/${profile_image.id}?key=thumb`;
  }
  return null;
};

export default function GroupChatPanel({ projectId, closeChat }: GroupChatPanelProps) {
  const { user } = useUser();
  const [directusUserId, setDirectusUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/Project_Chat?` +
          new URLSearchParams({
            limit: '50',
            sort: '-date_created',
            fields:
              'id,message,date_created,user_id.id,user_id.first_name,user_id.last_name,user_id.profile_image',
            filter: JSON.stringify({ project_id: { _eq: projectId } }),
          }),
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
          },
        }
      );
      if (res.ok) {
        const data = (await res.json()).data;
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const fetchGroupMembers = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/Projects_Users?` +
          new URLSearchParams({
            fields:
              'user_id.id,user_id.first_name,user_id.last_name,user_id.profile_image',
            filter: JSON.stringify({ project_id: { _eq: projectId } }),
          }),
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
          },
        }
      );
      if (res.ok) {
        const data = (await res.json()).data;
        const mapped = data.map((item: any) => item.user_id);
        setGroupMembers(mapped);
      }
    } catch (err) {
      console.error('Error fetching group members:', err);
    }
  };

  const connectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const apiUrl = process.env.NEXT_PUBLIC_DIRECTUS_API_URL!;
    const wsUrl =
      apiUrl.replace(/^http/, 'ws') +
      '/websocket?token=' +
      process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'subscribe',
          collection: 'Project_Chat',
          query: {
            filter: { project_id: { _eq: projectId } },
            fields: [
              'id',
              'message',
              'date_created',
              'user_id.id',
              'user_id.first_name',
              'user_id.last_name',
              'user_id.profile_image',
            ],
          },
        })
      );
      fetchMessages();
      fetchGroupMembers();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }

        if (data.type === 'subscription' && data.event === 'create') {
          const newData = Array.isArray(data.data) ? data.data : [data.data];
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const filtered = newData.filter(
              (msg: ChatMessage) => !existingIds.has(msg.id)
            );
            return [...filtered, ...prev];
          });
        }
      } catch (err) {
        console.error('Error parsing websocket message:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    ws.onclose = () => {
      console.log('WebSocket closed. Reconnecting in 5s...');
      reconnectWebSocket();
    };
  };

  const reconnectWebSocket = debounce(() => {
    connectWebSocket();
  }, 5000);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [projectId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !directusUserId) return;

    const localMessage = newMessage;
    setNewMessage('');
    try {
      await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/Project_Chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
        },
        body: JSON.stringify({
          project_id: projectId,
          user_id: directusUserId,
          message: localMessage,
        }),
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const memberList = useMemo(() => {
    return groupMembers.map((member) => (
      <div key={member.id} className="flex flex-col items-center shrink-0">
        <img
          src={getProfileImageURL(member.profile_image) || '/default-avatar.png'}
          alt={`${member.first_name} ${member.last_name}`}
          className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
        />
        <span className="text-xs text-gray-600 dark:text-gray-300 mt-1">
          {member.first_name}
        </span>
      </div>
    ));
  }, [groupMembers]);

  const messageList = useMemo(() => {
    return messages.map((msg) => {
      const isCurrentUser = msg.user_id.id === directusUserId;
      return (
        <div
          key={msg.id}
          className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[85%] rounded-lg p-3 ${
              isCurrentUser
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-gray-100 dark:bg-gray-800 rounded-bl-none'
            }`}
          >
            <div className="flex items-center space-x-2 mb-1">
              <img
                src={
                  getProfileImageURL(msg.user_id.profile_image) ||
                  '/default-avatar.png'
                }
                alt={`${msg.user_id.first_name || ''} ${
                  msg.user_id.last_name || ''
                }`}
                className="w-6 h-6 rounded-full"
              />
              <span className="text-sm font-medium">
                {msg.user_id.first_name} {msg.user_id.last_name}
              </span>
            </div>
            <p className="text-sm">{msg.message}</p>
            <div className="text-xs mt-1 opacity-70">
              {new Date(msg.date_created).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>
      );
    });
  }, [messages, directusUserId]);

  return (
    <div className="fixed right-0 top-0 h-screen w-96 bg-white dark:bg-gray-900 shadow-xl flex flex-col">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex justify-between items-center">
        <h2 className="text-white text-xl font-bold">Project Chat</h2>
        <button
          onClick={closeChat}
          className="text-white hover:text-gray-200 transition-colors text-2xl"
        >
          &times;
        </button>
      </div>

      <div className="p-3 border-b dark:border-gray-700 flex items-center space-x-3 overflow-x-auto">
        {memberList}
        <button
          onClick={() => setShowAddUser(!showAddUser)}
          className="shrink-0 w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="text-xl text-gray-600 dark:text-gray-300">+</span>
        </button>
      </div>

      {showAddUser && (
        <div className="p-4 border-b dark:border-gray-700">
          <AddUserToProject projectId={projectId} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col-reverse">
        <div ref={messagesEndRef} />
        {messageList}
      </div>

      <div className="p-4 border-t dark:border-gray-700">
        <div className="flex space-x-2">
          <input
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 rounded-full px-4 py-2 border dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            onClick={handleSendMessage}
            gradientDuoTone="purpleToBlue"
            className="rounded-full px-6"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}