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
        "  nmap <цель>    — скан портов (10.10.10.5, scanme.local)",
        "  base64 -d <s>  — декодировать base64 (учебный помощник)",
        "  base64 <s>     — кодировать base64",
        "  rot13 <s>      — шифр ROT13",
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
  };
  // Алиасы PowerShell / привычные
  COMMANDS["ls"] = COMMANDS.dir;
  COMMANDS["gci"] = COMMANDS.dir;
  COMMANDS["cat"] = COMMANDS.type;
  COMMANDS["gc"] = COMMANDS.type;
  COMMANDS["clear"] = COMMANDS.cls;
  COMMANDS["ps"] = COMMANDS.tasklist;

  function run(raw) {
    const line = raw.trim();
    if (!line) return;
    print(`<span class="term-path">${escapeHtml(shortCwd())}</span>&gt; ${escapeHtml(line)}`, "term-cmd");
    history.push(line);
    histIdx = history.length;

    const parts = line.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    const cmd = (parts[0] || "").toLowerCase();
    const args = parts.slice(1).map((a) => a.replace(/^["']|["']$/g, ""));

    if (COMMANDS[cmd]) {
      try {
        const out = COMMANDS[cmd](args);
        if (out !== null && out !== undefined) print(escapeHtml(out));
      } catch (e) {
        print(`Ошибка выполнения: ${escapeHtml(String(e))}`, "term-err");
      }
    } else {
      print(`"${escapeHtml(parts[0] || "")}" не является внутренней или внешней командой. Наберите <b>help</b>.`, "term-err");
    }
    scrollBottom();
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

  function init(outputEl, inEl) {
    outEl = outputEl;
    inputEl = inEl;
    cwd = HOME;
    outEl.innerHTML = "";
    print("Microsoft Windows [Version 10.0.19045] — учебная песочница CyberPath 🪟", "term-ok");
    print("Полностью безопасная учебная среда. Наберите <b>help</b> для списка команд.", "");
    print("", "");

    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        run(inputEl.value);
        inputEl.value = "";
      } else if (e.key === "ArrowUp") {
        if (histIdx > 0) { histIdx--; inputEl.value = history[histIdx] || ""; }
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        if (histIdx < history.length) { histIdx++; inputEl.value = history[histIdx] || ""; }
        e.preventDefault();
      }
    });
  }

  return { init, run };
})();
