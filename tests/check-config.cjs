#!/usr/bin/env node
/* Проверяет js/config.js: туда можно класть только публичный anon/publishable-ключ Supabase.
   Секретный ключ (service_role / sb_secret_) в браузере = полный доступ к базе в обход RLS. */
const fs = require("fs"), path = require("path"), vm = require("vm");
const file = path.join(__dirname, "..", "js", "config.js");
const src = fs.readFileSync(file, "utf8");
const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(src, ctx);
const cfg = ctx.window.CYBERPATH_CONFIG || {};
const fail = (m) => { console.error("❌ config.js: " + m); process.exit(1); };

if (/sb_secret_/i.test(src)) fail("найден секретный ключ sb_secret_… — используйте publishable/anon-ключ.");
for (const tok of src.match(/eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g) || []) {
  let payload = {};
  try { payload = JSON.parse(Buffer.from(tok.split(".")[1], "base64url").toString("utf8")); } catch (e) { fail("не удалось разобрать JWT-ключ."); }
  if (payload.role !== "anon") fail(`ключ с ролью "${payload.role}" — в браузер можно класть только anon-ключ.`);
}
if (cfg.supabaseUrl && !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(cfg.supabaseUrl)) fail("supabaseUrl должен иметь вид https://<ref>.supabase.co");
if (!/^[a-z0-9.-]+$/i.test(cfg.pseudoEmailDomain || "")) fail("pseudoEmailDomain некорректен.");
const sql = fs.readFileSync(path.join(__dirname, "..", "supabase", "schema.sql"), "utf8");
if (!sql.includes(`select '${cfg.pseudoEmailDomain}'`)) fail("pseudoEmailDomain не совпадает с cp_pseudo_domain() в supabase/schema.sql.");
console.log("✅ config.js: секретных ключей нет" + (cfg.supabaseUrl ? ", облако настроено." : ", облако выключено (локальный режим)."));
