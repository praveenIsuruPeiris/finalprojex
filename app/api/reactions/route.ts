import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

type ProjectLike = {
  id: string;
  project_id: string;
  user_id: string;
  type: string;
};

export async function POST(request: Request) {
  const { userId } = getAuth(request as any);
  const { commentId, reactionType } = await request.json();

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

    // Check existing reaction
    const existingResponse = await fetch(
      `${process.env.DIRECTUS_API_URL}/items/Comment_likes` +
        `?filter[comment_id][_eq]=${commentId}` +
        `&filter[user_id][_eq]=${directusUserId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
        },
      }
    );

    const existingData = await existingResponse.json();
    const existingReaction = existingData.data?.[0];

    if (existingReaction) {
      if (existingReaction.type === reactionType) {
        // Remove reaction
        await fetch(
          `${process.env.DIRECTUS_API_URL}/items/Comment_likes/${existingReaction.id}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
            },
          }
        );
      } else {
        // Update reaction
        await fetch(
          `${process.env.DIRECTUS_API_URL}/items/Comment_likes/${existingReaction.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
            },
            body: JSON.stringify({ type: reactionType }),
          }
        );
      }
    } else {
      // Create new reaction
      await fetch(
        `${process.env.DIRECTUS_API_URL}/items/Comment_likes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
          },
          body: JSON.stringify({
            comment_id: commentId,
            user_id: directusUserId,
            type: reactionType,
          }),
        }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating reaction:', error);
    return NextResponse.json(
      { error: 'Failed to update reaction' },
      { status: 500 }
    );
  }
}