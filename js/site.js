(function () {
  'use strict';

  function initHomeHeroViewport() {
    if (document.body.getAttribute('data-page') !== 'home') return;

    function setHeroHeight() {
      var vv = window.visualViewport;
      var h = vv && vv.height ? vv.height : window.innerHeight;
      /* ビューポート高さを整数化（dvh とのズレで上下に body 色の線が出るのを抑える） */
      document.documentElement.style.setProperty('--home-hero-vh', Math.round(h) + 'px');
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

  function getHomeScrollTop() {
    return window.scrollY || document.documentElement.scrollTop;
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
      if (getHomeScrollTop() > 400) {
        btn.classList.add('is-visible');
      } else {
        btn.classList.remove('is-visible');
      }
    });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function initHomeHeroReveal() {
    if (document.body.getAttribute('data-page') !== 'home') return;
    var hero = document.querySelector('.hero.hero--home');
    if (!hero) return;

    var copyBlock = document.querySelector('.hero__copy-block');
    var centerStack = document.querySelector('.hero__center-stack');

    function showCards() {
      if (hero.classList.contains('hero--cards-visible')) return;
      hero.classList.add('hero--cards-visible');
      hero.classList.add('hero--cards-interactive');
    }

    var cardsRevealTimer = null;

    function scheduleCardsReveal() {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        showCards();
        return;
      }
      window.clearTimeout(cardsRevealTimer);
      cardsRevealTimer = window.setTimeout(showCards, 280 + 1200 + 100);
    }

    function unlockHeroCopy() {
      if (hero.classList.contains('hero--copy-visible')) return;
      hero.classList.add('hero--copy-visible');
      hero.style.setProperty('--home-scroll-reveal', '1');
      if (copyBlock) copyBlock.setAttribute('aria-hidden', 'false');
      if (centerStack) centerStack.setAttribute('aria-hidden', 'false');
      scheduleCardsReveal();
    }

    function onWheel(e) {
      if (hero.classList.contains('hero--copy-visible')) return;
      e.preventDefault();
      unlockHeroCopy();
    }

    function onKeyDown(e) {
      if (hero.classList.contains('hero--copy-visible')) return;
      var k = e.key;
      if (k !== ' ' && k !== 'Enter' && k !== 'ArrowDown' && k !== 'PageDown') return;
      var tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
      e.preventDefault();
      unlockHeroCopy();
    }

    hero.addEventListener(
      'click',
      function (e) {
        if (e.target.closest && e.target.closest('.site-header')) return;
        unlockHeroCopy();
      },
      false
    );

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown, false);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      hero.style.setProperty('--home-scroll-reveal', '1');
      hero.classList.add('hero--copy-visible');
      if (copyBlock) copyBlock.setAttribute('aria-hidden', 'false');
      if (centerStack) centerStack.setAttribute('aria-hidden', 'false');
      showCards();
    }
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
    initHomeHeroReveal();
    initHomeHeader();
    initHeroVideo();
    initFadeIn();
    initBackTop();
  });
})();
