/**
 * Homepage scripts — particles, carousel, GitHub stats, theme, scroll
 * Only runs on the homepage (guard: document.querySelector('.homepage-hero'))
 */

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

  /* ===== Carousel ===== */
  var currentCard = 0;
  var totalCards = 3;
  var autoTimer = null;

  function updateCarousel() {
    var track = document.getElementById('carousel-track');
    var dots = document.querySelectorAll('.dot');
    if (track) track.style.transform = 'translateX(-' + (currentCard * 100) + '%)';
    dots.forEach(function (d, i) {
      d.classList.toggle('active', i === currentCard);
    });
  }

  window.goToCard = function (index) {
    currentCard = index;
    updateCarousel();
    resetAuto();
  };

  window.prevCard = function () {
    currentCard = (currentCard - 1 + totalCards) % totalCards;
    updateCarousel();
    resetAuto();
  };

  window.nextCard = function () {
    currentCard = (currentCard + 1) % totalCards;
    updateCarousel();
    resetAuto();
  };

  function resetAuto() {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(window.nextCard, 5000);
  }

  function initCarousel() {
    var track = document.getElementById('carousel-track');
    if (!track) return;
    track.style.transition = 'transform 0.3s ease';
    resetAuto();
    var container = track.parentElement;
    container.addEventListener('mouseenter', function () {
      if (autoTimer) clearInterval(autoTimer);
    });
    container.addEventListener('mouseleave', resetAuto);
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

  /* ===== Theme Toggle ===== */
  window.toggleHomepageTheme = function () {
    var key = (location.pathname + '__palette').replace(/\/\//g, '/');
    var stored = (function () {
      try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
    })() || { color: { scheme: 'default', primary: 'indigo', accent: 'indigo' } };

    stored.color.scheme = stored.color.scheme === 'default' ? 'slate' : 'default';
    stored.color.media = '(prefers-color-scheme:' + (stored.color.scheme === 'default' ? 'light' : 'dark') + ')';
    try { localStorage.setItem(key, JSON.stringify(stored)); } catch (e) { /* ignore */ }
    document.body.setAttribute('data-md-color-scheme', stored.color.scheme);
  };

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
