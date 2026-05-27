/**
 * Homepage scripts — particles, carousel, GitHub stats, theme, scroll
 * Only runs on the homepage (guard: document.querySelector('.homepage-hero'))
 */

/* ===== Theme Toggle (available on all pages) ===== */
window.toggleHomepageTheme = function () {
  var current = document.body.getAttribute('data-md-color-scheme');
  var next = current === 'default' ? 'slate' : 'default';
  document.body.setAttribute('data-md-color-scheme', next);
  try {
    localStorage.setItem('__theme', next);
    // Also persist in MkDocs' own storage for cross-page consistency
    if (window.__md_set) {
      __md_set('__palette', { index: next === 'slate' ? 1 : 0 });
    }
  } catch (e) {}
};

/* ===== Sidebar scrollbar — only show when 10+ nav items ===== */
(function () {
  ['primary', 'secondary'].forEach(function (type) {
    var wrap = document.querySelector('.md-sidebar--' + type + ' .md-sidebar__scrollwrap');
    if (!wrap) return;
    var items = wrap.querySelectorAll('.md-nav__item');
    if (items.length < 10) {
      wrap.style.overflow = 'hidden';
    }
  });
})();

(function () {
  if (!document.querySelector('.homepage-hero')) return;

  /* ===== Particle Animation ===== */
  function initParticles() {
    const container = document.getElementById('hero-particles');
    if (!container) return;
    const count = window.innerWidth < 768 ? 30 : 60;

    for (let i = 0; i < count; i++) {
      const dot = document.createElement('div');
      const size = 1 + Math.random() * 2;
      dot.style.cssText = [
        'position: absolute',
        'width: ' + size + 'px',
        'height: ' + size + 'px',
        'background: rgba(255,255,255,' + (0.3 + Math.random() * 0.5) + ')',
        'border-radius: 50%',
        'left: ' + Math.random() * 100 + '%',
        'top: ' + Math.random() * 100 + '%',
        'animation: twinkle ' + (2 + Math.random() * 3) + 's ease-in-out infinite',
        'animation-delay: ' + Math.random() * 3 + 's',
        'pointer-events: none'
      ].join(';');
      container.appendChild(dot);
    }
  }

  /* ===== Carousel - Three Cards Rotation ===== */
  var cardData = [
    { icon: '💻', title: '项目', desc: '2 个项目', url: '/personal-web/projects/' },
    { icon: '📝', title: '博客', desc: '8 篇文章', url: '/personal-web/blog/' },
    { icon: '🐙', title: 'GitHub', desc: '开源代码', url: 'https://github.com/lxgy1024', external: true }
  ];
  var currentCenter = 1; // 博客 starts in center (项目, 博客, GitHub)
  var autoTimer = null;

  function renderCards() {
    var container = document.getElementById('carousel-cards');
    if (!container) return;

    var left = (currentCenter + 2) % 3;
    var right = (currentCenter + 1) % 3;
    var indices = [left, currentCenter, right];

    container.innerHTML = '';
    indices.forEach(function (idx, i) {
      var card = cardData[idx];
      var el = document.createElement('div');
      el.className = 'carousel-card' + (i === 1 ? ' active' : '');
      el.innerHTML = '<div class="card-icon">' + card.icon + '</div>' +
                     '<div class="card-title">' + card.title + '</div>' +
                     '<div class="card-desc">' + card.desc + '</div>';
      el.addEventListener('click', function () {
        if (card.external) window.open(card.url);
        else location.href = card.url;
      });
      container.appendChild(el);
    });
  }

  window.prevCard = function () {
    currentCenter = (currentCenter + 2) % 3;
    renderCards();
    resetAuto();
  };

  window.nextCard = function () {
    currentCenter = (currentCenter + 1) % 3;
    renderCards();
    resetAuto();
  };

  function resetAuto() {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(window.nextCard, 5000);
  }

  function initCarousel() {
    var container = document.getElementById('carousel-cards');
    if (!container) return;
    renderCards();
    resetAuto();
    var section = container.closest('.homepage-carousel');
    if (section) {
      section.addEventListener('mouseenter', function () {
        if (autoTimer) clearInterval(autoTimer);
      });
      section.addEventListener('mouseleave', resetAuto);
    }
  }

  /* ===== GitHub Stats ===== */
  function fetchGitHubStats() {
    var cards = document.querySelectorAll('.project-card[data-repo]');
    if (!cards.length) return;

    cards.forEach(function (card) {
      var repo = card.getAttribute('data-repo');
      var stars = card.querySelector('.stat-stars');
      var forks = card.querySelector('.stat-forks');
      if (!stars && !forks) return;

      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'https://api.github.com/repos/lxgy1024/' + repo, true);
      xhr.onload = function () {
        if (xhr.status === 200) {
          var data = JSON.parse(xhr.responseText);
          if (stars) stars.textContent = '⭐ ' + (data.stargazers_count || 0);
          if (forks) forks.textContent = '🍴 ' + (data.forks_count || 0);
        }
      };
      xhr.onerror = function () { /* keep -- */ };
      xhr.send();
    });
  }

  /* ===== Scroll Observer ===== */
  function observeEntries() {
    var els = document.querySelectorAll('.homepage-carousel, .project-card, .blog-row');
    if (!els.length || !window.IntersectionObserver) {
      els.forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    els.forEach(function (el) { observer.observe(el); });
  }

  /* ===== Init ===== */
  initParticles();
  initCarousel();
  fetchGitHubStats();
  observeEntries();
})();
