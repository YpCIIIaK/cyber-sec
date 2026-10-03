/* ============================================================
   CyberPath — эффекты профиля (лёгкие частицы на canvas).
   Любой элемент с data-fx="fx_snow" получает слой с эффектом.
   Учитывает prefers-reduced-motion, останавливается, когда элемент
   удалён со страницы или вкладка скрыта.
   ============================================================ */
const Fx = (() => {
  const reduce = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const GLYPHS = "01アイウエオカキクケコサシスセソ<>{}#$%";

  const TYPES = {
    fx_sparks: { n: 34, init: (p, w, h) => Object.assign(p, { x: Math.random() * w, y: h + Math.random() * h, vy: -(0.6 + Math.random() * 1.4), vx: (Math.random() - 0.5) * 0.5, r: 1 + Math.random() * 1.8, a: 1 }),
      step: (p, w, h) => { p.x += p.vx; p.y += p.vy; p.a -= 0.006; if (p.y < -5 || p.a <= 0) TYPES.fx_sparks.init(p, w, h); },
      draw: (c, p) => { c.fillStyle = `rgba(255,${150 + (p.r * 30) | 0},60,${p.a})`; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); } },
    fx_snow: { n: 50, init: (p, w, h, first) => Object.assign(p, { x: Math.random() * w, y: first ? Math.random() * h : -5, vy: 0.3 + Math.random() * 0.8, ph: Math.random() * 6, r: 1 + Math.random() * 2.2 }),
      step: (p, w, h) => { p.y += p.vy; p.ph += 0.02; p.x += Math.sin(p.ph) * 0.4; if (p.y > h + 5) TYPES.fx_snow.init(p, w, h); },
      draw: (c, p) => { c.fillStyle = "rgba(255,255,255,.9)"; c.strokeStyle = "rgba(90,120,160,.45)"; c.lineWidth = 0.8; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); c.stroke(); } },
    fx_stars: { n: 40, init: (p, w, h) => Object.assign(p, { x: Math.random() * w, y: Math.random() * h, ph: Math.random() * 6, sp: 0.02 + Math.random() * 0.04, r: 0.8 + Math.random() * 1.6 }),
      step: (p) => { p.ph += p.sp; },
      draw: (c, p) => { const a = 0.25 + 0.75 * Math.abs(Math.sin(p.ph)); c.fillStyle = `rgba(255,244,214,${a})`;
        c.beginPath(); c.moveTo(p.x, p.y - p.r * 2.2); c.lineTo(p.x + p.r * 0.6, p.y); c.lineTo(p.x, p.y + p.r * 2.2); c.lineTo(p.x - p.r * 0.6, p.y); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(p.x - p.r * 2.2, p.y); c.lineTo(p.x, p.y + p.r * 0.6); c.lineTo(p.x + p.r * 2.2, p.y); c.lineTo(p.x, p.y - p.r * 0.6); c.closePath(); c.fill(); } },
    fx_embers: { n: 28, init: (p, w, h, first) => Object.assign(p, { x: Math.random() * w, y: first ? Math.random() * h : h + 10, vy: -(0.3 + Math.random() * 0.7), ph: Math.random() * 6, r: 2 + Math.random() * 3, a: 0.9 }),
      step: (p, w, h) => { p.y += p.vy; p.ph += 0.05; p.x += Math.sin(p.ph) * 0.5; p.a = 0.5 + 0.4 * Math.sin(p.ph * 2); if (p.y < -10) TYPES.fx_embers.init(p, w, h); },
      draw: (c, p) => { const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.5); g.addColorStop(0, `rgba(255,190,90,${p.a})`); g.addColorStop(1, "rgba(220,50,20,0)"); c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r * 2.5, 0, 7); c.fill(); } },
    fx_matrix: { n: 0, cols: true },
    fx_flags: { n: 9, init: (p, w, h, first) => Object.assign(p, { x: first ? Math.random() * w : -20, y: 10 + Math.random() * (h - 30), vx: 0.4 + Math.random() * 0.6, ph: Math.random() * 6, s: 12 + Math.random() * 8 }),
      step: (p, w, h) => { p.x += p.vx; p.ph += 0.06; if (p.x > w + 20) TYPES.fx_flags.init(p, w, h); },
      draw: (c, p) => { c.save(); c.globalAlpha = 0.85; c.font = `${p.s}px sans-serif`; c.translate(p.x, p.y + Math.sin(p.ph) * 4); c.rotate(Math.sin(p.ph) * 0.15); c.fillText("🚩", 0, 0); c.restore(); } },
  };

  function attach(el, type) {
    const T = TYPES[type];
    if (!T || !el) return null;
    const cv = document.createElement("canvas");
    cv.className = "fx-layer"; cv.setAttribute("aria-hidden", "true");
    el.appendChild(cv);
    const ctx = cv.getContext("2d");
    let w = 0, h = 0, raf = 0, parts = [], drops = [];
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    function size() {
      const r = el.getBoundingClientRect(); w = Math.max(1, r.width); h = Math.max(1, r.height);
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (T.cols) drops = Array.from({ length: Math.ceil(w / 14) }, () => Math.random() * -h / 14);
    }
    size();
    parts = Array.from({ length: T.n }, () => T.init({}, w, h, true));
    const still = reduce();
    function frame() {
      if (!cv.isConnected) { cancelAnimationFrame(raf); return; }
      if (document.hidden) { raf = requestAnimationFrame(frame); return; }
      if (T.cols) {
        ctx.fillStyle = "rgba(0,0,0,.08)"; ctx.globalCompositeOperation = "destination-out"; ctx.fillRect(0, 0, w, h); ctx.globalCompositeOperation = "source-over";
        ctx.font = "13px monospace"; ctx.fillStyle = "rgba(74,222,128,.75)";
        drops.forEach((d, i) => { ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * 14, d * 14); drops[i] = d * 14 > h && Math.random() > 0.97 ? 0 : d + 0.5; });
      } else {
        ctx.clearRect(0, 0, w, h);
        parts.forEach((p) => { if (!still) T.step(p, w, h); T.draw(ctx, p); });
      }
      if (!still) raf = requestAnimationFrame(frame);
    }
    frame();
    const ro = window.ResizeObserver ? new ResizeObserver(size) : null;
    if (ro) ro.observe(el);
    return { stop() { cancelAnimationFrame(raf); if (ro) ro.disconnect(); cv.remove(); } };
  }

  // Подключить эффекты ко всем новым элементам с data-fx
  function mountAll(scope) {
    (scope || document).querySelectorAll("[data-fx]").forEach((el) => {
      if (el._fx || !el.dataset.fx) return;
      el._fx = attach(el, el.dataset.fx) || true;
    });
  }
  return { attach, mountAll, types: Object.keys(TYPES) };
})();
try { window.Fx = Fx; } catch (e) {}
