'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from 'flowbite-react';
import AddUserToProject from './AddUserToProject';
import debounce from 'lodash/debounce';
import UserSearch from './UserSearch';

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
  const [isPinned, setIsPinned] = useState(false);
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
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none border border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2 mb-1">
              <img
                src={getProfileImageURL(msg.user_id.profile_image) || '/default-avatar.png'}
                alt={`${msg.user_id.first_name || ''} ${msg.user_id.last_name || ''}`}
                className="w-6 h-6 rounded-full"
              />
              <span className={`text-sm font-medium ${isCurrentUser ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                {msg.user_id.first_name} {msg.user_id.last_name}
              </span>
            </div>
            <p className="text-sm">{msg.message}</p>
            <div className={`text-xs mt-1 ${isCurrentUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
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
    <div className={`fixed right-0 top-0 h-screen w-full sm:w-96 bg-white dark:bg-gray-900 shadow-xl flex flex-col transition-all duration-300 ${isPinned ? 'z-50' : 'z-40'}`}>
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsPinned(!isPinned)}
            className={`p-2 rounded-full transition-colors ${
              isPinned 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}
            title={isPinned ? "Unpin chat" : "Pin chat"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Project Chat</h2>
        </div>
        <button
          onClick={closeChat}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-3 border-b dark:border-gray-700 flex items-center space-x-3 overflow-x-auto bg-gray-50 dark:bg-gray-800">
        {memberList}
        <button
          onClick={() => setShowAddUser(!showAddUser)}
          className="shrink-0 w-10 h-10 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
        >
          <span className="text-xl text-gray-600 dark:text-gray-300">+</span>
        </button>
      </div>

      {showAddUser && (
        <div className="p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
          <AddUserToProject 
            projectId={projectId} 
            show={showAddUser}
            onClose={() => setShowAddUser(false)}
            onUserAdded={() => {
              fetchGroupMembers();
              setShowAddUser(false);
            }}
            context="chat"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col-reverse bg-gray-50 dark:bg-gray-900">
        <div ref={messagesEndRef} />
        {messageList}
      </div>

      <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800 sticky bottom-0">
        <div className="flex space-x-2">
          <input
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 rounded-full px-4 py-2 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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