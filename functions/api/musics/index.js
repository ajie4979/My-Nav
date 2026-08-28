// functions/api/musics/index.js
import { isAdminAuthenticated, errorResponse, jsonResponse } from '../../_middleware';
import { parsePagination } from '../../lib/utils';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const isAuthenticated = await isAdminAuthenticated(request, env);
  const scope = url.searchParams.get('scope');
  const showActiveOnly = scope === 'public' || !isAuthenticated;

  const { page, pageSize, offset } = parsePagination(url.searchParams, { maxPageSize: 100 });

  try {
    const whereClauses = [];
    const params = [];

    if (showActiveOnly) {
      whereClauses.push('is_active = 1');
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const { results } = await env.NAV_DB.prepare(`
      SELECT id, title, artist, music_url, cover_url, platform, sort_order, is_active, create_time, update_time
      FROM musics
      ${whereSql}
      ORDER BY sort_order ASC, id DESC
      LIMIT ? OFFSET ?
    `).bind(...params, pageSize, offset).all();

    const countResult = await env.NAV_DB.prepare(`
      SELECT COUNT(*) as total FROM musics ${whereSql}
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
    return errorResponse(`Failed to fetch musics: ${e.message}`, 500);
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
    const { title, artist, music_url, cover_url, platform, sort_order, is_active } = body;

    if (!title || !title.trim()) {
      return errorResponse('Title is required', 400);
    }
    if (!music_url || !music_url.trim()) {
      return errorResponse('Music URL is required', 400);
    }

    const result = await env.NAV_DB.prepare(`
      INSERT INTO musics (title, artist, music_url, cover_url, platform, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      title.trim(),
      artist || null,
      music_url.trim(),
      cover_url || null,
      platform || 'custom',
      sort_order || 0,
      is_active ? 1 : 0
    ).run();

    return jsonResponse({
      code: 200,
      message: 'Music created successfully',
      id: result.meta.last_row_id
    });
  } catch (e) {
    return errorResponse(`Failed to create music: ${e.message}`, 500);
  }
}
