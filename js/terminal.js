/* ============================================================
   CyberPath — Песочница: симулятор командной строки Windows
   Полностью локальный, безопасный эмулятор (никаких реальных
   системных вызовов). Учебная виртуальная ФС и «сеть».
   Стиль: cmd / PowerShell.
   ============================================================ */

const Sandbox = (() => {
  // Виртуальная файловая система (Windows-стиль)
  const FS = {
    root: {
      type: "dir",
      children: {
        "secret.txt": { type: "file", content: "Отличная работа! Флаг: CYBER{windows_explorer}\r\n" },
        "readme.txt": { type: "file", content: "Учебная песочница CyberPath (Windows)\r\nПопробуй: dir, type, systeminfo, ipconfig, base64 -d, help\r\n" },
        "notes.txt": { type: "file", content: "TODO: сменить пароль Администратора (не 'Passw0rd'!)\r\n" },
        "Downloads": {
          type: "dir",
          children: {
            "creds.bak": { type: "file", content: "user:hacker\r\nnote: это учебные данные, не настоящие\r\n" },
          },
        },
        "Documents": {
          type: "dir",
          children: {
            "domain.txt": { type: "file", content: "Домен: CYBER.LOCAL\r\nКонтроллер домена: DC01\r\nФлаг: CYBER{ad_recon_ok}\r\n" },
            "backup.txt": { type: "file", content: "Бэкап настроек (не удалять)\r\nПометка: PLORE{bfvag_ernql}\r\n" },
            "system.log": {
              type: "file",
              content:
                "2026-01-10 09:12:01 INFO  Служба запущена\r\n" +
                "2026-01-10 09:12:07 WARN  Неудачный вход: user=guest\r\n" +
                "2026-01-10 09:13:22 INFO  Обновление применено KB5034441\r\n" +
                "2026-01-10 09:14:59 AUDIT CYBER{forensics_artifacts}\r\n" +
                "2026-01-10 09:15:03 INFO  Резервное копирование завершено\r\n",
            },
          },
        },
      },
    },
  };

  const HOME = "C:\\Users\\hacker";
  let cwd = HOME; // всегда работаем от домашней папки
  let mode = "cmd"; // "cmd" | "ps"
  let hook = null;  // (commandLine, outputText) => void — необязательный слушатель
  let transcript = []; // [{cmd, out}] за текущую сессию — для проверки по кнопке

  // Учебный реестр (для reg query)
  const REG = {
    "HKCU\\SOFTWARE\\MICROSOFT\\WINDOWS\\CURRENTVERSION\\RUN": [
      "    OneDrive    REG_SZ    C:\\Users\\hacker\\AppData\\Local\\Microsoft\\OneDrive\\OneDrive.exe /background",
      "    updater     REG_SZ    powershell -enc Q1lCRVJ7cGVyc2lzdGVuY2VfZm91bmR9",
    ],
  };
  let outEl = null;
  let inputEl = null;
  const history = [];
  let histIdx = 0;

  // Учебные «сетевые» цели для nmap
  const NET = {
    "10.10.10.5": {
      ports: [
        { p: 135, s: "msrpc", v: "Microsoft Windows RPC" },
        { p: 139, s: "netbios-ssn", v: "Microsoft Windows netbios-ssn" },
        { p: 445, s: "microsoft-ds", v: "Windows SMB" },
        { p: 3389, s: "ms-wbt-server", v: "Microsoft Terminal Services (RDP)" },
        { p: 1337, s: "leet?", v: "неизвестный сервис" },
      ],
    },
    "scanme.local": {
      ports: [
        { p: 80, s: "http", v: "IIS 10.0" },
        { p: 443, s: "https", v: "IIS 10.0 (TLS)" },
      ],
    },
  };

  // Учебный DNS для nslookup / ping
  const DNS = {
    "target.local": "10.10.10.5",
    "scanme.local": "10.10.10.7",
    "dc01.cyber.local": "10.10.10.10",
    "cyberpath.local": "10.10.10.42",
  };

  // Относительная навигация внутри домашней папки
  // Внутреннее представление пути — массив сегментов относительно HOME
  function relSegs() {
    if (cwd === HOME) return [];
    return cwd.slice(HOME.length).split("\\").filter(Boolean);
  }
  function segsToPath(segs) {
    return segs.length ? HOME + "\\" + segs.join("\\") : HOME;
  }
  function resolveSegs(arg) {
    let segs = relSegs();
    if (!arg || arg === ".") return segs;
    // абсолютный путь к дому
    if (/^C:\\Users\\hacker/i.test(arg)) {
      const rest = arg.replace(/^C:\\Users\\hacker/i, "");
      segs = [];
      arg = rest;
    } else if (arg === "~" || arg === "%USERPROFILE%") {
      return [];
    }
    for (const part of arg.split("\\").filter(Boolean)) {
      if (part === ".") continue;
      if (part === "..") { segs.pop(); continue; }
      segs.push(part);
    }
    return segs;
  }
  function nodeAt(segs) {
    let node = FS.root;
    for (const s of segs) {
      if (node.type !== "dir") return null;
      // регистронезависимый поиск
      const key = Object.keys(node.children).find((k) => k.toLowerCase() === s.toLowerCase());
      if (!key) return null;
      node = node.children[key];
    }
    return node;
  }

  const COMMANDS = {
    help() {
      return [
        "Доступные команды (учебная песочница Windows):",
        "  dir            — список файлов и папок",
        "  cd <папка>     — сменить каталог (cd .. — вверх)",
        "  type <файл>    — вывести содержимое файла",
        "  whoami         — текущий пользователь (whoami /priv, /groups)",
        "  ver            — версия Windows",
        "  systeminfo     — информация о системе (симуляция)",
        "  ipconfig       — сетевая конфигурация (симуляция)",
        "  tasklist       — список процессов (симуляция)",
        "  netstat        — открытые порты и соединения (симуляция)",
        "  findstr <s> <f>— поиск строки в файле (/i — без регистра)",
        "  reg query <p>  — чтение раздела реестра (симуляция)",
        "  certutil -decode <b64> — декодировать base64 (как в Windows)",
        "  ping <host>    — проверка доступности (симуляция)",
        "  nslookup <host>— разрешение имени в IP (симуляция)",
        "  Get-Service    — службы Windows (PowerShell)",
        "  Get-Process    — процессы (PowerShell)",
        "  powershell / cmd — переключить режим оболочки",
        "  nmap <цель>    — скан портов (10.10.10.5, scanme.local)",
        "  base64 -d <s>  — декодировать base64 (учебный помощник)",
        "  base64 <s>     — кодировать base64",
        "  rot13 <s>      — шифр ROT13",
        "  hex -d <s>     — декодировать hex в текст",
        "  echo <текст>   — вывести текст",
        "  cls            — очистить экран",
        "  help           — эта справка",
        "",
        "Подсказка: цель некоторых квестов — найти флаг вида CYBER{...}",
        "Алиасы PowerShell тоже работают: ls, cat, gc, ps",
      ].join("\n");
    },
    dir(args) {
      const target = args.find((a) => !a.startsWith("/") && !a.startsWith("-"));
      const segs = resolveSegs(target);
      const node = nodeAt(segs);
      if (!node) return `Не удается найти путь "${target}".`;
      if (node.type === "file") return target;
      const names = Object.keys(node.children);
      const header = ` Содержимое папки ${segsToPath(segs)}\n`;
      const rows = names.map((n) => {
        const c = node.children[n];
        return c.type === "dir" ? `<DIR>          ${n}` : `               ${n}`;
      });
      return header + "\n" + rows.join("\n") + `\n               ${names.length} объектов`;
    },
    cd(args) {
      const target = args[0];
      if (!target) return cwd;
      const segs = resolveSegs(target);
      const node = nodeAt(segs);
      if (!node) return `Системе не удается найти указанный путь: ${target}`;
      if (node.type !== "dir") return `Указанный путь не является каталогом: ${target}`;
      cwd = segsToPath(segs);
      return null;
    },
    type(args) {
      if (!args[0]) return "Синтаксис: type <файл>";
      const segs = resolveSegs(args[0]);
      const node = nodeAt(segs);
      if (!node) return `Не удается найти файл ${args[0]}.`;
      if (node.type === "dir") return `Отказано в доступе (это папка): ${args[0]}`;
      if (node.content && node.content.includes("windows_explorer")) {
        Progress.unlockAchievement("terminal_master");
      }
      return node.content.replace(/\r?\n$/, "");
    },
    whoami(args) {
      if (args[0] === "/priv")
        return "PRIVILEGES INFORMATION\n----------------------\nSeDebugPrivilege              Enabled\nSeShutdownPrivilege           Disabled\n(учебная симуляция)";
      if (args[0] === "/groups")
        return "GROUP INFORMATION\n-----------------\nBUILTIN\\Users\nBUILTIN\\Administrators (учебная симуляция)";
      return "desktop-cyber\\hacker";
    },
    ver() { return "\nMicrosoft Windows [Version 10.0.19045.4046] (учебная симуляция)"; },
    cls() { outEl.innerHTML = ""; return null; },
    echo(args) { return args.join(" "); },
    systeminfo() {
      return [
        "Имя узла:                  DESKTOP-CYBER",
        "Название ОС:               Microsoft Windows 10 Pro",
        "Версия ОS:                 10.0.19045 N/A построение 19045",
        "Изготовитель системы:      CyberPath Labs (симуляция)",
        "Тип системы:               x64-based PC",
        "Полный объем физической памяти: 16 384 МБ",
        "Исправления:               установлено 42 (учебная симуляция)",
      ].join("\n");
    },
    ipconfig() {
      return [
        "Настройка протокола IP для Windows",
        "",
        "Адаптер Ethernet Ethernet0:",
        "   IPv4-адрес. . . . . . . . . . . . : 10.10.10.42",
        "   Маска подсети . . . . . . . . . . : 255.255.255.0",
        "   Основной шлюз . . . . . . . . . . : 10.10.10.1",
        "(учебная симуляция)",
      ].join("\n");
    },
    tasklist() {
      return [
        "Имя образа                     PID Сессия     Память",
        "========================= ======== ======== ==========",
        "System                           4 Services    140 КБ",
        "explorer.exe                  2140 Console  45 210 КБ",
        "powershell.exe                3312 Console  62 480 КБ",
        "chrome.exe                    4488 Console 210 664 КБ",
        "(учебная симуляция)",
      ].join("\n");
    },
    netstat(args) {
      return [
        "Активные подключения",
        "",
        "  Имя    Локальный адрес        Внешний адрес          Состояние       PID",
        "  TCP    10.10.10.42:139        0.0.0.0:0              LISTENING       4",
        "  TCP    10.10.10.42:445        0.0.0.0:0              LISTENING       4",
        "  TCP    10.10.10.42:3389       0.0.0.0:0              LISTENING       1044",
        "  TCP    10.10.10.42:52344      10.10.10.5:443        ESTABLISHED     4488",
        "(учебная симуляция)",
      ].join("\n");
    },
    nmap(args) {
      const target = args.find((a) => !a.startsWith("-"));
      if (!target) return "nmap: укажите цель, напр. nmap 10.10.10.5";
      const host = NET[target];
      if (!host)
        return `Starting Nmap (учебная симуляция)\nNote: Host seems down / вне учебной сети.\nДоступные учебные цели: 10.10.10.5, scanme.local`;
      const lines = [
        `Starting Nmap 7.94 (учебная симуляция)`,
        `Nmap scan report for ${target}`,
        `Host is up (0.012s latency).`,
        ``,
        `PORT      STATE  SERVICE        VERSION`,
      ];
      const wantV = args.includes("-sV") || args.includes("-sv") || args.includes("-A");
      for (const pr of host.ports) {
        const portCol = (pr.p + "/tcp").padEnd(10);
        const svc = pr.s.padEnd(14);
        lines.push(`${portCol}open   ${svc} ${wantV ? pr.v : ""}`.trimEnd());
      }
      lines.push(``, `Nmap done: 1 IP address (1 host up) scanned`);
      return lines.join("\n");
    },
    base64(args) {
      const decode = args[0] === "-d" || args[0] === "--decode" || args[0] === "/d";
      const payload = args.slice(decode ? 1 : 0).join(" ");
      if (!payload) return "base64: укажите строку";
      try {
        if (decode) {
          const res = decodeURIComponent(escape(atob(payload)));
          if (res.includes("base64_is_easy")) Progress.unlockAchievement("terminal_master");
          return res;
        }
        return btoa(unescape(encodeURIComponent(payload)));
      } catch (e) {
        return "base64: неверный ввод";
      }
    },
    hex(args) {
      const decode = args[0] === "-d";
      const payload = args.slice(decode ? 1 : 0).join("");
      if (!payload) return "hex: укажите строку (hex -d 4359...)";
      if (!decode) return Array.from(payload).map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
      if (!/^([0-9a-fA-F]{2})+$/.test(payload)) return "hex: неверный ввод";
      return payload.match(/../g).map((h) => String.fromCharCode(parseInt(h, 16))).join("");
    },
    rot13(args) {
      const s = args.join(" ");
      return s.replace(/[a-zA-Z]/g, (c) => {
        const base = c <= "Z" ? 65 : 97;
        return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
      });
    },
    findstr(args) {
      const flags = args.filter((a) => a.startsWith("/"));
      const rest = args.filter((a) => !a.startsWith("/"));
      const pattern = rest[0];
      const file = rest[1];
      if (!pattern || !file) return "Синтаксис: findstr <строка> <файл>";
      const segs = resolveSegs(file);
      const node = nodeAt(segs);
      if (!node || node.type !== "dir" && node.type !== "file") return `FINDSTR: Не удается открыть ${file}`;
      if (node.type === "dir") return `FINDSTR: ${file} — это каталог`;
      const ci = flags.some((f) => f.toLowerCase() === "/i");
      const lines = node.content.split(/\r?\n/);
      const hit = lines.filter((l) =>
        ci ? l.toLowerCase().includes(pattern.toLowerCase()) : l.includes(pattern)
      );
      if (hit.some((l) => l.includes("forensics_artifacts"))) Progress.unlockAchievement("terminal_master");
      return hit.length ? hit.join("\n") : "";
    },
    ping(args) {
      const host = args.find((a) => !a.startsWith("-")) || "localhost";
      const ip = DNS[host] || (/^\d+\.\d+\.\d+\.\d+$/.test(host) ? host : "10.10.10.5");
      const lines = [`Обмен пакетами с ${host} [${ip}] с 32 байтами данных:`];
      for (let i = 0; i < 4; i++) lines.push(`Ответ от ${ip}: число байт=32 время=${11 + i}мс TTL=128`);
      lines.push("", `Статистика Ping для ${ip}: Пакетов: отправлено = 4, получено = 4, потеряно = 0 (0% потерь)`, "(учебная симуляция)");
      return lines.join("\n");
    },
    nslookup(args) {
      const host = args.find((a) => !a.startsWith("-"));
      if (!host) return "nslookup: укажите имя";
      const ip = DNS[host];
      if (!ip) return `*** Не удалось найти ${host}: Non-existent domain\nИзвестные учебные имена: ${Object.keys(DNS).join(", ")}`;
      return `Server:  dns.cyber.local\nAddress:  10.10.10.1\n\nИмя:     ${host}\nAddress: ${ip}\n(учебная симуляция)`;
    },
    reg(args) {
      if ((args[0] || "").toLowerCase() !== "query") return "Синтаксис: reg query <путь>";
      const path = (args[1] || "").toUpperCase().replace(/"/g, "");
      const rows = REG[path];
      if (!rows) return `ERROR: Не удалось найти указанный раздел реестра.\nПопробуйте: reg query HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run`;
      return [args[1], ...rows, "", "(учебная симуляция)"].join("\n");
    },
    certutil(args) {
      const flag = (args[0] || "").toLowerCase();
      if (flag === "-decode" || flag === "-decodehex") {
        const payload = args.slice(1).join(" ").replace(/^["']|["']$/g, "");
        if (!payload) return "certutil: укажите строку для декодирования";
        try {
          const res = decodeURIComponent(escape(atob(payload)));
          if (res.includes("persistence_found")) Progress.unlockAchievement("terminal_master");
          return res + "\nCertUtil: -decode выполнено успешно.";
        } catch (e) { return "certutil: неверные входные данные"; }
      }
      return "certutil (учебный): поддерживается 'certutil -decode <base64>'";
    },
    "get-service"() {
      return [
        "Status   Name               DisplayName",
        "------   ----               -----------",
        "Running  WinDefend          Microsoft Defender Antivirus Service",
        "Running  Dnscache           DNS Client",
        "Stopped  RemoteRegistry     Remote Registry",
        "Running  Spooler            Print Spooler",
        "(учебная симуляция)",
      ].join("\n");
    },
    "get-process"() { return COMMANDS.tasklist([]); },
    powershell() { mode = "ps"; syncPrompt(); return "Windows PowerShell (учебный режим). Наберите 'exit' или 'cmd' для возврата."; },
    exit() { if (mode === "ps") { mode = "cmd"; syncPrompt(); return "Выход из PowerShell."; } return "Для выхода просто закройте вкладку."; },
  };
  // Алиасы PowerShell / привычные
  COMMANDS["ls"] = COMMANDS.dir;
  COMMANDS["gci"] = COMMANDS.dir;
  COMMANDS["cat"] = COMMANDS.type;
  COMMANDS["gc"] = COMMANDS.type;
  COMMANDS["clear"] = COMMANDS.cls;
  COMMANDS["ps"] = COMMANDS.tasklist;
  COMMANDS["cmd"] = COMMANDS.exit;
  COMMANDS["gsv"] = COMMANDS["get-service"];
  COMMANDS["gps"] = COMMANDS["get-process"];

  function promptPrefix() { return (mode === "ps" ? "PS " : "") + cwd; }
  function syncPrompt() {
    const c = document.getElementById("term-cwd");
    if (c) c.textContent = promptPrefix();
    const btn = document.getElementById("shell-toggle");
    if (btn) btn.textContent = mode === "ps" ? "PowerShell" : "cmd";
  }

  function run(raw) {
    const line = raw.trim();
    if (!line) return;
    print(`<span class="term-path">${escapeHtml(promptPrefix())}</span>&gt; ${escapeHtml(line)}`, "term-cmd");
    history.push(line);
    histIdx = history.length;
    try { if (window.Progress) Progress.bumpStat("cmds"); } catch (e) {}

    const parts = line.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    const cmd = (parts[0] || "").toLowerCase();
    const args = parts.slice(1).map((a) => a.replace(/^["']|["']$/g, ""));

    let outText = "";
    if (COMMANDS[cmd]) {
      try {
        const out = COMMANDS[cmd](args);
        if (out !== null && out !== undefined) { outText = String(out); print(escapeHtml(out)); }
      } catch (e) {
        print(`Ошибка выполнения: ${escapeHtml(String(e))}`, "term-err");
      }
    } else {
      print(`"${escapeHtml(parts[0] || "")}" не является внутренней или внешней командой. Наберите <b>help</b>.`, "term-err");
    }
    syncPrompt();
    scrollBottom();
    transcript.push({ cmd: line, out: outText });
    if (transcript.length > 300) transcript = transcript.slice(-300);
    if (hook) { try { hook(line, outText); } catch (e) {} }
  }

  // Автодополнение по Tab: команды и файлы в текущем каталоге
  function complete(value) {
    const parts = value.split(/\s+/);
    const isFirst = parts.length === 1;
    const frag = parts[parts.length - 1];
    let pool;
    if (isFirst) {
      pool = Object.keys(COMMANDS).filter((c) => c.startsWith(frag.toLowerCase()));
    } else {
      const node = nodeAt(resolveSegs("."));
      const names = node && node.type === "dir" ? Object.keys(node.children) : [];
      pool = names.filter((n) => n.toLowerCase().startsWith(frag.toLowerCase()));
    }
    if (pool.length === 0) return { value, list: [] };
    if (pool.length === 1) {
      parts[parts.length - 1] = pool[0];
      return { value: parts.join(" "), list: [] };
    }
    // общий префикс
    let prefix = pool[0];
    for (const p of pool) { while (!p.toLowerCase().startsWith(prefix.toLowerCase())) prefix = prefix.slice(0, -1); }
    if (prefix.length > frag.length) { parts[parts.length - 1] = prefix; return { value: parts.join(" "), list: [] }; }
    return { value, list: pool };
  }

  function shortCwd() { return cwd; }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function print(html, cls) {
    const div = document.createElement("div");
    div.className = "term-line" + (cls ? " " + cls : "");
    div.innerHTML = html;
    outEl.appendChild(div);
  }
  function scrollBottom() {
    const wrap = outEl.parentElement;
    if (wrap) wrap.scrollTop = wrap.scrollHeight;
  }

  function setMode(m) { mode = m === "ps" ? "ps" : "cmd"; syncPrompt(); if (inputEl) inputEl.focus(); }
  function toggleMode() { setMode(mode === "ps" ? "cmd" : "ps"); }
  function getMode() { return mode; }

  function init(outputEl, inEl) {
    outEl = outputEl;
    inputEl = inEl;
    cwd = HOME;
    transcript = [];
    outEl.innerHTML = "";
    print("Microsoft Windows [Version 10.0.19045] — учебная песочница CyberPath 🪟", "term-ok");
    print("Безопасная учебная среда. <b>help</b> — команды · <b>Tab</b> — автодополнение · переключатель cmd/PowerShell вверху.", "");
    print("", "");
    syncPrompt();

    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        run(inputEl.value);
        inputEl.value = "";
      } else if (e.key === "Tab") {
        e.preventDefault();
        const res = complete(inputEl.value);
        inputEl.value = res.value;
        if (res.list.length) print(res.list.join("   "));
        scrollBottom();
      } else if (e.key === "ArrowUp") {
        if (histIdx > 0) { histIdx--; inputEl.value = history[histIdx] || ""; }
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        if (histIdx < history.length) { histIdx++; inputEl.value = history[histIdx] || ""; }
        e.preventDefault();
      }
    });
  }

  function setHook(fn) { hook = typeof fn === "function" ? fn : null; }
  function getTranscript() { return transcript.slice(); }
  return { init, run, setMode, toggleMode, getMode, setHook, getTranscript };
})();
try { window.Sandbox = Sandbox; } catch (e) {}
