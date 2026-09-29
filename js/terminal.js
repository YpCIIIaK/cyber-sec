/* ============================================================
   CyberPath — Песочница: симулятор терминала
   Полностью локальный, безопасный эмулятор (никаких реальных
   системных вызовов). Учебная виртуальная ФС и «сеть».
   ============================================================ */

const Sandbox = (() => {
  // Виртуальная файловая система
  const FS = {
    "/home/hacker": {
      type: "dir",
      children: {
        "secret.txt": { type: "file", content: "Отличная работа! Флаг: CYBER{terminal_navigator}\n" },
        "readme.md": { type: "file", content: "# Учебная песочница CyberPath\nПопробуй: ls, cat, nmap, base64 -d, rot13, help\n" },
        "notes.txt": { type: "file", content: "TODO: сменить пароль admin (не '123456'!)\n" },
        ".hidden": { type: "file", content: "Ты нашёл скрытый файл! Скрытые файлы начинаются с точки.\n" },
        "loot": {
          type: "dir",
          children: {
            "creds.bak": { type: "file", content: "user:hacker\nnote: это учебные данные, не настоящие\n" },
          },
        },
      },
    },
  };

  let cwd = "/home/hacker";
  let outEl = null;
  let inputEl = null;
  const history = [];
  let histIdx = 0;

  // Учебные «сетевые» цели для nmap
  const NET = {
    "10.10.10.5": {
      ports: [
        { p: 22, s: "ssh", v: "OpenSSH 8.2p1" },
        { p: 80, s: "http", v: "Apache 2.4.41" },
        { p: 443, s: "https", v: "Apache 2.4.41 (TLS)" },
        { p: 1337, s: "leet?", v: "неизвестный сервис" },
      ],
    },
    "scanme.local": {
      ports: [
        { p: 21, s: "ftp", v: "vsftpd 3.0.3" },
        { p: 22, s: "ssh", v: "OpenSSH 7.6" },
      ],
    },
  };

  function resolvePath(p) {
    if (!p) return cwd;
    let base;
    if (p.startsWith("/")) base = [];
    else base = cwd.split("/").filter(Boolean);
    if (p === "~") return "/home/hacker";
    if (p.startsWith("~/")) { base = ["home", "hacker"]; p = p.slice(2); }
    for (const part of p.split("/").filter(Boolean)) {
      if (part === ".") continue;
      if (part === "..") { base.pop(); continue; }
      base.push(part);
    }
    return "/" + base.join("/");
  }

  function getNode(path) {
    if (path === "/") return { type: "dir", children: { home: FS["/home/hacker"] ? wrapHome() : {} } };
    // Построим упрощённо: поддерживаем /home/hacker и вложенное
    const parts = path.split("/").filter(Boolean);
    if (parts[0] === "home" && parts[1] === "hacker") {
      let node = FS["/home/hacker"];
      for (let i = 2; i < parts.length; i++) {
        if (node.type !== "dir" || !node.children[parts[i]]) return null;
        node = node.children[parts[i]];
      }
      return node;
    }
    if (parts.length === 0) return { type: "dir", children: {} };
    return null;
  }
  function wrapHome() { return { type: "dir", children: { hacker: FS["/home/hacker"] } }; }

  const COMMANDS = {
    help() {
      return [
        "Доступные команды (учебная песочница):",
        "  pwd            — текущий каталог",
        "  ls [-a] [dir]  — список файлов (-a: скрытые)",
        "  cd <dir>       — сменить каталог",
        "  cat <file>     — вывести файл",
        "  whoami / id    — кто я",
        "  uname -a       — версия ядра (симуляция)",
        "  sudo -l        — что можно через sudo (симуляция)",
        "  nmap <target>  — скан портов (10.10.10.5, scanme.local)",
        "  base64 -d <s>  — декодировать base64",
        "  base64 <s>     — кодировать base64",
        "  rot13 <s>      — шифр ROT13",
        "  echo <text>    — вывести текст",
        "  clear          — очистить экран",
        "  help           — эта справка",
        "",
        "Подсказка: цель некоторых квестов — найти флаг вида CYBER{...}",
      ].join("\n");
    },
    pwd() { return cwd; },
    whoami() { return "hacker"; },
    id() { return "uid=1000(hacker) gid=1000(hacker) groups=1000(hacker),27(sudo)"; },
    clear() { outEl.innerHTML = ""; return null; },
    echo(args) { return args.join(" "); },
    "uname"(args) {
      if (args.includes("-a"))
        return "Linux cyberpath 5.15.0-generic #1 SMP x86_64 GNU/Linux (учебная симуляция)";
      return "Linux";
    },
    "sudo"(args) {
      if (args[0] === "-l")
        return "User hacker may run the following commands:\n    (ALL) NOPASSWD: /usr/bin/find\n(учебная симуляция — намёк на privesc через find)";
      return "sudo: для учебной песочницы доступен только 'sudo -l'";
    },
    ls(args) {
      const showAll = args.includes("-a") || args.includes("-la") || args.includes("-al") || args.includes("-l");
      const target = args.find((a) => !a.startsWith("-"));
      const path = resolvePath(target || ".");
      const node = getNode(path);
      if (!node) return `ls: невозможно получить доступ к '${target}': нет такого файла`;
      if (node.type === "file") return target;
      const names = Object.keys(node.children);
      const visible = showAll ? names : names.filter((n) => !n.startsWith("."));
      if (showAll) visible.unshift(".", "..");
      return visible
        .map((n) => {
          if (n === "." || n === "..") return n + "/";
          const child = node.children[n];
          return child && child.type === "dir" ? n + "/" : n;
        })
        .join("   ");
    },
    cd(args) {
      const target = args[0] || "~";
      const path = resolvePath(target);
      const node = getNode(path);
      if (!node) return `cd: нет такого каталога: ${target}`;
      if (node.type !== "dir") return `cd: не каталог: ${target}`;
      cwd = path;
      return null;
    },
    cat(args) {
      if (!args[0]) return "cat: укажите файл";
      const path = resolvePath(args[0]);
      const node = getNode(path);
      if (!node) return `cat: ${args[0]}: нет такого файла`;
      if (node.type === "dir") return `cat: ${args[0]}: это каталог`;
      // спец-триггер достижения
      if (node.content && node.content.includes("terminal_navigator")) {
        Progress.unlockAchievement("terminal_master");
      }
      return node.content.replace(/\n$/, "");
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
        `PORT      STATE  SERVICE   VERSION`,
      ];
      const wantV = args.includes("-sV") || args.includes("-sv") || args.includes("-A");
      for (const pr of host.ports) {
        const portCol = (pr.p + "/tcp").padEnd(10);
        const svc = pr.s.padEnd(9);
        lines.push(`${portCol}open   ${svc} ${wantV ? pr.v : ""}`.trimEnd());
      }
      lines.push(``, `Nmap done: 1 IP address (1 host up) scanned`);
      return lines.join("\n");
    },
    base64(args) {
      const decode = args[0] === "-d" || args[0] === "--decode";
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
  };
  // алиасы
  COMMANDS["dir"] = COMMANDS.ls;

  function run(raw) {
    const line = raw.trim();
    if (!line) return;
    print(`<span class="term-prompt">hacker@cyberpath</span>:<span class="term-path">${shortCwd()}</span>$ ${escapeHtml(line)}`, "term-cmd");
    history.push(line);
    histIdx = history.length;

    const parts = line.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    const cmd = parts[0];
    const args = parts.slice(1).map((a) => a.replace(/^["']|["']$/g, ""));

    if (COMMANDS[cmd]) {
      try {
        const out = COMMANDS[cmd](args);
        if (out !== null && out !== undefined) print(escapeHtml(out));
      } catch (e) {
        print(`Ошибка выполнения: ${escapeHtml(String(e))}`, "term-err");
      }
    } else {
      print(`${escapeHtml(cmd)}: команда не найдена. Наберите <b>help</b>.`, "term-err");
    }
    scrollBottom();
  }

  function shortCwd() {
    return cwd.replace("/home/hacker", "~");
  }
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
    outEl.innerHTML = "";
    print("Добро пожаловать в песочницу CyberPath 🧪", "term-ok");
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
