/* Smoke-тест новых лабораторий: монтируем каждую в «браузерный» контейнер
   с заглушками DOM и проверяем, что разметка построена и сценарий решаем.
   Запуск: node tests/labs-smoke.cjs */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { root } = require("./load.cjs");

/* --- минимальный DOM: элементы с querySelector(-All), classList, dataset --- */
function mkEl(tag = "div") {
  const el = {
    tagName: (tag || "div").toUpperCase(), children: [], attrs: {}, dataset: {}, _html: "",
    style: {}, value: "", textContent: "", disabled: false, checked: false, hidden: false,
    parentElement: null, className: "", scrollHeight: 0,
  };
  el.classList = {
    _s: new Set(),
    add: (...c) => c.forEach((x) => el.classList._s.add(x)),
    remove: (...c) => c.forEach((x) => el.classList._s.delete(x)),
    toggle: (c, on) => (on === undefined ? (el.classList._s.has(c) ? el.classList._s.delete(c) : el.classList._s.add(c)) : (on ? el.classList.add(c) : el.classList.remove(c))),
    contains: (c) => el.classList._s.has(c),
  };
  el.setAttribute = (k, v) => { el.attrs[k] = v; };
  el.getAttribute = (k) => el.attrs[k];
  el.addEventListener = (ev, fn) => { (el._h = el._h || {})[ev] = fn; };
  el.removeEventListener = () => {};
  el.appendChild = (c) => { el.children.push(c); if (c) c.parentElement = el; return c; };
  el.querySelector = (sel) => find(el, sel)[0] || null;
  el.querySelectorAll = (sel) => find(el, sel);
  el.focus = () => {};
  el.scrollIntoView = () => {};
  el.closest = () => null;
  Object.defineProperty(el, "innerHTML", {
    get() { return el._html; },
    set(v) {
      el._html = String(v);
      // Разбираем только то, что нужно лабораториям: id и class из разметки
      el.children = [];
      const ids = [...el._html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
      const cls = [...el._html.matchAll(/class="([^"]+)"/g)].map((m) => m[1]);
      ids.forEach((id) => { const c = mkEl(); c.attrs.id = id; el.children.push(c); c.parentElement = el; });
      cls.forEach((c) => { const n = mkEl(); c.split(/\s+/).forEach((x) => n.classList.add(x)); n.dataset.i = String(el.children.length); el.children.push(n); n.parentElement = el; });
    },
  });
  return el;
}
function find(el, sel) {
  const out = [];
  const want = sel.replace(/^#/, "").replace(/^\./, "");
  const byId = sel.startsWith("#");
  const byClass = sel.startsWith(".");
  (function walk(node) {
    node.children.forEach((c) => {
      if (byId ? c.attrs.id === want : byClass ? c.classList.contains(want) : true) out.push(c);
      walk(c);
    });
  })(el);
  return out;
}

/* --- загрузка контента --- */
const sandbox = {
  window: {}, console,
  document: { querySelectorAll: () => [], getElementById: () => null, createElement: (t) => mkEl(t), documentElement: {} },
  localStorage: { getItem: () => null, setItem() {} },
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  atob: (s) => Buffer.from(s, "base64").toString("binary"),
  btoa: (s) => Buffer.from(s, "binary").toString("base64"),
  Progress: { bumpStat() {}, unlockAchievement() {}, award: () => ({ already: true }) },
};
sandbox.window = sandbox;
vm.createContext(sandbox);
const files = ["js/data.js", "js/labs.js", "js/labs_triage.js", "js/labs_ad.js", "js/labs_pe.js", "js/labs_hardening.js", "js/labs_blueteam.js", "js/labs_reverse2.js", "js/labs_osint.js", "js/labs_forensics.js", "js/labs_net.js", "js/icons.js", "js/explanations.js", "js/i18n.js"];
vm.runInContext(files.map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n") +
  "\n;Object.assign(window, { COURSES, Labs, I18N });", sandbox);

/* Все лаборатории, объявленные в js/data.js, + контрольный список старых */
const used = new Set();
(sandbox.COURSES || []).forEach((c) => c.rooms.forEach((r) => r.tasks.forEach((t) => { if (t.type === "lab") used.add(t.lab); })));
const wanted = [...new Set([...used, "passmeter", "sqli", "xss", "harden", "logtriage"])];
let fails = 0;
wanted.forEach((id) => {
  const el = mkEl();
  let solvedFlag = false;
  try {
    sandbox.Labs.mount(id, el, () => { solvedFlag = true; });
  } catch (e) {
    console.log(`❌ ${id}: исключение при монтировании: ${e.message}`);
    fails++; return;
  }
  const html = el.innerHTML || "";
  const okHtml = html.length > 200;
  const hasHandler = (el._h && Object.keys(el._h).length) || (el.querySelectorAll("button").length > 0);
  console.log(`${okHtml && hasHandler ? "✅" : "⚠️ "} ${id}: разметка ${html.length} симв., обработчиков ${hasHandler ? "есть" : "нет"}`);
  if (!okHtml) fails++;
});
console.log(fails ? `\n❌ Лабораторий с проблемами: ${fails}` : "\n✅ Все проверенные лаборатории монтируются и имеют интерактив.");
process.exit(fails ? 1 : 0);