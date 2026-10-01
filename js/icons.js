/* ============================================================
   CyberPath — набор monoline SVG-иконок (без эмодзи в UI)
   Все иконки 24×24, stroke=currentColor — красятся через CSS.
   ============================================================ */

const Icon = (() => {
  const svg = (paths, extra = "") =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${extra}>${paths}</svg>`;

  const COURSE = {
    fundamentals: svg(`<path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/>`),
    windows: svg(`<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M12 4.5v15M3.5 12h17"/>`),
    osint: svg(`<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.3-4.3"/><path d="M11 8v6M8 11h6" opacity=".5"/>`),
    networking: svg(`<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.3 2.5 14.7 0 17M12 3.5c-2.5 2.3-2.5 14.7 0 17"/>`),
    crypto: svg(`<rect x="5" y="10.5" width="14" height="9" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><circle cx="12" cy="15" r="1.3"/>`),
    web: svg(`<path d="M8.5 8.5L5 12l3.5 3.5M15.5 8.5L19 12l-3.5 3.5M13.5 6l-3 12"/>`),
    pentest: svg(`<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/><path d="M12 1.5V4M12 20v2.5M1.5 12H4M20 12h2.5"/>`),
    ad: svg(`<path d="M5 20V6l6-3v17M11 20V9l7 2.5V20"/><path d="M4 20h16M8 8v.01M8 11v.01M8 14v.01M14.5 13v.01M14.5 16v.01"/>`),
    reverse: svg(`<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>`),
    forensics: svg(`<path d="M9 3h4M11 3v5"/><path d="M11 8a5 5 0 0 0-2 9.5V20a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2.5A5 5 0 0 0 11 8z"/><path d="M9.5 12.5c.8-.8 2.2-.8 3 0" opacity=".5"/>`),
    phishing: svg(`<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/><path d="M16 18c0 1.7 1.3 3 3 3" opacity=".6"/>`),
    hardening: svg(`<path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z"/><rect x="9.5" y="10.5" width="5" height="4.5" rx="1"/><path d="M10.5 10.5v-1a1.5 1.5 0 0 1 3 0v1"/>`),
    blueteam: svg(`<path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z"/><path d="M8 12h2l1.5 3 2-6 1 3H16"/>`),
    malware: svg(`<circle cx="12" cy="13" r="5"/><path d="M12 8V4M9 5l1.5 2M15 5l-1.5 2M4 11l2.5 1M20 11l-2.5 1M4.5 17l2.6-1.4M19.5 17l-2.6-1.4M12 18v3"/>`),
  };

  const UI = {
    shield: svg(`<path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z"/>`),
    target: svg(`<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 1.5V4M20 12h2.5"/>`),
    quest: svg(`<path d="M4 5h16M4 5v14a1 1 0 0 0 1 1h6"/><path d="M8 9h8M8 13h5"/><path d="M15 18l2 2 4-4"/>`),
    progress: svg(`<path d="M4 19V5M4 19h16"/><path d="M8 15l3.5-4 3 2.5L20 7"/>`),
    lock: svg(`<rect x="5" y="10.5" width="14" height="9" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>`),
    terminal: svg(`<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M7 10l3 2.5L7 15M12.5 15h4"/>`),
    flag: svg(`<path d="M6 21V4M6 4h11l-2 3.5L17 11H6"/>`),
    check: svg(`<path d="M4 12.5l5 5 11-11"/>`),
    arrow: svg(`<path d="M5 12h14M13 6l6 6-6 6"/>`),
    flame: svg(`<path d="M12 3s5 3.5 5 9a5 5 0 0 1-10 0c0-2 1-3.2 1-3.2S10 12 12 12c1.2 0 1.8-1 1.5-2.5C13 7 12 3 12 3z"/>`),
    bolt: svg(`<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>`),
    book: svg(`<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 5.5v15"/>`),
    sun: svg(`<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>`),
    moon: svg(`<path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z"/>`),
    mail: svg(`<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6 8.5-6"/>`),
    list: svg(`<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>`),
    activity: svg(`<path d="M3 12h4l3 7 4-14 3 7h4"/>`),
    cpu: svg(`<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 3v2M14 3v2M10 19v2M14 19v2M3 10h2M3 14h2M19 10h2M19 14h2"/>`),
    grid: svg(`<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>`),
    search: svg(`<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>`),
    alert: svg(`<path d="M12 3l9.5 16.5H2.5L12 3z"/><path d="M12 10v4M12 17v.01"/>`),
    code: svg(`<path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/>`),
  };

  return {
    course: (id) => COURSE[id] || UI.shield,
    ui: (name) => UI[name] || "",
  };
})();
