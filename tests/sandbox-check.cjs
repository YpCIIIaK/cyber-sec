/* Диагностика песочницы: показывает реальный вывод эталонных команд.
   Запуск: node tests/sandbox-check.cjs */
const { loadAll } = require("./load.cjs");
const sb = loadAll({ terminal: true });
const Sandbox = sb.Sandbox;
const out = sb.document.createElement("div");
const input = sb.document.createElement("input");
Sandbox.init(out, input);

const scripts = [
  ["cmd_flag", "type secret.txt"],
  ["nm_flag", "nmap 10.10.10.5"],
  ["enc_b64", "base64 -d Q1lCRVJ7YmFzZTY0X2lzX2Vhc3l9"],
  ["adr_flag", "type Documents\\domain.txt"],
  ["res_rot", "rot13 PLORE{ebg13_qrpbqrq}"],
  ["foa_flag", "findstr CYBER Documents\\system.log"],
  ["mwb_flag", "reg query HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"],
  ["mwb_flag-2", "certutil -decode Q1lCRVJ7cGVyc2lzdGVuY2VfZm91bmR9"],
  ["cmd_dir", "dir"],
];
scripts.forEach(([id, cmd]) => {
  Sandbox.run(cmd);
  const tr = Sandbox.getTranscript();
  const last = tr[tr.length - 1] || {};
  console.log(`\n### ${id}: ${cmd}\n${last.out || "(пусто)"}`);
});