// public/js/home-blog.js
// 首页最新博客栏目 - 动态加载并渲染最新博客文章

(function() {
  const MAX_POSTS = 3;

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function renderBlogPosts(posts) {
    const grid = document.getElementById('blogPostsGrid');
    const section = document.getElementById('latestBlogSection');

    if (!grid || !section || !posts || posts.length === 0) {
      return;
    }

    // 显示栏目
    section.classList.remove('hidden');

    // 渲染文章卡片
    grid.innerHTML = posts.map(post => `
      <article class="blog-post-card bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-300" data-id="${post.id}">
        ${post.cover_image ? `<img src="${escapeHtml(post.cover_image)}" alt="${escapeHtml(post.title)}" class="w-full h-32 object-cover rounded-lg mb-3">` : ''}
        <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 line-clamp-1 hover:text-primary-500 transition-colors">${escapeHtml(post.title)}</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">${escapeHtml(post.summary || post.content.substring(0, 100) + '...')}</p>
        <div class="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
          <span class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            ${formatDate(post.create_time)}
          </span>
          <span class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            ${post.view_count || 0}
          </span>
        </div>
      </article>
    `).join('');

    // 绑定点击事件
    grid.querySelectorAll('.blog-post-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        window.location.href = `/blog/post.html?id=${id}`;
      });
    });
  }

  async function loadLatestPosts() {
    try {
      const res = await fetch(`/api/posts?scope=public&page=1&pageSize=${MAX_POSTS}`);
      const data = await res.json();

      if (data.code === 200 && data.data && data.data.length > 0) {
        renderBlogPosts(data.data);
      }
    } catch (e) {
      console.error('Failed to load latest blog posts:', e);
    }
  }

  // DOM 加载完成后执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadLatestPosts);
  } else {
    loadLatestPosts();
  }
})();
