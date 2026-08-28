// functions/lib/seed-demo.js
// 示例数据初始化：首次部署（空数据库）时自动插入示例书签、博客文章、音乐，
// 让用户第一时间就能看到各项功能正常。数据随时可在后台删除/编辑。
//
// 幂等机制：
// - KV 标记 `demo_seeded_v1` 防止重复尝试
// - 仅当 category 表为空时才插入（用户已有数据则跳过）

const SEED_MARKER_KEY = 'demo_seeded_v1';

// 示例分类（与书签 catelog_id 对应）
const SEED_CATEGORIES = [
  { name: '常用工具', sort: 1 },
  { name: '设计灵感', sort: 2 },
  { name: '开发资源', sort: 3 },
  { name: '学习平台', sort: 4 },
  { name: '娱乐影音', sort: 5 },
];

// 示例书签（catelogId 对应上面分类顺序 1-5；logo 留空，由 ICON_API 自动补全）
const SEED_SITES = [
  { name: 'GitHub', url: 'https://github.com', desc: '全球最大的代码托管与开源协作平台', cat: 1 },
  { name: 'Google', url: 'https://www.google.com', desc: '全球领先的搜索引擎', cat: 1 },
  { name: '百度', url: 'https://www.baidu.com', desc: '中文搜索引擎与信息入口', cat: 1 },
  { name: 'Dribbble', url: 'https://dribbble.com', desc: '设计师作品分享社区', cat: 2 },
  { name: 'Behance', url: 'https://www.behance.net', desc: 'Adobe 旗下设计作品展示平台', cat: 2 },
  { name: '站酷', url: 'https://www.zcool.com.cn', desc: '国内设计师灵感交流社区', cat: 2 },
  { name: 'MDN Web Docs', url: 'https://developer.mozilla.org', desc: 'Web 开发权威文档库', cat: 3 },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com', desc: '全球程序员问答社区', cat: 3 },
  { name: 'npm', url: 'https://www.npmjs.com', desc: 'JavaScript 包管理与发布平台', cat: 3 },
  { name: '菜鸟教程', url: 'https://www.runoob.com', desc: '编程入门学习网站', cat: 4 },
  { name: 'W3School', url: 'https://www.w3school.com.cn', desc: 'Web 技术基础教程', cat: 4 },
  { name: '哔哩哔哩', url: 'https://www.bilibili.com', desc: '国内弹幕视频与创作社区', cat: 5 },
  { name: 'YouTube', url: 'https://www.youtube.com', desc: '全球最大的视频分享平台', cat: 5 },
  { name: '网易云音乐', url: 'https://music.163.com', desc: '在线音乐与歌单社区', cat: 5 },
];

// 示例博客文章（对应后台四个固定分类）
const SEED_POSTS = [
  {
    title: '欢迎使用 iori-nav 导航站',
    category: '其他',
    summary: '这是一篇示例文章，介绍本项目的主要功能与使用方式，部署后即可看到博客功能正常展示。',
    content: `欢迎来到你的专属导航站！

这是一个基于 **Cloudflare 全家桶**构建的轻量导航站点，部署后开箱即用。

## 本站功能

- 📚 **书签导航**：多级分类管理常用网站，支持搜索与快捷访问
- ✍️ **博客**：支持 Markdown 写作、分类管理与阅读统计
- 🎵 **音乐**：内置迷你音乐播放器，支持自定义歌单
- 🎨 **主题定制**：支持自定义壁纸、卡片风格、毛玻璃与夜间模式

## 示例数据

部署时系统会自动插入一批示例书签、示例文章和示例音乐，方便你第一时间确认功能正常。你可以在后台随时编辑或删除它们。

> 💡 提示：后台管理地址为 \`/admin\`，登录凭据在 Cloudflare KV 的 \`admin_username\` 与 \`admin_password\` 中配置。

祝使用愉快！`,
  },
  {
    title: '如何部署到 Cloudflare',
    category: '技术分享',
    summary: '一步步教你通过 GitHub + Cloudflare Workers 完成部署，绑定 D1 与 KV 后即可上线。',
    content: `本项目基于 **GitHub + Cloudflare 边缘网络** 构建，部署流程如下：

## 需要准备

1. GitHub 仓库（存放项目源码）
2. Cloudflare 账号

## 部署步骤

1. 将项目代码推送到 GitHub 仓库
2. 在 Cloudflare 创建 **D1 数据库**（名称 \`book\`）与 **KV 命名空间**（名称 \`NAV_AUTH\`）
3. 通过 Wrangler 部署 Worker，并绑定 D1 / KV
4. 在 KV 中配置后台登录的 \`admin_username\` 与 \`admin_password\`
5. 访问站点，后台登录 \`/admin\` 开始使用

## 关键技术点

- \`run_worker_first = true\`：确保所有请求先经过 Worker 渲染，而不是直接返回静态模板
- D1 存储数据、KV 缓存首页、边缘网络加速

> 详细图文教程请查看项目 README 中的「快速部署」章节。`,
  },
  {
    title: '前端开发者的宝藏资源清单',
    category: '资源推荐',
    summary: '整理了一批前端开发常用的文档、工具与社区，帮你少走弯路。',
    content: `以下资源是前端开发者日常使用的高频站点，均已作为示例书签内置：

## 文档类

- **MDN Web Docs**：最权威的 Web 技术文档
- **菜鸟教程**：适合入门的中文教程

## 社区类

- **Stack Overflow**：遇到问题先来这里搜
- **GitHub**：开源项目与协作的大本营

## 工具类

- **npm**：JavaScript 包管理
- **Behance / Dribbble**：设计灵感来源

## 建议

把常用站点按分类整理到导航首页，可以极大提升日常效率。本项目内置了「常用工具 / 设计灵感 / 开发资源 / 学习平台 / 娱乐影音」五个示例分类，你也可以在后台自由增删。`,
  },
  {
    title: '写在秋天的一篇随笔',
    category: '生活随笔',
    summary: '忙里偷闲，记录一些关于生活与热爱的小事。',
    content: `转眼又到秋天，窗外的风开始带了些凉意。

## 关于热爱

做网站这件事，其实很简单也很纯粹——把自己喜欢的东西整理好，分享给需要的人。当有人留言说"这个导航很好用"的时候，那种满足感是无法替代的。

## 关于坚持

一个项目从零到一，靠的不是一时的热情，而是持续的打磨。这个导航站也是这样，一点点加功能、一点点优化体验，才有了现在的样子。

## 关于生活

技术只是工具，生活才是目的。偶尔放下代码，去看看外面的风景，听听音乐，写写文字，也是一种幸福。

> 愿你也能在自己热爱的领域里，找到那份简单的快乐。`,
  },
];

