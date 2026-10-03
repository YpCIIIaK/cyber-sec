#!/usr/bin/env node
/* Генерирует supabase/catalog.sql из js/data.js — каталог заданий и их стоимость в XP.
   По нему база считает очки рейтинга. Запуск: node tests/gen-catalog.cjs [--check] */
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const out = path.join(root, "supabase", "catalog.sql");

function build() {
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, "js/data.js"), "utf8") + ";this.__C = COURSES;", ctx);
  const rows = [];
  for (const c of ctx.__C) for (const r of c.rooms) for (const t of r.tasks) {
    if (!/^[A-Za-z0-9_]{1,64}$/.test(t.id)) throw new Error("Недопустимый id задания: " + t.id);
    rows.push(`  ('${t.id}', '${c.id}', ${Math.max(0, Math.min(500, t.points | 0))})`);
  }
  return [
    "-- СГЕНЕРИРОВАНО tests/gen-catalog.cjs — не редактировать вручную.",
    "-- Каталог заданий CyberPath: стоимость каждого задания в XP для рейтинга.",
    "-- Выполнить в Supabase → SQL Editor после schema.sql (и после каждого изменения курсов).",
    "insert into public.task_catalog (task_id, course_id, points) values",
    rows.join(",\n"),
    "on conflict (task_id) do update set course_id = excluded.course_id, points = excluded.points;",
    "",
  ].join("\n");
}

const sql = build();
if (process.argv.includes("--check")) {
  const cur = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : "";
  if (cur !== sql) { console.error("❌ supabase/catalog.sql устарел — запустите: node tests/gen-catalog.cjs"); process.exit(1); }
  console.log("✅ supabase/catalog.sql актуален.");
} else {
  fs.writeFileSync(out, sql);
  console.log("Записано:", path.relative(root, out), "—", sql.split("\n").filter((l) => l.startsWith("  (")).length, "заданий");
}
