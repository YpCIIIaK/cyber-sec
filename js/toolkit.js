/* CyberPath — Blue Team toolkit (учебные симуляторы защиты).
   Все данные вымышлены и статичны; инструменты только читают/разбирают образцы
   для обучения обнаружению и разбору инцидентов. Модуль self-contained: window.Toolkit. */
(function () {
  "use strict";

  let api = null;            // {T, Progress, crumbs, go, icon, award, toast}
  let mount = null;
  const state = {};          // временное состояние активного инструмента

  const EN = () => !!(window.I18N && window.I18N.current && window.I18N.current() === "en");
  const L = (ru, en) => (EN() ? en : ru);
  const T = (s) => (api ? api.T(s) : s);
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  /* ---------- Каталог инструментов ---------- */
  const TOOLS = [
    { id: "headers",  icon: "mail",     ru: "Анализ заголовков письма",  en: "Email header analyzer",
      dru: "Разберите заголовки письма: SPF / DKIM / DMARC, подмена From и Return-Path.",
      den: "Dissect email headers: SPF / DKIM / DMARC, From vs Return-Path spoofing." },
    { id: "events",   icon: "list",     ru: "Журнал событий Windows",    en: "Windows Event Viewer",
      dru: "Отфильтруйте события безопасности и найдите подозрительные входы.",
      den: "Filter security events and spot suspicious logons." },
    { id: "pcap",     icon: "activity", ru: "Анализ трафика",            en: "Traffic analyzer",
      dru: "Просмотрите образец пакетов, отфильтруйте по протоколу и найдите маяк C2.",
      den: "Browse a sample capture, filter by protocol and find the C2 beacon." },
    { id: "procs",    icon: "cpu",      ru: "Процессы и автозапуск",     en: "Processes & autoruns",
      dru: "Найдите вредоносный процесс и точку закрепления среди легитимных.",
      den: "Find the malicious process and the persistence entry among legit ones." },
    { id: "firewall", icon: "shield",   ru: "Правила файрвола",          en: "Firewall rules",
      dru: "Соберите корректный набор правил для заданной политики.",
      den: "Build a correct ruleset for the given policy." },
    { id: "attack",   icon: "grid",     ru: "Матрица MITRE ATT&CK",      en: "MITRE ATT&CK matrix",
      dru: "Справочник тактик и техник с примерами обнаружения.",
      den: "Reference of tactics and techniques with detection ideas." },
    { id: "case",     icon: "search",   ru: "Разбор инцидента",          en: "Investigation case",
      dru: "Пошаговое расследование: соберите улики и сопоставьте с ATT&CK.",
      den: "Step-by-step investigation: gather evidence and map it to ATT&CK." },
    { id: "decoder",  icon: "code",     ru: "Декодер",                   en: "Decoder",
      dru: "Base64 / Hex / URL / ROT13 — расшифруйте закодированные строки и флаги.",
      den: "Base64 / Hex / URL / ROT13 — decode encoded strings and flags." },
  ];

  // Флаги, спрятанные в данных инструментов (нужно найти/декодировать)
  const FLAGS = {
    headers:  "CYBER{reply_to_tells_all}",
    events:   "CYBER{enc_powershell_logon}",
    pcap:     "CYBER{sixty_second_beacon}",
    procs:    "CYBER{run_key_persistence}",
    firewall: "CYBER{default_deny_wins}",
    case:     "CYBER{full_kill_chain}",
  };

  /* =======================================================================
     Точка входа
     ======================================================================= */
  function render(mountEl, apiObj) {
    api = apiObj; mount = mountEl;
    const tool = api.tool;
    if (tool && TOOLS.some((t) => t.id === tool)) renderTool(tool);
    else renderHub();
  }

  function renderHub() {
    mount.innerHTML = `
      <section class="section">
        ${api.crumbs([["home", T("Главная")], [null, T("Инструменты")]])}
        <div class="page-title">
          <h1>${T("Инструменты Blue Team")}</h1>
          <p>${T("Безопасные учебные симуляторы на вымышленных данных: разбор писем, журналов, трафика, процессов и инцидентов. Решайте задания — получайте XP.")}</p>
        </div>
        <div class="tool-grid">
          ${TOOLS.map(toolCard).join("")}
        </div>
      </section>`;
  }

  function toolCard(t) {
    return `
      <article class="tool-card card reveal" tabindex="0" role="button"
        onclick="Toolkit.open('${t.id}')"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}">
        <span class="tool-ic">${api.icon(t.icon)}</span>
        <h3>${L(t.ru, t.en)}</h3>
        <p>${L(t.dru, t.den)}</p>
        <span class="tool-go">${T("Открыть")} →</span>
      </article>`;
  }

  function toolHeader(t) {
    return `
      ${api.crumbs([["home", T("Главная")], ["tools", T("Инструменты")], [null, L(t.ru, t.en)]])}
      <div class="page-title tool-head">
        <h1><span class="tool-ic sm">${api.icon(t.icon)}</span>${L(t.ru, t.en)}</h1>
        <p>${L(t.dru, t.den)}</p>
      </div>`;
  }

  function renderTool(id) {
    if (state.__tool !== id) { for (const k in state) delete state[k]; state.__tool = id; }
    const t = TOOLS.find((x) => x.id === id);
    const head = toolHeader(t);
    if (id === "headers") renderHeaders(head);
    else if (id === "events") renderEvents(head);
    else if (id === "pcap") renderPcap(head);
    else if (id === "procs") renderProcs(head);
    else if (id === "firewall") renderFirewall(head);
    else if (id === "attack") renderAttack(head);
    else if (id === "case") renderCase(head);
    else if (id === "decoder") renderDecoder(head);
  }

  function solved(key, xp) {
    const got = api.award(xp, key);
    if (got) renderTool(api.tool);
    return got;
  }
  function badge(key, label) {
    return api.Progress.bonusDone(key)
      ? `<span class="tool-done">${api.icon("check")} ${label || T("Решено")}</span>` : "";
  }

  // --- Общий блок флаг-квеста ---
  function flagKey(tool) { return "flag_" + tool; }
  function flagQuest(tool, hintRu, hintEn, revealKey) {
    const key = flagKey(tool);
    const done = api.Progress.bonusDone(key);
    const reveal = revealKey && api.Progress.bonusDone(revealKey);
    return `
      <div class="tool-pane card flag-quest ${done ? "done" : ""}">
        <h3>${api.icon("flag")} ${T("Квест: найдите флаг")} ${badge(key, T("Флаг найден"))}</h3>
        ${done
          ? `<p class="tool-hint">${T("Флаг")}: <code>${esc(FLAGS[tool])}</code></p>`
          : `<p>${T("Найдите скрытый флаг формата")} <code>CYBER{...}</code>.</p>
             <div class="tool-row">
               <input id="flag-${tool}" class="tool-input" placeholder="CYBER{...}" value="${reveal ? esc(FLAGS[tool]) : ""}" onkeydown="if(event.key==='Enter')Toolkit.flagSubmit('${tool}')">
               <button class="btn btn-primary btn-sm" onclick="Toolkit.flagSubmit('${tool}')">${T("Сдать флаг")}</button>
             </div>
             <div id="flag-fb-${tool}" class="feedback"></div>
             <p class="tool-hint">${reveal ? T("Задание решено — флаг раскрыт, сдайте его.") : L(hintRu, hintEn)}</p>`}
      </div>`;
  }
  function flagSubmit(tool) {
    const el = document.getElementById("flag-" + tool);
    const fb = document.getElementById("flag-fb-" + tool);
    const v = (el ? el.value : "").trim();
    if (v === FLAGS[tool]) {
      const key = flagKey(tool);
      if (api.award(100, key, "flags")) { renderTool(tool); return; }
      if (fb) fb.innerHTML = `<span class="fb-ok">${T("Верно!")}</span>`;
    } else if (fb) {
      fb.innerHTML = v ? `<span class="fb-err">${T("Неверный флаг. Проверьте формат CYBER{...} и декодирование.")}</span>`
                       : `<span class="fb-warn">${T("Введите флаг")}</span>`;
    }
  }

  /* =======================================================================
     1) Анализ заголовков письма
     ======================================================================= */
  const MAIL_SAMPLES = [
    {
      id: "spoof",
      ru: "Фишинг: подмена банка",
      en: "Phishing: bank spoof",
      verdict: "fail",
      text:
`Delivered-To: ivan@company.ru
Received: from mail-relay.company.ru (10.0.0.12)
 by mx.company.ru with ESMTPS; Tue, 30 Sep 2025 09:14:02 +0300
Received: from cheap-vps-203.example-host.net (185.212.47.19)
 by mail-relay.company.ru; Tue, 30 Sep 2025 09:14:01 +0300
Authentication-Results: mx.company.ru;
 spf=fail (sender IP is 185.212.47.19) smtp.mailfrom=billing@secure-bank-alerts.top;
 dkim=none;
 dmarc=fail (p=reject) header.from=yourbank.ru
From: "YourBank Security" <security@yourbank.ru>
Return-Path: <billing@secure-bank-alerts.top>
Reply-To: <refund-desk@secure-bank-alerts.top>
Subject: Your account will be blocked in 24 hours
Message-ID: <a7f3@secure-bank-alerts.top>`,
    },
    {
      id: "legit",
      ru: "Легитимная рассылка",
      en: "Legitimate newsletter",
      verdict: "pass",
      text:
`Delivered-To: ivan@company.ru
Received: from out.news.github.com (192.30.252.200)
 by mx.company.ru with ESMTPS; Tue, 30 Sep 2025 10:02:11 +0300
Authentication-Results: mx.company.ru;
 spf=pass (sender IP is 192.30.252.200) smtp.mailfrom=noreply@github.com;
 dkim=pass header.d=github.com;
 dmarc=pass (p=quarantine) header.from=github.com
From: "GitHub" <noreply@github.com>
Return-Path: <noreply@github.com>
Reply-To: <noreply@github.com>
Subject: [CyberPath] New sign-in from a known device
Message-ID: <b21c@github.com>`,
    },
    {
      id: "replyto",
      ru: "BEC: подмена Reply-To",
      en: "BEC: Reply-To swap",
      verdict: "suspicious",
      text:
`Delivered-To: cfo@company.ru
Received: from mail.partner-corp.com (203.0.113.44)
 by mx.company.ru with ESMTPS; Tue, 30 Sep 2025 11:40:55 +0300
Authentication-Results: mx.company.ru;
 spf=pass (sender IP is 203.0.113.44) smtp.mailfrom=ceo@partner-corp.com;
 dkim=pass header.d=partner-corp.com;
 dmarc=pass header.from=partner-corp.com
From: "CEO Partner-Corp" <ceo@partner-corp.com>
Return-Path: <ceo@partner-corp.com>
Reply-To: <ceo.partnercorp@gmail.com>
Subject: Urgent wire transfer — confidential
X-Forwarded-Token: Q1lCRVJ7cmVwbHlfdG9fdGVsbHNfYWxsfQ==
Message-ID: <c99a@partner-corp.com>`,
    },
    {
      id: "homograph",
      ru: "Фишинг: домен-двойник",
      en: "Phishing: lookalike domain",
      verdict: "fail",
      text:
`Delivered-To: ivan@company.ru
Received: from srv18.maiil-paypaI.com (45.9.148.77)
 by mx.company.ru with ESMTPS; Tue, 30 Sep 2025 13:05:19 +0300
Authentication-Results: mx.company.ru;
 spf=pass (sender IP is 45.9.148.77) smtp.mailfrom=service@maiil-paypaI.com;
 dkim=pass header.d=maiil-paypaI.com;
 dmarc=fail (p=none) header.from=paypal.com
From: "PayPal Service" <service@paypal.com>
Return-Path: <service@maiil-paypaI.com>
Reply-To: <service@maiil-paypaI.com>
Subject: We limited your account — confirm now
Message-ID: <d4e1@maiil-paypaI.com>`,
    },
  ];

  function renderHeaders(head) {
    const cur = state.mailSample || MAIL_SAMPLES[0];
    state.mailSample = cur;
    mount.innerHTML = `
      <section class="section">${head}
        <div class="tool-pane card">
          <div class="tool-row">
            <label>${T("Образец")}:</label>
            <select class="tool-select" onchange="Toolkit.mailPick(this.value)">
              ${MAIL_SAMPLES.map((s) => `<option value="${s.id}" ${s.id === cur.id ? "selected" : ""}>${L(s.ru, s.en)}</option>`).join("")}
            </select>
            <button class="btn btn-sm" onclick="Toolkit.mailClear()">${T("Свой текст")}</button>
          </div>
          <textarea id="mail-src" class="tool-area" spellcheck="false">${esc(state.mailCustom != null ? state.mailCustom : cur.text)}</textarea>
          <div class="tool-row">
            <button class="btn btn-primary" onclick="Toolkit.mailAnalyze()">${api.icon("search")} ${T("Разобрать")}</button>
            <span class="tool-hint">${T("Порядок триажа: сначала Authentication-Results, затем сверьте From / Return-Path / Reply-To.")}</span>
          </div>
          <div id="mail-out"></div>
        </div>
        <div class="tool-pane card">
          <h3>${T("Задание")} ${badge("hdr_task")}</h3>
          <p>${T("Разберите все образцы. Для какого из них вердикт — «пройдено» (не фишинг)?")}</p>
          <div class="quiz-opts">
            ${MAIL_SAMPLES.map((s) => `<button class="quiz-opt" onclick="Toolkit.mailAnswer('${s.id}')">${L(s.ru, s.en)}</button>`).join("")}
          </div>
          <div id="mail-fb" class="feedback"></div>
        </div>
        ${flagQuest("headers",
          "В образце «BEC» есть заголовок X-Forwarded-Token с Base64. Декодируйте его (инструмент «Декодер») — внутри флаг.",
          "The “BEC” sample has an X-Forwarded-Token header in Base64. Decode it (the “Decoder” tool) — the flag is inside.")}
      </section>`;
    if (state.mailAnalyzed) mailAnalyze();
  }

  function parseHeaders(text) {
    const get = (re) => { const m = text.match(re); return m ? m[1].trim() : null; };
    const auth = (text.match(/Authentication-Results:[\s\S]*?(?=\n\S|$)/i) || [""])[0];
    const res = (name) => { const m = auth.match(new RegExp(name + "\\s*=\\s*(\\w+)", "i")); return m ? m[1].toLowerCase() : null; };
    const addr = (s) => { if (!s) return null; const m = s.match(/<([^>]+)>/); return (m ? m[1] : s).trim().toLowerCase(); };
    const dom = (a) => (a && a.includes("@") ? a.split("@")[1] : null);
    const from = addr(get(/^From:\s*(.+)$/im));
    const rpath = addr(get(/^Return-Path:\s*(.+)$/im));
    const reply = addr(get(/^Reply-To:\s*(.+)$/im));
    return {
      spf: res("spf"), dkim: res("dkim"), dmarc: res("dmarc"),
      from, rpath, reply,
      fromDom: dom(from), rpathDom: dom(rpath), replyDom: dom(reply),
      subject: get(/^Subject:\s*(.+)$/im),
    };
  }

  function mailAnalyze() {
    state.mailAnalyzed = true;
    const ta = document.getElementById("mail-src");
    const text = ta ? ta.value : "";
    const h = parseHeaders(text);
    const flags = [];
    const chip = (v) => {
      const ok = v === "pass", bad = v === "fail" || v === "none";
      const cls = ok ? "ok" : bad ? "bad" : "warn";
      return `<span class="auth-chip ${cls}">${v || "—"}</span>`;
    };
    if (h.dmarc === "fail") flags.push(L("DMARC = fail: письмо не прошло проверку подлинности домена.", "DMARC = fail: message failed domain authentication."));
    if (h.spf === "fail") flags.push(L("SPF = fail: отправляющий сервер не авторизован доменом.", "SPF = fail: sending server is not authorized by the domain."));
    if (h.dkim === "none") flags.push(L("DKIM отсутствует: нет криптоподписи заголовков.", "DKIM missing: no cryptographic signature of headers."));
    if (h.fromDom && h.rpathDom && h.fromDom !== h.rpathDom)
      flags.push(L(`From (${h.fromDom}) ≠ Return-Path (${h.rpathDom}): типичный признак подмены.`, `From (${h.fromDom}) ≠ Return-Path (${h.rpathDom}): a classic spoofing sign.`));
    if (h.replyDom && h.fromDom && h.replyDom !== h.fromDom)
      flags.push(L(`Reply-To (${h.replyDom}) уводит ответ на другой домен — частый приём BEC.`, `Reply-To (${h.replyDom}) redirects replies to another domain — a common BEC trick.`));
    let verdict, vcls;
    if (h.dmarc === "fail" || h.spf === "fail") { verdict = L("Фишинг / подмена", "Phishing / spoofed"); vcls = "bad"; }
    else if (flags.length) { verdict = L("Подозрительно — проверьте вручную", "Suspicious — verify manually"); vcls = "warn"; }
    else { verdict = L("Похоже на легитимное", "Looks legitimate"); vcls = "ok"; }
    const out = document.getElementById("mail-out");
    if (!out) return;
    out.innerHTML = `
      <div class="auth-grid">
        <div><span class="auth-k">SPF</span>${chip(h.spf)}</div>
        <div><span class="auth-k">DKIM</span>${chip(h.dkim)}</div>
        <div><span class="auth-k">DMARC</span>${chip(h.dmarc)}</div>
      </div>
      <table class="tool-table compact">
        <tr><td>From</td><td>${esc(h.from || "—")}</td></tr>
        <tr><td>Return-Path</td><td>${esc(h.rpath || "—")}</td></tr>
        <tr><td>Reply-To</td><td>${esc(h.reply || "—")}</td></tr>
        <tr><td>Subject</td><td>${esc(h.subject || "—")}</td></tr>
      </table>
      <div class="verdict ${vcls}">${T("Вердикт")}: <b>${verdict}</b></div>
      ${flags.length ? `<ul class="flag-list">${flags.map((f) => `<li>${api.icon("alert")} ${f}</li>`).join("")}</ul>`
        : `<p class="tool-hint">${T("Красных флагов не обнаружено.")}</p>`}`;
  }

  function mailPick(id) { state.mailSample = MAIL_SAMPLES.find((s) => s.id === id); state.mailCustom = null; state.mailAnalyzed = false; renderTool("headers"); }
  function mailClear() { state.mailCustom = ""; state.mailAnalyzed = false; renderTool("headers"); }
  function mailAnswer(id) {
    const fb = document.getElementById("mail-fb");
    if (id === "legit") {
      if (!api.Progress.bonusDone("hdr_task")) { if (solved("hdr_task", 60)) return; }
      if (fb) fb.innerHTML = `<span class="fb-ok">${T("Верно! Рассылка GitHub проходит SPF, DKIM и DMARC.")}</span>`;
    } else if (fb) {
      fb.innerHTML = `<span class="fb-err">${T("Нет. Разберите Authentication-Results этого образца ещё раз.")}</span>`;
    }
  }

  /* =======================================================================
     2) Журнал событий Windows
     ======================================================================= */
  const EVENTS = [
    { id: 1, t: "08:59:12", eid: 4624, lvl: "info", ru: "Успешный вход (Logon Type 2, консоль)", en: "Successful logon (Logon Type 2, console)", who: "COMPANY\\ivan", ip: "-" },
    { id: 2, t: "09:01:44", eid: 4624, lvl: "info", ru: "Успешный вход (Logon Type 7, разблокировка)", en: "Successful logon (Logon Type 7, unlock)", who: "COMPANY\\ivan", ip: "-" },
    { id: 3, t: "02:14:03", eid: 4625, lvl: "warn", ru: "Отказ входа — неверный пароль", en: "Failed logon — bad password", who: "COMPANY\\administrator", ip: "185.212.47.19" },
    { id: 4, t: "02:14:05", eid: 4625, lvl: "warn", ru: "Отказ входа — неверный пароль", en: "Failed logon — bad password", who: "COMPANY\\administrator", ip: "185.212.47.19" },
    { id: 5, t: "02:14:07", eid: 4625, lvl: "warn", ru: "Отказ входа — неверный пароль", en: "Failed logon — bad password", who: "COMPANY\\administrator", ip: "185.212.47.19" },
    { id: 6, t: "02:14:09", eid: 4625, lvl: "warn", ru: "Отказ входа — неверный пароль", en: "Failed logon — bad password", who: "COMPANY\\administrator", ip: "185.212.47.19" },
    { id: 7, t: "02:14:12", eid: 4624, lvl: "crit", ru: "Успешный вход (Logon Type 3, по сети)", en: "Successful logon (Logon Type 3, network)", who: "COMPANY\\administrator", ip: "185.212.47.19" },
    { id: 8, t: "02:14:40", eid: 4672, lvl: "crit", ru: "Назначены привилегии администратора", en: "Admin privileges assigned", who: "COMPANY\\administrator", ip: "185.212.47.19" },
    { id: 9, t: "02:15:02", eid: 4688, lvl: "warn", ru: "Запущен процесс: powershell.exe -enc Q1lCRVJ7ZW5jX3Bvd2Vyc2hlbGxfbG9nb259", en: "Process created: powershell.exe -enc Q1lCRVJ7ZW5jX3Bvd2Vyc2hlbGxfbG9nb259", who: "COMPANY\\administrator", ip: "-" },
    { id: 10, t: "02:15:40", eid: 4720, lvl: "crit", ru: "Создана учётная запись: COMPANY\\svc_backup", en: "User account created: COMPANY\\svc_backup", who: "COMPANY\\administrator", ip: "-" },
    { id: 11, t: "02:16:05", eid: 4698, lvl: "warn", ru: "Создана задача планировщика: \\Updater", en: "Scheduled task created: \\Updater", who: "COMPANY\\administrator", ip: "-" },
    { id: 12, t: "02:17:22", eid: 1102, lvl: "crit", ru: "Журнал безопасности очищен", en: "Security audit log cleared", who: "COMPANY\\administrator", ip: "-" },
    { id: 13, t: "08:30:00", eid: 4634, lvl: "info", ru: "Выход из системы", en: "Logoff", who: "COMPANY\\maria", ip: "-" },
  ];

  function renderEvents(head) {
    const f = state.evFilter || "all";
    state.evFilter = f;
    const rows = EVENTS.filter((e) => {
      if (f === "all") return true;
      if (f === "fail") return e.eid === 4625;
      if (f === "logon") return e.eid === 4624;
      if (f === "crit") return e.lvl === "crit";
      return true;
    });
    mount.innerHTML = `
      <section class="section">${head}
        <div class="tool-pane card">
          <div class="tool-row">
            <label>${T("Фильтр")}:</label>
            ${[["all", T("Все")], ["fail", "4625 — " + T("отказы")], ["logon", "4624 — " + T("входы")], ["crit", T("критичные")]]
              .map(([v, n]) => `<button class="chip-btn ${f === v ? "on" : ""}" onclick="Toolkit.evFilter('${v}')">${n}</button>`).join("")}
          </div>
          <table class="tool-table">
            <thead><tr><th>${T("Время")}</th><th>Event ID</th><th>${T("Уровень")}</th><th>${T("Описание")}</th><th>${T("Учётка")}</th><th>IP</th></tr></thead>
            <tbody>
              ${rows.map((e) => `<tr class="ev-${e.lvl}">
                <td>${e.t}</td><td><b>${e.eid}</b></td>
                <td><span class="lvl-dot ${e.lvl}"></span></td>
                <td>${L(e.ru, e.en)}</td><td>${esc(e.who)}</td>
                <td>${e.ip === "-" ? "—" : `<code>${e.ip}</code>`}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
        <div class="tool-pane card">
          <h3>${T("Задание")} ${badge("ev_task")}</h3>
          <p>${T("С какого IP велась атака перебором пароля (brute-force), которая завершилась успешным входом?")}</p>
          <div class="tool-row">
            <input id="ev-ans" class="tool-input" placeholder="185.x.x.x" onkeydown="if(event.key==='Enter')Toolkit.evAnswer()">
            <button class="btn btn-primary btn-sm" onclick="Toolkit.evAnswer()">${T("Проверить")}</button>
          </div>
          <div id="ev-fb" class="feedback"></div>
          <p class="tool-hint">${T("Подсказка: ищите серию 4625 подряд, за которой идёт 4624 с той же учётки и IP, ночью.")}</p>
        </div>
        ${flagQuest("events",
          "Событие 4688 запускает powershell.exe -enc <Base64>. Декодируйте аргумент (инструмент «Декодер») — это и есть флаг.",
          "Event 4688 runs powershell.exe -enc <Base64>. Decode the argument (the “Decoder” tool) — that's the flag.")}
      </section>`;
  }
  function evFilter(v) { state.evFilter = v; renderTool("events"); }
  function evAnswer() {
    const el = document.getElementById("ev-ans"); const fb = document.getElementById("ev-fb");
    const v = (el ? el.value : "").trim();
    if (v === "185.212.47.19") {
      if (solved("ev_task", 70)) return;
      if (fb) fb.innerHTML = `<span class="fb-ok">${T("Верно! Серия 4625 → 4624 → 4672 → 4688 указывает на успешный перебор и повышение привилегий.")}</span>`;
    } else if (fb) fb.innerHTML = `<span class="fb-err">${T("Неверно. Отфильтруйте 4625 и посмотрите повторяющийся IP ночью.")}</span>`;
  }

  /* =======================================================================
     3) Анализ трафика (учебный образец)
     ======================================================================= */
  const PACKETS = [
    { no: 1, t: "0.000", src: "10.0.0.15", dst: "10.0.0.1", proto: "DNS", info: "Standard query A update.windows.com" },
    { no: 2, t: "0.004", src: "10.0.0.1", dst: "10.0.0.15", proto: "DNS", info: "Response A 23.57.12.9" },
    { no: 3, t: "0.051", src: "10.0.0.15", dst: "23.57.12.9", proto: "TLS", info: "Client Hello (SNI update.windows.com)" },
    { no: 4, t: "1.220", src: "10.0.0.15", dst: "10.0.0.1", proto: "DNS", info: "Standard query A cdn.jsdelivr.net" },
    { no: 5, t: "5.000", src: "10.0.0.15", dst: "185.212.47.19", proto: "HTTP", info: "GET /gate.php?id=WIN-7F3A HTTP/1.1" },
    { no: 6, t: "5.040", src: "185.212.47.19", dst: "10.0.0.15", proto: "HTTP", info: "200 OK (34 bytes)" },
    { no: 7, t: "65.001", src: "10.0.0.15", dst: "185.212.47.19", proto: "HTTP", info: "GET /gate.php?id=WIN-7F3A HTTP/1.1" },
    { no: 8, t: "65.038", src: "185.212.47.19", dst: "10.0.0.15", proto: "HTTP", info: "200 OK (34 bytes)" },
    { no: 9, t: "125.002", src: "10.0.0.15", dst: "185.212.47.19", proto: "HTTP", info: "GET /gate.php?id=WIN-7F3A HTTP/1.1" },
    { no: 10, t: "125.045", src: "185.212.47.19", dst: "10.0.0.15", proto: "HTTP", info: "200 OK  X-Task: Q1lCRVJ7c2l4dHlfc2Vjb25kX2JlYWNvbn0=" },
    { no: 11, t: "130.5", src: "10.0.0.15", dst: "8.8.8.8", proto: "DNS", info: "Standard query A time.nist.gov" },
    { no: 12, t: "185.004", src: "10.0.0.15", dst: "185.212.47.19", proto: "HTTP", info: "POST /gate.php (1024 bytes) — exfil chunk 1/8" },
    { no: 13, t: "186.221", src: "10.0.0.15", dst: "10.0.0.1", proto: "DNS", info: "Standard query TXT YWJjZA.exfil.attacker-dns.io" },
  ];

  function renderPcap(head) {
    const f = state.pkFilter || "all";
    state.pkFilter = f;
    const rows = PACKETS.filter((p) => f === "all" || p.proto.toLowerCase() === f);
    mount.innerHTML = `
      <section class="section">${head}
        <div class="tool-pane card">
          <div class="tool-row">
            <label>${T("Протокол")}:</label>
            ${["all", "dns", "tls", "http"].map((v) => `<button class="chip-btn ${f === v ? "on" : ""}" onclick="Toolkit.pkFilter('${v}')">${v === "all" ? T("Все") : v.toUpperCase()}</button>`).join("")}
          </div>
          <table class="tool-table mono">
            <thead><tr><th>#</th><th>${T("Время")}</th><th>${T("Источник")}</th><th>${T("Назначение")}</th><th>${T("Протокол")}</th><th>Info</th></tr></thead>
            <tbody>
              ${rows.map((p) => `<tr class="${p.dst === "185.212.47.19" || p.src === "185.212.47.19" ? "pk-bad" : ""}">
                <td>${p.no}</td><td>${p.t}</td><td>${p.src}</td><td>${p.dst}</td>
                <td><span class="proto ${p.proto.toLowerCase()}">${p.proto}</span></td><td>${esc(p.info)}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
        <div class="tool-pane card">
          <h3>${T("Задание")} ${badge("pk_task")}</h3>
          <p>${T("Хост обращается к одному адресу через равные промежутки (~60 с) с одинаковым запросом. Это «маяк» (beacon) C2. Назовите IP управляющего сервера.")}</p>
          <div class="tool-row">
            <input id="pk-ans" class="tool-input" placeholder="x.x.x.x" onkeydown="if(event.key==='Enter')Toolkit.pkAnswer()">
            <button class="btn btn-primary btn-sm" onclick="Toolkit.pkAnswer()">${T("Проверить")}</button>
          </div>
          <div id="pk-fb" class="feedback"></div>
          <p class="tool-hint">${T("Признак beaconing: повторяющиеся запросы к /gate.php с одинаковым размером ответа и ровным интервалом.")}</p>
        </div>
        ${flagQuest("pcap",
          "В ответе 200 OK от C2 есть заголовок X-Task с Base64. Декодируйте его (инструмент «Декодер») — внутри флаг.",
          "The C2's 200 OK response carries an X-Task header in Base64. Decode it (the “Decoder” tool) — the flag is inside.")}
      </section>`;
  }
  function pkFilter(v) { state.pkFilter = v; renderTool("pcap"); }
  function pkAnswer() {
    const el = document.getElementById("pk-ans"); const fb = document.getElementById("pk-fb");
    const v = (el ? el.value : "").trim();
    if (v === "185.212.47.19") {
      if (solved("pk_task", 70)) return;
      if (fb) fb.innerHTML = `<span class="fb-ok">${T("Верно! Регулярные GET /gate.php — классический HTTP-beacon к C2.")}</span>`;
    } else if (fb) fb.innerHTML = `<span class="fb-err">${T("Неверно. Отфильтруйте HTTP и найдите повторяющийся адрес.")}</span>`;
  }

  /* =======================================================================
     4) Процессы и автозапуск
     ======================================================================= */
  const PROCS = [
    { pid: 684, name: "svchost.exe", path: "C:\\Windows\\System32\\svchost.exe", parent: "services.exe", sig: true, bad: false },
    { pid: 912, name: "explorer.exe", path: "C:\\Windows\\explorer.exe", parent: "userinit.exe", sig: true, bad: false },
    { pid: 1340, name: "chrome.exe", path: "C:\\Program Files\\Google\\Chrome\\chrome.exe", parent: "explorer.exe", sig: true, bad: false },
    { pid: 2208, name: "svch0st.exe", path: "C:\\Users\\ivan\\AppData\\Roaming\\svch0st.exe", parent: "powershell.exe", sig: false, bad: true },
    { pid: 1776, name: "MsMpEng.exe", path: "C:\\ProgramData\\Microsoft\\Windows Defender\\MsMpEng.exe", parent: "services.exe", sig: true, bad: false },
  ];
  const AUTORUNS = [
    { key: "HKCU\\...\\Run", name: "OneDrive", cmd: "C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe /background", bad: false },
    { key: "HKCU\\...\\Run", name: "Updater", cmd: "powershell -w hidden -enc Q1lCRVJ7cnVuX2tleV9wZXJzaXN0ZW5jZX0=", bad: true },
    { key: "HKLM\\...\\Run", name: "SecurityHealth", cmd: "C:\\Windows\\System32\\SecurityHealthSystray.exe", bad: false },
  ];

  function renderProcs(head) {
    mount.innerHTML = `
      <section class="section">${head}
        <div class="tool-pane card">
          <h3>${T("Процессы")}</h3>
          <table class="tool-table mono">
            <thead><tr><th>PID</th><th>${T("Имя")}</th><th>${T("Путь")}</th><th>${T("Родитель")}</th><th>${T("Подпись")}</th><th></th></tr></thead>
            <tbody>
              ${PROCS.map((p) => `<tr>
                <td>${p.pid}</td><td>${esc(p.name)}</td><td>${esc(p.path)}</td><td>${esc(p.parent)}</td>
                <td>${p.sig ? `<span class="sig ok">${T("да")}</span>` : `<span class="sig bad">${T("нет")}</span>`}</td>
                <td><button class="chip-btn sm" onclick="Toolkit.procFlag(${p.pid})">${T("Пометить")}</button></td></tr>`).join("")}
            </tbody>
          </table>
        </div>
        <div class="tool-pane card">
          <h3>${T("Автозапуск")}</h3>
          <table class="tool-table mono">
            <thead><tr><th>${T("Ключ реестра")}</th><th>${T("Имя")}</th><th>${T("Команда")}</th></tr></thead>
            <tbody>
              ${AUTORUNS.map((a, i) => `<tr class="${state.autoPick === i ? (a.bad ? "pk-bad" : "pk-good") : ""}" onclick="Toolkit.autoPick(${i})" style="cursor:pointer">
                <td>${esc(a.key)}</td><td>${esc(a.name)}</td><td>${esc(a.cmd)}</td></tr>`).join("")}
            </tbody>
          </table>
          <p class="tool-hint">${T("Кликните строку автозапуска, которая закрепляет вредонос.")}</p>
        </div>
        <div class="tool-pane card">
          <h3>${T("Задание")} ${badge("pr_task")}</h3>
          <p>${T("Пометьте вредоносный процесс (кнопка «Пометить») и выберите вредоносную запись автозапуска.")}</p>
          <div id="pr-fb" class="feedback"></div>
          <p class="tool-hint">${T("Признаки: имя-двойник (svch0st), путь в AppData, запуск из PowerShell, нет подписи, скрытая -enc команда.")}</p>
        </div>
        ${flagQuest("procs",
          "Запись автозапуска «Updater» запускает powershell -enc <Base64>. Декодируйте аргумент (инструмент «Декодер») — это флаг.",
          "The “Updater” autorun runs powershell -enc <Base64>. Decode the argument (the “Decoder” tool) — that's the flag.")}
      </section>`;
  }
  function procFlag(pid) {
    state.procPick = pid;
    checkProcs();
    renderTool("procs");
  }
  function autoPick(i) { state.autoPick = i; checkProcs(); renderTool("procs"); }
  function checkProcs() {
    const pOk = PROCS.find((p) => p.pid === state.procPick && p.bad);
    const aOk = state.autoPick != null && AUTORUNS[state.autoPick] && AUTORUNS[state.autoPick].bad;
    if (pOk && aOk) solved("pr_task", 80);
  }

  /* =======================================================================
     5) Правила файрвола
     ======================================================================= */
  const FW_RULES = [
    { id: "r1", ru: "Разрешить исходящий 443/TCP (HTTPS) в интернет", en: "Allow outbound 443/TCP (HTTPS) to internet", good: true },
    { id: "r2", ru: "Разрешить входящий 3389/TCP (RDP) из интернета всем", en: "Allow inbound 3389/TCP (RDP) from internet to all", good: false },
    { id: "r3", ru: "Запретить входящий 445/TCP (SMB) из интернета", en: "Deny inbound 445/TCP (SMB) from internet", good: true },
    { id: "r4", ru: "Разрешить входящий 3389/TCP (RDP) только из VPN-подсети", en: "Allow inbound 3389/TCP (RDP) from VPN subnet only", good: true },
    { id: "r5", ru: "Разрешить весь входящий трафик (any/any)", en: "Allow all inbound traffic (any/any)", good: false },
    { id: "r6", ru: "Запретить всё остальное (default deny)", en: "Deny everything else (default deny)", good: true },
  ];
  function renderFirewall(head) {
    state.fw = state.fw || {};
    mount.innerHTML = `
      <section class="section">${head}
        <div class="tool-pane card">
          <h3>${T("Политика")}</h3>
          <p>${T("Нужен доступ сотрудников в интернет по HTTPS и удалённый доступ по RDP только через VPN. Из интернета ничего лишнего. Отметьте правила, которые должны войти в набор.")}</p>
          <div class="fw-list">
            ${FW_RULES.map((r) => `<label class="fw-rule">
              <input type="checkbox" ${state.fw[r.id] ? "checked" : ""} onchange="Toolkit.fwToggle('${r.id}', this.checked)">
              <span>${L(r.ru, r.en)}</span></label>`).join("")}
          </div>
          <div class="tool-row">
            <button class="btn btn-primary" onclick="Toolkit.fwCheck()">${T("Проверить набор")}</button>
            ${badge("fw_task")}
          </div>
          <div id="fw-fb" class="feedback"></div>
        </div>
        ${flagQuest("firewall",
          "Соберите корректный набор правил и нажмите «Проверить набор» — флаг появится здесь.",
          "Build the correct ruleset and click “Check ruleset” — the flag will appear here.", "fw_task")}
      </section>`;
  }
  function fwToggle(id, v) { state.fw[id] = v; }
  function fwCheck() {
    const fb = document.getElementById("fw-fb");
    const wrong = FW_RULES.filter((r) => !!state.fw[r.id] !== r.good);
    if (wrong.length === 0) {
      if (solved("fw_task", 70)) return;
      if (fb) fb.innerHTML = `<span class="fb-ok">${T("Идеально! Минимум доступа + default deny.")}</span>`;
    } else if (fb) {
      fb.innerHTML = `<span class="fb-err">${T("Ошибок")}: ${wrong.length}. ${T("Подумайте: открытый из интернета RDP и any/any опасны, а default deny обязателен.")}</span>`;
    }
  }

  /* =======================================================================
     6) Матрица MITRE ATT&CK (справочник)
     ======================================================================= */
  const ATTACK = [
    { tac: "TA0001", ru: "Первичный доступ", en: "Initial Access", techs: [
      { id: "T1566", ru: "Фишинг", en: "Phishing", det: { ru: "Анализ заголовков, DMARC, обучение пользователей.", en: "Header analysis, DMARC, user training." } },
      { id: "T1133", ru: "Внешние удалённые сервисы", en: "External Remote Services", det: { ru: "Мониторинг входов 4624/4625 извне, VPN-логи.", en: "Monitor external 4624/4625 logons, VPN logs." } },
    ] },
    { tac: "TA0002", ru: "Выполнение", en: "Execution", techs: [
      { id: "T1059", ru: "Командный интерпретатор", en: "Command and Scripting Interpreter", det: { ru: "4688 + аудит PowerShell (ScriptBlock), поиск -enc.", en: "4688 + PowerShell ScriptBlock logging, hunt for -enc." } },
    ] },
    { tac: "TA0003", ru: "Закрепление", en: "Persistence", techs: [
      { id: "T1547", ru: "Автозапуск (Run-ключи)", en: "Boot/Logon Autostart", det: { ru: "Autoruns, мониторинг изменений ...\\Run.", en: "Autoruns, monitor ...\\Run changes." } },
      { id: "T1053", ru: "Планировщик задач", en: "Scheduled Task", det: { ru: "Событие 4698, аудит schtasks.", en: "Event 4698, audit schtasks." } },
    ] },
    { tac: "TA0005", ru: "Обход защиты", en: "Defense Evasion", techs: [
      { id: "T1036", ru: "Маскировка (имена-двойники)", en: "Masquerading", det: { ru: "Сверка пути и подписи процесса (svch0st vs svchost).", en: "Check process path & signature (svch0st vs svchost)." } },
    ] },
    { tac: "TA0011", ru: "Управление (C2)", en: "Command and Control", techs: [
      { id: "T1071", ru: "Прикладной протокол (HTTP/S)", en: "Application Layer Protocol", det: { ru: "Поиск beaconing: ровный интервал, одинаковый размер.", en: "Hunt beaconing: fixed interval, constant size." } },
    ] },
    { tac: "TA0010", ru: "Эксфильтрация", en: "Exfiltration", techs: [
      { id: "T1041", ru: "Эксфильтрация по каналу C2", en: "Exfiltration Over C2 Channel", det: { ru: "Аномальный объём исходящего к одному хосту.", en: "Anomalous outbound volume to one host." } },
    ] },
  ];
  function renderAttack(head) {
    const sel = state.atkSel;
    mount.innerHTML = `
      <section class="section">${head}
        <div class="tool-pane card">
          <div class="atk-matrix">
            ${ATTACK.map((col) => `
              <div class="atk-col">
                <div class="atk-tac" title="${col.tac}">${L(col.ru, col.en)}</div>
                ${col.techs.map((tc) => `<button class="atk-tech ${sel === tc.id ? "on" : ""}" onclick="Toolkit.atkSel('${tc.id}')">
                  <span class="atk-id">${tc.id}</span>${L(tc.ru, tc.en)}</button>`).join("")}
              </div>`).join("")}
          </div>
        </div>
        <div class="tool-pane card" id="atk-detail">${atkDetail(sel)}</div>
      </section>`;
  }
  function atkDetail(id) {
    let t = null, col = null;
    ATTACK.forEach((c) => c.techs.forEach((x) => { if (x.id === id) { t = x; col = c; } }));
    if (!t) return `<p class="tool-hint">${T("Выберите технику в матрице, чтобы увидеть идею обнаружения.")}</p>`;
    return `
      <h3>${t.id} · ${L(t.ru, t.en)}</h3>
      <p class="atk-tacname">${T("Тактика")}: ${L(col.ru, col.en)} (${col.tac})</p>
      <div class="callout">${api.icon("shield")} <b>${T("Как обнаружить")}:</b> ${L(t.det.ru, t.det.en)}</div>`;
  }
  function atkSel(id) { state.atkSel = id; const d = document.getElementById("atk-detail"); if (d) d.innerHTML = atkDetail(id); renderTool("attack"); }

  /* =======================================================================
     7) Разбор инцидента (соединяет инструменты)
     ======================================================================= */
  const CASE_STEPS = [
    { q: { ru: "Ночью замечена серия 4625 с внешнего IP, затем 4624. Какая тактика ATT&CK?", en: "At night: a burst of 4625 from an external IP, then 4624. Which ATT&CK tactic?" },
      opts: [["Initial Access", true], ["Exfiltration", false], ["Impact", false]] },
    { q: { ru: "Далее 4688: powershell.exe -enc. Какая техника?", en: "Then 4688: powershell.exe -enc. Which technique?" },
      opts: [["T1059 — Command and Scripting Interpreter", true], ["T1566 — Phishing", false], ["T1071 — C2", false]] },
    { q: { ru: "В автозапуске есть «Updater» с hidden -enc. Это:", en: "Autoruns shows 'Updater' with hidden -enc. This is:" },
      opts: [["T1547 — Persistence", true], ["T1036 — Masquerading", false], ["T1041 — Exfiltration", false]] },
    { q: { ru: "В трафике — ровные GET /gate.php каждые 60 с к одному IP. Это:", en: "Traffic shows steady GET /gate.php every 60s to one IP. This is:" },
      opts: [["T1071 — C2 beaconing", true], ["T1133 — Remote Services", false], ["T1053 — Scheduled Task", false]] },
  ];
  function renderCase(head) {
    state.caseAns = state.caseAns || {};
    const total = CASE_STEPS.length;
    const done = Object.keys(state.caseAns).filter((k) => state.caseAns[k] === "ok").length;
    mount.innerHTML = `
      <section class="section">${head}
        <div class="tool-pane card">
          <h3>${T("Сценарий")}</h3>
          <p>${T("Рабочая станция WIN-7F3A ведёт себя странно. Соберите цепочку атаки, отвечая на вопросы по шагам. Используйте другие инструменты как улики.")}</p>
          <div class="case-progress"><span style="width:${Math.round(done / total * 100)}%"></span></div>
          <p class="tool-hint">${done}/${total} ${T("шагов")} ${badge("case_task", T("Разобрано"))}</p>
        </div>
        ${CASE_STEPS.map((s, i) => caseStep(s, i)).join("")}
        ${flagQuest("case",
          "Пройдите все шаги расследования — флаг цепочки появится здесь.",
          "Complete all investigation steps — the kill-chain flag will appear here.", "case_task")}
      </section>`;
  }
  function caseStep(s, i) {
    const st = state.caseAns[i];
    return `
      <div class="tool-pane card case-step ${st === "ok" ? "ok" : ""}">
        <h4>${T("Шаг")} ${i + 1}. ${L(s.q.ru, s.q.en)}</h4>
        <div class="quiz-opts">
          ${s.opts.map(([label], j) => `<button class="quiz-opt ${st === "ok" && s.opts[j][1] ? "correct" : ""}" onclick="Toolkit.caseAnswer(${i},${j})">${esc(label)}</button>`).join("")}
        </div>
        <div class="feedback" id="case-fb-${i}">${st === "ok" ? `<span class="fb-ok">${T("Верно")}</span>` : ""}</div>
      </div>`;
  }
  function caseAnswer(i, j) {
    const correct = CASE_STEPS[i].opts[j][1];
    const fb = document.getElementById("case-fb-" + i);
    if (correct) {
      state.caseAns[i] = "ok";
      const all = CASE_STEPS.every((_, k) => state.caseAns[k] === "ok");
      if (all && solved("case_task", 120)) return;
      renderTool("case");
    } else if (fb) fb.innerHTML = `<span class="fb-err">${T("Нет, сверьтесь с матрицей ATT&CK.")}</span>`;
  }

  /* =======================================================================
     8) Декодер (Base64 / Hex / URL / ROT13)
     ======================================================================= */
  const DEC_OPS = [
    ["b64d", "Base64 → текст", "Base64 → text"],
    ["b64e", "Текст → Base64", "Text → Base64"],
    ["hexd", "Hex → текст", "Hex → text"],
    ["hexe", "Текст → Hex", "Text → Hex"],
    ["urld", "URL-декод", "URL decode"],
    ["rot13", "ROT13", "ROT13"],
  ];
  function decodeOp(op, s) {
    try {
      if (op === "b64d") { try { return decodeURIComponent(escape(atob(s.trim()))); } catch (e) { return atob(s.trim()); } }
      if (op === "b64e") { return btoa(unescape(encodeURIComponent(s))); }
      if (op === "hexd") { const h = s.replace(/[^0-9a-fA-F]/g, ""); let o = ""; for (let i = 0; i < h.length; i += 2) o += String.fromCharCode(parseInt(h.substr(i, 2), 16)); return o; }
      if (op === "hexe") { return Array.from(s).map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join(" "); }
      if (op === "urld") { return decodeURIComponent(s.replace(/\+/g, " ")); }
      if (op === "rot13") { return s.replace(/[a-zA-Z]/g, (c) => { const base = c <= "Z" ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base); }); }
    } catch (e) { return "⚠ " + L("не удалось декодировать — проверьте ввод", "could not decode — check the input"); }
    return "";
  }
  function renderDecoder(head) {
    const op = state.decOp || "b64d";
    state.decOp = op;
    mount.innerHTML = `
      <section class="section">${head}
        <div class="tool-pane card">
          <div class="tool-row">
            <label>${T("Операция")}:</label>
            <select class="tool-select" onchange="Toolkit.decSetOp(this.value)">
              ${DEC_OPS.map(([v, ru, en]) => `<option value="${v}" ${v === op ? "selected" : ""}>${L(ru, en)}</option>`).join("")}
            </select>
          </div>
          <label class="dec-lbl">${T("Ввод")}</label>
          <textarea id="dec-in" class="tool-area dec-area" spellcheck="false" oninput="Toolkit.decRun()" placeholder="${T("Вставьте строку…")}">${esc(state.decIn || "")}</textarea>
          <label class="dec-lbl">${T("Результат")}</label>
          <pre id="dec-out" class="dec-out"></pre>
          <p class="tool-hint">${T("Подсказка: спрятанные в инструментах флаги закодированы в Base64 — вставьте их сюда и выберите «Base64 → текст».")}</p>
        </div>
      </section>`;
    decRun();
  }
  function decSetOp(v) { state.decOp = v; const i = document.getElementById("dec-in"); if (i) state.decIn = i.value; renderTool("decoder"); }
  function decRun() {
    const i = document.getElementById("dec-in"); const o = document.getElementById("dec-out");
    if (!i || !o) return;
    state.decIn = i.value;
    o.textContent = i.value ? decodeOp(state.decOp || "b64d", i.value) : "";
  }

  /* ---------- публичный интерфейс ---------- */
  function open(id) { api.go("tools", { tool: id }); }

  window.Toolkit = {
    render, open,
    list: TOOLS.map((t) => ({ id: t.id, ru: t.ru, en: t.en })),
    mailPick, mailClear, mailAnalyze, mailAnswer,
    evFilter, evAnswer,
    pkFilter, pkAnswer,
    procFlag, autoPick,
    fwToggle, fwCheck,
    atkSel,
    caseAnswer,
    flagSubmit,
    decSetOp, decRun,
  };
})();
