'use client';

import { useState } from 'react';

type Comment = {
  id: string;
  author: string;
  content: string;
  timestamp: string;
};

export default function CommentSection({ projectId }: { projectId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const dummyComment: Comment = {
      id: Date.now().toString(),
      author: 'Current User',
      content: newComment,
      timestamp: new Date().toISOString(),
    };

    setComments([...comments, dummyComment]);
    setNewComment('');
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Comments</h2>
      
      <form onSubmit={handleSubmit} className="mb-8">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write your comment..."
          className="w-full p-4 rounded-lg border dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
        />
        <button
          type="submit"
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors"
        >
          Post Comment
        </button>
      </form>

      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment.id} className="border-b dark:border-gray-700 pb-6 last:border-0">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-300 font-medium">
                    {comment.author[0]}
                  </span>
                </div>
              </div>
              <div className="flex-grow">
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">{comment.author}</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(comment.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <p className="mt-1 text-gray-600 dark:text-gray-300">{comment.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}