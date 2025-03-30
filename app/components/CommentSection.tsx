'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { HiThumbUp, HiThumbDown } from 'react-icons/hi';
import useSWR from 'swr';

type Comment = {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  parent_id: string | null;
  replies: Comment[];
  avatar: string;
  likeCount: number;
  dislikeCount: number;
  userReaction?: 'like' | 'dislike' | null;
};

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function CommentSection({ projectId }: { projectId: string }) {
  const { user } = useUser();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [visibleCommentCount, setVisibleCommentCount] = useState(5);
  const [sortBy, setSortBy] = useState<'recent' | 'likes'>('recent');
  const commentFormRef = useRef<HTMLFormElement>(null);
  const lastCommentRef = useRef<HTMLDivElement>(null);

  const { data: comments = [], mutate } = useSWR<Comment[]>(
    `/api/comments?projectId=${projectId}`,
    fetcher,
    { refreshInterval: 30000 }
  );

  // Sort comments based on selected criteria
  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    } else {
      return (b.likeCount - b.dislikeCount) - (a.likeCount - a.dislikeCount);
    }
  });

  // Scroll to comment form when replying
  useEffect(() => {
    if (replyTo && commentFormRef.current) {
      commentFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [replyTo]);

  // Scroll to last comment after posting
  useEffect(() => {
    if (lastCommentRef.current) {
      lastCommentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [comments.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          content: newComment,
          parentId: replyTo,
        }),
      });

      setNewComment('');
      setReplyTo(null);
      mutate();
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleReaction = async (commentId: string, type: 'like' | 'dislike') => {
    try {
      await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, reactionType: type }),
      });
      mutate();
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Comments</h2>
        <div className="flex items-center gap-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'likes')}
            className="px-3 py-1 rounded-lg border dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="recent">Most Recent</option>
            <option value="likes">Most Liked</option>
          </select>
        </div>
      </div>

      <form ref={commentFormRef} onSubmit={handleSubmit} className="mb-8">
        <textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
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
        {sortedComments.slice(0, visibleCommentCount).map((comment, index) => (
          <div key={comment.id} ref={index === comments.length - 1 ? lastCommentRef : undefined}>
            <CommentTree
              comment={comment}
              onReply={setReplyTo}
              onReaction={handleReaction}
            />
          </div>
        ))}
        
        <div className="flex justify-center gap-4">
          {visibleCommentCount > 5 && (
            <button
              onClick={() => setVisibleCommentCount(prev => Math.max(5, prev - 5))}
              className="text-blue-500 text-sm hover:underline"
            >
              Show Less
            </button>
          )}
          {comments.length > visibleCommentCount && (
            <button
              onClick={() => setVisibleCommentCount(prev => prev + 5)}
              className="text-blue-500 text-sm hover:underline"
            >
              Show More
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const CommentTree = ({
  comment,
  onReply,
  onReaction,
}: {
  comment: Comment;
  onReply: (id: string) => void;
  onReaction: (id: string, type: 'like' | 'dislike') => void;
}) => {
  const [showAllReplies, setShowAllReplies] = useState(false);
  const visibleReplies = showAllReplies ? comment.replies : comment.replies?.slice(0, 2);
  const hiddenRepliesCount = comment.replies.length - 2;

  return (
    <div className="border-b dark:border-gray-700 pb-4 last:border-0">
      <div className="flex items-start space-x-3">
        <Avatar src={comment.avatar} author={comment.author} />
        <div className="flex-grow">
          <CommentHeader author={comment.author} timestamp={comment.timestamp} />
          <CommentContent content={comment.content} />
          <CommentActions
            comment={comment}
            onReply={onReply}
            onReaction={onReaction}
          />
          <Replies
            visibleReplies={visibleReplies}
            hiddenRepliesCount={hiddenRepliesCount}
            showAllReplies={showAllReplies}
            setShowAllReplies={setShowAllReplies}
            onReaction={onReaction}
            onReply={onReply}
          />
        </div>
      </div>
    </div>
  );
};

const Avatar = ({ src, author, size = "md" }: { src?: string; author: string; size?: "sm" | "md" }) => (
  <div className="flex-shrink-0">
    {src ? (
      <img src={src} alt={author} className={`${size === "sm" ? "w-6 h-6" : "w-8 h-8"} rounded-full`} />
    ) : (
      <div className={`${size === "sm" ? "w-6 h-6" : "w-8 h-8"} bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center`}>
        <span className="text-blue-600 dark:text-blue-300 text-sm font-medium">
          {author[0]?.toUpperCase() || "U"}
        </span>
      </div>
    )}
  </div>
);

const CommentHeader = ({ author, timestamp }: { author: string; timestamp: string }) => (
  <div className="flex items-center space-x-2">
    <h3 className="text-sm font-medium text-gray-900 dark:text-white">{author}</h3>
    <span className="text-xs text-gray-500 dark:text-gray-400">
      {new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })}
    </span>
  </div>
);

