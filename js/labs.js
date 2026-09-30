/* ============================================================
   CyberPath — интерактивные лаборатории (task.type === "lab")
   Каждая лаба монтируется в контейнер и вызывает onSolve() при
   успехе. Всё безопасно и локально (никакого реального кода).
   ============================================================ */
const Labs = (() => {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const t = (s) => (window.I18N ? I18N.t(s) : s);

  const DEFS = {
    /* ---- Измеритель надёжности пароля (Основы) ---- */
    passmeter(el, onSolve) {
      el.innerHTML = `
        <p class="lab-hint">${t("Придумайте по-настоящему надёжный пароль. Цель — уровень «Отличный».")}</p>
        <input class="lab-input" id="pm-in" type="text" placeholder="${t("Введите пароль…")}" autocomplete="off">
        <div class="pm-bar"><span id="pm-fill"></span></div>
        <div class="pm-meta"><span id="pm-label">—</span><span id="pm-tips"></span></div>`;
      const inp = el.querySelector("#pm-in"), fill = el.querySelector("#pm-fill"),
        label = el.querySelector("#pm-label"), tips = el.querySelector("#pm-tips");
      let solved = false;
      const levels = [t("очень слабый"), t("слабый"), t("средний"), t("хороший"), t("отличный")];
      const colors = ["#d64545", "#e5824b", "#e0b400", "#4fae5a", "#1f9d61"];
      inp.addEventListener("input", () => {
        const v = inp.value;
        let classes = 0;
        if (/[a-z]/.test(v)) classes++;
        if (/[A-Z]/.test(v)) classes++;
        if (/[0-9]/.test(v)) classes++;
        if (/[^A-Za-z0-9]/.test(v)) classes++;
        let score = 0;
        if (v.length >= 8) score++;
        if (v.length >= 12) score++;
        if (classes >= 2) score++;
        if (classes >= 3 && v.length >= 12) score++;
        score = Math.min(4, score);
        fill.style.width = (score / 4 * 100) + "%";
        fill.style.background = colors[score];
        label.textContent = t("Надёжность") + ": " + levels[score];
        const need = [];
        if (v.length < 12) need.push(t("длиннее 12 символов"));
        if (classes < 3) need.push(t("больше типов символов"));
        tips.textContent = need.length ? "— " + need.join(", ") : "";
        if (!solved && score >= 4) { solved = true; label.textContent = "✓ " + t("Отличный пароль!"); onSolve(); }
      });
    },

    /* ---- SQL-инъекция: обход входа (Веб) ---- */
    sqli(el, onSolve) {
      el.innerHTML = `
        <p class="lab-hint">${t("Учебная форма входа уязвима к SQL-инъекции. Войдите как admin, не зная пароля.")}</p>
        <div class="lab-form">
          <label>${t("Логин")}<input class="lab-input" id="sql-u" value="admin"></label>
          <label>${t("Пароль")}<input class="lab-input" id="sql-p" placeholder="' OR '1'='1"></label>
          <button class="btn btn-primary btn-sm" id="sql-go">${t("Войти")}</button>
        </div>
        <div class="lab-code">SELECT * FROM users WHERE name='<b id="sql-eu">admin</b>' AND pass='<b id="sql-ep"></b>';</div>
        <div class="lab-out" id="sql-out"></div>`;
      const u = el.querySelector("#sql-u"), p = el.querySelector("#sql-p"),
        eu = el.querySelector("#sql-eu"), ep = el.querySelector("#sql-ep"), out = el.querySelector("#sql-out");
      let solved = false;
      const upd = () => { eu.textContent = u.value; ep.textContent = p.value; };
      u.addEventListener("input", upd); p.addEventListener("input", upd); upd();
      el.querySelector("#sql-go").addEventListener("click", () => {
        const pass = p.value.toLowerCase().replace(/\s+/g, " ");
        // тавтология: ' OR '1'='1  /  ' or 1=1 --  и т.п.
        const inj = /'\s*or\s*'?1'?\s*=\s*'?1/.test(pass) || /'\s*or\s*1\s*=\s*1/.test(pass) || /'\s*or\s*'[^']+'\s*=\s*'[^']+/.test(pass);
        if (inj) {
          out.className = "lab-out ok";
          out.innerHTML = "✓ " + t("Условие стало всегда истинным — вы вошли как <b>admin</b>! Так работает SQL-инъекция.");
          if (!solved) { solved = true; onSolve(); }
        } else {
          out.className = "lab-out no";
          out.textContent = "✗ " + t("Неверный логин или пароль. Подсказка: попробуйте ' OR '1'='1");
        }
      });
    },

    /* ---- Reflected XSS (Веб) ---- */
    xss(el, onSolve) {
      el.innerHTML = `
        <p class="lab-hint">${t("Поле комментария выводит ввод без экранирования. Внедрите скрипт, который вызвал бы alert().")}</p>
        <div class="lab-form">
          <input class="lab-input" id="xss-in" placeholder="<script>alert(1)</script>">
          <button class="btn btn-primary btn-sm" id="xss-go">${t("Отправить")}</button>
        </div>
        <div class="lab-render">${t("Ваш комментарий")}: <span id="xss-view" class="xss-view"></span></div>
        <div class="lab-out" id="xss-out"></div>`;
      const inp = el.querySelector("#xss-in"), view = el.querySelector("#xss-view"), out = el.querySelector("#xss-out");
      let solved = false;
      el.querySelector("#xss-go").addEventListener("click", () => {
        const v = inp.value;
        view.textContent = v; // выводим как текст (безопасно)
        const isXss = /<script[\s>]/i.test(v) || /on\w+\s*=/i.test(v) || /<img[^>]+onerror/i.test(v) || /javascript:/i.test(v);
        if (isXss) {
          out.className = "lab-out ok";
          out.innerHTML = "✓ " + t("На уязвимом сайте этот код выполнился бы и вызвал alert(). Защита — экранирование вывода и CSP.");
          if (!solved) { solved = true; onSolve(); }
        } else {
          out.className = "lab-out no";
          out.textContent = "✗ " + t("Это обычный текст. Попробуйте тег <script> или атрибут onerror.");
        }
      });
    },

    /* ---- Разбор фишингового письма (Анализ фишинга) ---- */
    phish(el, onSolve) {
      const lines = [
        { text: "From: \"Сбербанк\" <security@sberbank-verify.ru>", bad: true, why: "домен-двойник (не настоящий банк)" },
        { text: "Return-Path: <bounce@mailer-xz12.top>", bad: true, why: "не совпадает с From — признак спуфинга" },
        { text: "Authentication-Results: spf=fail dkim=fail dmarc=fail", bad: true, why: "все проверки провалены" },
        { text: "Subject: Срочно! Ваш счёт заблокирован", bad: false, why: "" },
        { text: "Date: Mon, 29 Sep 2026 03:14:00 +0000", bad: false, why: "" },
        { text: "Ссылка: http://sber-online.security-check.top/login", bad: true, why: "поддельный домен для кражи данных" },
      ];
      el.innerHTML = `
        <p class="lab-hint">${t("Перед вами заголовки письма. Отметьте все подозрительные строки (красные флаги).")}</p>
        <div class="phish-mail">${lines.map((l, i) => `<div class="phish-line" data-i="${i}"><span class="pl-box"></span><code>${esc(l.text)}</code></div>`).join("")}</div>
        <button class="btn btn-primary btn-sm" id="ph-go">${t("Проверить")}</button>
        <div class="lab-out" id="ph-out"></div>`;
      const sel = new Set();
      let solved = false;
      el.querySelectorAll(".phish-line").forEach((row) => {
        row.addEventListener("click", () => {
          if (solved) return;
          const i = +row.dataset.i;
          if (sel.has(i)) { sel.delete(i); row.classList.remove("sel"); }
          else { sel.add(i); row.classList.add("sel"); }
        });
      });
      el.querySelector("#ph-go").addEventListener("click", () => {
        if (solved) return;
        const out = el.querySelector("#ph-out");
        const correct = lines.map((l, i) => l.bad ? i : -1).filter((i) => i >= 0);
        const ok = correct.length === sel.size && correct.every((i) => sel.has(i));
        el.querySelectorAll(".phish-line").forEach((row) => {
          const i = +row.dataset.i;
          row.classList.toggle("bad", lines[i].bad);
        });
        if (ok) {
          out.className = "lab-out ok";
          out.innerHTML = "✓ " + t("Верно! Все красные флаги найдены: домен-двойник, несовпадение From/Return-Path и проваленные SPF/DKIM/DMARC.");
          solved = true; onSolve();
        } else {
          out.className = "lab-out no";
          out.textContent = "✗ " + t("Не все флаги отмечены верно. Красные строки подсвечены — сравните и попробуйте снова.");
        }
      });
    },

    /* ---- Чек-лист харденинга Windows (Харденинг) ---- */
    harden(el, onSolve) {
      const items = [
        { text: "Отключить протокол SMBv1", good: true },
        { text: "Включить BitLocker (шифрование диска)", good: true },
        { text: "Включить брандмауэр Windows", good: true },
        { text: "Настроить LAPS (уникальные пароли админа)", good: true },
        { text: "Отключить брандмауэр для удобства", good: false },
        { text: "Дать всем пользователям права администратора", good: false },
      ];
      el.innerHTML = `
        <p class="lab-hint">${t("Настройте безопасную конфигурацию: включите правильные меры и не включайте опасные.")}</p>
        <div class="harden-list">${items.map((it, i) => `<label class="harden-item"><input type="checkbox" data-i="${i}"><span>${esc(it.text)}</span></label>`).join("")}</div>
        <button class="btn btn-primary btn-sm" id="hd-go">${t("Применить")}</button>
        <div class="lab-out" id="hd-out"></div>`;
      let solved = false;
      el.querySelector("#hd-go").addEventListener("click", () => {
        if (solved) return;
        const out = el.querySelector("#hd-out");
        const checks = el.querySelectorAll(".harden-item input");
        let ok = true;
        checks.forEach((c) => { const i = +c.dataset.i; if (c.checked !== items[i].good) ok = false; });
        if (ok) {
          out.className = "lab-out ok";
          out.innerHTML = "✓ " + t("Отлично! Включены нужные меры (SMBv1 off, BitLocker, брандмауэр, LAPS), опасные — нет.");
          solved = true; onSolve();
        } else {
          out.className = "lab-out no";
          out.textContent = "✗ " + t("Конфигурация небезопасна. Включите только защитные меры и отключите опасные.");
        }
      });
    },

    /* ---- Триаж логов SOC (Blue Team) ---- */
    logtriage(el, onSolve) {
      const logs = [
        { text: "10:02 auth: user=anna login OK from 10.0.0.5", bad: false },
        { text: "10:04 auth: user=admin FAILED x5 from 45.9.13.201", bad: true },
        { text: "10:05 auth: user=admin login OK from 45.9.13.201", bad: true },
        { text: "10:06 proc: powershell -enc SQBFAFgA... (encoded)", bad: true },
        { text: "10:09 web: GET /index.html 200 from 10.0.0.7", bad: false },
      ];
      el.innerHTML = `
        <p class="lab-hint">${t("Проведите триаж: отметьте строки, указывающие на атаку (брутфорс, вход из подозрительного IP, запуск закодированной команды).")}</p>
        <div class="log-list">${logs.map((l, i) => `<div class="log-line" data-i="${i}"><span class="pl-box"></span><code>${esc(l.text)}</code></div>`).join("")}</div>
        <button class="btn btn-primary btn-sm" id="lg-go">${t("Проверить")}</button>
        <div class="lab-out" id="lg-out"></div>`;
      const sel = new Set(); let solved = false;
      el.querySelectorAll(".log-line").forEach((row) => row.addEventListener("click", () => {
        if (solved) return; const i = +row.dataset.i;
        if (sel.has(i)) { sel.delete(i); row.classList.remove("sel"); } else { sel.add(i); row.classList.add("sel"); }
      }));
      el.querySelector("#lg-go").addEventListener("click", () => {
        if (solved) return;
        const out = el.querySelector("#lg-out");
        const correct = logs.map((l, i) => l.bad ? i : -1).filter((i) => i >= 0);
        const ok = correct.length === sel.size && correct.every((i) => sel.has(i));
        el.querySelectorAll(".log-line").forEach((row) => { const i = +row.dataset.i; row.classList.toggle("bad", logs[i].bad); });
        if (ok) {
          out.className = "lab-out ok";
          out.innerHTML = "✓ " + t("Верно! Брутфорс admin, успешный вход с того же чужого IP и запуск -enc PowerShell — цепочка атаки.");
          solved = true; onSolve();
        } else {
          out.className = "lab-out no";
          out.textContent = "✗ " + t("Не всё отмечено верно. Вредоносные строки подсвечены — сравните.");
        }
      });
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
