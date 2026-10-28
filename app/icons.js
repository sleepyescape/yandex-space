/* Набор линейных иконок 24×24 (stroke = currentColor). */
window.YS_ICONS = (() => {
  const P = {
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    locate: '<path d="M20 4L4 11l7 2 2 7z" fill="currentColor" stroke-linejoin="round"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    back: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
    chevron: '<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
    down: '<path d="M6 9.5l6 6 6-6"/>',
    star: '<path d="M12 3.8l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z" fill="currentColor" stroke="none"/>',
    walk: '<circle cx="13" cy="4.5" r="1.8" fill="currentColor" stroke="none"/><path d="M10.5 21l2-6.5 2.5 2.5V21M12.5 14.5l1-5.5-3.5 1.5L8.5 14M13.5 9l2 3 3 1"/>',
    wifi: '<path d="M3 9.5a13 13 0 0 1 18 0M6 12.8a8.5 8.5 0 0 1 12 0M9 16a4 4 0 0 1 6 0"/><circle cx="12" cy="19" r="1" fill="currentColor"/>',
    socket: '<rect x="4" y="4" width="16" height="16" rx="5"/><path d="M9.5 9v3M14.5 9v3M10 16h4"/>',
    note: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
    laptop: '<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M3 19h18"/>',
    people: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14a4.5 4.5 0 0 1 5.5 4.5"/>',
    door: '<path d="M6 20V4h12v16M4 20h16"/><circle cx="14.5" cy="12" r="1" fill="currentColor"/>',
    kid: '<circle cx="12" cy="7" r="3"/><path d="M8 21v-5l-2-3 4-2h4l4 2-2 3v5"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z"/><path d="M5 19l7-7"/>',
    view: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    plate: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>',
    cup: '<path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 9.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5v2M11 3.5v2"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    route: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8 18h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16"/>',
    share: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13"/>',
    heart: '<path d="M12 19.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z"/>',
    filter: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    phone: '<path d="M6.5 3.5h3l1.5 4.5-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
    nocall: '<path d="M6.5 3.5h3l1.5 4.5-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/><path d="M3 3l18 18"/>',
    near: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    company: '<circle cx="12" cy="7.5" r="2.6"/><circle cx="5.5" cy="10" r="2.1"/><circle cx="18.5" cy="10" r="2.1"/><path d="M7.5 19.5a4.5 4.5 0 0 1 9 0M2 18.5a3.5 3.5 0 0 1 5-3.2M22 18.5a3.5 3.5 0 0 0-5-3.2"/>',
    work: '<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M3 19h18"/><path d="M15.5 2.5c1 .7 1 1.6 0 2.3"/>',
    // Категории заведений (для маркеров)
    coffee: '<path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 9.5h1.5a2.5 2.5 0 0 1 0 5H16"/>',
    cowork: '<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M3 19h18"/>',
    food: '<path d="M7 3.5v7a2 2 0 0 0 2 2v8M5 3.5v5M9 3.5v5M16.5 20.5v-17c-2 1-3 3.5-3 6.5 0 2 1 3 3 3"/>',
    restaurant: '<path d="M6 3.5v7a2 2 0 0 0 2 2v8M4 3.5v5M8 3.5v5"/><circle cx="16" cy="12" r="4.5"/><path d="M16 16.5v4"/>',
    bar: '<path d="M5 4h14l-7 8z"/><path d="M12 12v8M8 20h8"/>',
    bakery: '<path d="M4 15c0-5 3.5-9 8-9s8 4 8 9c0 1.5-1 2.5-2.5 2.5h-11C5 17.5 4 16.5 4 15z"/><path d="M9 7.5l1.5 10M15 7.5l-1.5 10"/>',
    noodles: '<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z"/><path d="M8 11V4M11 11V3.5M15 4l4 4"/>',
    garden: '<path d="M12 21v-6"/><path d="M12 15c-4 0-6.5-2.5-6.5-6a6.5 6.5 0 0 1 13 0c0 3.5-2.5 6-6.5 6z"/>',
  };

  function icon(name, size = 20, extra = '') {
    const body = P[name] || P.near;
    return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra}>${body}</svg>`;
  }

  return { icon };
})();
