/* eslint-disable */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { HiThumbUp, HiThumbDown } from 'react-icons/hi';

type Comment = {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  parent_id: string | null;
  replies?: Comment[];
  user?: any; // profile_image may be a string (URL) or an object
  likeCount: number;
  dislikeCount: number;
  userReaction?: 'like' | 'dislike' | null;
};

// Helper to get a valid profile image URL
const getProfileImageURL = (profile_image: any): string | undefined => {
  if (!profile_image) return undefined;
  if (typeof profile_image === 'string') {
    return profile_image.startsWith('http')
      ? profile_image
      : `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/assets/${profile_image}?key=thumb`;
  } else if (typeof profile_image === 'object' && profile_image.id) {
    return `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/assets/${profile_image.id}?key=thumb`;
  }
  return undefined;
};

export default function CommentSection({ projectId }: { projectId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [directusUserId, setDirectusUserId] = useState<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    const fetchDirectusUserId = async () => {
      if (!user) return;
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/users?filter[clerk_id][_eq]=${user.id}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
            },
          }
        );
        const data = await response.json();
        setDirectusUserId(data.data?.[0]?.id || null);
      } catch (error) {
        console.error('Error fetching Directus user ID:', error);
      }
    };
    fetchDirectusUserId();
  }, [user]);

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
          likeCount: 0,
          dislikeCount: 0,
          userReaction: null,
        };
      });

      const commentIds = allComments.map(c => c.id);
      if (commentIds.length > 0) {
        const likesResponse = await fetch(
          `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/Comment_likes?filter[comment_id][_in]=${commentIds.join(',')}`,
          { headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}` } }
        );

        if (!likesResponse.ok) {
          console.error('Failed to fetch likes:', await likesResponse.json());
          return;
        }

        const likesData = await likesResponse.json();
        const reactions = likesData.data || [];

        allComments.forEach(comment => {
          const commentReactions = reactions.filter((r: any) => r.comment_id === comment.id);
          comment.likeCount = commentReactions.filter((r: any) => r.type === 'like').length;
          comment.dislikeCount = commentReactions.filter((r: any) => r.type === 'dislike').length;
          
          if (directusUserId) {
            const userReaction = commentReactions.find((r: any) => r.user_id === directusUserId);
            comment.userReaction = userReaction ? userReaction.type : null;
          }
        });
      }

      const commentMap = new Map(allComments.map(c => [c.id, c]));
      allComments.forEach(c => {
        if (c.parent_id) {
          const parent = commentMap.get(c.parent_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(c);
          }
        }
      });

      setComments(allComments.filter(c => c.parent_id === null));
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  }, [projectId, directusUserId]);

  useEffect(() => {
    fetchComments();
  }, [projectId, fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !directusUserId) return;

    try {
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

      setNewComment('');
      setReplyTo(null);
      setTimeout(() => {
        fetchComments();
      }, 300);
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleReaction = async (commentId: string, type: 'like' | 'dislike') => {
    if (!directusUserId) return;

    try {
      const reactionResponse = await fetch(
        `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/Comment_likes?filter[comment_id][_eq]=${commentId}&filter[user_id][_eq]=${directusUserId}`,
        { 
          headers: { 
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}` 
          } 
        }
      );

      if (!reactionResponse.ok) {
        const errorData = await reactionResponse.json();
        console.error('Reaction check failed:', errorData);
        return;
      }

      const responseData = await reactionResponse.json();
      const existingReaction = responseData.data?.[0];

      if (existingReaction) {
        const actionUrl = `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/Comment_likes/${existingReaction.id}`;
        
        if (existingReaction.type === type) {
          const deleteResponse = await fetch(actionUrl, { 
            method: 'DELETE', 
            headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}` } 
          });
          
          if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json();
            console.error('Delete failed:', errorData);
            return;
          }
        } else {
          const updateResponse = await fetch(actionUrl, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
            },
            body: JSON.stringify({ type }),
          });
          
          if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            console.error('Update failed:', errorData);
            return;
          }
        }
      } else {
        const createResponse = await fetch(
          `${process.env.NEXT_PUBLIC_DIRECTUS_API_URL}/items/Comment_likes`, 
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_API_TOKEN}`,
            },
            body: JSON.stringify({ 
              comment_id: commentId, 
              user_id: directusUserId,
              type 
            }),
          }
        );

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          console.error('Create failed:', errorData);
          return;
        }
      }

      fetchComments();
    } catch (error) {
      console.error('Error toggling reaction:', error);
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
        <div className="mt-4 flex gap-4">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors"
          >
            {replyTo ? "Post Reply" : "Post Comment"}
          </button>
          {replyTo && (
            <button
              type="button"
              onClick={() => {
                setReplyTo(null);
                setNewComment('');
              }}
              className="text-gray-600 dark:text-gray-300 font-medium px-6 py-2 rounded-lg border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      <div className="space-y-6">
        {comments.map((comment) => (
          <CommentTree
            key={comment.id}
            comment={comment}
            onReply={setReplyTo}
            onReaction={handleReaction}
          />
        ))}
      </div>
    </div>
  );
}

function CommentTree({
  comment,
  onReply,
  onReaction,
}: {
  comment: Comment;
  onReply: (id: string) => void;
  onReaction: (id: string, type: 'like' | 'dislike') => void;
}) {
  return (
    <div className="border-b dark:border-gray-700 pb-6 last:border-0">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          {comment.user?.profile_image ? (
            <img
              src={getProfileImageURL(comment.user.profile_image) || ''}
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
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => onReaction(comment.id, 'like')}
              className="flex items-center gap-1 text-gray-500 hover:text-blue-500 dark:hover:text-blue-400"
            >
              {comment.userReaction === 'like' ? (
                <HiThumbUp className="w-5 h-5 text-blue-500" />
              ) : (
                <HiThumbUp className="w-5 h-5" />
              )}
              <span>{comment.likeCount}</span>
            </button>
            <button
              onClick={() => onReaction(comment.id, 'dislike')}
              className="flex items-center gap-1 text-gray-500 hover:text-red-500 dark:hover:text-red-400"
            >
              {comment.userReaction === 'dislike' ? (
                <HiThumbDown className="w-5 h-5 text-red-500" />
              ) : (
                <HiThumbDown className="w-5 h-5" />
              )}
              <span>{comment.dislikeCount}</span>
            </button>
            <button
              onClick={() => onReply(comment.id)}
              className="text-blue-500 text-sm hover:underline"
            >
              Reply
            </button>
          </div>
          {comment.replies?.map((reply) => (
            <div key={reply.id} className="pl-10 mt-4">
              <CommentTree
                comment={reply}
                onReply={onReply}
                onReaction={onReaction}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}