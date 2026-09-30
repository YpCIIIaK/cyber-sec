/* ============================================================
   CyberPath — Песочница: симулятор командной строки Windows
   Полностью локальный, безопасный эмулятор (никаких реальных
   системных вызовов). Учебная виртуальная ФС и «сеть».
   Стиль: cmd / PowerShell.
   ============================================================ */

const Sandbox = (() => {
  // Язык вывода: терминал следует переключателю RU/EN
  const isEN = () => !!(window.I18N && I18N.current && I18N.current() === "en");
  const L = (ru, en) => (isEN() ? en : ru);
  // Содержимое файла может быть двуязычным: { ru, en }
  const fileText = (node) => (node.content && typeof node.content === "object" ? (isEN() ? node.content.en : node.content.ru) : node.content) || "";

  // Виртуальная файловая система (Windows-стиль)
  const FS = {
    root: {
      type: "dir",
      children: {
        "secret.txt": { type: "file", content: { ru: "Отличная работа! Флаг: CYBER{windows_explorer}\r\n", en: "Great job! Flag: CYBER{windows_explorer}\r\n" } },
        "readme.txt": { type: "file", content: { ru: "Учебная песочница CyberPath (Windows)\r\nПопробуй: dir, type, systeminfo, ipconfig, base64 -d, help\r\n", en: "CyberPath training sandbox (Windows)\r\nTry: dir, type, systeminfo, ipconfig, base64 -d, help\r\n" } },
        "notes.txt": { type: "file", content: { ru: "TODO: сменить пароль Администратора (не 'Passw0rd'!)\r\n", en: "TODO: change the Administrator password (not 'Passw0rd'!)\r\n" } },
        "Downloads": {
          type: "dir",
          children: {
            "creds.bak": { type: "file", content: { ru: "user:hacker\r\nnote: это учебные данные, не настоящие\r\n", en: "user:hacker\r\nnote: this is training data, not real\r\n" } },
          },
        },
        "Documents": {
          type: "dir",
          children: {
            "domain.txt": { type: "file", content: { ru: "Домен: CYBER.LOCAL\r\nКонтроллер домена: DC01\r\nФлаг: CYBER{ad_recon_ok}\r\n", en: "Domain: CYBER.LOCAL\r\nDomain controller: DC01\r\nFlag: CYBER{ad_recon_ok}\r\n" } },
            "backup.txt": { type: "file", content: { ru: "Бэкап настроек (не удалять)\r\nПометка: PLORE{bfvag_ernql}\r\n", en: "Settings backup (do not delete)\r\nNote: PLORE{bfvag_ernql}\r\n" } },
            "system.log": {
              type: "file",
              content: {
                ru: "2026-01-10 09:12:01 INFO  Служба запущена\r\n" +
                  "2026-01-10 09:12:07 WARN  Неудачный вход: user=guest\r\n" +
                  "2026-01-10 09:13:22 INFO  Обновление применено KB5034441\r\n" +
                  "2026-01-10 09:14:59 AUDIT CYBER{forensics_artifacts}\r\n" +
                  "2026-01-10 09:15:03 INFO  Резервное копирование завершено\r\n",
                en: "2026-01-10 09:12:01 INFO  Service started\r\n" +
                  "2026-01-10 09:12:07 WARN  Failed logon: user=guest\r\n" +
                  "2026-01-10 09:13:22 INFO  Update applied KB5034441\r\n" +
                  "2026-01-10 09:14:59 AUDIT CYBER{forensics_artifacts}\r\n" +
                  "2026-01-10 09:15:03 INFO  Backup completed\r\n",
              },
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
        { p: 1337, s: "leet?", get v() { return L("неизвестный сервис", "unknown service"); } },
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
        L("Доступные команды (учебная песочница Windows):", "Available commands (Windows training sandbox):"),
        L("  dir            — список файлов и папок", "  dir            — list files and folders"),
        L("  cd <папка>     — сменить каталог (cd .. — вверх)", "  cd <folder>    — change directory (cd .. — up)"),
        L("  type <файл>    — вывести содержимое файла", "  type <file>    — print a file's contents"),
        L("  whoami         — текущий пользователь (whoami /priv, /groups)", "  whoami         — current user (whoami /priv, /groups)"),
        L("  ver            — версия Windows", "  ver            — Windows version"),
        L("  systeminfo     — информация о системе (симуляция)", "  systeminfo     — system information (simulated)"),
        L("  ipconfig       — сетевая конфигурация (симуляция)", "  ipconfig       — network configuration (simulated)"),
        L("  tasklist       — список процессов (симуляция)", "  tasklist       — process list (simulated)"),
        L("  netstat        — открытые порты и соединения (симуляция)", "  netstat        — open ports and connections (simulated)"),
        L("  findstr <s> <f>— поиск строки в файле (/i — без регистра)", "  findstr <s> <f>— search a file for a string (/i — ignore case)"),
        L("  reg query <p>  — чтение раздела реестра (симуляция)", "  reg query <p>  — read a registry key (simulated)"),
        L("  certutil -decode <b64> — декодировать base64 (как в Windows)", "  certutil -decode <b64> — decode base64 (like in Windows)"),
        L("  ping <host>    — проверка доступности (симуляция)", "  ping <host>    — reachability check (simulated)"),
        L("  nslookup <host>— разрешение имени в IP (симуляция)", "  nslookup <host>— resolve a name to an IP (simulated)"),
        L("  Get-Service    — службы Windows (PowerShell)", "  Get-Service    — Windows services (PowerShell)"),
        L("  Get-Process    — процессы (PowerShell)", "  Get-Process    — processes (PowerShell)"),
        L("  powershell / cmd — переключить режим оболочки", "  powershell / cmd — switch shell mode"),
        L("  nmap <цель>    — скан портов (10.10.10.5, scanme.local)", "  nmap <target>  — port scan (10.10.10.5, scanme.local)"),
        L("  base64 -d <s>  — декодировать base64 (учебный помощник)", "  base64 -d <s>  — decode base64 (training helper)"),
        L("  base64 <s>     — кодировать base64", "  base64 <s>     — encode base64"),
        L("  rot13 <s>      — шифр ROT13", "  rot13 <s>      — ROT13 cipher"),
        L("  hex -d <s>     — декодировать hex в текст", "  hex -d <s>     — decode hex to text"),
        L("  echo <текст>   — вывести текст", "  echo <text>    — print text"),
        L("  cls            — очистить экран", "  cls            — clear the screen"),
        L("  help           — эта справка", "  help           — this help"),
        "",
        L("Подсказка: цель некоторых квестов — найти флаг вида CYBER{...}", "Tip: some quests ask you to find a flag like CYBER{...}"),
        L("Алиасы PowerShell тоже работают: ls, cat, gc, ps", "PowerShell aliases work too: ls, cat, gc, ps"),
      ].join("\n");
    },
    dir(args) {
      const target = args.find((a) => !a.startsWith("/") && !a.startsWith("-"));
      const segs = resolveSegs(target);
      const node = nodeAt(segs);
      if (!node) return L(`Не удается найти путь "${target}".`, `The system cannot find the path "${target}".`);
      if (node.type === "file") return target;
      const names = Object.keys(node.children);
      const header = L(` Содержимое папки ${segsToPath(segs)}\n`, ` Directory of ${segsToPath(segs)}\n`);
      const rows = names.map((n) => {
        const c = node.children[n];
        return c.type === "dir" ? `<DIR>          ${n}` : `               ${n}`;
      });
      return header + "\n" + rows.join("\n") + L(`\n               ${names.length} объектов`, `\n               ${names.length} item(s)`);
    },
    cd(args) {
      const target = args[0];
      if (!target) return cwd;
      const segs = resolveSegs(target);
      const node = nodeAt(segs);
      if (!node) return L(`Системе не удается найти указанный путь: ${target}`, `The system cannot find the path specified: ${target}`);
      if (node.type !== "dir") return L(`Указанный путь не является каталогом: ${target}`, `The directory name is invalid: ${target}`);
      cwd = segsToPath(segs);
      return null;
    },
    type(args) {
      if (!args[0]) return L("Синтаксис: type <файл>", "Syntax: type <file>");
      const segs = resolveSegs(args[0]);
      const node = nodeAt(segs);
      if (!node) return L(`Не удается найти файл ${args[0]}.`, `The system cannot find the file ${args[0]}.`);
      if (node.type === "dir") return L(`Отказано в доступе (это папка): ${args[0]}`, `Access is denied (it is a folder): ${args[0]}`);
      if (fileText(node).includes("windows_explorer")) {
        Progress.unlockAchievement("terminal_master");
      }
      return fileText(node).replace(/\r?\n$/, "");
    },
    whoami(args) {
      if (args[0] === "/priv")
        return L("PRIVILEGES INFORMATION\n----------------------\nSeDebugPrivilege              Enabled\nSeShutdownPrivilege           Disabled\n(учебная симуляция)", "PRIVILEGES INFORMATION\n----------------------\nSeDebugPrivilege              Enabled\nSeShutdownPrivilege           Disabled\n(training simulation)");
      if (args[0] === "/groups")
        return L("GROUP INFORMATION\n-----------------\nBUILTIN\\Users\nBUILTIN\\Administrators (учебная симуляция)", "GROUP INFORMATION\n-----------------\nBUILTIN\\Users\nBUILTIN\\Administrators (training simulation)");
      return "desktop-cyber\\hacker";
    },
    ver() { return L("\nMicrosoft Windows [Version 10.0.19045.4046] (учебная симуляция)", "\nMicrosoft Windows [Version 10.0.19045.4046] (training simulation)"); },
    cls() { outEl.innerHTML = ""; return null; },
    echo(args) { return args.join(" "); },
    systeminfo() {
      return [
        L("Имя узла:                  DESKTOP-CYBER", "Host Name:                 DESKTOP-CYBER"),
        L("Название ОС:               Microsoft Windows 10 Pro", "OS Name:                   Microsoft Windows 10 Pro"),
        L("Версия ОS:                 10.0.19045 N/A построение 19045", "OS Version:                10.0.19045 N/A Build 19045"),
        L("Изготовитель системы:      CyberPath Labs (симуляция)", "System Manufacturer:       CyberPath Labs (simulated)"),
        L("Тип системы:               x64-based PC", "System Type:               x64-based PC"),
        L("Полный объем физической памяти: 16 384 МБ", "Total Physical Memory:     16,384 MB"),
        L("Исправления:               установлено 42 (учебная симуляция)", "Hotfix(s):                 42 installed (training simulation)"),
      ].join("\n");
    },
    ipconfig() {
      return [
        L("Настройка протокола IP для Windows", "Windows IP Configuration"),
        "",
        L("Адаптер Ethernet Ethernet0:", "Ethernet adapter Ethernet0:"),
        L("   IPv4-адрес. . . . . . . . . . . . : 10.10.10.42", "   IPv4 Address. . . . . . . . . . . : 10.10.10.42"),
        L("   Маска подсети . . . . . . . . . . : 255.255.255.0", "   Subnet Mask . . . . . . . . . . . : 255.255.255.0"),
        L("   Основной шлюз . . . . . . . . . . : 10.10.10.1", "   Default Gateway . . . . . . . . . : 10.10.10.1"),
        L("(учебная симуляция)", "(training simulation)"),
      ].join("\n");
    },
    tasklist() {
      return [
        L("Имя образа                     PID Сессия     Память", "Image Name                     PID Session    Mem Usage"),
        "========================= ======== ======== ==========",
        L("System                           4 Services    140 КБ", "System                           4 Services    140 K"),
        L("explorer.exe                  2140 Console  45 210 КБ", "explorer.exe                  2140 Console  45,210 K"),
        L("powershell.exe                3312 Console  62 480 КБ", "powershell.exe                3312 Console  62,480 K"),
        L("chrome.exe                    4488 Console 210 664 КБ", "chrome.exe                    4488 Console 210,664 K"),
        L("(учебная симуляция)", "(training simulation)"),
      ].join("\n");
    },
    netstat(args) {
      return [
        L("Активные подключения", "Active Connections"),
        "",
        L("  Имя    Локальный адрес        Внешний адрес          Состояние       PID", "  Proto  Local Address          Foreign Address        State           PID"),
        "  TCP    10.10.10.42:139        0.0.0.0:0              LISTENING       4",
        "  TCP    10.10.10.42:445        0.0.0.0:0              LISTENING       4",
        "  TCP    10.10.10.42:3389       0.0.0.0:0              LISTENING       1044",
        "  TCP    10.10.10.42:52344      10.10.10.5:443        ESTABLISHED     4488",
        L("(учебная симуляция)", "(training simulation)"),
      ].join("\n");
    },
    nmap(args) {
      const target = args.find((a) => !a.startsWith("-"));
      if (!target) return L("nmap: укажите цель, напр. nmap 10.10.10.5", "nmap: specify a target, e.g. nmap 10.10.10.5");
      const host = NET[target];
      if (!host)
        return L(`Starting Nmap (учебная симуляция)\nNote: Host seems down / вне учебной сети.\nДоступные учебные цели: 10.10.10.5, scanme.local`, `Starting Nmap (training simulation)\nNote: Host seems down / outside the training network.\nAvailable training targets: 10.10.10.5, scanme.local`);
      const lines = [
        L(`Starting Nmap 7.94 (учебная симуляция)`, `Starting Nmap 7.94 (training simulation)`),
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
      if (!payload) return L("base64: укажите строку", "base64: specify a string");
      try {
        if (decode) {
          const res = decodeURIComponent(escape(atob(payload)));
          if (res.includes("base64_is_easy")) Progress.unlockAchievement("terminal_master");
          return res;
        }
        return btoa(unescape(encodeURIComponent(payload)));
      } catch (e) {
        return L("base64: неверный ввод", "base64: invalid input");
      }
    },
    hex(args) {
      const decode = args[0] === "-d";
      const payload = args.slice(decode ? 1 : 0).join("");
      if (!payload) return L("hex: укажите строку (hex -d 4359...)", "hex: specify a string (hex -d 4359...)");
      if (!decode) return Array.from(payload).map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
      if (!/^([0-9a-fA-F]{2})+$/.test(payload)) return L("hex: неверный ввод", "hex: invalid input");
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
      if (!pattern || !file) return L("Синтаксис: findstr <строка> <файл>", "Syntax: findstr <string> <file>");
      const segs = resolveSegs(file);
      const node = nodeAt(segs);
      if (!node || node.type !== "dir" && node.type !== "file") return L(`FINDSTR: Не удается открыть ${file}`, `FINDSTR: Cannot open ${file}`);
      if (node.type === "dir") return L(`FINDSTR: ${file} — это каталог`, `FINDSTR: ${file} is a directory`);
      const ci = flags.some((f) => f.toLowerCase() === "/i");
      const lines = fileText(node).split(/\r?\n/);
      const hit = lines.filter((l) =>
        ci ? l.toLowerCase().includes(pattern.toLowerCase()) : l.includes(pattern)
      );
      if (hit.some((l) => l.includes("forensics_artifacts"))) Progress.unlockAchievement("terminal_master");
      return hit.length ? hit.join("\n") : "";
    },
    ping(args) {
      const host = args.find((a) => !a.startsWith("-")) || "localhost";
      const ip = DNS[host] || (/^\d+\.\d+\.\d+\.\d+$/.test(host) ? host : "10.10.10.5");
      const lines = [L(`Обмен пакетами с ${host} [${ip}] с 32 байтами данных:`, `Pinging ${host} [${ip}] with 32 bytes of data:`)];
      for (let i = 0; i < 4; i++) lines.push(L(`Ответ от ${ip}: число байт=32 время=${11 + i}мс TTL=128`, `Reply from ${ip}: bytes=32 time=${11 + i}ms TTL=128`));
      lines.push("", L(`Статистика Ping для ${ip}: Пакетов: отправлено = 4, получено = 4, потеряно = 0 (0% потерь)`, `Ping statistics for ${ip}: Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)`), L("(учебная симуляция)", "(training simulation)"));
      return lines.join("\n");
    },
    nslookup(args) {
      const host = args.find((a) => !a.startsWith("-"));
      if (!host) return L("nslookup: укажите имя", "nslookup: specify a name");
      const ip = DNS[host];
      if (!ip) return L(`*** Не удалось найти ${host}: Non-existent domain\nИзвестные учебные имена: ${Object.keys(DNS).join(", ")}`, `*** Can't find ${host}: Non-existent domain\nKnown training names: ${Object.keys(DNS).join(", ")}`);
      return L(`Server:  dns.cyber.local\nAddress:  10.10.10.1\n\nИмя:     ${host}\nAddress: ${ip}\n(учебная симуляция)`, `Server:  dns.cyber.local\nAddress:  10.10.10.1\n\nName:    ${host}\nAddress: ${ip}\n(training simulation)`);
    },
    reg(args) {
      if ((args[0] || "").toLowerCase() !== "query") return L("Синтаксис: reg query <путь>", "Syntax: reg query <path>");
      const path = (args[1] || "").toUpperCase().replace(/"/g, "");
      const rows = REG[path];
      if (!rows) return L(`ERROR: Не удалось найти указанный раздел реестра.\nПопробуйте: reg query HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run`, `ERROR: The system was unable to find the specified registry key.\nTry: reg query HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run`);
      return [args[1], ...rows, "", L("(учебная симуляция)", "(training simulation)")].join("\n");
    },
    certutil(args) {
      const flag = (args[0] || "").toLowerCase();
      if (flag === "-decode" || flag === "-decodehex") {
        const payload = args.slice(1).join(" ").replace(/^["']|["']$/g, "");
        if (!payload) return L("certutil: укажите строку для декодирования", "certutil: specify a string to decode");
        try {
          const res = decodeURIComponent(escape(atob(payload)));
          if (res.includes("persistence_found")) Progress.unlockAchievement("terminal_master");
          return res + L("\nCertUtil: -decode выполнено успешно.", "\nCertUtil: -decode command completed successfully.");
        } catch (e) { return L("certutil: неверные входные данные", "certutil: invalid input data"); }
      }
      return L("certutil (учебный): поддерживается 'certutil -decode <base64>'", "certutil (training): 'certutil -decode <base64>' is supported");
    },
    "get-service"() {
      return [
        "Status   Name               DisplayName",
        "------   ----               -----------",
        "Running  WinDefend          Microsoft Defender Antivirus Service",
        "Running  Dnscache           DNS Client",
        "Stopped  RemoteRegistry     Remote Registry",
        "Running  Spooler            Print Spooler",
        L("(учебная симуляция)", "(training simulation)"),
      ].join("\n");
    },
    "get-process"() { return COMMANDS.tasklist([]); },
    powershell() { mode = "ps"; syncPrompt(); return L("Windows PowerShell (учебный режим). Наберите 'exit' или 'cmd' для возврата.", "Windows PowerShell (training mode). Type 'exit' or 'cmd' to go back."); },
    exit() { if (mode === "ps") { mode = "cmd"; syncPrompt(); return L("Выход из PowerShell.", "Exiting PowerShell."); } return L("Для выхода просто закройте вкладку.", "To exit, just close the tab."); },
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
        print(L(`Ошибка выполнения: ${escapeHtml(String(e))}`, `Execution error: ${escapeHtml(String(e))}`), "term-err");
      }
    } else {
      print(L(`"${escapeHtml(parts[0] || "")}" не является внутренней или внешней командой. Наберите <b>help</b>.`, `'${escapeHtml(parts[0] || "")}' is not recognized as an internal or external command. Type <b>help</b>.`), "term-err");
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
    print(L("Microsoft Windows [Version 10.0.19045] — учебная песочница CyberPath 🪟", "Microsoft Windows [Version 10.0.19045] — CyberPath training sandbox 🪟"), "term-ok");
    print(L("Безопасная учебная среда. <b>help</b> — команды · <b>Tab</b> — автодополнение · переключатель cmd/PowerShell вверху.", "A safe training environment. <b>help</b> — commands · <b>Tab</b> — autocomplete · cmd/PowerShell switch above."), "");
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
