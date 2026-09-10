// functions/api/config/export-html.js
// 导出 Chrome 书签 HTML（Netscape Bookmark File Format），
// 生成的文件可在 Chrome / Edge 等浏览器「书签管理器 → 导入书签」中直接使用。
import { isAdminAuthenticated, errorResponse } from '../../_middleware';
import { fetchBookmarkExport } from '../../lib/bookmark-export';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 将导出的分类与书签数据渲染为 Chrome 书签 HTML。
 * 顶层包含：根目录书签 + 顶级分类文件夹（嵌套子分类与书签）。
 * ADD_DATE / LAST_MODIFIED 使用导出时刻的 Unix 秒级时间戳。
 * @param {{category: Array, sites: Array}} exportData - fetchBookmarkExport 的返回结构
 * @returns {string} Chrome 书签 HTML 文本
 */
export function buildChromeBookmarksHtml(exportData) {
  const categories = Array.isArray(exportData.category) ? exportData.category : [];
  const sites = Array.isArray(exportData.sites) ? exportData.sites : [];

  const now = Math.floor(Date.now() / 1000);

  // 分类按 id 建立索引
  const categoryById = new Map();
  for (const category of categories) {
    categoryById.set(String(category.id), category);
  }

  // 站点按 catelog_id 分组；catelog_id 为空 / 0 / 指向不存在分类的归入根目录
  const sitesByCategory = new Map();
  const rootSites = [];
  for (const site of sites) {
    const categoryId = String(site.catelog_id ?? '0');
    if (categoryId !== '0' && categoryById.has(categoryId)) {
      if (!sitesByCategory.has(categoryId)) sitesByCategory.set(categoryId, []);
      sitesByCategory.get(categoryId).push(site);
    } else {
      rootSites.push(site);
    }
  }

  const lines = [];
  lines.push('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
  lines.push('<!-- This is an automatically generated file.');
  lines.push('     It will be read and overwritten.');
  lines.push('     DO NOT EDIT! -->');
  lines.push('<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">');
  lines.push('<TITLE>Bookmarks</TITLE>');
  lines.push('<H1>Bookmarks</H1>');
  lines.push('<DL><p>');

  const sortByOrder = (list) =>
    [...list].sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));

  const renderSite = (site, depth) => {
    const url = String(site.url || '').trim();
    if (!url) return; // 跳过无 URL 的条目
    const indent = '    '.repeat(depth + 1);
    const name = escapeHtml(site.name || '未命名');
    const icon = site.logo ? ` ICON="${escapeHtml(site.logo)}"` : '';
    lines.push(`${indent}<DT><A HREF="${escapeHtml(url)}" ADD_DATE="${now}"${icon}>${name}</A>`);
  };

  const renderFolder = (category, depth) => {
    const indent = '    '.repeat(depth + 1);
    const name = escapeHtml(category.catelog || '未命名分类');
    lines.push(`${indent}<DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">${name}</H3>`);
    lines.push(`${indent}<DL><p>`);

    // 子分类
    const children = sortByOrder(
      categories.filter((c) => String(c.parent_id ?? '0') === String(category.id))
    );
    for (const child of children) {
      renderFolder(child, depth + 1);
    }

    // 本分类下的书签
    for (const site of sortByOrder(sitesByCategory.get(String(category.id)) || [])) {
      renderSite(site, depth + 1);
    }

    lines.push(`${indent}</DL><p>`);
  };

  // 根目录书签
  for (const site of sortByOrder(rootSites)) {
    renderSite(site, 0);
  }

  // 顶级分类文件夹（parent_id 为 0 或父分类不存在的分类）
  const rootCategories = sortByOrder(
    categories.filter((c) => {
      const parentId = String(c.parent_id ?? '0');
      return parentId === '0' || !categoryById.has(parentId);
    })
  );
  for (const category of rootCategories) {
    renderFolder(category, 0);
  }

  lines.push('</DL><p>');
  return lines.join('\n') + '\n';
}

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!(await isAdminAuthenticated(request, env))) {
    return errorResponse('Unauthorized', 401);
  }

  const url = new URL(request.url);
  const includePrivate = url.searchParams.get('include_private') === 'true';

  try {
    const exportData = await fetchBookmarkExport(env, { includePrivate });
    const html = buildChromeBookmarksHtml(exportData);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'attachment; filename="bookmarks.html"',
      },
    });
  } catch (e) {
    return errorResponse(`Failed to export bookmarks html: ${e.message}`, 500);
  }
}
