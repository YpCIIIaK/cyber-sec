/* ============================================================
   CyberPath — проверка целостности данных / data-integrity check
   Запуск: node tests/validate.cjs
   Загружает data.js / i18n.js / labs.js / toolkit.js в «псевдо-браузерном»
   контексте и проверяет согласованность контента: структура курсов,
   RU/EN-переводы, лаборатории, достижения, глоссарий, миссии,
   чистоту вариантов ответа и достижимость флагов в песочнице.
   Код выхода 1 при ошибках.

   Глубокие проверки заданий вынесены в tests/content-checks.cjs.
   ============================================================ */
const { loadAll } = require("./load.cjs");
const contentChecks = require("./content-checks.cjs");

const sandbox = loadAll();
const { COURSES, GLOSSARY, ACHIEVEMENTS, ACH_RARITY, DAILY_QUESTIONS, MISSIONS } = sandbox;
const Labs = sandbox.Labs;
const CONTENT_EN = sandbox.CONTENT_EN || {};

const errors = [];
const warns = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) errors.push(msg); };
const CYR = /[\u0400-\u04FF]/;

/* 1. Уникальность id задач */
const taskIds = {};
COURSES.forEach((c) => c.rooms.forEach((r) => r.tasks.forEach((t) => {
  if (taskIds[t.id]) errors.push(`Дубликат id задачи: "${t.id}" (${c.id}/${r.id} и ${taskIds[t.id]})`);
  taskIds[t.id] = `${c.id}/${r.id}`;
})));
checks++;

/* 2. Уникальность id комнат и курсов */
const courseIds = new Set();
COURSES.forEach((c) => {
  ok(!courseIds.has(c.id), `Дубликат id курса: ${c.id}`); courseIds.add(c.id);
  const roomIds = new Set();
  c.rooms.forEach((r) => { ok(!roomIds.has(r.id), `Дубликат id комнаты ${r.id} в курсе ${c.id}`); roomIds.add(r.id); });
});

/* 3. Каждая lab-задача ссылается на существующую лабораторию */
COURSES.forEach((c) => c.rooms.forEach((r) => r.tasks.forEach((t) => {
  if (t.type === "lab") ok(Labs && Labs.has(t.lab), `Лаборатория "${t.lab}" (задача ${t.id}) не найдена в Labs`);
})));

/* 4. Каждый prereq указывает на существующий курс */
COURSES.forEach((c) => (c.prereq || []).forEach((pr) => ok(courseIds.has(pr), `Курс ${c.id}: несуществующий prereq "${pr}"`)));

/* 5. Задачи с проверкой имеют ответы/опции */
COURSES.forEach((c) => c.rooms.forEach((r) => r.tasks.forEach((t) => {
  if (t.type === "question") ok((t.answers && t.answers.length) || t.answer, `Задача ${t.id}: question без ответа`);
  if (t.type === "choice") {
    ok(t.options && t.options.length, `Задача ${t.id}: choice без options`);
    ok(t.answers && t.answers.length, `Задача ${t.id}: choice без answers`);
    ok(!t.answers || t.answers.every((a) => t.options.includes(a)), `Задача ${t.id}: answer не входит в options`);
  }
  if (t.type === "flag") ok(t.answers && t.answers.length, `Задача ${t.id}: flag без ответа`);
})));

/* 6. GLOSSARY и GLOSS_EN выровнены (через применение EN) */
const ruLen = GLOSSARY.length;
sandbox.I18N.apply("en");
const enMissing = GLOSSARY.filter((g) => !g.term).length;
ok(enMissing === 0, `GLOSSARY: ${enMissing} пустых EN-терминов (рассинхрон с GLOSS_EN?)`);
sandbox.I18N.apply("ru");
ok(GLOSSARY.length === ruLen, "GLOSSARY: длина изменилась после переключения языка");

