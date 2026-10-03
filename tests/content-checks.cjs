/* ============================================================
   CyberPath — глубокая проверка контента заданий (проверки 11–24).
   Вызывается из validate.cjs: module.exports = function (sandbox) { … }
   Чистота вариантов ответа, дубли, однозначность, достижимость
   флагов в песочнице и выравнивание RU/EN-переводов.
   ============================================================ */
const fs = require("fs");
const path = require("path");
const { allTasks, root } = require("./load.cjs");

module.exports = function contentChecks(sandbox) {
  const errors = [];
  const warns = [];
  let checks = 0;
  const ok = (cond, msg) => { checks++; if (!cond) errors.push(msg); };
  const warn = (cond, msg) => { if (!cond) warns.push(msg); };

  const HTML_TAG = /<\/?[a-zA-Z][^>]*>|&[a-z]+;|&#\d+;/;
  const TYPO = /[\u00A0\u2018\u2019\u201C\u201D\u2013\u2014\u2026]/; // nbsp, ёлочки, тире, …
  const INVISIBLE = /[\u00A0\u200B\u200C\u200D\u2060\uFEFF]/; // невидимые символы — всегда ошибка
  const CYR = /[\u0400-\u04FF]/;
  const normalize = (s) => String(s).trim().toLowerCase().replace(/\s+/g, " ");
  const squash = (s) => normalize(s).replace(/[\s\-_.:'"]/g, "");

  const rows = allTasks(sandbox);
  const CONTENT_EN = sandbox.CONTENT_EN || {};

  /* Сырьё js/*.js — ищем флаги sandbox-заданий (в ФС песочницы и в лабораториях) */
  const blobs = fs.readdirSync(path.join(root, "js"))
    .filter((f) => f.endsWith(".js"))
    .map((f) => fs.readFileSync(path.join(root, "js", f), "utf8"));
  (function collect(node) {
    if (!node || typeof node !== "object") return;
    Object.values(node).forEach((v) => {
      if (v && typeof v === "object" && v.type === "file") blobs.push(JSON.stringify(v.content || ""));
      else if (v && typeof v === "object" && !Array.isArray(v)) collect(v);
    });
  })(sandbox.Sandbox && sandbox.Sandbox.FS);

  const answersOf = (t) => t.answers || (t.answer ? [t.answer] : []);

  rows.forEach(({ task: t }) => {
    const id = t.id;
    const ans = answersOf(t);

    /* 11. Обязательные поля */
    ok(String(t.title || "").trim().length > 0, `${id}: пустое название`);
    ok(String(t.prompt || "").trim().length > 0, `${id}: пустой prompt`);
    ok(Number.isFinite(t.points) && t.points > 0, `${id}: некорректный points (${t.points})`);
    ok(["info", "question", "choice", "flag", "lab", "match", "order"].includes(t.type), `${id}: неизвестный тип "${t.type}"`);

    /* 12. Чистота вариантов: UI вставляет options как innerHTML (теги сломают
          сравнение с эталоном), а answers — как текст поля ввода */
    const typed = t.type === "question" || t.type === "flag";
    const fields = [["answers", ans], ["options", t.options], ["items", t.items]].filter(([, v]) => Array.isArray(v));
    fields.forEach(([name, arr]) => {
      arr.forEach((v) => {
        ok(!HTML_TAG.test(String(v)), `${id}: HTML/сущность в ${name}: "${v}"`);
        ok(String(v).trim() === String(v), `${id}: лишние пробелы по краям в ${name}: "${v}"`);
        ok(!/\s{2,}/.test(String(v)), `${id}: двойные пробелы в ${name}: "${v}"`);
        if (name === "answers" && typed) ok(!TYPO.test(String(v)), `${id}: типографские символы (nbsp/тире/ёлочки) в ответе: "${v}"`);
        else warn(!TYPO.test(String(v)), `${id}: типографские символы (nbsp/тире/ёлочки) в ${name}: "${v}"`);
        warn(String(v).length <= 160, `${id}: слишком длинный вариант (${String(v).length} симв.) в ${name}`);
      });
    });

    /* 13. Дубли (в т.ч. после нормализации регистра и пробелов) */
    fields.forEach(([name, arr]) => {
      const seen = new Map();
      arr.forEach((v) => {
        const k = normalize(v);
        if (seen.has(k)) errors.push(`${id}: дубль в ${name} — "${v}" и "${seen.get(k)}"`);
        else seen.set(k, v);
      });
      warn(new Set(arr.map(squash)).size === arr.length,
        `${id}: в ${name} есть значения, различимые только пробелами/дефисами (проверьте, что это осознанно)`);
    });

    /* 14. «ё» в эталоне (только для ввода текстом): пользователь набирает «е» */
    if (typed) ans.forEach((a) => {
      if (/ё/i.test(String(a))) {
        const alt = String(a).replace(/ё/gi, "е");
        ok(ans.some((b) => normalize(b) === normalize(alt)), `${id}: ответ "${a}" содержит «ё» — добавьте вариант "${alt}"`);
      }
    });

    /* 15. Знаки препинания в конце эталона */
    ans.forEach((a) => ok(!/[.?!]$/.test(String(a).trim()), `${id}: ответ заканчивается знаком препинания: "${a}"`));

    /* 16. Флаги: либо все ответы в формате CYBER{...}, либо ни один */
    if (t.type === "flag") {
      const flagged = ans.filter((a) => /^CYBER\{/i.test(String(a)));
      ok(flagged.length === 0 || flagged.length === ans.length,
        `${id}: смешанные флаги CYBER{...} и обычные значения: ${ans.join(" / ")}`);
      flagged.forEach((a) => ok(/^CYBER\{[A-Za-z0-9_\-]+\}$/.test(String(a)), `${id}: флаг не в формате CYBER{...}: "${a}"`));
    }

    /* 17. choice: 3–6 вариантов, ответы среди вариантов */
    if (t.type === "choice") {
      ok(t.options.length >= 3, `${id}: у choice всего ${t.options.length} вариантов`);
      ok(t.options.length <= 6, `${id}: у choice ${t.options.length} вариантов — слишком много`);
      t.answers.forEach((a) => ok(t.options.includes(a), `${id}: ответ "${a}" отсутствует среди вариантов`));
    }

    /* 18. match/order: без повторов, иначе решение неоднозначно */
    if (t.type === "match") {
      ok(Array.isArray(t.pairs) && t.pairs.length >= 3, `${id}: match с ${(t.pairs || []).length} парами`);
      const L = (t.pairs || []).map((x) => x[0]), R = (t.pairs || []).map((x) => x[1]);
      ok(new Set(L).size === L.length, `${id}: match — повторяющиеся левые элементы`);
      ok(new Set(R).size === R.length, `${id}: match — повторяющиеся правые элементы (неоднозначно)`);
    }
    if (t.type === "order") {
      ok(Array.isArray(t.items) && t.items.length >= 3, `${id}: order с ${(t.items || []).length} элементами`);
      ok(new Set((t.items || []).map(squash)).size === (t.items || []).length, `${id}: order — повторяющиеся элементы (порядок неоднозначен)`);
    }

    /* 19. sandbox/flag: флаг должен реально лежать в файлах песочницы */
    if (t.sandbox && t.type === "flag") {
      ans.forEach((a) => ok(blobs.some((b) => b.includes(String(a))), `${id}: флаг "${a}" не найден в песочнице — его невозможно добыть`));
    }

    /* 20. Подсказки */
    if (t.type === "question" || t.type === "flag") {
      ok(Array.isArray(t.hints) && t.hints.length > 0, `${id}: нет подсказок`);
      (t.hints || []).forEach((h) => {
        ok(String(h).trim().length > 0, `${id}: пустая подсказка`);
        warn(!ans.some((a) => normalize(h) === normalize(a)), `${id}: подсказка дословно повторяет ответ`);
      });
    }

    /* 21. Объяснение (если заведено): запрещены только невидимые символы —
          «—» и «ёлочки» в тексте, который ни с чем не сравнивается, нормальны */
  if (t.explanation != null) {
    ok(String(t.explanation).trim().length > 15, `${id}: подозрительно короткое explanation`);
    ok(!INVISIBLE.test(String(t.explanation)), `${id}: невидимые символы (nbsp/zero-width) в explanation`);
  }
  });

  /* 22. Дубли названий задач внутри комнаты (копи-паст) */
  sandbox.COURSES.forEach((c) => c.rooms.forEach((r) => {
    const seen = new Set();
    r.tasks.forEach((t) => {
      const k = normalize(t.title);
      if (seen.has(k)) errors.push(`дубль названия в комнате ${c.id}/${r.id}: "${t.title}" (${t.id})`);
      seen.add(k);
    });
  }));

  /* 23. RU/EN: структурное выравнивание переводов */
  const WHY_EN = sandbox.CONTENT_EN_WHY || {};
  sandbox.I18N.apply("en");
  rows.forEach(({ course, room, task: ru }) => {
    const er = CONTENT_EN[course.id] && CONTENT_EN[course.id][room.id];
    const e = er && er.tasks && er.tasks[ru.id];
    if (!e) return;
    const [title, prompt, hints, x] = e;
    const at = `${course.id}/${room.id}/${ru.id}`;
    if (title) ok(!CYR.test(title), `EN ${at}: кириллица в title`);
    if (prompt) ok(!CYR.test(prompt), `EN ${at}: кириллица в prompt`);
    (hints || []).forEach((h) => ok(!CYR.test(h), `EN ${at}: кириллица в подсказке`));
    if (ru.options) {
      ok(Array.isArray(x && x.options) && x.options.length === ru.options.length,
        `EN ${at}: options ${x && x.options ? x.options.length : "нет"} против RU ${ru.options.length}`);
      (ru.answers || []).forEach((a) => {
        const idx = ru.options.indexOf(a);
        ok(x && x.options && x.options[idx], `EN ${at}: нет варианта на позиции правильного ответа (${idx})`);
      });
      ((x && x.options) || []).forEach((o, i) => {
        ok(!HTML_TAG.test(String(o)), `EN ${at}: HTML в option #${i}`);
        ok(!CYR.test(o), `EN ${at}: кириллица в option #${i}: "${o}"`);
      });
    }
    if (x && x.answers) (x.answers || []).forEach((a) => ok(!HTML_TAG.test(String(a)), `EN ${at}: HTML в EN-ответе "${a}"`));
    if (ru.pairs) ok(!(x && x.pairs) || x.pairs.length === ru.pairs.length, `EN ${at}: пары не совпадают по длине`);
    if (ru.items) ok(!(x && x.items) || x.items.length === ru.items.length, `EN ${at}: items не совпадают по длине`);
    if (ru.explanation) warn(!!(WHY_EN[ru.id] || (x && x.why)), `EN ${at}: у RU есть explanation, у EN нет перевода (js/en/why.js)`);
  });
  sandbox.I18N.apply("ru");

  /* 24. Покрытие переводами и объяснениями (информативно) */
  const withEN = rows.filter(({ course, room, task }) => {
    const er = CONTENT_EN[course.id] && CONTENT_EN[course.id][room.id];
    return !!(er && er.tasks && er.tasks[task.id]);
  }).length;
  const withWhy = rows.filter(({ task }) => !!task.explanation).length;
  const whyEn = Object.keys(WHY_EN);
  whyEn.forEach((id) => {
    ok(rows.some((r) => r.task.id === id), `EN-разбор без задания: "${id}" (нет такого task id)`);
  });
  warn(whyEn.length === withWhy, `EN-разборов: ${whyEn.length}, RU-разборов: ${withWhy}`);

  return { errors, warns, checks, stats: { total: rows.length, withEN, withWhy } };
};