// functions/api/config/[id]/star.js
// 书签“加星 / 取消加星”的局部更新接口：只切换 is_star，不触碰书签其他字段
import { isAdminAuthenticated, errorResponse, jsonResponse, markHomeCacheDirty } from '../../../_middleware';

export async function onRequestPost(context) {
  const { request, env, params } = context;

  if (!(await isAdminAuthenticated(request, env))) {
    return errorResponse('Unauthorized', 401);
  }

  const id = params.id;
  if (!id) {
    return errorResponse('Bookmark ID is required', 400);
  }

  try {
    const existing = await env.NAV_DB.prepare('SELECT id, is_star FROM sites WHERE id = ?').bind(id).first();
    if (!existing) {
      return errorResponse('config not found', 404);
    }

    // 允许显式传 { is_star: 0/1 }；未提供时在当前状态上切换（toggle）
    let nextStar;
    try {
      const body = await request.json();
      if (body && Object.prototype.hasOwnProperty.call(body, 'is_star')) {
        nextStar = body.is_star ? 1 : 0;
      }
    } catch (e) {
      // 无 JSON body：走 toggle
    }
    if (nextStar === undefined) {
      nextStar = Number(existing.is_star) === 1 ? 0 : 1;
    }

    await env.NAV_DB
      .prepare('UPDATE sites SET is_star = ?, update_time = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(nextStar, id)
      .run();

    // “常用”视图包含在首页整页缓存中，切换后必须标脏，否则访客侧不会更新
    await markHomeCacheDirty(env, 'all');

    return jsonResponse({
      code: 200,
      message: nextStar === 1 ? 'Starred successfully' : 'Unstarred successfully',
      is_star: nextStar
    });
  } catch (e) {
    return errorResponse(`Failed to update star: ${e.message}`, 500);
  }
}
