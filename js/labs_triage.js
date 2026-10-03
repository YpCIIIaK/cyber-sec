/* ============================================================
   CyberPath — лаборатории: триаж Windows-хоста и разбор журнала событий.
   Подключается ПОСЛЕ js/labs.js и регистрируется через Labs.register().
   Сценарии многошаговые: команда → вывод → находки → действие.
   ============================================================ */
(function () {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const t = (s) => (window.I18N ? I18N.t(s) : s);
  const term = (title, body) => `
    <div class="tw">
      <div class="tw-top"><span class="bw-dots"><i></i><i></i><i></i></span><span class="tw-title">${esc(title)}</span></div>
      <div class="tw-body">${body}</div>
    </div>`;

  /* ---- вывод команд для триажа (реалистичные листинги Windows) ---- */
  const TRIAGE_OUT = {
    systeminfo: `Host Name:                 FIN-WS-07
OS Name:                   Microsoft Windows 10 Pro
Version:                   10.0.19045
System Manufacturer:        Virtual Machine
Last Boot Time:             01.14.2026 9:02:11
Hotfix(s):                  [01]: KB5034441   [02]: KB5034773
                           [03]: KB5034123   [04]: KB5027397`,
    "whoami /priv": `USER INFORMATION
----------------
User                S-1-5-21-3159069389-1041821377-1307990391-1107
Group Information    Users, Administrators
Mandatory Label     Mandatory Level\\High Level

Privilege Name                  Description                    State
------------------------------  -----------------------------  ------
SeDebugPrivilege                Debug programs                 Enabled
SeImpersonatePrivilege          Impersonate a client           Enabled`,
    tasklist: `Image Name                     PID Session Name        Mem Usage
========================= ======== ================ ============
System Idle Process              0 Services                  8 K
explorer.exe                   6216 Console                184 240 K
msedge.exe                     6044 Console                312 880 K
svchost.exe                    1288 Services                 32 K
svhost32.exe                   3392 Console                 12 K
rundll32.exe                   2216 Console                 18 K`,
    "netstat -ano": `  Proto  Local Address        Foreign Address       State           PID
  TCP    0.0.0.0:3389          0.0.0.0:0               LISTENING       1288
  TCP    10.20.4.17:49682      185.220.101.47:443      ESTABLISHED     3392
  TCP    10.20.4.17:49690      91.243.44.12:8080       ESTABLISHED     2216
  TCP    10.20.4.17:49701      10.20.4.5:445           ESTABLISHED     1288`,
    "reg query HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run": `HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run
    OneDrive    REG_SZ    C:\\Users\\hacker\\AppData\\Local\\Microsoft\\OneDrive\\OneDrive.exe /background
    updater     REG_SZ    powershell -w hidden -enc SQBFAFgA`,
    "wevtutil qe Security /c:6 /rd:true /f:text": `  1: 4624 01.14.2026 11:58:03  user=hacker  logon type=10  src=185.220.101.47
  2: 4688 01.14.2026 11:58:05  parent=rundll32.exe  image=C:\\Users\\hacker\\AppData\\Local\\Temp\\svhost32.exe
  3: 4672 01.14.2026 11:58:06  user=hacker  assigned special privileges
  4: 1102 01.14.2026 12:01:44  The Security log was cleared
  5: 4625 01.14.2026 12:04:12  user=admin  logon type=3  status=0xC000006D
  6: 4688 01.14.2026 12:04:15  image=vssadmin.exe  delete shadows`,
  };
  const TRIAGE_CMDS = Object.keys(TRIAGE_OUT);

  /* ---- находки: три подтверждаемых и три «шумных» ---- */
  const FINDINGS = [
    { ok: 1, short: "В ключе Run — автозапуск <code>powershell -w hidden -enc …</code>",
      why: "Правка Run = закрепление: скрытое окно плюс base64-команда. Классическая точка автозапуска." },
    { ok: 1, short: "Процесс <code>svhost32.exe</code> запущен из <code>AppData\\Local\\Temp</code>",
      why: "Настоящий svchost.exe лежит в System32\\ — процесс из Temp с аргументом <code>-enc</code> явно посторонний." },
    { ok: 1, short: "Соединение на <code>185.220.101.47:443</code> от PID 3392 (тот же Temp-процесс)",
      why: "Исходящее соединение от скомпрометированного процесса — вероятный канал C2." },
    { ok: 0, short: "В системе работает <code>msedge.exe</code>",
      why: "Обычный браузер из профиля пользователя — легитимно, в находки не идёт." },
    { ok: 0, short: "<code>vssadmin delete shadows</code> в журнале",
      why: "Событие в 12:04 — это уже действия атакующего, а не находка для первого триажа; его оценят позже, при реагировании." },
    { ok: 0, short: "В профиле есть кэш Credential Manager и история браузера",
      why: "Их изучают по контексту, но как «компрометацию» отмечать нельзя — это обычные артефакты Windows." },
  ];

  /* ------------------------------------------------------------
     1. Триаж Windows-хоста: команды → вывод → находки → сдерживание
     ------------------------------------------------------------ */
  function wintriage(el, onSolve) {
    el.innerHTML = `
      <p class="lab-hint">${t("Хост FIN-WS-07 передали на триаж. Вам доступен PowerShell: выполняйте команды, читайте вывод, отметьте находки и выберите первое действие по сдерживанию.")}</p>
      <div class="tri-grid">
        ${term("PowerShell — FIN-WS-07", `
          <div class="tw-cmds" id="tri-cmds">${TRIAGE_CMDS.map((c) => `<button class="tw-chip" data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div>
          <pre class="tw-out" id="tri-out">PS C:\\Users\\hacker&gt; ${t("выберите команду сверху")}</pre>`)}
        <div class="tri-panel">
          <h4>${t("Находки триажа")}</h4>
          <div class="tri-finds" id="tri-finds">
            ${FINDINGS.map((f, i) => `<label class="tri-row" data-i="${i}"><input type="checkbox"><span>${f.short}</span></label>`).join("")}
          </div>
          <button class="btn btn-primary btn-sm" id="tri-check">${t("Проверить находки")}</button>
          <div class="lab-out" id="tri-out2"></div>
        </div>
      </div>
      <div class="tri-step" id="tri-step3" hidden>
        <h4>${t("Шаг 3. Первое действие по инциденту")}</h4>
        <div class="tri-acts" id="tri-acts">
          <button data-a="iso">${t("Изолировать хост от сети и снять дамп памяти")}</button>
          <button data-a="reboot">${t("Перезагрузить хост — «так точно чисто»")}</button>
          <button data-a="run">${t("Удалить ключ Run и продолжить работу")}</button>
          <button data-a="wait">${t("Ничего не трогать, дождаться подробностей от пользователя")}</button>
        </div>
        <div class="lab-out" id="tri-out3"></div>
      </div>`;

    const out = el.querySelector("#tri-out");
    const run = (c) => {
      const key = TRIAGE_CMDS.find((k) => k.toLowerCase() === String(c).trim().toLowerCase());
      out.textContent = key
        ? `PS C:\\Users\\hacker> ${c}\n\n${TRIAGE_OUT[key]}`
        : `PS C:\\Users\\hacker> ${c}\n\n${t("Команда не найдена или недостаточно прав. Попробуйте другую.")}`;
    };
    el.querySelectorAll("#tri-cmds .tw-chip").forEach((b) => b.addEventListener("click", () => run(b.dataset.c)));
    el.querySelectorAll(".tri-row").forEach((row) => {
      const cb = row.querySelector("input");
      row.addEventListener("click", (e) => { if (e.target !== cb) cb.checked = !cb.checked; });
      row.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cb.checked = !cb.checked; } });
    });

    let step3 = false, solved = false;
    el.querySelector("#tri-check").addEventListener("click", () => {
      const picked = [...el.querySelectorAll(".tri-row")].map((r) => r.querySelector("input").checked);
      const need = FINDINGS.map((f, i) => (f.ok ? i : -1)).filter((i) => i >= 0);
      const okAll = picked.filter(Boolean).length === need.length && need.every((i) => picked[i]);
      const o2 = el.querySelector("#tri-out2");
      if (okAll) {
        o2.className = "lab-out ok";
        o2.innerHTML = "✓ " + t("Три находки подтверждены: закрепление в Run, посторонний процесс из Temp с base64-командой и соединение с внешним адресом от того же PID.");
        el.querySelector("#tri-step3").hidden = false;
        step3 = true;
      } else {
        o2.className = "lab-out no";
        o2.innerHTML = "✗ " + t("Неверно. Сопоставьте находку с командой, которая её показала.") +
          `<ul class="tri-why">${FINDINGS.filter((f, i) => f.ok && !picked[i]).map((f) => `<li>${f.why}</li>`).join("")}</ul>`;
      }
    });
    el.querySelector("#tri-acts").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-a]");
      if (!b || !step3) return;
      const o3 = el.querySelector("#tri-out3");
      if (b.dataset.a === "iso") {
        o3.className = "lab-out ok";
        o3.innerHTML = "✓ " + t("Верно: изоляция от сети и дамп памяти — в RAM ещё ключи, сессии и бесфайловый код. Дальше сбор по порядку волатильности, затем устранение и восстановление из чистого образа.");
        if (!solved) { solved = true; setTimeout(onSolve, 1200); }
      } else {
        o3.className = "lab-out no";
        o3.textContent = t("✗ Преждевременно: перезагрузка уничтожит улики в памяти, удаление одного ключа не уберёт закрепление в других точках, а ожидание — не мера реагирования.");
      }
    });
  }

  /* ------------------------------------------------------------
     2. Разбор журнала событий Windows: собрать цепочку компрометации
     ------------------------------------------------------------ */
  const EVENTS = [
    { id: 4624, time: "11:58:03", user: "hacker", src: "185.220.101.47", info: t("Успешный вход, тип 10 (RemoteInteractive)"), hit: 1 },
    { id: 4688, time: "11:58:05", user: "hacker", src: "—", info: "rundll32.exe → C:\\Users\\hacker\\AppData\\Local\\Temp\\svhost32.exe -enc SQBFAFgA", hit: 1 },
    { id: 4672, time: "11:58:06", user: "hacker", src: "—", info: t("Вход с назначением особых привилегий"), hit: 1 },
    { id: 7045, time: "11:59:12", user: "SYSTEM", src: "—", info: t("Служба изменила параметры автозапуска"), hit: 0 },
    { id: 1102, time: "12:01:44", user: "hacker", src: "—", info: t("Журнал безопасности очищен"), hit: 1 },
    { id: 4625, time: "11:41:02", user: "admin", src: "10.20.4.9", info: t("Неудачный вход, статус 0xC000006D"), hit: 0 },
    { id: 4624, time: "09:12:55", user: "j.smith", src: "10.20.4.31", info: t("Успешный вход, тип 3 (сеть)"), hit: 0 },
    { id: 4689, time: "12:02:03", user: "hacker", src: "—", info: t("Доступ к объекту процесса"), hit: 0 },
    { id: 4104, time: "11:58:07", user: "hacker", src: "—", info: t("Script Block Logging: выполнен блок скрипта"), hit: 0 },
  ];

  function eventlog(el, onSolve) {
    el.innerHTML = `
      <p class="lab-hint">${t("Вам передали выгрузку журнала Security за 14 января. Отметьте события, которые складываются в цепочку компрометации, и укажите номер события об очистке журнала.")}</p>
      <div class="ev-head">
        <span class="ev-win-title">${t("Просмотр событий → Журналы Windows → Безопасность")}</span>
        <span class="ev-filter">${t("Выгрузка: 9 событий, сортировка по времени")}</span>
      </div>
      <table class="ev-table" id="ev-table">
        <thead><tr><th></th><th>${t("Время")}</th><th>ID</th><th>${t("Пользователь")}</th><th>${t("Источник")}</th><th>${t("Событие")}</th></tr></thead>
        <tbody>
          ${EVENTS.map((e, i) => `<tr class="ev-row" data-i="${i}" tabindex="0" role="checkbox" aria-checked="false">
            <td><span class="pl-box"></span></td><td class="ev-time">${e.time}</td><td class="ev-id">${e.id}</td>
            <td>${esc(e.user)}</td><td class="tw-dim">${esc(e.src)}</td><td>${esc(e.info)}</td></tr>`).join("")}
        </tbody>
      </table>
      <div class="ev-answer">
        <label class="ev-q">${t("Номер события об очистке журнала безопасности:")}</label>
        <input class="fld-in" id="ev-clear" inputmode="numeric" placeholder="1102">
        <button class="btn btn-primary btn-sm" id="ev-go">${t("Проверить вывод")}</button>
      </div>
      <div class="lab-out" id="ev-out"></div>`;

    const sel = new Set();
    el.querySelectorAll(".ev-row").forEach((row) => {
      const toggle = () => {
        const i = +row.dataset.i;
        if (sel.has(i)) { sel.delete(i); row.classList.remove("sel"); row.setAttribute("aria-checked", "false"); }
        else { sel.add(i); row.classList.add("sel"); row.setAttribute("aria-checked", "true"); }
      };
      row.addEventListener("click", toggle);
      row.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    });

    let solved = false;
    el.querySelector("#ev-go").addEventListener("click", () => {
      const need = EVENTS.map((e, i) => (e.hit ? i : -1)).filter((i) => i >= 0);
      const picked = [...sel];
      const clearId = el.querySelector("#ev-clear").value.trim();
      const okAll = picked.length === need.length && need.every((i) => picked.includes(i)) && clearId === "1102";
      const out = el.querySelector("#ev-out");
      if (okAll) {
        out.className = "lab-out ok";
        out.innerHTML = "✓ " + t("Верно: вход типа 10 с внешнего адреса (4624), запуск процесса из Temp (4688), выдача особых привилегий (4672) и очистка журнала (1102) — это вход, закрепление, повышение прав и зачистка следов. Остальное — фоновая активность.");
        if (!solved) { solved = true; setTimeout(onSolve, 1300); }
      } else {
        out.className = "lab-out no";
        out.innerHTML = "✗ " + t("Неверно. Ищите: вход с внешнего адреса, запуск постороннего процесса, выдачу особых привилегий и очистку журнала. В поле ниже укажите код события об очистке.");
      }
    });
  }

  if (window.Labs && Labs.register) {
    Labs.register("wintriage", wintriage);
    Labs.register("eventlog", eventlog);
  }
})();