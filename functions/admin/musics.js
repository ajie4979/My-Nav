// functions/admin/musics.js
// 音乐管理页面 - 服务端渲染，注入 CSRF token

import { buildSessionCookie, isAdminAuthenticated, getSessionToken } from '../_middleware';

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!(await isAdminAuthenticated(request, env))) {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/admin/login',
      },
    });
  }

  const sessionToken = getSessionToken(request);

  try {
    const url = new URL(request.url);
    url.pathname = '/admin/musics.html';

    const response = await env.ASSETS.fetch(url);

    if (response.ok) {
      const csrfToken = await env.NAV_AUTH.get(`csrf_${sessionToken}`);
      if (csrfToken) {
        let html = await response.text();
        html = html.replace('</head>', `<meta name="csrf-token" content="${csrfToken}">\n</head>`);
        const headers = new Headers(response.headers);
        headers.set('Cache-Control', 'no-store');
        return new Response(html, { headers });
      }

      return new Response(null, {
        status: 302,
        headers: {
          'Location': `/admin/login?error=${encodeURIComponent('登录状态已过期，请重新登录')}`,
          'Set-Cookie': buildSessionCookie('', { maxAge: 0 }),
          'Cache-Control': 'no-store',
        },
      });
    } else {
      console.error('Failed to load admin musics HTML:', response.status);
      return new Response('音乐管理页面加载失败', { status: 500 });
    }
  } catch (e) {
    console.error('Error loading admin musics page:', e);
    return new Response('音乐管理页面加载失败: ' + e.message, { status: 500 });
  }
}
