import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const { userId } = getAuth(request as any);
  
  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
  }

  try {
    // Fetch comments from Directus
    const commentsResponse = await fetch(
      `${process.env.DIRECTUS_API_URL}/items/Project_Comments?filter[project_id][_eq]=${projectId}&fields=*,user_id.*`,
      {
        headers: {
          Authorization: `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
        },
      }
    );

    if (!commentsResponse.ok) {
      throw new Error('Failed to fetch comments');
    }

    const commentsData = await commentsResponse.json();
    
    // Fetch all reactions
    const commentIds = commentsData.data.map((c: any) => c.id);
    const reactionsResponse = await fetch(
      `${process.env.DIRECTUS_API_URL}/items/Comment_likes?filter[comment_id][_in]=${commentIds.join(',')}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
        },
      }
    );

    const reactionsData = await reactionsResponse.json();
    const reactions = reactionsData.data || [];

    // Get user's reactions if logged in
    let userReactions: any[] = [];
    if (userId) {
      const userResponse = await fetch(
        `${process.env.DIRECTUS_API_URL}/items/users?filter[clerk_id][_eq]=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
          },
        }
      );
      const userData = await userResponse.json();
      const directusUserId = userData.data?.[0]?.id;

      if (directusUserId) {
        const userReactionsResponse = await fetch(
          `${process.env.DIRECTUS_API_URL}/items/Comment_likes?filter[user_id][_eq]=${directusUserId}&filter[comment_id][_in]=${commentIds.join(',')}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
            },
          }
        );
        const userReactionsData = await userReactionsResponse.json();
        userReactions = userReactionsData.data || [];
      }
    }

    // Process comments
    const comments = commentsData.data.map((comment: any) => {
      const userReaction = userReactions.find(r => r.comment_id === comment.id);
      return {
        id: comment.id,
        author: comment.user_id
          ? `${comment.user_id.first_name} ${comment.user_id.last_name}`
          : 'Anonymous',
        content: comment.comment,
        timestamp: comment.date_created,
        parent_id: comment.parent_id,
        avatar: getProfileImageURL(comment.user_id?.profile_image),
        likeCount: reactions.filter((r: any) => 
          r.comment_id === comment.id && r.type === 'like').length,
        dislikeCount: reactions.filter((r: any) => 
          r.comment_id === comment.id && r.type === 'dislike').length,
        userReaction: userReaction ? userReaction.type : null,
        replies: [] // Initialize empty array for replies
      };
    });

    // Structure comments hierarchy
    interface Comment {
      id: string;
      replies: Comment[];
      parent_id?: string;
    }
    const commentMap = new Map<string, Comment>(comments.map((c: any) => [c.id, c]));
    comments.forEach((c: any) => {
      if (c.parent_id) {
        const parent = commentMap.get(c.parent_id);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push(c);
        }
      }
    });

    return NextResponse.json(comments.filter((c: any) => !c.parent_id));
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { userId } = getAuth(request as any);
  const { projectId, content, parentId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get Directus user ID
    const userResponse = await fetch(
      `${process.env.DIRECTUS_API_URL}/items/users?filter[clerk_id][_eq]=${userId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
        },
      }
    );

    const userData = await userResponse.json();
    const directusUserId = userData.data?.[0]?.id;

    if (!directusUserId) {
      return NextResponse.json(
        { error: 'User not found in Directus' },
        { status: 404 }
      );
    }

    // Create new comment
    const newComment = {
      project_id: projectId,
      comment: content,
      user_id: directusUserId,
      ...(parentId && { parent_id: parentId }),
    };

    const createResponse = await fetch(
      `${process.env.DIRECTUS_API_URL}/items/Project_Comments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
        },
        body: JSON.stringify(newComment),
      }
    );

    if (!createResponse.ok) {
      throw new Error('Failed to create comment');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}

function getProfileImageURL(profileImage: any): string | undefined {
  if (!profileImage) return undefined;
  if (typeof profileImage === 'string') {
    return profileImage.startsWith('http')
      ? profileImage
      : `${process.env.DIRECTUS_API_URL}/assets/${profileImage}?key=thumb`;
  }
  return `${process.env.DIRECTUS_API_URL}/assets/${profileImage.id}?key=thumb`;
}