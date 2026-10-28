(() => {
  const { SCENARIOS, TAGS, LAYOUTS, VENUES, USER_AT, OPEN_HOUR } = window.YS_DATA;
  const I = window.YS_ICONS.icon;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const APP_ICON = '<img src="assets/icon.png" alt="" draggable="false">';

  const CAT = { coffee: '#2C6CF6', cowork: '#2C6CF6', bakery: '#2C6CF6', food: '#2EA84F', restaurant: '#2EA84F', noodles: '#2EA84F', garden: '#2EA84F', bar: '#8B5CF6' };
  const SC_COLORS = {
    nocall: ['#FFF1B8', '#B58500'], near: ['#E1ECFF', '#2C6CF6'], company: ['#E6F7EA', '#1C8C38'], work: ['#F1E8FF', '#7B4FD6'],
  };

  const state = {
    scenario: null,
    guests: 6,
    venue: null,
    slot: 0,
    cardGuests: 2,
    table: null,
    bookings: [],
    notify: {},
    liked: {},
    hoverTip: null,
  };

  // ── Время ────────────────────────────────────────────────
  // Вне рабочего дня прототип «живёт» в 19:20, чтобы демонстрация всегда выглядела одинаково.
  function now() {
    const d = new Date();
    if (d.getHours() >= 10 && d.getHours() < 22) return d;
    const x = new Date(d); x.setHours(19, 20, 0, 0); return x;
  }
  const pad = (n) => String(n).padStart(2, '0');
  const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  function slots() {
    const h = now().getHours();
    const arr = [{ key: 'now', label: 'Сейчас', hour: h, now: true }];
    for (let k = 1; k <= 3 && h + k <= 22; k++) arr.push({ key: String(h + k), label: `${h + k}:00`, hour: h + k });
    return arr;
  }
  function arrival(slot) {
    if (!slot.now) return `${slot.hour}:00`;
    const d = new Date(now().getTime() + 15 * 60000);
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    return hm(d);
  }

  // ── Производные данные заведений ─────────────────────────
  VENUES.forEach((v) => {
    v.walk = Math.round(Math.hypot(v.at[0] - USER_AT[0], v.at[1] - USER_AT[1]) * 1.15) + 1;
    v.tables = LAYOUTS[v.layout].tables.map((t, i) => ({ ...t, n: i + 1 }));
    v.maxSeats = Math.max(...v.tables.map((t) => t.seats));
    v.color = CAT[v.icon];
  });
  const byId = (id) => VENUES.find((v) => v.id === id);

  function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // Статус каждого столика для выбранного времени: free | busy | mine
  function statuses(v, slot) {
    const T = v.tables.length;
    let free;
    if (slot.now) free = v.freeNow;
    else {
      const occ = v.occupancy[Math.min(14, Math.max(0, slot.hour - OPEN_HOUR))];
      free = Math.max(0, Math.round(T * (1 - occ / 100)));
    }
    const R = rng(hash(v.id + ':' + slot.key));
    let order = v.tables.map((t, i) => i).sort(() => R() - 0.5);
    if (slot.now) order = [...order.filter((i) => v.tables[i].keep), ...order.filter((i) => !v.tables[i].keep)];
    const res = v.tables.map(() => 'busy');
    order.slice(0, free).forEach((i) => (res[i] = 'free'));
    state.bookings.filter((b) => b.venue === v.id && b.slot === slot.key).forEach((b) => (res[b.table - 1] = 'mine'));
    return res;
  }
  const nowSlot = () => slots()[0];
  function freeCount(v, minSeats = 1) {
    const st = statuses(v, nowSlot());
    return v.tables.filter((t, i) => st[i] === 'free' && t.seats >= minSeats).length;
  }
  const minSeatsFor = () => (state.scenario === 'company' ? state.guests : 1);
  const myBooking = (v) => state.bookings.find((b) => b.venue === v.id);

  function matches(v, sc) {
    switch (sc) {
      case 'nocall': return v.booking;
      case 'near': return v.walk <= 11;
      case 'company': return v.maxSeats >= state.guests;
      case 'work': return v.tags.includes('wifi') && v.tags.includes('quiet');
      default: return false;
    }
  }
  function visibleVenues() {
    if (!state.scenario) return [];
    const ms = minSeatsFor();
    return VENUES.filter((v) => matches(v, state.scenario)).sort((a, b) => {
      const fa = freeCount(a, ms) > 0 ? 0 : 1, fb = freeCount(b, ms) > 0 ? 0 : 1;
      if (fa !== fb) return fa - fb;
      if (state.scenario === 'near') return a.walk - b.walk;
      if (state.scenario === 'company') return freeCount(b, ms) - freeCount(a, ms) || b.rating - a.rating;
      return b.rating - a.rating;
    });
  }

  const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c; };
  const tablesWord = (n) => `${n} ${plural(n, 'столик', 'столика', 'столиков')}`;
  const guestsWord = (n) => `${n} ${plural(n, 'гость', 'гостя', 'гостей')}`;
  const placesWord = (n) => `${n} ${plural(n, 'место', 'места', 'мест')}`;
  const fmtNum = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // ── Карта, вид и маркеры ─────────────────────────────────
  const svg = $('#map');
  const stage = $('#stage');
  const markersEl = $('#markers');
  const viewport = $('#viewport');
  const map = window.YSMap.render(svg, VENUES);
  const view = { s: 1, tx: 0, ty: 0 };
  const markerEls = {};
  let userEl;

  function region() {
    const left = state.scenario ? 16 + 412 + 16 : 0;
    return { x: left, y: 0, w: innerWidth - left - (state.scenario ? 70 : 0), h: innerHeight };
  }
  function fitScale() {
    const r = region();
    return Math.min(r.w / (map.width - 160), r.h / (map.height - 120)) * 1.12;
  }
  function applyView() {
    stage.style.transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.s})`;
    for (const id in markerEls) {
      const [ax, ay] = map.anchors[id];
      markerEls[id].style.transform = `translate(${view.tx + ax * view.s}px, ${view.ty + ay * view.s}px)`;
    }
    const [ux, uy] = map.P(USER_AT[0], USER_AT[1]);
    userEl.style.transform = `translate(${view.tx + ux * view.s}px, ${view.ty + uy * view.s}px)`;
    layoutLabels();
  }
  // Подписи маркеров не должны наезжать друг на друга: справа → слева → только значок
  function layoutLabels() {
    const order = visibleVenues().map((v) => v.id).filter((id) => id !== state.venue);
    if (state.venue) order.unshift(state.venue);
    const placed = [];
    const hit = (r) => placed.some((q) => r[0] < q[0] + q[2] && r[0] + r[2] > q[0] && r[1] < q[1] + q[3] && r[1] + r[3] > q[1]);
    order.forEach((id) => {
      const m = markerEls[id];
      const [ax, ay] = map.anchors[id];
      const x = view.tx + ax * view.s, y = view.ty + ay * view.s;
      const pin = [x - 24, y - 58, 48, 52];
      const right = [x + 16, y - 56, m._lw || 180, 48];
      const left = [x - 16 - (m._lw || 180), y - 56, m._lw || 180, 48];
      let mode = '';
      if (hit(pin) || hit(right)) mode = !hit(left) && !hit(pin) ? 'left' : 'compact';
      m.classList.toggle('left', mode === 'left');
      m.classList.toggle('compact', mode === 'compact');
      placed.push(pin);
      if (mode === 'left') placed.push(left);
      else if (mode === '') placed.push(right);
    });
  }
  // Поставить точку карты (mx, my) в центр видимой области (со смещением)
  function viewFor(mx, my, s, dy = 0) {
    const r = region();
    return { s, tx: r.x + r.w / 2 - mx * s, ty: r.y + r.h / 2 + dy - my * s };
  }
  function clampView(v) {
    const r = region();
    const [cx, cy] = map.center;
    const sx = v.tx + cx * v.s, sy = v.ty + cy * v.s;
    const lx = map.width * v.s * 0.42, ly = map.height * v.s * 0.4;
    const mx = r.x + r.w / 2, my = r.y + r.h / 2;
    v.tx += Math.min(Math.max(sx, mx - lx), mx + lx) - sx;
    v.ty += Math.min(Math.max(sy, my - ly), my + ly) - sy;
    return v;
  }
  let anim = null;
  function animateTo(target, dur = 700) {
    cancelAnimationFrame(anim);
    const from = { ...view };
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = ease(k);
      view.s = from.s + (target.s - from.s) * e;
      view.tx = from.tx + (target.tx - from.tx) * e;
      view.ty = from.ty + (target.ty - from.ty) * e;
      applyView();
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }
  function homeView() {
    const [cx, cy] = map.center;
    return viewFor(cx, cy - 40, fitScale());
  }
  function focusVenue(v) {
    const [ax, ay] = map.anchors[v.id];
    const s = Math.max(view.s, fitScale() * 1.55);
    animateTo(clampView(viewFor(ax, ay, s, 60)), 800);
  }

  function buildMarkers() {
    userEl = document.createElement('div');
    userEl.className = 'user-dot';
    userEl.innerHTML = '<i></i><span>Вы здесь</span>';
    markersEl.appendChild(userEl);
    // дальние маркеры — первыми, чтобы ближние перекрывали их
    VENUES.slice().sort((a, b) => map.anchors[a.id][1] - map.anchors[b.id][1]).forEach((v) => {
      const m = document.createElement('div');
      m.className = 'marker';
      m.dataset.id = v.id;
      m.innerHTML = `<div class="mk"><div class="pin" style="background:${v.color}">${I(v.icon, 22)}</div><div class="mlabel"></div></div>`;
      const mk = $('.mk', m);
      mk.addEventListener('click', (e) => { e.stopPropagation(); openCard(v.id); });
      mk.addEventListener('mouseenter', () => hoverVenue(v.id, true));
      mk.addEventListener('mouseleave', () => hoverVenue(v.id, false));
      mk.addEventListener('pointerdown', (e) => e.stopPropagation());
      markersEl.appendChild(m);
      markerEls[v.id] = m;
    });
  }

  function markerLine(v) {
    const ms = minSeatsFor();
    const fc = freeCount(v, ms);
    if (myBooking(v)) return { t: 'Ваша бронь', full: false };
    if (fc === 0) return { t: state.scenario === 'company' ? `Столы на ${state.guests} заняты` : 'Мест нет', full: true };
    switch (state.scenario) {
      case 'near': return { t: `${v.walk} мин · свободно ${fc}` };
      case 'company': return { t: `Стол на ${state.guests}+ · свободно ${fc}` };
      case 'work': return { t: `Тихо · Wi-Fi · свободно ${fc}` };
      default: return { t: `Свободно ${tablesWord(fc)}` };
    }
  }

  function updateMarkers() {
    const list = visibleVenues().map((v) => v.id);
    VENUES.forEach((v) => {
      const m = markerEls[v.id];
      const show = list.includes(v.id) || state.venue === v.id;
      const line = markerLine(v);
      $('.mlabel', m).innerHTML = `<b>${v.name}</b><span class="r">${I('star', 13)}</span><span class="r" style="margin-left:1px">${v.rating}</span><div class="s ${line.full ? 'full' : ''}">${line.t}</div>`;
      const pin = $('.pin', m);
      $('.ok', pin)?.remove();
      if (myBooking(v)) pin.insertAdjacentHTML('beforeend', `<span class="ok">${I('check', 12, 'stroke-width="3.4" style="color:#fff"')}</span>`);
      m.classList.toggle('full', !!line.full);
      m._lw = $('.mlabel', m).offsetWidth;
      if (show && !m.classList.contains('show')) {
        m.style.transitionDelay = '0s';
        $('.mk', m).style.transitionDelay = `${0.08 + list.indexOf(v.id) * 0.07}s`;
        requestAnimationFrame(() => m.classList.add('show'));
      } else if (!show) {
        $('.mk', m).style.transitionDelay = '0s';
        m.classList.remove('show');
      }
      m.classList.toggle('sel', state.venue === v.id);
      m.classList.toggle('dim', !!state.venue && state.venue !== v.id);
    });
    map.setHighlight(list, state.venue);
    layoutLabels();
  }

  function hoverVenue(id, on) {
    markerEls[id]?.classList.toggle('hover', on);
    $(`.res-item[data-id="${id}"]`)?.classList.toggle('hover', on);
  }

  // Перетаскивание и масштаб
  (() => {
    let drag = null;
    viewport.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      cancelAnimationFrame(anim);
      drag = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
      viewport.setPointerCapture(e.pointerId);
      viewport.classList.add('dragging');
    });
    viewport.addEventListener('pointermove', (e) => {
      if (!drag) return;
      view.tx = drag.tx + e.clientX - drag.x;
      view.ty = drag.ty + e.clientY - drag.y;
      clampView(view);
      applyView();
    });
    const end = () => { drag = null; viewport.classList.remove('dragging'); };
    viewport.addEventListener('pointerup', end);
    viewport.addEventListener('pointercancel', end);
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12, false);
    }, { passive: false });
  })();
  function zoomAt(x, y, k, animated = true) {
    const fs = fitScale();
    const s = Math.min(fs * 2.8, Math.max(fs * 0.8, view.s * k));
    const t = { s, tx: x - (x - view.tx) * (s / view.s), ty: y - (y - view.ty) * (s / view.s) };
    clampView(t);
    if (animated) animateTo(t, 300);
    else { Object.assign(view, t); applyView(); }
  }
  const regionCenter = () => { const r = region(); return [r.x + r.w / 2, r.y + r.h / 2]; };

  // ── Левая колонка: строка поиска и чипы ──────────────────
  function renderSearch() {
    const sc = SCENARIOS.find((s) => s.id === state.scenario);
    const t = $('#searchText');
    t.textContent = sc ? (sc.id === 'company' ? `${sc.query} на ${guestsWord(state.guests)}` : sc.query) : 'Что хотите сделать?';
    t.classList.toggle('placeholder', !sc);
    const chips = $('#chips');
    chips.innerHTML = '';
    if (!sc) return;
    SCENARIOS.forEach((s) => {
      const b = document.createElement('button');
      b.className = 'chip' + (s.id === state.scenario ? ' active' : '');
      b.innerHTML = `${I(s.icon, 18)}${s.short}${s.id === 'company' ? ` · ${state.guests}` : ''}`;
      b.onclick = () => chooseScenario(s.id);
      chips.appendChild(b);
    });
  }

  function stepperHtml(val, label, min, max) {
    return `<div class="stepper"><button data-d="-1" ${val <= min ? 'disabled' : ''}>${I('minus', 16)}</button><span class="val">${label}</span><button data-d="1" ${val >= max ? 'disabled' : ''}>${I('plus', 16)}</button></div>`;
  }
  function bindStepper(root, get, set, min, max) {
    $$('.stepper button', root).forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      set(Math.min(max, Math.max(min, get() + Number(b.dataset.d))));
    }));
  }

  // ── Список результатов ───────────────────────────────────
  function renderResults() {
    const sc = SCENARIOS.find((s) => s.id === state.scenario);
    const list = visibleVenues();
    const ms = minSeatsFor();
    const [bg, fg] = SC_COLORS[sc.id];
    const el = $('#results');
    el.innerHTML = `
      <div class="res-head">
        <div class="res-title"><span class="sc-ic" style="background:${bg};color:${fg}">${I(sc.icon, 20)}</span>${sc.title}</div>
        <div class="res-sub"><span class="live-dot"></span>Нашлось ${list.length} ${plural(list.length, 'место', 'места', 'мест')} · статусы обновлены только что</div>
        ${sc.id === 'company' ? `<div class="res-guests">Сколько вас будет?${stepperHtml(state.guests, guestsWord(state.guests), 2, 12)}</div>` : ''}
      </div>
      <div class="res-list">${list.length ? '' : `<div class="res-empty">Нет заведений со столами на ${guestsWord(state.guests)}.<br>Попробуйте уменьшить число гостей.</div>`}</div>`;
    const ul = $('.res-list', el);
    list.forEach((v, i) => {
      const fc = freeCount(v, ms);
      const mine = myBooking(v);
      let badge;
      if (mine) badge = `<div class="badge mine">Ваша бронь<small>${mine.time}</small></div>`;
      else if (fc > 0) badge = `<div class="badge free">Свободно ${fc}<small>${sc.id === 'company' ? `на ${state.guests}+ чел.` : plural(fc, 'столик', 'столика', 'столиков')}</small></div>`;
      else badge = `<div class="badge full">Мест нет<small>сейчас</small></div>`;
      let extra = `${I('walk', 14)} ${v.walk} мин · ${v.address}`;
      if (sc.id === 'company') extra = `${I('people', 14)} столы до ${v.maxSeats} гостей · ${v.walk} мин`;
      if (sc.id === 'work') extra = `${I('wifi', 14)} Wi-Fi · ${I('socket', 14)} розетки · ${I('note', 14)} тихо`;
      if (sc.id === 'nocall') extra = `${I('check', 14)} онлайн-бронь · ответ за 1 мин`;
      const it = document.createElement('div');
      it.className = 'res-item';
      it.dataset.id = v.id;
      it.style.animationDelay = `${i * 0.05}s`;
      it.innerHTML = `
        <div class="v-ic" style="background:${v.color}${fc === 0 && !mine ? ';filter:grayscale(.8)' : ''}">${I(v.icon, 22)}</div>
        <div style="min-width:0">
          <div class="res-name">${v.name}<span class="rt">${I('star', 13)}${v.rating}</span></div>
          <div class="res-meta">${v.kind} · ср. чек ${fmtNum(v.check)} ₽</div>
          <div class="res-meta2">${extra}</div>
        </div>${badge}`;
      it.onclick = () => openCard(v.id);
      it.onmouseenter = () => hoverVenue(v.id, true);
      it.onmouseleave = () => hoverVenue(v.id, false);
      ul.appendChild(it);
    });
    if (sc.id === 'company') bindStepper(el, () => state.guests, (g) => { state.guests = g; refreshAll(); }, 2, 12);
  }

  // ── Карточка заведения ───────────────────────────────────
  function openCard(id) {
    const v = byId(id);
    const wasOpen = state.venue === id;
    state.venue = id;
    if (!wasOpen) {
      state.slot = 0;
      state.table = null;
      state.cardGuests = state.scenario === 'company' ? state.guests : state.scenario === 'work' ? 1 : 2;
    }
    if (!state.scenario) chooseScenario('nocall', true);
    renderCard(true);
    $('#panel').classList.add('card-open');
    updateMarkers();
    focusVenue(v);
  }
  function closeCard() {
    state.venue = null;
    state.table = null;
    $('#panel').classList.remove('card-open');
    updateMarkers();
    renderResults();
    animateTo(homeView(), 700);
  }

  function chartHtml(v) {
    const h = now().getHours();
    const st = statuses(v, nowSlot());
    const liveOcc = Math.round((st.filter((s) => s !== 'free').length / v.tables.length) * 100);
    let cols = '', axis = '';
    v.occupancy.forEach((o, i) => {
      const hour = OPEN_HOUR + i;
      const cls = hour < h ? 'past' : hour === h ? 'now' : '';
      const live = hour === h ? `<div class="bar live" style="height:${Math.max(6, liveOcc)}%"></div>` : '';
      cols += `<div class="col ${cls}" title="${hour}:00 — обычно занято ${o}%"><div class="bar" style="height:${Math.max(4, o)}%"></div>${live}</div>`;
      axis += `<span>${i % 3 === 0 ? hour : ''}</span>`;
    });
    const usual = v.occupancy[Math.min(14, Math.max(0, h - OPEN_HOUR))];
    const cmp = liveOcc > usual + 8 ? 'больше, чем обычно' : liveOcc < usual - 8 ? 'меньше, чем обычно' : 'как обычно в это время';
    return `<div class="chart">${cols}</div><div class="chart-axis">${axis}</div>
      <div class="chart-note">Сейчас занято <b>${liveOcc}%</b> столиков — ${cmp}. Пунктир — фактическая загрузка по данным заведения, столбцы — прогноз по истории посещений.</div>`;
  }

  function tableGeom(t) {
    if (t.shape === 'round') {
      const d = t.seats <= 2 ? 8.5 : 10.5;
      return { round: true, cx: t.x + d / 2, cy: t.y + d / 2, r: d / 2 };
    }
    const w = t.w || (t.seats <= 1 ? 8 : t.seats <= 2 ? 9 : t.seats <= 4 ? 12 : t.seats * 2.9);
    const h = t.seats <= 2 ? 6.5 : 8;
    return { round: false, x: t.x, y: t.y, w, h, cx: t.x + w / 2, cy: t.y + h / 2 };
  }

  function planSvg(v, st) {
    const L = LAYOUTS[v.layout].walls;
    let s = `<svg viewBox="-3 -4 106 70" xmlns="http://www.w3.org/2000/svg">`;
    s += L.garden
      ? `<rect x="0" y="0" width="100" height="62" rx="3" fill="#EAF4E2" stroke="#A9CF96" stroke-width=".6" stroke-dasharray="2 1.4"/>`
      : `<rect x="0" y="0" width="100" height="62" rx="2.5" fill="#FFFFFF" stroke="#CFC8BC" stroke-width=".9"/>`;
    if (L.windows === 'top') for (let i = 0; i < 6; i++) s += `<rect x="${5 + i * 16}" y="-.7" width="10" height="1.4" rx=".5" fill="#9ED0F5"/>`;
    if (L.garden) [[2, 2], [97, 59], [2, 59], [97, 22]].forEach(([x, y]) => (s += `<circle cx="${x}" cy="${y}" r="2.6" fill="#8CCB6A"/><circle cx="${x - .6}" cy="${y - .6}" r="1.4" fill="#A6DA83"/>`));
    else [[2.5, 59.5], [97.5, 2.5]].forEach(([x, y]) => (s += `<circle cx="${x}" cy="${y}" r="1.8" fill="#8CCB6A"/>`));
    const b = L.bar;
    s += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="1.5" fill="#EEE8DE" stroke="#DDD4C6" stroke-width=".5"/>`;
    s += `<text x="${b.x + b.w / 2}" y="${b.y + b.h / 2 + 1.1}" text-anchor="middle" font-size="3.2" fill="#A39A8C" font-weight="600">${b.label}</text>`;
    const ex = L.entrance === 'bottom-right' ? 80 : 4;
    s += `<rect x="${ex}" y="61" width="12" height="2" fill="#F7F5F1"/><text x="${ex + 6}" y="66.6" text-anchor="middle" font-size="3" fill="#A39A8C">вход ↑</text>`;

    v.tables.forEach((t, i) => {
      const g = tableGeom(t);
      const status = st[i];
      const tooSmall = status === 'free' && t.seats < state.cardGuests;
      const sel = state.table === t.n && status === 'free';
      const cls = status === 'mine' ? 'mine' : status === 'busy' ? 'busy' : sel ? 'sel' : tooSmall ? 'small' : !v.booking ? 'free ro' : 'free';
      const C = {
        free: ['#FFFFFF', '#2DB84D', '#2DB84D', '#1C8C38'],
        sel: ['#FFDB4D', '#E0A800', '#E0A800', '#21201F'],
        busy: ['#ECEAE6', '#D6D2CB', '#D6D2CB', '#A3A19D'],
        small: ['#FFFFFF', '#BFE6C8', '#CFEBD6', '#9CCFA9'],
        mine: ['#2C6CF6', '#1F55D0', '#2C6CF6', '#FFFFFF'],
      }[cls.split(' ')[0]];
      let chairs = '';
      if (g.round) {
        for (let k = 0; k < t.seats; k++) {
          const a = -Math.PI / 2 + (k / t.seats) * Math.PI * 2 ;
          chairs += `<circle cx="${(g.cx + Math.cos(a) * (g.r + 2)).toFixed(2)}" cy="${(g.cy + Math.sin(a) * (g.r + 2)).toFixed(2)}" r="1.55" fill="${C[2]}"/>`;
        }
      } else {
        const top = t.seats === 1 ? 0 : Math.ceil(t.seats / 2), bot = t.seats - top;
        const row = (n, y) => { for (let k = 0; k < n; k++) chairs += `<rect x="${(g.x + (g.w / n) * (k + 0.5) - 1.6).toFixed(2)}" y="${y}" width="3.2" height="2.2" rx="1" fill="${C[2]}"/>`; };
        row(top, g.y - 3);
        row(bot, g.y + g.h + 0.8);
      }
      const shape = g.round
        ? `<circle class="top" cx="${g.cx}" cy="${g.cy}" r="${g.r}" fill="${C[0]}" stroke="${C[1]}" stroke-width=".7" ${tooSmall ? 'stroke-dasharray="1.2 .8"' : ''}/>`
        : `<rect class="top" x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="1.6" fill="${C[0]}" stroke="${C[1]}" stroke-width=".7" ${tooSmall ? 'stroke-dasharray="1.2 .8"' : ''}/>`;
      const label = status === 'mine' ? '✓' : t.n;
      s += `<g class="tbl ${cls}" data-n="${t.n}">${status === 'busy' ? '' : ''}${chairs}${shape}<text x="${g.cx}" y="${g.cy + 1.15}" text-anchor="middle" font-size="3.3" font-weight="700" fill="${C[3]}">${label}</text></g>`;
    });
    return s + '</svg>';
  }

  function tagsHtml(v) {
    const want = { work: ['wifi', 'sockets', 'quiet', 'laptop'], company: ['bigtables', 'banquet', 'kids'], near: ['fast', 'lunch'], nocall: ['deposit'] }[state.scenario] || [];
    return v.tags.map((k) => `<div class="tag ${want.includes(k) ? 'match' : ''}">${I(TAGS[k].icon, 18)}${TAGS[k].label}</div>`).join('');
  }

  function altsHtml(v) {
    const alts = VENUES.filter((x) => x.id !== v.id && freeCount(x, state.cardGuests) > 0)
      .sort((a, b) => Math.hypot(a.at[0] - v.at[0], a.at[1] - v.at[1]) - Math.hypot(b.at[0] - v.at[0], b.at[1] - v.at[1]))
      .slice(0, 3);
    return alts.map((a) => {
      const d = Math.round(Math.hypot(a.at[0] - v.at[0], a.at[1] - v.at[1]) * 1.15) + 1;
      return `<div class="alt" data-id="${a.id}"><div class="v-ic" style="background:${a.color}">${I(a.icon, 18)}</div>
        <div><div class="n">${a.name}</div><div class="m">${a.kind} · ${d} мин отсюда · ★ ${a.rating}</div></div>
        <div class="badge free">Свободно ${freeCount(a, state.cardGuests)}</div></div>`;
    }).join('');
  }

  function renderCard(resetScroll = false) {
    const v = byId(state.venue);
    if (!v) return;
    const card = $('#card');
    const prevScroll = $('.card-scroll', card)?.scrollTop || 0;
    const sl = slots();
    if (state.slot >= sl.length) state.slot = 0;
    const slot = sl[state.slot];
    const st = statuses(v, slot);
    const stNow = statuses(v, nowSlot());
    const freeNowAll = stNow.filter((s) => s === 'free').length;
    const freeHere = v.tables.filter((t, i) => st[i] === 'free' && t.seats >= state.cardGuests).length;
    const mine = myBooking(v);
    const isFull = freeNowAll === 0;
    const selT = v.tables.find((t) => t.n === state.table);

    const liveBox = isFull
      ? `<div class="live-box full"><div class="live-ring">${I('clock', 20)}</div><div><div class="big">Сейчас все столики заняты</div>
          <div class="sub">${I('check', 13)} Подтверждено заведением · ${v.updated} мин назад</div></div></div>`
      : `<div class="live-box"><div class="live-ring">${I('check', 20, 'stroke-width="2.6"')}</div><div><div class="big">Свободно ${freeNowAll} из ${tablesWord(v.tables.length)}</div>
          <div class="sub">${I('check', 13)} Подтверждено заведением · обновлено ${v.updated} мин назад</div></div></div>`;

    const banner = mine
      ? `<div class="booked-banner">${I('check', 18, 'stroke-width="2.6"')}<div><b>Ваша бронь: столик №${mine.table}</b><br>Сегодня в ${mine.time} · код ${mine.code}</div><span class="lnk" id="cancelBooking">Отменить</span></div>`
      : '';

    const canBook = v.booking;
    const planTitle = canBook ? 'Выберите столик' : 'Схема зала';
    const planCtl = `<div class="plan-ctl">
        <div class="seg" id="slotSeg">${sl.map((x, i) => `<button class="${i === state.slot ? 'on' : ''}" data-i="${i}">${x.label}</button>`).join('')}</div>
        <div id="guestStep">${stepperHtml(state.cardGuests, guestsWord(state.cardGuests), 1, 12)}</div>
      </div>`;
    const legend = `<div class="legend">
        <span><i style="background:#fff;border:1.5px solid #2DB84D"></i>Свободно</span>
        <span><i style="background:#ECEAE6"></i>Занято</span>
        ${canBook ? '<span><i style="background:#FFDB4D"></i>Выбрано</span>' : ''}
        <span><i style="background:#fff;border:1.5px dashed #BFE6C8"></i>Мало мест</span>
        ${mine ? '<span><i style="background:#2C6CF6"></i>Ваша бронь</span>' : ''}
      </div>`;
    const tip = state.hoverTip || (canBook
      ? (freeHere ? `Нажмите на <b>зелёный</b> столик, чтобы забронировать его` : `На ${slot.now ? 'это время' : slot.label} нет свободных столов на ${guestsWord(state.cardGuests)}`)
      : 'Свободные столики видны в реальном времени');

    let foot;
    if (canBook && selT) {
      foot = `<div class="foot-sum"><span><b>Столик №${selT.n}</b> · ${selT.zone} · ${placesWord(selT.seats)}</span><span>${slot.now ? `к ${arrival(slot)}` : `в ${slot.label}`}</span></div>
        <button class="btn btn-primary" id="bookBtn">Забронировать</button>`;
    } else if (canBook && freeHere === 0 && slot.now) {
      foot = state.notify[v.id]
        ? `<button class="btn btn-secondary" disabled>${I('bell', 20)}Уведомление включено — ждём свободный столик</button>`
        : `<button class="btn btn-primary" id="notifyBtn">${I('bell', 20)}Сообщить, когда освободится · 49 ₽</button>`;
    } else if (canBook) {
      foot = `<button class="btn" disabled>Выберите свободный столик на схеме</button>`;
    } else {
      foot = `<div class="foot-sum"><span>Заведение не принимает онлайн-брони</span><span>${v.walk} мин пешком</span></div>
        <button class="btn btn-primary" id="routeBtn">${I('route', 20)}Построить маршрут</button>`;
    }

    card.innerHTML = `
      <div class="card-scroll">
        <div class="card-hero" style="background:linear-gradient(135deg, ${v.header[0]}, ${v.header[1]})">
          <div class="art3"></div><div class="art2"></div><div class="art">${I(v.icon, 64, 'stroke-width="1.5"')}</div>
          <div class="hero-btns">
            <button class="icon-btn" id="cardBack" title="К списку">${I('back', 20)}</button>
            <div class="grp">
              <button class="icon-btn ${state.liked[v.id] ? 'liked' : ''}" id="likeBtn" title="В избранное">${I('heart', 19)}</button>
              <button class="icon-btn" id="shareBtn" title="Поделиться">${I('share', 19)}</button>
              <button class="icon-btn" id="cardClose" title="Закрыть">${I('close', 19)}</button>
            </div>
          </div>
        </div>
        <div class="card-body">
          <h2>${v.name}</h2>
          <div class="c-meta">${v.kind} · средний чек ${fmtNum(v.check)} ₽</div>
          <div class="c-meta2"><span class="st">${I('star', 15)}${v.rating}</span><span>${fmtNum(v.reviews)} оценок</span><span class="dot"></span>${I('walk', 15)}<span>${v.walk} мин</span><span class="dot"></span><span>${v.address}</span></div>
          ${banner}
          ${liveBox}
          <div class="desc">${v.desc}</div>
          <div class="sec"><h3>Чем удобно</h3><div class="tags">${tagsHtml(v)}</div></div>
          <div class="sec"><h3>Загруженность по часам <small>сегодня</small></h3>${chartHtml(v)}</div>
          <div class="sec"><h3>${planTitle} <small>${slot.now ? 'статус онлайн' : 'прогноз'}</small></h3>
            ${planCtl}
            <div class="plan" id="plan">${planSvg(v, st)}</div>
            ${legend}
            <div class="plan-tip" id="planTip">${tip}</div>
            ${!canBook ? `<div class="plan-note">Онлайн-бронь здесь недоступна, но статус столиков обновляется в реальном времени — вы точно не придёте зря.</div>` : ''}
          </div>
          ${isFull ? `<div class="sec"><h3>Свободно рядом</h3><div class="alts">${altsHtml(v)}</div></div>` : ''}
        </div>
      </div>
      <div class="card-foot">${foot}</div>`;

    const sc = $('.card-scroll', card);
    sc.scrollTop = resetScroll ? 0 : prevScroll;

    $('#cardBack').onclick = closeCard;
    $('#cardClose').onclick = closeCard;
    $('#likeBtn').onclick = () => { state.liked[v.id] = !state.liked[v.id]; renderCard(); toast(state.liked[v.id] ? 'Добавлено в избранное' : 'Убрано из избранного'); };
    $('#shareBtn').onclick = () => toast('Ссылка на место скопирована');
    $$('#slotSeg button').forEach((b) => (b.onclick = () => { state.slot = Number(b.dataset.i); state.table = null; renderCard(); }));
    bindStepper($('#guestStep'), () => state.cardGuests, (g) => {
      state.cardGuests = g;
      const t = v.tables.find((x) => x.n === state.table);
      if (t && t.seats < g) state.table = null;
      renderCard();
    }, 1, 12);
    $$('.alt', card).forEach((a) => (a.onclick = () => openCard(a.dataset.id)));
    $('#cancelBooking') && ($('#cancelBooking').onclick = () => {
      state.bookings = state.bookings.filter((b) => b !== mine);
      refreshAll();
      toast('Бронь отменена — столик снова свободен');
    });
    $('#bookBtn') && ($('#bookBtn').onclick = () => openConfirm(v, selT, slot));
    $('#notifyBtn') && ($('#notifyBtn').onclick = () => openNotify(v));
    $('#routeBtn') && ($('#routeBtn').onclick = () => toast(`Маршрут построен: ${v.walk} мин пешком до «${v.name}»`));

    $$('#plan .tbl').forEach((g) => {
      const t = v.tables.find((x) => x.n === Number(g.dataset.n));
      const i = t.n - 1;
      const status = st[i];
      const what = status === 'mine' ? 'ваша бронь' : status === 'busy' ? 'занят' : t.seats < state.cardGuests ? `мало мест для ${guestsWord(state.cardGuests)}` : 'свободен';
      g.addEventListener('mouseenter', () => { $('#planTip').innerHTML = `<b>Столик №${t.n}</b> · ${t.zone} · ${placesWord(t.seats)} — ${what}`; });
      g.addEventListener('mouseleave', () => { $('#planTip').innerHTML = tip; });
      g.addEventListener('click', () => {
        if (!v.booking || status !== 'free') return;
        if (t.seats < state.cardGuests) { toast(`Столик №${t.n} рассчитан на ${placesWord(t.seats)} — увеличьте стол или уменьшите число гостей`); return; }
        state.table = state.table === t.n ? null : t.n;
        renderCard();
        $(`#plan .tbl[data-n="${t.n}"]`)?.classList.add('pop');
      });
    });
  }

  // ── Модальные окна ───────────────────────────────────────
  const modal = $('#modal');
  function openModal(html, onBind) {
    modal.innerHTML = `<div class="modal-card">${html}</div>`;
    modal.classList.add('open');
    onBind?.($('.modal-card', modal));
  }
  function closeModal() { modal.classList.remove('open'); }
  modal.addEventListener('pointerdown', (e) => { if (e.target === modal) closeModal(); });

  function venueRow(v, sub) {
    return `<div class="m-venue"><div class="v-ic" style="background:${v.color}">${I(v.icon, 20)}</div><div><div class="n">${v.name}</div><div class="m">${sub}</div></div></div>`;
  }

  function openConfirm(v, t, slot) {
    const time = arrival(slot);
    openModal(`
      <h2>Подтвердите бронирование</h2>
      ${venueRow(v, `${v.kind} · ${v.address}`)}
      <div class="m-rows">
        <div class="m-row"><span>Когда</span><span>Сегодня, ${time}</span></div>
        <div class="m-row"><span>Столик</span><span>№${t.n} · ${t.zone}</span></div>
        <div class="m-row"><span>Гостей</span><span>${state.cardGuests} из ${t.seats} мест</span></div>
        <div class="m-row"><span>Стоимость брони</span><span style="color:var(--green-text)">Бесплатно</span></div>
      </div>
      <input class="m-input" placeholder="Комментарий для заведения, например: нужен детский стул">
      <div class="m-hint">${I('check', 16, 'stroke-width="2.6"')}<span>Контакты подставлены из Яндекс ID — звонить не нужно. ${slot.now ? 'Столик держим 15 минут после указанного времени.' : 'Напомним о брони за 30 минут.'}</span></div>
      <div class="m-btns"><button class="btn btn-secondary" id="mCancel">Отмена</button><button class="btn btn-primary" id="mOk">Подтвердить бронь</button></div>`,
    (root) => {
      $('#mCancel', root).onclick = closeModal;
      $('#mOk', root).onclick = (e) => {
        const b = e.currentTarget;
        b.disabled = true;
        b.innerHTML = '<span class="spin"></span>Отправляем в заведение…';
        setTimeout(() => {
          const booking = { venue: v.id, table: t.n, slot: slot.key, time, guests: state.cardGuests, code: 'YS-' + (1000 + Math.floor(Math.random() * 9000)) };
          state.bookings.push(booking);
          state.table = null;
          refreshAll();
          openSuccess(v, t, booking);
        }, 1100);
      };
    });
  }

  function openSuccess(v, t, b) {
    const colors = ['#FFDB4D', '#2DB84D', '#2C6CF6', '#FC3F1D', '#8B5CF6'];
    let conf = '';
    for (let i = 0; i < 36; i++) conf += `<i style="left:${Math.random() * 100}%;background:${colors[i % 5]};animation-delay:${Math.random() * 0.5}s;animation-duration:${1.2 + Math.random()}s"></i>`;
    openModal(`
      <div class="confetti">${conf}</div>
      <div class="success">
        <svg class="check-wrap" viewBox="0 0 96 96"><circle cx="48" cy="48" r="46"/><path d="M28 50l13 13 27-29"/></svg>
        <h2>Забронировано!</h2>
        <div class="m-sub">«${v.name}» ждёт вас сегодня в <b>${b.time}</b>.<br>Столик №${t.n} ${t.zone}, ${guestsWord(b.guests)}.</div>
        <div class="code">Код брони <b>${b.code}</b></div>
        <div class="m-hint">${I('check', 16, 'stroke-width="2.6"')}<span>Заведение подтвердило бронь. Напоминание придёт в приложение Яндекс Go и на почту.</span></div>
        <div class="m-btns"><button class="btn btn-secondary" id="sRoute">${I('route', 19)}Маршрут</button><button class="btn btn-primary" id="sDone">Готово</button></div>
      </div>`,
    (root) => {
      root.style.position = 'relative';
      $('#sDone', root).onclick = closeModal;
      $('#sRoute', root).onclick = () => { closeModal(); toast(`Маршрут построен: ${v.walk} мин пешком`); };
    });
  }

  function openNotify(v) {
    let win = 0;
    openModal(`
      <h2>Сообщим, когда освободится столик</h2>
      <div class="m-sub">Пришлём push, как только в «${v.name}» появится стол на ${guestsWord(state.cardGuests)}. Бронь — в одно касание прямо из уведомления.</div>
      <div class="seg wide" id="nWin"><button class="on">В ближайший час</button><button>До 22:00</button><button>Весь вечер</button></div>
      <div class="m-price"><div><div class="p">49 ₽</div><div class="d">разовое уведомление</div></div>${I('bell', 30)}</div>
      <div class="m-plus"><span class="plus-badge">+</span><span>С подпиской <b>Яндекс Плюс</b> — уведомления без оплаты</span></div>
      <div class="m-btns"><button class="btn btn-secondary" id="nCancel">Отмена</button><button class="btn btn-primary" id="nOk">Оплатить 49 ₽</button></div>`,
    (root) => {
      $$('#nWin button', root).forEach((b, i) => (b.onclick = () => { win = i; $$('#nWin button', root).forEach((x, j) => x.classList.toggle('on', j === i)); }));
      $('#nCancel', root).onclick = closeModal;
      $('#nOk', root).onclick = (e) => {
        const b = e.currentTarget;
        b.disabled = true;
        b.innerHTML = '<span class="spin"></span>Оплата…';
        setTimeout(() => {
          closeModal();
          state.notify[v.id] = true;
          renderCard();
          toast('Уведомление включено — пришлём push, как только место освободится');
          // Демонстрация: через несколько секунд в заведении освобождается столик
          setTimeout(() => freeUp(v), 7000);
        }, 900);
      };
    });
  }

  function freeUp(v) {
    v.freeNow = Math.max(v.freeNow, 1);
    state.notify[v.id] = false;
    refreshAll();
    const t = v.tables.find((x) => x.keep) || v.tables[0];
    const card = document.createElement('div');
    card.className = 'push-card';
    card.innerHTML = `
      <div class="push-head"><span class="app-icon">${APP_ICON}</span>Яндекс Спейс · сейчас</div>
      <div class="push-title">Освободился столик в «${v.name}»</div>
      <div class="push-text">Столик №${t.n} ${t.zone} на ${placesWord(t.seats)}. Успейте забронировать — мы придержим его для вас 3 минуты.</div>
      <div class="push-btns"><button class="btn btn-secondary">Позже</button><button class="btn btn-primary">Забронировать</button></div>`;
    $('#push').appendChild(card);
    const [later, go] = $$('button', card);
    later.onclick = () => card.remove();
    go.onclick = () => {
      card.remove();
      state.venue = null;
      openCard(v.id);
      state.slot = 0;
      state.table = t.n;
      renderCard();
    };
    setTimeout(() => card.remove(), 20000);
  }

  // ── Тост ─────────────────────────────────────────────────
  let toastTimer;
  function toast(text) {
    const t = $('#toast');
    t.innerHTML = `${I('check', 18, 'stroke-width="2.6"')}<span>${text}</span>`;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  // ── Мои брони ────────────────────────────────────────────
  function renderBookingsPill() {
    const p = $('#myBookings');
    p.hidden = state.bookings.length === 0;
    p.innerHTML = `${I('check', 18, 'stroke-width="2.6"')}Мои брони <span class="cnt">${state.bookings.length}</span>`;
  }
  $('#myBookings').onclick = () => {
    const b = state.bookings[state.bookings.length - 1];
    if (b) openCard(b.venue);
  };

  function refreshAll() {
    renderSearch();
    renderResults();
    updateMarkers();
    if (state.venue) renderCard();
    renderBookingsPill();
  }

  // ── Выбор цели ───────────────────────────────────────────
  const picker = $('#picker');
  function renderPicker() {
    $('#pickerCount').textContent = VENUES.length;
    const tiles = $('#tiles');
    tiles.innerHTML = '';
    SCENARIOS.forEach((s, i) => {
      const [bg, fg] = SC_COLORS[s.id];
      const t = document.createElement('div');
      t.className = 'tile';
      t.tabIndex = 0;
      t.style.animationDelay = `${0.1 + i * 0.06}s`;
      t.innerHTML = `<span class="num">${i + 1}</span>
        <div class="t-ic" style="background:${bg};color:${fg}">${I(s.icon, 26)}</div>
        <div class="t-title">${s.title}</div>
        <div class="t-hint">${s.hint}</div>
        ${s.id === 'company' ? '<div class="t-guests"></div>' : ''}`;
      t.onclick = () => chooseScenario(s.id);
      t.onkeydown = (e) => { if (e.key === 'Enter') chooseScenario(s.id); };
      if (s.id === 'company') {
        const renderGuests = () => {
          $('.t-guests', t).innerHTML = `Количество гостей ${stepperHtml(state.guests, guestsWord(state.guests), 2, 12)}`;
          bindStepper(t, () => state.guests, (g) => { state.guests = g; renderGuests(); }, 2, 12);
        };
        renderGuests();
      }
      tiles.appendChild(t);
    });
    $('#pickerClose').hidden = !state.scenario;
  }
  function openPicker() { renderPicker(); picker.classList.add('open'); }
  function closePicker() { picker.classList.remove('open'); }
  $('#pickerClose').onclick = closePicker;
  picker.addEventListener('pointerdown', (e) => { if (e.target === picker && state.scenario) closePicker(); });
  $('#searchbar').onclick = openPicker;
  $('#searchbar').onkeydown = (e) => { if (e.key === 'Enter') openPicker(); };

  function chooseScenario(id, silent = false) {
    const first = !state.scenario;
    state.scenario = id;
    closePicker();
    $('#panel').classList.remove('hidden');
    if (state.venue && !silent) closeCard();
    refreshAll();
    if (first || !silent) animateTo(homeView(), first ? 900 : 600);
  }

  // ── Горячие клавиши ──────────────────────────────────────
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modal.classList.contains('open')) closeModal();
      else if (picker.classList.contains('open') && state.scenario) closePicker();
      else if (state.venue) closeCard();
    }
    if (!picker.classList.contains('open') || e.target.tagName === 'INPUT') return;
    const n = Number(e.key);
    if (n >= 1 && n <= 4) chooseScenario(SCENARIOS[n - 1].id);
  });

  // ── Управление картой ────────────────────────────────────
  $('#zoomIn').innerHTML = I('plus', 26);
  $('#zoomOut').innerHTML = I('minus', 26);
  $('#locate').innerHTML = I('locate', 24, 'style="color:#2C6CF6"');
  $('#zoomIn').onclick = () => zoomAt(...regionCenter(), 1.3);
  $('#zoomOut').onclick = () => zoomAt(...regionCenter(), 1 / 1.3);
  $('#locate').onclick = () => {
    const [ux, uy] = map.P(USER_AT[0], USER_AT[1]);
    animateTo(clampView(viewFor(ux, uy, Math.max(view.s, fitScale() * 1.4))), 700);
  };
  addEventListener('resize', () => { Object.assign(view, clampView(homeView())); applyView(); });

  // ── Старт ────────────────────────────────────────────────
  $$('.app-icon, .brand-dot').forEach((e) => (e.innerHTML = APP_ICON));
  $('.search-ic').innerHTML = I('search', 22);
  $('.search-mic').innerHTML = I('mic', 22);
  $('#pickerClose').innerHTML = I('close', 20);
  function tickClock() { $('#clock').textContent = `Сейчас ${hm(now())} · статусы онлайн`; }
  tickClock();
  setInterval(tickClock, 15000);

  buildMarkers();
  renderSearch();
  const home = homeView();
  const [cx, cy] = map.center;
  Object.assign(view, viewFor(cx, cy - 40, home.s * 0.78));
  applyView();
  // Интро-ролик (intro/), по окончании или по «Пропустить» открываем карту
  const splash = $('#splash');
  const intro = $('#intro');
  let started = false;
  function startApp() {
    if (started) return;
    started = true;
    intro.pause();
    splash.classList.add('gone');
    $('#app').classList.remove('booting');
    animateTo(home, 1400);
    setTimeout(openPicker, 900);
  }
  function withoutIntro() {
    if (started || splash.classList.contains('intro-off')) return;
    splash.classList.add('intro-off');
    setTimeout(startApp, 1500);
  }
  intro.addEventListener('ended', startApp);
  intro.addEventListener('error', withoutIntro);
  $('#introSkip').onclick = startApp;
  addEventListener('keydown', (e) => {
    if (!started && ['Escape', 'Enter', ' '].includes(e.key)) { e.preventDefault(); startApp(); }
  });
  // без жеста пользователя браузер может запретить звук — тогда играем без него
  intro.play().catch(() => { intro.muted = true; intro.play().catch(withoutIntro); });
  setTimeout(startApp, 15000); // страховка, если видео зависло

  // Для автоматических скриншотов
  window.__ys = { state, chooseScenario, openCard, closeCard, openPicker, refreshAll };
})();
