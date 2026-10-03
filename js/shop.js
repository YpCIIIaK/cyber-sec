/* ============================================================
   CyberPath — магазин кастомизации.
   Единый каталог: отсюда tests/gen-catalog.cjs берёт цены и условия
   для базы (supabase/catalog.sql), а сайт — названия и оформление.
   price: цена в монетах (null — не продаётся, только за достижение)
   req:   условие получения, проверяемое сервером (см. cp_req_ok в schema.sql)
   id:    только [a-z0-9_]; менять id выпущенных предметов нельзя.
   ============================================================ */
const SHOP_KINDS = [
  { kind: "frame",  ru: "Рамки аватара",   en: "Avatar frames",  icon: "🖼️" },
  { kind: "nick",   ru: "Стиль ника",      en: "Nickname style", icon: "✒️" },
  { kind: "title",  ru: "Титулы",          en: "Titles",         icon: "🏷️" },
  { kind: "bg",     ru: "Живые фоны",      en: "Live backgrounds", icon: "🌌" },
  { kind: "effect", ru: "Эффекты профиля", en: "Profile effects", icon: "✨" },
];

// Условия, которые сервер умеет проверить сам
const SHOP_REQS = {
  first_course: { ru: "Пройдите любой курс", en: "Complete any course" },
  tasks_100:    { ru: "Решите 100 заданий", en: "Solve 100 tasks" },
  exams_5:      { ru: "Сдайте 5 экзаменов", en: "Pass 5 exams" },
  bosses_5:     { ru: "Победите 5 боссов", en: "Defeat 5 bosses" },
  flags_all:    { ru: "Найдите все CTF-флаги", en: "Find all CTF flags" },
  streak_7:     { ru: "Серия 7 дней", en: "7-day streak" },
  streak_30:    { ru: "Серия 30 дней", en: "30-day streak" },
  courses_all:  { ru: "Пройдите все курсы", en: "Complete all courses" },
};

const SHOP_ITEMS = [
  // ---- Рамки аватара ----
  { id: "fr_pixel",   kind: "frame", price: 40,   ru: "Пиксели",        en: "Pixels" },
  { id: "fr_circuit", kind: "frame", price: 60,   ru: "Микросхема",     en: "Circuit" },
  { id: "fr_neon",    kind: "frame", price: 70,   ru: "Неон",           en: "Neon" },
  { id: "fr_glitch",  kind: "frame", price: 90,   ru: "Глитч",          en: "Glitch" },
  { id: "fr_vine",    kind: "frame", price: 120,  ru: "Золотая лоза",   en: "Golden vine" },
  { id: "fr_crystal", kind: "frame", price: null, req: "exams_5",   ru: "Хрусталь",  en: "Crystal" },
  { id: "fr_fire",    kind: "frame", price: null, req: "streak_30", ru: "Пламя",     en: "Flame" },
  { id: "fr_legend",  kind: "frame", price: null, req: "courses_all", ru: "Легенда", en: "Legend" },

  // ---- Стиль ника ----
  { id: "nk_sunset",   kind: "nick", price: 50,  ru: "Закатный градиент", en: "Sunset gradient" },
  { id: "nk_ocean",    kind: "nick", price: 50,  ru: "Океанский градиент", en: "Ocean gradient" },
  { id: "nk_terminal", kind: "nick", price: 70,  ru: "Терминал",          en: "Terminal" },
  { id: "nk_rainbow",  kind: "nick", price: 110, ru: "Радуга",            en: "Rainbow" },
  { id: "nk_glitch",   kind: "nick", price: 130, ru: "Глитч",             en: "Glitch" },
  { id: "nk_gold",     kind: "nick", price: 150, ru: "Золотой блеск",     en: "Golden shine" },
  { id: "nk_ice",      kind: "nick", price: null, req: "tasks_100", ru: "Лёд", en: "Ice" },

  // ---- Титулы ----
  { id: "tt_whitehat", kind: "title", price: 30,  ru: "Белая шляпа",       en: "White Hat" },
  { id: "tt_night",    kind: "title", price: 30,  ru: "Ночной дозор",      en: "Night Watch" },
  { id: "tt_blue",     kind: "title", price: 40,  ru: "Синяя команда",     en: "Blue Team" },
  { id: "tt_red",      kind: "title", price: 40,  ru: "Красная команда",   en: "Red Team" },
  { id: "tt_packet",   kind: "title", price: 60,  ru: "Шепчущий пакетам",  en: "Packet Whisperer" },
  { id: "tt_root",     kind: "title", price: 80,  ru: "Root-доступ",       en: "Root Access" },
  { id: "tt_starter",  kind: "title", price: null, req: "first_course", ru: "Первые шаги", en: "First Steps" },
  { id: "tt_hunter",   kind: "title", price: null, req: "flags_all",    ru: "Охотник за флагами", en: "Flag Hunter" },
  { id: "tt_slayer",   kind: "title", price: null, req: "bosses_5",     ru: "Гроза боссов", en: "Boss Slayer" },
  { id: "tt_steady",   kind: "title", price: null, req: "streak_7",     ru: "Стабильный",   en: "Steady" },

  // ---- Живые фоны карточки ----
  { id: "bg_circuits", kind: "bg", price: 100, ru: "Платы",     en: "Circuits" },
  { id: "bg_terminal", kind: "bg", price: 120, ru: "Терминал",  en: "Terminal" },
  { id: "bg_starfield", kind: "bg", price: 140, ru: "Звёздное небо", en: "Starfield" },
  { id: "bg_radar",    kind: "bg", price: 160, ru: "Радар",     en: "Radar" },
  { id: "bg_legend",   kind: "bg", price: null, req: "courses_all", ru: "Легендарный", en: "Legendary" },

  // ---- Эффекты профиля (проигрываются при просмотре профиля) ----
  { id: "fx_sparks",  kind: "effect", price: 90,  ru: "Искры",          en: "Sparks" },
  { id: "fx_snow",    kind: "effect", price: 90,  ru: "Снегопад",       en: "Snowfall" },
  { id: "fx_stars",   kind: "effect", price: 120, ru: "Мерцание звёзд", en: "Twinkling stars" },
  { id: "fx_embers",  kind: "effect", price: 150, ru: "Угли",           en: "Embers" },
  { id: "fx_matrix",  kind: "effect", price: 180, ru: "Цифровой дождь", en: "Digital rain" },
  { id: "fx_flags",   kind: "effect", price: null, req: "flags_all", ru: "Флаги на ветру", en: "Flags in the wind" },
];

// Награды в монетах (для подсказки в интерфейсе; начисляет сервер — cp_coins_earned в schema.sql)
const COIN_RULES = [
  { ru: "Задание курса", en: "Course task", coins: "1–2" },
  { ru: "Курс пройден на 100%", en: "Course 100% complete", coins: 25 },
  { ru: "Экзамен", en: "Exam", coins: 15 },
  { ru: "Недельный ивент", en: "Weekly event", coins: 15 },
  { ru: "Боссфайт", en: "Boss fight", coins: 10 },
  { ru: "CTF-флаг, миссия, инструмент", en: "CTF flag, mission, tool", coins: 10 },
  { ru: "Задание дня", en: "Daily task", coins: 3 },
];
try { window.SHOP_ITEMS = SHOP_ITEMS; window.SHOP_KINDS = SHOP_KINDS; window.SHOP_REQS = SHOP_REQS; window.COIN_RULES = COIN_RULES; } catch (e) {}
