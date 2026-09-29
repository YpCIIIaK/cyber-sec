/* ============================================================
   CyberPath — данные курсов, комнат, заданий и достижений
   Весь контент образовательный и оборонительный по духу.
   ============================================================ */

const ACHIEVEMENTS = [
  { id: "first_blood", icon: "🩸", title: "Первая кровь", desc: "Выполните первое задание" },
  { id: "level_5", icon: "⭐", title: "Восходящая звезда", desc: "Достигните 5 уровня" },
  { id: "level_10", icon: "🌟", title: "Профи", desc: "Достигните 10 уровня" },
  { id: "course_done", icon: "🎓", title: "Выпускник", desc: "Завершите любой курс полностью" },
  { id: "three_courses", icon: "🏆", title: "Мультиклассник", desc: "Завершите 3 курса" },
  { id: "streak_3", icon: "🔥", title: "В ударе", desc: "Заходите 3 дня подряд" },
  { id: "streak_7", icon: "🔥", title: "Несгибаемый", desc: "Заходите 7 дней подряд" },
  { id: "terminal_master", icon: "💻", title: "Повелитель терминала", desc: "Найдите скрытый флаг в песочнице" },
  { id: "no_hints", icon: "🧠", title: "Чистый разум", desc: "Пройдите комнату без подсказок" },
  { id: "hundred_k", icon: "💎", title: "Тысяча очков", desc: "Наберите 1000 XP" },
];

/* Каждое задание task:
   { id, type: "question"|"info"|"flag", title, prompt, answer, answers[], hints[], points, caseSensitive }
   type "info" — просто отметить прочитанным (кнопка «Понятно»).
*/

