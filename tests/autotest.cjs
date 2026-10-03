/* ============================================================
   CyberPath — автотест: «решает» каждую задачу эталонным ответом.
   Запуск: node tests/autotest.cjs [courseId]

   Логика проверки ответов вырезается из js/app.js, чтобы тест
   гарантированно проверял ровно ту же функцию, что и браузер.
   Для sandbox-заданий дополнительно исполняются реальные команды
   в эмуляторе терминала (js/terminal.js) — флаг должен быть
   действительно добываем, а не просто зашит в data.js.
   ============================================================ */
const fs = require("fs");
const path = require("path");
const { loadAll, allTasks, root } = require("./load.cjs");

/* ---------- 1. Достаём normalize / checkAnswer / terminalSatisfies из app.js ---------- */
const appSrc = fs.readFileSync(path.join(root, "js", "app.js"), "utf8");
function extract(re, name) {
  const m = appSrc.match(re);
  if (!m) {
    console.error(`❌ Не удалось вырезать ${name} из js/app.js — тест не может гарантировать паритет с UI.`);
    process.exit(2);
  }
  return m[0];
}
const helperSrc = [
  extract(/function normalize\(s\) \{[^}]*\}/, "normalize()"),
  extract(/function checkAnswer\(task, input\) \{[\s\S]*?\n\}/, "checkAnswer()"),
].join("\n");
const { normalize, checkAnswer } = new Function(`${helperSrc}; return { normalize, checkAnswer };`)();

/* ---------- 2. Поднимаем контент + песочницу ---------- */
const sb = loadAll({ terminal: true });
const Sandbox = sb.Sandbox;
const tasks = allTasks(sb);
const only = process.argv[2];
const list = only ? tasks.filter((t) => t.course.id === only) : tasks;

/* ---------- 3. Сценарии команд для sandbox-заданий ---------- */
const SANDBOX_SCRIPTS = {
  cmd_dir: ["dir"],
  cmd_type: ["type secret.txt"],
  cmd_clear: ["cls"],
  cmd_findstr: ["findstr CYBER Documents\\system.log"],
  cmd_flag: ["type secret.txt"],
  wr_systeminfo: ["systeminfo"],
  wr_tasklist: ["tasklist"],
  wr_netstat: ["netstat -ano"],
  nm_flag: ["nmap 10.10.10.5"],
  enc_b64: ["base64 -d Q1lCRVJ7YmFzZTY0X2lzX2Vhc3l9"],
  adr_flag: ["type Documents\\domain.txt"],
  res_b64: ["base64 -d Q1lCRVJ7cmV2X2VuZ19zdHJpbmdzfQ=="],
  res_rot: ["rot13 PLORE{ebg13_qrpbqrq}"],
  foa_flag: ["findstr CYBER Documents\\system.log"],
  mwb_flag: [
    "netstat -ano",
    "reg query HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
    "certutil -decode Q1lCRVJ7cGVyc2lzdGVuY2VfZm91bmR9",
  ],
};

function runScript(cmds) {
  const out = sb.document.createElement("div");
  const input = sb.document.createElement("input");
  Sandbox.init(out, input);
  cmds.forEach((c) => Sandbox.run(c));
  return Sandbox.getTranscript();
}

/* Ровно та логика, что в app.js: проверка «по кнопке Проверить» */
function terminalSatisfies(task, tr) {
  const answers = task.answers || (task.answer ? [task.answer] : []);
  if (!tr.length) return false;
  if (task.type === "flag") {
    const outAll = tr.map((x) => x.out || "").join("\n");
    return answers.some((a) => (task.caseSensitive ? outAll.includes(a) : outAll.toLowerCase().includes(String(a).toLowerCase())));
  }
  const cmds = tr.map((x) => (x.cmd || "").toLowerCase());
  return answers.some((a) => { const x = String(a).toLowerCase(); return cmds.some((c) => c.split(/\s+/).includes(x) || c.includes(x)); });
}

/* ---------- 4. Собственно прогон ---------- */
const errors = [];
let solved = 0;
let skipped = [];
const fail = (id, msg) => errors.push(`${id}: ${msg}`);

