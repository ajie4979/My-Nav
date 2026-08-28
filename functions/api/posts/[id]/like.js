// functions/api/posts/[id]/like.js
import { errorResponse, jsonResponse } from '../../../_middleware';

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = context.params.id;

  if (!id) {
    return errorResponse('Post ID is required', 400);
  }

  try {
    let action = 'like';
    try {
      const body = await request.json();
      if (body && body.action === 'unlike') {
        action = 'unlike';
      }
    } catch (e) {
      // 默认 like
    }

    // 检查文章是否存在
    const post = await env.NAV_DB.prepare('SELECT id, like_count FROM posts WHERE id = ?').bind(id).first();
    if (!post) {
      return errorResponse('Post not found', 404);
    }

    const currentLikes = post.like_count || 0;
    const newLikes = action === 'unlike' ? Math.max(0, currentLikes - 1) : currentLikes + 1;

    await env.NAV_DB.prepare('UPDATE posts SET like_count = ? WHERE id = ?').bind(newLikes, id).run();

    return jsonResponse({
      code: 200,
      message: action === 'unlike' ? 'Unliked successfully' : 'Liked successfully',
      like_count: newLikes
    });
  } catch (e) {
    return errorResponse(`Failed to update like: ${e.message}`, 500);
  }
}
