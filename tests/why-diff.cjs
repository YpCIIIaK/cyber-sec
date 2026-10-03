/* Сверяет покрытие разборов RU (js/explanations.js) и EN (js/en/why.js).
   Запуск: node tests/why-diff.cjs */
const { loadAll, allTasks } = require("./load.cjs");
const sb = loadAll();
const ru = new Set(allTasks(sb).filter((t) => t.task.explanation).map((t) => t.task.id));
const en = new Set(Object.keys(sb.CONTENT_EN_WHY || {}));
console.log(`RU: ${ru.size} · EN: ${en.size}`);
console.log("Без EN-перевода:", [...ru].filter((id) => !en.has(id)).join(", ") || "—");
console.log("Без RU-разбора:", [...en].filter((id) => !ru.has(id)).join(", ") || "—");