(function () {
  'use strict';

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

  function initHomeHeader() {
    var page = document.body.getAttribute('data-page');
    if (page !== 'home' && page !== 'business' && page !== 'about') return;
    var header = document.querySelector('.site-header');
    if (!header) return;
    var threshold = 32;
    function onScroll() {
      if (window.scrollY > threshold) {
        header.classList.add('site-header--scrolled');
      } else {
        header.classList.remove('site-header--scrolled');
      }
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function initContactForm() {
    var form = document.querySelector('.contact-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      alert('お問い合わせを受け付けました。ありがとうございます。');
      form.reset();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNavActive();
    initMobileNav();
    initHomeHeader();
    initHeroVideo();
    initFadeIn();
    initBackTop();
    initContactForm();
  });
})();
