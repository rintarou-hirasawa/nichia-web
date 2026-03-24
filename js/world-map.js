(function () {
  'use strict';

  /**
   * 太平洋中心ライン地図（media/image_0.png, 2048×1024 想定）上のマーカー位置。
   * leftPct / topPct は表示領域に対するパーセント（0–100）。
   */
  var MAP_SRC = 'media/image_0.png';
  var MAP_ALT = '主要な仕入れエリアの位置';
  var MAP_INTRINSIC_W = 2048;
  var MAP_INTRINSIC_H = 1024;

  /** スマホ用ボタンの国旗（ISO 3166-1 alpha-2 = pin.id）。画像は flagcdn（Wikipedia Commons 由来・無料） */
  var FLAG_CDN = 'https://flagcdn.com';

  /** @type {ReadonlyArray<PartnerPin>} */
  var PINS = [
    {
      id: 'jp',
      leftPct: 48,
      topPct: 49.1,
      hq: true,
      countryJa: '日本（東京）',
      countryEn: 'Japan (Tokyo)',
      roleEn: 'Headquarters · Sales & overseas coordination',
      detailTitle: '日本（東京）— 本社',
      detailBody:
        '東京に本社を置き、国内向けの販売、海外拠点・仕入れ先との調整、海外進出支援の企画・実行の拠点となっています。\n\n' +
        '取扱い：南洋材の合板・LVL・単板・製材の販売、製造拠点移転・市場開拓・直輸入化などの海外進出支援。'
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
        '仕入れ先の一つとして、合板向け基材や関連資材の安定調達ルートの開発・維持に取り組んでいます。\n\n' +
        '取引内容は案件により異なります。'
    },
    {
      id: 'my',
      leftPct: 37.5,
      topPct: 68.1,
      labelTopGap: '-0.14rem',
      countryJa: 'マレーシア',
      countryEn: 'Malaysia',
      roleEn: 'Sourcing · long-term residency network',
      detailTitle: 'マレーシア — 仕入れ・ネットワーク',
      detailBody:
        '仕入れ先としての取引に加え、長期駐在で培った現地ネットワークを、調達・情報収集・海外進出支援に活かしています。\n\n' +
        '南洋材の合板、単板、製材など、輸入販売に関わる材種・製品が対象となります。'
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
        '主要な仕入れ先の一つです。現地スタッフが在籍し、生産現場との調整や品質・納期のフォローに加え、製造拠点開発や商品開発など開発型の取引を進める上で重要な拠点です。\n\n' +
        '南洋材の合板、LVL、単板、製材、および海外進出支援（拠点移転・市場開拓など）における現地サポート。'
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
        'ガボンを含むアフリカ西岸の産地から、南洋材の仕入れルートを確保・拡張しています。多様な産地からの調達が、供給の選択肢と安定性に寄与しています。\n\n' +
        '合板・製材向けの原木・製品など（取引内容は案件により異なります）。'
    }
  ];

  var PIN_BY_ID = {};
  for (var pi = 0; pi < PINS.length; pi++) {
    PIN_BY_ID[PINS[pi].id] = PINS[pi];
  }

  /**
   * スマホ2列グリッドの DOM 順（行優先）。
   * 左列: 日本・中国・ガボン / 右列: マレーシア・インドネシア
   */
  var MOBILE_LIST_ORDER = ['jp', 'my', 'cn', 'id', 'ga'];

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
   * @property {string} [labelTopGap] ピン先端から国名ラベルまでの余白（CSS 長さ、負値でより近く）
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

  function setRegionTogglesExpanded(toggleButtons, expandedBtn) {
    toggleButtons.forEach(function (btn) {
      btn.setAttribute('aria-expanded', btn === expandedBtn ? 'true' : 'false');
    });
  }

  function openModal(pin, focusedBtn, toggleButtons) {
    var m = ensureModal();
    lastFocusBeforeModal = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lastFocusedPin = focusedBtn;

    m.titleEl.textContent = pin.detailTitle;
    fillModalBody(m.bodyEl, pin.detailBody);

    m.root.removeAttribute('hidden');
    m.root.setAttribute('aria-hidden', 'false');
    m.root.style.zIndex = String(MODAL_Z);
    document.documentElement.classList.add('partner-map-modal-is-open');
    document.body.style.overflow = 'hidden';

    setRegionTogglesExpanded(toggleButtons, focusedBtn);

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

    document
      .querySelectorAll('.partner-map__marker-btn[aria-expanded="true"], .partner-map__country-btn[aria-expanded="true"]')
      .forEach(function (btn) {
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
      btn.setAttribute('aria-label', pin.countryJa + '、詳細を開く');
      btn.dataset.pinId = pin.id;
      if (pin.labelTopGap != null) {
        btn.style.setProperty('--pm-pin-label-top-gap', pin.labelTopGap);
      }

      var pinWrap = document.createElement('span');
      pinWrap.className = 'partner-map__pin-wrap';
      pinWrap.setAttribute('aria-hidden', 'true');
      pinWrap.appendChild(createPinSvg());

      var staticLabel = document.createElement('span');
      staticLabel.className = 'partner-map__static-label';
      staticLabel.textContent = pin.countryEn;
      staticLabel.setAttribute('aria-hidden', 'true');

      var hoverLabel = document.createElement('span');
      hoverLabel.className = 'partner-map__hover-label';
      hoverLabel.textContent = pin.countryJa;
      hoverLabel.setAttribute('aria-hidden', 'true');

      btn.appendChild(pinWrap);
      btn.appendChild(staticLabel);
      btn.appendChild(hoverLabel);

      pinsLayer.appendChild(btn);
      mapPins.push(btn);
    });

    var mobileNav = document.createElement('div');
    mobileNav.className = 'partner-map__mobile-list';
    mobileNav.setAttribute('aria-label', '国・地域から詳細を開く');

    var mobileItems = [];

    MOBILE_LIST_ORDER.forEach(function (pinId) {
      var pin = PIN_BY_ID[pinId];
      if (!pin) {
        return;
      }

      var mBtn = document.createElement('button');
      mBtn.type = 'button';
      mBtn.className = 'partner-map__country-btn' + (pin.hq ? ' partner-map__country-btn--hq' : '');
      mBtn.setAttribute('aria-expanded', 'false');
      mBtn.setAttribute('aria-label', pin.countryJa + '、詳細を開く');
      mBtn.dataset.pinId = pin.id;

      var flagWrap = document.createElement('span');
      flagWrap.className = 'partner-map__country-btn__flag';
      flagWrap.setAttribute('aria-hidden', 'true');

      var flagImg = document.createElement('img');
      flagImg.className = 'partner-map__country-btn__flag-img';
      flagImg.src = FLAG_CDN + '/w80/' + pin.id + '.png';
      flagImg.srcset = FLAG_CDN + '/w160/' + pin.id + '.png 2x';
      flagImg.sizes = '40px';
      flagImg.alt = '';
      flagImg.loading = 'lazy';
      flagImg.decoding = 'async';
      flagWrap.appendChild(flagImg);

      var labelEl = document.createElement('span');
      labelEl.className = 'partner-map__country-btn__label';
      labelEl.textContent = pin.countryJa;

      mBtn.appendChild(flagWrap);
      mBtn.appendChild(labelEl);
      mobileNav.appendChild(mBtn);
      mobileItems.push({ pin: pin, btn: mBtn });
    });

    var mobileButtons = mobileItems.map(function (item) {
      return item.btn;
    });

    var allToggleButtons = mapPins.concat(mobileButtons);

    mobileItems.forEach(function (item) {
      item.btn.addEventListener('click', function () {
        openModal(item.pin, item.btn, allToggleButtons);
      });
    });

    mapPins.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        openModal(PINS[i], btn, allToggleButtons);
      });
    });

    root.appendChild(stage);
    root.appendChild(mobileNav);
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
