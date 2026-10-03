/* ============================================================
   CyberPath — лаборатории: проверка TLS-сертификата,
   отчёт пентеста и набор IOC для малвари.
   Подключается ПОСЕ js/labs.js (Labs.register).
   ============================================================ */
(function () {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const t = (s) => (window.I18N ? I18N.t(s) : s);

  /* ------------------------------------------------------------
     1. Проверка сертификата: найти поддельный
     ------------------------------------------------------------ */
  const CERTS = [
    { host: "login.acme-corp.com", ok: 1,
      txt: `Subject: CN=login.acme-corp.com
Issuer:  CN=ACME Public Issuing R3
Valid:   2026-01-12 — 2027-01-12
SAN:     login.acme-corp.com, www.login.acme-corp.com
Sig alg: sha256WithRSAEncryption`,
      bad: t("Сертификат выдан доверенным центром, имя совпадает с доменом, срок действия в порядке — такой и должен быть.") },
    { host: "login.acme-corp.com.secure-login.ru", ok: 1,
      txt: `Subject: CN=login.acme-corp.com
Issuer:  CN=Let's Encrypt R3
Valid:   2026-08-14 — 2026-11-12
SAN:     login.acme-corp.com
Sig alg: sha256WithRSAEncryption`,
      bad: t("Имя в CN совпадает, но вы предъявляете сертификат для другого домена: login.acme-corp.com.secure-login.ru — это secure-login.ru, а не acme-corp.com. Классический приём с «похожим» CN.") },
    { host: "acme-corp.com", ok: 1,
      txt: `Subject: CN=acme-corp.com
Issuer:  CN=ACME Public Issuing R3
Valid:   2024-11-02 — 2025-11-02
SAN:     acme-corp.com
Sig alg: sha1WithRSAEncryption`,
      bad: t("Сертификат истёк больше года назад и подписан слабым алгоритмом SHA-1. Истёкший сертификат браузеры помечают, но в корпоративных сетях это перехватывают посредники (SSL inspection).") },
    { host: "mail.acme-corp.com", ok: 0,
      txt: `Subject: CN=mail.acme-corp.com
Issuer:  CN=ACME Public Issuing R3
Valid:   2026-03-01 — 2027-03-01
SAN:     mail.acme-corp.com
Sig alg: sha256WithRSAEncryption`,
      bad: "" },
  ];

  function certcheck(el, onSolve) {
    const need = CERTS.filter((c) => c.ok).map((c) => c.host);
    el.innerHTML = `
      <p class="lab-hint">${t("Пользователь сообщил о странном предупреждении в браузере. Проверьте сертификаты: отметьте подозрительные и укажите, что именно не так.")}</p>
      <div class="cert-list" id="cert-list">
        ${CERTS.map((c, i) => `<label class="net-row" data-host="${esc(c.host)}"><input type="checkbox"><span>${esc(c.host)}</span></label>`).join("")}
      </div>
      <h4 class="net-h">${t("Что не так в выбранных сертификатах")}</h4>
      <div class="ev-answer">
        <label class="ev-q">${t("Причина для сертификата:")}</label>
        <select id="cert-sel">
          <option value="">— ${t("выбрать")} —</option>
          ${CERTS.filter((c) => c.ok).map((c) => `<option value="${esc(c.host)}">${esc(c.host)}</option>`).join("")}
        </select>
        <button class="btn btn-primary btn-sm" id="cert-go">${t("Проверить")}</button>
      </div>
      <div class="lab-out" id="cert-out"></div>
      <details class="lab-tip"><summary>${t("Показать сертификаты")}</summary><div id="cert-raw">
        ${CERTS.map((c) => `<div class="cert-raw"><b>${esc(c.host)}</b><pre class="tw-out">${esc(c.txt)}</pre></div>`).join("")}
      </div></details>`;

    const sel = new Set();
    el.querySelectorAll("#cert-list .net-row").forEach((row) => {
      const cb = row.querySelector("input");
      row.addEventListener("click", () => {
        const h = row.dataset.host;
        if (sel.has(h)) { sel.delete(h); cb.checked = false; row.classList.remove("sel"); }
        else { sel.add(h); cb.checked = true; row.classList.add("sel"); }
      });
    });
    let phase = 1, solved = false;
    el.querySelector("#cert-go").addEventListener("click", () => {
      const out = el.querySelector("#cert-out");
      if (phase === 1) {
        const okAll = sel.size === need.length && need.every((h) => sel.has(h));
        if (okAll) {
          out.className = "lab-out ok";
          out.innerHTML = "✓ " + t("Верно: домен-близнец (CN совпадает, а фактический домен другой) и истёкший сертификат на SHA-1. Теперь объясните причину для одного из них.");
          phase = 2;
        } else {
          out.className = "lab-out no";
          out.innerHTML = "✗ " + t("Проверьте три вещи: имя в сертификате против реального домена, срок действия и алгоритм подписи.") +
            `<ul class="tri-why">${CERTS.filter((c) => c.ok).map((c) => `<li>${esc(c.bad)}</li>`).join("")}</ul>`;
        }
        return;
      }
      const host = el.querySelector("#cert-sel").value;
      const c = CERTS.find((x) => x.host === host);
      out.className = "lab-out ok";
      out.innerHTML = "✓ " + esc(c ? c.bad : t("Выберите сертификат из списка."));
      if (!solved) { solved = true; setTimeout(onSolve, 1300); }
    });
  }

  /* ------------------------------------------------------------
     2. Отчёт пентеста: приоритизация находок для руководства
     ------------------------------------------------------------ */
  const FIND = [
    { sev: 2, title: t("CVSS 9.8: SQL-инъекция в поиске на всех страницах"), why: t("Критично: анонимный доступ к базе, чтение и изменение данных, вынос через UNION. В отчёте — первым пунктом, с готовым планом исправления.") },
    { sev: 1, title: t("CVSS 6.5: пользователь может посмотреть чужой заказ по ID"), why: t("Высокий риск: утечка персональных данных, но без исполнения кода на сервере. Лечится проверкой владельца на сервере.") },
    { sev: 1, title: t("CVSS 5.3: заголовки безопасности (CSP, HSTS) отсутствуют"), why: t("Средний: усиливает другие уязвимости, сам по себе эксплуатации не даёт. Роль в отчёте — «усиление защиты».") },
    { sev: 0, title: t("В отчёте: «использован Nmap 7.94, сканированы порты 1–1024»"), why: t("Это описание метода, а не находка. В executive summary метод не выносят — там факты, риск и меры.") },
  ];

  function pentestreport(el, onSolve) {
    const needIdx = FIND.map((f, i) => (f.sev > 0 ? i : -1)).filter((i) => i >= 0);
    el.innerHTML = `
      <p class="lab-hint">${t("Черновик отчёта готов. Отметьте строки, которые идут в executive summary, и задайте приоритет главной находке.")}</p>
      <table class="cis-table">
        <thead><tr><th></th><th>${t("Строка отчёта")}</th><th>${t("Роль в отчёте")}</th></tr></thead>
        <tbody id="rep-list">
          ${FIND.map((f, i) => `<tr class="cis-row" data-i="${i}">
            <td><input type="checkbox" aria-label="finding"></td>
            <td>${esc(f.title)}</td>
            <td class="tw-dim" data-role="${i}">—</td></tr>`).join("")}
        </tbody>
      </table>
      <div class="ev-answer">
        <label class="ev-q">${t("Приоритет для SQL-инъекции:")}</label>
        <select id="rep-sel">
          <option value="">— ${t("выбрать")} —</option>
          <option value="crit">${t("Критический — исправлять немедленно")}</option>
          <option value="high">${t("Высокий — в плане ближайшего спринта")}</option>
          <option value="low">${t("Низкий — в бэклог hardening")}</option>
          <option value="none">${t("Не находка, метод — в приложение")}</option>
        </select>
        <button class="btn btn-primary btn-sm" id="rep-go">${t("Проверить отчёт")}</button>
      </div>
      <div class="lab-out" id="rep-out"></div>`;

    const sel = new Set();
    el.querySelectorAll("#rep-list .cis-row").forEach((row) => {
      const cb = row.querySelector("input");
      row.addEventListener("click", () => {
        const i = +row.dataset.i;
        if (sel.has(i)) { sel.delete(i); cb.checked = false; row.classList.remove("sel"); row.querySelector("[data-role]").textContent = "—"; }
        else {
          sel.add(i); cb.checked = true; row.classList.add("sel");
          row.querySelector("[data-role]").textContent = FIND[i].sev === 2 ? t("критично") : FIND[i].sev === 1 ? t("высокий / средний") : t("не находка");
        }
      });
    });
    let solved = false;
    el.querySelector("#rep-go").addEventListener("click", () => {
      const out = el.querySelector("#rep-out");
      const okSel = sel.size === needIdx.length && needIdx.every((i) => sel.has(i));
      if (okSel && el.querySelector("#rep-sel").value === "crit") {
        out.className = "lab-out ok";
        out.innerHTML = "✓ " + t("Верно. В executive summary идут три находки, описание метода (Nmap) переносится в приложение. Приоритеты: SQL-инъекция — критично и немедленно; IDOR — высокий (утечка данных); отсутствие заголовков — средний, это усиление защиты. Полноценный отчёт содержит также объём работ, риск для бизнеса, сроки и подтверждение исправления при ретесте.");
        if (!solved) { solved = true; setTimeout(onSolve, 1400); }
      } else {
        out.className = "lab-out no";
        out.innerHTML = "✗ " + t("Разделите находки и метод: методика («сканировал Nmap») — приложение, в executive summary идут дыры с понятным риском. И выберите приоритет для SQL-инъекции.") +
          `<ul class="tri-why">${FIND.map((f) => `<li>${f.why}</li>`).join("")}</ul>`;
      }
    });
  }

  /* ------------------------------------------------------------
     3. Набор IOC и привязка к ATT&CK
     ------------------------------------------------------------ */
  const IOCS = [
    { ok: 1, txt: t("Блокировать IP C2 91.219.236.14 в брандмауэре и внести в список IOC"), why: t("Конкретный индикатор: применяется немедленно, но сначала проверьте, что это не легитимный сервис.") },
    { ok: 1, txt: t("Исключить хеш svhost32.exe (SHA-256) из исполнения и проверки в антивирусе"), why: t("Хеш не переносится на пересборку, но полезен как стоп-лист на время расследования.") },
    { ok: 1, txt: t("Добавить детект на автозапуск powershell -enc в ключе Run"), why: t("Поведенческий индикатор (IOA) переживает смену хеша и домена — самый ценный класс.") },
    { ok: 0, txt: t("Убить процесс svhost32.exe на всех хостах и закрыть тикет"), why: t("Убийство процесса без анализа уничтожает улики: сначала изоляция и дамп, потом чистка.") },
    { ok: 0, txt: t("Объявить пользователя виновным и отключить его от домена"), why: t("Ошибка процесса не равна действие человека — это вывод для кадров, а не для ИБ-отчёта.") },
  ];

  function iocset(el, onSolve) {
    const need = IOCS.map((i, k) => (i.ok ? k : -1)).filter((k) => k >= 0);
    el.innerHTML = `
      <p class="lab-hint">${t("По завершении анализа нужен набор индикаторов и действий. Отметьте корректные пункты отчётности — остальные в неё не входят.")}</p>
      <div class="net-finds" id="ioc-list">
        ${IOCS.map((i, k) => `<label class="net-row" data-i="${k}"><input type="checkbox"><span>${esc(i.txt)}</span></label>`).join("")}
      </div>
      <button class="btn btn-primary btn-sm" id="ioc-go">${t("Утвердить набор индикаторов")}</button>
      <div class="lab-out" id="ioc-out"></div>`;

    const sel = new Set();
    el.querySelectorAll("#ioc-list .net-row").forEach((row) => {
      const cb = row.querySelector("input");
      row.addEventListener("click", () => {
        const i = +row.dataset.i;
        if (sel.has(i)) { sel.delete(i); cb.checked = false; row.classList.remove("sel"); }
        else { sel.add(i); cb.checked = true; row.classList.add("sel"); }
      });
    });
    let solved = false;
    el.querySelector("#ioc-go").addEventListener("click", () => {
      const out = el.querySelector("#ioc-out");
      const okAll = sel.size === need.length && need.every((i) => sel.has(i));
      if (okAll) {
        out.className = "lab-out ok";
        out.innerHTML = "✓ " + t("Верно: IP — для блокировки, хеш — для стоп-листа, автозапуск с -enc — как поведенческий детект (в ATT&CK это T1547.001 плюс T1059.001). Массовое убийство процессов и вина пользователя — не часть ИБ-отчёта: улики сначала, выводы потом.");
        if (!solved) { solved = true; setTimeout(onSolve, 1400); }
      } else {
        out.className = "lab-out no";
        out.innerHTML = "✗ " + t("Индикатор — это то, что можно проверить и применить: адрес, хеш, поведение в логах. Убийство процесса без сбора улик и выводы о вине человека в отчёт по ИБ не входят.") +
          `<ul class="tri-why">${IOCS.filter((i) => !i.ok).map((i) => `<li>${i.why}</li>`).join("")}</ul>`;
      }
    });
  }

  if (window.Labs && Labs.register) {
    Labs.register("certcheck", certcheck);
    Labs.register("pentestreport", pentestreport);
    Labs.register("iocset", iocset);
  }
})();