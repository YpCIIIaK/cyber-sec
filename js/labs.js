/* ============================================================
   CyberPath — интерактивные лаборатории (task.type === "lab")
   Каждая лаба монтируется в контейнер и вызывает onSolve() при
   успехе. Всё безопасно и локально (никакого реального кода).
   Интерфейсы оформлены «как в жизни»: окно браузера, почтовый
   клиент, SIEM-консоль, панель настроек Windows и т. д.
   ============================================================ */
const Labs = (() => {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const t = (s) => (window.I18N ? I18N.t(s) : s);

  /* ---------- Переиспользуемый «хром» окна браузера ---------- */
  function browser(url, secure, bodyHTML, extraClass = "") {
    const lock = secure
      ? `<svg viewBox="0 0 24 24" class="bw-lock" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`
      : `<span class="bw-warn" title="${esc(t("Небезопасное соединение"))}">⚠</span>`;
    return `
      <div class="bw ${extraClass}">
        <div class="bw-top">
          <span class="bw-dots"><i></i><i></i><i></i></span>
          <div class="bw-url">${lock}<span class="bw-host">${esc(url)}</span></div>
          <span class="bw-tools"><i></i><i></i></span>
        </div>
        <div class="bw-body">${bodyHTML}</div>
      </div>`;
  }

  /* ---------- Переиспользуемый «хром» окна приложения Windows ---------- */
  function appwin(title, icon, bodyHTML, extraClass = "") {
    return `
      <div class="aw ${extraClass}">
        <div class="aw-top"><span class="aw-ic">${icon}</span><span class="aw-title">${esc(title)}</span>
          <span class="aw-btns"><i>–</i><i>▢</i><i class="aw-x">✕</i></span></div>
        <div class="aw-body">${bodyHTML}</div>
      </div>`;
  }

  /* ---------- «хром» терминала ---------- */
  function term(title, bodyHTML, extraClass = "") {
    return `
      <div class="tw ${extraClass}">
        <div class="tw-top"><span class="bw-dots"><i></i><i></i><i></i></span><span class="tw-title">${esc(title)}</span></div>
        <div class="tw-body">${bodyHTML}</div>
      </div>`;
  }

  /* ---------- общий обработчик: клик-выбор строк + проверка множества ---------- */
  function selectable(el, rowSel, btnSel, outEl, correctIdx, okMsg, noMsg, onSolve) {
    const sel = new Set(); let solved = false;
    el.querySelectorAll(rowSel).forEach((row) => {
      // доступность с клавиатуры: строки работают как переключатели
      row.setAttribute("role", "checkbox");
      row.setAttribute("tabindex", "0");
      row.setAttribute("aria-checked", "false");
      const toggle = () => {
        if (solved) return; const i = +row.dataset.i;
        if (sel.has(i)) { sel.delete(i); row.classList.remove("sel"); row.setAttribute("aria-checked", "false"); }
        else { sel.add(i); row.classList.add("sel"); row.setAttribute("aria-checked", "true"); }
      };
      row.addEventListener("click", toggle);
      row.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    });
    el.querySelector(btnSel).addEventListener("click", () => {
      if (solved) return;
      const out = el.querySelector(outEl);
      const ok = correctIdx.length === sel.size && correctIdx.every((i) => sel.has(i));
      el.querySelectorAll(rowSel).forEach((row) => row.classList.toggle("bad", correctIdx.includes(+row.dataset.i)));
      if (ok) { out.className = "lab-out ok"; out.innerHTML = "✓ " + okMsg; solved = true; onSolve(); }
      else { out.className = "lab-out no"; out.textContent = "✗ " + noMsg; }
    });
  }

  const DEFS = {
    /* ================================================================
       Измеритель надёжности пароля — форма регистрации (Основы)
       ================================================================ */
    passmeter(el, onSolve) {
      el.innerHTML = `
        <p class="lab-hint">${t("Вы регистрируетесь на сайте. Придумайте по-настоящему надёжный пароль — форма примет только сильный.")}</p>
        ${browser("secure-portal.io/signup", true, `
          <div class="signup">
            <div class="signup-brand"><span class="signup-logo">◆</span> SecurePortal</div>
            <h4>${t("Создание аккаунта")}</h4>
            <label class="fld"><span>${t("Электронная почта")}</span><input class="fld-in" value="user@example.com" readonly></label>
            <label class="fld"><span>${t("Пароль")}</span>
              <span class="fld-pass"><input class="fld-in" id="pm-in" type="password" placeholder="${t("Введите пароль…")}" autocomplete="off">
              <button class="fld-eye" id="pm-eye" type="button" title="${t("Показать пароль")}">👁</button></span>
            </label>
            <div class="pm-bar"><span id="pm-fill"></span></div>
            <div class="pm-meta"><span id="pm-label" class="pm-label">${t("Надёжность")}: —</span></div>
            <ul class="pm-reqs" id="pm-reqs">
              <li data-k="len">${t("не меньше 12 символов")}</li>
              <li data-k="uplow">${t("строчные и ЗАГЛАВНЫЕ буквы")}</li>
              <li data-k="num">${t("хотя бы одна цифра")}</li>
              <li data-k="sym">${t("хотя бы один спецсимвол")}</li>
              <li data-k="common">${t("не из списка популярных паролей")}</li>
            </ul>
            <button class="btn-wide" id="pm-go" disabled>${t("Зарегистрироваться")}</button>
            <div class="lab-out" id="pm-out"></div>
          </div>`)}`;
      const inp = el.querySelector("#pm-in"), fill = el.querySelector("#pm-fill"),
        label = el.querySelector("#pm-label"), go = el.querySelector("#pm-go"), out = el.querySelector("#pm-out");
      let solved = false;
      const levels = [t("очень слабый"), t("слабый"), t("средний"), t("хороший"), t("отличный")];
      const colors = ["#d64545", "#e5824b", "#e0b400", "#4fae5a", "#1f9d61"];
      const COMMON = ["password", "123456", "qwerty", "p@ssw0rd", "admin", "111111", "iloveyou", "12345678"];
      el.querySelector("#pm-eye").addEventListener("click", () => {
        inp.type = inp.type === "password" ? "text" : "password"; inp.focus();
      });
      const setReq = (k, ok) => { const li = el.querySelector(`#pm-reqs li[data-k="${k}"]`); if (li) li.classList.toggle("ok", ok); };
      inp.addEventListener("input", () => {
        const v = inp.value;
        const len = v.length >= 12;
        const uplow = /[a-z]/.test(v) && /[A-Z]/.test(v);
        const num = /[0-9]/.test(v);
        const sym = /[^A-Za-z0-9]/.test(v);
        const common = !!v && !COMMON.includes(v.toLowerCase());
        setReq("len", len); setReq("uplow", uplow); setReq("num", num); setReq("sym", sym); setReq("common", common);
        const score = [len, uplow, num, sym].filter(Boolean).length - (common ? 0 : 2);
        const s = Math.max(0, Math.min(4, score));
        fill.style.width = (s / 4 * 100) + "%";
        fill.style.background = colors[s];
        label.textContent = t("Надёжность") + ": " + levels[s];
        const all = len && uplow && num && sym && common;
        go.disabled = !all;
      });
      go.addEventListener("click", () => {
        if (solved || go.disabled) return;
        solved = true;
        out.className = "lab-out ok";
        out.innerHTML = "✓ " + t("Аккаунт создан! Такой пароль практически не перебрать: длина + разные символы + уникальность решают.");
        onSolve();
      });
    },

    /* ================================================================
       SQL-инъекция: обход входа — корпоративная админка (Веб)
       ================================================================ */
    sqli(el, onSolve) {
      const loginView = `
        <div class="corp-login">
          <div class="corp-brand"><span class="corp-logo">ACME</span><span class="corp-sub">Internal Admin Console</span></div>
          <div class="corp-card">
            <h4>${t("Вход для сотрудников")}</h4>
            <label class="fld"><span>${t("Логин")}</span><input class="fld-in" id="sql-u" value="admin" autocomplete="off"></label>
            <label class="fld"><span>${t("Пароль")}</span><input class="fld-in" id="sql-p" type="text" placeholder="••••••••" autocomplete="off"></label>
            <div class="corp-banner" id="sql-banner"></div>
            <button class="btn-wide corp-btn" id="sql-go">${t("Войти")}</button>
            <div class="corp-foot">© ACME Corp · ${t("только для авторизованного персонала")}</div>
          </div>
        </div>`;
      el.innerHTML = `
        <p class="lab-hint">${t("Перед вами реальная на вид панель администратора. Пароля вы не знаете — войдите как admin через SQL-инъекцию в поле пароля.")}</p>
        ${browser("admin.acme-corp.local/login", false, loginView, "bw-sqli")}
        <div class="srv-peek">
          <div class="srv-head">${t("Что сервер подставит в запрос к базе")}</div>
          <code class="srv-code">SELECT * FROM users WHERE login='<b id="sql-eu">admin</b>' AND password='<b id="sql-ep"></b>';</code>
        </div>
        <details class="lab-tip"><summary>${t("Подсказка")}</summary>
          <p>${t("Введите в поле пароля:")} <code>' OR '1'='1</code> — ${t("кавычка закрывает строку, а OR '1'='1' делает условие всегда истинным.")}</p></details>
        <div class="lab-out" id="sql-out"></div>`;
      let solved = false;
      const bind = (bodyEl) => {
        const u = bodyEl.querySelector("#sql-u"), p = bodyEl.querySelector("#sql-p"),
          eu = el.querySelector("#sql-eu"), ep = el.querySelector("#sql-ep"),
          banner = bodyEl.querySelector("#sql-banner"), out = el.querySelector("#sql-out");
        const upd = () => { eu.textContent = u.value || ""; ep.textContent = p.value || ""; };
        u.addEventListener("input", upd); p.addEventListener("input", upd); upd();
        bodyEl.querySelector("#sql-go").addEventListener("click", () => {
          const pass = p.value.toLowerCase().replace(/\s+/g, " ").trim();
          const inj = /'\s*or\s*'?1'?\s*=\s*'?1/.test(pass) || /'\s*or\s*1\s*=\s*1/.test(pass) || /'\s*or\s*'[^']+'\s*=\s*'[^']+/.test(pass) || /'\s*or\s*true/.test(pass);
          if (inj) {
            const bw = el.querySelector(".bw-sqli .bw-body");
            el.querySelector(".bw-sqli .bw-host").textContent = "admin.acme-corp.local/dashboard";
            bw.innerHTML = dashboardView();
            out.className = "lab-out ok";
            out.innerHTML = "✓ " + t("Вы внутри! Условие <code>OR '1'='1'</code> стало всегда истинным, и база вернула первую строку — учётку admin. Защита: параметризованные запросы (prepared statements).");
            out.scrollIntoView({ behavior: "smooth", block: "nearest" });
            // Даём рассмотреть админку-пруф, прежде чем задание свернётся в «выполнено»
            if (!solved) { solved = true; setTimeout(onSolve, 1400); }
          } else {
            banner.className = "corp-banner show err";
            banner.textContent = "⚠ " + t("Неверный логин или пароль");
            setTimeout(() => (banner.className = "corp-banner"), 2200);
          }
        });
      };
      const dashboardView = () => `
        <div class="corp-dash">
          <aside class="cd-side">
            <div class="cd-logo">ACME</div>
            <a class="on">▦ ${t("Обзор")}</a><a>👥 ${t("Пользователи")}</a><a>🧾 ${t("Журналы")}</a><a>⚙ ${t("Настройки")}</a>
          </aside>
          <main class="cd-main">
            <div class="cd-bar"><b>${t("Панель администратора")}</b><span class="cd-user">● admin@acme-corp.local</span></div>
            <div class="cd-kpis">
              <div class="cd-kpi"><b>1 284</b><span>${t("пользователей")}</span></div>
              <div class="cd-kpi"><b>37</b><span>${t("админов")}</span></div>
              <div class="cd-kpi"><b>5</b><span>${t("активных сессий")}</span></div>
            </div>
            <table class="cd-table">
              <thead><tr><th>ID</th><th>${t("Логин")}</th><th>${t("Роль")}</th><th>Email</th></tr></thead>
              <tbody>
                <tr><td>1</td><td>admin</td><td><span class="cd-badge">root</span></td><td>admin@acme-corp.local</td></tr>
                <tr><td>2</td><td>j.smith</td><td>staff</td><td>j.smith@acme-corp.local</td></tr>
                <tr><td>3</td><td>m.ivanova</td><td>staff</td><td>m.ivanova@acme-corp.local</td></tr>
                <tr><td>4</td><td>backup_svc</td><td>service</td><td>—</td></tr>
              </tbody>
            </table>
          </main>
        </div>`;
      bind(el);
    },

    /* ================================================================
       Reflected XSS — блог с комментариями + всплывающий alert (Веб)
       ================================================================ */
    xss(el, onSolve) {
      el.innerHTML = `
        <p class="lab-hint">${t("Блог выводит комментарии без экранирования. Внедрите скрипт, который на уязвимом сайте выполнил бы alert().")}</p>
        ${browser("blog.example.com/post/42#comments", true, `
          <article class="blog">
            <h3 class="blog-h">${t("10 советов по безопасности в сети")}</h3>
            <p class="blog-meta">${t("Опубликовано 29 сен · 4 мин чтения")}</p>
            <p class="blog-p">${t("Спасибо, что дочитали! Делитесь мыслями в комментариях ниже.")}</p>
            <div class="blog-comments" id="xss-list">
              <div class="cmt"><span class="cmt-av">${t("Аноним")[0]}</span><div><b>${t("Аноним")}</b><p>${t("Отличная статья, спасибо!")}</p></div></div>
              <div class="cmt"><span class="cmt-av">M</span><div><b>Max</b><p>${t("Добавьте про менеджеры паролей 👍")}</p></div></div>
            </div>
            <div class="cmt-form">
              <input class="fld-in" id="xss-in" placeholder="&lt;script&gt;alert('xss')&lt;/script&gt;">
              <button class="btn btn-primary btn-sm" id="xss-go">${t("Отправить")}</button>
            </div>
          </article>`)}
        <div class="lab-out" id="xss-out"></div>`;
      const inp = el.querySelector("#xss-in"), list = el.querySelector("#xss-list"),
        out = el.querySelector("#xss-out"), bw = el.querySelector(".bw");
      let solved = false;
      el.querySelector("#xss-go").addEventListener("click", () => {
        const v = inp.value;
        if (!v.trim()) return;
        const isXss = /<script[\s>]/i.test(v) || /on\w+\s*=/i.test(v) || /<img[^>]+onerror/i.test(v) || /<svg[^>]+onload/i.test(v) || /javascript:/i.test(v);
        // Добавляем «отрисованный» комментарий — как текст (реально безопасно)
        const c = document.createElement("div");
        c.className = "cmt";
        c.innerHTML = `<span class="cmt-av">${t("Вы")[0]}</span><div><b>${t("Вы")}</b><p></p></div>`;
        c.querySelector("p").textContent = v;
        list.appendChild(c);
        inp.value = "";
        if (isXss) {
          // Симуляция срабатывания: фейковое окно alert поверх «страницы»
          const payload = (v.match(/alert\(([^)]*)\)/i) || [, "'xss'"])[1] || "'xss'";
          const modal = document.createElement("div");
          modal.className = "xss-alert-wrap";
          modal.innerHTML = `
            <div class="xss-alert">
              <div class="xss-alert-head">blog.example.com ${t("сообщает")}</div>
              <div class="xss-alert-body">${esc(payload.replace(/^['"]|['"]$/g, "")) || "xss"}</div>
              <div class="xss-alert-foot"><button class="btn btn-primary btn-sm" id="xss-ok">OK</button></div>
            </div>`;
          bw.appendChild(modal);
          modal.querySelector("#xss-ok").addEventListener("click", () => {
            modal.remove();
            out.className = "lab-out ok";
            out.innerHTML = "✓ " + t("Скрипт «выполнился» и вызвал alert(). На настоящем сайте так крадут cookie и сессии. Защита: экранирование вывода + заголовок CSP.");
            if (!solved) { solved = true; onSolve(); }
          });
        } else {
          out.className = "lab-out no";
          out.textContent = "✗ " + t("Это отобразилось как обычный текст — инъекции не вышло. Попробуйте тег <script> или атрибут onerror у <img>.");
        }
      });
    },

    /* ================================================================
       Разбор фишингового письма — почтовый клиент (Анализ фишинга)
       ================================================================ */
    phish(el, onSolve) {
      const headers = [
        { k: "From", v: "\"" + t("Сбербанк Безопасность") + "\" <security@sberbank-verify.ru>", bad: true },
        { k: "Return-Path", v: "<bounce@mailer-xz12.top>", bad: true },
        { k: "Authentication-Results", v: "spf=fail dkim=fail dmarc=fail", bad: true },
        { k: "Subject", v: t("Срочно! Ваш счёт заблокирован"), bad: false },
        { k: "Date", v: "Mon, 29 Sep 2026 03:14:00 +0000", bad: false },
        { k: "Reply-To", v: "noreply@secure-check.top", bad: true },
      ];
      el.innerHTML = `
        <p class="lab-hint">${t("Письмо попало в карантин SOC. Откройте технические заголовки и отметьте все красные флаги.")}</p>
        ${appwin("Mail — " + t("Карантин"), "✉", `
          <div class="mail">
            <div class="mail-side">
              <a class="on">📥 ${t("Входящие")}</a><a>🚩 ${t("Спам")} <em>1</em></a><a>📤 ${t("Отправленные")}</a>
            </div>
            <div class="mail-read">
              <div class="mail-subj">⚠ ${t("Срочно! Ваш счёт заблокирован")}</div>
              <div class="mail-from"><span class="mail-av">${t("Сбербанк Безопасность")[0]}</span>
                <div><b>${t("Сбербанк Безопасность")}</b> &lt;security@sberbank-verify.ru&gt;<br>
                <small>${t("кому: вы · 29 сен, 06:14")}</small></div>
                <span class="mail-flag">${t("возможный фишинг")}</span>
              </div>
              <div class="mail-body">
                <p>${t("Уважаемый клиент! Мы заблокировали ваш счёт из-за подозрительной активности.")}</p>
                <p>${t("Чтобы разблокировать, подтвердите данные в течение 24 часов:")}</p>
                <p><a class="mail-link" data-i="link">http://sber-online.security-check.top/login</a></p>
              </div>
              <button class="mail-toggle" id="ph-toggle">▾ ${t("Показать оригинал (заголовки)")}</button>
              <div class="mail-headers" id="ph-headers" hidden>
                ${headers.map((h, i) => `<div class="hdr-line" data-i="${i}"><span class="pl-box"></span><code><span class="hk">${esc(h.k)}:</span> ${esc(h.v)}</code></div>`).join("")}
                <div class="hdr-line" data-i="link"><span class="pl-box"></span><code><span class="hk">${t("Ссылка в теле:")}</span> http://sber-online.security-check.top/login</code></div>
              </div>
            </div>
          </div>`)}
        <button class="btn btn-primary btn-sm" id="ph-go">${t("Подтвердить флаги")}</button>
        <div class="lab-out" id="ph-out"></div>`;
      const badSet = new Set(headers.map((h, i) => h.bad ? String(i) : null).filter(Boolean).concat(["link"]));
      const sel = new Set();
      let solved = false;
      el.querySelector("#ph-toggle").addEventListener("click", (e) => {
        const h = el.querySelector("#ph-headers"); h.hidden = !h.hidden;
        e.target.textContent = (h.hidden ? "▾ " : "▴ ") + t("Показать оригинал (заголовки)");
      });
      const togglePh = (row) => {
        if (!row || solved) return;
        const i = row.dataset.i;
        if (sel.has(i)) { sel.delete(i); row.classList.remove("sel"); row.setAttribute("aria-checked", "false"); }
        else { sel.add(i); row.classList.add("sel"); row.setAttribute("aria-checked", "true"); }
      };
      el.querySelectorAll("#ph-headers .hdr-line").forEach((row) => {
        row.setAttribute("role", "checkbox"); row.setAttribute("tabindex", "0"); row.setAttribute("aria-checked", "false");
        row.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); togglePh(row); } });
      });
      el.querySelector("#ph-headers").addEventListener("click", (ev) => togglePh(ev.target.closest(".hdr-line")));
      el.querySelector("#ph-go").addEventListener("click", () => {
        if (solved) return;
        const out = el.querySelector("#ph-out");
        const ok = badSet.size === sel.size && [...badSet].every((i) => sel.has(i));
        el.querySelectorAll(".hdr-line").forEach((row) => row.classList.toggle("bad", badSet.has(row.dataset.i)));
        const h = el.querySelector("#ph-headers"); if (h.hidden) { h.hidden = false; el.querySelector("#ph-toggle").textContent = "▴ " + t("Показать оригинал (заголовки)"); }
        if (ok) {
          out.className = "lab-out ok";
          out.innerHTML = "✓ " + t("Все флаги найдены: домен-двойник в From, чужой Return-Path, Reply-To на левый домен, проваленные SPF/DKIM/DMARC и фишинговая ссылка.");
          solved = true; onSolve();
        } else {
          out.className = "lab-out no";
          out.textContent = "✗ " + t("Отмечено не всё. Настоящие красные флаги подсвечены — сравните и попробуйте снова.");
        }
      });
    },

    /* ================================================================
       Харденинг Windows — панель «Безопасность Windows» (Харденинг)
       ================================================================ */
    harden(el, onSolve) {
      const items = [
        { text: "Брандмауэр Windows", sub: "Фильтрация входящих/исходящих подключений", good: true },
        { text: "Шифрование диска BitLocker", sub: "Защита данных при краже устройства", good: true },
        { text: "Защита от эксплойтов (SmartScreen)", sub: "Блокировка подозрительных приложений", good: true },
        { text: "LAPS — уникальные пароли админа", sub: "Разные пароли локального админа на каждом ПК", good: true },
        { text: "Протокол SMBv1", sub: "Устаревший, уязвим к EternalBlue", good: false },
        { text: "Все пользователи — администраторы", sub: "Убирает разделение прав", good: false },
      ];
      el.innerHTML = `
        <p class="lab-hint">${t("Настройте безопасную конфигурацию рабочей станции: включите защитные меры и выключите опасные.")}</p>
        ${appwin(t("Безопасность Windows"), "🛡", `
          <div class="wsec">
            <div class="wsec-head"><span class="wsec-shield">🛡</span><div><b>${t("Защита устройства")}</b><span id="wsec-status" class="wsec-st">${t("Проверьте параметры ниже")}</span></div></div>
            <div class="wsec-list">
              ${items.map((it, i) => `
                <div class="wsec-row">
                  <div class="wsec-txt"><b>${esc(t(it.text))}</b><span>${esc(t(it.sub))}</span></div>
                  <button class="toggle" role="switch" aria-checked="false" data-i="${i}"><span class="toggle-k"></span></button>
                </div>`).join("")}
            </div>
            <button class="btn-wide" id="hd-go">${t("Применить конфигурацию")}</button>
            <div class="lab-out" id="hd-out"></div>
          </div>`)}`;
      let solved = false;
      el.querySelectorAll(".toggle").forEach((b) => b.addEventListener("click", () => {
        if (solved) return;
        const on = b.getAttribute("aria-checked") === "true";
        b.setAttribute("aria-checked", on ? "false" : "true");
        b.classList.toggle("on", !on);
      }));
      el.querySelector("#hd-go").addEventListener("click", () => {
        if (solved) return;
        const out = el.querySelector("#hd-out");
        const toggles = el.querySelectorAll(".toggle");
        let ok = true;
        toggles.forEach((b) => { const i = +b.dataset.i; if ((b.getAttribute("aria-checked") === "true") !== items[i].good) ok = false; });
        const status = el.querySelector("#wsec-status");
        if (ok) {
          out.className = "lab-out ok";
          out.innerHTML = "✓ " + t("Устройство защищено! Включены брандмауэр, BitLocker, SmartScreen и LAPS; SMBv1 и общие админ-права — отключены.");
          status.textContent = "✓ " + t("Устройство защищено"); status.className = "wsec-st ok";
          solved = true; onSolve();
        } else {
          out.className = "lab-out no";
          out.textContent = "✗ " + t("Конфигурация небезопасна. Включите только защитные меры и отключите опасные (SMBv1, общие админ-права).");
          status.textContent = "⚠ " + t("Есть риски"); status.className = "wsec-st risk";
        }
      });
    },

    /* ================================================================
       Триаж логов — SIEM-консоль (Blue Team)
       ================================================================ */
    logtriage(el, onSolve) {
      const logs = [
        { time: "10:02:11", src: "10.0.0.5", ev: "auth: user=anna login OK", sev: "info", bad: false },
        { time: "10:04:03", src: "45.9.13.201", ev: "auth: user=admin FAILED ×5", sev: "warn", bad: true },
        { time: "10:05:20", src: "45.9.13.201", ev: "auth: user=admin login OK", sev: "high", bad: true },
        { time: "10:06:48", src: "WIN-DC01", ev: "proc: powershell -enc SQBFAFgA…", sev: "high", bad: true },
        { time: "10:09:15", src: "10.0.0.7", ev: "web: GET /index.html 200", sev: "info", bad: false },
        { time: "10:11:02", src: "WIN-DC01", ev: "svc: new service \"updater\" installed", sev: "high", bad: true },
      ];
      const sevLabel = { info: t("инфо"), warn: t("предупр."), high: t("критично") };
      el.innerHTML = `
        <p class="lab-hint">${t("Вы дежурный аналитик SOC. Проведите триаж потока событий и отметьте строки, входящие в цепочку атаки.")}</p>
        ${appwin("SIEM — " + t("Живой поток событий"), "📊", `
          <div class="siem">
            <div class="siem-bar"><span class="siem-dot"></span> ${t("Подключено")} · ${logs.length} ${t("событий")}
              <span class="siem-legend"><i class="sev info"></i>${sevLabel.info}<i class="sev warn"></i>${sevLabel.warn}<i class="sev high"></i>${sevLabel.high}</span></div>
            <table class="siem-table">
              <thead><tr><th></th><th>${t("Время")}</th><th>${t("Источник")}</th><th>${t("Событие")}</th><th>${t("Уровень")}</th></tr></thead>
              <tbody>
                ${logs.map((l, i) => `<tr class="siem-row sev-${l.sev}" data-i="${i}">
                  <td><span class="pl-box"></span></td><td class="siem-t">${l.time}</td>
                  <td class="siem-s">${esc(l.src)}</td><td><code>${esc(l.ev)}</code></td>
                  <td><span class="sev-badge ${l.sev}">${sevLabel[l.sev]}</span></td></tr>`).join("")}
              </tbody>
            </table>
          </div>`)}
        <button class="btn btn-primary btn-sm" id="lg-go">${t("Открыть инцидент")}</button>
        <div class="lab-out" id="lg-out"></div>`;
      const sel = new Set(); let solved = false;
      el.querySelectorAll(".siem-row").forEach((row) => row.addEventListener("click", () => {
        if (solved) return; const i = +row.dataset.i;
        if (sel.has(i)) { sel.delete(i); row.classList.remove("sel"); } else { sel.add(i); row.classList.add("sel"); }
      }));
      el.querySelector("#lg-go").addEventListener("click", () => {
        if (solved) return;
        const out = el.querySelector("#lg-out");
        const correct = logs.map((l, i) => l.bad ? i : -1).filter((i) => i >= 0);
        const ok = correct.length === sel.size && correct.every((i) => sel.has(i));
        el.querySelectorAll(".siem-row").forEach((row) => { const i = +row.dataset.i; row.classList.toggle("bad", logs[i].bad); });
        if (ok) {
          out.className = "lab-out ok";
          out.innerHTML = "✓ " + t("Инцидент собран верно: брутфорс admin → успешный вход с того же чужого IP → запуск -enc PowerShell → установка службы для закрепления. Полная цепочка атаки.");
          solved = true; onSolve();
        } else {
          out.className = "lab-out no";
          out.textContent = "✗ " + t("В инцидент попало не всё. Строки цепочки атаки подсвечены — сравните.");
        }
      });
    },

    /* ================================================================
       Сканер портов nmap — терминал (Сети)
       ================================================================ */
    portscan(el, onSolve) {
      const ports = [
        { p: "22/tcp", st: "open", svc: "ssh", ver: "OpenSSH 8.9", risk: false },
        { p: "23/tcp", st: "open", svc: "telnet", ver: "Linux telnetd", risk: true },
        { p: "80/tcp", st: "open", svc: "http", ver: "nginx 1.24", risk: false },
        { p: "445/tcp", st: "open", svc: "microsoft-ds", ver: "Samba smbd 3.X (SMBv1)", risk: true },
        { p: "3306/tcp", st: "open", svc: "mysql", ver: "MySQL 8.0 (0.0.0.0)", risk: true },
        { p: "3389/tcp", st: "open", svc: "ms-wbt-server", ver: "Microsoft Terminal Services", risk: true },
        { p: "443/tcp", st: "open", svc: "https", ver: "nginx 1.24 (TLS 1.3)", risk: false },
      ];
      el.innerHTML = `
        <p class="lab-hint">${t("Вы просканировали сервер в рамках аудита. Отметьте порты, которые представляют риск и должны быть закрыты или ограничены.")}</p>
        ${term("analyst@kali: ~", `
          <div class="tw-line"><span class="tw-prompt">$</span> nmap -sV 10.10.14.7</div>
          <div class="tw-dim">Starting Nmap 7.94 · scan report for 10.10.14.7</div>
          <div class="tw-dim">Host is up (0.011s latency).</div>
          <table class="tw-table">
            <thead><tr><th></th><th>PORT</th><th>STATE</th><th>SERVICE</th><th>VERSION</th></tr></thead>
            <tbody>
              ${ports.map((p, i) => `<tr class="tw-row" data-i="${i}"><td><span class="pl-box"></span></td>
                <td class="tw-port">${p.p}</td><td class="tw-open">${p.st}</td><td>${esc(p.svc)}</td><td class="tw-dim">${esc(p.ver)}</td></tr>`).join("")}
            </tbody>
          </table>`)}
        <button class="btn btn-primary btn-sm" id="ps-go">${t("Отметить рискованные порты")}</button>
        <div class="lab-out" id="ps-out"></div>`;
      selectable(el, ".tw-row", "#ps-go", "#ps-out",
        ports.map((p, i) => p.risk ? i : -1).filter((i) => i >= 0),
        t("Верно! Telnet (23) передаёт пароли открытым текстом, SMBv1 (445) уязвим к EternalBlue, MySQL (3306) и RDP (3389) не должны смотреть в интернет. SSH, HTTP и HTTPS — в порядке."),
        t("Отмечено не всё. Рискованные порты подсвечены — сравните. HTTPS и SSH закрывать не нужно."), onSolve);
    },

    /* ================================================================
       Диспетчер задач — поиск вредоносного процесса (Windows)
       ================================================================ */
    taskmgr(el, onSolve) {
      const procs = [
        { n: "explorer.exe", pid: 2184, cpu: "0.4%", path: "C:\\Windows\\explorer.exe", sig: "Microsoft", bad: false },
        { n: "chrome.exe", pid: 6620, cpu: "3.1%", path: "C:\\Program Files\\Google\\Chrome\\chrome.exe", sig: "Google LLC", bad: false },
        { n: "svch0st.exe", pid: 7788, cpu: "48.7%", path: "C:\\Users\\user\\AppData\\Local\\Temp\\svch0st.exe", sig: "—", bad: true },
        { n: "svchost.exe", pid: 1040, cpu: "0.1%", path: "C:\\Windows\\System32\\svchost.exe", sig: "Microsoft", bad: false },
        { n: "Code.exe", pid: 9112, cpu: "1.8%", path: "C:\\Program Files\\Microsoft VS Code\\Code.exe", sig: "Microsoft", bad: false },
      ];
      el.innerHTML = `
        <p class="lab-hint">${t("Пользователь жалуется на тормоза. Откройте Диспетчер задач и найдите подозрительный процесс, затем завершите его.")}</p>
        ${appwin(t("Диспетчер задач"), "📋", `
          <div class="tm">
            <div class="tm-tabs"><span class="on">${t("Процессы")}</span><span>${t("Производительность")}</span><span>${t("Автозагрузка")}</span></div>
            <table class="tm-table">
              <thead><tr><th>${t("Имя")}</th><th>PID</th><th>${t("ЦП")}</th><th>${t("Расположение")}</th><th>${t("Издатель")}</th></tr></thead>
              <tbody>
                ${procs.map((p, i) => `<tr class="tm-row" data-i="${i}"><td class="tm-n">${esc(p.n)}</td><td>${p.pid}</td>
                  <td class="${parseFloat(p.cpu) > 20 ? "tm-hot" : ""}">${p.cpu}</td><td class="tm-path">${esc(p.path)}</td>
                  <td class="${p.sig === "—" ? "tm-unsig" : ""}">${esc(p.sig)}</td></tr>`).join("")}
              </tbody>
            </table>
            <div class="tm-foot"><span id="tm-pick" class="tm-sel">${t("Процесс не выбран")}</span>
              <button class="btn btn-sm tm-kill" id="tm-go" disabled>${t("Завершить задачу")}</button></div>
          </div>`)}
        <div class="lab-out" id="tm-out"></div>`;
      let picked = null, solved = false;
      const go = el.querySelector("#tm-go"), pick = el.querySelector("#tm-pick");
      el.querySelectorAll(".tm-row").forEach((row) => {
        row.setAttribute("role", "radio"); row.setAttribute("tabindex", "0"); row.setAttribute("aria-checked", "false");
        const choose = () => {
          if (solved) return;
          el.querySelectorAll(".tm-row").forEach((r) => { r.classList.remove("sel"); r.setAttribute("aria-checked", "false"); });
          row.classList.add("sel"); row.setAttribute("aria-checked", "true"); picked = +row.dataset.i;
          pick.textContent = procs[picked].n + " (PID " + procs[picked].pid + ")"; go.disabled = false;
        };
        row.addEventListener("click", choose);
        row.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(); } });
      });
      go.addEventListener("click", () => {
        if (solved || picked == null) return;
        const out = el.querySelector("#tm-out");
        if (procs[picked].bad) {
          const row = el.querySelector(`.tm-row[data-i="${picked}"]`); row.classList.add("killed");
          out.className = "lab-out ok";
          out.innerHTML = "✓ " + t("Верно! <b>svch0st.exe</b> — маскировка под системный svchost: запуск из папки Temp, без цифровой подписи и 48% ЦП. Настоящий svchost живёт в System32 и подписан Microsoft.");
          solved = true; onSolve();
        } else {
          out.className = "lab-out no";
          out.textContent = "✗ " + t("Это легитимный процесс. Ищите подделку: странное имя, путь в Temp, нет подписи, аномальная нагрузка.");
        }
      });
    },

    /* ================================================================
       EXIF-метаданные фото — геолокация (OSINT)
       ================================================================ */
    exif(el, onSolve) {
      const opts = [t("Берлин, Германия"), t("Париж, Франция"), t("Рим, Италия"), t("Прага, Чехия")];
      el.innerHTML = `
        <p class="lab-hint">${t("Вам прислали фото без подписи. Изучите EXIF-метаданные и определите, где оно снято.")}</p>
        ${appwin(t("Свойства — photo_4821.jpg"), "🖼", `
          <div class="exif">
            <div class="exif-photo"><div class="exif-thumb">🗼</div><span>photo_4821.jpg · 4.2 MB · 4032×3024</span></div>
            <table class="exif-table">
              <tr><td>${t("Камера")}</td><td>Apple iPhone 14 Pro</td></tr>
              <tr><td>${t("Дата съёмки")}</td><td>2026:07:14 16:32:08</td></tr>
              <tr><td>${t("Выдержка")}</td><td>1/1200 s · f/1.8 · ISO 50</td></tr>
              <tr class="exif-hot"><td>GPS Latitude</td><td>48°51′29.6″N (48.8582)</td></tr>
              <tr class="exif-hot"><td>GPS Longitude</td><td>2°17′40.2″E (2.2945)</td></tr>
              <tr><td>Software</td><td>16.5.1</td></tr>
            </table>
            <div class="exif-q"><b>${t("Где сделано фото?")}</b>
              <div class="exif-opts">${opts.map((o, i) => `<button class="quiz-btn" data-i="${i}">${o}</button>`).join("")}</div></div>
            <div class="lab-out" id="ex-out"></div>
          </div>`)}`;
      let solved = false;
      el.querySelectorAll(".exif-opts .quiz-btn").forEach((b) => b.addEventListener("click", () => {
        if (solved) return;
        const out = el.querySelector("#ex-out");
        if (+b.dataset.i === 1) {
          b.classList.add("right");
          out.className = "lab-out ok";
          out.innerHTML = "✓ " + t("Верно! Координаты 48.8582, 2.2945 — Эйфелева башня, Париж. GPS в EXIF часто выдаёт точное место съёмки — поэтому соцсети вырезают эти данные.");
          solved = true; onSolve();
        } else {
          b.classList.add("wrong");
          out.className = "lab-out no";
          out.textContent = "✗ " + t("Не то. Вбейте координаты 48.8582, 2.2945 мысленно в карту — это известная достопримечательность.");
        }
      }));
    },

    /* ================================================================
       Реестр автозапуска — охота на закрепление (Форензика)
       ================================================================ */
    autoruns(el, onSolve) {
      const rows = [
        { name: "Google Update", cmd: "C:\\Program Files\\Google\\Update\\GoogleUpdate.exe", pub: "Google LLC", signed: true, bad: false },
        { name: "Realtek HD Audio", cmd: "C:\\Program Files\\Realtek\\Audio\\RtkNGUI64.exe", pub: "Realtek", signed: true, bad: false },
        { name: "Updater", cmd: "powershell -w hidden -enc JABjAD0A...", pub: "—", signed: false, bad: true },
        { name: "OneDrive", cmd: "C:\\Users\\user\\AppData\\Local\\Microsoft\\OneDrive\\OneDrive.exe", pub: "Microsoft", signed: true, bad: false },
        { name: "SysMonitor", cmd: "C:\\Users\\user\\AppData\\Roaming\\svc\\mon.exe", pub: "—", signed: false, bad: true },
      ];
      el.innerHTML = `
        <p class="lab-hint">${t("Вы исследуете заражённый хост. В разделе автозапуска реестра найдите записи закрепления вредоноса.")}</p>
        ${appwin("Autoruns — HKCU\\...\\Run", "🔑", `
          <div class="arun">
            <div class="arun-path">HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run</div>
            <table class="arun-table">
              <thead><tr><th></th><th>${t("Имя")}</th><th>${t("Команда")}</th><th>${t("Издатель")}</th></tr></thead>
              <tbody>
                ${rows.map((r, i) => `<tr class="arun-row" data-i="${i}"><td><span class="pl-box"></span></td>
                  <td class="arun-n">${esc(r.name)}</td><td class="arun-cmd ${r.signed ? "" : "unsig"}">${esc(r.cmd)}</td>
                  <td>${r.signed ? esc(r.pub) : `<span class="arun-x">${t("не подписано")}</span>`}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>`)}
        <button class="btn btn-primary btn-sm" id="ar-go">${t("Отметить вредоносные записи")}</button>
        <div class="lab-out" id="ar-out"></div>`;
      selectable(el, ".arun-row", "#ar-go", "#ar-out",
        rows.map((r, i) => r.bad ? i : -1).filter((i) => i >= 0),
        t("Верно! «Updater» запускает закодированный PowerShell (-enc, hidden), а «SysMonitor» — неподписанный бинарь из AppData\\Roaming. Обе записи — закрепление вредоноса. Остальные подписаны и легитимны."),
        t("Отмечено не всё. Легитимные автозапуски подписаны известными вендорами; вредоносные — без подписи, из папок пользователя или с -enc PowerShell."), onSolve);
    },

    /* ================================================================
       Отчёт песочницы — анализ поведения (Вредоносное ПО)
       ================================================================ */
    sandbox(el, onSolve) {
      const acts = [
        { tag: "T1112", txt: "Создаёт ключ реестра HKCU\\...\\Run\\Updater", bad: true },
        { tag: "—", txt: "Читает C:\\Windows\\win.ini", bad: false },
        { tag: "T1071", txt: "Исходящее TCP-соединение с 185.212.47.19:443", bad: true },
        { tag: "T1055", txt: "Внедряет код в explorer.exe (process injection)", bad: true },
        { tag: "—", txt: "Создаёт временный файл %TEMP%\\~setup.tmp", bad: false },
        { tag: "T1486", txt: "Массово шифрует файлы в \\Users\\ (.locked)", bad: true },
      ];
      el.innerHTML = `
        <p class="lab-hint">${t("Образец прогнали в песочнице. Отметьте вредоносные действия в отчёте (они помечены техниками MITRE ATT&CK).")}</p>
        ${appwin(t("Отчёт песочницы — sample.exe"), "🧪", `
          <div class="sbox">
            <div class="sbox-head">
              <div><b>sample.exe</b><span class="sbox-hash">SHA256: 9f2c…a71b</span></div>
              <span class="sbox-verdict">${t("ВЕРДИКТ")}: <b>malicious</b> 92/100</span>
            </div>
            <div class="sbox-sub">${t("Поведение при запуске")}</div>
            <div class="sbox-list">
              ${acts.map((a, i) => `<div class="sbox-row" data-i="${i}"><span class="pl-box"></span>
                <span class="sbox-tag ${a.tag === "—" ? "muted" : ""}">${a.tag}</span><span class="sbox-txt">${esc(t(a.txt))}</span></div>`).join("")}
            </div>
          </div>`)}
        <button class="btn btn-primary btn-sm" id="sb-go">${t("Пометить вредоносное поведение")}</button>
        <div class="lab-out" id="sb-out"></div>`;
      selectable(el, ".sbox-row", "#sb-go", "#sb-out",
        acts.map((a, i) => a.bad ? i : -1).filter((i) => i >= 0),
        t("Верно! Закрепление в реестре (T1112), связь с C2 (T1071), инъекция в процесс (T1055) и шифрование файлов (T1486) — это рансомвар. Чтение win.ini и временный файл сами по себе безобидны."),
        t("Отмечено не всё. Вредоносные действия имеют тег MITRE ATT&CK и подсвечены — сравните."), onSolve);
    },

    /* ================================================================
       Декодер Цезаря — шифр сдвига (Криптография)
       ================================================================ */
    caesar(el, onSolve) {
      const SHIFT = 7, PLAIN = "THE PASSWORD IS GRANITE";
      const enc = PLAIN.replace(/[A-Z]/g, (c) => String.fromCharCode((c.charCodeAt(0) - 65 + SHIFT) % 26 + 65));
      el.innerHTML = `
        <p class="lab-hint">${t("Перехвачено зашифрованное шифром Цезаря сообщение. Подберите сдвиг, прочитайте текст и введите слово-пароль.")}</p>
        ${term(t("Декодер Цезаря"), `
          <div class="tw-line"><span class="tw-prompt">ciphertext:</span> ${enc}</div>
          <div class="caesar-ctl"><span>${t("Сдвиг")}: <b id="cz-n">0</b></span>
            <input type="range" id="cz-sl" aria-label="Shift" min="0" max="25" value="0" class="caesar-range"></div>
          <div class="tw-line out"><span class="tw-prompt">plaintext: </span><span id="cz-out" class="cz-out">${enc}</span></div>
        `)}
        <div class="lab-form" style="margin-top:12px">
          <label style="flex:1">${t("Слово-пароль из сообщения")}<input class="fld-in" id="cz-in" placeholder="${t("введите слово")}" autocomplete="off"></label>
          <button class="btn btn-primary btn-sm" id="cz-go">${t("Проверить")}</button>
        </div>
        <div class="lab-out" id="cz-out2"></div>`;
      const sl = el.querySelector("#cz-sl"), nn = el.querySelector("#cz-n"), oo = el.querySelector("#cz-out");
      const dec = (s) => enc.replace(/[A-Z]/g, (c) => String.fromCharCode((c.charCodeAt(0) - 65 - s + 26) % 26 + 65));
      sl.addEventListener("input", () => { const s = +sl.value; nn.textContent = s; oo.textContent = dec(s); oo.classList.toggle("readable", s === SHIFT); });
      let solved = false;
      el.querySelector("#cz-go").addEventListener("click", () => {
        if (solved) return;
        const out = el.querySelector("#cz-out2");
        if (el.querySelector("#cz-in").value.trim().toUpperCase() === "GRANITE") {
          out.className = "lab-out ok";
          out.innerHTML = "✓ " + t("Верно! Сдвиг 7 превращает шифртекст в «THE PASSWORD IS GRANITE». Шифр Цезаря ломается за 26 попыток — поэтому его не используют всерьёз.");
          solved = true; onSolve();
        } else {
          out.className = "lab-out no";
          out.textContent = "✗ " + t("Пока не то. Двигайте ползунок сдвига, пока текст не станет читаемым, и возьмите слово после «IS».");
        }
      });
    },

    /* ================================================================
       Строки бинарника — извлечение IOC (Реверс-инжиниринг)
       ================================================================ */
    strings(el, onSolve) {
      const lines = [
        { s: "!This program cannot be run in DOS mode", ioc: false },
        { s: "http://185.212.47.19/gate.php", ioc: true },
        { s: "GetProcAddress", ioc: false },
        { s: "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run", ioc: true },
        { s: "KERNEL32.DLL", ioc: false },
        { s: "Global\\Mutex_7f3a9b2c", ioc: true },
        { s: "Mozilla/5.0 (Windows NT 10.0)", ioc: false },
      ];
      el.innerHTML = `
        <p class="lab-hint">${t("Вы анализируете подозрительный бинарник. В выводе strings отметьте индикаторы компрометации (IOC), которые стоит занести в отчёт.")}</p>
        ${term("analyst@lab: ~", `
          <div class="tw-line"><span class="tw-prompt">$</span> strings suspicious.exe</div>
          <div class="str-list">
            ${lines.map((l, i) => `<div class="str-row" data-i="${i}"><span class="pl-box"></span><code>${esc(l.s)}</code></div>`).join("")}
          </div>`)}
        <button class="btn btn-primary btn-sm" id="st-go">${t("Отметить IOC")}</button>
        <div class="lab-out" id="st-out"></div>`;
      selectable(el, ".str-row", "#st-go", "#st-out",
        lines.map((l, i) => l.ioc ? i : -1).filter((i) => i >= 0),
        t("Верно! C2-URL (185.212.47.19), ключ автозапуска в реестре и имя мьютекса — полезные IOC. Остальное — обычные строки из любого PE-файла (импорты, заголовок DOS, User-Agent)."),
        t("Отмечено не всё. IOC — это сетевые адреса, пути закрепления и уникальные маркеры; стандартные строки PE не в счёт."), onSolve);
    },

    /* ================================================================
       Аудит Kerberoasting — сервисные учётки AD (Active Directory)
       ================================================================ */
    kerberoast(el, onSolve) {
      const accts = [
        { n: "svc_sql", spn: "MSSQLSvc/db01", pw: "412 дн.", enc: "RC4", risk: true },
        { n: "svc_web", spn: "HTTP/web01", pw: "фев 2019", enc: "RC4", risk: true },
        { n: "Administrator", spn: "—", pw: "28 дн.", enc: "AES256", risk: false },
        { n: "svc_backup", spn: "CIFS/bkp01", pw: "15 дн.", enc: "AES256", risk: false },
        { n: "j.smith", spn: "—", pw: "9 дн.", enc: "AES256", risk: false },
      ];
      el.innerHTML = `
        <p class="lab-hint">${t("Аудит безопасности домена. Найдите сервисные учётки, уязвимые к Kerberoasting (есть SPN + слабое шифрование RC4 + старый пароль), которые нужно усилить.")}</p>
        ${appwin("Active Directory — " + t("Сервисные учётки"), "🗄", `
          <div class="adt">
            <table class="adt-table">
              <thead><tr><th></th><th>${t("Учётка")}</th><th>SPN</th><th>${t("Пароль задан")}</th><th>${t("Шифрование")}</th></tr></thead>
              <tbody>
                ${accts.map((a, i) => `<tr class="adt-row" data-i="${i}"><td><span class="pl-box"></span></td>
                  <td class="adt-n">${esc(a.n)}</td><td class="${a.spn === "—" ? "tw-dim" : "adt-spn"}">${esc(a.spn)}</td>
                  <td>${esc(t(a.pw))}</td><td><span class="enc-badge ${a.enc === "RC4" ? "weak" : "ok"}">${a.enc}</span></td></tr>`).join("")}
              </tbody>
            </table>
          </div>`)}
        <button class="btn btn-primary btn-sm" id="kr-go">${t("Отметить уязвимые учётки")}</button>
        <div class="lab-out" id="kr-out"></div>`;
      selectable(el, ".adt-row", "#kr-go", "#kr-out",
        accts.map((a, i) => a.risk ? i : -1).filter((i) => i >= 0),
        t("Верно! svc_sql и svc_web имеют SPN, слабое RC4 и древние пароли — их Kerberos-билет можно выгрузить и брутфорсить офлайн. Защита: длинные пароли (25+), gMSA и AES. Учётки без SPN или на AES — не роастятся."),
        t("Отмечено не всё. Под Kerberoasting попадают только учётки с SPN и слабым шифрованием/старым паролем. AES-учётки и обычные пользователи без SPN не уязвимы."), onSolve);
    },

    /* ================================================================
       Проверка границ теста — scope / RoE (Пентест)
       ================================================================ */
    scope(el, onSolve) {
      const assets = [
        { host: "www.acme-corp.com", ip: "203.0.113.10", note: "Корпоративный сайт", inScope: true },
        { host: "dev.acme-corp.com", ip: "203.0.113.25", note: "Тестовый стенд", inScope: true },
        { host: "pay.acme-corp.com", ip: "203.0.113.9", note: "Платёжная система (PROD)", inScope: false },
        { host: "acme.salesforce.com", ip: "—", note: "Сторонний SaaS (не ваш)", inScope: false },
        { host: "blog.acme-corp.com", ip: "198.51.100.5", note: "Хостинг вне диапазона", inScope: false },
        { host: "john-ceo-blog.net", ip: "198.51.100.77", note: "Личный сайт сотрудника", inScope: false },
      ];
      el.innerHTML = `
        <p class="lab-hint">${t("Перед началом теста сверьтесь с договором. Отметьте ТОЛЬКО те активы, которые входят в разрешённый периметр и которые можно тестировать.")}</p>
        <div class="roe-card">
          <div class="roe-head">📄 ${t("Договор на тестирование — Rules of Engagement")}</div>
          <table class="roe-table">
            <tr><td>${t("Разрешённые домены")}</td><td><code>*.acme-corp.com</code></td></tr>
            <tr><td>${t("Разрешённый диапазон IP")}</td><td><code>203.0.113.0/24</code></td></tr>
            <tr><td>${t("Окно тестирования")}</td><td>${t("будни 20:00–06:00")}</td></tr>
            <tr class="roe-ban"><td>${t("Исключено")}</td><td>${t("продакшн-платёжная система, сторонние сервисы, DoS, соц. инженерия")}</td></tr>
          </table>
        </div>
        ${appwin(t("Обнаруженные активы"), "🗂", `
          <table class="scope-table">
            <thead><tr><th></th><th>${t("Хост")}</th><th>IP</th><th>${t("Заметка")}</th></tr></thead>
            <tbody>
              ${assets.map((a, i) => `<tr class="scope-row" data-i="${i}"><td><span class="pl-box"></span></td>
                <td class="scope-h">${esc(a.host)}</td><td class="scope-ip">${esc(a.ip)}</td><td class="tw-dim">${esc(t(a.note))}</td></tr>`).join("")}
            </tbody>
          </table>`)}
        <button class="btn btn-primary btn-sm" id="sc-go">${t("Подтвердить периметр")}</button>
        <div class="lab-out" id="sc-out"></div>`;
      selectable(el, ".scope-row", "#sc-go", "#sc-out",
        assets.map((a, i) => a.inScope ? i : -1).filter((i) => i >= 0),
        t("Верно! В периметре только www и dev: домен *.acme-corp.com И IP из 203.0.113.0/24. Платёжный PROD исключён договором, Salesforce — чужой сервис, blog и личный сайт — вне диапазона IP. Тронуть их — выйти за рамки закона."),
        t("Неверно. Проверяйте оба условия: домен И диапазон IP, и всегда учитывайте явные исключения. Подсвечены активы, которые реально в периметре."), onSolve);
    },
  };

  function mount(labId, el, onSolve) {
    const def = DEFS[labId];
    if (!def) { el.innerHTML = "<i>lab not found: " + esc(labId) + "</i>"; return; }
    try { def(el, onSolve); } catch (e) { el.innerHTML = "<i>lab error</i>"; }
  }
  return { mount, has: (id) => !!DEFS[id] };
})();
try { window.Labs = Labs; } catch (e) {}