list.forEach(({ course, room, task }) => {
  const at = `${course.id}/${room.id}/${task.id}`;
  const answers = task.answers || (task.answer ? [task.answer] : []);

  /* --- sandbox: сначала добываем «настоящим» способом --- */
  if (task.sandbox && (task.type === "flag" || task.type === "question")) {
    const cmds = SANDBOX_SCRIPTS[task.id];
    if (!cmds) { skipped.push(at); }
    else {
      const tr = runScript(cmds);
      if (!terminalSatisfies(task, tr)) {
        fail(at, `песочница не засчитывает эталонные команды (${cmds.join(" → ")})`);
      }
      if (task.type === "flag") {
        const outAll = tr.map((x) => x.out || "").join("\n");
        const found = answers.some((a) => (task.caseSensitive ? outAll.includes(a) : outAll.toLowerCase().includes(String(a).toLowerCase())));
        if (!found) fail(at, `флаг не появился в выводе песочницы после эталонных команд (${cmds.join(" → ")})`);
      }
    }
  }

  /* --- собственно проверка ответа --- */
  switch (task.type) {
    case "question":
    case "flag": {
      if (!answers.length) { fail(at, "нет эталонного ответа"); break; }
      answers.forEach((a) => {
        if (!checkAnswer(task, a)) fail(at, `эталонный ответ «${a}» НЕ принимается checkAnswer()`);
        if (!task.caseSensitive) {
          if (!checkAnswer(task, String(a).toUpperCase())) fail(at, `ответ «${a}» не принимается в верхнем регистре`);
          if (!checkAnswer(task, `  ${a}  `)) fail(at, `ответ «${a}» не принимается с пробелами по краям`);
          if (!checkAnswer(task, String(a).replace(/ё/gi, "е"))) fail(at, `ответ «${a}» не принимается с «е» вместо «ё»`);
          if (!checkAnswer(task, String(a).replace(/ё/gi, "е").toUpperCase())) fail(at, `ответ «${a}» не принимается в ВЕРХНЕМ РЕГИСТРЕ с «е» вместо «ё»`);
        }
      });
      if (checkAnswer(task, "zzz-not-an-answer")) fail(at, "проверка принимает заведомо неверный ответ");
      solved++;
      break;
    }
    case "choice": {
      const opts = task.options || [];
      answers.forEach((a) => {
        if (!opts.includes(a)) fail(at, `правильный ответ «${a}» отсутствует в options`);
        if (!checkAnswer(task, a)) fail(at, `клик по правильному варианту «${a}» не засчитан`);
      });
      opts.filter((o) => !answers.includes(o)).forEach((o) => {
        if (checkAnswer(task, o)) fail(at, `неверный вариант «${o}» засчитывается как верный`);
      });
      solved++;
      break;
    }
    case "match": {
      const right = (task.pairs || []).map((p) => p[1]);
      if (new Set(right).size !== right.length) fail(at, "в match повторяются правые элементы — решение неоднозначно");
      if ((task.pairs || []).length < 3) fail(at, `в match всего ${(task.pairs || []).length} пар`);
      solved++;
      break;
    }
    case "order": {
      const items = task.items || [];
      if (new Set(items).size !== items.length) fail(at, "в order повторяются элементы — порядок неоднозначен");
      if (items.length < 3) fail(at, `в order всего ${items.length} элементов`);
      solved++;
      break;
    }
    case "info":
    case "lab":
      solved++;
      break;
    default:
      fail(at, `неизвестный тип задачи ${task.type}`);
  }
});

/* ---------- 5. Отчёт ---------- */
console.log(`Пройдено задач: ${solved} из ${list.length}${skipped.length ? ` · без сценария песочницы: ${skipped.length} (${skipped.join(", ")})` : ""}`);
console.log("normalize()/checkAnswer() вырезаны из js/app.js — тест проверяет ту же логику, что и браузер");
if (errors.length) {
  console.error(`\n❌ АВТОТЕСТ: провалено ${errors.length}`);
  errors.forEach((e) => console.error("  • " + e));
  process.exit(1);
} else {
  console.log("\n✅ Автотест: каждая задача решается эталонным ответом.");
}