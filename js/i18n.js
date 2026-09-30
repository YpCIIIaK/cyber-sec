/* ============================================================
   CyberPath — интернационализация (RU/EN)
   UI: t("<рус.строка>") -> EN из словаря, иначе рус. как есть.
   Контент: наложение EN на объекты COURSES/GLOSSARY/… «на месте»
   с сохранением оригинала (restorable). Тексты уроков/заданий
   пока остаются на русском (переводится отдельно).
   ============================================================ */
const I18N = (() => {
  const KEY = "cyberpath_lang";
  let lang = "ru";

  /* -------- UI-словарь (ключ = русская строка) -------- */
  const UI = {
    // Навигация
    "В заметки": "Save note", "Сохранено в заметки": "Saved to notes", "Такая заметка уже есть": "Already saved",
    "Заметки": "Notes", "Мои заметки": "My notes", "Поиск по заметкам…": "Search notes…", "Скачать конспект (.md)": "Download notes (.md)",
    "Ваш комментарий…": "Your comment…", "Удалить": "Delete", "Пока нет заметок": "No notes yet", "К курсам": "To courses",
    "Комментарий сохранён": "Comment saved", "Конспект CyberPath": "CyberPath notes",
    "Выделите текст в любом уроке и нажмите «В заметки». Здесь можно дописать комментарий и скачать конспект.": "Select text in any lesson and click “Save note”. Add comments here and download your notes.",
    "Откройте любую комнату, выделите важный фрагмент теории — появится кнопка «В заметки».": "Open any room and select an important passage — a “Save note” button appears.",
    "Этот ответ вы уже пробовали. Попробуйте другой вариант или откройте подсказку.": "You already tried this answer. Try another or open a hint.",
    "Флаг имеет формат CYBER{...} — вводите его целиком, с фигурными скобками.": "Flags look like CYBER{...} — enter it in full, with braces.",
    "Почти: не совпадает регистр букв. Флаги чувствительны к регистру.": "Almost: letter case differs. Flags are case-sensitive.",
    "Суть верная, но формат другой: проверьте пробелы, дефисы и знаки.": "Right idea, wrong format: check spaces, hyphens and symbols.",
    "Очень близко! Похоже на опечатку — проверьте написание.": "Very close! Looks like a typo.",
    "Правильный ответ спрятан в вашем — уберите лишнее, нужен только сам ответ.": "The right answer is inside yours — remove the extra words.",
    "Вы на верном пути, но ответ неполный.": "On the right track, but incomplete.",
    "Ответ ожидается на русском языке.": "The answer is expected in Russian.", "Ответ ожидается латиницей (на английском).": "The answer is expected in English (Latin letters).",
    "Здесь нужен ответ числом.": "A number is expected here.",
    "Уже несколько попыток — откройте подсказку ниже, она подтолкнёт в нужную сторону.": "Several attempts already — open a hint below.",
    "Терминал пока пуст — введите команду слева, затем нажмите «Проверить».": "The terminal is empty — run a command, then click “Check”.",
    "В выводе есть ошибка «не найдено» — проверьте текущий каталог (dir) и путь (cd).": "The output shows “not found” — check the current folder (dir) and path (cd).",
    "В выводе уже есть флаг — скопируйте его в поле ответа целиком, вместе с CYBER{...}.": "The flag is already in the output — paste it in full, including CYBER{...}.",
    "По уровням сложности": "By difficulty", "Фундамент": "Foundation", "Инфраструктура": "Infrastructure", "Анализ ПО": "Software analysis",
    "Требуется": "Requires", "пройден": "completed", "доступен": "available", "закрыт": "locked",
    "Windows и CLI": "Windows & CLI", "Сети": "Networking", "Веб-безопасность": "Web security", "Криптография": "Cryptography",
    "Разведка и OSINT": "Recon & OSINT", "Тестирование на проникновение": "Penetration testing", "Защита и мониторинг": "Defense & monitoring",
    "Форензика и анализ ПО": "Forensics & malware analysis", "оценка 0–100 · наведите на навык": "score 0–100 · hover a skill",
    "Оценка навыка = прохождение связанных курсов × качество (точность, подсказки) + сданные экзамены": "Skill score = related course progress × quality (accuracy, hints) + passed exams",
    "освоение": "mastery", "Освоение: прохождение × точность (подсказки снижают) + экзамен": "Mastery: progress × accuracy (hints lower it) + exam",
    "Ступень": "Tier", "Главная": "Home", "Курсы": "Courses", "Путь": "Path", "Песочница": "Sandbox",
    "Повторение": "Review", "Словарь": "Glossary", "Профиль": "Profile",
    "Перейти к содержимому": "Skip to content", "Установить приложение": "Install app",
    // Кнопки/общее
    "Начать обучение": "Start learning", "Открыть песочницу": "Open sandbox",
    "Все курсы": "All courses", "Проверить": "Check", "Понятно, дальше": "Got it, next",
    "Ответить": "Answer", "Сдать флаг": "Submit flag", "Сдать экзамен": "Take exam",
    "Пересдать экзамен": "Retake exam", "Сертификат": "Certificate",
    "Скачать сертификат": "Download certificate", "Начать": "Start", "Продолжить": "Continue",
    "К курсам": "To courses", "К курсу": "To course", "К обзору курса": "Course overview",
    "К дашборду": "To dashboard", "Дальше": "Next", "Обновить": "Refresh", "Сбросить": "Reset",
    "Пройти заново": "Retry", "Завершить экзамен": "Finish exam", "Начать повторение": "Start review",
    "Сбросить всё": "Reset all", "Скачать прогресс": "Download progress",
    "Загрузить из файла": "Load from file", "Поделиться карточкой": "Share card",
    "Следующая комната": "Next room", "Показать подсказку": "Show hint",
    // Заголовки страниц
    "Каталог курсов": "Course catalog", "Профиль и прогресс": "Profile & progress",
    "Путь обучения": "Learning path", "Словарь терминов": "Glossary of terms",
    "Аналитика": "Analytics", "Достижения": "Achievements", "Задания": "Tasks",
    "Квесты-машины": "Machine quests", "Быстрый старт": "Quick start",
    "Прогресс по курсам": "Course progress", "Данные и синхронизация": "Data & sync",
    "Комнаты курса": "Course rooms", "Задание дня": "Daily challenge",
    // Домашняя
    "Учись": "Learn", "кибербезопасности": "cybersecurity", "на практике": "hands-on",
    "Реальные навыки": "Real skills", "Квесты и флаги": "Quests & flags",
    "Система прогрессии": "Progression system", "Прогресс локально": "Local progress",
    "Популярные курсы": "Popular courses", "Продолжить обучение": "Continue learning",
    "Начните здесь": "Start here", "Ваш уровень": "Your level", "до": "to", "уровня": "level",
    "Бесплатно · Без регистрации · Прогресс сохраняется локально": "Free · No signup · Progress saved locally",
    "Интерактивные курсы, квесты, задания и живая песочница-терминал. От основ до пентеста, веба, сетей, Active Directory и форензики.":
      "Interactive courses, quests, tasks and a live terminal sandbox. From fundamentals to pentesting, web, networking, Active Directory and forensics.",
    "Задания на настоящих концепциях: SQLi, XSS, Nmap, cmd/PowerShell, Active Directory, хеши.":
      "Tasks on real concepts: SQLi, XSS, Nmap, cmd/PowerShell, Active Directory, hashes.",
    "Находи флаги CYBER{…} в живой песочнице — как в CTF-соревнованиях.":
      "Hunt CYBER{…} flags in a live sandbox — just like CTF competitions.",
    "XP, уровни, серии дней и достижения. Сложные курсы открываются по мере роста.":
      "XP, levels, streaks and achievements. Advanced courses unlock as you grow.",
    "Всё хранится в браузере. Никаких аккаунтов, регистрации и слежки.":
      "Everything stays in your browser. No accounts, no signup, no tracking.",
    // Уровни
    "Новичок": "Beginner", "Средний": "Intermediate", "Сложный": "Advanced",
    "Все уровни": "All levels",
    // Каталог/фильтры
    "Поиск по курсам и темам…": "Search courses and topics…",
    "По умолчанию": "Default", "По прогрессу": "By progress", "По сложности": "By difficulty",
    "Выберите направление. Сложные курсы открываются по мере прохождения предыдущих.":
      "Choose a track. Advanced courses unlock as you complete the earlier ones.",
    "Поиск термина или определения…": "Search a term or definition…",
    // Дашборд/KPI
    "Точность ответов": "Answer accuracy", "На повторение": "To review",
    "Активных дней": "Active days", "Всего попыток": "Total attempts",
    "XP по неделям": "XP per week", "Радар навыков": "Skill radar",
    "Календарь активности": "Activity calendar", "Слабые места": "Weak spots",
    "меньше": "less", "больше": "more", "всего XP": "total XP", "заданий": "tasks",
    "курсов пройдено": "courses done", "дней подряд": "days streak", "курсов": "courses",
    "ачивок": "achievements", "дней": "days", "точность": "accuracy", "достижений": "achievements",
    "нет данных": "no data", "карточек готово": "cards ready", "всё повторено": "all reviewed",
    "с начала обучения": "since you started", "с ошибкой": "with errors",
    "последние 8 недель": "last 8 weeks", "% прохождения курсов": "% of courses done",
    "последние 12 недель": "last 12 weeks", "где чаще ошибки — стоит повторить": "where errors cluster — worth reviewing",
    "ошибок": "errors", "Требуется:": "Requires:",
    // Повторение
    "Повторение": "Review", "Проверить": "Check",
    "Всё повторено на сегодня!": "All caught up for today!",
    "Карточки появятся автоматически": "Cards will appear automatically",
    "Сессия завершена!": "Session complete!", "Верно!": "Correct!",
    // Экзамен
    "Экзамен": "Exam", "Экзамен сдан! 🎉": "Exam passed! 🎉", "Пока не сдан": "Not passed yet",
    // Песочница
    "Безопасный учебный терминал. Отрабатывайте команды и ищите флаги. Наберите": "Safe training terminal. Practice commands and hunt flags. Type",
    // Прочее
    "Сброс прогресса": "Reset progress", "Горячие клавиши": "Keyboard shortcuts",
    "Требуется": "Requires", "Пройдено": "Done", "готово": "ready", "Решено": "Solved", "из": "of",
    "Отмечено как прочитанное": "Marked as read", "Введите ответ": "Enter your answer",
    "Комната пройдена!": "Room complete!", "Верно! Решено": "Correct! Solved",
    "Ответ или выполните в терминале": "Answer or run it in the terminal",
    "Выполните команду в терминале слева — затем нажмите «Проверить».": "Run the command in the terminal on the left, then press “Check”.",
    "Выполните команду в терминале и нажмите «Проверить».": "Run the command in the terminal and press “Check”.",
    "Комната": "Room", "Ваш ответ": "Your answer",
    "Без подсказок": "No hints", "Подсказки использованы": "Hints used",
    "Отличная работа.": "Great job.", "Готовы к следующей?": "Ready for the next one?",
    "Курс полностью пройден!": "Course fully completed!",
    "Это была последняя комната курса!": "That was the course's last room!",
    "К обзору курса": "Course overview", "Начать курс": "Start course",
    "Следующий курс по сложности": "Next course by difficulty",
    "Дальше открывается": "Unlocks next", "Подробнее": "Details",
    "Поздравляем!": "Congratulations!", "Вы прошли все курсы платформы": "You've completed every course",
    "Так держать — вернитесь к повторению, чтобы закрепить знания.": "Keep it up — come back to Review to reinforce what you've learned.",
    "Попробуйте команды прямо здесь": "Try commands right here",
    "решено из терминала": "solved from the terminal", "флаг найден!": "flag found!",
    "Главная": "Home", "Курсы": "Courses", "Экзамен": "Exam", "Железо": "Iron", "Бронза": "Bronze", "Серебро": "Silver",
    "Золото": "Gold", "Платина": "Platinum", "Алмаз": "Diamond", "Легенда": "Legend", "Оператор CyberPath": "CyberPath operator",
    "до следующего уровня": "to next level", "Следующее звание": "Next rank", "Высшее звание достигнуто": "Top rank reached",
    "Обычное": "Common", "Редкое": "Rare", "Эпическое": "Epic", "Легендарное": "Legendary", "Все": "All", "Получены": "Unlocked",
    "В процессе": "In progress", "Пока пусто": "Nothing here yet", "Достижение!": "Achievement!", "визит": "visit",
    "Пн": "Mon", "Ср": "Wed", "Пт": "Fri", "Вс": "Sun", "активных дней": "active days", "XP за период": "XP this period",
    "лучший день": "best day", "макс. серия дней": "longest streak", "меньше": "less", "больше": "more",
    "Решите первые задания — радар оживёт": "Solve your first tasks to light up the radar", "последние 17 недель": "last 17 weeks",
    "Лестница званий": "Rank ladder", "Открыть лестницу званий": "Open rank ladder", "Звания": "Ranks",
    "с уровня": "from level", "сейчас": "now", "уровень": "level", "максимум!": "max reached!",
    "до": "to", "Ваш уровень": "Your level",
    "Введите флаг": "Enter the flag", "Неверно, попробуйте ещё раз.": "Wrong, try again.",
  };

  function t(ru) {
    if (lang === "en" && Object.prototype.hasOwnProperty.call(UI, ru)) return UI[ru];
    return ru;
  }
  function tf(ru, ...args) { let s = t(ru); args.forEach((a, i) => (s = s.replace("{" + i + "}", a))); return s; }

  /* -------- Переводы контента -------- */
  const LEVELS = { "Новичок": "Beginner", "Средний": "Intermediate", "Сложный": "Advanced" };
  const TAGS = {
    "базовое": "basics", "теория": "theory", "обязательное": "essential",
    "windows": "windows", "cmd": "cmd", "powershell": "powershell",
    "сети": "networking", "nmap": "nmap", "протоколы": "protocols",
    "web": "web", "owasp": "owasp", "уязвимости": "vulnerabilities",
    "пентест": "pentest", "методология": "methodology", "этика": "ethics",
    "крипто": "crypto", "хеши": "hashes", "encoding": "encoding",
    "osint": "osint", "разведка": "recon", "приватность": "privacy",
    "домен": "domain", "kerberos": "kerberos", "reverse": "reverse", "PE": "PE",
    "assembler": "assembler", "forensics": "forensics", "инциденты": "incidents",
    "артефакты": "artifacts", "phishing": "phishing", "email": "email", "SOC": "SOC",
    "hardening": "hardening", "CIS": "CIS", "конфигурация": "configuration",
    "blueteam": "blueteam", "MITRE": "MITRE", "malware": "malware", "анализ": "analysis", "IOC": "IOC",
  };
  const GLOSS_CATS = {
    "Основы": "Basics", "Фишинг": "Phishing", "Веб": "Web", "Сети": "Networking",
    "Крипто": "Crypto", "Пентест": "Pentest", "Windows": "Windows", "Вредоносы": "Malware",
    "Реверс": "Reverse Eng", "Blue Team": "Blue Team", "Харденинг": "Hardening",
    "OSINT": "OSINT", "Форензика": "Forensics",
  };

  // Курсы: title/summary по id
  const COURSES_EN = {
    fundamentals: { title: "Cybersecurity Fundamentals", summary: "The foundation: threats, the CIA triad, passwords, phishing and digital hygiene. The perfect starting point." },
    windows: { title: "Windows for Security", summary: "Windows command line (cmd), PowerShell, accounts and NTFS permissions, system recon. With sandbox tasks." },
    networking: { title: "Network Security", summary: "TCP/IP, ports, Nmap scanning, traffic analysis and understanding how data flows across the network." },
    web: { title: "Web Security (OWASP)", summary: "SQL injection, XSS, IDOR, authentication and the top OWASP risks — with clear examples." },
    pentest: { title: "Pentesting: Methodology", summary: "The full authorized penetration-testing cycle: recon, scanning, exploitation, reporting." },
    crypto: { title: "Cryptography & Encoding", summary: "Hashes, symmetric and asymmetric encryption, encodings and practical decoding quests." },
    osint: { title: "OSINT — Open-Source Intelligence", summary: "Legal collection of open data: metadata, search operators, geolocation from photos." },
    ad: { title: "Active Directory", summary: "How a Windows domain works: DC, Kerberos, LDAP, recon and common attacks/defenses. For those who finished Windows & Networking." },
    reverse: { title: "Reverse Engineering", summary: "Analyzing Windows executables (PE), static and dynamic analysis, strings and anti-reversing. Requires basics and Windows." },
    forensics: { title: "Digital Forensics", summary: "Windows incident investigation: evidence handling, system artifacts, memory analysis. Requires Windows and Crypto." },
    phishing: { title: "Phishing Analysis", summary: "SOC-style phishing triage: attack types, email authentication (SPF/DKIM/DMARC) and header analysis. Based on real standards." },
    hardening: { title: "System Hardening", summary: "Attack-surface reduction and secure configuration by CIS Benchmarks: Windows hardening, updates and baselines." },
    blueteam: { title: "Blue Team: SOC & Response", summary: "Defense: SOC, SIEM/EDR, the NIST SP 800-61 response lifecycle, MITRE ATT&CK and the Pyramid of Pain." },
    malware: { title: "Malware Analysis Basics", summary: "Malware types and analysis approaches (static/dynamic), safe lab, behavior and persistence. Requires reverse engineering." },
  };

  // Достижения: title/desc по id
  const ACH_EN = {
    tasks_10: ["Warm-up", "Solve 10 tasks"], tasks_50: ["Grinder", "Solve 50 tasks"], tasks_100: ["Century", "Solve 100 tasks"],
    rooms_10: ["Room explorer", "Complete 10 rooms"], five_courses: ["Broad profile", "Complete 5 courses"],
    level_20: ["Veteran", "Reach level 20"], level_30: ["Elite operator", "Reach level 30"], xp_5000: ["Five thousand", "Earn 5000 XP"],
    streak_14: ["Two weeks strong", "Visit 14 days in a row"], streak_30: ["Month of discipline", "Visit 30 days in a row"],
    sniper: ["Sniper", "15 correct answers in a row"], reviewer: ["Elephant memory", "Do 25 card reviews"],
    terminal_100: ["Keyboard warrior", "Run 100 terminal commands"], lab_rat: ["Lab rat", "Complete 4 interactive labs"],
    exams_3: ["Certified", "Pass 3 exams"], red_team: ["Red Team", "Complete Web, Pentest and Active Directory"],
    blue_team: ["Blue Team", "Complete Blue Team, Forensics and Hardening"], missions_all: ["Operative", "Complete all missions"],
    night_owl: ["Night owl", "Solve a task between 00:00 and 05:00"], early_bird: ["Early bird", "Solve a task between 05:00 and 08:00"],
    notes_1: ["Note taker", "Save your first note"], notes_10: ["Top student", "Collect 10 notes"],
    polyglot: ["Bilingual", "Switch the interface language"], dark_side: ["Dark side", "Turn on dark theme"],
    first_blood: ["First Blood", "Complete your first task"],
    level_5: ["Rising Star", "Reach level 5"],
    level_10: ["Pro", "Reach level 10"],
    course_done: ["Graduate", "Finish any course completely"],
    three_courses: ["Multiclass", "Finish 3 courses"],
    streak_3: ["On a Roll", "Visit 3 days in a row"],
    streak_7: ["Unbreakable", "Visit 7 days in a row"],
    terminal_master: ["Terminal Master", "Find a hidden flag in the sandbox"],
    no_hints: ["Clear Mind", "Complete a room without hints"],
    hundred_k: ["Thousand Points", "Earn 1000 XP"],
    daily_5: ["Consistency", "Solve 5 daily challenges"],
    exam_pass: ["Examiner", "Pass a course final exam"],
    flawless: ["Flawless", "Pass an exam with 100%"],
    all_courses: ["All Courses Done", "Finish every course on the platform"],
  };

  const RANKS_EN = {
    "Новичок": "Novice", "Ученик": "Apprentice", "Скрипт-кидди": "Script Kiddie",
    "Юный аналитик": "Junior Analyst", "Аналитик SOC": "SOC Analyst",
    "Инженер по ИБ": "Security Engineer", "Специалист": "Specialist",
    "Пентестер": "Penetration Tester", "Threat Hunter": "Threat Hunter",
    "Эксперт": "Expert", "Мастер": "Master", "Хакер": "Hacker", "Элита": "Elite",
    "Магистр": "Magus", "Грандмастер": "Grandmaster", "Легенда CyberPath": "CyberPath Legend",
  };

  // Глоссарий: параллельный массив в том же порядке (term, cat, def)
  const GLOSS_EN = [
    ["CIA triad", "Basics", "Confidentiality, Integrity, Availability — the three core properties of protected information."],
    ["2FA / MFA", "Basics", "Two-/multi-factor authentication: confirming a login with several independent factors (password + code/key)."],
    ["Phishing", "Phishing", "Mass fake emails/sites to steal data. Targeted = spear phishing; against executives = whaling."],
    ["SPF", "Phishing", "Sender Policy Framework — which servers may send mail for a domain (checks the MAIL FROM envelope)."],
    ["DKIM", "Phishing", "DomainKeys Identified Mail — a cryptographic signature confirming message integrity and sender authenticity."],
    ["DMARC", "Phishing", "A policy on top of SPF/DKIM with From-domain alignment and reports. Lets you block spoofing."],
    ["Social engineering", "Basics", "Manipulating people to gain access or data (phishing, vishing, pretexting)."],
    ["SQL injection", "Web", "Injecting SQL into user input due to query concatenation. Defense — parameterized queries."],
    ["XSS", "Web", "Cross-Site Scripting — injecting JS into a page. Types: reflected, stored, DOM-based. Defense — output escaping, CSP."],
    ["IDOR", "Web", "Insecure Direct Object Reference — accessing others' objects by changing an id. A Broken Access Control category."],
    ["OWASP Top 10", "Web", "OWASP's list of the 10 most critical web app risks, updated every few years."],
    ["CSP", "Web", "Content Security Policy — a header restricting script/resource sources; mitigates XSS."],
    ["TCP/IP", "Networking", "The Internet protocol stack. TCP is reliable and connection-based (SYN/SYN-ACK/ACK); UDP is fast without guarantees."],
    ["Port", "Networking", "A service number on a host (0–65535). E.g. 22 SSH, 80 HTTP, 443 HTTPS, 53 DNS, 3389 RDP, 445 SMB."],
    ["Nmap", "Networking", "A network/port scanner. -sV service versions, -p- all ports, -sS SYN scan, -A aggressive mode."],
    ["Hash", "Crypto", "A one-way fixed-length function. SHA-256 for integrity; bcrypt/argon2/scrypt for passwords (slow, salted)."],
    ["Salt", "Crypto", "Random data added to a password before hashing — defeats rainbow tables and identical hashes."],
    ["Symmetric encryption", "Crypto", "One key for encryption and decryption (AES). Fast, but needs secure key exchange."],
    ["Asymmetric encryption", "Crypto", "A key pair: public encrypts, private decrypts (RSA, ECC). The basis of TLS."],
    ["Base64", "Crypto", "Encoding (not encryption): reversible without a key. Not protection — just a representation format."],
    ["Pentest", "Pentest", "Authorized penetration testing. Phases: recon, scanning, exploitation, post-exploitation, reporting."],
    ["Scope / RoE", "Pentest", "Test boundaries and Rules of Engagement — what may be tested and how. Without them a pentest is illegal."],
    ["Privilege Escalation", "Pentest", "Gaining higher rights in a system (privesc) — e.g. up to administrator/SYSTEM."],
    ["Active Directory", "Windows", "Microsoft's directory service. A domain controller (DC) stores the database and authenticates; Kerberos and LDAP protocols."],
    ["Kerberos", "Windows", "A ticket-based domain authentication protocol (TGT/TGS). Attack on service accounts — Kerberoasting."],
    ["UAC", "Windows", "User Account Control — a prompt to confirm actions that require administrator rights."],
    ["NTFS permissions", "Windows", "File/folder rights: (F) full, (M) modify, (RX) read+execute, (R) read, (W) write. View with icacls."],
    ["Persistence", "Malware", "Staying in the system: registry Run keys, scheduled tasks, services — to survive reboots."],
    ["C2 (C&C)", "Malware", "Command & Control — the server malware contacts for commands and to exfiltrate data."],
    ["Packing", "Malware", "Compressing/encrypting a binary to hide code; unpacked in memory at run time (UPX, etc.)."],
    ["Static analysis", "Malware", "Studying a sample without running it: strings, imports, signatures. Safe and fast for an overview."],
    ["Dynamic analysis", "Malware", "Running a sample in an isolated environment (VM/sandbox) and observing behavior: files, registry, network."],
    ["PE", "Reverse Eng", "Portable Executable — the Windows executable format (.exe/.dll). Sections .text (code), .data, import table."],
    ["Disassembler", "Reverse Eng", "A tool that recovers assembly from a binary: Ghidra, IDA, x64dbg (debugger)."],
    ["SOC", "Blue Team", "Security Operations Center — a monitoring and response team; analyst tiers L1/L2/L3."],
    ["SIEM", "Blue Team", "Security Information and Event Management — log collection, normalization and correlation, alerting."],
    ["EDR", "Blue Team", "Endpoint Detection & Response — telemetry and response on endpoints."],
    ["IOC / IOA", "Blue Team", "Indicator of Compromise (traces: hashes, IPs, domains) and Indicator of Attack (behavior). Used in detection."],
    ["MITRE ATT&CK", "Blue Team", "A knowledge base of attacker tactics and techniques. The Enterprise matrix has 14 tactics and hundreds of techniques. TTP = Tactics, Techniques, Procedures."],
    ["Pyramid of Pain", "Blue Team", "David Bianco's model (2013): the higher up the pyramid (to TTPs) defenders detect, the more painful for the attacker."],
    ["NIST SP 800-61", "Blue Team", "The incident response standard. 4 phases: preparation; detection & analysis; containment/eradication/recovery; post-incident activity."],
    ["CIS Benchmarks", "Hardening", "Consensus secure-configuration guides (OS, cloud, software). Levels: Level 1 (baseline) and Level 2 (hardened)."],
    ["Least Privilege", "Hardening", "The principle of minimal privileges: grant only the rights needed for the task."],
    ["Attack Surface", "Hardening", "The set of entry points. Hardening reduces it (disabling services, ports, features)."],
    ["Patch Management", "Hardening", "The process of applying security updates in time. Most breaches use unpatched known vulnerabilities."],
    ["OSINT", "OSINT", "Open Source Intelligence — gathering data from open sources: social media, metadata (EXIF), archives, search operators."],
    ["EXIF", "OSINT", "Metadata inside photos: camera model, date and often GPS coordinates of the shot."],
    ["Chain of custody", "Forensics", "A documented chain of evidence ownership — who handled it, when and how. Breaking it invalidates the evidence."],
    ["MFT", "Forensics", "Master File Table — the main NTFS file table with metadata and traces of deleted records."],
    ["Volatility", "Forensics", "A memory-dump analysis framework: processes, connections, injections, keys."],
  ];

  const DAILY_EN = [
    "What is the default port for HTTPS?",
    "The authentication protocol in Active Directory? (Eng.)",
    "What is the attack that injects SQL into input called? (2 words, Eng., dash or space)",
    "The cmd command to print a file's contents?",
    "Which CIA-triad property does DDoS break? (Eng.)",
    "Abbreviation for the Windows admin-rights prompt mechanism? (3 letters)",
    "The standard SSH port?",
    "Encoding reversible without a key: Base...? (number)",
    "The XSS type that is stored in the DB? (Eng.)",
    "The port-scanning utility? (Eng.)",
    "What is voice phishing called? (Eng.)",
    "The NTFS master file table (abbreviation, 3 letters)?",
    "The memory-dump analysis framework? (Eng.)",
    "The Windows executable format (abbreviation, 2 letters)?",
  ];
  // для DDoS-вопроса в EN принимаем 'availability'
  const DAILY_EXTRA_ANSWERS = { 4: ["availability", "доступность"] };

  const MISSIONS_EN = {
    m_persistence: { title: "Investigating Persistence", level: "Intermediate",
      brief: "A workstation is suspected of malware that added itself to autostart. Gather evidence and find the flag." },
    m_osint: { title: "A Forgotten Backup", level: "Beginner",
      brief: "A backup with a «hidden» string was left in Documents. Find and decode it." },
  };

  /* -------- Наложение перевода на объекты «на месте» -------- */
  let stashed = false;
  function stashRU() {
    if (stashed) return;
    COURSES.forEach((c) => { c.__ru = { title: c.title, summary: c.summary, level: c.level, tags: c.tags.slice() }; });
    GLOSSARY.forEach((g) => { g.__ru = { term: g.term, cat: g.cat, def: g.def }; });
    ACHIEVEMENTS.forEach((a) => { a.__ru = { title: a.title, desc: a.desc }; });
    RANKS.forEach((r) => { r.__ru = { name: r.name }; });
    if (typeof DAILY_QUESTIONS !== "undefined") DAILY_QUESTIONS.forEach((d) => { d.__ru = { q: d.q, answers: d.answers.slice() }; });
    if (typeof MISSIONS !== "undefined") MISSIONS.forEach((m) => { m.__ru = { title: m.title, level: m.level, brief: m.brief }; });
    stashed = true;
  }
  function toEN() {
    stashRU();
    COURSES.forEach((c) => {
      const e = COURSES_EN[c.id]; if (e) { c.title = e.title; c.summary = e.summary; }
      // level и tags НЕ трогаем (по ним ведётся группировка/фильтры) — переводим при отображении
    });
    GLOSSARY.forEach((g, i) => { const e = GLOSS_EN[i]; if (e) { g.term = e[0]; g.cat = e[1]; g.def = e[2]; } });
    ACHIEVEMENTS.forEach((a) => { const e = ACH_EN[a.id]; if (e) { a.title = e[0]; a.desc = e[1]; } });
    RANKS.forEach((r) => { r.name = RANKS_EN[r.__ru.name] || r.__ru.name; });
    if (typeof DAILY_QUESTIONS !== "undefined") DAILY_QUESTIONS.forEach((d, i) => {
      if (DAILY_EN[i]) d.q = DAILY_EN[i];
      if (DAILY_EXTRA_ANSWERS[i]) d.answers = Array.from(new Set([...(d.__ru.answers), ...DAILY_EXTRA_ANSWERS[i]]));
    });
    if (typeof MISSIONS !== "undefined") MISSIONS.forEach((m) => { const e = MISSIONS_EN[m.id]; if (e) { m.title = e.title; m.level = e.level; m.brief = e.brief; } });
  }
  function toRU() {
    if (!stashed) return;
    COURSES.forEach((c) => { if (c.__ru) { c.title = c.__ru.title; c.summary = c.__ru.summary; c.level = c.__ru.level; c.tags = c.__ru.tags.slice(); } });
    GLOSSARY.forEach((g) => { if (g.__ru) { g.term = g.__ru.term; g.cat = g.__ru.cat; g.def = g.__ru.def; } });
    ACHIEVEMENTS.forEach((a) => { if (a.__ru) { a.title = a.__ru.title; a.desc = a.__ru.desc; } });
    RANKS.forEach((r) => { if (r.__ru) r.name = r.__ru.name; });
    if (typeof DAILY_QUESTIONS !== "undefined") DAILY_QUESTIONS.forEach((d) => { if (d.__ru) { d.q = d.__ru.q; d.answers = d.__ru.answers.slice(); } });
    if (typeof MISSIONS !== "undefined") MISSIONS.forEach((m) => { if (m.__ru) { m.title = m.__ru.title; m.level = m.__ru.level; m.brief = m.__ru.brief; } });
  }

  /* -------- Статические строки в index.html (data-i18n) -------- */
  function applyStatic() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const ru = el.getAttribute("data-i18n");
      el.textContent = t(ru);
    });
  }

  function apply(l) {
    lang = l === "en" ? "en" : "ru";
    if (lang === "en") toEN(); else toRU();
    try { document.documentElement.lang = lang; } catch (e) {}
    applyStatic();
    const btn = document.getElementById("lang-toggle");
    if (btn) btn.textContent = lang === "en" ? "RU" : "EN";
  }
  function get() {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    return saved === "en" || saved === "ru" ? saved : "ru";
  }
  function set(l) {
    lang = l === "en" ? "en" : "ru";
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    apply(lang);
  }
  function toggle() { set(lang === "en" ? "ru" : "en"); }
  function current() { return lang; }
  function lvl(l) { return lang === "en" ? (LEVELS[l] || l) : l; }
  function tag(tg) { return lang === "en" ? (TAGS[tg] || tg) : tg; }

  return { t, tf, apply, set, get, toggle, current, lvl, tag };
})();
try { window.I18N = I18N; } catch (e) {}
