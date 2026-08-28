// public/js/music-player.js
// 首页音乐播放器

(function() {
  // 等待 DOM 加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
  let musicList = [];
  let currentIndex = 0;
  let isPlaying = false;
  let isExpanded = false;
  let isShuffle = false;

  const musicPlayer = document.getElementById('musicPlayer');
  const musicToggleBtn = document.getElementById('musicToggleBtn');
  const musicPlayerCard = document.getElementById('musicPlayerCard');
  const musicCloseBtn = document.getElementById('musicCloseBtn');
  const musicAudio = document.getElementById('musicAudio');
  const musicPlayBtn = document.getElementById('musicPlayBtn');
  const musicPlayIcon = document.getElementById('musicPlayIcon');
  const musicPrevBtn = document.getElementById('musicPrevBtn');
  const musicNextBtn = document.getElementById('musicNextBtn');
  const musicShuffleBtn = document.getElementById('musicShuffleBtn');
  const musicListBtn = document.getElementById('musicListBtn');
  const musicListPanel = document.getElementById('musicListPanel');
  const musicListContainer = document.getElementById('musicListContainer');
  const musicTitle = document.getElementById('musicTitle');
  const musicArtist = document.getElementById('musicArtist');
  const musicCover = document.getElementById('musicCover');
  const musicProgressBar = document.getElementById('musicProgressBar');
  const musicProgress = document.getElementById('musicProgress');
  const musicCurrentTime = document.getElementById('musicCurrentTime');
  const musicDuration = document.getElementById('musicDuration');
  const musicVolume = document.getElementById('musicVolume');
  const musicPlayingDot = document.getElementById('musicPlayingDot');

  if (!musicPlayer || !musicAudio) return;

  // 格式化时间
  function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // 加载音乐列表
  async function loadMusicList() {
    try {
      const res = await fetch('/api/musics?scope=public&pageSize=50');
      const data = await res.json();
      if (data.code === 200 && data.data && data.data.length > 0) {
        musicList = data.data;
        musicPlayer.classList.remove('hidden');
        currentIndex = 0;
        loadCurrentMusic();
      }
    } catch (e) {
      console.error('Failed to load music list:', e);
    }
  }

  // 加载当前歌曲
  function loadCurrentMusic() {
    if (musicList.length === 0) return;
    const music = musicList[currentIndex];
    musicAudio.src = music.music_url;
    musicTitle.textContent = music.title;
    musicArtist.textContent = music.artist || '未知艺术家';

    // 设置封面
    if (music.cover_url) {
      musicCover.style.backgroundImage = `url(${music.cover_url})`;
      musicCover.style.backgroundSize = 'cover';
      musicCover.style.backgroundPosition = 'center';
      musicCover.style.borderRadius = '9999px';
      musicCover.innerHTML = '';
    } else {
      musicCover.style.backgroundImage = '';
      musicCover.style.borderRadius = '';
      musicCover.className = 'w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center overflow-hidden shadow';
      musicCover.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>`;
    }

    // 若播放列表已展开，实时刷新激活高亮
    if (musicListPanel && !musicListPanel.classList.contains('hidden')) {
      renderMusicList();
    }
  }

  // 播放/暂停
  function togglePlay() {
    if (musicList.length === 0) return;
    if (isPlaying) {
      musicAudio.pause();
    } else {
      musicAudio.play().catch(e => console.error('Play failed:', e));
    }
  }

  // 上一首
  function playPrev() {
    if (musicList.length === 0) return;
    currentIndex = (currentIndex - 1 + musicList.length) % musicList.length;
    loadCurrentMusic();
    if (isPlaying) {
      musicAudio.play().catch(e => console.error('Play failed:', e));
    }
  }

  // 下一首
  function playNext() {
    if (musicList.length === 0) return;
    if (isShuffle) {
      let next;
      do {
        next = Math.floor(Math.random() * musicList.length);
      } while (next === currentIndex && musicList.length > 1);
      currentIndex = next;
    } else {
      currentIndex = (currentIndex + 1) % musicList.length;
    }
    loadCurrentMusic();
    if (isPlaying) {
      musicAudio.play().catch(e => console.error('Play failed:', e));
    }
  }

  // 更新播放图标
  function updatePlayIcon() {
    if (isPlaying) {
      musicPlayIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
      musicPlayingDot.classList.remove('hidden');
    } else {
      musicPlayIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
      musicPlayingDot.classList.add('hidden');
    }
  }

  // 展开/折叠播放器
  function toggleExpand() {
    isExpanded = !isExpanded;
    if (isExpanded) {
      musicPlayerCard.classList.remove('hidden');
      musicToggleBtn.classList.add('hidden');
    } else {
      musicPlayerCard.classList.add('hidden');
      musicToggleBtn.classList.remove('hidden');
      if (musicListPanel) musicListPanel.classList.add('hidden');
      if (musicListBtn) musicListBtn.classList.remove('text-green-500');
    }
  }

  // 渲染播放列表
  function renderMusicList() {
    if (!musicListContainer) return;
    musicListContainer.innerHTML = '';
    musicList.forEach((music, i) => {
      const item = document.createElement('div');
      item.className = 'flex items-center gap-2 px-1.5 py-1 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors' + (i === currentIndex ? ' bg-green-50 dark:bg-green-900/30' : '');
      item.innerHTML = `<div class="min-w-0 flex-1">
          <div class="text-[10px] font-medium text-gray-700 dark:text-gray-200 truncate">${music.title}</div>
          <div class="text-[9px] text-gray-400 truncate">${music.artist || '未知艺术家'}</div>
        </div>
        ${i === currentIndex ? '<span class="text-green-500 text-[10px] shrink-0">▶</span>' : ''}`;
      item.addEventListener('click', () => {
        currentIndex = i;
        loadCurrentMusic();
        musicAudio.play().catch(e => console.error('Play failed:', e));
      });
      musicListContainer.appendChild(item);
    });
  }

  // 随机播放切换
  function toggleShuffle() {
    isShuffle = !isShuffle;
    if (musicShuffleBtn) {
      musicShuffleBtn.classList.toggle('text-green-500', isShuffle);
      musicShuffleBtn.classList.toggle('text-gray-500', !isShuffle);
    }
  }

  // 播放列表开关
  function toggleList() {
    if (!musicListPanel) return;
    if (musicListPanel.classList.contains('hidden')) {
      renderMusicList();
      musicListPanel.classList.remove('hidden');
      if (musicListBtn) musicListBtn.classList.add('text-green-500');
    } else {
      musicListPanel.classList.add('hidden');
      if (musicListBtn) musicListBtn.classList.remove('text-green-500');
    }
  }

  // 事件绑定
  musicToggleBtn.addEventListener('click', toggleExpand);
  musicCloseBtn.addEventListener('click', toggleExpand);
  musicPlayBtn.addEventListener('click', togglePlay);
  musicPrevBtn.addEventListener('click', playPrev);
  musicNextBtn.addEventListener('click', playNext);
  if (musicShuffleBtn) musicShuffleBtn.addEventListener('click', toggleShuffle);
  if (musicListBtn) musicListBtn.addEventListener('click', toggleList);

  // 音频事件
  musicAudio.addEventListener('play', () => {
    isPlaying = true;
    updatePlayIcon();
  });

  musicAudio.addEventListener('pause', () => {
    isPlaying = false;
    updatePlayIcon();
  });

  musicAudio.addEventListener('timeupdate', () => {
    if (musicAudio.duration) {
      const percent = (musicAudio.currentTime / musicAudio.duration) * 100;
      musicProgress.style.width = `${percent}%`;
      musicCurrentTime.textContent = formatTime(musicAudio.currentTime);
    }
  });

  musicAudio.addEventListener('loadedmetadata', () => {
    musicDuration.textContent = formatTime(musicAudio.duration);
  });

  musicAudio.addEventListener('ended', () => {
    playNext();
  });

  // 进度条点击跳转
  musicProgressBar.addEventListener('click', (e) => {
    if (!musicAudio.duration) return;
    const rect = musicProgressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    musicAudio.currentTime = percent * musicAudio.duration;
  });

  // 音量控制
  musicVolume.addEventListener('input', (e) => {
    musicAudio.volume = e.target.value / 100;
  });
  musicAudio.volume = 0.7;

  // 初始化
  loadMusicList();
  } // end init
})();