/* 7. DAILY_QUESTIONS переводятся (нет пустых) */
sandbox.I18N.apply("en");
const dqEmpty = DAILY_QUESTIONS.filter((d) => !d.q).length;
ok(dqEmpty === 0, `DAILY_QUESTIONS: ${dqEmpty} вопросов без текста в EN`);
const dqCyr = DAILY_QUESTIONS.filter((d) => CYR.test(d.q)).length;
ok(dqCyr === 0, `DAILY_QUESTIONS: ${dqCyr} EN-вопросов с кириллицей (нет перевода)`);
sandbox.I18N.apply("ru");

/* 8. Достижения: у каждого есть rarity; metric-достижения имеют goal */
ACHIEVEMENTS.forEach((a) => {
  ok(ACH_RARITY[a.id], `Достижение ${a.id}: нет записи в ACH_RARITY`);
  if (a.metric) ok(typeof a.goal === "number" && a.goal > 0, `Достижение ${a.id}: metric без корректного goal`);
});

/* 9. CONTENT_EN: каждый курс/комната/задача ссылается на реальные id */
Object.keys(CONTENT_EN).forEach((cid) => {
  const course = COURSES.find((c) => c.id === cid);
  ok(course, `CONTENT_EN: неизвестный курс "${cid}"`);
  if (!course) return;
  Object.keys(CONTENT_EN[cid]).forEach((rid) => {
    const room = course.rooms.find((r) => r.id === rid);
    ok(room, `CONTENT_EN: ${cid} — неизвестная комната "${rid}"`);
    if (!room) return;
    const er = CONTENT_EN[cid][rid];
    Object.keys(er.tasks || {}).forEach((tid) => {
      ok(room.tasks.some((t) => t.id === tid), `CONTENT_EN: ${cid}/${rid} — неизвестная задача "${tid}"`);
    });
  });
});

/* 10. MISSIONS: уникальные id и наличие флага */
const misIds = new Set();
(MISSIONS || []).forEach((m) => {
  ok(!misIds.has(m.id), `Дубликат миссии ${m.id}`); misIds.add(m.id);
  ok(/^CYBER\{.+\}$/.test(m.flag), `Миссия ${m.id}: некорректный флаг`);
});

/* 11–24. Глубокая проверка заданий (варианты, дубли, sandbox, RU/EN) */
const deep = contentChecks(sandbox);
deep.errors.forEach((e) => errors.push(e));
deep.warns.forEach((w) => warns.push(w));
checks += deep.checks;

/* ---- Итог ---- */
const totalTasks = Object.keys(taskIds).length;
const { total, withEN, withWhy } = deep.stats;
console.log(`Курсов: ${COURSES.length} · комнат: ${COURSES.reduce((s, c) => s + c.rooms.length, 0)} · задач: ${totalTasks} · лаб: ${COURSES.reduce((s, c) => s + c.rooms.reduce((a, r) => a + r.tasks.filter((t) => t.type === "lab").length, 0), 0)}`);
console.log(`EN-перевод: ${withEN}/${total} задач · объяснения (explanation): ${withWhy}/${total}`);
console.log(`Глоссарий: ${GLOSSARY.length} · достижений: ${ACHIEVEMENTS.length} · вопросов дня: ${DAILY_QUESTIONS.length} · миссий: ${(MISSIONS || []).length}`);
console.log(`Проверок выполнено: ${checks + totalTasks}`);

if (warns.length) {
  console.warn(`\n⚠️  Предупреждений: ${warns.length}`);
  warns.slice(0, 40).forEach((w) => console.warn("  • " + w));
  if (warns.length > 40) console.warn(`  … ещё ${warns.length - 40}`);
}

if (errors.length) {
  console.error(`\n❌ НАЙДЕНО ОШИБОК: ${errors.length}`);
  errors.forEach((e) => console.error("  • " + e));
  process.exit(1);
} else {
  console.log("\n✅ Все проверки целостности пройдены.");
}