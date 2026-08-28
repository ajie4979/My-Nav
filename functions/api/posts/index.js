// functions/api/posts/index.js
import { isAdminAuthenticated, errorResponse, jsonResponse } from '../../_middleware';
import { parsePagination } from '../../lib/utils';

function generateSlug(title) {
  if (!title) return null;
  // 中文标题直接用，英文转小写连字符
  const hasChinese = /[\u4e00-\u9fa5]/.test(title);
  if (hasChinese) return title.trim();
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const isAuthenticated = await isAdminAuthenticated(request, env);

  const scope = url.searchParams.get('scope');
  const shouldShowPublicOnly = scope === 'public' || !isAuthenticated;

  const { page, pageSize, offset } = parsePagination(url.searchParams, { maxPageSize: 100 });

  try {
    const whereClauses = [];
    const params = [];

    if (shouldShowPublicOnly) {
      whereClauses.push('is_private = 0 AND status = ?');
      params.push('published');
    } else {
      const status = url.searchParams.get('status');
      if (status) {
        whereClauses.push('status = ?');
        params.push(status);
      }
    }

    const keyword = url.searchParams.get('keyword');
    if (keyword) {
      whereClauses.push('(title LIKE ? OR summary LIKE ? OR content LIKE ?)');
      const like = `%${keyword}%`;
      params.push(like, like, like);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 排序方式
    const sort = url.searchParams.get('sort') || 'newest';
    let orderBy = 'create_time DESC';
    switch (sort) {
      case 'views':
        orderBy = 'view_count DESC, create_time DESC';
        break;
      case 'likes':
        orderBy = 'like_count DESC, create_time DESC';
        break;
      case 'comments':
        orderBy = 'comment_count DESC, create_time DESC';
        break;
      case 'newest':
      default:
        orderBy = 'create_time DESC';
        break;
    }

    const { results } = await env.NAV_DB.prepare(`
      SELECT id, title, slug, summary, cover_image, category, author, status, is_private, view_count, like_count, comment_count, create_time, update_time
      FROM posts
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).bind(...params, pageSize, offset).all();

    const countResult = await env.NAV_DB.prepare(`
      SELECT COUNT(*) as total FROM posts ${whereSql}
    `).bind(...params).first();

    const total = countResult ? countResult.total : 0;

    return jsonResponse({
      code: 200,
      data: results,
      total,
      page,
      pageSize
    });
  } catch (e) {
    return errorResponse(`Failed to fetch posts: ${e.message}`, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const isAuthenticated = await isAdminAuthenticated(request, env);
  if (!isAuthenticated) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const body = await request.json();
    const { title, content, summary, cover_image, status, is_private, slug, category } = body;

    if (!title || !title.trim()) {
      return errorResponse('Title is required', 400);
    }
    if (!content || !content.trim()) {
      return errorResponse('Content is required', 400);
    }

    const finalSlug = slug && slug.trim() ? slug.trim() : generateSlug(title);
    const finalStatus = ['draft', 'published'].includes(status) ? status : 'draft';
    const finalPrivate = is_private ? 1 : 0;
    const finalCategory = category && category.trim() ? category.trim() : '其他';

    const result = await env.NAV_DB.prepare(`
      INSERT INTO posts (title, slug, content, summary, cover_image, status, is_private, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      title.trim(),
      finalSlug,
      content,
      summary || null,
      cover_image || null,
      finalStatus,
      finalPrivate,
      finalCategory
    ).run();

    return jsonResponse({
      code: 200,
      message: 'Post created successfully',
      id: result.meta.last_row_id
    });
  } catch (e) {
    return errorResponse(`Failed to create post: ${e.message}`, 500);
  }
}
