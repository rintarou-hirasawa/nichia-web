(function () {
  'use strict';

  var DEFAULT_AUTO_MS = 6000;
  var SLIDE_WIDTH_RATIO = 0.72;
  var MAX_SLIDE_PX = 520;
  /** スライド同士の間隔（px） */
  var GAP_PX = 60;
  /** ループ用ジャンプ後の scrollend フォールバック（ms） */
  var SCROLL_END_FALLBACK_MS = 480;
  /** 初期の「1 周分」コピー数（A,B,C を何セット並べるか） */
  var REPEAT_INITIAL = 14;
  /** 端に近づいたら追加するまで残しておく「周」の数（片側） */
  var BUFFER_CYCLES = 4;

  function initHomeFocus() {
    var root = document.querySelector('[data-home-focus]');
    if (!root) return;

    var viewport = root.querySelector('[data-home-focus-viewport]');
    var track = root.querySelector('[data-home-focus-track]');
    if (!viewport || !track) return;

    var originals = Array.prototype.slice.call(track.querySelectorAll('[data-home-focus-slide]'));
    var n = originals.length;
    if (n === 0) return;

    var templates = originals.map(function (el) {
      return el.cloneNode(true);
    });
    while (track.firstChild) {
      track.removeChild(track.firstChild);
    }
    for (var r = 0; r < REPEAT_INITIAL; r++) {
      templates.forEach(function (t) {
        track.appendChild(t.cloneNode(true));
      });
    }

    var slides = track.querySelectorAll('[data-home-focus-slide]');
    var slideCount = slides.length;

    var prevBtn = root.querySelector('[data-home-focus-prev]');
    var nextBtn = root.querySelector('[data-home-focus-next]');
    var dots = root.querySelector('[data-home-focus-dots]');

    var autoMs = parseInt(root.getAttribute('data-home-focus-interval'), 10);
    if (isNaN(autoMs) || autoMs < 1000) autoMs = DEFAULT_AUTO_MS;

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var timer = null;
    var modal = null;
    var modalVideo = null;
    var modalImg = null;
    var pointerDown = null;
    var jumpLock = false;
    var boundSlides = new WeakSet();

    function slideWidthPx() {
      var vw = viewport.clientWidth;
      if (vw <= 0) return 0;
      return Math.min(vw * SLIDE_WIDTH_RATIO, MAX_SLIDE_PX);
    }

    /** 1 周（n 枚）ぶんのスクロール量 */
    function scrollPeriodPx() {
      var w = slideWidthPx();
      if (w <= 0) return 0;
      return n * (w + GAP_PX);
    }

    function setLayout() {
      var vw = viewport.clientWidth;
      var w = slideWidthPx();
      if (vw <= 0 || w <= 0) return;
      var pad = Math.max(0, (vw - w) / 2);
      track.style.display = 'flex';
      track.style.flexDirection = 'row';
      track.style.alignItems = 'center';
      track.style.gap = GAP_PX + 'px';
      track.style.paddingLeft = pad + 'px';
      track.style.paddingRight = pad + 'px';
      track.style.boxSizing = 'border-box';

      var px = w + 'px';
      for (var si = 0; si < slideCount; si++) {
        var slide = slides[si];
        slide.style.flex = '0 0 ' + px;
        slide.style.width = px;
        slide.style.minWidth = px;
        slide.style.maxWidth = px;
      }
    }

    /** DOM 変更直後に scrollWidth が古いまま残るのを避ける */
    function flushLayout() {
      void track.offsetWidth;
      void viewport.offsetHeight;
      void viewport.scrollWidth;
    }

    function scrollDomIndexIntoView(domIndex, opts) {
      opts = opts || {};
      var slide = slides[domIndex];
      if (!slide) return;

      function measureAndScroll() {
        flushLayout();
        var v = viewport.getBoundingClientRect();
        var s = slide.getBoundingClientRect();
        var slideCx = s.left + s.width * 0.5;
        var vpCx = v.left + v.width * 0.5;
        var delta = slideCx - vpCx;
        var maxL = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        var left = viewport.scrollLeft;
        var next = Math.max(0, Math.min(left + delta, maxL));
        return { delta: delta, next: next, left: left, maxL: maxL };
      }

      var m = measureAndScroll();
      var instant = opts.instant === true || reducedMotion;
      viewport.scrollTo({
        left: m.next,
        behavior: instant ? 'auto' : 'smooth'
      });

      /* トラック拡張直後は maxL が小さいまま → スクロールが 0 になり隣カードに進まない */
      if (!instant && Math.abs(m.delta) > 6 && Math.abs(m.next - m.left) < 1) {
        window.requestAnimationFrame(function () {
          var m2 = measureAndScroll();
          viewport.scrollTo({ left: m2.next, behavior: 'smooth' });
        });
      }
    }

    function currentDomIndex() {
      var vr = viewport.getBoundingClientRect();
      var center = vr.left + vr.width / 2;
      var best = 0;
      var bestDist = Infinity;
      for (var i = 0; i < slideCount; i++) {
        var r = slides[i].getBoundingClientRect();
        var sc = r.left + r.width / 2;
        var d = Math.abs(sc - center);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return best;
    }

    function domToLogical(domIdx) {
      return ((domIdx % n) + n) % n;
    }

    /** 現在位置に近い「同じ論理番号」の dom インデックス */
    function logicalToNearestDom(L) {
      var want = ((L % n) + n) % n;
      var d = currentDomIndex();
      var k = Math.floor(d / n);
      var candidates = [(k - 1) * n + want, k * n + want, (k + 1) * n + want];
      var best = d;
      var bestDist = Infinity;
      for (var ci = 0; ci < candidates.length; ci++) {
        var c = candidates[ci];
        if (c >= 0 && c < slideCount) {
          var dist = Math.abs(c - d);
          if (dist < bestDist) {
            bestDist = dist;
            best = c;
          }
        }
      }
      if (bestDist === Infinity) {
        return Math.min(Math.max(0, want), slideCount - 1);
      }
      return best;
    }

    function domIndexOfSlide(slideEl) {
      for (var i = 0; i < slideCount; i++) {
        if (slides[i] === slideEl) return i;
      }
      return -1;
    }

    function isDomSlideVisuallyCentered(domIdx) {
      var el = slides[domIdx];
      if (!el) return false;
      var v = viewport.getBoundingClientRect();
      var s = el.getBoundingClientRect();
      var slideCx = s.left + s.width * 0.5;
      var vpCx = v.left + v.width * 0.5;
      return Math.abs(slideCx - vpCx) < 8;
    }

    function refreshSlidesList() {
      slides = track.querySelectorAll('[data-home-focus-slide]');
      slideCount = slides.length;
    }

    function appendCycles(count) {
      if (count <= 0) return;
      for (var r = 0; r < count; r++) {
        templates.forEach(function (t) {
          track.appendChild(t.cloneNode(true));
        });
      }
      refreshSlidesList();
      setLayout();
      flushLayout();
      for (var si = 0; si < slideCount; si++) {
        bindSlideInteraction(slides[si]);
      }
    }

    function prependCycles(count) {
      if (count <= 0) return;
      var period = scrollPeriodPx();
      for (var r = 0; r < count; r++) {
        var frag = document.createDocumentFragment();
        templates.forEach(function (t) {
          frag.appendChild(t.cloneNode(true));
        });
        track.insertBefore(frag, track.firstChild);
      }
      refreshSlidesList();
      setLayout();
      flushLayout();
      jumpLock = true;
      viewport.scrollLeft += period * count;
      jumpLock = false;
      for (var si = 0; si < slideCount; si++) {
        bindSlideInteraction(slides[si]);
      }
    }

    function ensureTrailingCycles() {
      var guard = 0;
      while (guard++ < 64) {
        flushLayout();
        var d = currentDomIndex();
        if (slideCount - 1 - d >= BUFFER_CYCLES * n) break;
        appendCycles(1);
      }
    }

    function ensureLeadingCycles() {
      var guard = 0;
      while (guard++ < 64) {
        flushLayout();
        var d = currentDomIndex();
        if (d >= BUFFER_CYCLES * n) break;
        prependCycles(1);
      }
    }

    function syncUi() {
      updateCurrentClass();
      updateDotsVisuals();
      updateVideos(currentDomIndex());
    }

    function updateCurrentClass() {
      var idx = currentDomIndex();
      for (var si = 0; si < slideCount; si++) {
        slides[si].classList.toggle('is-current', si === idx);
      }
      return idx;
    }

    function afterScrollEnd(callback) {
      var done = false;
      function run() {
        if (done) return;
        done = true;
        callback();
      }
      viewport.addEventListener('scrollend', run, { once: true });
      window.setTimeout(run, reducedMotion ? 0 : SCROLL_END_FALLBACK_MS);
    }

    function goToLogical(i, opts) {
      opts = opts || {};
      var clamped = ((i % n) + n) % n;
      ensureTrailingCycles();
      ensureLeadingCycles();
      flushLayout();
      var domIdx = logicalToNearestDom(clamped);
      scrollDomIndexIntoView(domIdx, { instant: opts.instant === true });
      window.setTimeout(function () {
        syncUi();
      }, opts.instant || reducedMotion ? 0 : 400);
    }

    function goToLogicalImmediate(i) {
      var clamped = ((i % n) + n) % n;
      ensureTrailingCycles();
      ensureLeadingCycles();
      flushLayout();
      scrollDomIndexIntoView(logicalToNearestDom(clamped), { instant: true });
      window.requestAnimationFrame(function () {
        syncUi();
      });
    }

    /** 次へ: 常に右隣（論理は最後の次で先頭に戻るが、スクロールは右へ続ける） */
    function next() {
      ensureTrailingCycles();
      flushLayout();
      var d = currentDomIndex();
      var target = d + 1;
      if (target >= slideCount) {
        appendCycles(1);
        flushLayout();
        d = currentDomIndex();
        target = d + 1;
      }
      if (target >= slideCount) return;

      function runScroll() {
        scrollDomIndexIntoView(target, {});
      }

      if (reducedMotion) {
        runScroll();
      } else {
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(runScroll);
        });
      }
    }

    /** 前へ: 左へ（必要なら左側に周を追加） */
    function prev() {
      ensureLeadingCycles();
      flushLayout();
      var d = currentDomIndex();
      if (d > 0) {
        scrollDomIndexIntoView(d - 1, {});
      }
    }

    function updateDotsVisuals() {
      if (!dots) return;
      var log = domToLogical(currentDomIndex());
      var buttons = dots.querySelectorAll('.home-focus__dot');
      buttons.forEach(function (btn, bi) {
        btn.setAttribute('aria-selected', bi === log ? 'true' : 'false');
        btn.classList.toggle('is-active', bi === log);
      });
    }

    function updateDots() {
      updateDotsVisuals();
      updateVideos(currentDomIndex());
      updateCurrentClass();
    }

    function updateVideos(activeDomIndex) {
      if (modal && modal.getAttribute('aria-hidden') === 'false') return;
      for (var si = 0; si < slideCount; si++) {
        var slide = slides[si];
        var v = slide.querySelector('video');
        if (!v) continue;
        if (si === activeDomIndex) {
          v.play().catch(function () {});
        } else {
          v.pause();
        }
      }
    }

    function buildDots() {
      if (!dots) return;
      dots.innerHTML = '';
      for (var i = 0; i < n; i++) {
        (function (idx) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'home-focus__dot';
          b.setAttribute('aria-label', 'スライド ' + (idx + 1) + ' へ移動');
          b.addEventListener('click', function () {
            goToLogical(idx, { instant: false });
            resetTimer();
          });
          dots.appendChild(b);
        })(i);
      }
      updateDots();
    }

    function resetTimer() {
      if (timer) clearInterval(timer);
      if (reducedMotion) return;
      timer = setInterval(next, autoMs);
    }

    function stopTimer() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    function ensureModal() {
      if (modal) return;
      modal = document.createElement('div');
      modal.className = 'home-focus-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'メディアを拡大表示');
      modal.setAttribute('aria-hidden', 'true');
      modal.innerHTML =
        '<button type="button" class="home-focus-modal__close" aria-label="閉じる">&times;</button>' +
        '<div class="home-focus-modal__body"></div>';
      document.body.appendChild(modal);

      modalImg = document.createElement('img');
      modalImg.className = 'home-focus-modal__img';
      modalImg.alt = '';

      modalVideo = document.createElement('video');
      modalVideo.className = 'home-focus-modal__video';
      modalVideo.setAttribute('controls', '');
      modalVideo.setAttribute('playsinline', '');

      modal.querySelector('.home-focus-modal__close').addEventListener('click', closeModal);
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModal();
      });
    }

    function closeModal() {
      if (!modal) return;
      var body = modal.querySelector('.home-focus-modal__body');
      if (modalVideo.parentNode) {
        modalVideo.pause();
        modalVideo.removeAttribute('src');
        modalVideo.load();
      }
      if (modalImg.parentNode) {
        modalImg.removeAttribute('src');
      }
      if (body) body.innerHTML = '';
      modal.removeAttribute('aria-describedby');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      updateVideos(currentDomIndex());
    }

    function openModalFromSlide(slide) {
      ensureModal();
      var body = modal.querySelector('.home-focus-modal__body');
      body.innerHTML = '';
      modal.removeAttribute('aria-describedby');

      var video = slide.querySelector('video');
      var source = video ? video.querySelector('source') : null;
      var img = slide.querySelector('img');
      var directSrc = video && video.getAttribute('src');
      var capSource = slide.querySelector('[data-home-focus-caption]');
      var captionText = capSource
        ? String(capSource.textContent || '')
            .replace(/\s+/g, ' ')
            .trim()
        : '';

      if (video && (directSrc || (source && source.getAttribute('src')))) {
        var src = directSrc || source.getAttribute('src');
        modalVideo.setAttribute('src', src);
        body.appendChild(modalVideo);
        modalVideo.muted = false;
        modalVideo.setAttribute('controls', '');
        modalVideo.play().catch(function () {});
      } else if (img && img.getAttribute('src')) {
        modalImg.setAttribute('src', img.getAttribute('src'));
        modalImg.setAttribute('alt', img.getAttribute('alt') || '');
        body.appendChild(modalImg);
      } else {
        return;
      }

      if (captionText) {
        var cap = document.createElement('p');
        cap.className = 'home-focus-modal__caption';
        cap.id = 'home-focus-modal-caption';
        cap.textContent = captionText;
        body.appendChild(cap);
        modal.setAttribute('aria-describedby', 'home-focus-modal-caption');
      }

      for (var si = 0; si < slideCount; si++) {
        var s = slides[si];
        var v = s.querySelector('video');
        if (v) v.pause();
      }

      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function centerSlideThenOpenModal(slide) {
      var di = domIndexOfSlide(slide);
      if (di < 0) return;
      var log = domToLogical(di);
      ensureTrailingCycles();
      ensureLeadingCycles();
      var targetDom = logicalToNearestDom(log);

      if (isDomSlideVisuallyCentered(targetDom)) {
        syncUi();
        openModalFromSlide(slide);
        return;
      }

      scrollDomIndexIntoView(targetDom, {});
      afterScrollEnd(function () {
        syncUi();
        openModalFromSlide(slide);
      });
    }

    function bindSlideInteraction(slide) {
      if (boundSlides.has(slide)) return;
      boundSlides.add(slide);
      var media = slide.querySelector('.home-focus__media');
      if (!media) return;
      media.setAttribute('tabindex', '0');
      media.setAttribute('role', 'button');
      media.setAttribute('aria-label', '拡大して表示');

      media.addEventListener('pointerdown', function (e) {
        pointerDown = { x: e.clientX, y: e.clientY };
      });
      media.addEventListener('click', function (e) {
        if (pointerDown) {
          if (Math.abs(e.clientX - pointerDown.x) > 10 || Math.abs(e.clientY - pointerDown.y) > 10) {
            pointerDown = null;
            return;
          }
        }
        pointerDown = null;
        e.preventDefault();
        centerSlideThenOpenModal(slide);
      });
      media.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          centerSlideThenOpenModal(slide);
        }
      });
    }

    for (var si = 0; si < slideCount; si++) {
      bindSlideInteraction(slides[si]);
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        prev();
        resetTimer();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        next();
        resetTimer();
      });
    }

    var scrollTick = false;
    viewport.addEventListener(
      'scroll',
      function () {
        if (jumpLock) return;
        if (!scrollTick) {
          window.requestAnimationFrame(function () {
            updateCurrentClass();
            updateDotsVisuals();
            updateVideos(currentDomIndex());
            scrollTick = false;
          });
          scrollTick = true;
        }
      },
      { passive: true }
    );

    var resizeDone;
    window.addEventListener('resize', function () {
      clearTimeout(resizeDone);
      resizeDone = setTimeout(function () {
        var log = domToLogical(currentDomIndex());
        setLayout();
        window.requestAnimationFrame(function () {
          goToLogicalImmediate(log);
        });
      }, 100);
    });

    root.addEventListener('mouseenter', stopTimer);
    root.addEventListener('mouseleave', resetTimer);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopTimer();
      else resetTimer();
    });

    setLayout();
    buildDots();
    var startDom = Math.floor(REPEAT_INITIAL / 2) * n;
    window.requestAnimationFrame(function () {
      scrollDomIndexIntoView(Math.min(startDom, slideCount - 1), { instant: true });
      window.requestAnimationFrame(function () {
        syncUi();
      });
    });
    resetTimer();
  }

  document.addEventListener('DOMContentLoaded', initHomeFocus);
})();
