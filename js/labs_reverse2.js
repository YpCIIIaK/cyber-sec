/* ============================================================
   CyberPath — лаборатории: динамический анализ в отладчике
   и сетевой анализ малвари (beacon / признаки C2).
   Подключается ПОСЛЕ js/labs.js (Labs.register).
   ============================================================ */
(function () {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const t = (s) => (window.I18N ? I18N.t(s) : s);
  const term = (title, body) => `
    <div class="tw">
      <div class="tw-top"><span class="bw-dots"><i></i><i></i><i></i></span><span class="tw-title">${esc(title)}</span></div>
      <div class="tw-body">${body}</div>
    </div>`;

  /* ------------------------------------------------------------
     1. Динамический анализ: пройти упакованный образец по шагам
     ------------------------------------------------------------ */
  const DBG = [
    { cmd: "F5 (Run)", out: t("Программа стартует и почти сразу завершается. Ничего не создано — похоже на упаковщик.") },
    { cmd: "Ctrl+B → OEP", out: t("Breakpoint на точке входа оригинального кода: образец распаковывается в памяти и прыгает в настоящий код.") },
    { cmd: "bp kernel32!VirtualAlloc", out: t("Первое выделение памяти: 0x1A2B0000, 0x40000 байт, PAGE_EXECUTE_READWRITE — готовят регион под исполняемый код.") },
    { cmd: "bp WinHTTP!WinHttpOpen", out: t("Сетевой вызов с URL http://cdn-sync[.]top/update.bin — внешний адрес: загрузка второй стадии или канал C2.") },
    { cmd: "bp kernel32!CreateRemoteThread", out: t("Вызов из чужого процесса notepad.exe — признак инъекции кода: payload будет жить внутри чужой программы.") },
  ];
  const DBG_Q = [
    { opt: t("Выход на OEP — поведение упаковщика: код в памяти появляется только во время работы"), ok: 1 },
    { opt: t("Выделение памяти с правами RWX — готовят регион для исполняемого кода"), ok: 1 },
    { opt: t("Обращение в интернет — это канал C2 или загрузка второй стадии"), ok: 1 },
    { opt: t("Вызов CreateRemoteThread — это нормально, процесс работает штатно"), ok: 0 },
    { opt: t("Образец безвреден, раз он вообще запустился"), ok: 0 },
  ];

  function dbgwalk(el, onSolve) {
    el.innerHTML = `
      <p class="lab-hint">${t("Образец упакован. Пройдите цепочку в отладчике и отметьте выводы, которые подтверждают упаковку, подготовку кода, сетевую активность и технику внедрения.")}</p>
      ${term("x64dbg — upd_x64.bin", `<div class="dbg-steps">
        ${DBG.map((d) => `<div class="dbg-step"><span class="dbg-cmd">${esc(d.cmd)}</span><span class="dbg-out">${esc(d.out)}</span></div>`).join("")}
      </div>`)}
      <h4 class="net-h">${t("Выводы по шагам")}</h4>
      <div class="net-finds" id="dbg-picks">
        ${DBG_Q.map((q, i) => `<label class="net-row" data-i="${i}"><input type="checkbox"><span>${esc(q.opt)}</span></label>`).join("")}
      </div>
      <button class="btn btn-primary btn-sm" id="dbg-go">${t("Сформулировать вывод")}</button>
      <div class="lab-out" id="dbg-res"></div>`;

    const sel = new Set();
    el.querySelectorAll("#dbg-picks .net-row").forEach((row) => {
      const cb = row.querySelector("input");
      row.addEventListener("click", () => {
        const i = row.dataset.i;
        if (sel.has(i)) { sel.delete(i); cb.checked = false; row.classList.remove("sel"); }
        else { sel.add(i); cb.checked = true; row.classList.add("sel"); }
      });
    });
    let solved = false;
    el.querySelector("#dbg-go").addEventListener("click", () => {
      const need = DBG_Q.map((q, i) => (q.ok ? i : -1)).filter((i) => i >= 0);
      const out = el.querySelector("#dbg-res");
      const okAll = sel.size === need.length && need.every((i) => sel.has(i));
      if (okAll) {
        out.className = "lab-out ok";
        out.innerHTML = "✓ " + t("Верно: OEP → выделение RWX-памяти → сетевой запрос → CreateRemoteThread в чужой процесс. Практический вывод: берите дамп памяти, а не сам файл — исполняемый код существует только в памяти; домен cdn-sync[.]top становится IOC.");
        if (!solved) { solved = true; setTimeout(onSolve, 1400); }
      } else {
        out.className = "lab-out no";
        out.innerHTML = "✗ " + t("Разберите по шагам: что значит выход на OEP, какие права у выделенной памяти, зачем программе интернет и что означает вызов функции в чужой процесс.") +
          `<ul class="tri-why">${DBG_Q.filter((q, i) => q.ok && !sel.has(i)).map((q) => `<li>${esc(q.opt)}</li>`).join("")}</ul>`;
      }
    });
  }

  /* ------------------------------------------------------------
     2. Сетевой анализ: beacon и признаки C2 в логе соединений
     ------------------------------------------------------------ */
  const CONNS = [
    ["10:04", "10.20.4.17:52140 → 142.250.72.14:443", "chrome.exe"],
    ["10:09", "10.20.4.17:52155 → 142.250.72.14:443", "chrome.exe"],
    ["11:31", "10.20.4.17:52410 → 91.219.236.14:443", "svhost32.exe"],
    ["12:31", "10.20.4.17:52412 → 91.219.236.14:443", "svhost32.exe"],
    ["13:33", "10.20.4.17:52415 → 91.219.236.14:443", "svhost32.exe"],
    ["14:31", "10.20.4.17:52418 → 91.219.236.14:443", "svhost32.exe"],
    ["15:32", "10.20.4.17:52421 → 91.219.236.14:443", "svhost32.exe"],
    ["15:33", "10.20.4.17:52430 → 10.20.4.5:445", "svhost32.exe"],
    ["15:40", "10.20.4.17:52880 → 104.18.12.22:443", "chrome.exe"],
  ];

  function beacon(el, onSolve) {
    el.innerHTML = `
      <p class="lab-hint">${t("Выгрузка брандмауэра за 6 часов: найдите канал C2, оцените интервал beacon и отметьте, что попадёт в отчёт и в правила блокировки.")}</p>
      ${term(t("Лог соединений — FIN-WS-07"), `<pre class="tw-out">${CONNS.map((c) => `${c[0]}   ${c[1]}   [${c[2]}]`).join("\n")}</pre>`)}
      <div class="ev-answer">
        <label class="ev-q">${t("Адрес C2:")}</label>
        <input class="fld-in" id="bc-ip" placeholder="91.219.236.14" style="min-width:170px">
        <label class="ev-q">${t("Интервал, мин:")}</label>
        <input class="fld-in" id="bc-int" placeholder="60" style="max-width:90px">
        <button class="btn btn-primary btn-sm" id="bc-go">${t("Проверить")}</button>
      </div>
      <h4 class="net-h">${t("Что блокировать и что писать в отчёте")}</h4>
      <div class="net-finds" id="bc-picks">
        <label class="net-row" data-i="ip"><input type="checkbox"><span>${t("IP-адрес C2 — в правила брандмауэра и в список IOC")}</span></label>
        <label class="net-row" data-i="proc"><input type="checkbox"><span>${t("Процесс svhost32.exe — запретить запуск вне System32")}</span></label>
        <label class="net-row" data-i="beacon"><input type="checkbox"><span>${t("Детект: исходящее соединение с равномерным интервалом от несистемного процесса")}</span></label>
        <label class="net-row" data-i="socks"><input type="checkbox"><span>${t("Отметить соединение на 445 как возможное боковое перемещение")}</span></label>
      </div>
      <div class="lab-out" id="bc-out"></div>`;

    const sel = new Set();
    el.querySelectorAll("#bc-picks .net-row").forEach((row) => {
      const cb = row.querySelector("input");
      row.addEventListener("click", () => {
        const i = row.dataset.i;
        if (sel.has(i)) { sel.delete(i); cb.checked = false; row.classList.remove("sel"); }
        else { sel.add(i); cb.checked = true; row.classList.add("sel"); }
      });
    });
    let solved = false;
    el.querySelector("#bc-go").addEventListener("click", () => {
      const ip = el.querySelector("#bc-ip").value.trim();
      const int = el.querySelector("#bc-int").value.trim();
      const need = ["ip", "proc", "beacon"];
      const out = el.querySelector("#bc-out");
      const okAll = ip === "91.219.236.14" && int === "60" && need.every((i) => sel.has(i));
      if (okAll) {
        out.className = "lab-out ok";
        out.innerHTML = "✓ " + t("Верно: C2 — 91.219.236.14, обращения примерно раз в час от svhost32.exe — это beacon. Блокируем адрес, запрещаем процесс вне System32, добавляем правило детекта по равномерному интервалу. Соединение на 445 — вероятная попытка бокового перемещения, его тоже фиксируем.");
        if (!solved) { solved = true; setTimeout(onSolve, 1400); }
      } else {
        out.className = "lab-out no";
        out.innerHTML = "✗ " + t("Сравните интервалы: браузер ходит к разным адресам хаотично, а здесь один адрес с почти одинаковой паузой каждый час — это и есть beacon.") +
          `<ul class="tri-why">${["ip", "proc", "beacon"].filter((i) => !sel.has(i)).map((i) => `<li>${i === "ip" ? t("блокировка IP C2") : i === "proc" ? t("запрет несистемного процесса") : t("детект по равномерному интервалу")}</li>`).join("")}</ul>`;
      }
    });
  }

  if (window.Labs && Labs.register) {
    Labs.register("dbgwalk", dbgwalk);
    Labs.register("beacon", beacon);
  }
})();