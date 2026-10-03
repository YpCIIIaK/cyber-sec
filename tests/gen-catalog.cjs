#!/usr/bin/env node
/* Генерирует supabase/catalog.sql из js/data.js — каталог заданий и их стоимость в XP.
   По нему база считает очки рейтинга. Запуск: node tests/gen-catalog.cjs [--check] */
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const out = path.join(root, "supabase", "catalog.sql");

function build() {
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, "js/data.js"), "utf8") + ";this.__C = COURSES; this.__M = MISSIONS; this.__D = DAILY_BONUS;", ctx);
  const rows = [];
  for (const c of ctx.__C) for (const r of c.rooms) for (const t of r.tasks) {
    if (!/^[A-Za-z0-9_]{1,64}$/.test(t.id)) throw new Error("Недопустимый id задания: " + t.id);
    rows.push(`  ('${t.id}', '${c.id}', ${Math.max(0, Math.min(500, t.points | 0))})`);
  }
  // Разовые бонусы: стоимость берём из кода сайта, чтобы сервер и браузер совпадали
  const app = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
  const tk = fs.readFileSync(path.join(root, "js/toolkit.js"), "utf8");
  const num = (re, src, name) => { const m = src.match(re); if (!m) throw new Error("Не найдено: " + name); return +m[1]; };
  const examXP = num(/const EXAM_BONUS = (\d+)/, app, "EXAM_BONUS");
  const bossXP = num(/const BOSS = \{[^}]*bonus: (\d+)/, app, "BOSS.bonus");
  const weeklyXP = num(/const WEEKLY = \{[^}]*bonus: (\d+)/, app, "WEEKLY.bonus");
  const flagXP = num(/api\.award\((\d+), key, "flags"\)/, tk, "flag award");
  const flagsBlock = tk.match(/const FLAGS = \{([\s\S]*?)\};/);
  if (!flagsBlock) throw new Error("Не найдено: FLAGS");
  const bon = [];
  const add = (key, xp, cid) => { if (!/^[a-z_:0-9]{1,64}$/.test(key)) throw new Error("Недопустимый ключ бонуса: " + key); bon.push(`  ('${key}', ${xp}, ${cid ? `'${cid}'` : "null"})`); };
  for (const c of ctx.__C) { add("exam:" + c.id, examXP, c.id); add("boss:" + c.id, bossXP, c.id); }
  for (const m of ctx.__M) add("mission:" + m.id, m.points | 0, null);
  for (const [, key, xp] of tk.matchAll(/solved\("([a-z_]+)", (\d+)\)/g)) if (!bon.some((b) => b.includes(`'tool:${key}'`))) add("tool:" + key, +xp, null);
  for (const [, t] of flagsBlock[1].matchAll(/^\s*([a-z]+):/gm)) add("flag:" + t, flagXP, null);
  // Магазин: предметы из js/shop.js
  const sctx = { window: {}, console }; vm.createContext(sctx);
  vm.runInContext(fs.readFileSync(path.join(root, "js/shop.js"), "utf8") + ";this.__S = SHOP_ITEMS; this.__R = SHOP_REQS;", sctx);
  const shop = [], seen = new Set();
  for (const it of sctx.__S) {
    if (!/^[a-z0-9_]{2,40}$/.test(it.id) || seen.has(it.id)) throw new Error("Плохой/повторный id предмета: " + it.id);
    if (!["frame", "nick", "title", "bg", "effect"].includes(it.kind)) throw new Error("Плохой kind: " + it.id);
    if (it.req && !sctx.__R[it.req]) throw new Error("Неизвестное условие " + it.req + " у " + it.id);
    if (it.price == null && !it.req) throw new Error("Нет ни цены, ни условия: " + it.id);
    seen.add(it.id);
    shop.push(`  ('${it.id}', '${it.kind}', ${it.price == null ? "null" : it.price | 0}, ${it.req ? `'${it.req}'` : "null"})`);
  }
  add("daily", ctx.__D | 0, null);
  add("weekly", weeklyXP, null);

  return [
    "-- СГЕНЕРИРОВАНО tests/gen-catalog.cjs — не редактировать вручную.",
    "-- Каталог заданий CyberPath: стоимость каждого задания в XP для рейтинга.",
    "-- Выполнить в Supabase → SQL Editor после schema.sql (и после каждого изменения курсов).",
    "insert into public.task_catalog (task_id, course_id, points) values",
    rows.join(",\n"),
    "on conflict (task_id) do update set course_id = excluded.course_id, points = excluded.points;",
    "",
    "-- Разовые бонусы: экзамены, боссы, миссии, инструменты Blue Team, флаги, ежедневный и недельный.",
    "insert into public.bonus_catalog (key, xp, course_id) values",
    bon.join(",\n"),
    "on conflict (key) do update set xp = excluded.xp, course_id = excluded.course_id;",
    "",
    "-- Магазин кастомизации (из js/shop.js).",
    "insert into public.shop_items (id, kind, price, req) values",
    shop.join(",\n"),
    "on conflict (id) do update set kind = excluded.kind, price = excluded.price, req = excluded.req;",
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
  console.log("Записано:", path.relative(root, out), "—", sql.split("\n").filter((l) => l.startsWith("  (")).length, "строк (задания + бонусы)");
}