const COURSES = [
  /* ==================== 1. ОСНОВЫ ==================== */
  {
    id: "fundamentals",
    title: "Основы кибербезопасности",
    icon: "🛡️",
    level: "Новичок",
    color: "#ff7a18",
    summary: "Фундамент: угрозы, триада CIA, пароли, фишинг и цифровая гигиена. Идеальная точка старта.",
    tags: ["базовое", "теория", "обязательное"],
    rooms: [
      {
        id: "cia",
        title: "Триада CIA и модель угроз",
        intro: `
<h3>Что защищает информационная безопасность?</h3>
<p>В основе всей отрасли лежит <b>триада CIA</b> — три свойства, которые мы стремимся сохранить:</p>
<ul>
  <li><b>Confidentiality (Конфиденциальность)</b> — данные видят только те, кому положено.</li>
  <li><b>Integrity (Целостность)</b> — данные не изменены незаметно и без разрешения.</li>
  <li><b>Availability (Доступность)</b> — система и данные доступны, когда нужны.</li>
</ul>
<p>Атака почти всегда бьёт по одному из этих свойств. Например, <i>утечка базы</i> ломает конфиденциальность, <i>подмена платёжки</i> — целостность, а <i>DDoS</i> — доступность.</p>
<div class="callout">💡 Дополняющие свойства: <b>Аутентичность</b> (подлинность источника) и <b>Неотказуемость</b> (нельзя отрицать действие).</div>
`,
        tasks: [
          { id: "cia_read", type: "info", title: "Прочитать материал", prompt: "Разберитесь с триадой CIA выше.", points: 5 },
          { id: "cia_ddos", type: "question", title: "Какое свойство ломает DDoS?", prompt: "Одно слово на русском: конфиденциальность, целостность или доступность.", answers: ["доступность"], hints: ["DDoS «кладёт» сервис.", "Пользователи не могут зайти на сайт."], points: 10 },
          { id: "cia_leak", type: "question", title: "Утечка паролей ломает…", prompt: "Какое свойство триады нарушает утечка приватных данных?", answers: ["конфиденциальность"], hints: ["Данные увидели те, кому нельзя."], points: 10 },
          { id: "cia_abbr", type: "question", title: "Расшифровка", prompt: "Что означает буква I в CIA (одно слово, англ.)?", answers: ["integrity"], hints: ["Целостность по-английски."], points: 10 },
        ],
      },
      {
        id: "passwords",
        title: "Пароли и аутентификация",
        intro: `
<h3>Почему пароли ломают</h3>
<p>Слабые пароли — причина №1 взломов аккаунтов. Атаки бывают:</p>
<ul>
  <li><b>Brute-force</b> — перебор всех комбинаций.</li>
  <li><b>Dictionary</b> — перебор по словарю популярных паролей.</li>
  <li><b>Credential stuffing</b> — подстановка утёкших пар логин/пароль на других сайтах.</li>
</ul>
<p>Защита: длинные фразы-пароли, уникальность на каждом сайте, менеджер паролей и <b>2FA</b> (двухфакторная аутентификация).</p>
<div class="callout">🔐 Пароль <code>P@ssw0rd</code> ломается за секунды. Фраза <code>fioletovyj-slon-begit-2043</code> — практически неперебираема.</div>
<h3>Энтропия</h3>
<p>Стойкость пароля измеряют в битах энтропии. Чем больше длина и набор символов — тем выше энтропия и время перебора.</p>
`,
        tasks: [
          { id: "pw_read", type: "info", title: "Изучить теорию паролей", prompt: "Прочитайте материал о паролях.", points: 5 },
          { id: "pw_2fa", type: "question", title: "Второй фактор", prompt: "Как называется аббревиатура для двухфакторной аутентификации? (англ., 3 символа)", answers: ["2fa"], hints: ["Two-Factor Authentication.", "Цифра + две буквы."], points: 10 },
          { id: "pw_attack", type: "question", title: "Атака по утёкшим базам", prompt: "Как называется атака, где утёкшие пары логин/пароль подставляют на другие сайты? (англ., 2 слова)", answers: ["credential stuffing", "credentialstuffing"], hints: ["Credential ...", "Начинается с 'credential'."], points: 15 },
          { id: "pw_best", type: "question", title: "Лучшая практика", prompt: "Что использовать, чтобы хранить уникальные пароли для каждого сайта? (2 слова, рус.)", answers: ["менеджер паролей"], hints: ["Специальная программа-хранилище."], points: 10 },
        ],
      },
      {
        id: "phishing",
        title: "Фишинг и социальная инженерия",
        intro: `
<h3>Человек — самое слабое звено</h3>
<p><b>Социальная инженерия</b> — манипуляция людьми ради доступа или данных. Самый частый её вид — <b>фишинг</b>: поддельные письма и сайты.</p>
<h3>Признаки фишинга</h3>
<ul>
  <li>Срочность и угрозы («аккаунт будет удалён через 24 часа!»).</li>
  <li>Подозрительный домен: <code>paypa1.com</code> вместо <code>paypal.com</code>.</li>
  <li>Просьба ввести пароль/код по ссылке из письма.</li>
  <li>Вложения с расширениями <code>.exe</code>, <code>.scr</code>, макросы в документах.</li>
</ul>
<div class="callout">🎣 Всегда проверяйте домен в адресной строке и не вводите 2FA-коды на сторонних сайтах.</div>
`,
        tasks: [
          { id: "ph_read", type: "info", title: "Изучить признаки фишинга", prompt: "Прочитайте материал.", points: 5 },
          { id: "ph_domain", type: "question", title: "Найдите подделку", prompt: "Какой из доменов поддельный: paypal.com или paypa1.com? Введите поддельный целиком.", answers: ["paypa1.com"], hints: ["Смотрите внимательно на буквы и цифры.", "Единица вместо буквы L."], points: 15 },
          { id: "ph_term", type: "question", title: "Общий термин", prompt: "Как называется манипуляция людьми ради доступа? (2 слова, рус.)", answers: ["социальная инженерия"], hints: ["Social engineering."], points: 10 },
          { id: "ph_vishing", type: "question", title: "Фишинг по телефону", prompt: "Как называется голосовой фишинг по телефону? (англ., одно слово)", answers: ["vishing"], hints: ["Voice + phishing."], points: 15 },
        ],
      },
    ],
  },

  /* ==================== 2. LINUX ==================== */
  {
    id: "linux",
    title: "Linux для хакеров",
    icon: "🐧",
    level: "Новичок",
    color: "#ff8c33",
    summary: "Командная строка, файловая система, права доступа и основы разведки в системе. С заданиями в песочнице.",
    tags: ["linux", "терминал", "практика"],
    rooms: [
      {
        id: "cli_basics",
        title: "Основы командной строки",
        intro: `
<h3>Терминал — ваш главный инструмент</h3>
<p>Базовые команды навигации:</p>
<ul>
  <li><code>pwd</code> — где я сейчас (текущий каталог).</li>
  <li><code>ls</code> — список файлов; <code>ls -la</code> — включая скрытые и права.</li>
  <li><code>cd путь</code> — сменить каталог.</li>
  <li><code>cat файл</code> — вывести содержимое файла.</li>
  <li><code>whoami</code> — под каким пользователем я работаю.</li>
</ul>
<div class="callout">🧪 Откройте вкладку <b>Песочница</b> и попробуйте команды вживую! Наберите <code>help</code>.</div>
`,
        tasks: [
          { id: "cli_read", type: "info", title: "Изучить команды", prompt: "Прочитайте список базовых команд.", points: 5 },
          { id: "cli_pwd", type: "question", title: "Текущий каталог", prompt: "Какая команда показывает текущий каталог? (англ.)", answers: ["pwd"], hints: ["Print Working Directory."], points: 10, sandbox: true },
          { id: "cli_hidden", type: "question", title: "Скрытые файлы", prompt: "Какой флаг у ls показывает ВСЕ файлы, включая скрытые? (например -x)", answers: ["-a", "-la", "-al"], hints: ["'a' — all.", "Скрытые файлы начинаются с точки."], points: 10, sandbox: true },
          { id: "cli_flag", type: "flag", title: "🚩 Найдите флаг в песочнице", prompt: "В песочнице есть файл secret.txt в домашнем каталоге. Прочитайте его через cat и введите флаг (формат CYBER{...}).", answers: ["CYBER{terminal_navigator}"], hints: ["cat secret.txt", "Сначала ls, потом cat."], points: 25, sandbox: true, caseSensitive: true },
        ],
      },
      {
        id: "permissions",
        title: "Права доступа и пользователи",
        intro: `
<h3>rwx и восьмеричная запись</h3>
<p>У каждого файла три группы прав: <b>владелец</b>, <b>группа</b>, <b>остальные</b>. Каждая — read(4), write(2), execute(1).</p>
<ul>
  <li><code>chmod 755 file</code> — rwxr-xr-x</li>
  <li><code>chmod 644 file</code> — rw-r--r--</li>
  <li><code>chmod +x script.sh</code> — сделать исполняемым</li>
</ul>
<p>Спецбит <b>SUID</b> (<code>chmod 4755</code>) заставляет файл выполняться от имени владельца — частый вектор повышения привилегий, если стоит на бинарнике вроде <code>bash</code>.</p>
<div class="callout">⚠️ Команда <code>find / -perm -4000 2>/dev/null</code> ищет SUID-бинарники — классика при аудите системы.</div>
`,
        tasks: [
          { id: "perm_read", type: "info", title: "Изучить права", prompt: "Разберитесь с rwx и chmod.", points: 5 },
          { id: "perm_octal", type: "question", title: "Права rwxr-xr-x", prompt: "Введите восьмеричное представление прав rwxr-xr-x (3 цифры).", answers: ["755"], hints: ["r=4,w=2,x=1", "7 = 4+2+1, 5 = 4+1"], points: 15 },
          { id: "perm_suid", type: "question", title: "Спецбит", prompt: "Как называется бит, заставляющий файл исполняться от имени владельца? (англ., 4 символа)", answers: ["suid"], hints: ["Set User ID.", "chmod 4755"], points: 15 },
          { id: "perm_read2", type: "question", title: "Только чтение всем", prompt: "Какие права (число) дают: владелец rw, группа r, остальные r?", answers: ["644"], hints: ["rw=6, r=4, r=4"], points: 15 },
        ],
      },
      {
        id: "recon_linux",
        title: "Разведка внутри системы",
        intro: `
<h3>Ситуационная осведомлённость</h3>
<p>Попав в систему (легально, в рамках теста), первым делом собирают информацию:</p>
<ul>
  <li><code>id</code>, <code>whoami</code> — кто я, в каких группах.</li>
  <li><code>uname -a</code> — версия ядра (важно для эксплойтов).</li>
  <li><code>cat /etc/os-release</code> — дистрибутив.</li>
  <li><code>ss -tulpn</code> / <code>netstat</code> — открытые порты и сервисы.</li>
  <li><code>sudo -l</code> — что можно запускать через sudo.</li>
</ul>
<div class="callout">🔎 Всё это — легитимные шаги при авторизованном пентесте или аудите своей же машины.</div>
`,
        tasks: [
          { id: "rec_read", type: "info", title: "Изучить разведку", prompt: "Прочитайте о сборе информации.", points: 5 },
          { id: "rec_kernel", type: "question", title: "Версия ядра", prompt: "Какая команда с флагом -a показывает версию ядра? (команда без флага, англ.)", answers: ["uname"], hints: ["uname -a"], points: 10 },
          { id: "rec_sudo", type: "question", title: "Проверка sudo", prompt: "Какая команда показывает, что разрешено запускать через sudo? (2 слова с флагом)", answers: ["sudo -l"], hints: ["sudo и флаг -l (list)."], points: 15, sandbox: true },
        ],
      },
    ],
  },

  /* ==================== 3. СЕТИ ==================== */
  {
    id: "networking",
    title: "Сетевая безопасность",
    icon: "🌐",
    level: "Средний",
    color: "#ff6a00",
    summary: "TCP/IP, порты, сканирование Nmap, анализ трафика и понимание, как данные ходят по сети.",
    tags: ["сети", "nmap", "протоколы"],
    rooms: [
      {
        id: "tcpip",
        title: "TCP/IP и порты",
        intro: `
<h3>Модель и порты</h3>
<p>Данные проходят по стеку TCP/IP. Ключевые понятия:</p>
<ul>
  <li><b>IP</b> — адрес хоста. <b>Порт</b> — номер сервиса на хосте (0–65535).</li>
  <li><b>TCP</b> — надёжный, с установкой соединения (three-way handshake: SYN → SYN/ACK → ACK).</li>
  <li><b>UDP</b> — быстрый, без гарантий (DNS, видео).</li>
</ul>
<p>Хорошо известные порты:</p>
<ul>
  <li>22 — SSH, 80 — HTTP, 443 — HTTPS</li>
  <li>21 — FTP, 25 — SMTP, 53 — DNS, 3389 — RDP</li>
</ul>
`,
        tasks: [
          { id: "tcp_read", type: "info", title: "Изучить порты", prompt: "Прочитайте о TCP/IP и портах.", points: 5 },
          { id: "tcp_https", type: "question", title: "Порт HTTPS", prompt: "На каком порту по умолчанию работает HTTPS?", answers: ["443"], hints: ["HTTP=80, HTTPS=..."], points: 10 },
          { id: "tcp_ssh", type: "question", title: "Порт SSH", prompt: "Стандартный порт SSH?", answers: ["22"], hints: ["Безопасный удалённый доступ."], points: 10 },
          { id: "tcp_handshake", type: "question", title: "Рукопожатие TCP", prompt: "Какой первый флаг отправляет клиент в three-way handshake? (англ., 3 буквы)", answers: ["syn"], hints: ["SYN → SYN/ACK → ACK"], points: 15 },
        ],
      },
      {
        id: "nmap",
        title: "Сканирование с Nmap",
        intro: `
<h3>Nmap — картограф сети</h3>
<p><b>Nmap</b> обнаруживает хосты, открытые порты и сервисы. Используйте только на своих или авторизованных целях!</p>
<ul>
  <li><code>nmap 10.0.0.5</code> — быстрый скан топ-1000 портов.</li>
  <li><code>nmap -sV target</code> — определить версии сервисов.</li>
  <li><code>nmap -p- target</code> — все 65535 портов.</li>
  <li><code>nmap -sS target</code> — SYN-скан («тихий»).</li>
  <li><code>nmap -A target</code> — агрессивно: ОС, версии, скрипты.</li>
</ul>
<div class="callout">🧪 В песочнице есть учебная цель. Попробуйте <code>nmap 10.10.10.5</code>.</div>
`,
        tasks: [
          { id: "nm_read", type: "info", title: "Изучить Nmap", prompt: "Прочитайте о Nmap.", points: 5 },
          { id: "nm_version", type: "question", title: "Определение версий", prompt: "Какой флаг Nmap определяет версии сервисов? (например -X)", answers: ["-sv", "-sV"], hints: ["s + Version"], points: 15, caseSensitive: false },
          { id: "nm_allports", type: "question", title: "Все порты", prompt: "Какой флаг сканирует все 65535 портов?", answers: ["-p-"], hints: ["p и дефис."], points: 15 },
          { id: "nm_flag", type: "flag", title: "🚩 Скан цели в песочнице", prompt: "Запустите nmap на 10.10.10.5 в песочнице. Один из портов необычный — введите его номер.", answers: ["1337"], hints: ["nmap 10.10.10.5", "Ищите порт, которого нет в стандартном списке."], points: 25, sandbox: true },
        ],
      },
    ],
  },

  /* ==================== 4. ВЕБ / OWASP ==================== */
  {
    id: "web",
    title: "Веб-безопасность (OWASP)",
    icon: "🕸️",
    level: "Средний",
    color: "#ff5e1a",
    summary: "SQL-инъекции, XSS, IDOR, аутентификация и главные риски OWASP Top 10 — с понятными примерами.",
    tags: ["web", "owasp", "уязвимости"],
    rooms: [
      {
        id: "owasp_intro",
        title: "OWASP Top 10",
        intro: `
<h3>Карта веб-рисков</h3>
<p><b>OWASP Top 10</b> — список самых критичных рисков веб-приложений. Ключевые категории:</p>
<ul>
  <li><b>Broken Access Control</b> — доступ к чужим данным (IDOR).</li>
  <li><b>Injection</b> — SQL/команды в вводе.</li>
  <li><b>Cryptographic Failures</b> — слабое/отсутствующее шифрование.</li>
  <li><b>Security Misconfiguration</b> — дефолтные пароли, открытые панели.</li>
  <li><b>XSS</b> — внедрение скриптов в страницу.</li>
</ul>
<div class="callout">📚 Всё изучаем с точки зрения защиты: чтобы находить и чинить, надо понимать, как оно работает.</div>
`,
        tasks: [
          { id: "ow_read", type: "info", title: "Изучить OWASP", prompt: "Прочитайте про Top 10.", points: 5 },
          { id: "ow_idor", type: "question", title: "Доступ к чужому", prompt: "Как называется уязвимость, когда сменив id в URL видишь чужие данные? (англ., аббревиатура 4 буквы)", answers: ["idor"], hints: ["Insecure Direct Object Reference."], points: 15 },
          { id: "ow_org", type: "question", title: "Кто это составляет", prompt: "Как называется организация-автор Top 10? (аббревиатура, 5 букв)", answers: ["owasp"], hints: ["Open Worldwide Application Security Project."], points: 10 },
        ],
      },
      {
        id: "sqli",
        title: "SQL-инъекции",
        intro: `
<h3>Когда ввод становится кодом</h3>
<p>Если приложение вставляет пользовательский ввод прямо в SQL-запрос, атакующий может изменить логику запроса.</p>
<p>Уязвимый код:</p>
<pre>SELECT * FROM users WHERE name='<b>$input</b>';</pre>
<p>Ввод <code>' OR '1'='1</code> превращает условие в всегда-истинное:</p>
<pre>SELECT * FROM users WHERE name='' OR '1'='1';</pre>
<h3>Защита</h3>
<ul>
  <li><b>Параметризованные запросы</b> (prepared statements) — главный способ.</li>
  <li>Валидация и экранирование ввода.</li>
  <li>Принцип минимальных привилегий для БД-пользователя.</li>
</ul>
<div class="callout">🛡️ Понимая механику, вы сможете писать безопасный код и находить дыры в аудите.</div>
`,
        tasks: [
          { id: "sql_read", type: "info", title: "Изучить SQLi", prompt: "Прочитайте про инъекции.", points: 5 },
          { id: "sql_payload", type: "question", title: "Классический пейлоад", prompt: "Введите классическое условие, всегда истинное: ' OR '1'='... (закончите: цифра)", answers: ["1", "'1"], hints: ["'1'='1"], points: 15 },
          { id: "sql_defense", type: "question", title: "Главная защита", prompt: "Как называются запросы с плейсхолдерами вместо конкатенации? (2 слова, англ.)", answers: ["prepared statements", "parameterized queries", "prepared statement"], hints: ["Prepared ...", "'prepared statements' или 'parameterized queries'"], points: 20 },
        ],
      },
      {
        id: "xss",
        title: "XSS — межсайтовый скриптинг",
        intro: `
<h3>Чужой JavaScript на вашей странице</h3>
<p><b>XSS</b> позволяет внедрить JS, который выполнится в браузере жертвы (кража cookie/сессий).</p>
<ul>
  <li><b>Reflected</b> — пейлоад в URL, отражается в ответе.</li>
  <li><b>Stored</b> — сохраняется в БД (комментарий) и бьёт всех.</li>
  <li><b>DOM-based</b> — уязвимость в клиентском JS.</li>
</ul>
<p>Простой тест: <code>&lt;script&gt;alert(1)&lt;/script&gt;</code>.</p>
<h3>Защита</h3>
<ul>
  <li>Экранирование вывода (HTML-encode).</li>
  <li><b>Content Security Policy (CSP)</b>.</li>
  <li>Атрибут <code>HttpOnly</code> у cookie.</li>
</ul>
`,
        tasks: [
          { id: "xss_read", type: "info", title: "Изучить XSS", prompt: "Прочитайте про XSS.", points: 5 },
          { id: "xss_stored", type: "question", title: "Самый опасный тип", prompt: "Какой тип XSS сохраняется в БД и бьёт всех посетителей? (англ., 1 слово)", answers: ["stored"], hints: ["Хранимый."], points: 15 },
          { id: "xss_csp", type: "question", title: "Заголовок защиты", prompt: "Какая политика (аббревиатура, 3 буквы) ограничивает источники скриптов?", answers: ["csp"], hints: ["Content Security Policy."], points: 15 },
          { id: "xss_cookie", type: "question", title: "Защита cookie", prompt: "Какой атрибут cookie запрещает доступ к ней из JS? (1 слово, англ.)", answers: ["httponly"], hints: ["Http____"], points: 15 },
        ],
      },
    ],
  },

  /* ==================== 5. ПЕНТЕСТ ==================== */
  {
    id: "pentest",
    title: "Пентестинг: методология",
    icon: "🎯",
    level: "Средний",
    color: "#e85400",
    summary: "Полный цикл авторизованного тестирования на проникновение: разведка, сканирование, эксплуатация, отчёт.",
    tags: ["пентест", "методология", "этика"],
    rooms: [
      {
        id: "ethics",
        title: "Этика и правила игры",
        intro: `
<h3>Без разрешения — это преступление</h3>
<p>Пентест легален <b>только</b> при письменном разрешении (scope/RoE). Ключевые документы:</p>
<ul>
  <li><b>Scope</b> — что именно можно тестировать (домены, IP, приложения).</li>
  <li><b>Rules of Engagement (RoE)</b> — время, методы, запреты (например, без DoS).</li>
  <li><b>NDA</b> — соглашение о неразглашении.</li>
</ul>
<div class="callout">⚖️ Тренируйтесь на легальных площадках: TryHackMe, HackTheBox, собственные VM. Никогда — на чужих системах без договора.</div>
`,
        tasks: [
          { id: "eth_read", type: "info", title: "Изучить правила", prompt: "Прочитайте об этике.", points: 5 },
          { id: "eth_scope", type: "question", title: "Границы теста", prompt: "Как называется документ, определяющий что можно тестировать? (1 слово, англ.)", answers: ["scope"], hints: ["Область теста."], points: 10 },
          { id: "eth_roe", type: "question", title: "Правила", prompt: "Аббревиатура правил проведения (3 буквы, англ.)?", answers: ["roe"], hints: ["Rules of Engagement."], points: 10 },
        ],
      },
      {
        id: "methodology",
        title: "5 фаз пентеста",
        intro: `
<h3>Классический цикл</h3>
<ol>
  <li><b>Reconnaissance</b> — сбор информации (пассивная/активная разведка).</li>
  <li><b>Scanning</b> — порты, сервисы, уязвимости.</li>
  <li><b>Exploitation</b> — получение доступа.</li>
  <li><b>Post-Exploitation</b> — закрепление, повышение привилегий, сбор данных.</li>
  <li><b>Reporting</b> — отчёт с находками и рекомендациями.</li>
</ol>
<p>Часто выделяют дополнительно <b>Privilege Escalation</b> и <b>Lateral Movement</b> внутри post-exploitation.</p>
<div class="callout">📝 Отчёт — самая ценная фаза для заказчика: без него работа бесполезна.</div>
`,
        tasks: [
          { id: "meth_read", type: "info", title: "Изучить фазы", prompt: "Прочитайте о 5 фазах.", points: 5 },
          { id: "meth_first", type: "question", title: "Первая фаза", prompt: "Как называется первая фаза — сбор информации? (англ., 1 слово)", answers: ["reconnaissance", "recon"], hints: ["Разведка."], points: 15 },
          { id: "meth_last", type: "question", title: "Финал", prompt: "Какая фаза завершает пентест и даёт ценность заказчику? (англ., 1 слово)", answers: ["reporting", "report"], hints: ["Отчёт."], points: 15 },
          { id: "meth_privesc", type: "question", title: "Повышение прав", prompt: "Как коротко называют повышение привилегий? (англ., 1 слово-сленг)", answers: ["privesc"], hints: ["Privilege Escalation → priv..."], points: 15 },
        ],
      },
      {
        id: "recon_phase",
        title: "Разведка целей",
        intro: `
<h3>Пассивная vs активная</h3>
<ul>
  <li><b>Пассивная</b> — не касаемся цели: WHOIS, DNS, поисковики, соцсети.</li>
  <li><b>Активная</b> — прямое взаимодействие: пинг, сканы, запросы.</li>
</ul>
<p>Полезные приёмы:</p>
<ul>
  <li><b>Google Dorking</b>: <code>site:example.com filetype:pdf</code>.</li>
  <li><b>Поддомены</b>: перебор, sublist3r, crt.sh.</li>
  <li><b>DNS</b>: <code>dig</code>, <code>nslookup</code>, записи A/MX/TXT.</li>
</ul>
`,
        tasks: [
          { id: "rp_read", type: "info", title: "Изучить разведку", prompt: "Прочитайте о разведке.", points: 5 },
          { id: "rp_passive", type: "question", title: "Без касания цели", prompt: "Как называется разведка без прямого контакта с целью? (1 слово, рус.)", answers: ["пассивная"], hints: ["Противоположность активной."], points: 15 },
          { id: "rp_dork", type: "question", title: "Хитрый поиск", prompt: "Как называется поиск по спецоператорам Google? (2 слова, англ.)", answers: ["google dorking", "google dork"], hints: ["Google ..."], points: 15 },
        ],
      },
    ],
  },

  /* ==================== 6. КРИПТО ==================== */
  {
    id: "crypto",
    title: "Криптография и кодировки",
    icon: "🔐",
    level: "Средний",
    color: "#ff7a18",
    summary: "Хеши, симметричное и асимметричное шифрование, кодировки и практические задачи-квесты на декодирование.",
    tags: ["крипто", "хеши", "encoding"],
    rooms: [
      {
        id: "encoding",
        title: "Кодировки: не путать с шифрованием",
        intro: `
<h3>Кодирование ≠ шифрование</h3>
<p><b>Кодирование</b> (Base64, hex, URL) обратимо без ключа — это НЕ защита, а формат представления.</p>
<ul>
  <li><b>Base64</b>: <code>SGVsbG8=</code> → <code>Hello</code></li>
  <li><b>Hex</b>: <code>48656c6c6f</code> → <code>Hello</code></li>
  <li><b>ROT13</b>: сдвиг букв на 13.</li>
</ul>
<div class="callout">🧪 В песочнице есть команды <code>base64 -d</code> и <code>rot13</code>. Проверьте квесты ниже прямо там!</div>
`,
        tasks: [
          { id: "enc_read", type: "info", title: "Изучить кодировки", prompt: "Прочитайте про кодировки.", points: 5 },
          { id: "enc_b64", type: "flag", title: "🚩 Раскодируй Base64", prompt: "Раскодируйте строку Q1lCRVJ7YmFzZTY0X2lzX2Vhc3l9 (можно в песочнице: base64 -d). Введите результат.", answers: ["CYBER{base64_is_easy}"], hints: ["base64 -d в песочнице.", "Начинается с CYBER{"], points: 25, sandbox: true, caseSensitive: true },
          { id: "enc_reversible", type: "question", title: "Ключевое отличие", prompt: "Base64 — это шифрование или кодирование? (1 слово, рус.)", answers: ["кодирование"], hints: ["Не требует ключа."], points: 10 },
        ],
      },
      {
        id: "hashing",
        title: "Хеширование",
        intro: `
<h3>Односторонняя функция</h3>
<p><b>Хеш</b> нельзя «расшифровать» — только сравнить. Применение: хранение паролей, контроль целостности.</p>
<ul>
  <li><b>MD5</b>, <b>SHA-1</b> — устарели (коллизии).</li>
  <li><b>SHA-256</b> — для целостности.</li>
  <li><b>bcrypt</b>, <b>argon2</b> — для паролей (медленные, с солью).</li>
</ul>
<p><b>Соль (salt)</b> — случайные данные к паролю перед хешированием, чтобы одинаковые пароли давали разные хеши и ломались rainbow-таблицы.</p>
`,
        tasks: [
          { id: "hash_read", type: "info", title: "Изучить хеши", prompt: "Прочитайте про хеширование.", points: 5 },
          { id: "hash_salt", type: "question", title: "Против радужных таблиц", prompt: "Как называются случайные данные, добавляемые к паролю? (1 слово, рус. или англ.)", answers: ["соль", "salt"], hints: ["Salt."], points: 15 },
          { id: "hash_pw", type: "question", title: "Для паролей", prompt: "Назовите один современный медленный алгоритм для паролей (напр. b... или a...).", answers: ["bcrypt", "argon2", "scrypt", "argon"], hints: ["bcrypt / argon2 / scrypt"], points: 15 },
          { id: "hash_len256", type: "question", title: "Длина SHA-256", prompt: "Сколько бит в выходе SHA-256?", answers: ["256"], hints: ["Подсказка в названии."], points: 10 },
        ],
      },
      {
        id: "asymmetric",
        title: "Симметрия и асимметрия",
        intro: `
<h3>Один ключ или два?</h3>
<ul>
  <li><b>Симметричное</b> (AES) — один ключ на шифр и расшифровку. Быстро, но проблема обмена ключом.</li>
  <li><b>Асимметричное</b> (RSA, ECC) — пара: <b>публичный</b> ключ шифрует, <b>приватный</b> расшифровывает.</li>
</ul>
<p>На практике их комбинируют: RSA передаёт AES-ключ, дальше общаются по AES (так работает TLS/HTTPS).</p>
`,
        tasks: [
          { id: "asym_read", type: "info", title: "Изучить шифры", prompt: "Прочитайте про типы шифрования.", points: 5 },
          { id: "asym_aes", type: "question", title: "Симметричный стандарт", prompt: "Назовите главный симметричный алгоритм (аббревиатура, 3 буквы).", answers: ["aes"], hints: ["Advanced Encryption Standard."], points: 10 },
          { id: "asym_pub", type: "question", title: "Что шифрует в RSA", prompt: "Какой ключ используют для ШИФРОВАНИЯ в асимметричной схеме? (1 слово, рус.)", answers: ["публичный", "открытый"], hints: ["Его можно раздавать всем."], points: 15 },
        ],
      },
    ],
  },

  /* ==================== 7. OSINT ==================== */
  {
    id: "osint",
    title: "OSINT — разведка по открытым источникам",
    icon: "🔎",
    level: "Новичок",
    color: "#ff9a4d",
    summary: "Легальный сбор информации из открытых источников: метаданные, поисковые операторы, гео-локация по фото.",
    tags: ["osint", "разведка", "приватность"],
    rooms: [
      {
        id: "osint_intro",
        title: "Что такое OSINT",
        intro: `
<h3>Информация вокруг нас</h3>
<p><b>OSINT</b> (Open Source Intelligence) — сбор и анализ публично доступных данных. Применяется в расследованиях, журналистике, оценке приватности и защите бренда.</p>
<ul>
  <li>Соцсети, форумы, регистрационные базы.</li>
  <li>Метаданные файлов (EXIF в фото — GPS, модель камеры!).</li>
  <li>Архивы (Wayback Machine), утёкшие базы (проверка себя на HIBP).</li>
</ul>
<div class="callout">🕵️ Этично: только публичные данные, уважение к приватности, без взлома.</div>
`,
        tasks: [
          { id: "os_read", type: "info", title: "Изучить OSINT", prompt: "Прочитайте вступление.", points: 5 },
          { id: "os_abbr", type: "question", title: "Расшифровка", prompt: "Как расшифровывается OSINT — первое слово? (англ.)", answers: ["open"], hints: ["Open Source Intelligence."], points: 10 },
          { id: "os_exif", type: "question", title: "Данные в фото", prompt: "Как называются метаданные внутри фотографий (GPS, камера)? (англ., 4 буквы)", answers: ["exif"], hints: ["Exchangeable Image File Format."], points: 15 },
        ],
      },
      {
        id: "search_ops",
        title: "Поисковые операторы",
        intro: `
<h3>Google Dorking для защитников</h3>
<p>Операторы сужают поиск и помогают найти случайно открытые данные (чтобы вы могли их закрыть!):</p>
<ul>
  <li><code>site:</code> — в пределах домена.</li>
  <li><code>filetype:</code> — тип файла (pdf, xls).</li>
  <li><code>intitle:</code> / <code>inurl:</code> — в заголовке/URL.</li>
  <li><code>"точная фраза"</code>, <code>-минус</code> для исключения.</li>
</ul>
<div class="callout">🛡️ Проверьте свой сайт: <code>site:вашдомен filetype:xlsx</code> — вдруг что-то лишнее в индексе.</div>
`,
        tasks: [
          { id: "so_read", type: "info", title: "Изучить операторы", prompt: "Прочитайте про дорки.", points: 5 },
          { id: "so_site", type: "question", title: "Ограничить доменом", prompt: "Какой оператор ограничивает поиск сайтом? (с двоеточием)", answers: ["site:"], hints: ["site двоеточие."], points: 10 },
          { id: "so_filetype", type: "question", title: "Найти PDF", prompt: "Какой оператор ищет по типу файла? (с двоеточием)", answers: ["filetype:"], hints: ["file..."], points: 10 },
          { id: "so_hibp", type: "question", title: "Проверка утечек", prompt: "Аббревиатура сервиса проверки утечки своего email (4 буквы, англ.)?", answers: ["hibp"], hints: ["Have I Been Pwned."], points: 15 },
        ],
      },
    ],
  },
];

/* Итоговые агрегаты для удобства */
function totalTasksInCourse(course) {
  return course.rooms.reduce((s, r) => s + r.tasks.length, 0);
}
function totalPointsInCourse(course) {
  return course.rooms.reduce((s, r) => s + r.tasks.reduce((a, t) => a + (t.points || 0), 0), 0);
}
