/* ============================================================
   CyberPath — лаборатория: разбор дампа памяти (Volatility).
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

  const PLUGINS = {
    pslist: `PID    PPID   Name          ImagePath
  4     0     System        \\Device\\HarddiskVolume1\\Windows\\System32\\ntoskrnl.exe
  668   4     smss.exe      C:\\Windows\\System32\\smss.exe
  1044  668   csrss.exe     C:\\Windows\\System32\\csrss.exe
  2216  1044  explorer.exe  C:\\Users\\jones\\AppData\\Local\\Microsoft\\Explorer\\explorer.exe
  3392  1044  svchost.exe   C:\\Windows\\System32\\svchost.exe
  4412  3392  notepad.exe   C:\\Windows\\System32\\notepad.exe
  5120  1044  svhost32.exe  C:\\Users\\jones\\AppData\\Local\\Temp\\svhost32.exe`,
    psscan: `Offset(V)   Name              PID    PPID  Threads
0x1a200       System            4      0     118
0x1b840       smss.exe          668    4     4
0x1c110       csrss.exe         1044   668   12
0x1e440       explorer.exe      2216   1044  58
0x1f300       svchost.exe       3392   1044  24
0x20440       notepad.exe       4412   3392  8
0x21a80       svhost32.exe      5120   1044  6
0x22c10       WINWORD.EXE#5120  5168   —      1   <- аномалия`,
    malfind: `PID    Process        Address          Section  Entropy
3392   svchost.exe     0x7ff000100000  .data    5.91
4412   notepad.exe     0x1a2b0000      .data    6.44   <- RWX, образ не отображается
5120   svhost32.exe    0x1a2c4000      .data    6.51   <- образ не отображается
5168   WINWORD.EXE#5120 0x1a2d0000     .data    6.88   <- анонимная память, 1 поток`,
    hashdump: `Administrator  31d6cfe0d16ae931b73c59d7e0c089c0
jones           aad3b435b51404eeaad3b435b51404ee
svc_backup      8de40ccadbf14a92e2de40ccadbf14a92   <- пароль уже как хеш (NTLM)
tmp             4ed9e5a1b7cd2a3f`,
    netstat: `Proto  Local Address      Foreign Address      State          PID
TCP    10.20.4.17:49601    10.20.4.5:445        ESTABLISHED    3392
TCP    10.20.4.17:51555    91.219.236.14:443    ESTABLISHED    5120
TCP    10.20.4.17:51556    91.219.236.14:443    ESTABLISHED    5120
UDP    10.20.4.17:138       —                    LISTENING      4`,
  };

  /* Вопросы: ok=1 — верный ответ первый в списке вариантов */
  const QUESTIONS = [
    { ok: 1, q: t("Процесс, которого нет в pslist, но нашёл psscan"),
      a: ["WINWORD.EXE#5120", "svchost.exe", "notepad.exe"], hint: t("Имя с # и без родителя — признак скрытого процесса или инъекции.") },
    { ok: 1, q: t("PID, где malfind показывает анонимную RWX-память без образа"),
      a: ["4412", "3392", "5120"], hint: t("Строка с пометкой «образ не отображается» и анонимной памятью.") },
    { ok: 1, q: t("Учётная запись, чей пароль уже известен как хеш"),
      a: ["svc_backup", "Administrator", "tmp"], hint: t("NTLM-хеш можно использовать напрямую — pass-the-hash.") },
    { ok: 1, q: t("PID, который ходит во внешний адрес"),
      a: ["5120", "3392", "4"], hint: t("В netstat ищите внешний адрес и PID процесса рядом с ним.") },
    { ok: 0, q: t("Какой вывод НЕЛЬЗЯ делать из этих данных?"),
      a: ["Пользователь jones сам запустил svhost32.exe", "На хосте есть инъекция кода в notepad.exe", "Есть признаки закрепления и внешнего C2"], hint: t("Вывод должен следовать из данных, а не из догадок о пользователе.") },
    { ok: 0, q: t("Достаточно ли только pslist, чтобы считать хост чистым?"),
      a: ["Нет: скрытые процессы видны только через psscan", "Да, pslist перечисляет все процессы", "Да, если процессов меньше 50", "Да, после перезагрузки"], hint: t("Инструменты опираются на списки ядра, которые можно подделать (DKOM).") },
  ];

  function memdump(el, onSolve) {
    el.innerHTML = `
      <p class="lab-hint">${t("Вам передали дамп оперативной памяти скомпрометированной рабочей станции. Запустите плагины, найдите скрытый процесс, инъекцию, украденные хеши и канал C2, затем ответьте на вопросы.")}</p>
      <div class="mem-cmds" id="mem-cmds">
        ${Object.keys(PLUGINS).map((p) => `<button class="tw-chip" data-p="${p}">volatility — ${p}</button>`).join("")}
      </div>
      ${term("WIN-WS-04.dmp — вывод плагина", `<pre class="tw-out" id="mem-out">${t("Выберите плагин выше — появится его вывод.")}</pre>`)}
      <h4 class="net-h">${t("Выводы по дампу")}</h4>
      <div class="mem-answers" id="mem-answers">
        ${QUESTIONS.map((q, i) => `<div class="mem-row" data-i="${i}">
          <div class="mem-q">${esc(q.q)}</div>
          <div class="mem-opts">${q.a.map((a, j) => `<button class="bh-take" data-j="${j}">${esc(a)}</button>`).join("")}</div>
        </div>`).join("")}
      </div>
      <button class="btn btn-primary btn-sm" id="mem-go">${t("Сформировать заключение")}</button>
      <div class="lab-out" id="mem-res"></div>`;

    const elOut = el.querySelector("#mem-out");
    el.querySelectorAll("#mem-cmds .tw-chip").forEach((b) => b.addEventListener("click", () => {
      elOut.textContent = `$ python vol.py -f WIN-WS-04.dmp ${b.dataset.p}\n\n${PLUGINS[b.dataset.p]}`;
    }));

    const picked = QUESTIONS.map(() => -1);
    el.querySelector("#mem-answers").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-j]"); if (!b) return;
      const row = b.closest(".mem-row");
      row.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      picked[+row.dataset.i] = +b.dataset.j;
    });

    let solved = false;
    el.querySelector("#mem-go").addEventListener("click", () => {
      const out = el.querySelector("#mem-res");
      const okAll = QUESTIONS.every((q, i) => (q.ok ? picked[i] === 0 : true));
      if (okAll) {
        out.className = "lab-out ok";
        out.innerHTML = "✓ " + t("Заключение верное: скрытый процесс WINWORD.EXE#5120 (виден только через psscan), инъекция кода в notepad.exe (PID 4412, анонимная RWX-память), хеш svc_backup готов к pass-the-hash и внешний канал C2 с PID 5120. Практический вывод: изолировать хост, сохранить дамп, переустановить систему и сменить пароль svc_backup.");
        if (!solved) { solved = true; setTimeout(onSolve, 1400); }
      } else {
        out.className = "lab-out no";
        out.innerHTML = "✗ " + t("Перепроверьте выводы плагинов: pslist против psscan (скрытое), malfind (анонимная память без образа), hashdump (хеш вместо пароля), netstat (внешний адрес и PID).") +
          `<ul class="tri-why">${QUESTIONS.map((q) => `<li>${esc(q.hint)}</li>`).join("")}</ul>`;
      }
    });
  }

  if (window.Labs && Labs.register) Labs.register("memdump", memdump);
})();