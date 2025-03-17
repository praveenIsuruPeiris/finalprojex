'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

type Comment = {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  parent_id: string | null;
  replies?: Comment[];
  user?: any; // profile_image may be a string (URL) or an object
};

// Helper to get a valid profile image URL
const getProfileImageURL = (profile_image: any) => {
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

export default function CommentSection({ projectId }: { projectId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const { user } = useUser();

  // Function to fetch and process comments
  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/Project_Comments?filter[project_id][_eq]=${projectId}&fields=id,comment,date_created,user_id.first_name,user_id.last_name,parent_id,user_id.profile_image&t=${Date.now()}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        console.error('Failed to fetch comments:', await response.text());
        return;
      }
      const data = await response.json();
      console.log('Fetched comments data:', data);

      // Map all comments – any falsy parent_id (undefined, empty, or "null") becomes null.
      const allComments: Comment[] = data.data.map((comment: any) => {
        const rawParent = comment.parent_id;
        const parent_id = rawParent && rawParent !== "null" ? rawParent : null;
        return {
          id: comment.id,
          author:
            comment.user_id?.first_name && comment.user_id?.last_name
              ? `${comment.user_id.first_name} ${comment.user_id.last_name}`
              : 'Anonymous',
          content: comment.comment,
          timestamp: comment.date_created,
          parent_id,
          replies: [],
          user: comment.user_id,
        };
      });

      // Build a map of comments by ID and assign replies to their parent.
      const commentMap = new Map<string, Comment>();
      allComments.forEach((c) => commentMap.set(c.id, c));
      allComments.forEach((c) => {
        if (c.parent_id) {
          const parent = commentMap.get(c.parent_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(c);
          }
        }
      });
      // Filter top-level comments (parent_id === null)
      const topLevelComments = allComments.filter((c) => c.parent_id === null);
      setComments(topLevelComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  }, [projectId]);

  useEffect(() => {
    fetchComments();
  }, [projectId, fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    try {
      // Fetch Directus user ID using Clerk user.id
      const userIdResponse = await fetch(
        `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/users?filter[clerk_id][_eq]=${user.id}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!userIdResponse.ok) {
        console.error('Failed to fetch Directus user ID:', await userIdResponse.text());
        return;
      }
      const userData = await userIdResponse.json();
      const directusUserId = userData?.data?.[0]?.id;
      if (!directusUserId) {
        console.error('Directus user ID not found.');
        return;
      }

      // Build the request body; only include parent_id if replyTo is provided.
      const body: any = {
        project_id: projectId,
        comment: newComment,
        user_id: directusUserId,
      };
      if (replyTo) {
        body.parent_id = replyTo;
      }
      console.log('Posting comment:', body);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/Project_Comments`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );
      if (!response.ok) {
        console.error('Failed to post comment:', await response.text());
        return;
      }
      const result = await response.json();
      console.log('Comment posted:', result);

      // Clear the form and re-fetch comments after a short delay.
      setNewComment('');
      setReplyTo(null);
      setTimeout(() => {
        fetchComments();
      }, 300);
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Comments</h2>
      <form onSubmit={handleSubmit} className="mb-8">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={replyTo ? "Reply to comment..." : "Write your comment..."}
          className="w-full p-4 rounded-lg border dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
        />
        <button
          type="submit"
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors"
        >
          {replyTo ? "Post Reply" : "Post Comment"}
        </button>
      </form>
      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment.id} className="border-b dark:border-gray-700 pb-6 last:border-0">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {comment.user && comment.user.profile_image ? (
                  <img
                    src={getProfileImageURL(comment.user.profile_image) || undefined}
                    alt={comment.author}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-300 font-medium">
                      {comment.author[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-grow">
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">{comment.author}</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(comment.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="mt-1 text-gray-600 dark:text-gray-300">{comment.content}</p>
                <button
                  onClick={() => setReplyTo(comment.id)}
                  className="text-blue-500 text-sm mt-2 hover:underline"
                >
                  Reply
                </button>
              </div>
            </div>
            {comment.replies &&
              comment.replies.map((reply) => (
                <div key={reply.id} className="pl-10 mt-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {reply.user && reply.user.profile_image ? (
                        <img
                          src={getProfileImageURL(reply.user.profile_image) || undefined}
                          alt={reply.author}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-300 font-medium text-sm">
                            {reply.author[0]?.toUpperCase() || "U"}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-700 dark:text-gray-300">{reply.author}</h4>
                        <span className="text-xs text-gray-500">
                          {new Date(reply.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400">{reply.content}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
