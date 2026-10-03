/* ============================================================
   CyberPath — лаборатории: аудит конфигурации по CIS Benchmark
   и сетевой/облачный харденинг.
   Подключается ПОСЛЕ js/labs.js (Labs.register).
   ============================================================ */
(function () {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const t = (s) => (window.I18N ? I18N.t(s) : s);
  const appwin = (title, icon, body) => `
    <div class="aw">
      <div class="aw-top"><span class="aw-ic">${icon}</span><span class="aw-title">${esc(title)}</span>
        <span class="aw-btns"><i>–</i><i>▢</i><i class="aw-x">✕</i></span></div>
      <div class="aw-body">${body}</div>
    </div>`;

  /* ------------------------------------------------------------
     1. Аудит хоста по CIS Benchmark: найти несоответствия
     ------------------------------------------------------------ */
  const CIS = [
    { id: 1, name: "SMBv1", value: t("Включён"), want: t("Отключён"), bad: 1,
      why: t("SMBv1 небезопасен (вектор WannaCry) и нужен только для legacy-устройств. Правильный путь — SMB2/3, а не возврат SMBv1.") },
    { id: 2, name: t("Защита учётных записей"), value: t("12 знаков, срок 90 дней"), want: t("≥15 знаков, срок не чаще года"), bad: 1,
      why: t("NIST SP 800-63B: для парольной фразы — минимум 15 символов, менять не чаще раза в год. Частая ротация толкает менять пароль на слабый.") },
    { id: 3, name: t("Профиль брандмауэра «Общедоступная сеть»"), value: t("Выключен"), want: t("Включён"), bad: 1,
      why: t("Профиль «Публичная сеть» включает правила против обнаружения в сети и блокирует входящие подключения. Выключенный профиль в кафе — открытая дверь.") },
    { id: 4, name: "BitLocker", value: t("Включён на C:"), want: t("Включён"), bad: 0, why: "" },
    { id: 5, name: t("Аудит создания процессов (4688)"), value: t("Включён"), want: t("Включён"), bad: 0, why: "" },
    { id: 6, name: t("Учётные записи в группе «Администраторы»"), value: t("3 учётные записи"), want: t("2–3, по необходимости (PAW/JEA)"), bad: 0, why: "" },
    { id: 7, name: "RDP", value: t("Только из сегмента админов, через VPN"), want: t("Не из пользовательской сети"), bad: 0, why: "" },
    { id: 8, name: "PowerShell CLM", value: t("Включён для пользовательских сессий"), want: t("Включён"), bad: 0, why: "" },
  ];

  function cisbench(el, onSolve) {
    const bad = CIS.filter((c) => c.bad).map((c) => c.id);
    el.innerHTML = `
      <p class="lab-hint">${t("Вам передали выгрузку CIS Benchmark по рабочей станции. Отметьте настройки, не соответствующие рекомендациям, и решите, как поступите дальше.")}</p>
      ${appwin(t("Отчёт CIS Benchmark — FIN-WS-12"), "🛡", `
        <table class="cis-table">
          <thead><tr><th></th><th>${t("Параметр")}</th><th>${t("Текущее значение")}</th><th>${t("Требуется")}</th></tr></thead>
          <tbody>
            ${CIS.map((c) => `<tr class="cis-row" data-i="${c.id}">
              <td><input type="checkbox" aria-label="${esc(c.name)}"></td>
              <td>${esc(c.name)}</td>
              <td class="${c.bad ? "cis-bad" : "cis-ok"}">${esc(c.value)}</td>
              <td class="tw-dim">${esc(c.want)}</td></tr>`).join("")}
          </tbody>
        </table>
        <div class="cis-acts" id="cis-acts">
          <button data-a="fix">${t("Исправить и задокументировать исключения")}</button>
          <button data-a="ignore">${t("Оставить как есть — «пользователи жалуются»")}</button>
          <button data-a="all">${t("Переписать политики под себя и отключить аудит")}</button>
        </div>
        <div class="lab-out" id="cis-out"></div>`)}`;

    const sel = new Set();
    el.querySelectorAll(".cis-row").forEach((row) => {
      const cb = row.querySelector("input");
      const toggle = () => {
        const i = +row.dataset.i;
        if (sel.has(i)) { sel.delete(i); cb.checked = false; row.classList.remove("sel"); }
        else { sel.add(i); cb.checked = true; row.classList.add("sel"); }
      };
      row.addEventListener("click", toggle);
      row.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    });

    let solved = false;
    el.querySelector("#cis-acts").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-a]"); if (!b) return;
      const out = el.querySelector("#cis-out");
      const okAll = sel.size === bad.length && bad.every((i) => sel.has(i));
      if (b.dataset.a === "fix" && okAll) {
        out.className = "lab-out ok";
        out.innerHTML = "✓ " + t("Верно: несоответствия — SMBv1, короткий пароль с частой ротацией и выключенный профиль «Публичная сеть». Дальше — исправить через GPO/CM, а сознательно оставленное (например, SMBv1 для старого NAS) зафиксировать как документированное исключение со сроком пересмотра.");
        if (!solved) { solved = true; setTimeout(onSolve, 1300); }
      } else if (b.dataset.a === "fix") {
        out.className = "lab-out no";
        out.innerHTML = "✗ " + t("Набор неполный. Смотрите колонку «требуется»:") +
          `<ul class="tri-why">${CIS.filter((c) => c.bad).map((c) => `<li><b>${esc(c.name)}</b>: ${esc(c.why)}</li>`).join("")}</ul>`;
      } else {
        out.className = "lab-out no";
        out.textContent = t("✗ Так риск остаётся без контроля: «пользователи жалуются» — не обоснование, а отключение аудита убирает возможность заметить проблему вовсе.");
      }
    });
  }

  /* ------------------------------------------------------------
     2. Сетевой и облачный харденинг: найти дыры и закрыть их
     ------------------------------------------------------------ */
  const NET = [
    { id: "port3389", bad: 1, title: t("RDP 3389 открыт в интернет"),
      fix: t("закрыть снаружи, доступ только через VPN с MFA"),
      kw: ["vpn", "mfa", "закры", "закр", "rdp"] },
    { id: "telnet", bad: 1, title: t("Telnet на сетевом оборудовании вместо SSH"),
      fix: t("перевести управление на SSH, Telnet отключить"),
      kw: ["ssh", "отключ", "telnet"] },
    { id: "port23in", bad: 1, title: t("SNMP с community public без фильтрации"),
      fix: t("SNMPv3 или закрыть community, фильтровать на границе"),
      kw: ["snmpv3", "фильтр", "community", "закры", "закр"] },
    { id: "seg", bad: 1, title: t("Пользователи и серверы в одной подсети"),
      fix: t("разделить VLAN: пользователи, серверы, гости, управление"),
      kw: ["vlan", "подсет", "раздел", "сегмент"] },
    { id: "dnssafe", bad: 1, title: t("DNS-сервер без защиты от подмены"),
      fix: t("DNSSEC или подписанный DoT/DoH-resolver, фильтрация исходящего DNS"),
      kw: ["dnssec", "dot", "doh", "фильтр"] },
    { id: "vpnok", bad: 0, title: t("VPN с проверкой сертификата и MFA на входе"), fix: "", kw: [] },
    { id: "wifiok", bad: 0, title: t("Гостевая Wi-Fi в отдельном VLAN с изоляцией клиентов"), fix: "", kw: [] },
    { id: "logs", bad: 0, title: t("Логи с оборудования собираются в SIEM"), fix: "", kw: [] },
  ];

  function netcloud(el, onSolve) {
    const bad = NET.filter((n) => n.bad).map((n) => n.id);
    el.innerHTML = `
      <p class="lab-hint">${t("Проверка инфраструктуры филиала: шлюз, точки доступа и облачная консоль. Отметьте реальные дыры, а затем опишите закрытие для одной из них.")}</p>
      <div class="tri-grid">
        ${appwin(t("Шлюз филиала — 10.10.0.1"), "🛰", `
          <ul class="net-list">
            <li>192.168.1.0/24 — ${t("рабочие станции и принтеры в одной подсети")}</li>
            <li>10.0.0.0/8 — ${t("транзит в интернет без фильтрации")}</li>
            <li>${t("Открытые сервисы: 22, 23, 80, 443, 3389, 161/udp")}</li>
          </ul>`)}
        ${appwin(t("Облачная консоль"), "☁", `
          <ul class="net-list">
            <li>${t("роли в облаке создаются без согласования")}</li>
            <li>${t("MFA включена только у 40% учётных записей")}</li>
            <li>${t("временные доступы не отзываются автоматически")}</li>
          </ul>`)}
      </div>
      <h4 class="net-h">${t("Найденные замечания")}</h4>
      <div class="net-finds" id="net-finds">
        ${NET.map((n) => `<label class="net-row" data-id="${n.id}"><input type="checkbox"><span>${esc(n.title)}</span></label>`).join("")}
      </div>
      <div class="ev-answer">
        <label class="ev-q">${t("Закрытие для выбранной находки:")}</label>
        <select id="net-sel"><option value="">— ${t("выбрать")} —</option>
          ${NET.filter((n) => n.bad).map((n) => `<option value="${n.id}">${esc(n.title)}</option>`).join("")}
        </select>
        <input class="fld-in" id="net-text" placeholder="${t("Опишите закрытие")}" style="min-width:260px">
        <button class="btn btn-primary btn-sm" id="net-go">${t("Проверить план")}</button>
      </div>
      <div class="lab-out" id="net-out"></div>`;

    const sel = new Set();
    el.querySelectorAll(".net-row").forEach((row) => {
      const cb = row.querySelector("input");
      row.addEventListener("click", () => {
        const id = row.dataset.id;
        if (sel.has(id)) { sel.delete(id); cb.checked = false; row.classList.remove("sel"); }
        else { sel.add(id); cb.checked = true; row.classList.add("sel"); }
      });
    });

    let phase = 1, solved = false;
    el.querySelector("#net-go").addEventListener("click", () => {
      const out = el.querySelector("#net-out");
      if (phase === 1) {
        const okAll = sel.size === bad.length && bad.every((i) => sel.has(i));
        if (okAll) {
          out.className = "lab-out ok";
          out.innerHTML = "✓ " + t("Находки верные: RDP в интернет, Telnet вместо SSH, SNMP public, общая подсеть пользователей и серверов и открытый DNS. Теперь опишите закрытие для одной из них.");
          phase = 2;
        } else {
          out.className = "lab-out no";
          out.innerHTML = "✗ " + t("Проверьте список. Ожидаемые замечания:") +
            `<ul class="tri-why">${NET.filter((n) => n.bad).map((n) => `<li><b>${esc(n.title)}</b> → ${esc(n.fix)}</li>`).join("")}</ul>`;
        }
        return;
      }
      const want = NET.find((n) => n.id === el.querySelector("#net-sel").value);
      const txt = el.querySelector("#net-text").value.toLowerCase();
      const hits = want ? want.kw.filter((k) => txt.includes(k)).length : 0;
      if (want && hits >= 1) {
        out.className = "lab-out ok";
        out.innerHTML = "✓ " + t("Закрытие сформулировано верно: ") + esc(want.fix) +
          " " + t("Главное — убрать экспозицию наружу и оставить контролируемый, журналируемый доступ.");
        if (!solved) { solved = true; setTimeout(onSolve, 1300); }
      } else {
        out.className = "lab-out no";
        out.innerHTML = "✗ " + t("Опишите конкретное действие, а не общие слова.") +
          (want ? `<p class="net-hint">${esc(want.fix)}</p>` : t(" Сначала выберите находку."));
      }
    });
  }

  if (window.Labs && Labs.register) {
    Labs.register("cisbench", cisbench);
    Labs.register("netcloud", netcloud);
  }
})();