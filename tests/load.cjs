/* ============================================================
   CyberPath — общий загрузчик данных для тестов/скриптов.
   Поднимает data.js / i18n.js / labs.js / toolkit.js в
   «псевдо-браузерном» контексте и отдаёт наружу контент.
   Используется validate.cjs, autotest.cjs и ad-hoc скриптами.
   ============================================================ */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

function createSandbox() {
  const el = () => ({
    innerHTML: "",
    textContent: "",
    value: "",
    parentElement: { scrollTop: 0, scrollHeight: 0 },
    style: {},
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild() {},
    setAttribute() {},
    addEventListener() {},
    querySelectorAll: () => [],
    focus() {},
  });
  const sandbox = {
    window: {},
    document: {
      documentElement: {},
      body: el(),
      querySelectorAll: () => [],
      getElementById: () => el(),
      createElement: () => el(),
    },
    localStorage: { getItem: () => null, setItem() {} },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    // Заглушки, нужные терминалу-песочнице и лабораториям
    atob: (s) => Buffer.from(s, "base64").toString("binary"),
    btoa: (s) => Buffer.from(s, "binary").toString("base64"),
    Progress: { bumpStat() {}, unlockAchievement() {}, award: () => ({ already: true }) },
    console,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}

/* terminal:true — дополнительно поднимает js/terminal.js (песочницу) */
function loadAll(opts) {
  const withTerminal = !!(opts && opts.terminal);
  const sandbox = createSandbox();
  const enDir = path.join(root, "js", "en");
  const enFiles = fs.existsSync(enDir) ? fs.readdirSync(enDir).map((f) => "js/en/" + f) : [];
  const LAB_FILES = ["js/labs_triage.js", "js/labs_ad.js", "js/labs_pe.js", "js/labs_hardening.js", "js/labs_blueteam.js", "js/labs_reverse2.js", "js/labs_osint.js", "js/labs_forensics.js", "js/labs_net.js"];
  const files = ["js/data.js", "js/labs.js", ...LAB_FILES, "js/toolkit.js", "js/icons.js", "js/explanations.js", "js/i18n.js", ...enFiles];
  if (withTerminal) files.push("js/terminal.js");
  const combined =
    files.map(read).join("\n;\n") +
    "\n;Object.assign(window, { COURSES, GLOSSARY, ACHIEVEMENTS, ACH_RARITY, DAILY_QUESTIONS, MISSIONS, Labs, Toolkit, I18N });";
  vm.runInContext(combined, sandbox, { filename: "combined.js" });
  return sandbox;
}

/* Плоский список всех задач: { course, room, task, taskRef } */
function allTasks(sandbox) {
  const out = [];
  const COURSES = sandbox.COURSES || [];
  COURSES.forEach((c) =>
    (c.rooms || []).forEach((r) =>
      (r.tasks || []).forEach((t) => out.push({ course: c, room: r, task: t }))
    )
  );
  return out;
}

/* Человекочитаемый путь задачи: courseId/roomId/taskId */
const taskPath = ({ course, room, task }) => `${course.id}/${room.id}/${task.id}`;

module.exports = { root, read, createSandbox, loadAll, allTasks, taskPath };