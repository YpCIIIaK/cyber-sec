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
    "Освоение платформы": "Platform mastery",
    "заданий выполнено": "tasks completed",
    "До звания": "To the rank",
    "курсы": "courses",
    "комнаты": "rooms",
    "лаборатории": "labs",
    "флаги": "flags",
    "экзамены": "exams",
    "Добро пожаловать": "Welcome",
    "Добро пожаловать в CyberPath!": "Welcome to CyberPath!",
    "Бесплатная платформа, где вы осваиваете кибербезопасность на практике: теория, задания, интерактивные лаборатории и флаги. Весь прогресс хранится локально в этом браузере.": "A free platform where you learn cybersecurity hands-on: theory, tasks, interactive labs and flags. All progress is stored locally in this browser.",
    "Курсы и путь": "Courses and path",
    "14 курсов от основ до продвинутого — по уровням сложности. «Путь» показывает карту с зависимостями: продвинутые курсы открываются по мере прохождения базовых.": "14 courses from basics to advanced, by difficulty. The «Path» shows a map with dependencies: advanced courses unlock as you complete the basics.",
    "Песочница и инструменты": "Sandbox and tools",
    "Учебный терминал Windows для квестов и 8 Blue Team-симуляторов (разбор писем, трафика, логов). Безопасно и на вымышленных данных.": "A training Windows terminal for quests and 8 Blue Team simulators (dissecting emails, traffic, logs). Safe, on fictional data.",
    "Флаги и достижения": "Flags and achievements",
    "Находите скрытые флаги CYBER{…} в заданиях — все они собраны на странице CTF. Зарабатывайте XP, уровни, звания и достижения.": "Find hidden CYBER{…} flags in tasks — they're all gathered on the CTF page. Earn XP, levels, ranks and achievements.",
    "Профиль и сертификаты": "Profile and certificates",
    "В профиле — ваша статистика, аналитика и сертификаты. Пройдите курс на 100% и скачайте именной сертификат, а все 14 — диплом мастера.": "Your profile has your stats, analytics and certificates. Complete a course to 100% to download a personal certificate, and all 14 for the master diploma.",
    "Пропустить": "Skip",
    "Начать обучение": "Start learning",
    "Далее": "Next",
    "Пройти тур заново": "Replay the tour",
    "Звук наград: вкл": "Reward sounds: on",
    "Звук наград: выкл": "Reward sounds: off",
    "Звук наград включён": "Reward sounds on",
    "Звук наград выключен": "Reward sounds off",
    "Готово к повторению:": "Ready to review:",
    "Повторите всё сразу или сфокусируйтесь на отдельной теме.": "Review everything at once or focus on a single topic.",
    "Повторить всё": "Review all",
    "По темам": "By topic",
    "ошибок": "errors",
    "Наверх": "Back to top",
    "Содержание": "Contents",
    "Все флаги платформы": "All platform flags",
    "CTF — флаги": "CTF — flags",
    "CTF — охота за флагами": "CTF — flag hunt",
    "Все спрятанные флаги платформы в одном месте. Найдите их все!": "Every hidden flag on the platform in one place. Find them all!",
    "Найдено флагов": "Flags found",
    "из": "of",
    "Все флаги найдены — вы настоящий охотник! 🏆": "All flags found — you're a true hunter! 🏆",
    "Флаг раскрывается после того, как вы его добудете.": "A flag is revealed once you capture it.",
    "Миссия": "Mission",
    "Мои сертификаты": "My certificates",
    "Диплом мастера": "Master diploma",
    "весь путь": "the whole path",
    "сертификат": "certificate",
    "Пройдите курс на 100%, чтобы получить сертификат. Он появится здесь для скачивания.": "Complete a course to 100% to earn a certificate. It will appear here for download.",
    "Диплом мастера CyberPath": "CyberPath Master Diploma",
    "Все курсы пройдены!": "All courses completed!",
    "Вы освоили все": "You have mastered all",
    "курсов направления. Скачайте именной диплом мастера.": "courses. Download your personal master diploma.",
    "Скачать диплом": "Download diploma",
    "Пройдите все курсы на 100%, чтобы получить именной диплом мастера.": "Complete every course to 100% to earn your personal master diploma.",
    "Завершите все курсы, чтобы получить диплом": "Complete all courses to earn the diploma",
    "Диплом мастера скачан": "Master diploma downloaded",
    "Инструмент": "Tool",
    "Симуляторы Blue Team": "Blue Team simulators",
    "Корпоративный сайт": "Corporate website",
    "Тестовый стенд": "Dev/test environment",
    "Платёжная система (PROD)": "Payment system (PROD)",
    "Сторонний SaaS (не ваш)": "Third-party SaaS (not yours)",
    "Хостинг вне диапазона": "Hosting outside the range",
    "Личный сайт сотрудника": "Employee's personal site",
    "Перед началом теста сверьтесь с договором. Отметьте ТОЛЬКО те активы, которые входят в разрешённый периметр и которые можно тестировать.": "Before starting, check the contract. Mark ONLY the assets that fall within the authorized perimeter and may be tested.",
    "Договор на тестирование — Rules of Engagement": "Engagement contract — Rules of Engagement",
    "Разрешённые домены": "Allowed domains",
    "Разрешённый диапазон IP": "Allowed IP range",
    "Окно тестирования": "Test window",
    "будни 20:00–06:00": "weekdays 20:00–06:00",
    "Исключено": "Excluded",
    "продакшн-платёжная система, сторонние сервисы, DoS, соц. инженерия": "production payment system, third-party services, DoS, social engineering",
    "Обнаруженные активы": "Discovered assets",
    "Хост": "Host",
    "Заметка": "Note",
    "Подтвердить периметр": "Confirm the perimeter",
    "Верно! В периметре только www и dev: домен *.acme-corp.com И IP из 203.0.113.0/24. Платёжный PROD исключён договором, Salesforce — чужой сервис, blog и личный сайт — вне диапазона IP. Тронуть их — выйти за рамки закона.": "Correct! Only www and dev are in scope: domain *.acme-corp.com AND an IP in 203.0.113.0/24. The payment PROD is excluded by the contract, Salesforce is a third-party service, and the blog and personal site are outside the IP range. Touching them means stepping outside the law.",
    "Неверно. Проверяйте оба условия: домен И диапазон IP, и всегда учитывайте явные исключения. Подсвечены активы, которые реально в периметре.": "Wrong. Check both conditions: domain AND IP range, and always honor explicit exclusions. The assets actually in scope are highlighted.",
    "скопировано": "copied",
    "копировать": "copy",
    "Создаёт ключ реестра HKCU\\...\\Run\\Updater": "Creates registry key HKCU\\...\\Run\\Updater",
    "Читает C:\\Windows\\win.ini": "Reads C:\\Windows\\win.ini",
    "Исходящее TCP-соединение с 185.212.47.19:443": "Outbound TCP connection to 185.212.47.19:443",
    "Внедряет код в explorer.exe (process injection)": "Injects code into explorer.exe (process injection)",
    "Создаёт временный файл %TEMP%\\~setup.tmp": "Creates temp file %TEMP%\\~setup.tmp",
    "Массово шифрует файлы в \\Users\\ (.locked)": "Mass-encrypts files in \\Users\\ (.locked)",
    "412 дн.": "412 days",
    "фев 2019": "Feb 2019",
    "28 дн.": "28 days",
    "15 дн.": "15 days",
    "9 дн.": "9 days",
    "Вы просканировали сервер в рамках аудита. Отметьте порты, которые представляют риск и должны быть закрыты или ограничены.": "You scanned a server during an audit. Mark the ports that are a risk and should be closed or restricted.",
    "Отметить рискованные порты": "Mark risky ports",
    "Верно! Telnet (23) передаёт пароли открытым текстом, SMBv1 (445) уязвим к EternalBlue, MySQL (3306) и RDP (3389) не должны смотреть в интернет. SSH, HTTP и HTTPS — в порядке.": "Correct! Telnet (23) sends passwords in clear text, SMBv1 (445) is vulnerable to EternalBlue, and MySQL (3306) and RDP (3389) shouldn't be internet-facing. SSH, HTTP and HTTPS are fine.",
    "Отмечено не всё. Рискованные порты подсвечены — сравните. HTTPS и SSH закрывать не нужно.": "Not everything is marked. The risky ports are highlighted — compare. HTTPS and SSH don't need closing.",
    "Пользователь жалуется на тормоза. Откройте Диспетчер задач и найдите подозрительный процесс, затем завершите его.": "A user reports the machine is slow. Open Task Manager, find the suspicious process and end it.",
    "Диспетчер задач": "Task Manager",
    "Процессы": "Processes",
    "Производительность": "Performance",
    "Автозагрузка": "Startup",
    "Имя": "Name",
    "ЦП": "CPU",
    "Расположение": "Path",
    "Издатель": "Publisher",
    "Процесс не выбран": "No process selected",
    "Завершить задачу": "End task",
    "Верно! <b>svch0st.exe</b> — маскировка под системный svchost: запуск из папки Temp, без цифровой подписи и 48% ЦП. Настоящий svchost живёт в System32 и подписан Microsoft.": "Correct! <b>svch0st.exe</b> impersonates the system svchost: it runs from Temp, is unsigned and uses 48% CPU. The real svchost lives in System32 and is signed by Microsoft.",
    "Это легитимный процесс. Ищите подделку: странное имя, путь в Temp, нет подписи, аномальная нагрузка.": "That's a legitimate process. Look for the fake: odd name, a Temp path, no signature, abnormal load.",
    "Вам прислали фото без подписи. Изучите EXIF-метаданные и определите, где оно снято.": "You received a photo with no caption. Inspect the EXIF metadata and work out where it was taken.",
    "Свойства — photo_4821.jpg": "Properties — photo_4821.jpg",
    "Камера": "Camera",
    "Дата съёмки": "Date taken",
    "Выдержка": "Exposure",
    "Где сделано фото?": "Where was the photo taken?",
    "Берлин, Германия": "Berlin, Germany",
    "Париж, Франция": "Paris, France",
    "Рим, Италия": "Rome, Italy",
    "Прага, Чехия": "Prague, Czechia",
    "Верно! Координаты 48.8582, 2.2945 — Эйфелева башня, Париж. GPS в EXIF часто выдаёт точное место съёмки — поэтому соцсети вырезают эти данные.": "Correct! Coordinates 48.8582, 2.2945 are the Eiffel Tower, Paris. GPS in EXIF often reveals the exact spot — which is why social networks strip it out.",
    "Не то. Вбейте координаты 48.8582, 2.2945 мысленно в карту — это известная достопримечательность.": "Not quite. Picture coordinates 48.8582, 2.2945 on a map — it's a famous landmark.",
    "Вы исследуете заражённый хост. В разделе автозапуска реестра найдите записи закрепления вредоноса.": "You're examining an infected host. In the registry autostart section, find the malware's persistence entries.",
    "Команда": "Command",
    "не подписано": "unsigned",
    "Отметить вредоносные записи": "Mark malicious entries",
    "Верно! «Updater» запускает закодированный PowerShell (-enc, hidden), а «SysMonitor» — неподписанный бинарь из AppData\\Roaming. Обе записи — закрепление вредоноса. Остальные подписаны и легитимны.": "Correct! \"Updater\" launches encoded PowerShell (-enc, hidden) and \"SysMonitor\" is an unsigned binary from AppData\\Roaming. Both are malware persistence. The rest are signed and legitimate.",
    "Отмечено не всё. Легитимные автозапуски подписаны известными вендорами; вредоносные — без подписи, из папок пользователя или с -enc PowerShell.": "Not everything is marked. Legitimate autostart entries are signed by known vendors; malicious ones are unsigned, run from user folders, or use -enc PowerShell.",
    "Образец прогнали в песочнице. Отметьте вредоносные действия в отчёте (они помечены техниками MITRE ATT&CK).": "The sample was detonated in a sandbox. Mark the malicious actions in the report (they're tagged with MITRE ATT&CK techniques).",
    "Отчёт песочницы — sample.exe": "Sandbox report — sample.exe",
    "ВЕРДИКТ": "VERDICT",
    "Поведение при запуске": "Runtime behavior",
    "Пометить вредоносное поведение": "Flag malicious behavior",
    "Верно! Закрепление в реестре (T1112), связь с C2 (T1071), инъекция в процесс (T1055) и шифрование файлов (T1486) — это рансомвар. Чтение win.ini и временный файл сами по себе безобидны.": "Correct! Registry persistence (T1112), C2 traffic (T1071), process injection (T1055) and file encryption (T1486) make this ransomware. Reading win.ini and a temp file are harmless on their own.",
    "Отмечено не всё. Вредоносные действия имеют тег MITRE ATT&CK и подсвечены — сравните.": "Not everything is marked. The malicious actions carry a MITRE ATT&CK tag and are highlighted — compare.",
    "Перехвачено зашифрованное шифром Цезаря сообщение. Подберите сдвиг, прочитайте текст и введите слово-пароль.": "An intercepted message is encrypted with a Caesar cipher. Find the shift, read the text and enter the password word.",
    "Декодер Цезаря": "Caesar decoder",
    "Сдвиг": "Shift",
    "Слово-пароль из сообщения": "Password word from the message",
    "введите слово": "enter the word",
    "Верно! Сдвиг 7 превращает шифртекст в «THE PASSWORD IS GRANITE». Шифр Цезаря ломается за 26 попыток — поэтому его не используют всерьёз.": "Correct! A shift of 7 turns the ciphertext into \"THE PASSWORD IS GRANITE\". A Caesar cipher breaks in 26 tries — which is why it's never used for real.",
    "Пока не то. Двигайте ползунок сдвига, пока текст не станет читаемым, и возьмите слово после «IS».": "Not yet. Slide the shift control until the text becomes readable, then take the word after \"IS\".",
    "Вы анализируете подозрительный бинарник. В выводе strings отметьте индикаторы компрометации (IOC), которые стоит занести в отчёт.": "You're analyzing a suspicious binary. In the strings output, mark the indicators of compromise (IOCs) worth putting in the report.",
    "Отметить IOC": "Mark IOCs",
    "Верно! C2-URL (185.212.47.19), ключ автозапуска в реестре и имя мьютекса — полезные IOC. Остальное — обычные строки из любого PE-файла (импорты, заголовок DOS, User-Agent).": "Correct! The C2 URL (185.212.47.19), the registry Run key and the mutex name are useful IOCs. The rest are ordinary strings from any PE file (imports, DOS header, User-Agent).",
    "Отмечено не всё. IOC — это сетевые адреса, пути закрепления и уникальные маркеры; стандартные строки PE не в счёт.": "Not everything is marked. IOCs are network addresses, persistence paths and unique markers; standard PE strings don't count.",
    "Аудит безопасности домена. Найдите сервисные учётки, уязвимые к Kerberoasting (есть SPN + слабое шифрование RC4 + старый пароль), которые нужно усилить.": "Domain security audit. Find the service accounts vulnerable to Kerberoasting (have an SPN + weak RC4 encryption + an old password) that need hardening.",
    "Сервисные учётки": "Service accounts",
    "Учётка": "Account",
    "Пароль задан": "Password set",
    "Шифрование": "Encryption",
    "Отметить уязвимые учётки": "Mark vulnerable accounts",
    "Верно! svc_sql и svc_web имеют SPN, слабое RC4 и древние пароли — их Kerberos-билет можно выгрузить и брутфорсить офлайн. Защита: длинные пароли (25+), gMSA и AES. Учётки без SPN или на AES — не роастятся.": "Correct! svc_sql and svc_web have an SPN, weak RC4 and ancient passwords — their Kerberos ticket can be dumped and brute-forced offline. Defense: long passwords (25+), gMSA and AES. Accounts without an SPN or on AES can't be roasted.",
    "Отмечено не всё. Под Kerberoasting попадают только учётки с SPN и слабым шифрованием/старым паролем. AES-учётки и обычные пользователи без SPN не уязвимы.": "Not everything is marked. Only accounts with an SPN and weak encryption / an old password are Kerberoastable. AES accounts and regular users without an SPN aren't vulnerable.",
    "Сбербанк Безопасность": "SecureBank Security",
    "Брандмауэр Windows": "Windows Firewall",
    "Фильтрация входящих/исходящих подключений": "Filtering of inbound/outbound connections",
    "Шифрование диска BitLocker": "BitLocker drive encryption",
    "Защита данных при краже устройства": "Protects data if the device is stolen",
    "Защита от эксплойтов (SmartScreen)": "Exploit protection (SmartScreen)",
    "Блокировка подозрительных приложений": "Blocks suspicious applications",
    "LAPS — уникальные пароли админа": "LAPS — unique admin passwords",
    "Разные пароли локального админа на каждом ПК": "Different local-admin password on every PC",
    "Протокол SMBv1": "SMBv1 protocol",
    "Устаревший, уязвим к EternalBlue": "Legacy, vulnerable to EternalBlue",
    "Все пользователи — администраторы": "All users are administrators",
    "Убирает разделение прав": "Removes privilege separation",
    // Реалистичные лаборатории
    "Вы регистрируетесь на сайте. Придумайте по-настоящему надёжный пароль — форма примет только сильный.": "You're signing up on a website. Create a genuinely strong password — the form only accepts a strong one.",
    "Создание аккаунта": "Create account",
    "Электронная почта": "Email",
    "Пароль": "Password",
    "Введите пароль…": "Enter a password…",
    "Показать пароль": "Show password",
    "Надёжность": "Strength",
    "не меньше 12 символов": "at least 12 characters",
    "строчные и ЗАГЛАВНЫЕ буквы": "lower- and UPPERCASE letters",
    "хотя бы одна цифра": "at least one digit",
    "хотя бы один спецсимвол": "at least one special character",
    "не из списка популярных паролей": "not a common password",
    "Зарегистрироваться": "Sign up",
    "Аккаунт создан! Такой пароль практически не перебрать: длина + разные символы + уникальность решают.": "Account created! A password like this is practically unbruteforceable: length + varied symbols + uniqueness are what matter.",
    "очень слабый": "very weak",
    "слабый": "weak",
    "средний": "medium",
    "хороший": "good",
    "отличный": "excellent",
    "Перед вами реальная на вид панель администратора. Пароля вы не знаете — войдите как admin через SQL-инъекцию в поле пароля.": "Here's a real-looking admin panel. You don't know the password — log in as admin via SQL injection in the password field.",
    "Вход для сотрудников": "Staff sign-in",
    "Логин": "Login",
    "только для авторизованного персонала": "authorized personnel only",
    "Что сервер подставит в запрос к базе": "What the server will put into the database query",
    "Подсказка": "Hint",
    "Введите в поле пароля:": "Type into the password field:",
    "кавычка закрывает строку, а OR '1'='1' делает условие всегда истинным.": "the quote closes the string, and OR '1'='1' makes the condition always true.",
    "Неверный логин или пароль": "Invalid login or password",
    "Вы внутри! Условие <code>OR '1'='1'</code> стало всегда истинным, и база вернула первую строку — учётку admin. Защита: параметризованные запросы (prepared statements).": "You're in! The <code>OR '1'='1'</code> condition became always true, and the database returned the first row — the admin account. Defense: parameterized queries (prepared statements).",
    "Обзор": "Overview",
    "Пользователи": "Users",
    "Журналы": "Logs",
    "Настройки": "Settings",
    "Панель администратора": "Admin panel",
    "пользователей": "users",
    "админов": "admins",
    "активных сессий": "active sessions",
    "Роль": "Role",
    "Блог выводит комментарии без экранирования. Внедрите скрипт, который на уязвимом сайте выполнил бы alert().": "The blog renders comments without escaping. Inject a script that on a vulnerable site would run alert().",
    "10 советов по безопасности в сети": "10 online security tips",
    "Опубликовано 29 сен · 4 мин чтения": "Published Sep 29 · 4 min read",
    "Спасибо, что дочитали! Делитесь мыслями в комментариях ниже.": "Thanks for reading! Share your thoughts in the comments below.",
    "Аноним": "Anonymous",
    "Вы": "You",
    "Отличная статья, спасибо!": "Great article, thanks!",
    "Добавьте про менеджеры паролей 👍": "Add something about password managers 👍",
    "Отправить": "Send",
    "сообщает": "says",
    "Скрипт «выполнился» и вызвал alert(). На настоящем сайте так крадут cookie и сессии. Защита: экранирование вывода + заголовок CSP.": "The script \"ran\" and triggered alert(). On a real site this is how cookies and sessions get stolen. Defense: output escaping + a CSP header.",
    "Это отобразилось как обычный текст — инъекции не вышло. Попробуйте тег <script> или атрибут onerror у <img>.": "That rendered as plain text — no injection. Try a <script> tag or an onerror attribute on <img>.",
    "Письмо попало в карантин SOC. Откройте технические заголовки и отметьте все красные флаги.": "The email landed in the SOC quarantine. Open the technical headers and mark every red flag.",
    "Карантин": "Quarantine",
    "Входящие": "Inbox",
    "Спам": "Spam",
    "Отправленные": "Sent",
    "Срочно! Ваш счёт заблокирован": "Urgent! Your account is blocked",
    "кому: вы · 29 сен, 06:14": "to: you · Sep 29, 06:14",
    "возможный фишинг": "possible phishing",
    "Уважаемый клиент! Мы заблокировали ваш счёт из-за подозрительной активности.": "Dear customer! We've blocked your account due to suspicious activity.",
    "Чтобы разблокировать, подтвердите данные в течение 24 часов:": "To unblock it, confirm your details within 24 hours:",
    "Показать оригинал (заголовки)": "Show original (headers)",
    "Ссылка в теле:": "Link in body:",
    "Подтвердить флаги": "Confirm flags",
    "Все флаги найдены: домен-двойник в From, чужой Return-Path, Reply-To на левый домен, проваленные SPF/DKIM/DMARC и фишинговая ссылка.": "All flags found: look-alike domain in From, mismatched Return-Path, Reply-To on a foreign domain, failed SPF/DKIM/DMARC and the phishing link.",
    "Отмечено не всё. Настоящие красные флаги подсвечены — сравните и попробуйте снова.": "Not everything is marked. The real red flags are highlighted — compare and try again.",
    "Настройте безопасную конфигурацию рабочей станции: включите защитные меры и выключите опасные.": "Configure a secure workstation: enable protective measures and disable the dangerous ones.",
    "Безопасность Windows": "Windows Security",
    "Защита устройства": "Device protection",
    "Проверьте параметры ниже": "Check the settings below",
    "Применить конфигурацию": "Apply configuration",
    "Устройство защищено": "Device protected",
    "Есть риски": "Risks present",
    "Устройство защищено! Включены брандмауэр, BitLocker, SmartScreen и LAPS; SMBv1 и общие админ-права — отключены.": "Device protected! Firewall, BitLocker, SmartScreen and LAPS are on; SMBv1 and shared admin rights are off.",
    "Конфигурация небезопасна. Включите только защитные меры и отключите опасные (SMBv1, общие админ-права).": "The configuration is insecure. Enable only protective measures and disable the dangerous ones (SMBv1, shared admin rights).",
    "Вы дежурный аналитик SOC. Проведите триаж потока событий и отметьте строки, входящие в цепочку атаки.": "You're the on-duty SOC analyst. Triage the event stream and mark the rows that are part of the attack chain.",
    "Живой поток событий": "Live event stream",
    "Подключено": "Connected",
    "событий": "events",
    "инфо": "info",
    "предупр.": "warn",
    "критично": "critical",
    "Время": "Time",
    "Источник": "Source",
    "Событие": "Event",
    "Уровень": "Severity",
    "Открыть инцидент": "Open incident",
    "Инцидент собран верно: брутфорс admin → успешный вход с того же чужого IP → запуск -enc PowerShell → установка службы для закрепления. Полная цепочка атаки.": "Incident assembled correctly: admin brute-force → successful login from the same foreign IP → -enc PowerShell execution → service installed for persistence. The full attack chain.",
    "В инцидент попало не всё. Строки цепочки атаки подсвечены — сравните.": "Not everything made it into the incident. The attack-chain rows are highlighted — compare.",
    "Небезопасное соединение": "Insecure connection",
    "Войти": "Sign in",
    // Шапка, меню профиля, послужной список
    "Меню профиля": "Profile menu", "Светлая тема": "Light theme", "Тёмная тема": "Dark theme",
    "Сертификат скачан": "Certificate downloaded", "Послужной список": "Service record", "В CyberPath с": "On CyberPath since",
    "комнат пройдено": "rooms completed", "лабораторных": "labs", "экзаменов сдано": "exams passed", "CTF-миссий": "CTF missions",
    "расследований Blue Team": "Blue Team investigations", "флагов найдено": "flags found", "команд в терминале": "terminal commands",
    "лучшее комбо": "best combo", "Сильные стороны": "Strengths", "Ближайшие цели": "Next goals", "Все цели достигнуты": "All goals reached",
    "Последние достижения": "Recent achievements", "расследований": "investigations", "флагов": "flags",
    // Инструменты Blue Team
    "Инструменты": "Tools", "Инструменты Blue Team": "Blue Team toolkit", "Открыть": "Open",
    "Безопасные учебные симуляторы на вымышленных данных: разбор писем, журналов, трафика, процессов и инцидентов. Решайте задания — получайте XP.":
      "Safe training simulators on fictional data: dissect emails, logs, traffic, processes and incidents. Solve tasks to earn XP.",
    "Инструменты недоступны.": "Tools are unavailable.",
    "Образец": "Sample", "Свой текст": "Custom text", "Разобрать": "Analyze", "Проверить": "Check",
    "Порядок триажа: сначала Authentication-Results, затем сверьте From / Return-Path / Reply-To.":
      "Triage order: Authentication-Results first, then compare From / Return-Path / Reply-To.",
    "Задание": "Task", "Решено": "Solved", "Разобрать": "Analyze", "Вердикт": "Verdict",
    "Красных флагов не обнаружено.": "No red flags found.",
    "Разберите все три образца. Для какого из них вердикт — «пройдено» (не фишинг)?":
      "Analyze all three samples. Which one gets a “pass” verdict (not phishing)?",
    "Верно! Рассылка GitHub проходит SPF, DKIM и DMARC.": "Correct! The GitHub newsletter passes SPF, DKIM and DMARC.",
    "Нет. Разберите Authentication-Results этого образца ещё раз.": "No. Re-read this sample's Authentication-Results.",
    "Фильтр": "Filter", "Все": "All", "отказы": "failures", "входы": "logons", "критичные": "critical",
    "Время": "Time", "Уровень": "Level", "Описание": "Description", "Учётка": "Account",
    "С какого IP велась атака перебором пароля (brute-force), которая завершилась успешным входом?":
      "Which IP ran the password brute-force that ended in a successful logon?",
    "Подсказка: ищите серию 4625 подряд, за которой идёт 4624 с той же учётки и IP, ночью.":
      "Hint: look for a run of 4625 followed by a 4624 from the same account and IP, at night.",
    "Верно! Серия 4625 → 4624 → 4672 → 4688 указывает на успешный перебор и повышение привилегий.":
      "Correct! The 4625 → 4624 → 4672 → 4688 chain shows a successful brute-force and privilege escalation.",
    "Неверно. Отфильтруйте 4625 и посмотрите повторяющийся IP ночью.": "Wrong. Filter 4625 and look for the repeated IP at night.",
    "Протокол": "Protocol", "Источник": "Source", "Назначение": "Destination",
    "Хост обращается к одному адресу через равные промежутки (~60 с) с одинаковым запросом. Это «маяк» (beacon) C2. Назовите IP управляющего сервера.":
      "A host contacts one address at even intervals (~60s) with the same request. That's a C2 beacon. Name the control server IP.",
    "Признак beaconing: повторяющиеся запросы к /gate.php с одинаковым размером ответа и ровным интервалом.":
      "Beaconing sign: repeated /gate.php requests with constant response size and a fixed interval.",
    "Верно! Регулярные GET /gate.php — классический HTTP-beacon к C2.": "Correct! Regular GET /gate.php is a classic HTTP beacon to C2.",
    "Неверно. Отфильтруйте HTTP и найдите повторяющийся адрес.": "Wrong. Filter HTTP and find the repeating address.",
    "Процессы": "Processes", "Автозапуск": "Autoruns", "Имя": "Name", "Путь": "Path", "Родитель": "Parent",
    "Подпись": "Signed", "да": "yes", "нет": "no", "Пометить": "Flag", "Ключ реестра": "Registry key", "Команда": "Command",
    "Кликните строку автозапуска, которая закрепляет вредонос.": "Click the autorun entry that provides persistence.",
    "Пометьте вредоносный процесс (кнопка «Пометить») и выберите вредоносную запись автозапуска.":
      "Flag the malicious process (the “Flag” button) and select the malicious autorun entry.",
    "Признаки: имя-двойник (svch0st), путь в AppData, запуск из PowerShell, нет подписи, скрытая -enc команда.":
      "Clues: look-alike name (svch0st), AppData path, launched from PowerShell, unsigned, hidden -enc command.",
    "Политика": "Policy",
    "Нужен доступ сотрудников в интернет по HTTPS и удалённый доступ по RDP только через VPN. Из интернета ничего лишнего. Отметьте правила, которые должны войти в набор.":
      "Staff need HTTPS outbound and RDP only via VPN. Nothing extra from the internet. Tick the rules that belong in the set.",
    "Проверить набор": "Check ruleset", "Ошибок": "Errors",
    "Идеально! Минимум доступа + default deny.": "Perfect! Least access + default deny.",
    "Подумайте: открытый из интернета RDP и any/any опасны, а default deny обязателен.":
      "Think: internet-exposed RDP and any/any are dangerous, and default deny is a must.",
    "Выберите технику в матрице, чтобы увидеть идею обнаружения.": "Pick a technique in the matrix to see a detection idea.",
    "Тактика": "Tactic", "Как обнаружить": "How to detect",
    "Сценарий": "Scenario", "Шаг": "Step", "шагов": "steps", "Разобрано": "Solved", "Верно": "Correct",
    "Рабочая станция WIN-7F3A ведёт себя странно. Соберите цепочку атаки, отвечая на вопросы по шагам. Используйте другие инструменты как улики.":
      "Workstation WIN-7F3A is behaving oddly. Reconstruct the attack chain step by step. Use the other tools as evidence.",
    "Нет, сверьтесь с матрицей ATT&CK.": "No, check against the ATT&CK matrix.",
    // Флаг-квесты и декодер
    "Квест: найдите флаг": "Quest: find the flag", "Флаг найден": "Flag found", "Флаг": "Flag",
    "Найдите скрытый флаг формата": "Find the hidden flag in the format",
    "Сдать флаг": "Submit flag", "Введите флаг": "Enter the flag", "Верно!": "Correct!",
    "Неверный флаг. Проверьте формат CYBER{...} и декодирование.": "Wrong flag. Check the CYBER{...} format and your decoding.",
    "Задание решено — флаг раскрыт, сдайте его.": "Task solved — the flag is revealed, submit it.",
    "Разберите все образцы. Для какого из них вердикт — «пройдено» (не фишинг)?":
      "Analyze all samples. Which one gets a “pass” verdict (not phishing)?",
    "Операция": "Operation", "Ввод": "Input", "Результат": "Result", "Вставьте строку…": "Paste a string…",
    "Подсказка: спрятанные в инструментах флаги закодированы в Base64 — вставьте их сюда и выберите «Base64 → текст».":
      "Hint: the flags hidden in the tools are Base64-encoded — paste them here and pick “Base64 → text”.",
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
    "По уровням сложности": "By difficulty", "Фундамент": "Foundation", "Инфраструктура": "Infrastructure", "Анализ ПО": "Malware & RE",
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
    "XP по неделям": "XP per week", "XP по дням": "XP per day", "Недели": "Weeks", "Дни": "Days", "Период": "Period",
    "Радар навыков": "Skill radar",
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
"Боссфайт": "Boss fight",
    "Боссфайт курса": "Course boss fight",
    "6 вопросов, 8 минут, без подсказок. Проверьте себя до конца курса.": "6 questions, 8 minutes, no hints. Test yourself before finishing the course.",
    "Рекорд": "Best",
    "В бой": "Fight",
    "Недельный ивент": "Weekly event",
    "CTF недели": "Weekly CTF",
    "вопросов из всех курсов": "questions from all courses",
    "Набор вопросов одинаковый всю неделю и меняется каждый понедельник. Очки = верные ответы × 100 + бонус за скорость.": "The question set stays the same all week and changes every Monday. Score = correct × 100 + speed bonus.",
    "ваш рекорд недели": "your weekly best",
    "Улучшить результат": "Beat your score",
    "Участвовать": "Join",
    "Вопрос": "Question",
    "Ответить": "Answer",
    "Пропустить": "Skip",
    "Босс повержен!": "Boss defeated!",
    "Зачёт недели!": "Weekly passed!",
    "Время вышло": "Time is up",
    "Не хватило совсем немного": "So close",
    "верно": "correct",
    "время": "time",
    "очки": "score",
    "рекорд": "best",
    "за первое прохождение": "for the first clear",
    "Для зачёта нужно": "To pass you need",
    "Разбор ответов": "Answer review",
    "Ваш ответ": "Your answer",
    "Ещё раз": "Try again",
    "К курсу": "To course",
    "На главную": "Home",
    "Ваши попытки": "Your attempts",
    "Дата": "Date",
    "Верно": "Correct",
    "Время": "Time",
    "Очки": "Score",
    "вопросов": "questions",
    "из этого курса": "from this course",
    "из всех курсов": "from all courses",
    "мин": "min",
    "на всё": "total",
    "Без подсказок и без повторной попытки": "No hints, no retries",
    "Зачёт": "Pass",
    "первое прохождение": "first clear",
    "В этом курсе мало подходящих вопросов — их будет": "This course has few suitable questions — you will get",
    "Начать": "Start",
    "Испытание на время по материалу курса. Вопросы каждый раз разные.": "A timed challenge on the course material. Questions differ each time.",
    "Один набор вопросов на всю неделю — улучшайте свой рекорд. До смены набора": "One question set for the whole week — beat your record. Next set in",
    "дн.": "d",
    "курс пройден на": "course progress",
    "Решено сегодня! Возвращайтесь завтра за новым заданием. Решено всего:": "Solved today! Come back tomorrow for a new one. Total solved:",
    "Ваш уровень и опыт": "Your level and XP",
    "Серия дней подряд": "Day streak",
    "Решается в песочнице": "Solved in the sandbox",
    "песочница": "sandbox",
    "— выбрать —": "— choose —",
    "н": "w", "д": "d",
    "Перенос прогресса": "Transfer progress",
    "Прогресс хранится локально в этом браузере. Скачайте файл, чтобы перенести его на другое устройство или сделать резервную копию.": "Progress is stored locally in this browser. Download a file to move it to another device or keep a backup.",
    "Удалит весь локальный прогресс без возможности восстановления.": "Deletes all local progress permanently.",
    "Курс пройден": "Course completed",
    "Вы завершили курс": "You completed",
    "и заработали": "and earned",
    "Экзамен сдан на": "Exam passed with",
    "заблокировано": "locked",
    "Курсы выстроены по сложности: продвинутые открываются по мере прохождения предыдущих. Ваше звание —": "Courses are ordered by difficulty: advanced ones unlock as you complete the previous ones. Your rank —",
    "Этот курс уровня": "This",
    "откроется, когда вы завершите предыдущие. Так сложность растёт постепенно.": "level course unlocks once you finish the previous ones, so difficulty grows gradually.",
    "Нужно пройти на 100%:": "Complete 100% of:",
    "Открыть": "Open",
    "Переключить cmd / PowerShell": "Switch cmd / PowerShell",
    "help — все команды": "help — all commands",
    "dir / type — файлы": "dir / type — files",
    "findstr CYBER файл": "findstr CYBER file",
    "reg query …Run — реестр": "reg query …Run — registry",
    "Tab — автодополнение": "Tab — autocomplete",
    "Многошаговые сценарии: выполняйте команды в терминале выше, находите флаг и вводите его здесь.": "Multi-step scenarios: run commands in the terminal above, find the flag and submit it here.",
    "определений ключевых понятий кибербезопасности — по реальным стандартам.": "definitions of key cybersecurity terms — based on real standards.",
    "Ответьте на": "Answer",
    "вопросов. Порог сдачи — 80%.": "questions. Pass mark — 80%.",
    "Лучший результат:": "Best result:",
    "Интервальное повторение слабых тем — как флеш-карты Anki.": "Spaced repetition of weak topics — like Anki flashcards.",
    "Вы разобрали все карточки, готовые к повторению. Возвращайтесь завтра — система напомнит нужное.": "You reviewed all due cards. Come back tomorrow — the system will remind you.",
    "Решайте задания в курсах — вопросы с ответами станут карточками и будут возвращаться на повторение через растущие интервалы.": "Solve course tasks — questions become cards and return for review at growing intervals.",
    "Всего карточек в колоде:": "Cards in deck:",
    "— учись этично, применяй ответственно.": "— learn ethically, apply responsibly.",
    "Все материалы носят образовательный характер. Тестируйте только свои системы или площадки с разрешением. Прогресс хранится локально в вашем браузере.": "All materials are for education. Test only your own systems or platforms you have permission for. Progress is stored locally in your browser.",
    "Язык / Language": "Language / Язык",
    "Теория": "Theory",
    "Уже что-то знаете?": "Already know some basics?",
    "Пройдите тест уровня за 1 минуту": "Take the 1-minute level test",
    "откроем подходящие курсы сразу.": "we'll unlock matching courses right away.",
    "Ничего не найдено": "Nothing found",
    "Попробуйте изменить запрос или фильтр.": "Try changing the query or filter.",
    "Сбросить фильтры": "Reset filters",
    "Сортировка": "Sort",
    "Команда терминала": "Terminal command",
    "Термин не найден": "Term not found",
    "Проверьте написание или поищите по-английски — многие термины пишутся латиницей.": "Check the spelling or try the English term.",
    "Очистить поиск": "Clear search",
    "Вам пришло письмо «Ваш аккаунт заблокирован, срочно войдите по ссылке». Что это скорее всего?": "You get an email: “Your account is locked, log in via this link urgently”. What is it most likely?",
    "Фишинг": "Phishing",
    "Обновление системы": "A system update",
    "Спам-фильтр": "A spam filter",
    "Резервная копия": "A backup",
    "Какой порт по умолчанию использует HTTPS?": "Which port does HTTPS use by default?",
    "Чем хеширование отличается от шифрования?": "How is hashing different from encryption?",
    "Хеш нельзя обратить в исходные данные": "A hash can't be reversed into the original data",
    "Хеш всегда длиннее данных": "A hash is always longer than the data",
    "Хеширование требует ключ": "Hashing requires a key",
    "Ничем, это синонимы": "No difference, they're synonyms",
    "Что делает команда nmap -sV?": "What does nmap -sV do?",
    "Определяет версии сервисов на открытых портах": "Detects service versions on open ports",
    "Включает VPN": "Turns on a VPN",
    "Проверяет орфографию": "Checks spelling",
    "Удаляет вирусы": "Removes viruses",
    "Какой ввод — классический пример SQL-инъекции?": "Which input is a classic SQL injection example?",
    "Что такое Kerberoasting?": "What is Kerberoasting?",
    "Офлайн-подбор паролей сервисных учёток AD по TGS-билетам": "Offline cracking of AD service account passwords from TGS tickets",
    "Перегрев сервера": "Server overheating",
    "DDoS на DNS": "A DDoS on DNS",
    "Шифрование диска": "Disk encryption",
    "Тест уровня": "Level test",
    "С чего начать?": "Where to start?",
    "6 коротких вопросов — подберём стартовый курс. Не знаете ответ — выбирайте «Не знаю», это нормально.": "6 short questions to pick your starting course. Don't know an answer? Choose “I don't know” — that's fine.",
    "Не знаю": "I don't know",
    "Отличная точка старта! Начните с основ — дальше курсы будут открываться по мере прохождения.": "A great starting point! Begin with the fundamentals — more courses unlock as you progress.",
    "У вас уже есть база. Курсы среднего уровня открыты сразу — можно не проходить основы.": "You already have a foundation. Intermediate courses are unlocked right away — no need to do the basics.",
    "Впечатляет! Открыты все курсы, включая продвинутые. Начните с того, что интереснее.": "Impressive! All courses are unlocked, including advanced ones. Start with whatever interests you most.",
    "Ваш уровень:": "Your level:",
    "Рекомендуем начать с": "We recommend starting with",
    "комн.": "rooms",
    "Ко всем курсам": "All courses",
    "бесплатная платформа по кибербезопасности": "free cybersecurity learning platform",
    "Комната не найдена": "Room not found",
    "Страница не найдена": "Page not found",
    "Возможно, ссылка устарела или в ней опечатка. Даже лучшие разведчики иногда упираются в тупик.": "The link may be outdated or mistyped. Even the best recon hits a dead end sometimes.",
    "Поиск": "Search",
    "В заметках нет совпадений с запросом.": "No notes match your query.",
    "Начать с основ": "Start with the basics",
    "Определить мой уровень": "Find my level",
    "К курсу": "Back to course",
    "На главную": "Home",
    "Каталог курсов": "Course catalog",
    "О проекте": "About",
    "Этичный хакинг": "Ethical hacking",
    "Конфиденциальность": "Privacy",
    "Лицензия": "License",
    "Код — MIT, контент — CC BY-NC-SA 4.0": "Code — MIT, content — CC BY-NC-SA 4.0",
    "Быстрый переход — Ctrl/⌘ + K": "Quick jump — Ctrl/⌘ + K",
    "Светлая / тёмная тема": "Light / dark theme",
    "Редактировать профиль": "Edit profile",
    "Ник": "Nickname",
    "Например, NightOwl": "e.g. NightOwl",
    "Статус": "Status",
    "Пара слов о себе или цели": "A few words about you or your goal",
    "Аватар": "Avatar",
    "Готовые": "Presets",
    "Свой эмодзи": "Custom emoji",
    "Загрузить": "Upload",
    "Фон аватара": "Avatar background",
    "Обводка": "Ring",
    "По лиге звания": "Match rank league",
    "Витрина достижений": "Achievement showcase",
    "до 3": "up to 3",
    "Получите первые достижения — их можно будет показать здесь.": "Earn your first achievements to show them here.",
    "Отмена": "Cancel",
    "Сохранить": "Save",
    "Вставьте любой эмодзи или 1–2 символа (например, инициалы).": "Paste any emoji or 1–2 characters (e.g. initials).",
    "Выбрать изображение": "Choose image",
    "PNG/JPG/WebP до 5 МБ. Картинка обрежется до квадрата и сожмётся, хранится только в этом браузере.": "PNG/JPG/WebP up to 5 MB. The image is cropped to a square and compressed; it's stored only in this browser.",
    "Нужен файл изображения": "An image file is required",
    "Файл больше 5 МБ": "The file is larger than 5 MB",
    "Не удалось прочитать изображение": "Couldn't read the image",
    "Можно выбрать не больше трёх": "You can pick up to three",
    "Профиль сохранён": "Profile saved",
    "Мой прогресс в кибербезопасности": "My cybersecurity progress",
    "Мой прогресс в CyberPath": "My progress on CyberPath",
    "Карточка профиля скачана": "Profile card downloaded",
    "Бесплатная платформа · учись этично, применяй ответственно": "Free platform · learn ethically, apply responsibly",
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
    rooms_10: ["Room explorer", "Complete 10 rooms"], rooms_30: ["Cartographer", "Complete 30 rooms"],
    tasks_250: ["Erudite", "Solve 250 tasks"], labs_all: ["Lab master", "Complete 14 interactive labs"], five_courses: ["Broad profile", "Complete 5 courses"],
    level_20: ["Veteran", "Reach level 20"], level_30: ["Elite operator", "Reach level 30"], xp_5000: ["Five thousand", "Earn 5000 XP"],
    streak_14: ["Two weeks strong", "Visit 14 days in a row"], streak_30: ["Month of discipline", "Visit 30 days in a row"],
    sniper: ["Sniper", "15 correct answers in a row"], reviewer: ["Elephant memory", "Do 25 card reviews"],
    terminal_100: ["Keyboard warrior", "Run 100 terminal commands"], lab_rat: ["Lab rat", "Complete 4 interactive labs"],
    exams_3: ["Certified", "Pass 3 exams"], red_team: ["Red Team", "Complete Web, Pentest and Active Directory"],
    blue_team: ["Blue Team", "Complete Blue Team, Forensics and Hardening"], missions_all: ["Operative", "Complete all missions"],
    night_owl: ["Night owl", "Solve a task between 00:00 and 05:00"], early_bird: ["Early bird", "Solve a task between 05:00 and 08:00"],
    boss_first: ["Boss slayer", "Clear your first course boss fight"], boss_5: ["Boss hunter", "Clear boss fights in 5 courses"],
    boss_perfect: ["Flawless victory", "Clear a boss fight with no mistakes"], weekly_first: ["Event participant", "Pass the weekly CTF"],
    profile_custom: ["Your own face", "Set a nickname or avatar"],
    notes_1: ["Note taker", "Save your first note"], notes_10: ["Top student", "Collect 10 notes"],
    polyglot: ["Bilingual", "Switch the interface language"], dark_side: ["Dark side", "Turn on dark theme"],
    tools_1: ["Analyst", "Solve your first Blue Team tool task"], tools_all: ["Debrief", "Solve a task in every Blue Team tool"],
    flag_1: ["First flag", "Find your first flag in the Blue Team tools"], flag_all: ["Flag hunter", "Find every flag in the Blue Team tools"],
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
    ["STRIDE", "Basics", "Microsoft's mnemonic for threat types: Spoofing, Tampering, Repudiation, Information disclosure, DoS, Elevation of privilege."],
    ["Risk", "Basics", "Risk = Likelihood × Impact. Helps prioritize defense: close first what has the larger product."],
    ["Defense in depth", "Basics", "Multiple independent layers of protection: breaching one barrier, the attacker meets the next."],
    ["Credential stuffing", "Basics", "Reusing leaked login/password pairs on other sites. Defense — a unique password per site and MFA."],
    ["CSRF", "Web", "Cross-Site Request Forgery — a foreign site makes your browser send a request where you're logged in. Defense: CSRF token, SameSite."],
    ["SSRF", "Web", "Server-Side Request Forgery — the server is made to send requests on its own behalf (to internal services, cloud metadata)."],
    ["Prepared statements", "Web", "Parameterized queries: SQL data and code are strictly separated. The main defense against SQL injection."],
    ["Session / Cookie", "Web", "A session is how a site \"remembers\" a login; usually a cookie with a random ID. HttpOnly, Secure, SameSite flags protect it."],
    ["WHOIS", "Pentest", "A query about a domain owner: who registered it, dates, contacts. A passive-recon tool."],
    ["DNS", "Networking", "Domain Name System — translates names (example.com) into IPs. Faking the reply (DNS spoofing) leads to a fake site."],
    ["MITM", "Networking", "Man-in-the-Middle — the attacker stands between client and server, reading/altering traffic. Defense: HTTPS/VPN."],
    ["ARP spoofing", "Networking", "Faking ARP replies on a LAN to redirect a victim's traffic to yourself (the basis of LAN MITM)."],
    ["Wireshark", "Networking", "A graphical network-traffic analyzer: packet dissection by protocol. Console counterpart — tcpdump."],
    ["Firewall", "Networking", "Allows only permitted ports/directions of traffic. A basic line of network defense."],
    ["VPN", "Networking", "Virtual Private Network — an encrypted tunnel over an untrusted network. Makes interception pointless."],
    ["IDS / IPS", "Networking", "Intrusion Detection / Prevention Systems: catch and (IPS) block anomalies and attacks in traffic."],
    ["HMAC", "Crypto", "Hash-based MAC — a hash with a secret key. Confirms both integrity and authenticity (API signatures, JWT)."],
    ["TLS", "Crypto", "Transport Layer Security — encrypts the HTTPS connection (replaced SSL). A hybrid of asymmetry (key exchange) and symmetry (AES)."],
    ["PKI / CA", "Crypto", "Public Key Infrastructure: Certificate Authorities (CA) sign certificates the browser trusts."],
    ["Digital signature", "Crypto", "A message hash encrypted with the private key. Verified with the public: confirms authenticity and integrity."],
    ["CVE", "Pentest", "Common Vulnerabilities and Exposures — a public vulnerability identifier like CVE-2021-44228."],
    ["CVSS", "Pentest", "Common Vulnerability Scoring System — a 0–10 severity score for prioritization."],
    ["Bug Bounty", "Pentest", "A program where a company officially pays for found vulnerabilities (HackerOne, Bugcrowd). A legal way to practice."],
    ["Kerberoasting", "Windows", "Requesting a TGS ticket for a service account (with an SPN) and brute-forcing its password offline. Defense: long passwords, gMSA, AES."],
    ["Pass-the-Hash", "Windows", "Reusing a stolen NTLM hash without knowing the password. Defense: LAPS, Credential Guard, disabling NTLM."],
    ["LAPS", "Hardening", "Local Administrator Password Solution — unique random local-admin passwords on every machine."],
    ["Ransomware", "Malware", "Encrypting malware: encrypts files and demands a ransom. Defense: backups, segmentation, fast containment."],
    ["RAT", "Malware", "Remote Access Trojan — a trojan giving full remote control of an infected machine."],
    ["Beaconing", "Malware", "Periodic identical calls from malware to its C2 server. A visible pattern for SIEM even when encrypted."],
    ["VirusTotal", "Malware", "A service checking a file/hash/URL with dozens of antiviruses at once. Caution: uploads become public."],
    ["Threat Hunting", "Blue Team", "Proactive search for threats automated alerts missed. The work of L3 analysts."],
    ["BEC", "Phishing", "Business Email Compromise — a fake email \"from the boss/partner\" asking for an urgent transfer or changed details."],
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
    "The attack forcing your browser to send a request to a site you're logged into? (abbr., 4 letters)",
    "The attack where the server is made to send requests on its own behalf? (abbr., 4 letters)",
    "The system scoring a vulnerability's severity 0–10? (abbr., 4 letters)",
    "The public vulnerability identifier like ...-2021-44228? (abbr., 3 letters)",
    "The attack requesting a TGS and cracking service-account passwords offline? (Eng.)",
    "The Windows unique local-admin password solution? (abbr., 4 letters)",
    "A hash with a secret key for integrity and authenticity? (abbr., 4 letters)",
    "The HTTPS encryption protocol that replaced SSL? (abbr., 3 letters)",
    "The man-in-the-middle attack (abbr., 4 letters)?",
    "The main SQLi defense is parameterized queries, a.k.a. prepared ...? (Eng., 1 word)",
    "Periodic identical calls from malware to its control server? (Eng.)",
    "Proactive threat search in a SOC — threat ...? (Eng., 1 word)",
    "The cookie attribute forbidding access from JavaScript? (Eng.)",
    "Microsoft's mnemonic for threat types (6 letters)?",
    "A popular graphical network-traffic analyzer? (Eng.)",
    "What is faking the DNS reply to reach a fake site called? (2 words, Eng., or the first word)",
  ];
  // для DDoS-вопроса в EN принимаем 'availability'
  const DAILY_EXTRA_ANSWERS = { 4: ["availability", "доступность"] };

  const MISSIONS_EN = {
    m_persistence: { title: "Investigating Persistence", level: "Intermediate",
      brief: "A workstation is suspected of malware that added itself to autostart. Gather evidence and find the flag.",
      steps: ["Look at active network connections: <code>netstat</code> — note the outbound connection to port 4444.",
        "Check the user's autostart keys: <code>reg query HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run</code>",
        "The value contains a command with an encoded payload. Decode it: <code>certutil -decode &lt;string&gt;</code> (or <code>base64 -d</code>).",
        "Enter the flag you found below."] },
    m_osint: { title: "A Forgotten Backup", level: "Beginner",
      brief: "A backup with a «hidden» string was left in Documents. Find and decode it.",
      steps: ["Look into the documents: <code>dir Documents</code>",
        "Read the backup file: <code>type Documents\\backup.txt</code>",
        "The string is ROT13-encoded. Decode it: <code>rot13 &lt;string&gt;</code>",
        "Enter the resulting flag below."] },
    m_config: { title: "Hidden Config", level: "Beginner",
      brief: "A config in Downloads holds a Base64-encoded token. Extract and decode it.",
      steps: ["List the downloads folder: <code>dir Downloads</code>",
        "Open the config: <code>type Downloads\\config.cfg</code>",
        "The token= value is Base64-encoded. Decode it: <code>base64 -d &lt;string&gt;</code>",
        "Enter the resulting flag below."] },
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
    if (typeof MISSIONS !== "undefined") MISSIONS.forEach((m) => { m.__ru = { title: m.title, level: m.level, brief: m.brief, steps: (m.steps || []).slice() }; });
    COURSES.forEach((c) => c.rooms.forEach((r) => {
      r.__ru = { title: r.title, intro: r.intro };
      r.tasks.forEach((t) => {
        t.__ru = { title: t.title, prompt: t.prompt, hints: t.hints && t.hints.slice(), options: t.options && t.options.slice(),
          answers: t.answers && t.answers.slice(), pairs: t.pairs && t.pairs.map((x) => x.slice()), items: t.items && t.items.slice() };
      });
    }));
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
    if (typeof MISSIONS !== "undefined") MISSIONS.forEach((m) => { const e = MISSIONS_EN[m.id]; if (e) { m.title = e.title; m.level = e.level; m.brief = e.brief; if (e.steps) m.steps = e.steps; } });
    applyContentEN();
  }
  /* Контент курсов: window.CONTENT_EN[courseId][roomId] = { t, intro, tasks: { taskId: [title, prompt, hints?, extra?] } }
     extra: { answers: [доп. EN-ответы], options: [...], pairs: [...], items: [...] } — по позициям RU-версии. */
  function applyContentEN() {
    const CE = window.CONTENT_EN || {};
    COURSES.forEach((c) => c.rooms.forEach((r) => {
      const er = CE[c.id] && CE[c.id][r.id];
      if (!er) return;
      if (er.t) r.title = er.t;
      if (er.intro) r.intro = er.intro;
      r.tasks.forEach((t) => {
        const e = er.tasks && er.tasks[t.id];
        if (!e) return;
        const [title, prompt, hints, x] = e;
        if (title) t.title = title;
        if (prompt) t.prompt = prompt;
        if (hints && hints.length) t.hints = hints;
        const ru = t.__ru;
        if (x && x.options && ru.options) {
          t.options = x.options;
          // правильный вариант — по позиции в RU-версии
          t.answers = (ru.answers || []).map((a) => x.options[ru.options.indexOf(a)] || a);
        } else if (x && x.answers && ru.answers) {
          t.answers = Array.from(new Set([...ru.answers, ...x.answers]));
        }
        if (x && x.pairs && ru.pairs && x.pairs.length === ru.pairs.length) t.pairs = x.pairs;
        if (x && x.items && ru.items && x.items.length === ru.items.length) t.items = x.items;
      });
    }));
  }
  function toRU() {
    if (!stashed) return;
    COURSES.forEach((c) => { if (c.__ru) { c.title = c.__ru.title; c.summary = c.__ru.summary; c.level = c.__ru.level; c.tags = c.__ru.tags.slice(); } });
    GLOSSARY.forEach((g) => { if (g.__ru) { g.term = g.__ru.term; g.cat = g.__ru.cat; g.def = g.__ru.def; } });
    ACHIEVEMENTS.forEach((a) => { if (a.__ru) { a.title = a.__ru.title; a.desc = a.__ru.desc; } });
    RANKS.forEach((r) => { if (r.__ru) r.name = r.__ru.name; });
    if (typeof DAILY_QUESTIONS !== "undefined") DAILY_QUESTIONS.forEach((d) => { if (d.__ru) { d.q = d.__ru.q; d.answers = d.__ru.answers.slice(); } });
    if (typeof MISSIONS !== "undefined") MISSIONS.forEach((m) => { if (m.__ru) { m.title = m.__ru.title; m.level = m.__ru.level; m.brief = m.__ru.brief; m.steps = m.__ru.steps.slice(); } });
    COURSES.forEach((c) => c.rooms.forEach((r) => {
      if (r.__ru) { r.title = r.__ru.title; r.intro = r.__ru.intro; }
      r.tasks.forEach((t) => {
        const ru = t.__ru; if (!ru) return;
        t.title = ru.title; t.prompt = ru.prompt;
        if (ru.hints) t.hints = ru.hints.slice();
        if (ru.options) t.options = ru.options.slice();
        if (ru.answers) t.answers = ru.answers.slice();
        if (ru.pairs) t.pairs = ru.pairs.map((x) => x.slice());
        if (ru.items) t.items = ru.items.slice();
      });
    }));
  }

  /* -------- Статические строки в index.html (data-i18n) -------- */
  function applyStatic() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const ru = el.getAttribute("data-i18n");
      el.textContent = t(ru);
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => { el.title = t(el.getAttribute("data-i18n-title")); });
  }

  /* Переводы курсов (~150 КБ) грузим лениво — только когда пользователь выбрал EN */
  const EN_FILES = ["ad_reverse", "forensics_phishing", "fundamentals", "hardening_blue_malware", "networking_osint_crypto", "web_pentest", "windows"];
  let enPromise = null;
  function loadContentEN() {
    if (window.__CONTENT_EN_READY) return Promise.resolve();
    if (!enPromise) enPromise = Promise.all(EN_FILES.map((f) => new Promise((res, rej) => {
      const sc = document.createElement("script");
      sc.src = "js/en/" + f + ".js"; sc.onload = res; sc.onerror = rej;
      document.head.appendChild(sc);
    }))).then(() => { window.__CONTENT_EN_READY = true; })
      .catch((e) => { enPromise = null; throw e; });
    return enPromise;
  }

  function apply(l) {
    lang = l === "en" ? "en" : "ru";
    if (lang === "en") {
      toEN();
      if (!window.__CONTENT_EN_READY && typeof document.createElement === "function") {
        loadContentEN().then(() => {
          if (lang !== "en") return;
          toEN();
          try { window.dispatchEvent(new Event("i18n:content")); } catch (e) {}
        }).catch(() => {});
      }
    } else toRU();
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

  return { t, tf, apply, set, get, toggle, current, lvl, tag, loadContentEN };
})();
try { window.I18N = I18N; } catch (e) {}
