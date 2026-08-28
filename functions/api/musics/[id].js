// functions/api/musics/[id].js
import { isAdminAuthenticated, errorResponse, jsonResponse } from '../../_middleware';

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const id = params.id;

  try {
    const music = await env.NAV_DB.prepare(`
      SELECT * FROM musics WHERE id = ?
    `).bind(Number(id)).first();

    if (!music) {
      return errorResponse('Music not found', 404);
    }

    return jsonResponse({
      code: 200,
      data: music
    });
  } catch (e) {
    return errorResponse(`Failed to fetch music: ${e.message}`, 500);
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
    const { title, artist, music_url, cover_url, platform, sort_order, is_active } = body;

    const existing = await env.NAV_DB.prepare(`
      SELECT id FROM musics WHERE id = ?
    `).bind(Number(id)).first();

    if (!existing) {
      return errorResponse('Music not found', 404);
    }

    const updates = [];
    const values = [];

    if (title !== undefined) {
      if (!title.trim()) return errorResponse('Title cannot be empty', 400);
      updates.push('title = ?');
      values.push(title.trim());
    }
    if (artist !== undefined) {
      updates.push('artist = ?');
      values.push(artist || null);
    }
    if (music_url !== undefined) {
      if (!music_url.trim()) return errorResponse('Music URL cannot be empty', 400);
      updates.push('music_url = ?');
      values.push(music_url.trim());
    }
    if (cover_url !== undefined) {
      updates.push('cover_url = ?');
      values.push(cover_url || null);
    }
    if (platform !== undefined) {
      updates.push('platform = ?');
      values.push(platform || 'custom');
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      values.push(sort_order || 0);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return errorResponse('No fields to update', 400);
    }

    updates.push('update_time = CURRENT_TIMESTAMP');
    values.push(Number(id));

    await env.NAV_DB.prepare(`
      UPDATE musics SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();

    return jsonResponse({
      code: 200,
      message: 'Music updated successfully'
    });
  } catch (e) {
    return errorResponse(`Failed to update music: ${e.message}`, 500);
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
      SELECT id FROM musics WHERE id = ?
    `).bind(Number(id)).first();

    if (!existing) {
      return errorResponse('Music not found', 404);
    }

    await env.NAV_DB.prepare(`
      DELETE FROM musics WHERE id = ?
    `).bind(Number(id)).run();

    return jsonResponse({
      code: 200,
      message: 'Music deleted successfully'
    });
  } catch (e) {
    return errorResponse(`Failed to delete music: ${e.message}`, 500);
  }
}
