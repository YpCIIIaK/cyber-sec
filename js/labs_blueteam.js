/* ============================================================
   CyberPath — лаборатории Blue Team: охота (hunting) по телеметрии
   и сборка таймлайна инцидента.
   Подключается ПОСЛЕ js/labs.js (Labs.register).
   ============================================================ */
(function () {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const t = (s) => (window.I18N ? I18N.t(s) : s);

  /* ------------------------------------------------------------
     1. Threat hunting: алертов нет — найти пропущенную активность
     ------------------------------------------------------------ */
  const HUNT_LOG = `Запрос к SIEM (последние 24 часа):
  powershell.exe — 3 запуска, все с -File C:\\Scripts\\report.ps1
  Исходящие соединения powershell.exe — отсутствуют
  4657 (изменение политики аудита) — 1 шт., 03:12
  4624 (успешный вход) — источник DC01.corp.local, 03:14
  4672 (особые привилегии) — учётка svc_sql получила SeDebugPrivilege, 03:15`;

  const HUNT_PICKS = [
    { id: "4657", ok: 1, why: t("4657 — изменение политики аудита: классический шаг перед отключением логов, чтобы скрыть дальнейшие действия.") },
    { id: "4672", ok: 1, why: t("4672 на контроллере домена: сервисная учётка получила SeDebugPrivilege — подготовка к чтению памяти LSASS.") },
    { id: "4624", ok: 1, why: t("4624 с DC01: вход на контроллер домена — цель, где лежит ntds.dit и где можно получить Domain Admin.") },
    { id: "4634", ok: 0, why: t("4634 — обычный выход из сессии; сам по себе ничего не объясняет.") },
    { id: "4719", ok: 0, why: t("4719 — аудит файловых систем; изменений политики там не было, событие не подтверждает гипотезу.") },
  ];
  const HUNT_ANSWER = t("Гипотеза подтверждена: скомпрометирован контроллер домена. Дальше — hunt по кэшу Kerberos, проверка выгрузки ntds.dit и кражи хешей, а не поиск нового вредоноса на рабочих станциях. Плановые действия: переустановка DC, двукратная смена krbtgt, пересмотр всех SPN.");

  function hunting(el, onSolve) {
    const okIds = HUNT_PICKS.filter((p) => p.ok).map((p) => p.id);
    el.innerHTML = `
      <p class="lab-hint">${t("Охота: за сутки не сработал ни один алерт, но тишина не бывает случайной. Сформулируйте гипотезу, отметьте подтверждающие факты и решите, что делать дальше.")}</p>
      <div class="hunt-box">
        <div class="hunt-hyp">
          <b>${t("Гипотеза")}</b>
          <input class="fld-in" id="hunt-h" placeholder="${t("что ищем и почему (например, техника и почему она подходит)")}">
          <button class="btn btn-primary btn-sm" id="hunt-go">${t("Проверить гипотезу")}</button>
        </div>
        <pre class="tw-out">${esc(HUNT_LOG)}</pre>
      </div>
      <h4 class="net-h">${t("Подтверждающие факты")}</h4>
      <div class="net-finds" id="hunt-picks">
        ${HUNT_PICKS.map((p) => `<label class="net-row" data-id="${p.id}"><input type="checkbox"><span>${esc(p.why)}</span></label>`).join("")}
      </div>
      <div id="hunt-next" hidden>
        <h4 class="net-h">${t("Что делаем дальше?")}</h4>
        <div class="hunt-acts" id="hunt-acts">
          <button data-a="dc">${t("Считать DC01 скомпрометированным: hunt по кэшу Kerberos и выгрузке ntds.dit")}</button>
          <button data-a="wipe">${t("Вернуть изменённую политику аудита и закрыть тикет")}</button>
          <button data-a="av">${t("Обновить антивирус на рабочих станциях и закрыть тикет")}</button>
        </div>
      </div>
      <div class="lab-out" id="hunt-out"></div>`;

    const sel = new Set();
    el.querySelectorAll("#hunt-picks .net-row").forEach((row) => {
      const cb = row.querySelector("input");
      row.addEventListener("click", () => {
        const id = row.dataset.id;
        if (sel.has(id)) { sel.delete(id); cb.checked = false; row.classList.remove("sel"); }
        else { sel.add(id); cb.checked = true; row.classList.add("sel"); }
      });
    });

    let solved = false;
    el.querySelector("#hunt-go").addEventListener("click", () => {
      const hyp = el.querySelector("#hunt-h").value.toLowerCase();
      const out = el.querySelector("#hunt-out");
      const okHyp = /lsass|уч[её]тн|парол|cred|debug|hash|хеш/.test(hyp);
      const okAll = sel.size === okIds.length && okIds.every((i) => sel.has(i));
      if (okHyp && okAll) {
        out.className = "lab-out ok";
        out.innerHTML = "✓ " + esc(HUNT_ANSWER);
        el.querySelector("#hunt-next").hidden = false;
      } else {
        out.className = "lab-out no";
        out.innerHTML = "✗ " + t("Гипотеза должна называть технику (например, чтение LSASS через SeDebugPrivilege) и опираться на факты выгрузки:") +
          `<ul class="tri-why">${HUNT_PICKS.filter((p) => p.ok && !sel.has(p.id)).map((p) => `<li>${p.why}</li>`).join("")}</ul>`;
      }
    });
    el.querySelector("#hunt-acts").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-a]"); if (!b) return;
      const out = el.querySelector("#hunt-out");
      if (b.dataset.a === "dc") {
        out.className = "lab-out ok";
        out.innerHTML = "✓ " + esc(HUNT_ANSWER);
        if (!solved) { solved = true; setTimeout(onSolve, 1400); }
      } else {
        out.className = "lab-out no";
        out.textContent = t("✗ Это либо затирает следы, либо бьёт не туда: антивирус на рабочих станциях не связан с тем, что произошло на контроллере домена.");
      }
    });
  }

  /* ------------------------------------------------------------
     2. Таймлайн инцидента: расставить события по фазам NIST SP 800-61
     ------------------------------------------------------------ */
  const PHASES = [
    { id: "prep", name: t("Подготовка"), items: ["Подготовка"] },
    { id: "detect", name: t("Обнаружение и анализ"), items: ["Обнаружение и анализ"] },
    { id: "erad", name: t("Сдерживание, устранение и восстановление"), items: ["Сдерживание, устранение и восстановление"] },
    { id: "post", name: t("Действия после инцидента"), items: ["Действия после инцидента"] },
  ];
  const TL = [
    { txt: "Изоляция DC01 от сети, снятие дампа памяти и образа диска", phase: "erad" },
    { txt: "SOC заметил 4657 на контроллере домена в 03:12 и открыл тикет", phase: "detect" },
    { txt: "Установлено, что скомпрометирована учётка svc_sql; пароль сменён, сессии отозваны", phase: "detect" },
    { txt: "Ретроспектива: обновили политику аудита, добавили правило hunt на 4657 → 4672 → 4624", phase: "post" },
    { txt: "Контроллер переустановлен, krbtgt сменён дважды, домен возвращён в работу", phase: "erad" },
    { txt: "Ещё до инцидента: настроены SIEM, журналы Windows и playbook реагирования", phase: "prep" },
  ];

  function irtimeline(el, onSolve) {
    el.innerHTML = `
      <p class="lab-hint">${t("Из отчёта SOC собраны шесть действий. Распределите их по фазам NIST SP 800-61 — так выглядит честный отчёт: видно и что было подготовлено заранее, и где действия шли вразнобой.")}</p>
      <div class="tl-pool" id="tl-pool">
        ${TL.map((x, i) => `<button class="tl-item" data-i="${i}">${esc(x.txt)}</button>`).join("")}
      </div>
      <div class="tl-cols">
        ${PHASES.map((p) => `<div class="tl-col"><h4>${esc(p.name)}</h4><div class="tl-drop" data-p="${p.id}"></div></div>`).join("")}
      </div>
      <button class="btn btn-primary btn-sm" id="tl-go">${t("Собрать отчёт")}</button>
      <div class="lab-out" id="tl-out"></div>`;

    const placed = {};
    let chosen = null;
    el.querySelectorAll("#tl-pool .tl-item").forEach((b) => b.addEventListener("click", () => {
      el.querySelectorAll("#tl-pool .tl-item").forEach((x) => x.classList.remove("sel"));
      b.classList.add("sel");
      chosen = b.dataset.i;
    }));
    el.querySelectorAll(".tl-drop").forEach((zone) => {
      zone.addEventListener("click", (e) => {
        const chip = e.target.closest(".tl-item.on");
        if (chip) { // вернуть в пул
          delete placed[chip.dataset.i];
          chip.remove();
          return;
        }
        if (chosen == null) return;
        const idx = chosen;
        // переносим выбранную строку в эту фазу
        const src = el.querySelector(`#tl-pool .tl-item[data-i="${idx}"]`);
        Object.keys(placed).forEach((k) => { if (placed[k] === zone.dataset.p) delete placed[k]; });
        const node = document.createElement("button");
        node.className = "tl-item on";
        node.dataset.i = idx;
        node.textContent = src ? src.textContent : TL[idx].txt;
        zone.appendChild(node);
        placed[idx] = zone.dataset.p;
        el.querySelectorAll("#tl-pool .tl-item").forEach((x) => x.classList.remove("sel"));
        chosen = null;
      });
    });

    let solved = false;
    el.querySelector("#tl-go").addEventListener("click", () => {
      const out = el.querySelector("#tl-out");
      const okAll = TL.every((x, i) => placed[i] === x.phase);
      if (okAll) {
        out.className = "lab-out ok";
        out.innerHTML = "✓ " + t("Верно. Обратите внимание на вывод отчёта: фаза «Подготовка» состояла до инцидента, поэтому реагирование началось не с нуля. Если бы строки про SIEM и playbook не было, все фазы сдвинулись бы в «обнаружение» — и это главный вывод любого post-mortem.");
        if (!solved) { solved = true; setTimeout(onSolve, 1300); }
      } else {
        out.className = "lab-out no";
        out.innerHTML = "✗ " + t("Пересмотрите распределение. Изоляция и переустановка — это сдерживание и восстановление; разбор и новые правила — действия после инцидента; настройка SIEM до инцидента — подготовка.") +
          `<ul class="tri-why">${TL.filter((x, i) => placed[i] !== x.phase).map((x) => `<li>${esc(x.txt)}</li>`).join("")}</ul>`;
      }
    });
  }

  if (window.Labs && Labs.register) {
    Labs.register("hunting", hunting);
    Labs.register("irtimeline", irtimeline);
  }
})();