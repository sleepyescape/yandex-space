/* Изометрическая «диорама» центра города в стиле Яндекс Карт.
   Всё рисуется в SVG по сетке 24×24: x — вправо-вниз, y — влево-вниз. */
window.YSMap = (() => {
  const N = 24, HW = 40, HH = 20;
  const PADX = 110, PADT = 160, SLAB = 34, PADB = 120;
  const W = 2 * N * HW + 2 * PADX;
  const H = PADT + 2 * N * HH + SLAB + PADB;
  const OX = PADX + N * HW, OY = PADT;

  const P = (x, y, z = 0) => [OX + (x - y) * HW, OY + (x + y) * HH - z];
  const f = (v) => Math.round(v * 10) / 10;
  const pts = (arr) => arr.map((p) => `${f(p[0])},${f(p[1])}`).join(' ');
  const quad = (x0, y0, x1, y1, z = 0) => pts([P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)]);
  const dPoly = (arr) => 'M' + arr.map((p) => `${f(p[0])} ${f(p[1])}`).join('L') + 'Z';

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── Планировка ───────────────────────────────────────────────
  // [x0, y0, x1, y1, тип]  s — улица, a — проспект
  const ROADS = [
    [0, 5, 24, 6, 's'], [0, 19, 14, 20, 's'],
    [5, 0, 6, 24, 's'], [20, 0, 21, 12, 's'],
    [0, 12, 24, 13.2, 'a'], [14, 0, 15.2, 24, 'a'],
  ];
  const CANAL = [9, 0, 10.2, 24];
  const SQUARE = [10.2, 6, 14, 12];
  const PARK = [15.2, 13.2, 24, 24];
  const LAKE = { cx: 19.9, cy: 18.9, r: 3.35 };
  const BLOCKS = [
    [0, 0, 5, 5], [6, 0, 9, 5], [10.2, 0, 14, 5], [15.2, 0, 20, 5], [21, 0, 24, 5],
    [0, 6, 5, 12], [6, 6, 9, 12], [15.2, 6, 20, 12], [21, 6, 24, 12],
    [0, 13.2, 5, 19], [6, 13.2, 9, 19], [10.2, 13.2, 14, 19],
    [0, 20, 5, 24], [6, 20, 9, 24], [10.2, 20, 14, 24],
  ];
  const LABELS = [
    { t: 'ул. Профсоюзная', x: 2.6, y: 5.5, dir: 'x' },
    { t: 'ул. Татарстан', x: 19.6, y: 12.6, dir: 'x' },
    { t: 'ул. Габдуллы Тукая', x: 2.4, y: 19.5, dir: 'x' },
    { t: 'ул. Баумана', x: 5.5, y: 2.6, dir: 'y' },
    { t: 'ул. Пушкина', x: 14.6, y: 18.6, dir: 'y' },
    { t: 'ул. Петербургская', x: 20.5, y: 8.4, dir: 'y' },
    { t: 'канал Булак', x: 9.6, y: 16.2, dir: 'y', cls: 'water' },
    { t: 'оз. Кабан', x: LAKE.cx, y: LAKE.cy, dir: 'flat', cls: 'water big' },
    { t: 'Сквер на Булаке', x: 12.1, y: 6.9, dir: 'flat', cls: 'park' },
    { t: 'Парк у озера', x: 23.0, y: 14.4, dir: 'flat', cls: 'park' },
  ];
  const CARS = [
    [3.2, 12.35, 'x', 'taxi'], [8.0, 12.85, 'x', 'white'], [17.5, 12.35, 'x', 'taxi'],
    [22.0, 12.85, 'x', 'blue'], [14.35, 3.0, 'y', 'red'], [14.85, 8.4, 'y', 'taxi'],
    [14.35, 16.5, 'y', 'white'], [14.85, 22.0, 'y', 'taxi'], [2.0, 5.5, 'x', 'white'],
    [5.5, 16.0, 'y', 'taxi'], [11.5, 19.5, 'x', 'red'], [20.5, 3.0, 'y', 'white'],
  ];
  const CAR_COL = {
    taxi: ['#FFD43B', '#F0B800', '#D9A300'], white: ['#FFFFFF', '#E3E3E3', '#CFCFCF'],
    red: ['#FF6B5B', '#E0483A', '#C93A2E'], blue: ['#6FA3FF', '#4C82E8', '#3B6CCB'],
  };
  const BLD_COL = [
    ['#FBF9F5', '#E9E3D9', '#D9D0C2'],
    ['#F7F4F0', '#E4DED8', '#D2CAC1'],
    ['#FAF6EE', '#ECE2D0', '#DCCDB4'],
    ['#F4F3F1', '#E0DEDB', '#CDCAC5'],
  ];

  const inRect = (x, y, r, m = 0) => x >= r[0] - m && x <= r[2] + m && y >= r[1] - m && y <= r[3] + m;

  // ── Объекты ──────────────────────────────────────────────────
  function buildingSvg(b) {
    const { x0, y0, x1, y1, h, col } = b;
    const [top, left, right] = col;
    let s = `<g class="bld${b.venue ? ' venue-bld' : ''}"${b.venue ? ` data-venue="${b.venue}"` : ''}>`;
    s += `<polygon class="side-l" points="${pts([P(x0, y1), P(x1, y1), P(x1, y1, h), P(x0, y1, h)])}" fill="${left}"/>`;
    s += `<polygon class="side-r" points="${pts([P(x1, y0), P(x1, y1), P(x1, y1, h), P(x1, y0, h)])}" fill="${right}"/>`;
    // окна
    let wl = '', wr = '';
    for (let z = 9; z + 7 < h - 4; z += 12) {
      for (let a = x0 + 0.22; a + 0.26 <= x1 - 0.14; a += 0.5) {
        wl += dPoly([P(a, y1, z), P(a + 0.26, y1, z), P(a + 0.26, y1, z + 6), P(a, y1, z + 6)]);
      }
      for (let a = y0 + 0.22; a + 0.26 <= y1 - 0.14; a += 0.5) {
        wr += dPoly([P(x1, a, z), P(x1, a + 0.26, z), P(x1, a + 0.26, z + 6), P(x1, a, z + 6)]);
      }
    }
    if (wl) s += `<path d="${wl}" fill="#C7D7E8" opacity=".85"/>`;
    if (wr) s += `<path d="${wr}" fill="#B6C8DC" opacity=".85"/>`;
    s += `<polygon class="top" points="${quad(x0, y0, x1, y1, h)}" fill="${top}"/>`;
    s += `<polygon class="roof" points="${quad(x0 + 0.1, y0 + 0.1, x1 - 0.1, y1 - 0.1, h)}" fill="#000" opacity=".035"/>`;
    if (b.ac) {
      const ax = x0 + (x1 - x0) * 0.3, ay = y0 + (y1 - y0) * 0.3;
      s += `<polygon points="${pts([P(ax, ay + 0.35, h), P(ax + 0.4, ay + 0.35, h), P(ax + 0.4, ay + 0.35, h + 5), P(ax, ay + 0.35, h + 5)])}" fill="${left}"/>`;
      s += `<polygon points="${pts([P(ax + 0.4, ay, h), P(ax + 0.4, ay + 0.35, h), P(ax + 0.4, ay + 0.35, h + 5), P(ax + 0.4, ay, h + 5)])}" fill="${right}"/>`;
      s += `<polygon points="${quad(ax, ay, ax + 0.4, ay + 0.35, h + 5)}" fill="${top}"/>`;
    }
    return s + '</g>';
  }

  function treeSvg(t) {
    const [gx, gy] = P(t.x, t.y);
    const s = t.s;
    return `<g class="tree">
      <ellipse cx="${f(gx + 5 * s)}" cy="${f(gy + 2)}" rx="${f(12 * s)}" ry="${f(6 * s)}" fill="#46613A" opacity=".16"/>
      <rect x="${f(gx - 1.6)}" y="${f(gy - 9 * s)}" width="3.2" height="${f(9 * s)}" rx="1.2" fill="#9C7A5B"/>
      <circle cx="${f(gx)}" cy="${f(gy - 16 * s)}" r="${f(10.5 * s)}" fill="${t.dark}"/>
      <circle cx="${f(gx - 1.2 * s)}" cy="${f(gy - 18 * s)}" r="${f(8.6 * s)}" fill="${t.mid}"/>
      <circle cx="${f(gx - 3.6 * s)}" cy="${f(gy - 21 * s)}" r="${f(4.2 * s)}" fill="${t.light}"/>
    </g>`;
  }

  function carSvg(c) {
    const [x, y, dir, kind] = c;
    const [top, l, r] = CAR_COL[kind];
    const lx = dir === 'x' ? 0.62 : 0.3, ly = dir === 'x' ? 0.3 : 0.62, h = 7;
    const x0 = x - lx / 2, y0 = y - ly / 2, x1 = x + lx / 2, y1 = y + ly / 2;
    let s = '<g class="car">';
    s += `<polygon points="${quad(x0 + 0.05, y0 + 0.05, x1 + 0.12, y1 + 0.12)}" fill="#000" opacity=".12"/>`;
    s += `<polygon points="${pts([P(x0, y1), P(x1, y1), P(x1, y1, h), P(x0, y1, h)])}" fill="${l}"/>`;
    s += `<polygon points="${pts([P(x1, y0), P(x1, y1), P(x1, y1, h), P(x1, y0, h)])}" fill="${r}"/>`;
    s += `<polygon points="${quad(x0, y0, x1, y1, h)}" fill="${top}"/>`;
    // кабина
    const cx0 = dir === 'x' ? x0 + 0.16 : x0 + 0.05, cx1 = dir === 'x' ? x1 - 0.2 : x1 - 0.05;
    const cy0 = dir === 'x' ? y0 + 0.05 : y0 + 0.16, cy1 = dir === 'x' ? y1 - 0.05 : y1 - 0.2;
    s += `<polygon points="${quad(cx0, cy0, cx1, cy1, h + 4)}" fill="#2F3A4A" opacity=".75"/>`;
    s += `<polygon points="${pts([P(cx0, cy1, h), P(cx1, cy1, h), P(cx1, cy1, h + 4), P(cx0, cy1, h + 4)])}" fill="#3C4A5E"/>`;
    s += `<polygon points="${pts([P(cx1, cy0, h), P(cx1, cy1, h), P(cx1, cy1, h + 4), P(cx1, cy0, h + 4)])}" fill="#2A3545"/>`;
    if (kind === 'taxi') s += `<polygon points="${quad(cx0 + 0.04, cy0 + 0.04, cx1 - 0.04, cy1 - 0.04, h + 4.2)}" fill="#FFD43B"/>`;
    return s + '</g>';
  }

  function circlePts(cx, cy, r, z = 0, n = 72) {
    const a = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      a.push(P(cx + r * Math.cos(t), cy + r * Math.sin(t), z));
    }
    return a;
  }

  // ── Сборка сцены ─────────────────────────────────────────────
  function render(svg, venues) {
    const R = rng(20251028);
    const objects = []; // { key, svg }
    const buildings = [];
    const trees = [];
    const greens = [['#6FB453', '#8CCB6A', '#B2E08F'], ['#5FA74A', '#7DC15E', '#A3D77F'], ['#77B85A', '#97CF72', '#BCE59C']];
    const addTree = (x, y, s = 1) => {
      const g = greens[Math.floor(R() * greens.length)];
      trees.push({ x, y, s, dark: g[0], mid: g[1], light: g[2] });
    };

    // Здания по кварталам
    BLOCKS.forEach((bk, bi) => {
      const ix0 = bk[0] + 0.32, iy0 = bk[1] + 0.32, ix1 = bk[2] - 0.32, iy1 = bk[3] - 0.32;
      const w = ix1 - ix0, h = iy1 - iy0;
      const nx = Math.max(1, Math.round(w / 2.2)), ny = Math.max(1, Math.round(h / 2.2));
      const cw = w / nx, ch = h / ny;
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          const c0x = ix0 + i * cw, c0y = iy0 + j * ch, c1x = c0x + cw, c1y = c0y + ch;
          const venue = venues.find((v) => v.at[0] >= c0x && v.at[0] < c1x && v.at[1] >= c0y && v.at[1] < c1y);
          if (!venue && R() < 0.13) {
            addTree(c0x + cw * 0.35, c0y + ch * 0.4, 0.9);
            addTree(c0x + cw * 0.7, c0y + ch * 0.7, 0.8);
            continue;
          }
          const g = 0.12;
          const b = {
            x0: c0x + g + R() * 0.18, y0: c0y + g + R() * 0.18,
            x1: c1x - g - R() * 0.18, y1: c1y - g - R() * 0.18,
            h: venue ? 34 + R() * 10 : 20 + Math.round(R() * 52),
            col: BLD_COL[Math.floor(R() * BLD_COL.length)],
            ac: R() < 0.45,
            venue: venue ? venue.id : null,
          };
          buildings.push(b);
        }
      }
      // деревья вдоль тротуаров
      for (let t = bk[0] + 0.6; t < bk[2] - 0.3; t += 1.6) if (R() < 0.55) addTree(t, bk[3] - 0.12, 0.62);
      for (let t = bk[1] + 0.6; t < bk[3] - 0.3; t += 1.6) if (R() < 0.55) addTree(bk[2] - 0.12, t, 0.62);
    });

    // Парк: деревья по кольцу вокруг озера
    for (let k = 0; k < 70; k++) {
      const x = PARK[0] + 0.3 + R() * (PARK[2] - PARK[0] - 0.5);
      const y = PARK[1] + 0.3 + R() * (PARK[3] - PARK[1] - 0.5);
      const d = Math.hypot(x - LAKE.cx, y - LAKE.cy);
      if (d < LAKE.r + 1.35) continue;
      if (Math.abs(d - (LAKE.r + 0.85)) < 0.4) continue;
      addTree(x, y, 0.75 + R() * 0.35);
    }
    // Сквер
    [[10.7, 6.6], [13.5, 6.6], [10.7, 11.4], [13.5, 11.4], [10.8, 9.0], [13.4, 8.6], [11.4, 7.3], [12.9, 10.9]]
      .forEach(([x, y]) => addTree(x, y, 0.85));

    buildings.forEach((b) => objects.push({ key: b.x1 + b.y1 - 0.4, svg: buildingSvg(b) }));
    trees.forEach((t) => objects.push({ key: t.x + t.y, svg: treeSvg(t) }));
    CARS.forEach((c) => objects.push({ key: c[0] + c[1], svg: carSvg(c) }));
    objects.sort((a, b) => a.key - b.key);

    // ── Слои земли ──
    let s = '';
    s += `<defs>
      <filter id="slabShadow" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="22"/></filter>
      <linearGradient id="lakeGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B9E1FB"/><stop offset="1" stop-color="#93CBF2"/></linearGradient>
      <pattern id="paving" width="16" height="8" patternUnits="userSpaceOnUse"><path d="M0 4L8 0L16 4L8 8Z" fill="none" stroke="#E6DED1" stroke-width=".8"/></pattern>
    </defs>`;
    // тень и «срез» земли
    const [bx, by] = P(N, N);
    s += `<ellipse cx="${OX}" cy="${by + SLAB + 30}" rx="${N * HW * 0.9}" ry="70" fill="#5B6B7C" opacity=".22" filter="url(#slabShadow)"/>`;
    s += `<polygon points="${pts([P(0, N), P(N, N), [bx, by + SLAB], [P(0, N)[0], P(0, N)[1] + SLAB]])}" fill="#D9C8AC"/>`;
    s += `<polygon points="${pts([P(N, 0), P(N, N), [bx, by + SLAB], [P(N, 0)[0], P(N, 0)[1] + SLAB]])}" fill="#C6B191"/>`;
    s += `<polygon points="${pts([P(0, N), P(N, N), [bx, by + 9], [P(0, N)[0], P(0, N)[1] + 9]])}" fill="#A9C98E"/>`;
    s += `<polygon points="${pts([P(N, 0), P(N, N), [bx, by + 9], [P(N, 0)[0], P(N, 0)[1] + 9]])}" fill="#93B67A"/>`;
    s += `<polygon points="${quad(0, 0, N, N)}" fill="#ECE7DE"/>`;
    // кварталы
    BLOCKS.forEach((b) => (s += `<polygon points="${quad(b[0], b[1], b[2], b[3])}" fill="#F3EFE8"/>`));
    // сквер
    s += `<polygon points="${quad(...SQUARE)}" fill="#F5F0E7"/><polygon points="${quad(...SQUARE)}" fill="url(#paving)"/>`;
    [[10.4, 6.2, 11.9, 8.2], [12.4, 6.2, 13.8, 8.2], [10.4, 9.9, 11.9, 11.8], [12.4, 9.9, 13.8, 11.8]]
      .forEach((r) => (s += `<polygon points="${quad(...r)}" fill="#CDE7B8"/>`));
    // парк и озеро
    s += `<polygon points="${quad(...PARK)}" fill="#CBE6B5"/>`;
    s += `<path d="${dPoly(circlePts(LAKE.cx, LAKE.cy, LAKE.r + 0.85))}" fill="none" stroke="#F6F1E6" stroke-width="9"/>`;
    s += `<path d="M${pts([P(15.2, 17.5), P(LAKE.cx - LAKE.r - 0.85, 17.5)]).replace(' ', 'L')}" stroke="#F6F1E6" stroke-width="8" fill="none"/>`;
    s += `<path d="M${pts([P(21.6, 13.2), P(21.6, LAKE.cy - LAKE.r - 0.6)]).replace(' ', 'L')}" stroke="#F6F1E6" stroke-width="8" fill="none"/>`;
    s += `<path d="${dPoly(circlePts(LAKE.cx, LAKE.cy, LAKE.r + 0.12))}" fill="#9FCBE8"/>`;
    s += `<path d="${dPoly(circlePts(LAKE.cx, LAKE.cy, LAKE.r))}" fill="url(#lakeGrad)"/>`;
    s += `<path d="${dPoly(circlePts(LAKE.cx - 0.3, LAKE.cy - 0.3, LAKE.r * 0.55))}" fill="#FFFFFF" opacity=".12"/>`;
    // пирс и лодочки
    s += `<polygon points="${quad(16.3, 18.7, 17.6, 19.05)}" fill="#C9A47A"/>`;
    [[19.2, 17.2], [21.4, 20.6], [18.6, 20.4]].forEach(([x, y]) => {
      const [cx, cy] = P(x, y);
      s += `<ellipse cx="${cx}" cy="${cy}" rx="9" ry="4.5" fill="#FFFFFF" stroke="#7FB3D8" stroke-width="1"/><path d="M${cx - 3} ${cy - 2}l3 -9l3 9z" fill="#FF6B5B"/>`;
    });
    // канал
    s += `<polygon points="${quad(CANAL[0] - 0.08, CANAL[1], CANAL[2] + 0.08, CANAL[3])}" fill="#D3C9B9"/>`;
    s += `<polygon points="${quad(...CANAL)}" fill="#A6D6F7"/>`;
    s += `<polygon points="${quad(CANAL[0] + 0.35, CANAL[1], CANAL[0] + 0.55, CANAL[3])}" fill="#FFFFFF" opacity=".18"/>`;
    // дороги: сначала обводки, затем заливки
    ROADS.forEach((r) => (s += `<polygon points="${quad(r[0], r[1], r[2], r[3])}" fill="none" stroke="${r[4] === 'a' ? '#F0CF6E' : '#DDD5C8'}" stroke-width="3" stroke-linejoin="round"/>`));
    ROADS.filter((r) => r[4] === 's').forEach((r) => (s += `<polygon points="${quad(r[0], r[1], r[2], r[3])}" fill="#FFFFFF"/>`));
    ROADS.filter((r) => r[4] === 'a').forEach((r) => (s += `<polygon points="${quad(r[0], r[1], r[2], r[3])}" fill="#FFE9A6"/>`));
    // разметка проспектов
    s += `<path d="M${pts([P(0, 12.6), P(24, 12.6)]).replace(' ', 'L')}" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="12 10" fill="none"/>`;
    s += `<path d="M${pts([P(14.6, 0), P(14.6, 24)]).replace(' ', 'L')}" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="12 10" fill="none"/>`;
    // пешеходные переходы у перекрёстков проспектов
    const zebra = (x0, y0, x1, y1, along) => {
      let d = '';
      for (let k = 0; k < 5; k++) {
        if (along === 'x') {
          const yy = y0 + 0.12 + k * ((y1 - y0 - 0.2) / 5);
          d += dPoly([P(x0, yy), P(x1, yy), P(x1, yy + 0.12), P(x0, yy + 0.12)]);
        } else {
          const xx = x0 + 0.12 + k * ((x1 - x0 - 0.2) / 5);
          d += dPoly([P(xx, y0), P(xx + 0.12, y0), P(xx + 0.12, y1), P(xx, y1)]);
        }
      }
      return `<path d="${d}" fill="#FFFFFF" opacity=".95"/>`;
    };
    s += zebra(13.45, 12, 13.85, 13.2, 'x') + zebra(15.35, 12, 15.75, 13.2, 'x');
    s += zebra(14, 11.4, 15.2, 11.8, 'y') + zebra(14, 13.4, 15.2, 13.8, 'y');
    // перила мостов
    ROADS.filter((r) => r[0] < CANAL[0] && r[2] > CANAL[2]).forEach((r) => {
      s += `<path d="M${pts([P(CANAL[0], r[1]), P(CANAL[2], r[1])]).replace(' ', 'L')}M${pts([P(CANAL[0], r[3]), P(CANAL[2], r[3])]).replace(' ', 'L')}" stroke="#B9AE9C" stroke-width="2.5" fill="none"/>`;
    });
    // фонтан
    s += `<path d="${dPoly(circlePts(12.15, 9.05, 0.95))}" fill="#E4DCCD"/>`;
    s += `<path d="${dPoly(circlePts(12.15, 9.05, 0.78))}" fill="#BCE2FA"/>`;
    const [fx, fy] = P(12.15, 9.05);
    s += `<g class="fountain"><ellipse cx="${fx}" cy="${fy - 8}" rx="3" ry="9" fill="#FFFFFF" opacity=".8"/><ellipse cx="${fx}" cy="${fy - 3}" rx="10" ry="3.5" fill="#FFFFFF" opacity=".55"/></g>`;

    // подписи улиц под объектами
    let labels = '';
    LABELS.forEach((l) => {
      const [x, y] = P(l.x, l.y);
      const rot = l.dir === 'x' ? 26.565 : l.dir === 'y' ? -26.565 : 0;
      labels += `<text class="lbl ${l.cls || ''}" x="${f(x)}" y="${f(y)}" transform="rotate(${rot} ${f(x)} ${f(y)})" text-anchor="middle" dominant-baseline="middle">${l.t}</text>`;
    });

    s += `<g class="labels-low">${labels}</g>`;
    s += `<g class="objects">${objects.map((o) => o.svg).join('')}</g>`;

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.innerHTML = s;

    // Точки привязки маркеров — центр крыши здания заведения
    const anchors = {};
    venues.forEach((v) => {
      let b = buildings.find((bb) => bb.venue === v.id);
      if (!b) {
        b = buildings.slice().sort((a, c) =>
          Math.hypot((a.x0 + a.x1) / 2 - v.at[0], (a.y0 + a.y1) / 2 - v.at[1]) -
          Math.hypot((c.x0 + c.x1) / 2 - v.at[0], (c.y0 + c.y1) / 2 - v.at[1]))[0];
      }
      anchors[v.id] = P((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, b.h);
    });

    function setHighlight(ids, selected) {
      svg.querySelectorAll('.venue-bld').forEach((g) => {
        const id = g.dataset.venue;
        g.classList.toggle('hl', ids.includes(id));
        g.classList.toggle('sel', id === selected);
      });
    }

    return { width: W, height: H, P, anchors, setHighlight, center: P(N / 2, N / 2) };
  }

  return { render };
})();
