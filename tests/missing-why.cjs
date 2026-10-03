/* Список заданий с вариантами ответа, у которых ещё нет разбора (explanation).
   Запуск: node tests/missing-why.cjs [courseId] */
const { loadAll, allTasks } = require("./load.cjs");
const sb = loadAll();
const only = process.argv[2];
const graded = allTasks(sb).filter((t) => ["choice", "flag", "match", "order", "question"].includes(t.task.type));
const missing = graded.filter((t) => !t.task.explanation);
console.log(`Заданий с проверкой: ${graded.length} · с разбором: ${graded.length - missing.length} · без разбора: ${missing.length}`);
const byCourse = {};
missing.forEach(({ course, task }) => { (byCourse[course.id] = byCourse[course.id] || []).push(`${task.id} (${task.type})`); });
Object.keys(byCourse).forEach((cid) => {
  if (only && cid !== only) return;
  console.log(`\n${cid}: ${byCourse[cid].length}`);
  console.log("  " + byCourse[cid].join(", "));
});