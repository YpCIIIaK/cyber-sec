/* Выгружает все задачи в компактном виде для ревью фактов.
   Использование: node tests/dump.cjs [courseId] */
const { loadAll, allTasks } = require("./load.cjs");
const sb = loadAll();
const only = process.argv[2];
const tasks = allTasks(sb).filter((t) => !only || t.course.id === only);

let cur = "";
tasks.forEach(({ course, room, task }) => {
  const key = `${course.id} / ${room.id}`;
  if (key !== cur) { cur = key; console.log(`\n===== ${course.title} :: ${room.title} (${course.id}/${room.id}) =====`); }
  const lines = [`[${task.id}] (${task.type}) ${task.title}`];
  lines.push(`  prompt: ${String(task.prompt).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}`);
  if (task.options) lines.push(`  options: ${task.options.map((o) => `[${o}]`).join(" ")}`);
  if (task.answers) lines.push(`  answers: ${task.answers.map((a) => `[${a}]`).join(" ")}`);
  if (task.answer) lines.push(`  answer: [${task.answer}]`);
  if (task.items) lines.push(`  items: ${task.items.join(" > ")}`);
  if (task.pairs) lines.push(`  pairs: ${task.pairs.map((p) => p.join("=")).join(", ")}`);
  if (task.lab) lines.push(`  lab: ${task.lab}`);
  if (task.sandbox) lines.push(`  SANDBOX: да`);
  if (task.caseSensitive) lines.push(`  caseSensitive: да`);
  if (task.explanation) lines.push(`  WHY: ${task.explanation}`);
  console.log(lines.join("\n"));
});
console.log(`\nВсего: ${tasks.length}`);