// 示例音乐（使用可直链播放的音乐解析地址，可直接播放）
const SEED_MUSICS = [
  { title: '自明平凡', artist: '王家豪', url: 'https://api.qijieya.cn/meting/?type=url&id=3387500987' },
  { title: '姑娘别哭泣', artist: '柯柯柯啊', url: 'https://api.qijieya.cn/meting/?type=url&id=2078700726' },
];

// 确保 posts 表包含最新字段（兼容旧版本数据库：schema 迁移短路导致 posts 缺少 category/author 等列）
export async function ensurePostsColumns(env) {
  try {
    const cols = await env.NAV_DB.prepare('PRAGMA table_info(posts)').all();
    const names = new Set((cols.results || []).map(c => c.name));
    const statements = [];
    if (!names.has('category')) statements.push("ALTER TABLE posts ADD COLUMN category TEXT DEFAULT '未分类'");
    if (!names.has('author')) statements.push("ALTER TABLE posts ADD COLUMN author TEXT DEFAULT '管理员'");
    if (!names.has('like_count')) statements.push('ALTER TABLE posts ADD COLUMN like_count INTEGER DEFAULT 0');
    if (!names.has('comment_count')) statements.push('ALTER TABLE posts ADD COLUMN comment_count INTEGER DEFAULT 0');
    for (const s of statements) {
      try { await env.NAV_DB.prepare(s).run(); } catch (e) { console.warn('ALTER posts skipped:', e.message); }
    }
  } catch (e) {
    console.warn('ensurePostsColumns failed:', e.message);
  }
}

/**
 * 幂等地插入示例数据。仅在 category 表为空（全新部署）时执行。
 * @param {import('..').Env} env
 */
export async function seedDemoData(env) {
  if (!env || !env.NAV_DB) return;
  try {
    // KV 标记短路：已处理过则不再检查
    if (env.NAV_AUTH) {
      const seeded = await env.NAV_AUTH.get(SEED_MARKER_KEY);
      if (seeded) return;
    }

    // 判断是否为全新数据库（以分类表是否为空为准）
    const catCount = await env.NAV_DB.prepare('SELECT COUNT(*) AS c FROM category').first();
    if (catCount && catCount.c > 0) {
      // 已有用户数据，标记已处理，避免后续重复检查
      if (env.NAV_AUTH) await env.NAV_AUTH.put(SEED_MARKER_KEY, 'true');
      return;
    }

    // 插入示例分类
    for (const cat of SEED_CATEGORIES) {
      await env.NAV_DB.prepare(
        'INSERT INTO category (catelog, sort_order, parent_id, is_private) VALUES (?, ?, 0, 0)'
      ).bind(cat.name, cat.sort).run();
    }

    // 插入示例书签（按分类名回填 catelog_name）
    for (const site of SEED_SITES) {
      const cat = SEED_CATEGORIES[site.cat - 1];
      await env.NAV_DB.prepare(
        'INSERT INTO sites (name, url, logo, desc, catelog_id, catelog_name, sort_order, is_private) VALUES (?, ?, ?, ?, ?, ?, ?, 0)'
      ).bind(site.name, site.url, '', site.desc, site.cat, cat.name, site.cat * 100).run();
    }

    // 插入示例博客文章（已发布）—— 先确保 posts 表字段完整
    await ensurePostsColumns(env);
    for (const post of SEED_POSTS) {
      await env.NAV_DB.prepare(
        `INSERT INTO posts (title, slug, content, summary, cover_image, category, author, status, is_private)
         VALUES (?, ?, ?, ?, NULL, ?, '管理员', 'published', 0)`
      ).bind(post.title, post.title, post.content, post.summary, post.category).run();
    }

    // 插入示例音乐
    for (let i = 0; i < SEED_MUSICS.length; i++) {
      const m = SEED_MUSICS[i];
      await env.NAV_DB.prepare(
        'INSERT INTO musics (title, artist, music_url, cover_url, platform, sort_order, is_active) VALUES (?, ?, ?, NULL, ?, ?, 1)'
      ).bind(m.title, m.artist, m.url, 'direct', i + 1).run();
    }

    // 记录已 seed
    if (env.NAV_AUTH) {
      await env.NAV_AUTH.put(SEED_MARKER_KEY, 'true');
    }

    console.log('Demo data seeded successfully');
  } catch (e) {
    console.warn('Seed demo data failed:', e.message);
  }
}
