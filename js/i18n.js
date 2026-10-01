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
    "н": "w",
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
    rooms_10: ["Room explorer", "Complete 10 rooms"], five_courses: ["Broad profile", "Complete 5 courses"],
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
