/* Анализ наполнения курсов: сколько заданий/лаб/XP на курс и комнату,
   какие лабы есть, где «дыры» в покрытии тем.
   Запуск: node tests/coverage.cjs */
const { loadAll, allTasks } = require("./load.cjs");
const sb = loadAll();
const COURSES = sb.COURSES;
const Labs = sb.Labs;
const labKeys = Labs && typeof Labs.keys === "function" ? [...Labs.keys()] : [];

const rows = [];
COURSES.forEach((c) => {
  const tasks = c.rooms.flatMap((r) => r.tasks);
  const byType = {};
  tasks.forEach((t) => { byType[t.type] = (byType[t.type] || 0) + 1; });
  const xp = tasks.reduce((s, t) => s + (t.points || 0), 0);
  const labs = tasks.filter((t) => t.type === "lab");
  rows.push({
    id: c.id, title: c.title, level: c.level,
    rooms: c.rooms.length, tasks: tasks.length, xp,
    byType,
    labs: labs.length,
    labIds: labs.map((l) => l.lab),
    perRoom: +(tasks.length / c.rooms.length).toFixed(1),
    prereq: (c.prereq || []).join(",") || "—",
  });
});

const pad = (s, n) => String(s).padEnd(n);
console.log("Курс".padEnd(26) + pad("уров.", 10) + pad("комнат", 8) + pad("задач", 8) + pad("на комн.", 11) + pad("лаб", 6) + pad("XP", 7) + " типы");
rows.forEach((r) => {
  console.log(
    pad(r.title, 26) + pad(r.level, 10) + pad(r.rooms, 8) + pad(r.tasks, 8) +
    pad(r.perRoom, 11) + pad(r.labs, 6) + pad(r.xp, 7) +
    " " + Object.entries(r.byType).map(([k, v]) => `${k}:${v}`).join(" ")
  );
});

console.log("\nЛабы по курсам:");
rows.forEach((r) => console.log(`  ${pad(r.id, 14)} ${r.labs ? r.labIds.join(", ") : "— нет лабораторных"}`));

const used = new Set(rows.flatMap((r) => r.labIds));
console.log("\nНеиспользуемые лабы:", labKeys.filter((k) => !used.has(k)).join(", ") || "—");
console.log("Лабы без задания:", used.size, "из", labKeys.length, "объявленных");

console.log("\nТонкие места (по 4+ показателям):");
const avg = rows.reduce((s, r) => s + r.tasks, 0) / rows.length;
rows.filter((r) => r.tasks < avg || r.labs === 0)
  .sort((a, b) => a.tasks - b.tasks)
  .forEach((r) => {
    const why = [];
    if (r.labs === 0) why.push("нет лаборатории");
    if (r.tasks < avg) why.push(`заданий ${r.tasks} < среднего ${avg.toFixed(0)}`);
    if (r.perRoom < 6) why.push(`в комнате ${r.perRoom} заданий`);
    if (!r.prereq || r.prereq === "—") why.push("без пререквизитов (свободный вход)");
    console.log(`  ${r.id}: ${why.join("; ")}`);
  });

console.log("\nВсего заданий:", allTasks(sb).length, "· лаб объявлено:", labKeys.length);