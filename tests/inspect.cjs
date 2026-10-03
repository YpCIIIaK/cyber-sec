/* Быстрый анализ структуры контента: типы задач и их поля. */
const { loadAll, allTasks } = require("./load.cjs");
const sb = loadAll();
const tasks = allTasks(sb);
const byType = {};
const fields = {};
tasks.forEach(({ task }) => {
  byType[task.type] = (byType[task.type] || 0) + 1;
  Object.keys(task).forEach((k) => {
    fields[k] = fields[k] || {};
    const t = task.type;
    fields[k][t] = (fields[k][t] || 0) + 1;
  });
});
console.log("Всего задач:", tasks.length);
console.log("Типы:", JSON.stringify(byType, null, 2));
console.log("\nПоля по типам:");
Object.keys(fields).sort().forEach((k) => console.log(" ", k.padEnd(18), JSON.stringify(fields[k])));

console.log("\nПримеры по типам:");
const seen = new Set();
tasks.forEach(({ task, course, room }) => {
  if (seen.has(task.type)) return;
  seen.add(task.type);
  console.log(`\n--- ${task.type} (${course.id}/${room.id}/${task.id}) ---`);
  console.log(JSON.stringify(task, null, 2).slice(0, 1500));
});