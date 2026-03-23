(function () {
  'use strict';

  /**
   * 太平洋中心ライン地図（media/image_0.png, 2048×1024 想定）上のマーカー位置。
   * leftPct / topPct は表示領域に対するパーセント（0–100）。
   */
  var MAP_SRC = 'media/image_0.png';
  var MAP_ALT = '世界地図上の主な本社・仕入れエリア（参考表示）';
  var MAP_INTRINSIC_W = 2048;
  var MAP_INTRINSIC_H = 1024;

  /** @type {ReadonlyArray<PartnerPin>} */
  var PINS = [
    {
      id: 'jp',
      leftPct: 48,
      topPct: 47.3,
      hq: true,
      countryJa: '日本（東京）',
      countryEn: 'Japan (Tokyo)',
      roleEn: 'Headquarters · Sales & overseas coordination',
      detailTitle: '日本（東京）— 本社',
      detailBody:
        '当社の本社所在地です。海外拠点・仕入れ先との調整、国内メーカー・商社への販売、海外進出支援の企画・実行のハブとなっています。\n\n' +
        '関連する取扱商品・サービス例：南洋材合板、LVL、単板、製材品の販売、製造拠点移転・市場開拓・直輸入化などの海外進出支援。'
    },
    {
      id: 'cn',
      leftPct: 40,
      topPct: 45,
      countryJa: '中国',
      countryEn: 'China',
      roleEn: 'Sourcing · panel-grade materials & feedstock',
      detailTitle: '中国 — 仕入れ',
      detailBody:
        '中国を仕入れ先の一つとして、合板向け基材や関連資材の安定調達ルートの開発・維持に取り組んでいます。\n\n' +
        '関連する取扱商品例：南洋材合板・LVL向けの基材、関連木質資材（取引内容は案件により異なります）。'
    },
    {
      id: 'my',
      leftPct: 37.5,
      topPct: 68.1,
      countryJa: 'マレーシア',
      countryEn: 'Malaysia',
      roleEn: 'Sourcing · long-term residency network',
      detailTitle: 'マレーシア — 仕入れ・ネットワーク',
      detailBody:
        '仕入れ先としての取引に加え、代表をはじめとする長期駐在で培った現地のネットワークを、調達・情報収集・海外支援に活かしています。\n\n' +
        '関連する取扱商品例：南洋材合板、単板、製材品などの輸入販売に関わる材種・製品。'
    },
    {
      id: 'id',
      leftPct: 41.2,
      topPct: 70,
      countryJa: 'インドネシア',
      countryEn: 'Indonesia',
      roleEn: 'Primary sourcing · on-site production support',
      detailTitle: 'インドネシア — 仕入れ・現地体制',
      detailBody:
        '主要な仕入れ先の一つです。現地スタッフが在籍しており、生産現場との調整や品質・納期のフォローに加え、製造拠点開発や商品開発など「開発型」の取引を進める上で重要な拠点です。\n\n' +
        '関連する取扱商品例：南洋材合板、LVL、単板、製材品。海外進出支援（拠点移転・市場開拓等）における現地サポート。'
    },
    {
      id: 'ga',
      leftPct: 12,
      topPct: 70.2,
      countryJa: 'ガボン',
      countryEn: 'Gabon',
      roleEn: 'Sourcing · African tropical timber origins',
      detailTitle: 'ガボン — 仕入れ（アフリカ）',
      detailBody:
        'アフリカ西岸のガボンを含む産地から、南洋材の仕入れルートを確保・拡張しています。多様な産地からの調達が、供給の選択肢と安定性に寄与しています。\n\n' +
        '関連する取扱商品例：合板・製材向けの南洋材原木・製品（取引内容は案件により異なります）。'
    }
  ];

  /**
   * @typedef {Object} PartnerPin
   * @property {string} id
   * @property {number} leftPct
   * @property {number} topPct
   * @property {string} countryJa
   * @property {string} countryEn
   * @property {string} roleEn
   * @property {string} detailTitle
   * @property {string} detailBody
   * @property {boolean} [hq]
   */

  var MODAL_Z = 1200;

  /** @type {HTMLElement | null} */
  var sharedModalRoot = null;
  /** @type {HTMLElement | null} */
  var sharedModalTitle = null;
  /** @type {HTMLElement | null} */
  var sharedModalBody = null;
  /** @type {HTMLElement | null} */
  var sharedModalDialog = null;
  /** @type {HTMLButtonElement | null} */
  var sharedModalClose = null;
  /** @type {HTMLButtonElement | null} */
  var lastFocusedPin = null;
  /** @type {HTMLElement | null} */
  var lastFocusBeforeModal = null;

  function ensureModal() {
    if (sharedModalRoot) {
      return {
        root: sharedModalRoot,
        titleEl: sharedModalTitle,
        bodyEl: sharedModalBody,
        dialog: sharedModalDialog,
        closeBtn: sharedModalClose
      };
    }

    var root = document.createElement('div');
    root.className = 'partner-map-modal';
    root.setAttribute('hidden', '');
    root.setAttribute('aria-hidden', 'true');

    var backdrop = document.createElement('div');
    backdrop.className = 'partner-map-modal__backdrop';
    backdrop.tabIndex = -1;

    var panel = document.createElement('div');
    panel.className = 'partner-map-modal__panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');

    var titleId = 'partner-map-modal-title';
    panel.setAttribute('aria-labelledby', titleId);

    var titleEl = document.createElement('h2');
    titleEl.className = 'partner-map-modal__title';
    titleEl.id = titleId;

    var bodyEl = document.createElement('div');
    bodyEl.className = 'partner-map-modal__body';

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'partner-map-modal__close btn btn--primary';
    closeBtn.textContent = '閉じる';

    panel.appendChild(titleEl);
    panel.appendChild(bodyEl);
    panel.appendChild(closeBtn);
    root.appendChild(backdrop);
    root.appendChild(panel);
    document.body.appendChild(root);

    sharedModalRoot = root;
    sharedModalTitle = titleEl;
    sharedModalBody = bodyEl;
    sharedModalDialog = panel;
    sharedModalClose = closeBtn;

    backdrop.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);

    panel.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      closeBtn.focus();
    });

    return {
      root: root,
      titleEl: titleEl,
      bodyEl: bodyEl,
      dialog: panel,
      closeBtn: closeBtn
    };
  }

  function fillModalBody(el, text) {
    el.textContent = '';
    var parts = text.split(/\n\n+/);
    parts.forEach(function (chunk) {
      var p = document.createElement('p');
      var lines = chunk.split('\n');
      lines.forEach(function (line, i) {
        if (i > 0) p.appendChild(document.createElement('br'));
        p.appendChild(document.createTextNode(line));
      });
      el.appendChild(p);
    });
  }

  function setPinsExpanded(mapPins, expandedBtn) {
    mapPins.forEach(function (btn) {
      btn.setAttribute('aria-expanded', btn === expandedBtn ? 'true' : 'false');
    });
  }

  function openModal(pin, pinBtn, mapPins) {
    var m = ensureModal();
    lastFocusBeforeModal = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lastFocusedPin = pinBtn;

    m.titleEl.textContent = pin.detailTitle;
    fillModalBody(m.bodyEl, pin.detailBody);

    m.root.removeAttribute('hidden');
    m.root.setAttribute('aria-hidden', 'false');
    m.root.style.zIndex = String(MODAL_Z);
    document.documentElement.classList.add('partner-map-modal-is-open');
    document.body.style.overflow = 'hidden';

    setPinsExpanded(mapPins, pinBtn);

    m.closeBtn.focus();

    var trap = function (e) {
      if (!sharedModalRoot || sharedModalRoot.hasAttribute('hidden')) return;
      if (sharedModalDialog && !sharedModalDialog.contains(e.target)) {
        e.preventDefault();
        m.closeBtn.focus();
      }
    };
    document.addEventListener('focusin', trap);
    m.root._partnerMapFocusTrap = trap;
  }

  function closeModal() {
    if (!sharedModalRoot || sharedModalRoot.hasAttribute('hidden')) return;

    var trap = sharedModalRoot._partnerMapFocusTrap;
    if (trap) {
      document.removeEventListener('focusin', trap);
      delete sharedModalRoot._partnerMapFocusTrap;
    }

    sharedModalRoot.setAttribute('hidden', '');
    sharedModalRoot.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('partner-map-modal-is-open');
    document.body.style.overflow = '';

    document.querySelectorAll('.partner-map__marker-btn[aria-expanded="true"]').forEach(function (btn) {
      btn.setAttribute('aria-expanded', 'false');
    });

    if (lastFocusedPin && typeof lastFocusedPin.focus === 'function') {
      lastFocusedPin.focus();
    } else if (lastFocusBeforeModal && typeof lastFocusBeforeModal.focus === 'function') {
      lastFocusBeforeModal.focus();
    }
    lastFocusedPin = null;
    lastFocusBeforeModal = null;
  }

  /** マップピン SVG（先端が viewBox 下端中央＝地図座標点） */
  function createPinSvg() {
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'partner-map__pin-svg');
    svg.setAttribute('viewBox', '0 0 24 32');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '32');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var path = document.createElementNS(svgNS, 'path');
    path.setAttribute(
      'd',
      'M12 2C7.03 2 3 6.03 3 11c0 6.2 5.1 11.85 9 16 3.9-4.15 9-9.8 9-16 0-4.97-4.03-9-9-9z'
    );
    path.setAttribute('fill', 'currentColor');
    svg.appendChild(path);
    return svg;
  }

  function initPartnerMap(root) {
    if (root.querySelector('.partner-map__canvas')) return;

    root.setAttribute('role', 'region');

    var stage = document.createElement('div');
    stage.className = 'partner-map__stage';

    var canvas = document.createElement('div');
    canvas.className = 'partner-map__canvas';

    var img = document.createElement('img');
    img.className = 'partner-map__img';
    img.src = MAP_SRC;
    img.alt = MAP_ALT;
    img.width = MAP_INTRINSIC_W;
    img.height = MAP_INTRINSIC_H;
    img.loading = 'lazy';
    img.decoding = 'async';

    var pinsLayer = document.createElement('div');
    pinsLayer.className = 'partner-map__pins-layer';
    pinsLayer.setAttribute('aria-hidden', 'false');

    canvas.appendChild(img);
    canvas.appendChild(pinsLayer);
    stage.appendChild(canvas);

    var mapPins = [];

    PINS.forEach(function (pin) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'partner-map__marker-btn' + (pin.hq ? ' partner-map__marker-btn--hq' : '');
      btn.style.left = pin.leftPct + '%';
      btn.style.top = pin.topPct + '%';
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', pin.countryJa + '。クリックで詳細を表示');
      btn.dataset.pinId = pin.id;

      var pinWrap = document.createElement('span');
      pinWrap.className = 'partner-map__pin-wrap';
      pinWrap.setAttribute('aria-hidden', 'true');
      pinWrap.appendChild(createPinSvg());

      var hoverLabel = document.createElement('span');
      hoverLabel.className = 'partner-map__hover-label';
      hoverLabel.textContent = pin.countryJa;
      hoverLabel.setAttribute('aria-hidden', 'true');

      btn.appendChild(pinWrap);
      btn.appendChild(hoverLabel);

      btn.addEventListener('click', function () {
        openModal(pin, btn, mapPins);
      });

      pinsLayer.appendChild(btn);
      mapPins.push(btn);
    });

    root.appendChild(stage);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      if (sharedModalRoot && !sharedModalRoot.hasAttribute('hidden')) {
        e.preventDefault();
        closeModal();
      }
    }
  }

  function initAll() {
    document.addEventListener('keydown', onKeydown);
    var maps = document.querySelectorAll('[data-partner-map]');
    maps.forEach(function (root) {
      initPartnerMap(root);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
