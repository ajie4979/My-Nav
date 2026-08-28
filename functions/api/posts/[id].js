// functions/api/posts/[id].js
import { isAdminAuthenticated, errorResponse, jsonResponse } from '../../_middleware';

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const id = params.id;
  const isAuthenticated = await isAdminAuthenticated(request, env);

  try {
    // 支持通过 slug 查询
    const isNumeric = /^\d+$/.test(id);
    let post;

    if (isNumeric) {
      post = await env.NAV_DB.prepare(`
        SELECT * FROM posts WHERE id = ?
      `).bind(Number(id)).first();
    } else {
      post = await env.NAV_DB.prepare(`
        SELECT * FROM posts WHERE slug = ?
      `).bind(id).first();
    }

    if (!post) {
      return errorResponse('Post not found', 404);
    }

    // 未登录用户只能看已发布的公开文章
    if (!isAuthenticated && (post.is_private === 1 || post.status !== 'published')) {
      return errorResponse('Post not found', 404);
    }

    // 浏览量 +1（仅公开已发布文章）
    if (post.is_private === 0 && post.status === 'published') {
      await env.NAV_DB.prepare(`
        UPDATE posts SET view_count = view_count + 1 WHERE id = ?
      `).bind(post.id).run();
      post.view_count = (post.view_count || 0) + 1;
    }

    return jsonResponse({
      code: 200,
      data: post
    });
  } catch (e) {
    return errorResponse(`Failed to fetch post: ${e.message}`, 500);
  }
}

export async function onRequestPut(context) {
  const { request, env, params } = context;
  const id = params.id;

  const isAuthenticated = await isAdminAuthenticated(request, env);
  if (!isAuthenticated) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const body = await request.json();
    const { title, content, summary, cover_image, status, is_private, slug, category } = body;

    const existing = await env.NAV_DB.prepare(`
      SELECT id FROM posts WHERE id = ?
    `).bind(Number(id)).first();

    if (!existing) {
      return errorResponse('Post not found', 404);
    }

    const updates = [];
    const values = [];

    if (title !== undefined) {
      if (!title.trim()) return errorResponse('Title cannot be empty', 400);
      updates.push('title = ?');
      values.push(title.trim());
    }
    if (content !== undefined) {
      if (!content.trim()) return errorResponse('Content cannot be empty', 400);
      updates.push('content = ?');
      values.push(content);
    }
    if (summary !== undefined) {
      updates.push('summary = ?');
      values.push(summary || null);
    }
    if (cover_image !== undefined) {
      updates.push('cover_image = ?');
      values.push(cover_image || null);
    }
    if (status !== undefined) {
      if (!['draft', 'published'].includes(status)) {
        return errorResponse('Invalid status', 400);
      }
      updates.push('status = ?');
      values.push(status);
    }
    if (is_private !== undefined) {
      updates.push('is_private = ?');
      values.push(is_private ? 1 : 0);
    }
    if (slug !== undefined) {
      updates.push('slug = ?');
      values.push(slug && slug.trim() ? slug.trim() : null);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category && category.trim() ? category.trim() : '其他');
    }

    if (updates.length === 0) {
      return errorResponse('No fields to update', 400);
    }

    updates.push('update_time = CURRENT_TIMESTAMP');
    values.push(Number(id));

    await env.NAV_DB.prepare(`
      UPDATE posts SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();

    return jsonResponse({
      code: 200,
      message: 'Post updated successfully'
    });
  } catch (e) {
    return errorResponse(`Failed to update post: ${e.message}`, 500);
  }
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const id = params.id;

  const isAuthenticated = await isAdminAuthenticated(request, env);
  if (!isAuthenticated) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const existing = await env.NAV_DB.prepare(`
      SELECT id FROM posts WHERE id = ?
    `).bind(Number(id)).first();

    if (!existing) {
      return errorResponse('Post not found', 404);
    }

    await env.NAV_DB.prepare(`
      DELETE FROM posts WHERE id = ?
    `).bind(Number(id)).run();

    return jsonResponse({
      code: 200,
      message: 'Post deleted successfully'
    });
  } catch (e) {
    return errorResponse(`Failed to delete post: ${e.message}`, 500);
  }
}