const CommentContent = ({ content }: { content: string }) => (
  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{content}</p>
);

const CommentActions = ({
  comment,
  onReply,
  onReaction,
}: {
  comment: Comment;
  onReply: (id: string) => void;
  onReaction: (id: string, type: 'like' | 'dislike') => void;
}) => (
  <div className="flex items-center gap-4 mt-2">
    <ReactionButton
      type="like"
      count={comment.likeCount}
      isActive={comment.userReaction === 'like'}
      onClick={() => onReaction(comment.id, 'like')}
    />
    <ReactionButton
      type="dislike"
      count={comment.dislikeCount}
      isActive={comment.userReaction === 'dislike'}
      onClick={() => onReaction(comment.id, 'dislike')}
    />
    {!comment.parent_id && (
      <button
        onClick={() => onReply(comment.id)}
        className="text-blue-500 text-sm hover:underline"
      >
        Reply
      </button>
    )}
  </div>
);

const ReactionButton = ({
  type,
  count,
  isActive,
  onClick,
}: {
  type: 'like' | 'dislike';
  count: number;
  isActive: boolean;
  onClick: () => void;
}) => {
  const Icon = type === 'like' ? HiThumbUp : HiThumbDown;
  const colorClass = isActive 
    ? type === 'like' 
      ? 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
      : 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
    : 'text-gray-500 hover:text-blue-500 dark:hover:text-blue-400';

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 text-sm px-2 py-1 rounded-full ${colorClass} transition-all duration-200`}
    >
      <Icon className={`w-4 h-4 ${isActive ? 'transform scale-110' : ''}`} />
      <span>{count}</span>
    </button>
  );
};

const Replies = ({
  visibleReplies,
  hiddenRepliesCount,
  showAllReplies,
  setShowAllReplies,
  onReaction,
  onReply,
}: {
  visibleReplies: Comment[];
  hiddenRepliesCount: number;
  showAllReplies: boolean;
  setShowAllReplies: (value: boolean) => void;
  onReaction: (id: string, type: 'like' | 'dislike') => void;
  onReply: (id: string) => void;
}) => (
  <div className="mt-3 space-y-3">
    {visibleReplies.map(reply => (
      <div key={reply.id} className="flex items-start space-x-3 ml-4">
        <Avatar src={reply.avatar} author={reply.author} size="sm" />
        <div className="flex-grow">
          <CommentHeader author={reply.author} timestamp={reply.timestamp} />
          <CommentContent content={reply.content} />
          <CommentActions
            comment={reply}
            onReply={onReply}
            onReaction={onReaction}
          />
        </div>
      </div>
    ))}
    <div className="flex justify-center gap-4">
      {!showAllReplies && hiddenRepliesCount > 0 && (
        <button
          onClick={() => setShowAllReplies(true)}
          className="text-blue-500 text-sm hover:underline"
        >
          View {hiddenRepliesCount} more replies
        </button>
      )}
      {showAllReplies && hiddenRepliesCount > 0 && (
        <button
          onClick={() => setShowAllReplies(false)}
          className="text-blue-500 text-sm hover:underline"
        >
          Show less replies
        </button>
      )}
    </div>
  </div>
);