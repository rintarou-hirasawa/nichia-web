(function () {
  'use strict';

  function initHomeHeroViewport() {
    if (document.body.getAttribute('data-page') !== 'home') return;

    function setHeroHeight() {
      var vv = window.visualViewport;
      var h = vv && vv.height ? vv.height : window.innerHeight;
      /* 端の小数・サブピクセルで下に 1px 白が出るのを抑える */
      document.documentElement.style.setProperty('--home-hero-vh', Math.ceil(h) + 'px');
    }

    setHeroHeight();
    window.addEventListener('resize', setHeroHeight, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setHeroHeight, { passive: true });
    }
    window.addEventListener(
      'orientationchange',
      function () {
        requestAnimationFrame(setHeroHeight);
      },
      { passive: true }
    );
  }

  function initNavActive() {
    var page = document.body.getAttribute('data-page');
    if (!page) return;
    document.querySelectorAll('.site-nav a[data-nav]').forEach(function (a) {
      if (a.getAttribute('data-nav') === page) {
        a.classList.add('is-active');
      }
    });
  }

  function initMobileNav() {
    var header = document.querySelector('.site-header');
    var toggle = document.querySelector('.nav-toggle');
    if (!header || !toggle) return;

    toggle.addEventListener('click', function () {
      header.classList.toggle('is-open');
      var open = header.classList.contains('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    header.querySelectorAll('.site-nav a').forEach(function (link) {
      link.addEventListener('click', function () {
        header.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function initHeroVideo() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll('.hero__media video, .business-page-hero__media video').forEach(function (video) {
      video.muted = true;
      video.loop = true;
      video.play().catch(function () {});
      video.addEventListener('ended', function () {
        video.currentTime = 0;
        video.play().catch(function () {});
      });
    });
  }

  function initFadeIn() {
    var els = document.querySelectorAll('.fade-in');
    if (!els.length || !('IntersectionObserver' in window)) {
      els.forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }
    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach(function (el) {
      obs.observe(el);
    });
  }

  function initBackTop() {
    var btn = document.querySelector('.back-top');
    if (!btn) return;
    window.addEventListener('scroll', function () {
      if (window.scrollY > 400) {
        btn.classList.add('is-visible');
      } else {
        btn.classList.remove('is-visible');
      }
    });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function initHomeHeroCopyReveal() {
    var hero = document.querySelector('.hero.hero--home');
    if (!hero) return;
    var content = document.getElementById('hero-copy');
    var hint = document.getElementById('hero-scroll-hint');

    function reveal() {
      if (hero.classList.contains('hero--copy-revealed')) return;
      hero.classList.add('hero--copy-revealed');
      if (content) {
        content.setAttribute('aria-hidden', 'false');
      }
      if (hint) {
        hint.setAttribute('aria-hidden', 'false');
        hint.removeAttribute('tabindex');
      }
    }

    function detachHeroWheel() {
      window.removeEventListener('wheel', onWheelHeroHold, wheelListenerOpts);
      window.removeEventListener('scroll', onScrollHeroLock);
    }

    var scrollLocking = false;

    /* トップでコピー未表示のときに少しスクロールしただけで下へ進ませない（動画画面でホールド） */
    function onScrollHeroLock() {
      if (hero.classList.contains('hero--copy-revealed')) {
        detachHeroWheel();
        return;
      }
      if (scrollLocking) return;
      var y = window.scrollY;
      if (y > 0 && y < 120) {
        scrollLocking = true;
        window.scrollTo(0, 0);
        reveal();
        scrollLocking = false;
        detachHeroWheel();
      }
    }

    var wheelListenerOpts = { passive: false };
    function onWheelHeroHold(e) {
      if (window.scrollY > 2) return;
      if (e.deltaY <= 0) return;
      if (hero.classList.contains('hero--copy-revealed')) {
        detachHeroWheel();
        return;
      }
      e.preventDefault();
      reveal();
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      reveal();
      return;
    }

    /* リロード時は常にコピー非表示から。scroll 位置が残っていても自動では開かない（ユーザーが再度ホイール等で開く） */
    window.addEventListener('wheel', onWheelHeroHold, wheelListenerOpts);
    window.addEventListener('scroll', onScrollHeroLock, { passive: true });
  }

  function initHomeHeader() {
    var page = document.body.getAttribute('data-page');
    var header = document.querySelector('.site-header');
    if (!header) return;
    var hero = null;
    if (page === 'home') hero = document.querySelector('.hero--home');
    else if (page === 'business') hero = document.querySelector('.business-page-hero');
    else if (page === 'about') hero = document.querySelector('.about-page-hero');
    else return;
    if (!hero) return;
    /* ヒーロー下端がこの距離（px）以内に入ったら透明→緑を段階的に変化 */
    var fadeStartPx = 120;
    function updateHeader() {
      var heroBottom = hero.getBoundingClientRect().bottom;
      var t;
      if (heroBottom <= 0) {
        t = 1;
      } else if (heroBottom >= fadeStartPx) {
        t = 0;
      } else {
        t = 1 - heroBottom / fadeStartPx;
      }
      header.style.setProperty('--header-solid', String(t));
      if (heroBottom <= 0) {
        header.classList.add('site-header--scrolled');
      } else {
        header.classList.remove('site-header--scrolled');
      }
    }
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
    window.addEventListener('resize', updateHeader, { passive: true });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initHomeHeroViewport();
    initNavActive();
    initMobileNav();
    initHomeHeroCopyReveal();
    initHomeHeader();
    initHeroVideo();
    initFadeIn();
    initBackTop();
  });
})();
