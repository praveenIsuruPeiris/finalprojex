'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { HiThumbUp, HiThumbDown } from 'react-icons/hi';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

type Comment = {
  id: string;
  author: string;
  username: string;
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
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [visibleCommentCount, setVisibleCommentCount] = useState(5);
  const [sortBy, setSortBy] = useState<'recent' | 'likes'>('recent');
  const [justPostedComment, setJustPostedComment] = useState(false);
  const [newCommentId, setNewCommentId] = useState<string | null>(null);
  const commentFormRef = useRef<HTMLFormElement>(null);
  const newCommentRef = useRef<HTMLDivElement>(null);

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

  // Scroll to new comment after posting
  useEffect(() => {
    if (newCommentRef.current && justPostedComment) {
      newCommentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setJustPostedComment(false);
      setNewCommentId(null);
    }
  }, [justPostedComment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    if (!isSignedIn) {
      // Store the comment in localStorage to restore it after sign-in
      localStorage.setItem('pendingComment', newComment);
      if (replyTo) {
        localStorage.setItem('pendingReplyTo', replyTo);
      }
      
      // Redirect to sign-in with return URL
      const returnUrl = encodeURIComponent(pathname);
      router.push(`/sign-in?redirect_url=${returnUrl}`);
      return;
    }

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          content: newComment,
          parentId: replyTo,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewComment('');
        setReplyTo(null);
        setJustPostedComment(true);
        setNewCommentId(data.id);
        mutate();
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleReaction = async (commentId: string, type: 'like' | 'dislike') => {
    if (!isSignedIn) {
      // Store the reaction info in localStorage
      localStorage.setItem('pendingReaction', JSON.stringify({ commentId, type }));
      
      // Redirect to sign-in with return URL
      const returnUrl = encodeURIComponent(pathname);
      router.push(`/sign-in?redirect_url=${returnUrl}`);
      return;
    }

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

  // Restore pending comment after sign-in
  useEffect(() => {
    if (isSignedIn) {
      const pendingComment = localStorage.getItem('pendingComment');
      const pendingReplyTo = localStorage.getItem('pendingReplyTo');
      const pendingReaction = localStorage.getItem('pendingReaction');
      
      if (pendingComment) {
        setNewComment(pendingComment);
        if (pendingReplyTo) {
          setReplyTo(pendingReplyTo);
        }
        localStorage.removeItem('pendingComment');
        localStorage.removeItem('pendingReplyTo');
        
        // Focus the comment form
        if (commentFormRef.current) {
          commentFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      
      if (pendingReaction) {
        try {
          const { commentId, type } = JSON.parse(pendingReaction);
          handleReaction(commentId, type);
          localStorage.removeItem('pendingReaction');
        } catch (error) {
          console.error('Error processing pending reaction:', error);
        }
      }
    }
  }, [isSignedIn]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Comments</h2>
        <div className="flex items-center gap-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'likes')}
            className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
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
          className="w-full p-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        {sortedComments.slice(0, visibleCommentCount).map((comment) => (
          <div 
            key={comment.id} 
            ref={comment.id === newCommentId ? newCommentRef : undefined}
          >
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
        <Avatar src={comment.avatar} author={comment.author} username={comment.username} />
        <div className="flex-grow">
          <CommentHeader author={comment.author} username={comment.username} timestamp={comment.timestamp} />
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

const Avatar = ({ src, author, username, size = "md" }: { src?: string; author: string; username: string; size?: "sm" | "md" }) => (
  <Link href={`/profile/${encodeURIComponent(username)}`} className="flex-shrink-0 hover:opacity-80 transition-opacity">
    {src ? (
      <img src={src} alt={author} className={`${size === "sm" ? "w-6 h-6" : "w-8 h-8"} rounded-full`} />
    ) : (
      <div className={`${size === "sm" ? "w-6 h-6" : "w-8 h-8"} bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center`}>
        <span className="text-blue-600 dark:text-blue-300 text-sm font-medium">
          {author[0]?.toUpperCase() || "U"}
        </span>
      </div>
    )}
  </Link>
);

const CommentHeader = ({ author, username, timestamp }: { author: string; username: string; timestamp: string }) => (
  <div className="flex items-center space-x-2">
    <Link 
      href={`/profile/${encodeURIComponent(username)}`}
      className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
    >
      {author}
    </Link>
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
        <Avatar src={reply.avatar} author={reply.author} username={reply.username} size="sm" />
        <div className="flex-grow">
          <CommentHeader author={reply.author} username={reply.username} timestamp={reply.timestamp} />
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