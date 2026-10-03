/* ============================================================
   CyberPath — лаборатория: статический триаж PE-файлов
   (сигнатуры, энтропия, строки, импорты) без запуска образца.
   Подключается ПОСЛЕ js/labs.js (Labs.register).
   ============================================================ */
(function () {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const t = (s) => (window.I18N ? I18N.t(s) : s);

  const FILES = [
    {
      name: "svc_host.exe", size: "96 KB", hash: "3f9a…c481", verdict: 0,
      head: "4D 5A 90 00 03 00 00 00 04 00 00 00 FF FF 00 00  …  PE 00 00 64 86",
      strings: 412, entropy: "5.8",
      imports: ["kernel32.dll!CreateFileW", "kernel32.dll!ReadFile", "advapi32.dll!RegOpenKeyExW", "ws2_32.dll!WSAStartup"],
      note: t("Обычная служба: работает с файлами и реестром, сетевые вызовы только для инициализации сокета."),
    },
    {
      name: "upd_x64.bin", size: "412 KB", hash: "b71c…9ae2", verdict: 1,
      head: "4D 5A 00 00 … (нечитаемый блок 300 байт) … 50 45 00 00 64 86",
      strings: 3, entropy: "7.94",
      imports: ["kernel32.dll!VirtualAlloc", "kernel32.dll!VirtualProtect", "kernel32.dll!LoadLibraryA"],
      note: t("Секции UPX0/UPX1, почти нет строк, импорты только на распаковку — типичный упаковщик."),
    },
    {
      name: "rundl32.exe", size: "188 KB", hash: "0c2e…7b15", verdict: 2,
      head: "4D 5A 90 00 03 00 00 00 04 00 00 00 FF FF 00 00  …  PE 00 00 4C 01",
      strings: 1204, entropy: "6.7",
      imports: ["kernel32.dll!CreateRemoteThread", "kernel32.dll!WriteProcessMemory", "kernel32.dll!VirtualAllocEx", "kernel32.dll!OpenProcess"],
      note: t("Подпись есть, но набор импортов — классика инъекции кода в чужой процесс."),
    },
  ];

  function peinspect(el, onSolve) {
    el.innerHTML = `
      <p class="lab-hint">${t("Вам передали три файла из карантина. Запускать их нельзя — сделайте статический триаж: отметьте упакованный файл, вредоносный импорт и верную технику. Ничего не исполняется — только заголовки, строки и импорты.")}</p>
      <div class="pe-tabs" id="pe-tabs">
        ${FILES.map((f, i) => `<button class="pe-tab${i === 0 ? " on" : ""}" data-i="${i}">${esc(f.name)}</button>`).join("")}
      </div>
      <div class="pe-pane" id="pe-pane"></div>
      <div class="pe-answers">
        <div class="pe-q">
          <b>1.</b> ${t("Какой файл упакован?")}
          <div class="pe-opts" id="pe-packed">
            ${FILES.map((f, i) => `<button data-i="${i}">${esc(f.name)}</button>`).join("")}
          </div>
        </div>
        <div class="pe-q">
          <b>2.</b> ${t("Какая техника описана импортами rundl32.exe?")}
          <div class="pe-opts" id="pe-tech">
            <button data-i="0">${t("Инъекция кода в процесс")}</button>
            <button data-i="1">${t("Перехват API (hooking)")}</button>
            <button data-i="2">${t("Кража паролей из памяти")}</button>
            <button data-i="3">${t("Эксфильтрация по DNS")}</button>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" id="pe-go">${t("Отправить отчёт")}</button>
        <div class="lab-out" id="pe-out"></div>
      </div>`;

    const pane = el.querySelector("#pe-pane");
    const show = (i) => {
      const f = FILES[i];
      pane.innerHTML = `
        <div class="pe-meta">
          <span>${t("Файл")}: <b>${esc(f.name)}</b></span><span>${t("Размер")}: ${esc(f.size)}</span>
          <span>SHA-256: ${esc(f.hash)}</span><span>${t("Энтропия")}: <b>${esc(f.entropy)}</b></span>
          <span>${t("Строк")}: <b>${f.strings}</b></span>
        </div>
        <div class="pe-block"><span class="pe-lab">${t("Первые байты")}</span><code>${esc(f.head)}</code></div>
        <div class="pe-block"><span class="pe-lab">${t("Импорты (IAT)")}</span><code>${f.imports.map(esc).join("<br>")}</code></div>
        <div class="pe-note">${esc(f.note)}</div>`;
    };
    show(0);
    el.querySelector("#pe-tabs").addEventListener("click", (e) => {
      const b = e.target.closest(".pe-tab"); if (!b) return;
      el.querySelectorAll(".pe-tab").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      show(+b.dataset.i);
    });

    const pick = (box) => {
      let val = null;
      el.querySelector("#" + box).addEventListener("click", (e) => {
        const b = e.target.closest("button[data-i]"); if (!b) return;
        el.querySelectorAll("#" + box + " button").forEach((x) => x.classList.remove("on"));
        b.classList.add("on");
        val = +b.dataset.i;
      });
      return () => val;
    };
    const packed = pick("pe-packed"), tech = pick("pe-tech");

    let solved = false;
    el.querySelector("#pe-go").addEventListener("click", () => {
      const out = el.querySelector("#pe-out");
      if (packed() === 1 && tech() === 0) {
        out.className = "lab-out ok";
        out.innerHTML = "✓ " + t("Верно. upd_x64.bin упакован: энтропия 7.94, всего 3 строки, импорты только на распаковку. Импорты rundl32.exe (VirtualAllocEx → WriteProcessMemory → CreateRemoteThread) — инъекция кода в процесс. Дальше: распаковать в изолированной среде, снять дамп, найти C2 и персистентность.");
        if (!solved) { solved = true; setTimeout(onSolve, 1400); }
      } else {
        out.className = "lab-out no";
        out.innerHTML = "✗ " + t("Проверьте признаки: упаковка — высокая энтропия (около 8), минимум строк и импорты VirtualAlloc/VirtualProtect; инъекция кода — связка OpenProcess → VirtualAllocEx → WriteProcessMemory → CreateRemoteThread.");
      }
    });
  }

  if (window.Labs && Labs.register) Labs.register("peinspect", peinspect);
})();