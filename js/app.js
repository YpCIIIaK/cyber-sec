/* ============================================================
   CyberPath — ядро приложения: прогресс, роутинг, рендер
   ============================================================ */

/* ---------- Прогресс (localStorage) ---------- */
const Progress = (() => {
  const KEY = "cyberpath_progress_v1";
  const XP_PER_LEVEL = 100; // XP на уровень

  const defaultState = {
    completed: {},        // taskId -> true
    earned: {},           // taskId -> реально начисленный XP (с учётом подсказок)
    hintsUsed: {},        // taskId -> count
    xp: 0,
    achievements: {},     // id -> timestamp
    lastVisit: null,      // YYYY-MM-DD
    streak: 0,
    dailyDate: null,      // дата последнего решённого ежедневного задания
    dailySolved: 0,       // сколько всего решено ежедневных
    exams: {},            // courseId -> { passed, best }
    xpLog: [],            // [{d: dayIndex, a: amount}] — история начислений XP
    activeDays: {},       // 'YYYY-MM-DD' -> суммарный XP за день (для календаря)
    attempts: {},         // taskId -> { c: верных, w: неверных }
    srs: {},              // taskId -> { box, due(dayIndex), reps, lapses }
    drafts: {},           // taskId -> черновик ответа (сохранённый ввод)
    createdAt: Date.now(),
  };
  const SRS_INTERVALS = [0, 1, 2, 4, 8, 16]; // дни по номеру box (1..5)
  const EXAM_PASS = 0.7;   // порог сдачи (мягче: 70% вместо 80%)
  const EXAM_BONUS = 30;   // бонус XP за первую сдачу

  const HINT_PENALTY = 5; // XP штраф за каждую использованную подсказку

  let state = load();

  function load() {
    let s;
    try {
      const raw = localStorage.getItem(KEY);
      s = raw ? Object.assign(structuredClone(defaultState), JSON.parse(raw)) : structuredClone(defaultState);
    } catch (e) {
      s = structuredClone(defaultState);
    }
    return migrate(s);
  }

  // Бэкфилл аналитики для прогресса, накопленного до появления трекинга
  function migrate(s) {
    // V3: учебная серия — дни с ≥3 заданиями; восстанавливаем из истории XP
    if (!s.dayTasks) {
      s.dayTasks = {};
      (Array.isArray(s.xpLog) ? s.xpLog : []).forEach((e) => { if (e && Number.isInteger(e.d)) s.dayTasks[e.d] = (s.dayTasks[e.d] || 0) + 1; });
    }
    if (s.migratedV2) return s;
    const completedIds = Object.keys(s.completed || {});
    const day = Math.floor(Date.now() / 86400000);
    const today = new Date().toISOString().slice(0, 10);
    // История XP: если пусто, но XP есть — одну запись «сегодня», чтобы график не был пустым
    if ((!s.xpLog || !s.xpLog.length) && s.xp > 0) s.xpLog = [{ d: day, a: s.xp }];
    // Активные дни: отметить сегодня и день последнего визита
    if (!s.activeDays) s.activeDays = {};
    if (s.xp > 0 && s.activeDays[today] === undefined) s.activeDays[today] = s.xp;
    if (s.lastVisit && s.activeDays[s.lastVisit] === undefined) s.activeDays[s.lastVisit] = 0;
    // индекс типов заданий из COURSES (TASK_INDEX ещё не готов на этом этапе)
    const typeById = {};
    COURSES.forEach((c) => c.rooms.forEach((r) => r.tasks.forEach((tk) => (typeById[tk.id] = tk.type))));
    // Попытки: считаем каждое выполненное проверяемое задание как верную попытку
    if (!s.attempts) s.attempts = {};
    // SRS: завести карточки для выполненных вопросов/выбора
    if (!s.srs) s.srs = {};
    completedIds.forEach((id) => {
      const ty = typeById[id];
      if (!ty) return;
      if ((ty === "question" || ty === "choice" || ty === "flag" || ty === "lab") && !s.attempts[id]) {
        s.attempts[id] = { c: 1, w: 0 };
      }
      if ((ty === "question" || ty === "choice") && !s.srs[id]) {
        s.srs[id] = { box: 2, due: day + 2, reps: 1, lapses: 0 };
      }
    });
    s.migratedV2 = true;
    return s;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn("Не удалось сохранить прогресс", e); }
    emit("cp:saved");
  }
  function emit(name, detail) { try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch (e) {} }

  // Для облачной синхронизации: снимок состояния и его замена (после слияния)
  function getState() { return structuredClone(state); }
  function replaceState(next) {
    if (!next || typeof next !== "object" || typeof next.completed !== "object") return false;
    state = migrate(Object.assign(structuredClone(defaultState), next));
    save();
    return true;
  }
  function hintsFor(taskId) { return state.hintsUsed[taskId] || 0; }

  function level() { return Math.floor(state.xp / XP_PER_LEVEL) + 1; }
  function xpInLevel() { return state.xp % XP_PER_LEVEL; }
  function xpToNext() { return XP_PER_LEVEL - xpInLevel(); }

  function isDone(taskId) { return !!state.completed[taskId]; }

  // Эффективный XP за задание с учётом использованных подсказок
  function effectivePoints(task) {
    const base = task.points || 0;
    const penalty = (state.hintsUsed[task.id] || 0) * HINT_PENALTY;
    return Math.max(1, base - penalty);
  }

  // Начислить XP и заполнить события уровня/ранга/милстоунов
  function logXP(amount) {
    if (!amount) return;
    if (!Array.isArray(state.xpLog)) state.xpLog = [];
    state.xpLog.push({ d: dayIndex(), a: amount });
    if (state.xpLog.length > 3000) state.xpLog = state.xpLog.slice(-3000);
    if (!state.activeDays) state.activeDays = {};
    const t = todayStr();
    state.activeDays[t] = (state.activeDays[t] || 0) + amount;
  }

  function awardXP(amount, events) {
    const beforeLvl = level();
    const beforeRank = rankForLevel(beforeLvl).name;
    state.xp += amount;
    logXP(amount);
    const afterLvl = level();
    if (afterLvl > beforeLvl) events.levelUp = afterLvl;
    const afterRank = rankForLevel(afterLvl).name;
    if (afterRank !== beforeRank) events.newRank = rankForLevel(afterLvl);
    if (state.xp >= 1000) tryAch("hundred_k", events);
    if (afterLvl >= 5) tryAch("level_5", events);
    if (afterLvl >= 10) tryAch("level_10", events);
  }

  /* ---------- Учебная серия и множитель XP ----------
     День засчитывается в серию, если решено ≥3 заданий курсов (UTC-сутки, как на сервере).
     Один пропущенный день раз в 7 дней прощается. Множитель действует с 3-го задания дня:
     серия 3+ дн ×1.05 · 7+ ×1.10 · 14+ ×1.15 · 30+ ×1.20 (потолок). Та же формула — в supabase/schema.sql. */
  const STREAK_MIN_TASKS = 3;
  const STREAK_TIERS = [[30, 120], [14, 115], [7, 110], [3, 105]]; // [дней, процент]
  function streakPct(days) { for (const [d, p] of STREAK_TIERS) if (days >= d) return p; return 100; }
  function dayTasks() { if (!state.dayTasks) state.dayTasks = {}; return state.dayTasks; }
  function streakBefore(today) {
    const dt = dayTasks(); let n = 0, grace = null;
    for (let d = today - 1; d > today - 800; d--) {
      if ((dt[d] || 0) >= STREAK_MIN_TASKS) n++;
      else if ((grace === null || grace - d >= 7) && (dt[d - 1] || 0) >= STREAK_MIN_TASKS) grace = d;
      else break;
    }
    return n;
  }
  function streakInfo() {
    const today = dayIndex(), cnt = dayTasks()[today] || 0, before = streakBefore(today);
    const qualified = cnt >= STREAK_MIN_TASKS;
    const days = before + (qualified ? 1 : 0);
    const nextPct = streakPct(before + 1);                        // множитель с 3-го задания сегодня
    const pct = cnt >= STREAK_MIN_TASKS - 1 ? nextPct : 100;      // действует на следующее задание
    const tier = [...STREAK_TIERS].reverse().find(([d]) => d > days);
    return { days, today: cnt, need: STREAK_MIN_TASKS, qualified, pct, nextPct, alive: before > 0,
      nextTier: tier ? { days: tier[0], pct: tier[1] } : null };
  }

  function completeTask(task, courseId) {
    if (state.completed[task.id]) return { already: true };
    const today = dayIndex(), cntBefore = dayTasks()[today] || 0;
    const pct = cntBefore >= STREAK_MIN_TASKS - 1 ? streakPct(streakBefore(today) + 1) : 100;
    const gained = Math.round(effectivePoints(task) * pct / 100);
    dayTasks()[today] = cntBefore + 1;
    for (const k of Object.keys(state.dayTasks)) if (+k < today - 800) delete state.dayTasks[k];
    state.completed[task.id] = true;
    state.earned[task.id] = gained;
    if (state.drafts) delete state.drafts[task.id];

    const events = { xpGained: gained, newAchievements: [], mult: pct };
    if (cntBefore + 1 === STREAK_MIN_TASKS) events.streakDay = streakInfo();
    state.streak = streakInfo().days;
    if (state.streak >= 3) tryAch("streak_3", events);
    if (state.streak >= 7) tryAch("streak_7", events);
    if (Object.keys(state.completed).length === 1) tryAch("first_blood", events);
    awardXP(gained, events);
    srsEnsure(task);
    checkCourseCompletion(courseId, events);
    const hr = new Date().getHours();
    if (hr < 5) tryAch("night_owl", events);
    else if (hr < 8) tryAch("early_bird", events);
    checkMeta(events);

    save();
    emit("cp:solved", { id: task.id, h: state.hintsUsed[task.id] || 0 });
    return events;
  }

  function checkCourseCompletion(courseId, events) {
    let doneCourses = 0;
    for (const c of COURSES) {
      const done = courseProgress(c).pct === 100;
      if (done) {
        doneCourses++;
        if (c.id === courseId) { tryAch("course_done", events); events.courseDone = c; }
      }
    }
    if (doneCourses >= 3) tryAch("three_courses", events);
  }

  /* ---------- Испытания: боссфайты и недельный ивент ---------- */
  function weekKey() { const w = Math.floor((dayIndex() + 3) / 7); return "w" + w; } // недели с понедельника
  function challenges() { if (!state.challenges) state.challenges = {}; return state.challenges; }
  function challengeRec(key) { return challenges()[key] || null; }
  // kind: "boss" | "weekly"; passed — достаточно ли верных ответов для «зачёта»
  function recordChallenge(kind, key, correct, total, secs, passed, bonus, limit) {
    const all = challenges();
    const rec = all[key] || { kind, best: 0, bestTime: null, attempts: 0, cleared: false, history: [] };
    // скорость даёт бонус до 150 очков, но только пропорционально точности — угадывать быстро невыгодно
    const score = correct * 100 + Math.round(150 * Math.max(0, 1 - secs / (limit || 600)) * (total ? correct / total : 0));
    rec.attempts++;
    rec.history.unshift({ ts: Date.now(), correct, total, secs, score });
    rec.history = rec.history.slice(0, 10);
    if (score > rec.best) { rec.best = score; rec.bestTime = secs; rec.bestCorrect = correct; }
    const events = { xpGained: 0, newAchievements: [] };
    if (passed && !rec.cleared) {
      rec.cleared = true;
      awardXP(bonus, events);
      events.xpGained = bonus;
      tryAch(kind === "boss" ? "boss_first" : "weekly_first", events);
    }
    all[key] = rec;
    const bosses = Object.values(all).filter((r) => r.kind === "boss" && r.cleared).length;
    if (bosses >= 5) tryAch("boss_5", events);
    if (passed && correct === total && kind === "boss") tryAch("boss_perfect", events);
    save();
    return { rec, score, events };
  }

  /* ---------- Профиль пользователя (ник, аватар, статус, витрина) ---------- */
  const PROFILE_DEFAULT = { nick: "", avatar: { kind: "preset", value: "🦊" }, bg: 0, bio: "", ring: "tier", showcase: [] };
  function profile() { state.profile = Object.assign({}, PROFILE_DEFAULT, state.profile || {}); return state.profile; }
  function setProfile(patch) {
    const pr = profile();
    Object.assign(pr, patch);
    pr.nick = String(pr.nick || "").replace(/[<>]/g, "").trim().slice(0, 24);
    pr.bio = String(pr.bio || "").replace(/[<>]/g, "").trim().slice(0, 120);
    pr.showcase = (pr.showcase || []).filter((id) => state.achievements[id]).slice(0, 3);
    state.profile = pr;
    const ev = { xpGained: 0, newAchievements: [] };
    if (pr.nick || pr.avatar.kind !== "preset" || pr.avatar.value !== "🦊") tryAch("profile_custom", ev);
    save();
    if (window.App) ev.newAchievements.forEach((id) => App.toastAchievement(id));
  }

  /* ---------- Заметки ---------- */
  function notes() { if (!Array.isArray(state.notes)) state.notes = []; return state.notes; }
  function addNote(n) {
    const list = notes();
    if (list.some((x) => x.text === n.text && x.roomId === n.roomId)) return false;
    list.unshift({ id: "n" + Date.now().toString(36), ts: Date.now(), comment: "", ...n });
    if (list.length > 500) list.length = 500;
    const ev = { xpGained: 0, newAchievements: [] };
    if (list.length >= 1) tryAch("notes_1", ev);
    if (list.length >= 10) tryAch("notes_10", ev);
    save();
    if (window.App) ev.newAchievements.forEach((id) => App.toastAchievement(id));
    return true;
  }
  function updateNote(id, comment) { const n = notes().find((x) => x.id === id); if (n) { n.comment = comment; save(); } }
  function deleteNote(id) { state.notes = notes().filter((x) => x.id !== id); save(); }

  /* ---------- Метрики для достижений с прогрессом ---------- */
  function stats() { if (!state.stats) state.stats = { cmds: 0, reviews: 0, combo: 0, bestCombo: 0 }; return state.stats; }
  function bumpStat(name, n) {
    const st = stats();
    st[name] = (st[name] || 0) + (n || 1);
    const ev = { xpGained: 0, newAchievements: [] };
    checkMeta(ev);
    save();
    if (window.App) ev.newAchievements.forEach((id) => App.toastAchievement(id));
  }
  // Разовая премия XP (учебные инструменты Blue Team). once=ключ, чтобы не начислять повторно.
  // statName — какую метрику инкрементировать ("tools" для заданий, "flags" для флагов).
  function awardBonus(amount, once, statName) {
    const st = stats();
    if (once) {
      st.bonus = st.bonus || {};
      if (st.bonus[once]) return { already: true, xpGained: 0, newAchievements: [] };
      st.bonus[once] = 1;
    }
    const events = { xpGained: amount, newAchievements: [] };
    awardXP(amount, events);
    const sn = statName || "tools";
    st[sn] = (st[sn] || 0) + 1;
    checkMeta(events);
    save();
    return events;
  }
  function bonusDone(once) {
    const st = stats();
    return !!(st.bonus && st.bonus[once]);
  }
  function metric(name) {
    const st = stats();
    const tasks = () => COURSES.reduce((n, c) => n + c.rooms.reduce((m, r) => m + r.tasks.filter((t) => state.completed[t.id]).length, 0), 0);
    switch (name) {
      case "tasks": return tasks();
      case "rooms": return COURSES.reduce((n, c) => n + c.rooms.filter((r) => r.tasks.length && roomCompleted(r)).length, 0);
      case "courses": return COURSES.filter((c) => courseProgress(c).pct === 100).length;
      case "level": return level();
      case "xp": return state.xp;
      case "streak": return state.streak || 0;
      case "combo": return st.bestCombo || 0;
      case "reviews": return st.reviews || 0;
      case "cmds": return st.cmds || 0;
      case "labs": return COURSES.reduce((n, c) => n + c.rooms.reduce((m, r) => m + r.tasks.filter((t) => t.type === "lab" && state.completed[t.id]).length, 0), 0);
      case "exams": return Object.values(state.exams || {}).filter((e) => e.passed).length;
      case "tools": return st.tools || 0;
      case "flags": return st.flags || 0;
    }
    return 0;
  }
  function checkMeta(events) {
    ACHIEVEMENTS.forEach((a) => { if (a.metric && metric(a.metric) >= a.goal) tryAch(a.id, events); });
    const full = (id) => { const c = COURSES.find((x) => x.id === id); return c && courseProgress(c).pct === 100; };
    if (["web", "pentest", "ad"].every(full)) tryAch("red_team", events);
    if (["blueteam", "forensics", "hardening"].every(full)) tryAch("blue_team", events);
    if (COURSES.every((c) => full(c.id))) tryAch("all_courses", events);
    if (typeof MISSIONS !== "undefined" && MISSIONS.length && MISSIONS.every((m) => state.completed["mission_" + m.id])) tryAch("missions_all", events);
  }

  function tryAch(id, events) {
    if (!state.achievements[id]) {
      state.achievements[id] = Date.now();
      if (events) events.newAchievements.push(id);
      save();
    }
  }
  function unlockAchievement(id) {
    if (!state.achievements[id]) {
      state.achievements[id] = Date.now();
      save();
      if (window.App) App.toastAchievement(id);
    }
  }
  function hasAchievement(id) { return !!state.achievements[id]; }

  function useHint(taskId) {
    state.hintsUsed[taskId] = (state.hintsUsed[taskId] || 0) + 1;
    save();
  }
  function hintsUsedFor(taskId) { return state.hintsUsed[taskId] || 0; }

  function roomCompleted(room) {
    return room.tasks.every((t) => state.completed[t.id]);
  }
  function roomUsedNoHints(room) {
    return room.tasks.every((t) => !state.hintsUsed[t.id]);
  }

  function courseProgress(course) {
    const all = course.rooms.flatMap((r) => r.tasks);
    const done = all.filter((t) => state.completed[t.id]).length;
    return { done, total: all.length, pct: all.length ? Math.round((done / all.length) * 100) : 0 };
  }

  // Курс открыт, если все курсы-предпосылки пройдены на 100%
  const LVL_RANK = { "Новичок": 0, "Средний": 1, "Сложный": 2 };
  // Результат теста уровня: открывает курсы своего уровня без предпосылок
  function placement() { return state.placement || null; }
  function setPlacement(lvl) { state.placement = lvl; save(); }
  function courseUnlocked(course) {
    if (!course.prereq || !course.prereq.length) return true;
    if (state.placement && LVL_RANK[course.level] <= LVL_RANK[state.placement]) return true;
    return course.prereq.every((pid) => {
      const pc = COURSES.find((c) => c.id === pid);
      return pc && courseProgress(pc).pct === 100;
    });
  }
  // Список ещё не пройденных предпосылок (для подсказки)
  function missingPrereqs(course) {
    if (!course.prereq) return [];
    return course.prereq
      .map((pid) => COURSES.find((c) => c.id === pid))
      .filter((pc) => pc && courseProgress(pc).pct < 100);
  }

  function overallStats() {
    const allTasks = COURSES.flatMap((c) => c.rooms.flatMap((r) => r.tasks));
    const done = allTasks.filter((t) => state.completed[t.id]).length;
    const coursesDone = COURSES.filter((c) => courseProgress(c).pct === 100).length;
    return {
      xp: state.xp, level: level(), xpInLevel: xpInLevel(), xpToNext: xpToNext(),
      tasksDone: done, tasksTotal: allTasks.length,
      coursesDone, coursesTotal: COURSES.length,
      achievements: Object.keys(state.achievements).length,
      achievementsTotal: ACHIEVEMENTS.length,
      streak: state.streak,
      rank: rankForLevel(level()),
      nextRank: nextRank(level()),
    };
  }

  function trackVisit() {
    const today = new Date().toISOString().slice(0, 10);
    state.streak = streakInfo().days;   // серия теперь учебная — считается по заданиям
    if (state.lastVisit === today) return;
    state.lastVisit = today;
    if (!state.activeDays) state.activeDays = {};
    if (state.activeDays[today] === undefined) state.activeDays[today] = 0; // отметка визита
    if (state.streak >= 3) tryAch("streak_3");
    if (state.streak >= 7) tryAch("streak_7");
    checkMeta(null);
    save();
  }

  function reset() {
    state = structuredClone(defaultState);
    save();
  }

  function exportData() {
    return JSON.stringify({ app: "CyberPath", version: 1, exportedAt: Date.now(), state }, null, 2);
  }
  function importData(json) {
    let parsed;
    try { parsed = JSON.parse(json); } catch (e) { return { ok: false, error: "Файл повреждён или это не JSON." }; }
    const incoming = parsed && parsed.state ? parsed.state : parsed;
    if (!incoming || typeof incoming !== "object" || typeof incoming.completed !== "object") {
      return { ok: false, error: "Это не похоже на файл прогресса CyberPath." };
    }
    state = Object.assign(structuredClone(defaultState), incoming);
    save();
    return { ok: true };
  }

  // Реально заработанный XP внутри курса (с учётом подсказок)
  function courseXP(course) {
    return course.rooms.reduce((s, r) =>
      s + r.tasks.reduce((a, t) => a + (state.completed[t.id] ? (state.earned[t.id] ?? t.points ?? 0) : 0), 0), 0);
  }

  /* ---------- Миссии песочницы ---------- */
  function missionDone(id) { return !!state.completed["mission_" + id]; }
  function completeMission(mission) {
    const key = "mission_" + mission.id;
    if (state.completed[key]) return { already: true };
    state.completed[key] = true;
    state.earned[key] = mission.points;
    const events = { xpGained: mission.points, newAchievements: [] };
    tryAch("terminal_master", events);
    awardXP(mission.points, events);
    checkMeta(events);
    save();
    return events;
  }

  /* ---------- Ежедневное задание ---------- */
  function todayStr() { return new Date().toISOString().slice(0, 10); }
  function dayIndex() {
    return Math.floor(Date.parse(todayStr()) / 86400000);
  }
  function dailyToday() {
    return DAILY_QUESTIONS[dayIndex() % DAILY_QUESTIONS.length];
  }
  function dailyIsDone() { return state.dailyDate === todayStr(); }
  function dailyCount() { return state.dailySolved || 0; }
  function solveDaily() {
    if (dailyIsDone()) return { already: true };
    state.dailyDate = todayStr();
    state.dailySolved = (state.dailySolved || 0) + 1;
    const events = { xpGained: DAILY_BONUS, newAchievements: [] };
    if (state.dailySolved >= 5) tryAch("daily_5", events);
    awardXP(DAILY_BONUS, events);
    save();
    return events;
  }
  function completedAtISO() {
    return new Date().toISOString().slice(0, 10);
  }

  /* ---------- Экзамен ---------- */
  function examPassed(courseId) { return !!(state.exams[courseId] && state.exams[courseId].passed); }
  function examBest(courseId) { return state.exams[courseId] ? state.exams[courseId].best : 0; }
  function recordExam(courseId, correct, total) {
    const score = total ? correct / total : 0;
    const pct = Math.round(score * 100);
    const firstPass = score >= EXAM_PASS && !examPassed(courseId);
    const prev = state.exams[courseId] || { passed: false, best: 0 };
    state.exams[courseId] = { passed: prev.passed || score >= EXAM_PASS, best: Math.max(prev.best, pct) };
    const events = { xpGained: 0, newAchievements: [] };
    if (firstPass) {
      tryAch("exam_pass", events);
      awardXP(EXAM_BONUS, events);
      events.xpGained = EXAM_BONUS;
    }
    if (score === 1) tryAch("flawless", events);
    checkMeta(events);
    // все курсы пройдены (комнаты) — отдельная ачивка
    if (COURSES.every((c) => courseProgress(c).pct === 100)) tryAch("all_courses", events);
    save();
    return { pct, passed: score >= EXAM_PASS, firstPass, events };
  }

  /* ---------- Попытки / точность ---------- */
  /* ---------- Черновики ответов ---------- */
  function getDraft(taskId) { return (state.drafts && state.drafts[taskId]) || ""; }
  function setDraft(taskId, val) {
    if (!state.drafts) state.drafts = {};
    if (val) state.drafts[taskId] = val; else delete state.drafts[taskId];
    save();
  }
  function clearDraft(taskId) { if (state.drafts) { delete state.drafts[taskId]; save(); } }

  function recordAttempt(taskId, ok) {
    if (!state.attempts) state.attempts = {};
    const a = state.attempts[taskId] || { c: 0, w: 0 };
    if (ok) a.c++; else a.w++;
    state.attempts[taskId] = a;
    const st = stats();
    st.combo = ok ? (st.combo || 0) + 1 : 0;
    st.bestCombo = Math.max(st.bestCombo || 0, st.combo);
    save();
  }
  function accuracyOverall() {
    let c = 0, w = 0;
    Object.values(state.attempts || {}).forEach((a) => { c += a.c || 0; w += a.w || 0; });
    const total = c + w;
    return { correct: c, wrong: w, total, pct: total ? Math.round((c / total) * 100) : 0 };
  }

  /* ---------- Индекс задач и справочники ---------- */
  const TASK_INDEX = (() => {
    const map = {};
    COURSES.forEach((c) => c.rooms.forEach((r) => r.tasks.forEach((t) => {
      map[t.id] = { task: t, course: c, room: r };
    })));
    return map;
  })();
  function taskInfo(id) { return TASK_INDEX[id] || null; }

  /* ---------- Spaced repetition (Leitner) ---------- */
  function srsEligible(task) { return task && (task.type === "question" || task.type === "choice"); }
  function srsEnsure(task) {
    if (!srsEligible(task)) return;
    if (!state.srs) state.srs = {};
    if (!state.srs[task.id]) state.srs[task.id] = { box: 1, due: dayIndex() + 1, reps: 0, lapses: 0 };
  }
  function srsDueList() {
    const today = dayIndex();
    return Object.keys(state.srs || {})
      .filter((id) => TASK_INDEX[id] && state.srs[id].due <= today)
      .sort((a, b) => state.srs[a].due - state.srs[b].due);
  }
  function srsDueCount() { return srsDueList().length; }
  function srsTotal() { return Object.keys(state.srs || {}).length; }
  // Разбивка колоды по курсам: { courseId: { title, total, due, lapses } }
  function srsDeckStats() {
    const today = dayIndex();
    const out = {};
    Object.keys(state.srs || {}).forEach((id) => {
      const info = TASK_INDEX[id];
      if (!info) return;
      const cid = info.course.id;
      if (!out[cid]) out[cid] = { title: info.course.title, total: 0, due: 0, lapses: 0 };
      out[cid].total++;
      if (state.srs[id].due <= today) out[cid].due++;
      out[cid].lapses += state.srs[id].lapses || 0;
    });
    return out;
  }
  function srsDueListFor(courseId) {
    if (!courseId) return srsDueList();
    return srsDueList().filter((id) => TASK_INDEX[id] && TASK_INDEX[id].course.id === courseId);
  }
  function srsReview(taskId, ok) {
    const card = state.srs[taskId];
    if (!card) return;
    if (ok) {
      card.box = Math.min(5, card.box + 1);
      card.reps = (card.reps || 0) + 1;
    } else {
      card.box = 1;
      card.lapses = (card.lapses || 0) + 1;
    }
    card.due = dayIndex() + SRS_INTERVALS[card.box];
    stats().reviews = (stats().reviews || 0) + 1;
    recordAttempt(taskId, ok);
    save();
  }

  /* ---------- Слабые места (адаптивность) ---------- */
  function weakTasks(limit) {
    const rows = Object.keys(state.attempts || {}).map((id) => {
      const a = state.attempts[id]; const total = (a.c || 0) + (a.w || 0);
      const info = TASK_INDEX[id];
      return info ? { id, wrong: a.w || 0, total, acc: total ? a.c / total : 1, info } : null;
    }).filter(Boolean).filter((r) => r.wrong > 0);
    rows.sort((a, b) => (b.wrong - a.wrong) || (a.acc - b.acc));
    return limit ? rows.slice(0, limit) : rows;
  }
  function weakCourses() {
    const agg = {};
    weakTasks().forEach((r) => {
      const cid = r.info.course.id;
      agg[cid] = agg[cid] || { course: r.info.course, wrong: 0 };
      agg[cid].wrong += r.wrong;
    });
    // Ранжируем по доле ошибок в курсе, а не по сырому числу (иначе большой курс всегда «слабее»)
    Object.values(agg).forEach((g) => {
      let c = 0, w = 0;
      g.course.rooms.forEach((rm) => rm.tasks.forEach((t) => { const a = (state.attempts || {})[t.id]; if (a) { c += a.c || 0; w += a.w || 0; } }));
      g.rate = c + w ? w / (c + w) : 0;
    });
    return Object.values(agg).sort((a, b) => b.rate - a.rate || b.wrong - a.wrong);
  }

  /* ---------- Аналитика для дашборда ---------- */
  function xpByWeek(weeks) {
    weeks = weeks || 8;
    const today = dayIndex();
    const buckets = Array.from({ length: weeks }, () => 0);
    (state.xpLog || []).forEach((e) => {
      const ago = today - e.d;
      const wi = weeks - 1 - Math.floor(ago / 7);
      if (wi >= 0 && wi < weeks) buckets[wi] += e.a;
    });
    return buckets;
  }
  function xpByDay(days) {
    days = days || 14;
    const today = dayIndex();
    const buckets = Array.from({ length: days }, () => 0);
    (state.xpLog || []).forEach((e) => {
      const ago = today - e.d;
      const di = days - 1 - ago;
      if (di >= 0 && di < days) buckets[di] += e.a;
    });
    return buckets;
  }
  function activityMap(days) {
    days = days || 84;
    const out = [];
    // Ключи дней — в UTC (как todayStr), поэтому и арифметика в UTC, иначе в часовых поясах восточнее
    // Гринвича календарь «съезжал» на день и сегодняшняя активность не отображалась.
    const now = new Date(todayStr() + "T00:00:00Z");
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const ad = state.activeDays || {};
      out.push({ date: key, xp: ad[key] || 0, visited: ad[key] !== undefined, dow: (d.getUTCDay() + 6) % 7, day: d.getUTCDate(), month: d.getUTCMonth() });
    }
    return out;
  }
  /* Навыки = взвешенная сумма «освоения» курсов.
     Освоение курса честно учитывает не только % пройденного, но и качество:
     точность ответов (ошибки снижают оценку) и сданный экзамен (подтверждение знаний). */
  const SKILLS = [
    { id: "win", name: "Windows и CLI", w: { windows: 1, ad: .4, forensics: .3, hardening: .3 } },
    { id: "net", name: "Сети", w: { networking: 1, pentest: .3, blueteam: .3 } },
    { id: "web", name: "Веб-безопасность", w: { web: 1, pentest: .3 } },
    { id: "crypto", name: "Криптография", w: { crypto: 1, reverse: .2 } },
    { id: "recon", name: "Разведка и OSINT", w: { osint: 1, pentest: .3, phishing: .3 } },
    { id: "offense", name: "Тестирование на проникновение", w: { pentest: 1, ad: .6, web: .3 } },
    { id: "defense", name: "Защита и мониторинг", w: { blueteam: 1, hardening: .8, phishing: .5, fundamentals: .3 } },
    { id: "analysis", name: "Форензика и анализ ПО", w: { forensics: 1, malware: 1, reverse: .8 } },
  ];
  function courseMastery(c) {
    const tasks = c.rooms.flatMap((r) => r.tasks);
    const pct = courseProgress(c).pct;
    let cr = 0, wr = 0;
    tasks.forEach((t) => { const a = (state.attempts || {})[t.id]; if (a) { cr += a.c || 0; wr += a.w || 0; } });
    const acc = cr + wr ? cr / (cr + wr) : 1;
    const hintsPenalty = tasks.filter((t) => state.hintsUsed[t.id]).length / Math.max(1, tasks.length);
    // Мягкий штраф: ошибки в обучении — норма, не наказываем за них сильно
    const quality = 0.85 + 0.15 * acc - 0.05 * hintsPenalty;
    const exam = (state.exams || {})[c.id];
    const examPart = exam && exam.passed ? 15 * (exam.best / 100) : 0;
    return { score: Math.round(Math.max(0, Math.min(100, pct * 0.85 * quality + examPart))), pct, acc: Math.round(acc * 100), exam: !!(exam && exam.passed) };
  }
  function skillRadar() {
    const m = {};
    COURSES.forEach((c) => (m[c.id] = courseMastery(c)));
    return SKILLS.map((sk) => {
      let sum = 0, ws = 0;
      const parts = [];
      Object.entries(sk.w).forEach(([cid, w]) => {
        if (!m[cid]) return;
        sum += m[cid].score * w; ws += w;
        const c = COURSES.find((x) => x.id === cid);
        parts.push(`${c.title}: ${m[cid].score}`);
      });
      return { id: sk.id, title: sk.name, pct: ws ? Math.round(sum / ws) : 0, parts, color: "var(--o-600)" };
    });
  }

  return {
    isDone, completeTask, useHint, hintsUsedFor, roomCompleted, roomUsedNoHints,
    courseProgress, courseUnlocked, missingPrereqs, placement, setPlacement, streakInfo, overallStats, level, xpInLevel, xpToNext,
    unlockAchievement, hasAchievement, trackVisit, reset,
    exportData, importData, courseXP, completedAtISO, getState, replaceState, hintsFor,
    effectivePoints, hintPenalty: () => HINT_PENALTY,
    dailyToday, dailyIsDone, dailyCount, solveDaily,
    missionDone, completeMission,
    examPassed, examBest, recordExam,
    recordAttempt, accuracyOverall, taskInfo,
    getDraft, setDraft, clearDraft,
    srsEnsure, srsDueList, srsDueCount, srsTotal, srsReview, srsEligible, srsDeckStats, srsDueListFor,
    weakTasks, weakCourses, xpByWeek, xpByDay, activityMap, skillRadar, courseMastery,
    metric, bumpStat, awardBonus, bonusDone, stats, profile, setProfile, weekKey, challengeRec, recordChallenge, challenges, notes, addNote, updateNote, deleteNote,
    _state: () => state,
  };
})();

/* ---------- Утилиты проверки ответов ---------- */
function normalize(s) { return String(s).trim().toLowerCase().replace(/\s+/g, " "); }
function checkAnswer(task, input) {
  const answers = task.answers || (task.answer ? [task.answer] : []);
  if (task.caseSensitive) {
    return answers.some((a) => String(a).trim() === String(input).trim());
  }
  return answers.some((a) => normalize(a) === normalize(input));
}

/* ---------- Приложение / роутинг ---------- */
const App = (() => {
  const root = () => document.getElementById("view");
  let current = { view: "home" };
  const T = (s) => (window.I18N ? I18N.t(s) : s);
  const TL = (l) => (window.I18N ? I18N.lvl(l) : l);
  const TG = (g) => (window.I18N ? I18N.tag(g) : g);

  function go(view, params = {}) {
    stopRoomTimer();
    current = { view, ...params };
    document.body.classList.remove("nav-open");
    location.hash = buildHash(view, params);
    render();
    window.scrollTo(0, 0);
    const v = root(); if (v) v.focus({ preventScroll: true });
  }
  function buildHash(view, params) {
    if (view === "course") return `#/course/${params.courseId}`;
    if (view === "room") return `#/course/${params.courseId}/room/${params.roomId}`;
    if (view === "exam") return `#/course/${params.courseId}/exam`;
    if (view === "sandbox") return "#/sandbox";
    if (view === "profile") return "#/profile";
    if (view === "courses") return "#/courses";
    if (view === "glossary") return "#/glossary";
    if (view === "roadmap") return "#/roadmap";
    if (view === "review") return "#/review";
    if (view === "notes") return "#/notes";
    if (view === "ctf") return "#/ctf";
    if (view === "boss") return `#/course/${params.courseId}/boss`;
    if (view === "weekly") return "#/weekly";
    if (view === "start") return "#/start";
    if (view === "leaderboard") return params.period === "week" ? "#/leaderboard/week" : "#/leaderboard";
    if (view === "legal") return `#/legal/${params.page || "about"}`;
    if (view === "tools") return params.tool ? `#/tools/${params.tool}` : "#/tools";
    return "#/";
  }
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, "");
    const parts = h.split("/").filter(Boolean);
    if (parts.length === 0) return { view: "home" };
    if (parts[0] === "courses") return { view: "courses" };
    if (parts[0] === "sandbox") return { view: "sandbox" };
    if (parts[0] === "profile") return { view: "profile" };
    if (parts[0] === "glossary") return { view: "glossary" };
    if (parts[0] === "roadmap") return { view: "roadmap" };
    if (parts[0] === "review") return { view: "review" };
    if (parts[0] === "notes") return { view: "notes" };
    if (parts[0] === "ctf") return { view: "ctf" };
    if (parts[0] === "weekly") return { view: "weekly" };
    if (parts[0] === "tools") return { view: "tools", tool: parts[1] || null };
    if (parts[0] === "start") return { view: "start" };
    if (parts[0] === "leaderboard") return { view: "leaderboard", period: parts[1] === "week" ? "week" : "all" };
    if (parts[0] === "legal") return { view: "legal", page: parts[1] || "about" };
    if (parts[0] === "course" && parts[1]) {
      if (parts[2] === "room" && parts[3])
        return { view: "room", courseId: parts[1], roomId: parts[3] };
      if (parts[2] === "exam")
        return { view: "exam", courseId: parts[1] };
      if (parts[2] === "boss")
        return { view: "boss", courseId: parts[1] };
      return { view: "course", courseId: parts[1] };
    }
    return { view: "notfound" };
  }

  /* ---------- Рендер шапки/навигации ---------- */
  let displayedXP = null;
  function renderNav() {
    const s = Progress.overallStats();
    const nav = document.getElementById("nav-stats");
    if (nav) {
      const due = Progress.srsDueCount();
      const dark = currentTheme() === "dark";
      const en = window.I18N && I18N.current() === "en";
      const wasOpen = !!document.querySelector(".user-menu.open");
      const item = (ic, label, js, extra = "") => `<button class="um-item" role="menuitem" onclick="App.closeUserMenu();${js}">${ic}<span>${label}</span>${extra}</button>`;
      nav.innerHTML = `
        <button class="nav-xp" title="${T("Ваш уровень и опыт")}" onclick="App.go('profile')">
          <span class="lvl-badge">LVL ${s.level}</span>
          <div class="xp-bar-mini"><span style="width:${(s.xpInLevel)}%"></span></div>
          <span class="xp-text">${s.xp} XP</span>
          ${s.streak > 0 ? `<span class="streak" title="${T("Серия дней подряд")}">${Icon.ui("flame")}${s.streak}</span>` : ""}
        </button>
        <div class="user-menu${wasOpen ? " open" : ""}">
          <button class="nav-avatar tier-${s.rank.tier}${current && ["profile","review","glossary","notes"].includes(current.view) ? " on" : ""}" aria-haspopup="menu" aria-label="${T("Меню профиля")}" title="${escapeAttr(displayName())}" onclick="App.toggleUserMenu(event)">${avatarHTML(32)}${due ? `<i class="um-dot"></i>` : ""}<span class="um-caret">▾</span></button>
          <div class="um-pop" role="menu">
            <div class="um-head tier-${s.rank.tier}">
              ${avatarHTML(46)}
              <div class="um-who"><b>${escapeHtml(displayName())}</b><span>${s.rank.icon || ""} ${s.rank.name} · LVL ${s.level}</span>
                <div class="um-bar"><span style="width:${s.xpInLevel}%"></span></div>
                <small>${s.xpToNext} XP ${T("до следующего уровня")}</small></div>
            </div>
            <div class="um-list">
              ${item(Icon.ui("progress"), T("Профиль"), "App.go('profile')")}
              ${item(Icon.ui("quest"), T("Повторение"), "App.go('review')", due ? `<em class="um-badge">${due}</em>` : "")}
              ${item(Icon.ui("book"), T("Словарь"), "App.go('glossary')")}
              ${item(Icon.ui("flag"), T("CTF — флаги"), "App.go('ctf')")}
              ${item(Icon.ui("list"), T("Заметки"), "App.go('notes')", `<em class="um-count">${Progress.notes().length}</em>`)}
              ${item(Icon.ui("shield"), T("Звания"), "App.openRanks()")}
              ${item(Icon.ui("bolt"), T("Рейтинг"), "App.go('leaderboard')")}
              ${window.Cloud && Cloud.enabled ? item(Icon.ui("lock"), Cloud.state.status === "in" ? `${T("Аккаунт")} · ${escapeHtml(Cloud.state.nick || "")}` : T("Войти"), "App.openAccount()") : ""}
            </div>
            <div class="um-list um-set">
              ${item(dark ? Icon.ui("sun") : Icon.ui("moon"), dark ? T("Светлая тема") : T("Тёмная тема"), "App.toggleTheme()")}
              ${item(`<span class="um-lang">${en ? "RU" : "EN"}</span>`, en ? "Русский" : "English", "App.toggleLang()")}
            </div>
          </div>
        </div>
      `;
      displayedXP = s.xp;
    }
  }

  function toggleUserMenu(e) {
    if (e) e.stopPropagation();
    const m = document.querySelector(".user-menu"); if (m) m.classList.toggle("open");
  }
  function closeUserMenu() {
    const m = document.querySelector(".user-menu"); if (m) m.classList.remove("open");
  }
  document.addEventListener("click", (e) => { if (!e.target.closest || !e.target.closest(".user-menu")) closeUserMenu(); });

  // Плавный счётчик XP в шапке (count-up + заполнение мини-бара)
  function animateXP(toXP) {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = displayedXP == null ? toXP : displayedXP;
    if (reduce || from === toXP) { renderNav(); return; }
    const el = document.querySelector(".xp-text");
    const bar = document.querySelector(".xp-bar-mini span");
    const start = performance.now(), dur = 750;
    (function frame(t) {
      const p = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - p, 3);
      const val = Math.round(from + (toXP - from) * e);
      if (el) el.textContent = val + " XP";
      if (bar) bar.style.width = (val % 100) + "%";
      displayedXP = val;
      if (p < 1) requestAnimationFrame(frame);
      else renderNav();
    })(start);
  }

  // Летящий «+N XP»
  function flyXP(amount, pct) {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const el = document.createElement("div");
    el.className = "xp-fly";
    el.textContent = "+" + amount + " XP" + (pct > 100 ? " ×" + (pct / 100).toFixed(2) : "");
    const target = document.querySelector(".nav-xp");
    if (target) {
      const r = target.getBoundingClientRect();
      el.style.left = r.left + r.width / 2 + "px";
      el.style.top = r.bottom + 6 + "px";
    } else { el.style.right = "24px"; el.style.top = "64px"; }
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1150);
  }

  /* ---------- Виды ---------- */
  function render() {
    renderNav();
    const c = current;
    switch (c.view) {
      case "home": renderHome(); break;
      case "courses": renderCourses(); break;
      case "course": renderCourse(c.courseId); break;
      case "room": renderRoom(c.courseId, c.roomId); break;
      case "sandbox": renderSandbox(); break;
      case "profile": renderProfile(); break;
      case "glossary": renderGlossary(); break;
      case "roadmap": renderRoadmap(); break;
      case "review": renderReview(); break;
      case "notes": renderNotes(); break;
      case "ctf": renderCTF(); break;
      case "boss": renderBoss(c.courseId); break;
      case "weekly": renderWeekly(); break;
      case "tools": renderTools(c.tool); break;
      case "exam": renderExam(c.courseId); break;
      case "legal": renderLegal(c.page); break;
      case "notfound": renderNotFound(); break;
      case "start": renderPlacement(); break;
      case "leaderboard": renderLeaderboard(c.period); break;
      default: renderHome();
    }
    highlightNav();
    updateTitle();
    const v = root();
    if (v) { v.classList.remove("view-enter"); void v.offsetWidth; v.classList.add("view-enter"); }
    observeReveal();
  }
  function highlightNav() {
    document.querySelectorAll(".main-nav a").forEach((a) => {
      a.classList.toggle("active", a.dataset.view === current.view);
    });
  }

  function renderHome() {
    const s = Progress.overallStats();
    root().innerHTML = `
      <section class="hero">
        <div class="hero-inner">
          <div class="hero-text">
            <span class="hero-badge">${T("Бесплатно · Без регистрации · Прогресс сохраняется локально")}</span>
            <h1>${T("Учись")} <span class="accent">${T("кибербезопасности")}</span><br>${T("на практике")}</h1>
            <p class="hero-sub">${T("Интерактивные курсы, квесты, задания и живая песочница-терминал. От основ до пентеста, веба, сетей, Active Directory и форензики.")}</p>
            <div class="hero-actions">
              ${(() => {
                const n = nextUp();
                if (s.tasksDone > 0 && n) {
                  return `<button class="btn btn-primary btn-lg" onclick="App.go('room',{courseId:'${n.course.id}',roomId:'${n.room.id}'})">${T("Продолжить обучение")} ${Icon.ui("arrow")}</button>`;
                }
                return `<button class="btn btn-primary btn-lg" onclick="App.go('courses')">${T("Начать обучение")} ${Icon.ui("arrow")}</button>`;
              })()}
              <button class="btn btn-ghost btn-lg" onclick="App.go('sandbox')">${Icon.ui("terminal")} ${T("Открыть песочницу")}</button>
            </div>
          </div>
          <div class="hero-card">
            <div class="hc-row"><span>${T("Ваш уровень")}</span><b class="accent">LVL ${s.level}</b></div>
            <div class="xp-bar"><span style="width:${s.xpInLevel}%"></span></div>
            <div class="hc-sub">${s.xpInLevel} / 100 XP ${T("до")} ${s.level + 1} ${T("уровня")}</div>
            <div class="hc-grid">
              <div><b>${s.tasksDone}</b><span>${T("заданий")}</span></div>
              <div><b>${s.coursesDone}/${s.coursesTotal}</b><span>${T("курсов")}</span></div>
              <div><b>${s.achievements}/${s.achievementsTotal}</b><span>${T("ачивок")}</span></div>
              <div><b>${s.streak}</b><span>${T("дней подряд")}</span></div>
            </div>
          </div>
        </div>
      </section>

      ${continueBlock()}
      ${streakStrip()}
      ${dailyCard()}
      ${weeklyCard()}
      ${reviewCardHome()}

      <section class="features">
        ${[
          ["target", "Реальные навыки", "Задания на настоящих концепциях: SQLi, XSS, Nmap, cmd/PowerShell, Active Directory, хеши."],
          ["flag", "Квесты и флаги", "Находи флаги CYBER{…} в живой песочнице — как в CTF-соревнованиях."],
          ["progress", "Система прогрессии", "XP, уровни, серии дней и достижения. Сложные курсы открываются по мере роста."],
          ["terminal", "Прогресс локально", "Всё хранится в браузере. Никаких аккаунтов, регистрации и слежки."],
        ].map(([i, t, d]) => `
          <div class="feature reveal">
            <div class="feature-ic">${Icon.ui(i)}</div>
            <h3>${T(t)}</h3><p>${T(d)}</p>
          </div>`).join("")}
      </section>

      <section class="section">
        <div class="section-head">
          <h2>${T("Популярные курсы")}</h2>
          <a class="link" onclick="App.go('courses')">${T("Все курсы")} ${Icon.ui("arrow")}</a>
        </div>
        <div class="course-grid">
          ${COURSES.slice(0, 3).map(courseCard).join("")}
        </div>
      </section>
    `;
    highlightNav();
  }

  // Следующий шаг: первый открытый курс с прогрессом <100% и первая незавершённая комната
  function nextUp() {
    for (const course of COURSES) {
      if (!Progress.courseUnlocked(course)) continue;
      const p = Progress.courseProgress(course);
      if (p.pct === 100) continue;
      const room = course.rooms.find((r) => !Progress.roomCompleted(r));
      if (room) {
        const started = p.done > 0 || COURSES.some((c) => Progress.courseProgress(c).done > 0);
        return { course, room, started, pct: p.pct };
      }
    }
    return null;
  }

  // Учебная серия: прогресс дня и множитель XP
  function streakStrip() {
    const si = Progress.streakInfo();
    if (!si.days && !si.today && !si.alive) return "";
    const x = (p) => "×" + (p / 100).toFixed(2);
    const dots = Array.from({ length: si.need }, (_, i) => `<i class="${i < si.today ? "on" : ""}"></i>`).join("");
    const left = Math.max(0, si.need - si.today);
    const status = si.qualified
      ? `${T("Сегодня серия продлена")}${si.pct > 100 ? ` · ${T("действует")} <b>${x(si.pct)}</b>` : ""}`
      : `${T("Решите ещё")} ${left} ${T(plural(left, "задание", "задания", "заданий"))}, ${T("чтобы продлить серию")}${si.nextPct > 100 ? ` ${T("и включить")} <b>${x(si.nextPct)}</b>` : ""}`;
    const next = si.nextTier ? `${T("До")} ${x(si.nextTier.pct)}: ${si.nextTier.days - si.days} ${T("дн.")}` : T("Максимальный множитель!");
    return `
      <section class="section streak-section">
        <div class="streak-strip" title="${T("День идёт в серию, если решено 3+ задания. Множитель XP действует с 3-го задания дня: 3 дня ×1.05, 7 ×1.10, 14 ×1.15, 30 ×1.20. Один пропуск раз в неделю прощается.")}">
          <span class="ss-flame">🔥</span>
          <div class="ss-main"><b>${si.days} ${T(plural(si.days, "день", "дня", "дней"))} ${T("серии")}</b><span>${status}</span></div>
          <div class="ss-dots" aria-label="${si.today}/${si.need}">${dots}</div>
          <span class="ss-next">${next}</span>
        </div>
      </section>`;
  }

  function continueBlock() {
    const n = nextUp();
    if (!n) return "";
    const started = Progress.overallStats().tasksDone > 0;
    return `
      <section class="section continue-section">
        <div class="continue-card" style="--c:${n.course.color}" onclick="App.go('room',{courseId:'${n.course.id}',roomId:'${n.room.id}'})">
          <span class="cont-ic">${Icon.course(n.course.id)}</span>
          <div class="cont-body">
            <span class="cont-label">${started ? T("Продолжить обучение") : T("Начните здесь")}</span>
            <h2>${n.course.title}</h2>
            <p>${n.room.title} · ${T("курс пройден на")} ${n.pct}%</p>
          </div>
          <button class="btn btn-primary">${started ? T("Продолжить") : T("Начать")} ${Icon.ui("arrow")}</button>
        </div>
        ${!started && !Progress.placement() && !placeSkipped() ? `<div class="place-teaser">🧭 ${T("Уже что-то знаете?")} <a href="#/start">${T("Пройдите тест уровня за 1 минуту")}</a> — ${T("откроем подходящие курсы сразу.")}
          <button class="place-dismiss" onclick="App.placeSkip()" aria-label="${T("Пропустить тест")}" title="${T("Пропустить тест")}">✕</button></div>` : ""}
      </section>`;
  }

  function reviewCardHome() {
    const due = Progress.srsDueCount();
    if (!due) return "";
    return `
      <section class="section daily-section">
        <div class="daily-card" style="border-left-color:var(--o-500);cursor:pointer" onclick="App.go('review')">
          <div class="daily-badge">${Icon.ui("book")} ${T("Повторение")}<span class="daily-bonus" style="background:var(--o-500)">${due}</span></div>
          <p class="daily-q">К повторению готово ${due} ${plural(due, "карточка", "карточки", "карточек")}. Закрепите слабые темы — интервальное повторение работает.</p>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();App.go('review')">${T("Начать повторение")} ${Icon.ui("arrow")}</button>
        </div>
      </section>`;
  }
  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  function dailyCard() {
    const done = Progress.dailyIsDone();
    const q = Progress.dailyToday();
    return `
      <section class="section daily-section">
        <div class="daily-card ${done ? "done" : ""}">
          <div class="daily-badge">${Icon.ui("flame")} ${T("Задание дня")}<span class="daily-bonus">+${DAILY_BONUS} XP</span></div>
          ${done
            ? `<p class="daily-done">${Icon.ui("check")} ${T("Решено сегодня! Возвращайтесь завтра за новым заданием. Решено всего:")} ${Progress.dailyCount()}.</p>`
            : `
              <p class="daily-q">${q.q}</p>
              <div class="answer-row daily-row">
                <input type="text" id="daily-input" placeholder="${T("Ваш ответ")}"
                       onkeydown="if(event.key==='Enter')App.submitDaily()">
                <button class="btn btn-primary btn-sm" onclick="App.submitDaily()">${T("Ответить")}</button>
              </div>
              <div class="feedback" id="fb-daily"></div>`}
        </div>
      </section>`;
  }
  function submitDaily() {
    const input = document.getElementById("daily-input");
    const fb = document.getElementById("fb-daily");
    if (!input || !input.value.trim()) { if (fb) fb.innerHTML = `<span class="fb-warn">${T("Введите ответ")}</span>`; return; }
    const q = Progress.dailyToday();
    if (checkAnswer({ answers: q.answers }, input.value)) {
      const res = Progress.solveDaily();
      celebrate(res);
      render();
    } else {
      if (fb) fb.innerHTML = `<span class="fb-err">✗ Неверно. Попробуйте ещё раз.</span>`;
    }
  }

  function courseCard(course) {
    const p = Progress.courseProgress(course);
    const unlocked = Progress.courseUnlocked(course);
    const missing = Progress.missingPrereqs(course);
    const onclick = unlocked
      ? `App.go('course',{courseId:'${course.id}'})`
      : `App.toast('🔒 Сначала пройдите: ${missing.map((m) => m.title).join(", ")}')`;
    return `
      <div class="course-card reveal ${unlocked ? "" : "locked"} ${p.pct === 100 ? "completed" : ""}" style="--c:${course.color}" onclick="${onclick}" tabindex="0" role="button" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}">
        <div class="cc-top">
          <span class="cc-icon">${Icon.course(course.id)}</span>
          <span class="cc-level">${unlocked ? "" : Icon.ui("lock")}${TL(course.level)}</span>
        </div>
        <h3>${course.title}</h3>
        <p>${course.summary}</p>
        <div class="cc-tags">${course.tags.map((t) => `<span>#${TG(t)}</span>`).join("")}</div>
        ${unlocked ? `
        <div class="cc-progress">
          <div class="xp-bar"><span style="width:${p.pct}%"></span></div>
          <span class="cc-pct">${p.pct === 100 ? "✓ " + T("Пройдено") : p.done + "/" + p.total + " · " + p.pct + "%"}</span>
        </div>`
        : `<div class="cc-lock">${Icon.ui("lock")} ${T("Требуется")}: ${missing.map((m) => m.title).join(", ")}</div>`}
      </div>`;
  }

  const catalog = { q: "", level: "all", sort: "default" };
  const LEVELS = ["all", "Новичок", "Средний", "Сложный"];

  function filteredCourses() {
    let list = COURSES.slice();
    const q = catalog.q.trim().toLowerCase();
    if (q) list = list.filter((c) =>
      (c.title + " " + c.summary + " " + c.tags.join(" ")).toLowerCase().includes(q));
    if (catalog.level !== "all") list = list.filter((c) => c.level === catalog.level);
    if (catalog.sort === "progress")
      list.sort((a, b) => Progress.courseProgress(b).pct - Progress.courseProgress(a).pct);
    else if (catalog.sort === "level") {
      const order = { "Новичок": 0, "Средний": 1, "Сложный": 2 };
      list.sort((a, b) => order[a.level] - order[b.level]);
    }
    return list;
  }

  function renderCourseGrid() {
    const grid = document.getElementById("course-grid");
    if (!grid) return;
    const list = filteredCourses();
    grid.innerHTML = list.length
      ? list.map(courseCard).join("")
      : emptyState("🔍", T("Ничего не найдено"), T("Попробуйте изменить запрос или фильтр."), `<button class="btn btn-ghost btn-sm" onclick="App.catalogReset()">${T("Сбросить фильтры")}</button>`);
    const count = document.getElementById("catalog-count");
    if (count) count.textContent = `${list.length} ${T("из")} ${COURSES.length}`;
    observeReveal();
  }

  function renderCourses() {
    root().innerHTML = `
      <section class="section">
        <div class="page-title">
          <h1>${T("Каталог курсов")}</h1>
          <p>${T("Выберите направление. Сложные курсы открываются по мере прохождения предыдущих.")}</p>
        </div>
        <div class="catalog-toolbar">
          <div class="search-box">
            ${Icon.ui("quest")}
            <input id="catalog-search" type="text" placeholder="${T("Поиск по курсам и темам…")}" value="${catalog.q}"
                   oninput="App.catalogSearch(this.value)">
          </div>
          <div class="filter-chips">
            ${LEVELS.map((lv) => `<button class="chip ${catalog.level === lv ? "active" : ""}" data-lv="${lv}" onclick="App.catalogLevel('${lv}')">${lv === "all" ? T("Все уровни") : TL(lv)}</button>`).join("")}
          </div>
          <select class="sort-select" aria-label="${T("Сортировка")}" onchange="App.catalogSort(this.value)">
            <option value="default" ${catalog.sort === "default" ? "selected" : ""}>${T("По умолчанию")}</option>
            <option value="progress" ${catalog.sort === "progress" ? "selected" : ""}>${T("По прогрессу")}</option>
            <option value="level" ${catalog.sort === "level" ? "selected" : ""}>${T("По сложности")}</option>
          </select>
        </div>
        <div class="catalog-meta"><span id="catalog-count"></span></div>
        <div class="course-grid" id="course-grid"></div>
      </section>`;
    renderCourseGrid();
    highlightNav();
  }
  function catalogSearch(v) { catalog.q = v; renderCourseGrid(); }
  function catalogReset() {
    catalog.q = ""; catalog.level = "all";
    const i = document.getElementById("catalog-search"); if (i) i.value = "";
    document.querySelectorAll(".chip[data-lv]").forEach((b) => b.classList.toggle("active", b.dataset.lv === "all"));
    renderCourseGrid();
  }
  function emptyState(ic, title, text, action) {
    return `<div class="empty-state"><div class="es-ic" aria-hidden="true">${ic}</div><h3>${title}</h3>${text ? `<p>${text}</p>` : ""}${action || ""}</div>`;
  }
  function catalogLevel(lv) {
    catalog.level = lv;
    document.querySelectorAll(".filter-chips .chip").forEach((el) =>
      el.classList.toggle("active", el.getAttribute("data-lv") === lv));
    renderCourseGrid();
  }
  function catalogSort(v) { catalog.sort = v; renderCourseGrid(); }

  function renderCourse(courseId) {
    const course = COURSES.find((c) => c.id === courseId);
    if (!course) return renderNotFound();
    const p = Progress.courseProgress(course);

    if (!Progress.courseUnlocked(course)) {
      const missing = Progress.missingPrereqs(course);
      root().innerHTML = `
        <section class="section">
          ${crumbs([["home", T("Главная")], ["courses", T("Курсы")], [null, course.title]])}
          <div class="locked-screen card">
            <div class="ls-icon">${Icon.ui("lock")}</div>
            <h1><span class="ls-course-ic" style="color:${course.color}">${Icon.course(course.id)}</span> ${course.title}</h1>
            <p class="ls-sub">${T("Этот курс уровня")} «${T(course.level)}» ${T("откроется, когда вы завершите предыдущие. Так сложность растёт постепенно.")}</p>
            <h3>${T("Нужно пройти на 100%:")}</h3>
            <div class="ls-prereq">
              ${missing.map((m) => {
                const mp = Progress.courseProgress(m);
                return `<div class="ls-row" onclick="App.go('course',{courseId:'${m.id}'})">
                  <span class="cpl-ic" style="color:${m.color}">${Icon.course(m.id)}</span>
                  <div class="cpl-body">
                    <div class="cpl-head"><b>${m.title}</b><span>${mp.pct}%</span></div>
                    <div class="xp-bar"><span style="width:${mp.pct}%;background:${m.color}"></span></div>
                  </div>
                  <span class="ls-go">${T("Открыть")} →</span>
                </div>`;
              }).join("")}
            </div>
          </div>
        </section>`;
      highlightNav();
      return;
    }

    root().innerHTML = `
      <section class="section">
        ${crumbs([["home", T("Главная")], ["courses", T("Курсы")], [null, course.title]])}
        <div class="course-head" style="--c:${course.color}">
          <span class="ch-icon">${Icon.course(course.id)}</span>
          <div>
            <span class="cc-level">${TL(course.level)}</span>
            <h1>${course.title}</h1>
            <p>${course.summary}</p>
            <div class="cc-progress wide">
              <div class="xp-bar"><span style="width:${p.pct}%"></span></div>
              <span class="cc-pct">${p.done}/${p.total} ${T("заданий")} · ${p.pct}%</span>
            </div>
          </div>
        </div>
        ${p.pct === 100 ? certificateCard(course) + nextCourseCard(course) : p.pct >= 50 ? bossBanner(course) : ""}
        <h2 class="rooms-title">${T("Комнаты курса")}</h2>
        <div class="room-list">
          ${course.rooms.map((room, i) => roomRow(course, room, i)).join("")}
        </div>
      </section>`;
    highlightNav();
  }

  // Рекомендация следующего курса по сложности
  function recommendNext(excludeId) {
    const order = { "Новичок": 0, "Средний": 1, "Сложный": 2 };
    const idx = (c) => COURSES.indexOf(c);
    const incomplete = COURSES.filter((c) => c.id !== excludeId && Progress.courseProgress(c).pct < 100);
    const unlocked = incomplete.filter((c) => Progress.courseUnlocked(c))
      .sort((a, b) => (order[a.level] - order[b.level]) || (idx(a) - idx(b)));
    if (unlocked.length) return { course: unlocked[0], unlocked: true };
    // ничего не открыто — покажем ближайший заблокированный (нужно добить предпосылки)
    const locked = incomplete
      .sort((a, b) => (order[a.level] - order[b.level]) || (idx(a) - idx(b)));
    if (locked.length) return { course: locked[0], unlocked: false };
    return null;
  }

  function nextCourseCard(currentCourse) {
    const rec = recommendNext(currentCourse.id);
    if (!rec) {
      return `
        <div class="next-course-card all-done">
          <span class="nc-ic">${Icon.ui("shield")}</span>
          <div class="nc-body">
            <span class="nc-label">${T("Поздравляем!")}</span>
            <h3>${T("Вы прошли все курсы платформы")}</h3>
            <p>${T("Так держать — вернитесь к повторению, чтобы закрепить знания.")}</p>
          </div>
          <button class="btn btn-primary" onclick="App.go('review')">${T("Повторение")} ${Icon.ui("arrow")}</button>
        </div>`;
    }
    const c = rec.course, p = Progress.courseProgress(c);
    if (rec.unlocked) {
      return `
        <div class="next-course-card" style="--c:${c.color}" onclick="App.go('course',{courseId:'${c.id}'})">
          <span class="nc-ic" style="color:${c.color}">${Icon.course(c.id)}</span>
          <div class="nc-body">
            <span class="nc-label">${T("Следующий курс по сложности")}</span>
            <h3>${c.title}</h3>
            <p>${TL(c.level)} · ${c.summary}</p>
          </div>
          <button class="btn btn-primary" onclick="event.stopPropagation();App.go('course',{courseId:'${c.id}'})">${p.done > 0 ? T("Продолжить") : T("Начать курс")} ${Icon.ui("arrow")}</button>
        </div>`;
    }
    const missing = Progress.missingPrereqs(c);
    return `
      <div class="next-course-card locked" style="--c:${c.color}" onclick="App.go('course',{courseId:'${c.id}'})">
        <span class="nc-ic">${Icon.ui("lock")}</span>
        <div class="nc-body">
          <span class="nc-label">${T("Дальше открывается")}</span>
          <h3>${c.title}</h3>
          <p>${T("Требуется")}: ${missing.map((m) => m.title).join(", ")}</p>
        </div>
        <button class="btn btn-ghost" onclick="event.stopPropagation();App.go('course',{courseId:'${c.id}'})">${T("Подробнее")} ${Icon.ui("arrow")}</button>
      </div>`;
  }

  function certificateCard(course) {
    return `
      <div class="cert-card" style="--c:${course.color}">
        <div class="cert-ribbon">${Icon.ui("check")} ${T("Курс пройден")}</div>
        <div class="cert-ic">${Icon.course(course.id)}</div>
        <div class="cert-body">
          <h3>${T("Поздравляем!")}</h3>
          <p>${T("Вы завершили курс")} «${course.title}» ${T("и заработали")} ${Progress.courseXP(course)} XP.${Progress.examPassed(course.id) ? " " + T("Экзамен сдан на") + " " + Progress.examBest(course.id) + "%." : ""}</p>
        </div>
        <div class="cert-actions">
          <button class="btn btn-ghost btn-sm" onclick="App.go('exam',{courseId:'${course.id}'})">${Icon.ui("quest")} ${Progress.examPassed(course.id) ? T("Пересдать экзамен") : T("Сдать экзамен")}</button>
          <button class="btn btn-ghost btn-sm" onclick="App.go('boss',{courseId:'${course.id}'})">⚔️ ${T("Боссфайт")}</button>
          <button class="btn btn-primary btn-sm" onclick="App.downloadCertificate('${course.id}','pdf')">${Icon.ui("progress")} ${T("Сертификат")} PDF</button>
          <button class="btn btn-ghost btn-sm" onclick="App.downloadCertificate('${course.id}','png')">PNG</button>
        </div>
      </div>`;
  }

  function roomRow(course, room, i) {
    const done = room.tasks.filter((t) => Progress.isDone(t.id)).length;
    const total = room.tasks.length;
    const complete = done === total;
    const locked = i > 0 && !Progress.roomCompleted(course.rooms[i - 1]);
    return `
      <div class="room-row ${complete ? "done" : ""} ${locked ? "locked" : ""}"
           onclick="${locked ? "App.toast('Сначала завершите предыдущую комнату 🔒')" : `App.go('room',{courseId:'${course.id}',roomId:'${room.id}'})`}">
        <span class="rr-num">${complete ? Icon.ui("check") : locked ? Icon.ui("lock") : i + 1}</span>
        <div class="rr-body">
          <h3>${room.title}</h3>
          <span class="rr-meta">${done}/${total} ${T("заданий")}</span>
        </div>
        <div class="rr-bar"><span style="width:${total ? (done / total) * 100 : 0}%"></span></div>
      </div>`;
  }

  function renderRoom(courseId, roomId) {
    const course = COURSES.find((c) => c.id === courseId);
    const room = course && course.rooms.find((r) => r.id === roomId);
    if (!room) return course ? renderNotFound(course) : renderNotFound();
    const idx = course.rooms.indexOf(room);
    const nextRoom = course.rooms[idx + 1];
    const hasSandbox = room.tasks.some((t) => t.sandbox);

    root().innerHTML = `
      <section class="section room-view">
        ${crumbs([["home", T("Главная")], ["courses", T("Курсы")], [{ courseId: course.id }, course.title], [null, room.title]])}
        <div class="room-header">
          <span class="rh-tag">${T("Комната")} ${idx + 1}/${course.rooms.length}</span>
          <h1>${room.title}</h1>
          <div class="room-meta">
            <a class="room-chip notes-chip" onclick="App.go('notes')" title="${T("Мои заметки")}">📝 <span id="notes-count">${Progress.notes().length}</span></a>
            <span class="room-chip timer-chip">${Icon.ui("progress")} <span id="room-timer">00:00</span></span>
            <span class="room-chip nohint-chip ${Progress.roomUsedNoHints(room) ? "on" : "off"}">
              ${Icon.ui("bolt")} ${Progress.roomUsedNoHints(room) ? T("Без подсказок") : T("Подсказки использованы")}
            </span>
          </div>
        </div>
        <div class="room-columns">
          <div class="lesson-col">
            <div class="lesson card"><h2 class="sr-only">${T("Теория")}</h2>${room.intro}</div>
            ${hasSandbox ? inlineTerminal() : ""}
          </div>
          <div class="tasks">
            <h2>${T("Задания")}</h2>
            <div id="task-list">
              ${room.tasks.map((t) => taskBlock(course, t)).join("")}
            </div>
            ${Progress.roomCompleted(room) ? completionBanner(course, room, nextRoom) : ""}
          </div>
        </div>
      </section>`;
    highlightNav();
    addCopyButtons();
    buildLessonTOC();
    startRoomTimer(Progress.roomCompleted(room));
    if (hasSandbox) {
      const out = document.getElementById("term-out"), inp = document.getElementById("term-input");
      if (out && inp) {
        Sandbox.init(out, inp);
        Sandbox.setHook(null); // без авто-проверки — проверяем по кнопке «Проверить»
      }
    }
    bindNoteSelection(course, room);
    // Монтируем интерактивные лаборатории
    room.tasks.forEach((tk) => {
      if (tk.type !== "lab" || Progress.isDone(tk.id)) return;
      const box = document.getElementById("lab-" + tk.id);
      if (box && window.Labs) Labs.mount(tk.lab, box, () => {
        if (Progress.isDone(tk.id)) return;
        Progress.recordAttempt(tk.id, true);
        const res = Progress.completeTask(tk, course.id);
        celebrate(res);
        toast("✓ " + tk.title);
        const el = document.getElementById("task-" + tk.id);
        if (el) el.outerHTML = taskBlock(course, tk);
        if (Progress.roomCompleted(room)) setTimeout(() => renderRoom(course.id, room.id), 900);
      });
    });

    // проверка "без подсказок"
    if (Progress.roomCompleted(room) && Progress.roomUsedNoHints(room)) {
      Progress.unlockAchievement("no_hints");
    }
  }

  // Авто-проверка заданий-песочниц по выводу терминала
  function autoCheckSandbox(course, room, cmd, output) {
    const cl = (cmd || "").toLowerCase();
    const toks = cl.split(/\s+/).filter(Boolean);
    let roomCompletedNow = false;
    room.tasks.forEach((task) => {
      if (!task.sandbox || Progress.isDone(task.id)) return;
      const answers = task.answers || (task.answer ? [task.answer] : []);
      let match = false;
      if (task.type === "flag") {
        match = answers.some((a) => (output || "").includes(a)); // флаги — точное вхождение в вывод
      } else {
        match = answers.some((a) => { const x = String(a).toLowerCase(); return toks.includes(x) || cl.includes(x); });
      }
      if (!match) return;
      Progress.recordAttempt(task.id, true);
      const res = Progress.completeTask(task, course.id);
      celebrate(res);
      toast("✓ " + task.title + " — " + T("решено из терминала"));
      const el = document.getElementById("task-" + task.id);
      if (el) el.outerHTML = taskBlock(course, task);
      if (Progress.roomCompleted(room)) roomCompletedNow = true;
    });
    // если комната завершилась — полный перерендер (покажет баннер, откроет следующую)
    if (roomCompletedNow) setTimeout(() => renderRoom(course.id, room.id), 900);
  }

  // Встроенный в комнату терминал (для заданий с песочницей)
  function inlineTerminal() {
    return `
      <div class="term-wrap card inline-term">
        <div class="term-bar">
          <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
          <span class="term-title">${T("Попробуйте команды прямо здесь")}</span>
          <button id="shell-toggle" class="shell-toggle" onclick="App.toggleShell()" title="cmd / PowerShell">cmd</button>
        </div>
        <div class="term-body inline" id="term-body">
          <div id="term-out"></div>
          <div class="term-input-row">
            <span class="term-path" id="term-cwd">C:\\Users\\hacker</span><span class="term-prompt">&gt;</span>
            <input type="text" id="term-input" aria-label="${T("Команда терминала")}" autocomplete="off" spellcheck="false">
          </div>
        </div>
      </div>`;
  }

  // Оглавление урока: строится из заголовков .lesson h3/h4
  function buildLessonTOC() {
    const lesson = document.querySelector(".lesson");
    const col = document.querySelector(".lesson-col");
    if (!lesson || !col) return;
    const heads = [...lesson.querySelectorAll("h3, h4")];
    if (heads.length < 3) return; // короткий урок — оглавление ни к чему
    const slug = (s) => s.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 40);
    const items = heads.map((h, i) => {
      const id = "ls-" + i + "-" + slug(h.textContent);
      h.id = id;
      return { id, text: h.textContent, sub: h.tagName === "H4" };
    });
    const nav = document.createElement("nav");
    nav.className = "lesson-toc";
    nav.innerHTML = `<div class="ltoc-title">${escapeHtml(T("Содержание"))}</div>` +
      items.map((it) => `<a href="#${it.id}" class="ltoc-link ${it.sub ? "sub" : ""}" data-id="${it.id}">${escapeHtml(it.text)}</a>`).join("");
    col.insertBefore(nav, col.firstChild);
    nav.querySelectorAll(".ltoc-link").forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      const el = document.getElementById(a.dataset.id);
      if (el) { const y = el.getBoundingClientRect().top + window.scrollY - 80; window.scrollTo({ top: y, behavior: "smooth" }); }
    }));
    mountBackToTop();
  }
  function mountBackToTop() {
    if (document.getElementById("to-top")) return;
    const btn = document.createElement("button");
    btn.id = "to-top"; btn.className = "to-top"; btn.type = "button";
    btn.setAttribute("aria-label", T("Наверх"));
    btn.innerHTML = "↑";
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    document.body.appendChild(btn);
    const onScroll = () => btn.classList.toggle("show", window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    // убрать при уходе со страницы комнаты
    const cleanup = () => { if (current.view !== "room") { btn.remove(); window.removeEventListener("scroll", onScroll); window.removeEventListener("hashchange", cleanup); } };
    window.addEventListener("hashchange", cleanup);
  }

  // Кнопка «копировать» на блоках кода в уроке
  function addCopyButtons() {
    document.querySelectorAll(".lesson pre").forEach((pre) => {
      if (pre.querySelector(".copy-btn")) return;
      const btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.type = "button";
      btn.textContent = T("копировать");
      btn.addEventListener("click", () => {
        const text = pre.innerText.replace(new RegExp(T("копировать") + "|" + T("скопировано") + "$", "g"), "").trim();
        const done = () => { btn.textContent = T("скопировано"); setTimeout(() => (btn.textContent = T("копировать")), 1400); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(done);
        else { try { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); done(); } catch (e) {} }
      });
      pre.appendChild(btn);
    });
  }

  // Таймер комнаты
  let roomTimerId = null, roomStartTs = 0;
  function stopRoomTimer() { if (roomTimerId) { clearInterval(roomTimerId); roomTimerId = null; } }
  function startRoomTimer(frozen) {
    stopRoomTimer();
    const el = document.getElementById("room-timer");
    if (!el) return;
    if (frozen) { el.textContent = T("готово"); return; }
    roomStartTs = Date.now();
    const tick = () => {
      const s = Math.floor((Date.now() - roomStartTs) / 1000);
      const mm = String(Math.floor(s / 60)).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      const t = document.getElementById("room-timer");
      if (t) t.textContent = `${mm}:${ss}`; else stopRoomTimer();
    };
    tick();
    roomTimerId = setInterval(tick, 1000);
  }

  // Скачать сертификат курса как PNG
  // Canvas → одностраничный PDF (встраиваем JPEG, без внешних библиотек)
  function canvasToPdfBlob(cv) {
    const jpeg = cv.toDataURL("image/jpeg", 0.92).split(",")[1];
    const bin = atob(jpeg); // бинарная строка JPEG (по байту на символ)
    const pw = 842, ph = Math.round(pw * (cv.height / cv.width)); // A4-landscape по ширине
    const parts = [];
    const offsets = [];
    let len = 0;
    const push = (s) => { parts.push(s); len += s.length; };
    const obj = (n, body) => { offsets[n] = len; push(n + " 0 obj\n" + body + "\nendobj\n"); };
    push("%PDF-1.3\n%\xFF\xFF\xFF\xFF\n");
    obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    obj(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + pw + " " + ph + "] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>");
    const content = "q\n" + pw + " 0 0 " + ph + " 0 0 cm\n/Im0 Do\nQ\n";
    obj(4, "<< /Length " + content.length + " >>\nstream\n" + content + "endstream");
    // объект изображения с бинарным потоком
    offsets[5] = len;
    push("5 0 obj\n<< /Type /XObject /Subtype /Image /Width " + cv.width + " /Height " + cv.height +
      " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + bin.length + " >>\nstream\n");
    push(bin);
    push("\nendstream\nendobj\n");
    const xrefStart = len;
    let xref = "xref\n0 6\n0000000000 65535 f \n";
    for (let i = 1; i <= 5; i++) xref += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
    push(xref);
    push("trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xrefStart + "\n%%EOF");
    const bytes = new Uint8Array(len);
    let p = 0;
    for (const s of parts) { for (let i = 0; i < s.length; i++) bytes[p++] = s.charCodeAt(i) & 0xff; }
    return new Blob([bytes], { type: "application/pdf" });
  }
  function saveCanvas(cv, baseName, fmt) {
    const a = document.createElement("a");
    if (fmt === "pdf") {
      const blob = canvasToPdfBlob(cv);
      a.href = URL.createObjectURL(blob); a.download = baseName + ".pdf";
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 200);
    } else {
      a.href = cv.toDataURL("image/png"); a.download = baseName + ".png";
      document.body.appendChild(a); a.click(); a.remove();
    }
  }

  // Палитра сертификата: светлая/тёмная по текущей теме
  function certPalette() {
    const dark = currentTheme() === "dark";
    return dark
      ? { dark: true, bg: "#17120d", ink: "#f3ece2", sub: "#cabfb2", muted: "#9a8d7e", line: "#3a2f24", cell: "#221b14", ok: "#4fc27e", goldCell: "#241d12", goldLine: "#5a4820" }
      : { dark: false, bg: "#fffdfb", ink: "#1a1613", sub: "#4b433c", muted: "#8c8178", line: "#ece5dd", cell: "#fff6f0", ok: "#1f8a4c", goldCell: "#fff8ec", goldLine: "#f0dcae" };
  }

  // Стабильный серийный номер сертификата из строки-семени (детерминированный)
  function certSerial(seed) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 7);
  }

  // Капстоун-сертификат: выдаётся при 100% по всем курсам
  function downloadMasterCertificate(fmt) {
    const s = Progress.overallStats();
    if (s.coursesDone < s.coursesTotal) { toast(T("Завершите все курсы, чтобы получить диплом")); return; }
    const W = 1240, H = 877, scale = 2;
    const cv = document.createElement("canvas");
    cv.width = W * scale; cv.height = H * scale;
    const g = cv.getContext("2d"); g.scale(scale, scale);
    const P = certPalette();
    const cx = W / 2;
    const en = window.I18N && I18N.current() === "en";
    const L = (ru, e) => (en ? e : ru);
    const date = Progress.completedAtISO();
    const gold = "#c9951f", goldL = "#e9c15a";
    // фон
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, P.dark ? "#1a140d" : "#fffdf8"); bg.addColorStop(1, P.dark ? "#120e09" : "#fff7ea");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // золотые рамки
    g.strokeStyle = gold; g.lineWidth = 7; g.strokeRect(26, 26, W - 52, H - 52);
    g.strokeStyle = goldL; g.lineWidth = 2; g.strokeRect(42, 42, W - 84, H - 84);
    g.textAlign = "center";
    // щит
    g.save(); g.translate(cx - 26, 70); g.scale(52 / 24, 52 / 24);
    const sg = g.createLinearGradient(0, 0, 24, 24); sg.addColorStop(0, goldL); sg.addColorStop(1, gold);
    g.fillStyle = sg; g.fill(new Path2D("M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z"));
    g.strokeStyle = "#fff"; g.lineWidth = 1.8; g.lineCap = "round"; g.lineJoin = "round"; g.stroke(new Path2D("M8 12h2l1.5 3 2-6 1 3H16"));
    g.restore();
    g.fillStyle = gold; g.font = "700 20px Inter, sans-serif";
    g.fillText(L("CYBERPATH · ДИПЛОМ МАСТЕРА", "CYBERPATH · MASTER DIPLOMA"), cx, 162);
    g.fillStyle = P.sub; g.font = "400 24px Inter, sans-serif";
    g.fillText(L("Настоящим подтверждается, что", "This is to certify that"), cx, 214);
    g.fillStyle = P.ink; g.font = "800 54px Sora, Inter, sans-serif";
    g.fillText(displayName().slice(0, 30), cx, 282);
    g.strokeStyle = goldL; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - 300, 304); g.lineTo(cx + 300, 304); g.stroke();
    g.fillStyle = P.sub; g.font = "400 23px Inter, sans-serif";
    g.fillText(L("прошёл(-ла) полную программу CyberPath и освоил(-а) все " + s.coursesTotal + " курсов", "has completed the full CyberPath program, mastering all " + s.coursesTotal + " courses"), cx, 344);
    // статистика
    const acc = Progress.accuracyOverall();
    const cells = [
      [String(s.coursesTotal), L("курсов", "courses")],
      [String(s.tasksTotal), L("заданий", "tasks")],
      [String(s.xp), "XP"],
      [s.achievements + "/" + s.achievementsTotal, L("достижений", "achievements")],
      [acc.total ? acc.pct + "%" : "—", L("точность", "accuracy")],
    ];
    const cw = 198, gap = 14, x0 = cx - (cells.length * cw + (cells.length - 1) * gap) / 2;
    cells.forEach((c, i) => {
      const x = x0 + i * (cw + gap), y = 378;
      g.fillStyle = P.goldCell; roundRect(g, x, y, cw, 78, 13); g.fill();
      g.strokeStyle = P.goldLine; g.lineWidth = 1.5; roundRect(g, x, y, cw, 78, 13); g.stroke();
      g.fillStyle = "#b8860b"; g.font = "800 27px Sora, Inter, sans-serif"; g.fillText(c[0], x + cw / 2, y + 36);
      g.fillStyle = "#8c8178"; g.font = "600 14px Inter, sans-serif"; g.fillText(c[1], x + cw / 2, y + 60);
    });
    // сетка курсов (5 колонок × 3 ряда)
    const cols = 5, cellW = (W - 150) / cols, gy0 = 498, gh = 42;
    COURSES.forEach((c, i) => {
      const col = i % cols, row = (i / cols) | 0;
      const x = 80 + col * cellW, y = gy0 + row * gh;
      g.fillStyle = "#1f9d61"; g.textAlign = "left"; g.font = "700 15px Inter, sans-serif";
      g.fillText("✓", x, y + 18);
      g.fillStyle = P.sub; g.font = "500 13px Inter, sans-serif";
      let name = T(c.title); if (name.length > 25) name = name.slice(0, 24) + "…";
      g.fillText(name, x + 20, y + 18);
    });
    g.textAlign = "center";
    // печать
    g.beginPath(); g.arc(cx, 712, 42, 0, Math.PI * 2); g.strokeStyle = gold; g.lineWidth = 3; g.stroke();
    g.fillStyle = gold; g.font = "800 30px Sora, Inter, sans-serif"; g.fillText("★", cx, 724);
    // дата + серийник
    const serial = "CP-MASTER-" + date.replace(/-/g, "") + "-" + certSerial("master|" + date + "|" + displayName());
    g.fillStyle = P.ink; g.font = "700 20px Inter, sans-serif";
    g.fillText(date, cx - 330, 712); g.fillText(serial, cx + 330, 712);
    g.fillStyle = P.muted; g.font = "500 15px Inter, sans-serif";
    g.fillText(L("дата выдачи", "date issued"), cx - 330, 736);
    g.fillText(L("номер диплома", "diploma ID"), cx + 330, 736);
    g.font = "500 17px Inter, sans-serif";
    g.fillText(L("cyberpath · учись этично, применяй ответственно", "cyberpath · learn ethically, apply responsibly"), cx, 812);

    saveCanvas(cv, "CyberPath-master-diploma", fmt);
    toast(T("Диплом мастера скачан"));
  }

  function downloadCertificate(courseId, fmt) {
    const course = COURSES.find((c) => c.id === courseId);
    if (!course) return;
    const W = 1200, H = 848, scale = 2;
    const cv = document.createElement("canvas");
    cv.width = W * scale; cv.height = H * scale;
    const g = cv.getContext("2d");
    g.scale(scale, scale);
    const P = certPalette();
    // фон
    g.fillStyle = P.bg; g.fillRect(0, 0, W, H);
    // рамка
    g.strokeStyle = course.color; g.lineWidth = 6; g.strokeRect(28, 28, W - 56, H - 56);
    g.strokeStyle = P.line; g.lineWidth = 1.5; g.strokeRect(44, 44, W - 88, H - 88);
    const cx = W / 2;
    const en = window.I18N && I18N.current() === "en";
    const L = (ru, e) => (en ? e : ru);
    const date = Progress.completedAtISO();
    const certId = "CP-" + course.id.toUpperCase().slice(0, 4) + "-" + date.replace(/-/g, "") + "-" + certSerial(course.id + "|" + date + "|" + displayName());
    g.textAlign = "center";
    // логотип-щит
    g.save(); g.translate(cx - 22, 72); g.scale(44 / 24, 44 / 24);
    g.fillStyle = "#f2620a"; g.fill(new Path2D("M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z"));
    g.strokeStyle = P.bg; g.lineWidth = 1.8; g.lineCap = "round"; g.lineJoin = "round"; g.stroke(new Path2D("M9 12l2 2 4-4"));
    g.restore();
    g.fillStyle = P.muted; g.font = "700 20px Inter, sans-serif";
    g.fillText(L("CYBERPATH · СЕРТИФИКАТ О ПРОХОЖДЕНИИ КУРСА", "CYBERPATH · CERTIFICATE OF COMPLETION"), cx, 160);
    g.fillStyle = P.sub; g.font = "400 24px Inter, sans-serif";
    g.fillText(L("Настоящим подтверждается, что", "This is to certify that"), cx, 222);
    g.fillStyle = P.ink; g.font = "800 50px Sora, Inter, sans-serif";
    g.fillText(displayName().slice(0, 32), cx, 290);
    g.strokeStyle = P.line; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - 260, 312); g.lineTo(cx + 260, 312); g.stroke();
    g.fillStyle = P.sub; g.font = "400 24px Inter, sans-serif";
    g.fillText(L("успешно прошёл(-ла) курс", "has successfully completed the course"), cx, 356);
    g.fillStyle = course.color; g.font = "800 52px Sora, Inter, sans-serif";
    wrapText(g, "«" + T(course.title) + "»", cx, 430, W - 220, 58);
    // плашки со статистикой
    const total = totalTasksInCourse(course);
    const m = Progress.courseMastery(course);
    const cells = [
      [String(course.rooms.length), L("комнат", "rooms")],
      [String(total), L("заданий", "tasks")],
      [Progress.courseXP(course) + " XP", L("заработано", "earned")],
      [m.score + "/100", L("освоение", "mastery")],
    ];
    const cw = 190, gap = 18, x0 = cx - (cells.length * cw + (cells.length - 1) * gap) / 2;
    cells.forEach((c, i) => {
      const x = x0 + i * (cw + gap), y = 500;
      g.fillStyle = P.cell; roundRect(g, x, y, cw, 84, 14); g.fill();
      g.fillStyle = P.ink; g.font = "800 28px Sora, Inter, sans-serif"; g.fillText(c[0], x + cw / 2, y + 40);
      g.fillStyle = P.muted; g.font = "600 16px Inter, sans-serif"; g.fillText(c[1], x + cw / 2, y + 66);
    });
    if (m.exam) { g.fillStyle = P.ok; g.font = "700 18px Inter, sans-serif"; g.fillText("✓ " + L("Итоговый экзамен сдан", "Final exam passed"), cx, 624); }
    // нижняя строка: дата · печать · ID
    g.beginPath(); g.arc(cx, 690, 40, 0, Math.PI * 2); g.strokeStyle = course.color; g.lineWidth = 3; g.stroke();
    g.fillStyle = course.color; g.font = "800 28px Sora, Inter, sans-serif"; g.fillText("✓", cx, 700);
    g.fillStyle = P.ink; g.font = "700 20px Inter, sans-serif";
    g.fillText(date, cx - 300, 690);
    g.fillText(certId, cx + 300, 690);
    g.fillStyle = P.muted; g.font = "500 15px Inter, sans-serif";
    g.fillText(L("дата выдачи", "date issued"), cx - 300, 714);
    g.fillText(L("номер сертификата", "certificate ID"), cx + 300, 714);
    g.font = "500 17px Inter, sans-serif";
    g.fillText(L("cyberpath · учись этично, применяй ответственно", "cyberpath · learn ethically, apply responsibly"), cx, 784);

    saveCanvas(cv, "CyberPath-" + course.id + "-certificate", fmt);
    toast(T("Сертификат скачан"));
  }
  function wrapText(ctx, text, x, y, maxW, lh) {
    const words = text.split(" "); let line = "", yy = y;
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; }
      else line = test;
    }
    ctx.fillText(line, x, yy);
  }

  function taskBlock(course, task) {
    const done = Progress.isDone(task.id);
    const hintsShown = Progress.hintsUsedFor(task.id);
    const hints = task.hints || [];
    return `
      <div class="task ${done ? "done" : ""}" id="task-${task.id}">
        <div class="task-head">
          <span class="task-check">${done ? Icon.ui("check") : ""}</span>
          <div class="task-title">
            <h3 class="task-h">${task.title}</h3>
            <span class="task-points">+${task.points} XP</span>
            ${task.sandbox ? `<span class="task-sandbox" title="${T("Решается в песочнице")}">${Icon.ui("terminal")} ${T("песочница")}</span>` : ""}
          </div>
          <button class="task-report" onclick="App.reportTask('${course.id}','${task.id}')" title="${T("Сообщить об ошибке в задании")}" aria-label="${T("Сообщить об ошибке в задании")}">${Icon.ui("flag")}</button>
        </div>
        <p class="task-prompt">${task.prompt}</p>
        ${done
          ? `<div class="task-ok">${Icon.ui("check")} ${task.type === "info" ? T("Отмечено как прочитанное") : T("Верно! Решено") + " (+" + (Progress._state().earned[task.id] ?? task.points) + " XP)"}</div>` + whyBlock(task)
          : answerArea(course, task) + hintsArea(course, task)}
      </div>`;
  }

  /* «Сообщить об ошибке»: открывает GitHub Issue с уже заполненными курсом, заданием и ответом */
  const REPO_URL = "https://github.com/YpCIIIaK/cyber-sec";
  function reportTask(courseId, taskId) {
    const course = COURSES.find((c) => c.id === courseId);
    const room = course && course.rooms.find((r) => r.tasks.some((t) => t.id === taskId));
    const task = room && room.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const box = document.getElementById("task-" + taskId);
    const inp = box && box.querySelector("input[type=text], input:not([type]), textarea");
    const answer = inp && inp.value ? inp.value.trim().slice(0, 200) : "";
    const plain = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
    const lang = window.I18N ? I18N.current() : "ru";
    const title = `[${lang.toUpperCase()}] ${course.id}/${taskId}: `;
    const body = [
      `**Курс / Course:** ${plain(course.title)} (\`${course.id}\`)`,
      `**Комната / Room:** ${plain(room.title)} (\`${room.id}\`)`,
      `**Задание / Task:** ${plain(task.title)} (\`${taskId}\`)`,
      `**Вопрос / Prompt:** ${plain(task.prompt)}`,
      `**Мой ответ / My answer:** ${answer ? "`" + answer.replace(/`/g, "'") + "`" : "—"}`,
      `**Язык / Language:** ${lang}`,
      "",
      "**Что не так / What's wrong:**",
      "<!-- Опишите проблему: ответ не принимается, ошибка в тексте, неточность в фактах… -->",
      "",
    ].join("\n");
    const url = `${REPO_URL}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener");
  }

  /* Разбор после решения: почему ответ верный и почему другие варианты не подходят */
  function whyBlock(task) {
    const why = task.explanation;
    if (!why) return "";
    return `<div class="task-why">
        <div class="why-head">${Icon.ui("book")} ${T("Разбор: почему так")}</div>
        <div class="why-body">${why}</div>
      </div>`;
  }

  function answerArea(course, task) {
    const cid = course.id, tid = task.id;
    switch (task.type) {
      case "info":
        return `<button class="btn btn-primary btn-sm" onclick="App.markInfo('${cid}','${tid}')">${T("Понятно, дальше")}</button>`;
      case "lab":
        return `<div class="lab-box" id="lab-${tid}"></div>`;
      case "choice":
        return `
          <div class="choice-grid">
            ${task.options.map((o) => `<button class="choice-opt" onclick="App.submitChoice('${cid}','${tid}',this)">${o}</button>`).join("")}
          </div>
          <div class="feedback" id="fb-${tid}"></div>`;
      case "match": {
        const rights = shuffleSeed(task.pairs.map((p) => p[1]), tid);
        return `
          <div class="match-grid" id="match-${tid}">
            ${task.pairs.map((p, i) => `
              <div class="match-row">
                <span class="match-left">${p[0]}</span>
                <span class="match-arrow">${Icon.ui("arrow")}</span>
                <select class="match-sel" aria-label="${escapeAttr(p[0])}" data-left="${escapeAttr(p[0])}">
                  <option value="">${T("— выбрать —")}</option>
                  ${rights.map((r) => `<option value="${escapeAttr(r)}">${r}</option>`).join("")}
                </select>
              </div>`).join("")}
          </div>
          <button class="btn btn-primary btn-sm" onclick="App.submitMatch('${cid}','${tid}')">${T("Проверить")}</button>
          <div class="feedback" id="fb-${tid}"></div>`;
      }
      case "order": {
        const shuffled = shuffleSeed(task.items.slice(), tid);
        return `
          <div class="order-picked" id="order-picked-${tid}" data-count="0"></div>
          <div class="order-pool" id="order-pool-${tid}">
            ${shuffled.map((it) => `<button class="order-tok" onclick="App.orderPick('${cid}','${tid}',this)">${it}</button>`).join("")}
          </div>
          <button class="hint-btn" onclick="App.orderReset('${tid}')">${T("Сбросить")}</button>
          <div class="feedback" id="fb-${tid}"></div>`;
      }
      default: { // question / flag
        const ph = task.sandbox ? T("Ответ или выполните в терминале") : (task.type === "flag" ? "CYBER{...}" : T("Ваш ответ"));
        return `
          <div class="answer-row">
            <input type="text" id="ans-${tid}" placeholder="${ph}"
                   value="${escapeAttr(Progress.getDraft(tid))}"
                   oninput="App.saveDraft('${tid}',this.value)"
                   onkeydown="if(event.key==='Enter')App.submit('${cid}','${tid}')">
            <button class="btn btn-primary btn-sm" onclick="App.submit('${cid}','${tid}')">${T("Проверить")}</button>
          </div>
          ${task.sandbox ? `<div class="sandbox-check-hint">${T("Выполните команду в терминале слева — затем нажмите «Проверить».")}</div>` : ""}
          <div class="feedback" id="fb-${tid}"></div>`;
      }
    }
  }

  function hintsArea(course, task) {
    const hints = task.hints || [];
    if (!hints.length) return "";
    const shown = Progress.hintsUsedFor(task.id);
    const cost = Progress.hintPenalty();
    return `
      <div class="hints">
        ${hints.map((h, i) => i < shown
          ? `<div class="hint-shown">💡 ${h}</div>`
          : (i === shown ? `<button class="hint-btn" onclick="App.showHint('${task.id}',${i})">${T("Показать подсказку")} ${i + 1} (−${cost} XP)</button>` : "")
        ).join("")}
      </div>`;
  }

  // Детерминированное перемешивание по строковому seed (стабильно между ререндерами)
  function shuffleSeed(arr, seed) {
    let h = 0; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      const j = h % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function escapeAttr(s) { return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }
  function escapeHtml(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function completionBanner(course, room, nextRoom) {
    const courseDone = Progress.courseProgress(course).pct === 100;
    return `
      <div class="complete-banner">
        <div class="cb-icon">${Icon.ui("check")}</div>
        <h3>${T("Комната пройдена!")}</h3>
        <p>${T("Отличная работа.")} ${nextRoom ? T("Готовы к следующей?") : (courseDone ? T("Курс полностью пройден!") : T("Это была последняя комната курса!"))}</p>
        ${nextRoom
          ? `<button class="btn btn-primary" onclick="App.go('room',{courseId:'${course.id}',roomId:'${nextRoom.id}'})">${T("Следующая комната")} ${Icon.ui("arrow")}</button>`
          : `<button class="btn btn-primary" onclick="App.go('course',{courseId:'${course.id}'})">${T("К обзору курса")}</button>`}
      </div>`;
  }

  function renderSandbox() {
    root().innerHTML = `
      <section class="section">
        <div class="page-title">
          <h1>${T("Песочница")}</h1>
          <p>${T("Безопасный учебный терминал. Отрабатывайте команды и ищите флаги. Наберите")} <code>help</code>.</p>
        </div>
        <div class="term-wrap card">
          <div class="term-bar">
            <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
            <span class="term-title">CyberPath Sandbox</span>
            <button id="shell-toggle" class="shell-toggle" onclick="App.toggleShell()" title="${T("Переключить cmd / PowerShell")}">cmd</button>
          </div>
          <div class="term-body" id="term-body">
            <div id="term-out"></div>
            <div class="term-input-row">
              <span class="term-path" id="term-cwd">C:\\Users\\hacker</span><span class="term-prompt">&gt;</span>
              <input type="text" id="term-input" aria-label="${T("Команда терминала")}" autocomplete="off" spellcheck="false" autofocus>
            </div>
          </div>
        </div>
        <div class="sandbox-hints card">
          <h3>${T("Быстрый старт")}</h3>
          <div class="cheat">
            ${["help — все команды","dir / type — файлы","findstr CYBER файл","reg query …Run — реестр","certutil -decode <b64>","nmap 10.10.10.5","nslookup target.local","Tab — автодополнение"].map(c=>`<code>${T(c)}</code>`).join("")}
          </div>
        </div>

        <h2 class="rooms-title">${T("Квесты-машины")}</h2>
        <p class="missions-intro">${T("Многошаговые сценарии: выполняйте команды в терминале выше, находите флаг и вводите его здесь.")}</p>
        <div class="mission-list">
          ${MISSIONS.map(missionCard).join("")}
        </div>
      </section>`;
    highlightNav();
    Sandbox.init(document.getElementById("term-out"), document.getElementById("term-input"));
    Sandbox.setHook(null); // миссии сдаются по кнопке «Сдать флаг»
    setTimeout(() => { const i = document.getElementById("term-input"); if (i) i.focus(); }, 100);
  }

  /* ---------- Blue Team: учебные инструменты ---------- */
  function renderTools(tool) {
    if (!window.Toolkit) { root().innerHTML = `<section class="section"><p>${T("Инструменты недоступны.")}</p></section>`; return; }
    Toolkit.render(root(), {
      T, tool: tool || null,
      Progress,
      crumbs,
      go,
      icon: (n) => (typeof Icon !== "undefined" ? Icon.ui(n) : ""),
      award: (amount, once, statName) => {
        const res = Progress.awardBonus(amount, once, statName);
        if (res && !res.already) { celebrate(res); return true; }
        return false;
      },
      toast,
    });
    highlightNav();
  }

  // Авто-детект флагов миссий по выводу терминала (страница песочницы)
  function autoCheckMissions(output) {
    let any = false;
    MISSIONS.forEach((m) => {
      if (Progress.missionDone(m.id)) return;
      if ((output || "").includes(m.flag)) {
        const res = Progress.completeMission(m);
        celebrate(res);
        toast("✓ " + m.title + " — " + T("флаг найден!"));
        any = true;
      }
    });
    if (any) setTimeout(() => renderSandbox(), 700);
  }

  function missionCard(m) {
    const done = Progress.missionDone(m.id);
    return `
      <div class="mission-card ${done ? "done" : ""}">
        <div class="mission-head">
          <span class="mission-badge">${done ? Icon.ui("check") : Icon.ui("terminal")}</span>
          <div class="mission-title">
            <h3>${m.title}</h3>
            <span class="mission-meta">${m.level} · +${m.points} XP</span>
          </div>
          ${done ? `<span class="mission-solved">Пройдено</span>` : ""}
        </div>
        <p class="mission-brief">${m.brief}</p>
        <ol class="mission-steps">${m.steps.map((s) => `<li>${s}</li>`).join("")}</ol>
        ${done
          ? `<div class="task-ok">${Icon.ui("check")} Флаг принят (+${m.points} XP)</div>`
          : `<div class="answer-row mission-row">
               <input type="text" id="mflag-${m.id}" placeholder="CYBER{...}" onkeydown="if(event.key==='Enter')App.submitMission('${m.id}')">
               <button class="btn btn-primary btn-sm" onclick="App.submitMission('${m.id}')">${T("Сдать флаг")}</button>
             </div>
             <div class="feedback" id="fb-m-${m.id}"></div>`}
      </div>`;
  }
  function submitMission(id) {
    const m = MISSIONS.find((x) => x.id === id);
    const input = document.getElementById(`mflag-${id}`);
    const fb = document.getElementById(`fb-m-${id}`);
    if (!input || !input.value.trim()) { if (fb) fb.innerHTML = `<span class="fb-warn">Введите флаг</span>`; return; }
    if (input.value.trim() === m.flag) {
      const res = Progress.completeMission(m);
      celebrate(res);
      renderSandbox();
    } else if (fb) {
      fb.innerHTML = `<span class="fb-err">✗ Неверный флаг. Пройдите шаги в терминале выше.</span>`;
    }
  }
  function toggleShell() {
    Sandbox.toggleMode();
  }

  /* ---------- Глоссарий ---------- */
  const glossaryState = { q: "" };
  function renderGlossary() {
    root().innerHTML = `
      <section class="section">
        <div class="page-title">
          <h1>${T("Словарь терминов")}</h1>
          <p>${GLOSSARY.length} ${T("определений ключевых понятий кибербезопасности — по реальным стандартам.")}</p>
        </div>
        <div class="catalog-toolbar">
          <div class="search-box">
            ${Icon.ui("quest")}
            <input id="gloss-search" type="text" placeholder="${T("Поиск термина или определения…")}" value="${glossaryState.q}" oninput="App.glossarySearch(this.value)">
          </div>
        </div>
        <div id="gloss-list" class="gloss-list"></div>
      </section>`;
    renderGlossaryList();
    highlightNav();
  }
  function renderGlossaryList() {
    const el = document.getElementById("gloss-list");
    if (!el) return;
    const q = glossaryState.q.trim().toLowerCase();
    const items = GLOSSARY.filter((g) => !q || (g.term + " " + g.def + " " + g.cat).toLowerCase().includes(q))
      .sort((a, b) => a.term.localeCompare(b.term, "ru"));
    if (!items.length) { el.innerHTML = emptyState("📖", T("Термин не найден"), T("Проверьте написание или поищите по-английски — многие термины пишутся латиницей."), `<button class="btn btn-ghost btn-sm" onclick="App.glossaryClear()">${T("Очистить поиск")}</button>`); return; }
    const byCat = {};
    items.forEach((g) => (byCat[g.cat] = byCat[g.cat] || []).push(g));
    el.innerHTML = Object.keys(byCat).sort((a, b) => a.localeCompare(b, "ru")).map((cat) => `
      <div class="gloss-cat">
        <h3 class="gloss-cat-title">${cat}</h3>
        <div class="gloss-grid">
          ${byCat[cat].map((g) => `
            <div class="gloss-card reveal">
              <h4>${g.term}</h4>
              <p>${g.def}</p>
            </div>`).join("")}
        </div>
      </div>`).join("");
    observeReveal();
  }
  function glossarySearch(v) { glossaryState.q = v; renderGlossaryList(); }
  function glossaryClear() { const i = document.getElementById("gloss-search"); if (i) { i.value = ""; i.focus(); } glossarySearch(""); }

  /* ---------- Дорожная карта (граф зависимостей) ---------- */
  function renderRoadmap() {
    const tiers = { "Новичок": [], "Средний": [], "Сложный": [] };
    COURSES.forEach((c) => (tiers[c.level] || (tiers[c.level] = [])).push(c));
    const s = Progress.overallStats();
    root().innerHTML = `
      <section class="section">
        <div class="page-title">
          <h1>${T("Путь обучения")}</h1>
          <p>${T("Курсы выстроены по сложности: продвинутые открываются по мере прохождения предыдущих. Ваше звание —")} ${s.rank.icon} <b>${s.rank.name}</b>.</p>
        </div>
        ${skillTree()}
        <h2 class="rooms-title">${T("По уровням сложности")}</h2>
        <div class="roadmap">
          ${["Новичок", "Средний", "Сложный"].map((tier) => `
            <div class="tier">
              <div class="tier-label"><span>${T(tier)}</span></div>
              <div class="tier-courses">
                ${tiers[tier].map((c) => {
                  const p = Progress.courseProgress(c);
                  const unlocked = Progress.courseUnlocked(c);
                  const state = p.pct === 100 ? "done" : unlocked ? "open" : "locked";
                  return `<button class="rm-node ${state}" style="--c:${c.color}"
                            onclick="App.go('course',{courseId:'${c.id}'})"
                            title="${unlocked ? c.title : T("Требуется") + ": " + Progress.missingPrereqs(c).map((m) => m.title).join(", ")}">
                    <span class="rm-ic">${state === "locked" ? Icon.ui("lock") : Icon.course(c.id)}</span>
                    <span class="rm-name">${c.title}</span>
                    <span class="rm-pct">${state === "done" ? "✓ 100%" : unlocked ? p.pct + "%" : T("заблокировано")}</span>
                    <span class="rm-bar"><span style="width:${p.pct}%"></span></span>
                  </button>`;
                }).join("")}
              </div>
            </div>`).join("")}
        </div>
      </section>`;
    highlightNav();
    observeReveal();
  }

  /* ---------- Дерево навыков ---------- */
  const TREE_BRANCHES = [
    { key: "base", name: "Фундамент", color: "var(--o-500)", ids: ["fundamentals", "windows", "osint"] },
    { key: "infra", name: "Инфраструктура", color: "#2f8f96", ids: ["networking", "crypto", "phishing", "hardening"] },
    { key: "red", name: "Red Team", color: "#d2312a", ids: ["web", "pentest", "ad"] },
    { key: "blue", name: "Blue Team", color: "#2563eb", ids: ["blueteam", "forensics"] },
    { key: "re", name: "Анализ ПО", color: "#7c3aed", ids: ["reverse", "malware"] },
  ];
  function skillTree() {
    const colW = 222, rowH = 150, nodeW = 204, nodeH = 88, padT = 8;
    const branchOf = {};
    TREE_BRANCHES.forEach((br, i) => br.ids.forEach((id) => (branchOf[id] = { ...br, i })));
    const depthMemo = {};
    const depth = (id) => {
      if (depthMemo[id] != null) return depthMemo[id];
      const c = COURSES.find((x) => x.id === id);
      const pr = (c && c.prereq) || [];
      return (depthMemo[id] = pr.length ? 1 + Math.max(...pr.map(depth)) : 0);
    };
    const rows = [];
    COURSES.forEach((c) => { const d = depth(c.id); (rows[d] = rows[d] || []).push(c); });
    const maxN = Math.max(...rows.map((r) => r.length));
    const W = maxN * colW;
    const pos = {};
    rows.forEach((r, ri) => {
      r.sort((x, y) => ((branchOf[x.id] || { i: 9 }).i - (branchOf[y.id] || { i: 9 }).i));
      const off = (W - r.length * colW) / 2;
      r.forEach((c, ci) => (pos[c.id] = { x: off + ci * colW + (colW - nodeW) / 2, y: padT + ri * rowH, b: branchOf[c.id] || TREE_BRANCHES[0] }));
    });
    const H = padT + (rows.length - 1) * rowH + nodeH + 8;
    // Транзитивная редукция: не рисуем A→C, если C уже зависит от B, а B от A
    const allPre = (id, seen = new Set()) => {
      const c = COURSES.find((x) => x.id === id);
      ((c && c.prereq) || []).forEach((p) => { if (!seen.has(p)) { seen.add(p); allPre(p, seen); } });
      return seen;
    };
    const edges = [];
    COURSES.forEach((c) => (c.prereq || []).forEach((pid) => {
      if ((c.prereq || []).some((o) => o !== pid && allPre(o).has(pid))) return;
      const a = pos[pid], b = pos[c.id];
      if (!a || !b) return;
      const pc = COURSES.find((x) => x.id === pid);
      const done = pc && Progress.courseProgress(pc).pct === 100;
      const x1 = a.x + nodeW / 2, y1 = a.y + nodeH, x2 = b.x + nodeW / 2, y2 = b.y;
      const k = (y2 - y1) * 0.55;
      edges.push(`<path d="M${x1} ${y1} C${x1} ${y1 + k}, ${x2} ${y2 - k}, ${x2} ${y2}" class="st-edge ${done ? "on" : ""}"/>`);
    }));
    const levels = rows.map((_, ri) => `<div class="st-row-lbl" style="top:${padT + ri * rowH + nodeH / 2 - 9}px">${T("Ступень")} ${ri + 1}</div>`).join("");
    const nodes = COURSES.map((c) => {
      const p = pos[c.id];
      const pr = Progress.courseProgress(c);
      const unlocked = Progress.courseUnlocked(c);
      const st = pr.pct === 100 ? "done" : unlocked ? "open" : "locked";
      const miss = unlocked ? "" : T("Требуется") + ": " + Progress.missingPrereqs(c).map((m) => m.title).join(", ");
      return `<button class="st-node ${st}" style="left:${p.x}px;top:${p.y}px;width:${nodeW}px;height:${nodeH}px;--bc:${p.b.color};--cc:${c.color}"
          onclick="App.go('course',{courseId:'${c.id}'})" title="${escapeAttr(miss || c.title)}" lang="${window.I18N && I18N.current() === "en" ? "en" : "ru"}">
        <span class="st-ic">${st === "locked" ? Icon.ui("lock") : Icon.course(c.id)}</span>
        <span class="st-name">${c.title}</span>
        <span class="st-ring" style="--p:${pr.pct}"><b>${st === "done" ? "✓" : pr.pct + "%"}</b><i title="${escapeAttr(T(p.b.name))}">${T(p.b.name)}</i></span>
      </button>`;
    }).join("");
    return `<div class="st-card card">
      <div class="st-legend">
        ${TREE_BRANCHES.map((br) => `<span class="st-br" style="--bc:${br.color}">${T(br.name)}</span>`).join("")}
        <span class="st-sep"></span>
        <span class="st-l done">${T("пройден")}</span><span class="st-l open">${T("доступен")}</span><span class="st-l locked">${T("закрыт")}</span>
      </div>
      <div class="st-scroll"><div class="st-canvas" style="width:${W}px;height:${H}px">
        <svg class="st-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${edges.join("")}</svg>
        ${nodes}
      </div></div></div>`;
  }

  /* ---------- Испытания (боссфайт / недельный ивент) ---------- */
  function seededRand(seed) {
    let x = 0;
    for (const ch of String(seed)) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
    return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  }
  function challengePool(courses) {
    // только задания с проверяемым текстовым ответом, решаемые без терминала
    return courses.flatMap((c) => c.rooms.flatMap((r) => r.tasks
      .filter((t) => (t.type === "question" || t.type === "flag") && !t.sandbox && (t.answers || t.answer))
      .map((t) => ({ t, c }))));
  }
  function pickN(arr, n, rnd) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, n);
  }
  const BOSS = { n: 6, limit: 480, pass: 4, bonus: 50 };
  const WEEKLY = { n: 8, limit: 600, pass: 5, bonus: 40 };
  let chal = null;
  function fmtTime(sec) { return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0"); }

  function bossBanner(course) {
    const rec = Progress.challengeRec("boss_" + course.id);
    return `<div class="boss-banner card" style="--c:${course.color}">
      <span class="bb-ic">⚔️</span>
      <div><b>${T("Боссфайт курса")}</b><p>${T("6 вопросов, 8 минут, без подсказок. Проверьте себя до конца курса.")}</p></div>
      ${rec ? `<span class="bb-best">${T("Рекорд")}: ${rec.best}</span>` : ""}
      <button class="btn btn-primary btn-sm" onclick="App.go('boss',{courseId:'${course.id}'})">${T("В бой")}</button>
    </div>`;
  }
  function weeklyCard() {
    const rec = Progress.challengeRec(Progress.weekKey());
    return `<section class="section weekly-home"><div class="weekly-card card">
      <div class="wk-l"><span class="wk-kicker">${T("Недельный ивент")}</span>
        <h3>${T("CTF недели")}: ${WEEKLY.n} ${T("вопросов из всех курсов")}</h3>
        <p>${T("Набор вопросов одинаковый всю неделю и меняется каждый понедельник. Очки = верные ответы × 100 + бонус за скорость.")}</p></div>
      <div class="wk-r">${rec ? `<div class="wk-best"><b>${rec.best}</b><span>${T("ваш рекорд недели")}</span></div>` : ""}
        <button class="btn btn-primary" onclick="App.go('weekly')">${rec ? T("Улучшить результат") : T("Участвовать")}</button></div>
    </div></section>`;
  }

  function startChallenge(kind, course) {
    const cfg = kind === "boss" ? BOSS : WEEKLY;
    const key = kind === "boss" ? "boss_" + course.id : Progress.weekKey();
    const pool = challengePool(kind === "boss" ? [course] : COURSES);
    const rnd = kind === "boss" ? seededRand(Date.now()) : seededRand(key);
    chal = { kind, key, cfg, course, items: pickN(pool, cfg.n, rnd), i: 0, answers: [], start: Date.now(), timer: null, done: false };
    drawChallenge();
    clearInterval(chal.timer);
    chal.timer = setInterval(() => {
      if (!chal || chal.done) return;
      const el = document.getElementById("chal-time");
      if (!el) { clearInterval(chal.timer); return; } // ушли со страницы
      const left = chal.cfg.limit - Math.floor((Date.now() - chal.start) / 1000);
      el.textContent = fmtTime(Math.max(0, left));
      el.classList.toggle("low", left <= 60);
      if (left <= 0) finishChallenge(true);
    }, 250);
  }
  function drawChallenge() {
    const st = document.getElementById("chal-stage");
    if (!st || !chal) return;
    const it = chal.items[chal.i];
    st.innerHTML = `
      <div class="chal-top">
        <div class="chal-steps">${chal.items.map((_, k) => `<span class="${k < chal.i ? (chal.answers[k].ok ? "ok" : "bad") : k === chal.i ? "cur" : ""}"></span>`).join("")}</div>
        <span class="chal-timer" id="chal-time">${fmtTime(chal.cfg.limit)}</span>
      </div>
      <div class="chal-q card">
        <span class="chal-num">${T("Вопрос")} ${chal.i + 1} / ${chal.items.length}${chal.kind === "weekly" ? " · " + it.c.title : ""}</span>
        <h3>${it.t.title}</h3>
        <p>${it.t.prompt}</p>
        <form class="answer-row" onsubmit="event.preventDefault();App.chalAnswer()">
          <input class="answer-input" id="chal-in" autocomplete="off" spellcheck="false" placeholder="${T("Ваш ответ")}">
          <button class="btn btn-primary">${T("Ответить")}</button>
        </form>
        <button class="hint-btn" onclick="App.chalSkip()">${T("Пропустить")}</button>
      </div>`;
    const inp = document.getElementById("chal-in"); if (inp) inp.focus();
  }
  function chalAnswer(skip) {
    if (!chal || chal.done) return;
    const it = chal.items[chal.i];
    const v = skip ? "" : (document.getElementById("chal-in") || {}).value || "";
    const ok = !!v.trim() && checkAnswer(it.t, v);
    chal.answers.push({ ok, v });
    const card = document.querySelector(".chal-q");
    if (card) card.classList.add(ok ? "flash-ok" : "flash-bad");
    setTimeout(() => {
      chal.i++;
      if (chal.i >= chal.items.length) finishChallenge(false); else drawChallenge();
    }, 380);
  }
  function chalSkip() { chalAnswer(true); }
  function finishChallenge(timeout) {
    if (!chal || chal.done) return;
    chal.done = true; clearInterval(chal.timer);
    while (chal.answers.length < chal.items.length) chal.answers.push({ ok: false, v: "" });
    const secs = Math.min(chal.cfg.limit, Math.round((Date.now() - chal.start) / 1000));
    const correct = chal.answers.filter((a) => a.ok).length;
    const passed = correct >= chal.cfg.pass;
    const { rec, score, events } = Progress.recordChallenge(chal.kind, chal.key, correct, chal.items.length, secs, passed, chal.cfg.bonus, chal.cfg.limit);
    celebrate(events);
    const st = document.getElementById("chal-stage");
    if (!st) return;
    st.innerHTML = `
      <div class="chal-result card ${passed ? "win" : "lose"}">
        <div class="cr-ic">${passed ? "🏆" : timeout ? "⏱️" : "💥"}</div>
        <h2>${passed ? (chal.kind === "boss" ? T("Босс повержен!") : T("Зачёт недели!")) : timeout ? T("Время вышло") : T("Не хватило совсем немного")}</h2>
        <div class="cr-stats">
          <div><b>${correct}/${chal.items.length}</b><span>${T("верно")}</span></div>
          <div><b>${fmtTime(secs)}</b><span>${T("время")}</span></div>
          <div><b>${score}</b><span>${T("очки")}</span></div>
          <div><b>${rec.best}</b><span>${T("рекорд")}</span></div>
        </div>
        ${events.xpGained ? `<p class="cr-xp">+${events.xpGained} XP ${T("за первое прохождение")}</p>` : ""}
        <p class="muted">${T("Для зачёта нужно")} ${chal.cfg.pass}/${chal.items.length}.</p>
        <details class="cr-review"><summary>${T("Разбор ответов")}</summary>
          ${chal.items.map((it, k) => {
            const a = chal.answers[k];
            const right = (it.t.answers || [it.t.answer])[0];
            return `<div class="crr ${a.ok ? "ok" : "bad"}"><b>${a.ok ? "✓" : "✗"} ${it.t.title}</b>
              <span>${T("Ваш ответ")}: ${escapeHtml(a.v || "—")}${a.ok ? "" : ` · ${T("верно")}: <code>${escapeHtml(right)}</code>`}</span></div>`;
          }).join("")}
        </details>
        <div class="cr-actions">
          <button class="btn btn-primary" onclick="App.chalRestart()">${T("Ещё раз")}</button>
          ${chal.kind === "boss" ? `<button class="btn btn-ghost" onclick="App.go('course',{courseId:'${chal.course.id}'})">${T("К курсу")}</button>` : `<button class="btn btn-ghost" onclick="App.go('home')">${T("На главную")}</button>`}
        </div>
      </div>
      ${historyTable(rec)}`;
  }
  function historyTable(rec) {
    if (!rec || !rec.history.length) return "";
    return `<h2 class="rooms-title">${T("Ваши попытки")}</h2>
      <div class="card hist"><table class="hist-t"><thead><tr><th>#</th><th>${T("Дата")}</th><th>${T("Верно")}</th><th>${T("Время")}</th><th>${T("Очки")}</th></tr></thead><tbody>
      ${rec.history.slice().sort((a, b) => b.score - a.score).map((h, i) => `<tr class="${h.score === rec.best ? "best" : ""}"><td>${i + 1}</td><td>${new Date(h.ts).toLocaleString()}</td><td>${h.correct}/${h.total}</td><td>${fmtTime(h.secs)}</td><td><b>${h.score}</b></td></tr>`).join("")}
      </tbody></table></div>`;
  }
  function chalRestart() { if (chal) startChallenge(chal.kind, chal.course); }
  function introChallenge(kind, course) {
    const cfg = kind === "boss" ? BOSS : WEEKLY;
    const key = kind === "boss" ? "boss_" + course.id : Progress.weekKey();
    const rec = Progress.challengeRec(key);
    const pool = challengePool(kind === "boss" ? [course] : COURSES);
    return `<div id="chal-stage">
      <div class="chal-intro card">
        <div class="ci-ic">${kind === "boss" ? "⚔️" : "🗓️"}</div>
        <ul class="ci-rules">
          <li><b>${cfg.n}</b> ${T("вопросов")} ${kind === "boss" ? T("из этого курса") : T("из всех курсов")}</li>
          <li><b>${cfg.limit / 60} ${T("мин")}</b> ${T("на всё")}</li>
          <li>${T("Без подсказок и без повторной попытки")}</li>
          <li>${T("Зачёт")}: <b>${cfg.pass}/${cfg.n}</b> · ${T("первое прохождение")}: <b>+${cfg.bonus} XP</b></li>
        </ul>
        ${pool.length < cfg.n ? `<p class="muted">${T("В этом курсе мало подходящих вопросов — их будет")} ${pool.length}.</p>` : ""}
        <button class="btn btn-primary btn-lg" onclick="App.chalStart('${kind}','${course ? course.id : ""}')">${T("Начать")}</button>
      </div>
      ${historyTable(rec)}
    </div>`;
  }
  function chalStart(kind, cid) { startChallenge(kind, COURSES.find((c) => c.id === cid)); }
  function renderBoss(courseId) {
    const course = COURSES.find((c) => c.id === courseId);
    if (!course) return go("courses");
    root().innerHTML = `<section class="section">
      ${crumbs([["home", T("Главная")], ["courses", T("Курсы")], [{ courseId: course.id }, course.title], [null, T("Боссфайт")]])}
      <div class="page-title"><h1>⚔️ ${T("Боссфайт")}: ${course.title}</h1><p>${T("Испытание на время по материалу курса. Вопросы каждый раз разные.")}</p></div>
      ${introChallenge("boss", course)}</section>`;
  }
  function renderWeekly() {
    const d = new Date(), dow = (d.getUTCDay() + 6) % 7, left = 7 - dow;
    root().innerHTML = `<section class="section">
      ${crumbs([["home", T("Главная")], [null, T("Недельный ивент")]])}
      <div class="page-title"><h1>🗓️ ${T("CTF недели")}</h1><p>${T("Один набор вопросов на всю неделю — улучшайте свой рекорд. До смены набора")}: <b>${left} ${T("дн.")}</b></p></div>
      ${introChallenge("weekly", null)}</section>`;
  }

  /* ---------- Финальный экзамен курса ---------- */
  const examState = {};
  function buildExam(course) {
    // берём вопросы с проверяемым ответом (question/flag/choice), перемешиваем, до 5
    const pool = course.rooms.flatMap((r) => r.tasks)
      .filter((t) => (t.type === "question" || t.type === "choice") && (t.answers || t.answer));
    const shuffled = pool.slice().sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(10, shuffled.length));
  }
  function renderExam(courseId) {
    const course = COURSES.find((c) => c.id === courseId);
    if (!course) return go("courses");
    if (Progress.courseProgress(course).pct < 100) return go("course", { courseId });
    if (!examState[courseId] || examState[courseId].done) {
      examState[courseId] = { qs: buildExam(course), answers: {}, done: false };
    }
    const ex = examState[courseId];
    root().innerHTML = `
      <section class="section exam-view">
        ${crumbs([["home", T("Главная")], ["courses", T("Курсы")], [{ courseId: course.id }, course.title], [null, T("Экзамен")]])}
        <div class="page-title">
          <h1>${T("Экзамен")}: ${course.title}</h1>
          <p>${T("Ответьте на")} ${ex.qs.length} ${T("вопросов. Порог сдачи — 80%.")} ${Progress.examPassed(courseId) ? T("Лучший результат:") + " " + Progress.examBest(courseId) + "%." : ""}</p>
        </div>
        <div class="exam-list">
          ${ex.qs.map((q, i) => `
            <div class="exam-q card">
              <div class="exam-q-head"><span class="exam-num">${i + 1}</span><h4>${q.title}</h4></div>
              <p class="task-prompt" style="padding-left:0">${q.prompt}</p>
              ${q.type === "choice"
                ? `<div class="exam-choices">${q.options.map((o) => `<label class="exam-opt"><input type="radio" name="eq-${i}" value="${escapeAttr(o)}"> ${o}</label>`).join("")}</div>`
                : `<input class="exam-input" type="text" name="eq-${i}" placeholder="${T("Ваш ответ")}">`}
            </div>`).join("")}
        </div>
        <button class="btn btn-primary btn-lg" onclick="App.submitExam('${courseId}')">${T("Завершить экзамен")}</button>
        <div id="exam-result" class="exam-result"></div>
      </section>`;
    highlightNav();
  }
  function submitExam(courseId) {
    const course = COURSES.find((c) => c.id === courseId);
    const ex = examState[courseId];
    let correct = 0;
    ex.qs.forEach((q, i) => {
      let val = "";
      if (q.type === "choice") {
        const sel = document.querySelector(`input[name="eq-${i}"]:checked`);
        val = sel ? sel.value : "";
      } else {
        const inp = document.querySelector(`input[name="eq-${i}"]`);
        val = inp ? inp.value : "";
      }
      if (val && checkAnswer(q, val)) correct++;
    });
    const res = Progress.recordExam(courseId, correct, ex.qs.length);
    ex.done = true;
    celebrate(res.events);
    if (res.passed) confetti();
    const box = document.getElementById("exam-result");
    box.innerHTML = `
      <div class="exam-verdict ${res.passed ? "pass" : "fail"}">
        <div class="ev-score">${res.pct}%</div>
        <div>
          <h3>${res.passed ? "Экзамен сдан! 🎉" : "Пока не сдан"}</h3>
          <p>${correct} из ${ex.qs.length} верно.${res.firstPass ? " Бонус +30 XP за первую сдачу!" : (res.passed ? "" : " Нужно ≥ 80%. Повторите материал и попробуйте снова.")}</p>
          <div class="exam-actions">
            <button class="btn btn-ghost btn-sm" onclick="App.retryExam('${courseId}')">Пройти заново</button>
            <button class="btn btn-primary btn-sm" onclick="App.go('course',{courseId:'${courseId}'})">К курсу</button>
          </div>
        </div>
      </div>`;
    box.scrollIntoView({ behavior: "smooth", block: "center" });
    renderNav();
  }
  function retryExam(courseId) { examState[courseId] = null; renderExam(courseId); window.scrollTo(0, 0); }

  /* ---------- Шеринг: карточка профиля (PNG) ---------- */
  function buildShareCanvas(avImg) {
    const s = Progress.overallStats();
    const acc = Progress.accuracyOverall();
    const W = 1200, H = 630, sc = 2;
    const cv = document.createElement("canvas");
    cv.width = W * sc; cv.height = H * sc;
    const g = cv.getContext("2d"); g.scale(sc, sc);
    // фон-градиент
    const grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#fff6f0"); grad.addColorStop(1, "#ffe9db");
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    // оранжевая панель слева
    const p = g.createLinearGradient(0, 0, 360, H);
    p.addColorStop(0, "#ff8c47"); p.addColorStop(1, "#db5300");
    g.fillStyle = p; g.fillRect(0, 0, 360, H);
    // аватар на панели
    const pr = Progress.profile();
    const cx = 180, cy = 190, R = 92;
    const bgc = AVATAR_BGS[pr.bg % AVATAR_BGS.length];
    const ag = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    ag.addColorStop(0, bgc[0]); ag.addColorStop(1, bgc[1]);
    g.save(); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.closePath();
    g.fillStyle = ag; g.fill(); g.clip();
    if (avImg) g.drawImage(avImg, cx - R, cy - R, R * 2, R * 2);
    else { g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "90px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"; g.fillText(pr.avatar.value || "🦊", cx, cy + 6); }
    g.restore();
    g.beginPath(); g.arc(cx, cy, R + 4, 0, Math.PI * 2); g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 6; g.stroke();
    // ник и ранг на панели
    g.textBaseline = "alphabetic";
    g.fillStyle = "#fff"; g.textAlign = "center";
    g.font = "800 30px Sora, Inter, sans-serif"; g.fillText(displayName().slice(0, 18), 180, 340);
    g.font = "700 24px Sora, Inter, sans-serif"; g.fillText((s.rank.icon || "") + " " + s.rank.name, 180, 390);
    g.font = "600 22px Inter, sans-serif"; g.fillStyle = "rgba(255,255,255,.85)"; g.fillText("LVL " + s.level, 180, 430);
    if (pr.showcase.length) { g.font = "40px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"; g.fillText(pr.showcase.map((id) => (ACHIEVEMENTS.find((a) => a.id === id) || {}).icon || "").join("  "), 180, 510); }
    // правая часть — заголовок
    g.textAlign = "left"; g.fillStyle = "#1a1613";
    g.font = "800 30px Sora, Inter, sans-serif"; g.fillText("CyberPath", 410, 90);
    g.fillStyle = "#8c8178"; g.font = "600 20px Inter, sans-serif";
    g.fillText(T("Мой прогресс в кибербезопасности"), 410, 122);
    // метрики: 4×2 плитки
    const M = (n) => Progress.metric(n);
    const stats = [
      [String(s.xp), T("всего XP")],
      [s.tasksDone + "/" + s.tasksTotal, T("заданий")],
      [s.coursesDone + "/" + s.coursesTotal, T("курсов")],
      [(acc.total ? acc.pct + "%" : "—"), T("точность")],
      [String(s.streak), T("дней подряд")],
      [s.achievements + "/" + s.achievementsTotal, T("достижений")],
      [M("tools") + "/6", T("расследований")],
      [M("flags") + "/6", T("флагов")],
    ];
    const x0 = 410, y0 = 150, cw = 190, ch = 96;
    stats.forEach((st, i) => {
      const col = i % 4, row = (i / 4) | 0;
      const x = x0 + col * cw, y = y0 + row * (ch + 14);
      g.fillStyle = "#fff"; roundRect(g, x, y, cw - 14, ch, 14); g.fill();
      g.strokeStyle = "#fde3d0"; g.lineWidth = 1.5; roundRect(g, x, y, cw - 14, ch, 14); g.stroke();
      g.fillStyle = "#db5300"; g.font = "800 32px Sora, Inter, sans-serif"; g.textAlign = "left";
      g.fillText(st[0], x + 18, y + 48);
      g.fillStyle = "#8c8178"; g.font = "600 16px Inter, sans-serif"; g.fillText(st[1], x + 18, y + 76);
    });
    // топ навыков
    const top = Progress.skillRadar().slice().sort((a, b) => b.pct - a.pct).slice(0, 3);
    g.fillStyle = "#1a1613"; g.font = "800 20px Sora, Inter, sans-serif";
    g.fillText(T("Сильные стороны"), 410, 390);
    top.forEach((k, i) => {
      const y = 420 + i * 44;
      g.fillStyle = "#4b433c"; g.font = "600 17px Inter, sans-serif";
      let name = T(k.title); if (name.length > 26) name = name.slice(0, 25) + "…";
      g.fillText(name, 410, y + 14);
      g.fillStyle = "#fde3d0"; roundRect(g, 690, y, 400, 14, 7); g.fill();
      if (k.pct) { g.fillStyle = "#f2620a"; roundRect(g, 690, y, Math.max(14, 4 * k.pct), 14, 7); g.fill(); }
      g.fillStyle = "#db5300"; g.font = "800 17px Inter, sans-serif"; g.textAlign = "right";
      g.fillText(String(k.pct), 1150, y + 14); g.textAlign = "left";
    });
    g.fillStyle = "#b3a99e"; g.font = "500 18px Inter, sans-serif";
    g.fillText(T("Бесплатная платформа · учись этично, применяй ответственно"), 410, 600);
    return cv;
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function shareCard() {
    const pr = Progress.profile();
    if (pr.avatar.kind === "upload") {
      const im = new Image();
      im.onload = () => shareCardDo(im);
      im.onerror = () => shareCardDo(null);
      im.src = pr.avatar.value;
    } else shareCardDo(null);
  }
  function shareCardDo(avImg) {
    const cv = buildShareCanvas(avImg);
    cv.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "cyberpath-card.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: "CyberPath", text: T("Мой прогресс в CyberPath") }).catch(() => {});
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = "cyberpath-card.png";
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
        toast(T("Карточка профиля скачана"));
      }
    }, "image/png");
  }

  /* ---------- Режим повторения (spaced repetition) ---------- */
  let reviewSession = null;
  let dashXpMode = "week"; // "week" | "day" — период графика XP на дашборде
  function setXpMode(m) { dashXpMode = m === "day" ? "day" : "week"; if (current.view === "profile") renderProfile(); }
  function renderReview() {
    const total = Progress.srsTotal();
    const due = Progress.srsDueList();
    if (!due.length) {
      root().innerHTML = `
        <section class="section">
          <div class="page-title"><h1>${T("Повторение")}</h1><p>${T("Интервальное повторение слабых тем — как флеш-карты Anki.")}</p></div>
          <div class="review-empty card">
            <div class="cb-icon">${Icon.ui("check")}</div>
            <h3>${total ? T("Всё повторено на сегодня!") : T("Карточки появятся автоматически")}</h3>
            <p>${total
              ? T("Вы разобрали все карточки, готовые к повторению. Возвращайтесь завтра — система напомнит нужное.")
              : T("Решайте задания в курсах — вопросы с ответами станут карточками и будут возвращаться на повторение через растущие интервалы.")}</p>
            <p class="review-stat">${T("Всего карточек в колоде:")} <b>${total}</b></p>
            <button class="btn btn-primary" onclick="App.go('courses')">${Icon.ui("arrow")} ${T("К курсам")}</button>
          </div>
        </section>`;
      highlightNav();
      return;
    }
    // Экран выбора: вся колода или фокус на слабой теме
    const deck = Progress.srsDeckStats();
    const rows = Object.keys(deck)
      .filter((cid) => deck[cid].due > 0)
      .sort((a, b) => deck[b].due - deck[a].due)
      .map((cid) => `
        <button class="rev-topic" onclick="App.reviewStart('${cid}')">
          <span class="rev-topic-t">${deck[cid].title}</span>
          <span class="rev-topic-n">${deck[cid].due} ${plural(deck[cid].due, "карточка", "карточки", "карточек")}${deck[cid].lapses ? ` · ${T("ошибок")}: ${deck[cid].lapses}` : ""}</span>
        </button>`).join("");
    root().innerHTML = `
      <section class="section">
        <div class="page-title"><h1>${T("Повторение")}</h1><p>${T("Интервальное повторение слабых тем — как флеш-карты Anki.")}</p></div>
        <div class="review-start card">
          <h3>${T("Готово к повторению:")} <b>${due.length}</b></h3>
          <p>${T("Повторите всё сразу или сфокусируйтесь на отдельной теме.")}</p>
          <button class="btn btn-primary" onclick="App.reviewStart('')">${Icon.ui("arrow")} ${T("Повторить всё")} (${due.length})</button>
        </div>
        ${rows ? `<h3 class="rev-topics-h">${T("По темам")}</h3><div class="rev-topics">${rows}</div>` : ""}
        <div id="review-stage"></div>
      </section>`;
    highlightNav();
  }
  function reviewStart(courseId) {
    const due = Progress.srsDueListFor(courseId || "");
    if (!due.length) { renderReview(); return; }
    reviewSession = { queue: due.slice(), idx: 0, correct: 0, total: due.length, revealed: false, courseId: courseId || "" };
    const stage = document.getElementById("review-stage");
    if (stage) { stage.scrollIntoView({ behavior: "smooth", block: "start" }); }
    renderReviewCard();
  }
  function renderReviewCard() {
    const st = reviewSession;
    const stage = document.getElementById("review-stage");
    if (!stage) return;
    if (st.idx >= st.queue.length) {
      const pct = Math.round((st.correct / st.total) * 100);
      stage.innerHTML = `
        <div class="review-empty card">
          <div class="cb-icon">${Icon.ui("check")}</div>
          <h3>Сессия завершена!</h3>
          <p>Верно: <b>${st.correct}/${st.total}</b> (${pct}%). Карточки перепланированы: правильные вернутся позже, ошибочные — уже завтра.</p>
          <button class="btn btn-primary" onclick="App.go('review')">Обновить</button>
          <button class="btn btn-ghost" onclick="App.go('profile')">К дашборду</button>
        </div>`;
      renderNav();
      return;
    }
    const id = st.queue[st.idx];
    const info = Progress.taskInfo(id);
    const task = info.task;
    const progressPct = Math.round((st.idx / st.total) * 100);
    stage.innerHTML = `
      <div class="review-progress"><div class="xp-bar"><span style="width:${progressPct}%"></span></div><span class="cc-pct">${st.idx + 1}/${st.total}</span></div>
      <div class="review-card card">
        <div class="review-src">${info.course.title} · ${info.room.title}</div>
        <h3 class="review-q">${task.prompt}</h3>
        ${task.type === "choice"
          ? `<div class="choice-grid rev-choices">${task.options.map((o) => `<button class="choice-opt" onclick="App.reviewChoose(this,'${escapeAttr(o)}')">${o}</button>`).join("")}</div>`
          : `<div class="answer-row"><input type="text" id="rev-input" placeholder="${T("Ваш ответ")}" onkeydown="if(event.key==='Enter')App.reviewCheck()"><button class="btn btn-primary btn-sm" onclick="App.reviewCheck()">${T("Проверить")}</button></div>`}
        <div id="rev-fb" class="review-fb"></div>
      </div>`;
    setTimeout(() => { const i = document.getElementById("rev-input"); if (i) i.focus(); }, 30);
  }
  function reviewGrade(id, ok, correctText) {
    Progress.srsReview(id, ok);
    if (ok) reviewSession.correct++;
    const fb = document.getElementById("rev-fb");
    if (fb) {
      fb.innerHTML = `
        <div class="rev-verdict ${ok ? "ok" : "no"}">${ok ? Icon.ui("check") + " Верно!" : "✗ Правильный ответ: <b>" + correctText + "</b>"}</div>
        <button class="btn btn-primary btn-sm" onclick="App.reviewNext()">Дальше ${Icon.ui("arrow")}</button>`;
    }
    renderNav();
  }
  function reviewChoose(btn, val) {
    const id = reviewSession.queue[reviewSession.idx];
    const task = Progress.taskInfo(id).task;
    document.querySelectorAll(".rev-choices .choice-opt").forEach((b) => (b.disabled = true));
    const ok = checkAnswer(task, val);
    btn.classList.add(ok ? "right" : "wrong");
    reviewGrade(id, ok, (task.answers || [])[0] || "");
  }
  function reviewCheck() {
    const id = reviewSession.queue[reviewSession.idx];
    const task = Progress.taskInfo(id).task;
    const inp = document.getElementById("rev-input");
    if (!inp || !inp.value.trim()) return;
    inp.disabled = true;
    const ok = checkAnswer(task, inp.value);
    reviewGrade(id, ok, (task.answers || [])[0] || "");
  }
  function reviewNext() { reviewSession.idx++; renderReviewCard(); }

  /* ---------- Командная палитра (Ctrl/⌘+K) ---------- */
  const palette = { open: false, items: [], active: 0, filtered: [] };
  function buildPaletteItems() {
    const items = [
      { label: "Главная", sub: "Домашняя страница", go: () => go("home") },
      { label: "Каталог курсов", sub: "Все курсы", go: () => go("courses") },
      { label: "Путь обучения", sub: "Дорожная карта", go: () => go("roadmap") },
      { label: "Песочница", sub: "Терминал и квесты", go: () => go("sandbox") },
      { label: T("CTF — охота за флагами"), sub: T("Все флаги платформы"), go: () => go("ctf") },
      { label: "Повторение", sub: "Карточки на повторение", go: () => go("review") },
      { label: "Словарь терминов", sub: "Глоссарий", go: () => go("glossary") },
      { label: "Профиль", sub: "Прогресс и достижения", go: () => go("profile") },
    ];
    COURSES.forEach((c) => {
      items.push({ label: c.title, sub: "Курс · " + c.level, go: () => go("course", { courseId: c.id }) });
      c.rooms.forEach((r) => items.push({ label: r.title, sub: "Комната · " + c.title, go: () => go("room", { courseId: c.id, roomId: r.id }) }));
    });
    items.push({ label: T("Инструменты"), sub: T("Симуляторы Blue Team"), go: () => go("tools") });
    if (window.Toolkit && Toolkit.list) {
      const en = window.I18N && I18N.current() === "en";
      Toolkit.list.forEach((tk) => items.push({ label: en ? tk.en : tk.ru, sub: T("Инструмент") + " · Blue Team", go: () => go("tools", { tool: tk.id }) }));
    }
    GLOSSARY.forEach((g) => items.push({ label: g.term, sub: "Термин · " + g.cat, go: () => { go("glossary"); glossaryState.q = g.term; setTimeout(() => { const i = document.getElementById("gloss-search"); if (i) i.value = g.term; renderGlossaryList(); }, 30); } }));
    return items;
  }
  function openPalette() {
    palette.open = true; palette.items = buildPaletteItems(); palette.active = 0;
    let ov = document.getElementById("palette");
    if (!ov) {
      ov = document.createElement("div");
      ov.id = "palette"; ov.className = "palette-overlay";
      ov.innerHTML = `
        <div class="palette" role="dialog" aria-label="Быстрый переход">
          <div class="palette-search">
            ${Icon.ui("quest")}
            <input id="palette-input" type="text" placeholder="Куда перейти? Курс, комната, термин…" autocomplete="off">
            <kbd>ESC</kbd>
          </div>
          <div id="palette-results" class="palette-results"></div>
        </div>`;
      document.body.appendChild(ov);
      ov.addEventListener("click", (e) => { if (e.target === ov) closePalette(); });
      const inp = ov.querySelector("#palette-input");
      inp.addEventListener("input", () => filterPalette(inp.value));
      inp.addEventListener("keydown", paletteKeys);
    }
    ov.classList.add("show");
    filterPalette("");
    setTimeout(() => { const i = document.getElementById("palette-input"); if (i) { i.value = ""; i.focus(); } }, 20);
  }
  function closePalette() {
    palette.open = false;
    const ov = document.getElementById("palette");
    if (ov) ov.classList.remove("show");
  }
  function filterPalette(q) {
    const query = q.trim().toLowerCase();
    palette.filtered = (!query ? palette.items
      : palette.items.filter((it) => (it.label + " " + it.sub).toLowerCase().includes(query))).slice(0, 40);
    palette.active = 0;
    renderPaletteResults();
  }
  function renderPaletteResults() {
    const box = document.getElementById("palette-results");
    if (!box) return;
    if (!palette.filtered.length) { box.innerHTML = `<div class="palette-empty">${T("Ничего не найдено")}</div>`; return; }
    box.innerHTML = palette.filtered.map((it, i) => `
      <div class="palette-item ${i === palette.active ? "active" : ""}" data-i="${i}" onclick="App.palettePick(${i})">
        <span class="pi-label">${it.label}</span>
        <span class="pi-sub">${it.sub}</span>
      </div>`).join("");
    const act = box.querySelector(".palette-item.active");
    if (act) act.scrollIntoView({ block: "nearest" });
  }
  function paletteKeys(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); palette.active = Math.min(palette.active + 1, palette.filtered.length - 1); renderPaletteResults(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); palette.active = Math.max(palette.active - 1, 0); renderPaletteResults(); }
    else if (e.key === "Enter") { e.preventDefault(); palettePick(palette.active); }
    else if (e.key === "Escape") { e.preventDefault(); closePalette(); }
  }
  function palettePick(i) {
    const it = palette.filtered[i];
    if (!it) return;
    closePalette();
    it.go();
  }

  /* ---------- Анимация появления карточек ---------- */
  let revealObserver = null;
  function observeReveal() {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); revealObserver.unobserve(en.target); } });
      }, { threshold: 0.08 });
    }
    document.querySelectorAll(".reveal:not(.in)").forEach((el, i) => {
      el.style.setProperty("--d", (i % 12) * 35 + "ms");
      revealObserver.observe(el);
    });
  }

  /* ---------- Заметки: выделение текста в уроке ---------- */
  function bindNoteSelection(course, room) {
    const lesson = document.querySelector(".lesson");
    if (!lesson) return;
    let pop = document.getElementById("note-pop");
    if (!pop) {
      pop = document.createElement("button");
      pop.id = "note-pop"; pop.className = "note-pop"; pop.type = "button";
      document.body.appendChild(pop);
    }
    pop.textContent = "📝 " + T("В заметки");
    pop.classList.remove("show");
    const show = () => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : "";
      if (!text || text.length < 3 || !lesson.contains(sel.anchorNode)) { pop.classList.remove("show"); return; }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      pop.style.left = Math.max(8, Math.min(innerWidth - 150, r.left + r.width / 2 - 65)) + "px";
      pop.style.top = (r.top + scrollY - 44) + "px";
      pop.classList.add("show");
      pop.onclick = () => {
        const ok = Progress.addNote({ text: text.slice(0, 1200), courseId: course.id, roomId: room.id });
        toast(ok ? "📝 " + T("Сохранено в заметки") : T("Такая заметка уже есть"));
        pop.classList.remove("show");
        sel.removeAllRanges();
        const cnt = document.getElementById("notes-count"); if (cnt) cnt.textContent = Progress.notes().length;
      };
    };
    lesson.addEventListener("mouseup", () => setTimeout(show, 0));
    lesson.addEventListener("touchend", () => setTimeout(show, 250));
    if (!bindNoteSelection._doc) {
      bindNoteSelection._doc = true;
      document.addEventListener("mousedown", (e) => { const p = document.getElementById("note-pop"); if (p && e.target !== p) p.classList.remove("show"); });
    }
  }

  /* ---------- CTF: все флаги платформы ---------- */
  function collectFlags() {
    const list = [];
    // флаги-задачи в курсах
    COURSES.forEach((c) => c.rooms.forEach((r) => r.tasks.forEach((t) => {
      if (t.type === "flag") list.push({
        kind: "task", title: t.title.replace(/^🚩\s*/, ""), source: c.title + " · " + r.title,
        value: (t.answers && t.answers[0]) || "", found: Progress.isDone(t.id),
        go: () => go("room", { courseId: c.id, roomId: r.id }), color: c.color,
      });
    })));
    // миссии песочницы
    (typeof MISSIONS !== "undefined" ? MISSIONS : []).forEach((m) => list.push({
      kind: "mission", title: m.title, source: T("Песочница") + " · " + T("Миссия"),
      value: m.flag, found: Progress.missionDone(m.id), go: () => go("sandbox"), color: "#2f8f96",
    }));
    // флаги в инструментах Blue Team
    if (window.Toolkit && Toolkit.list) {
      const en = window.I18N && I18N.current() === "en";
      Toolkit.list.forEach((tk) => {
        if (!Toolkit.flagTools || Toolkit.flagTools.indexOf(tk.id) < 0) return;
        list.push({
          kind: "tool", title: en ? tk.en : tk.ru, source: T("Инструменты") + " · Blue Team",
          value: (Toolkit.flagValues && Toolkit.flagValues[tk.id]) || "", found: Progress.bonusDone("flag_" + tk.id),
          go: () => go("tools", { tool: tk.id }), color: "#d2312a",
        });
      });
    }
    return list;
  }
  function renderCTF() {
    const flags = collectFlags();
    const found = flags.filter((f) => f.found).length;
    const pct = flags.length ? Math.round(found / flags.length * 100) : 0;
    const kindLabel = { task: T("Курсы"), mission: T("Песочница"), tool: T("Инструменты") };
    const groups = ["task", "mission", "tool"];
    root().innerHTML = `
      <section class="section">
        <div class="page-title">
          <h1>${Icon.ui("flag")} ${T("CTF — охота за флагами")}</h1>
          <p>${T("Все спрятанные флаги платформы в одном месте. Найдите их все!")}</p>
        </div>
        <div class="ctf-head card">
          <div class="ctf-ring" style="--p:${pct}"><b>${found}</b><span>/${flags.length}</span></div>
          <div class="ctf-head-body">
            <h3>${T("Найдено флагов")}: ${found} ${T("из")} ${flags.length}</h3>
            <div class="ctf-bar"><span style="width:${pct}%"></span></div>
            <p class="muted">${found === flags.length ? T("Все флаги найдены — вы настоящий охотник! 🏆") : T("Флаг раскрывается после того, как вы его добудете.")}</p>
          </div>
        </div>
        ${groups.map((gk) => {
          const items = flags.filter((f) => f.kind === gk);
          if (!items.length) return "";
          const gf = items.filter((i) => i.found).length;
          return `
          <h2 class="rooms-title">${kindLabel[gk]} <span class="ctf-cnt">${gf}/${items.length}</span></h2>
          <div class="ctf-grid">
            ${items.map((f) => `
              <button class="ctf-card ${f.found ? "found" : "hidden"}" style="--c:${f.color}">
                <span class="ctf-ic">${f.found ? Icon.ui("flag") : Icon.ui("lock")}</span>
                <div class="ctf-body">
                  <b>${escapeHtml(f.title)}</b>
                  <span class="ctf-src">${escapeHtml(f.source)}</span>
                  <code class="ctf-val">${f.found ? escapeHtml(f.value) : "CYBER{" + "•".repeat(10) + "}"}</code>
                </div>
                <span class="ctf-status">${f.found ? "✓" : "🔒"}</span>
              </button>`).join("")}
          </div>`;
        }).join("")}
      </section>`;
    // навешиваем переходы (нельзя сериализовать функции в onclick).
    // Порядок карточек в DOM совпадает с порядком flags (task → mission → tool).
    const ordered = [...flags].sort((a, b) => groups.indexOf(a.kind) - groups.indexOf(b.kind));
    root().querySelectorAll(".ctf-card").forEach((btn, i) => { const f = ordered[i]; if (f && f.go) btn.addEventListener("click", f.go); });
    highlightNav();
  }

  /* ---------- О проекте / правовое ---------- */
  const LEGAL = {
    about: {
      ru: { t: "О проекте", b: `
<p><b>CyberPath</b> — бесплатная интерактивная платформа для изучения кибербезопасности с нуля: курсы, практические лабы, симулятор терминала, CTF-задачи и инструменты.</p>
<h3>Принципы</h3>
<ul><li><b>Бесплатно, регистрация не обязательна.</b> Всё работает прямо в браузере, в том числе офлайн.</li>
<li><b>Практика важнее теории.</b> Каждая тема закрепляется заданиями и лабами в безопасной симуляции.</li>
<li><b>Этика прежде всего.</b> Мы учим защищать системы и понимать атаки, а не вредить.</li>
<li><b>Приватность по умолчанию.</b> Без трекеров и аналитики; аккаунт — по желанию, только для рейтинга.</li></ul>
<h3>Нашли ошибку?</h3>
<p>Контент развивается, и неточности возможны. Если ответ в задании не принимается или вы нашли фактическую ошибку — сообщите о ней через репозиторий проекта на GitHub.</p>
<p class="muted">Материалы не являются официальной подготовкой к сертификациям и не заменяют профессиональное обучение.</p>` },
      en: { t: "About", b: `
<p><b>CyberPath</b> is a free interactive platform for learning cybersecurity from scratch: courses, hands-on labs, a terminal simulator, CTF challenges and tools.</p>
<h3>Principles</h3>
<ul><li><b>Free, sign-up optional.</b> Everything runs right in your browser, even offline.</li>
<li><b>Practice over theory.</b> Every topic is reinforced with tasks and labs in a safe simulation.</li>
<li><b>Ethics first.</b> We teach how to defend systems and understand attacks — not how to cause harm.</li>
<li><b>Private by default.</b> No trackers or analytics; an account is optional, only for the leaderboard.</li></ul>
<h3>Found a mistake?</h3>
<p>The content keeps evolving and inaccuracies are possible. If an answer isn't accepted or you spot a factual error, please report it via the project's GitHub repository.</p>
<p class="muted">The materials are not official certification prep and do not replace professional training.</p>` },
    },
    ethics: {
      ru: { t: "Этичный хакинг", b: `
<div class="legal-alert">⚠️ Все знания на платформе предназначены <b>только для образования и защиты</b>.</div>
<h3>Правила</h3>
<ul><li><b>Тестируйте только свои системы</b> — собственные стенды, виртуальные машины и домашние лаборатории.</li>
<li><b>Или с явного письменного разрешения</b> владельца: пентест по договору, bug bounty в пределах scope.</li>
<li><b>Используйте легальные площадки:</b> TryHackMe, Hack The Box, PortSwigger Web Security Academy, OverTheWire, CTF-соревнования.</li>
<li><b>Не трогайте чужие данные.</b> Нашли уязвимость — сообщите владельцу ответственно (responsible disclosure), а не эксплуатируйте.</li></ul>
<h3>Закон</h3>
<p>Несанкционированный доступ к компьютерной информации, создание и распространение вредоносных программ уголовно наказуемы в большинстве стран (например, ст. 272–274 УК РФ, Computer Fraud and Abuse Act в США, Computer Misuse Act в Великобритании). Незнание закона не освобождает от ответственности.</p>
<h3>Ответственность</h3>
<p>Авторы CyberPath не несут ответственности за неправомерное использование материалов. Все лабы на платформе — симуляции и не взаимодействуют с реальными системами.</p>` },
      en: { t: "Ethical hacking", b: `
<div class="legal-alert">⚠️ All knowledge on this platform is intended <b>for education and defense only</b>.</div>
<h3>Rules</h3>
<ul><li><b>Test only your own systems</b> — your own labs, virtual machines and home setups.</li>
<li><b>Or with explicit written permission</b> from the owner: contracted pentests, bug bounties within scope.</li>
<li><b>Use legal platforms:</b> TryHackMe, Hack The Box, PortSwigger Web Security Academy, OverTheWire, CTF competitions.</li>
<li><b>Leave others' data alone.</b> Found a vulnerability? Report it responsibly to the owner instead of exploiting it.</li></ul>
<h3>The law</h3>
<p>Unauthorized access to computer systems and creating or spreading malware are criminal offenses in most countries (e.g. the Computer Fraud and Abuse Act in the US, the Computer Misuse Act in the UK, Articles 272–274 of the Russian Criminal Code). Ignorance of the law is no excuse.</p>
<h3>Liability</h3>
<p>The CyberPath authors are not responsible for any misuse of the materials. All labs on the platform are simulations and do not interact with real systems.</p>` },
    },
    privacy: {
      ru: { t: "Конфиденциальность", b: `
<div class="legal-ok">🔒 Коротко: без аккаунта мы <b>ничего о вас не собираем</b>. С аккаунтом — только ник и прогресс прохождения.</div>
<h3>Где хранятся данные</h3>
<p>Прогресс, XP, заметки, профиль и настройки хранятся <b>только в localStorage вашего браузера</b> на этом устройстве. На сервер они не отправляются — у проекта нет бэкенда.</p>
<h3>Аккаунт (по желанию)</h3>
<p>Аккаунт нужен только для рейтинга и синхронизации. Если вы входите, на сервере (Supabase) хранятся:</p>
<ul><li><b>ник</b> — виден всем в рейтинге;</li><li><b>решённые задания</b> с датой и числом подсказок — для подсчёта очков;</li><li><b>копия прогресса</b> — видна только вам, для переноса между устройствами.</li></ul>
<p>При входе через GitHub или Google сервис авторизации получает от них идентификатор и email аккаунта — они нужны только для входа и нигде не показываются. При входе по нику email не используется.</p>
<p>Аккаунт можно удалить в любой момент: <b>меню профиля → Аккаунт → Удалить аккаунт</b>. Удаляется всё: ник, решения и облачная копия.</p>
<h3>Чего нет</h3>
<ul><li>Нет обязательной регистрации.</li><li>Нет cookies отслеживания, аналитики, рекламы и пикселей.</li><li>Нет продажи и передачи данных третьим лицам (кроме хостинга базы Supabase, если вы вошли).</li></ul>
<h3>Сторонние ресурсы</h3>
<p>Шрифты могут загружаться с Google Fonts — при этом Google видит стандартный веб-запрос (IP-адрес, браузер). После первой загрузки файлы кэшируются для офлайн-работы.</p>
<h3>Управление данными</h3>
<p>Сделайте резервную копию или перенесите прогресс через <b>Профиль → экспорт/импорт</b>. Удалить всё можно там же или очистив данные сайта в браузере. Учтите: очистка браузера без экспорта удалит прогресс безвозвратно.</p>` },
      en: { t: "Privacy", b: `
<div class="legal-ok">🔒 In short: without an account we <b>collect nothing about you</b>. With one — only your nickname and course progress.</div>
<h3>Where data lives</h3>
<p>Your progress, XP, notes, profile and settings are stored <b>only in your browser's localStorage</b> on this device. Nothing is sent to a server — the project has no backend.</p>
<h3>Account (optional)</h3>
<p>An account is only needed for the leaderboard and syncing. If you sign in, the server (Supabase) stores:</p>
<ul><li>your <b>nickname</b> — visible to everyone on the leaderboard;</li><li><b>solved tasks</b> with date and hint count — to calculate points;</li><li>a <b>copy of your progress</b> — visible only to you, for syncing between devices.</li></ul>
<p>When signing in with GitHub or Google, the auth service receives the account ID and email from them — used only for signing in and never shown. Nickname sign-in uses no email.</p>
<p>You can delete your account at any time: <b>profile menu → Account → Delete account</b>. Everything is removed: nickname, solves and the cloud copy.</p>
<h3>What we don't do</h3>
<ul><li>No mandatory sign-up.</li><li>No tracking cookies, analytics, ads or pixels.</li><li>No selling or sharing data with third parties (except Supabase database hosting, if you sign in).</li></ul>
<h3>Third-party resources</h3>
<p>Fonts may be loaded from Google Fonts, which sees a standard web request (IP address, browser). After the first load the files are cached for offline use.</p>
<h3>Managing your data</h3>
<p>Back up or move your progress via <b>Profile → export/import</b>. You can wipe everything there or by clearing the site data in your browser. Note: clearing the browser without exporting deletes progress permanently.</p>` },
    },
    license: {
      ru: { t: "Лицензия", b: `
<h3>Код — MIT</h3>
<p>Исходный код платформы распространяется по лицензии <b>MIT</b>: его можно свободно использовать, изменять и распространять, в том числе в коммерческих целях, при сохранении уведомления об авторских правах. Полный текст — в файле <code>LICENSE</code> репозитория.</p>
<h3>Учебный контент — CC BY-NC-SA 4.0</h3>
<p>Тексты курсов, задания, глоссарий и лабы распространяются по лицензии <b>Creative Commons Attribution-NonCommercial-ShareAlike 4.0</b>:</p>
<ul><li><b>Можно</b> делиться и адаптировать материалы — для учёбы, преподавания, в клубах и школах.</li>
<li><b>Нужно</b> указывать CyberPath как источник и распространять производные работы на тех же условиях.</li>
<li><b>Нельзя</b> использовать контент в коммерческих целях без согласия авторов.</li></ul>
<h3>Сторонние материалы</h3>
<p>Названия инструментов и продуктов (Nmap, Wireshark, Burp Suite, Windows и др.) — товарные знаки их владельцев и упоминаются только в образовательных целях.</p>
<p class="muted">Платформа предоставляется «как есть», без каких-либо гарантий.</p>` },
      en: { t: "License", b: `
<h3>Code — MIT</h3>
<p>The platform's source code is released under the <b>MIT</b> license: you may freely use, modify and distribute it, including commercially, as long as the copyright notice is kept. Full text is in the repository's <code>LICENSE</code> file.</p>
<h3>Learning content — CC BY-NC-SA 4.0</h3>
<p>Course texts, tasks, glossary and labs are licensed under <b>Creative Commons Attribution-NonCommercial-ShareAlike 4.0</b>:</p>
<ul><li><b>You may</b> share and adapt the materials — for study, teaching, clubs and schools.</li>
<li><b>You must</b> credit CyberPath and share derivatives under the same terms.</li>
<li><b>You may not</b> use the content commercially without the authors' consent.</li></ul>
<h3>Third-party names</h3>
<p>Tool and product names (Nmap, Wireshark, Burp Suite, Windows, etc.) are trademarks of their owners and are mentioned for educational purposes only.</p>
<p class="muted">The platform is provided "as is", without warranty of any kind.</p>` },
    },
  };
  /* ---------- Тест уровня (онбординг) ---------- */
  function placementQs() {
    return [
      { q: T("Вам пришло письмо «Ваш аккаунт заблокирован, срочно войдите по ссылке». Что это скорее всего?"), o: [T("Фишинг"), T("Обновление системы"), T("Спам-фильтр"), T("Резервная копия")], a: 0 },
      { q: T("Какой порт по умолчанию использует HTTPS?"), o: ["80", "443", "22", "3389"], a: 1 },
      { q: T("Чем хеширование отличается от шифрования?"), o: [T("Хеш нельзя обратить в исходные данные"), T("Хеш всегда длиннее данных"), T("Хеширование требует ключ"), T("Ничем, это синонимы")], a: 0 },
      { q: T("Что делает команда nmap -sV?"), o: [T("Определяет версии сервисов на открытых портах"), T("Включает VPN"), T("Проверяет орфографию"), T("Удаляет вирусы")], a: 0 },
      { q: T("Какой ввод — классический пример SQL-инъекции?"), o: ["<script>alert(1)</script>", "' OR 1=1 --", "../../etc/passwd", "admin:admin"], a: 1 },
      { q: T("Что такое Kerberoasting?"), o: [T("Офлайн-подбор паролей сервисных учёток AD по TGS-билетам"), T("Перегрев сервера"), T("DDoS на DNS"), T("Шифрование диска")], a: 0 },
    ];
  }
  const PLACE_RECS = { "Новичок": ["fundamentals", "osint", "windows"], "Средний": ["networking", "crypto", "phishing"], "Сложный": ["pentest", "blueteam", "ad"] };
  let placeState = null;
  function renderPlacement() {
    if (!placeState) placeState = { i: 0, score: 0, picked: null };
    const qs = placementQs(), st = placeState;
    if (st.i >= qs.length) return renderPlacementResult();
    const q = qs[st.i];
    root().innerHTML = `
      <section class="section placement">
        ${crumbs([["home", T("Главная")], [null, T("Тест уровня")]])}
        <div class="page-title"><h1>${T("С чего начать?")}</h1>
          <p>${T("6 коротких вопросов — подберём стартовый курс. Не знаете ответ — выбирайте «Не знаю», это нормально.")}</p></div>
        <div class="card place-card">
          <div class="place-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${qs.length}" aria-valuenow="${st.i}"><span style="width:${(st.i / qs.length) * 100}%"></span></div>
          <div class="place-num">${T("Вопрос")} ${st.i + 1} / ${qs.length}</div>
          <h2 class="place-q">${escapeHtml(q.q)}</h2>
          <div class="place-opts">
            ${q.o.map((o, k) => `<button class="choice-opt" onclick="App.placeAnswer(${k})">${escapeHtml(o)}</button>`).join("")}
            <button class="choice-opt place-skip" onclick="App.placeAnswer(-1)">${T("Не знаю")}</button>
          </div>
          <div class="place-foot"><button class="btn btn-ghost btn-sm" onclick="App.placeSkip(true)">${T("Пропустить тест")}</button>
            <span>${T("Его всегда можно пройти позже в профиле.")}</span></div>
        </div>
      </section>`;
    const first = root().querySelector(".place-opts button"); if (first && st.i > 0) first.focus();
  }
  function placeAnswer(k) {
    const q = placementQs()[placeState.i];
    if (k === q.a) placeState.score++;
    placeState.i++;
    renderPlacement(); updateTitle();
  }
  function renderPlacementResult() {
    const sc = placeState.score;
    const lvl = sc >= 5 ? "Сложный" : sc >= 3 ? "Средний" : "Новичок";
    const recs = PLACE_RECS[lvl].map((id) => COURSES.find((c) => c.id === id)).filter(Boolean);
    const msg = {
      "Новичок": T("Отличная точка старта! Начните с основ — дальше курсы будут открываться по мере прохождения."),
      "Средний": T("У вас уже есть база. Курсы среднего уровня открыты сразу — можно не проходить основы."),
      "Сложный": T("Впечатляет! Открыты все курсы, включая продвинутые. Начните с того, что интереснее."),
    }[lvl];
    root().innerHTML = `
      <section class="section placement">
        ${crumbs([["home", T("Главная")], [null, T("Тест уровня")]])}
        <div class="card place-card place-result">
          <div class="place-score">${sc} / ${placementQs().length}</div>
          <h1>${T("Ваш уровень:")} <span class="accent">${TL(lvl)}</span></h1>
          <p>${msg}</p>
          <h3>${T("Рекомендуем начать с")}</h3>
          <div class="place-recs">
            ${recs.map((c, i) => `<button class="place-rec ${i === 0 ? "main" : ""}" style="--c:${c.color}" onclick="App.placeFinish('${lvl}','${c.id}')">
              <span class="cont-ic">${Icon.course(c.id)}</span><span><b>${escapeHtml(c.title)}</b><small>${TL(c.level)} · ${c.rooms.length} ${T("комн.")}</small></span></button>`).join("")}
          </div>
          <div class="nf-actions"><button class="btn btn-ghost btn-sm" onclick="App.placeRetry()">${T("Пройти заново")}</button>
            <button class="btn btn-ghost btn-sm" onclick="App.placeFinish('${lvl}',null)">${T("Ко всем курсам")}</button></div>
        </div>
      </section>`;
  }
  function placeFinish(lvl, courseId) {
    if (lvl !== "Новичок") Progress.setPlacement(lvl);
    try { localStorage.setItem(ONBOARD_KEY, "1"); } catch (e) {}
    placeState = null;
    courseId ? go("course", { courseId }) : go("courses");
  }
  function placeRetry() { placeState = null; renderPlacement(); }
  const PLACE_SKIP_KEY = "cyberpath_place_skip";
  function placeSkipped() { try { return !!localStorage.getItem(PLACE_SKIP_KEY); } catch (e) { return false; } }
  // Пропуск теста: прячем приглашения, тест остаётся доступен из профиля
  function placeSkip(toCourses) {
    try { localStorage.setItem(PLACE_SKIP_KEY, "1"); } catch (e) {}
    placeState = null;
    if (document.getElementById("onboard")) endOnboard();
    if (toCourses === true && current.view === "start") go("home");
    else if (current.view === "home") renderHome();
  }
  function startPlacement() { endOnboard(); placeState = null; go("start"); }

  /* ---------- Аккаунт, вход и рейтинг ---------- */
  function cloudErr(e) {
    const m = String((e && (e.message || e.error_description)) || e || "");
    if (/invalid login|invalid_login|invalid credentials/i.test(m)) return T("Неверный ник или пароль.");
    if (/nick_taken|database error saving new user|already registered/i.test(m)) return T("Этот ник уже занят.");
    if (/nick_reserved/.test(m)) return T("Этот ник зарезервирован.");
    if (/invalid_nick/.test(m)) return T("Ник: 3–20 символов — латиница, цифры и _.");
    if (/weak_password|password should/i.test(m)) return T("Пароль — минимум 8 символов.");
    if (/captcha/i.test(m)) return T("Подтвердите, что вы не робот.");
    if (/rate limit|too many|429/i.test(m)) return T("Слишком много попыток. Подождите немного.");
    if (/manual linking|identity.*(already|exists)/i.test(m)) return T("Этот аккаунт GitHub/Google уже привязан к другому профилю или привязка отключена.");
    return T("Не удалось связаться с сервером. Проверьте интернет и попробуйте ещё раз.");
  }
  let accTab = "login", accToken = "";
  function openAccount() {
    closeUserMenu();
    if (!window.Cloud || !Cloud.enabled) { toast(T("Аккаунты пока не подключены.")); return; }
    let ov = document.getElementById("account-modal");
    if (!ov) {
      ov = document.createElement("div"); ov.id = "account-modal"; ov.className = "modal-overlay";
      ov.addEventListener("click", (e) => { if (e.target === ov) closeAccount(); });
      document.body.appendChild(ov); requestAnimationFrame(() => ov.classList.add("show"));
    }
    renderAccountModal();
    Cloud.connect().catch(() => {});
  }
  function closeAccount() { const ov = document.getElementById("account-modal"); if (ov) ov.remove(); }
  function providerBtns(action) {
    return `<div class="acc-oauth">
      <button class="btn acc-gh" onclick="App.${action}('github')">${GH_SVG} GitHub</button>
      <button class="btn acc-gg" onclick="App.${action}('google')">${GG_SVG} Google</button></div>`;
  }
  const GH_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z"/></svg>`;
  const GG_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.4c-.24 1.4-1.66 4.1-5.4 4.1-3.25 0-5.9-2.69-5.9-6s2.65-6 5.9-6c1.85 0 3.09.79 3.8 1.47l2.59-2.5C16.73 3.6 14.6 2.6 12 2.6 6.92 2.6 2.8 6.72 2.8 11.8S6.92 21 12 21c6.93 0 9.2-4.86 9.2-7.37 0-.5-.05-.87-.12-1.25H12z"/></svg>`;
  function renderAccountModal() {
    const ov = document.getElementById("account-modal"); if (!ov) return;
    const cs = Cloud.state;
    let body;
    if (cs.status === "loading") body = `<div class="acc-wait">${T("Подключение…")}</div>`;
    else if (cs.status === "in") {
      const ids = Cloud.identities();
      const pw = Cloud.isPasswordAccount();
      const hasRecovery = ids.includes("github") || ids.includes("google");
      body = `
        <div class="acc-me"><span class="acc-nick">${escapeHtml(cs.nick || "")}</span>
          <span class="acc-sync">${cs.syncing ? T("Синхронизация…") : cs.pending ? `${T("В очереди на отправку")}: ${cs.pending}` : "✓ " + T("Прогресс синхронизирован")}</span></div>
        <div class="acc-ids">${T("Способы входа")}: ${ids.map((p) => `<span class="acc-id">${p === "email" ? T("ник + пароль") : p === "github" ? "GitHub" : p === "google" ? "Google" : escapeHtml(p)}</span>`).join("")}</div>
        ${pw && !hasRecovery ? `<div class="acc-warn">⚠️ ${T("Восстановить пароль невозможно, пока к аккаунту не привязан GitHub или Google. Привяжите один из них — тогда сможете войти, даже если забудете пароль.")}</div>` : ""}
        ${!(ids.includes("github") && ids.includes("google")) ? `<div class="acc-sub">${T("Привязать вход")}</div>
          <div class="acc-oauth">${!ids.includes("github") ? `<button class="btn acc-gh" onclick="App.accLink('github')">${GH_SVG} GitHub</button>` : ""}${!ids.includes("google") ? `<button class="btn acc-gg" onclick="App.accLink('google')">${GG_SVG} Google</button>` : ""}</div>` : ""}
        <div class="acc-actions">
          <button class="btn btn-ghost btn-sm" onclick="App.go('leaderboard');App.closeAccount()">${T("Рейтинг")}</button>
          <button class="btn btn-ghost btn-sm" onclick="App.accSignOut()">${T("Выйти")}</button>
          <button class="btn btn-ghost btn-sm acc-danger" onclick="App.accDelete()">${T("Удалить аккаунт")}</button>
        </div>`;
    } else {
      const reg = accTab === "register";
      body = `
        <p class="acc-lead">${T("Аккаунт нужен только для рейтинга и синхронизации между устройствами. Без него всё работает как раньше.")}</p>
        ${providerBtns("accOAuth")}
        <div class="acc-or"><span>${T("или по нику")}</span></div>
        <div class="seg acc-tabs" role="tablist">
          <button class="seg-btn ${reg ? "" : "on"}" role="tab" aria-selected="${!reg}" onclick="App.accSetTab('login')">${T("Вход")}</button>
          <button class="seg-btn ${reg ? "on" : ""}" role="tab" aria-selected="${reg}" onclick="App.accSetTab('register')">${T("Регистрация")}</button>
        </div>
        <form class="acc-form" onsubmit="event.preventDefault();App.accSubmit()">
          <label>${T("Ник")}<input id="acc-nick" class="lab-input" autocomplete="username" maxlength="20" pattern="[A-Za-z0-9_]{3,20}" required spellcheck="false"></label>
          <label>${T("Пароль")}<input id="acc-pw" class="lab-input" type="password" autocomplete="${reg ? "new-password" : "current-password"}" minlength="${reg ? 8 : 1}" maxlength="72" required></label>
          ${reg ? `<label>${T("Пароль ещё раз")}<input id="acc-pw2" class="lab-input" type="password" autocomplete="new-password" minlength="8" maxlength="72" required></label>
            <p class="acc-note">${T("Ник: 3–20 символов, латиница, цифры и _. Его нельзя будет сменить.")}<br>⚠️ ${T("Без email пароль восстановить нельзя. Чтобы не потерять доступ, после регистрации привяжите GitHub или Google — тогда вход через них будет работать всегда.")}</p>` : ""}
          ${Cloud.captchaEnabled() ? `<div id="acc-captcha"></div>` : ""}
          <div id="acc-err" class="acc-err" role="alert"></div>
          <button class="btn btn-primary" type="submit">${reg ? T("Создать аккаунт") : T("Войти")}</button>
        </form>
        <p class="acc-note">${T("Мы храним только ник и прогресс прохождения. Подробнее — в разделе «Конфиденциальность».")}</p>`;
    }
    ov.innerHTML = `<div class="modal acc-modal" role="dialog" aria-modal="true" aria-label="${T("Аккаунт")}">
      <div class="acc-head"><h2>${cs.status === "in" ? T("Аккаунт") : T("Вход в CyberPath")}</h2><button class="acc-x" onclick="App.closeAccount()" aria-label="${T("Закрыть")}">✕</button></div>
      <div class="acc-body">${cs.error === "oauth" ? `<div class="acc-err">${T("Вход отменён или не удался.")}</div>` : ""}${body}</div></div>`;
    if (Cloud.captchaEnabled()) { accToken = ""; Cloud.renderCaptcha(document.getElementById("acc-captcha"), (t) => { accToken = t; }); }
  }
  function accSetTab(t) { accTab = t === "register" ? "register" : "login"; renderAccountModal(); }
  function accShowErr(msg) { const e = document.getElementById("acc-err"); if (e) e.textContent = msg; }
  async function accOAuth(p) { try { await Cloud.signInOAuth(p); } catch (e) { accShowErr(cloudErr(e)); } }
  async function accLink(p) { try { await Cloud.linkProvider(p); } catch (e) { toast(cloudErr(e)); } }
  async function accSubmit() {
    const nick = (document.getElementById("acc-nick") || {}).value || "";
    const pw = (document.getElementById("acc-pw") || {}).value || "";
    const btn = document.querySelector(".acc-form button[type=submit]");
    if (!Cloud.NICK_RE.test(nick.trim())) return accShowErr(T("Ник: 3–20 символов — латиница, цифры и _."));
    if (accTab === "register") {
      const pw2 = (document.getElementById("acc-pw2") || {}).value || "";
      if (pw.length < 8) return accShowErr(T("Пароль — минимум 8 символов."));
      if (pw !== pw2) return accShowErr(T("Пароли не совпадают."));
    }
    if (Cloud.captchaEnabled() && !accToken) return accShowErr(T("Подтвердите, что вы не робот."));
    if (btn) btn.disabled = true;
    try {
      if (accTab === "register") await Cloud.signUpNick(nick.trim(), pw, accToken);
      else await Cloud.signInNick(nick.trim(), pw, accToken);
      closeAccount(); toast(T("Вы вошли в аккаунт"));
    } catch (e) { accShowErr(cloudErr(e)); if (btn) btn.disabled = false; }
  }
  async function accSignOut() { await Cloud.signOut(); toast(T("Вы вышли из аккаунта. Прогресс остался на этом устройстве.")); }
  async function accDelete() {
    const ok = confirm(T("Удалить аккаунт? Ник, место в рейтинге и облачная копия прогресса будут удалены безвозвратно. Прогресс на этом устройстве останется."));
    if (!ok) return;
    try { await Cloud.deleteAccount(); closeAccount(); toast(T("Аккаунт удалён")); } catch (e) { toast(cloudErr(e)); }
  }

  // Выбор ника после первого входа через GitHub/Google
  function openNickModal() {
    if (document.getElementById("nick-modal")) return;
    closeAccount();
    const ov = document.createElement("div"); ov.id = "nick-modal"; ov.className = "modal-overlay";
    ov.innerHTML = `<div class="modal acc-modal" role="dialog" aria-modal="true" aria-label="${T("Выберите ник")}">
      <div class="acc-head"><h2>${T("Выберите ник")}</h2></div>
      <form class="acc-body acc-form" onsubmit="event.preventDefault();App.nickSubmit()">
        <p class="acc-lead">${T("Под ним вас увидят в рейтинге. 3–20 символов: латиница, цифры и _. Сменить потом нельзя.")}</p>
        <input id="nick-in" class="lab-input" maxlength="20" autocomplete="off" spellcheck="false" aria-label="${T("Ник")}" pattern="[A-Za-z0-9_]{3,20}" required>
        <div id="nick-err" class="acc-err" role="alert"></div>
        <button class="btn btn-primary" type="submit">${T("Сохранить")}</button>
        <button class="btn btn-ghost btn-sm" type="button" onclick="App.nickCancel()">${T("Выйти из аккаунта")}</button>
      </form></div>`;
    document.body.appendChild(ov); requestAnimationFrame(() => ov.classList.add("show"));
    setTimeout(() => { const i = document.getElementById("nick-in"); if (i) i.focus(); }, 50);
  }
  async function nickSubmit() {
    const v = ((document.getElementById("nick-in") || {}).value || "").trim();
    const err = document.getElementById("nick-err");
    if (!Cloud.NICK_RE.test(v)) { err.textContent = T("Ник: 3–20 символов — латиница, цифры и _."); return; }
    try { await Cloud.claimNick(v); const ov = document.getElementById("nick-modal"); if (ov) ov.remove(); toast(T("Готово! Вы в рейтинге.")); }
    catch (e) { err.textContent = cloudErr(e); }
  }
  async function nickCancel() { const ov = document.getElementById("nick-modal"); if (ov) ov.remove(); await Cloud.signOut(); }

  function accountCard() {
    if (!window.Cloud || !Cloud.enabled) return `<div id="acc-card"></div>`;
    const cs = Cloud.state;
    return `<div id="acc-card" class="acc-card">
      ${cs.status === "in"
        ? `<span>☁️ ${T("Аккаунт")}: <b>${escapeHtml(cs.nick || "")}</b> · ${cs.pending ? `${T("В очереди на отправку")}: ${cs.pending}` : T("синхронизировано")}</span>`
        : `<span>☁️ ${T("Войдите, чтобы попасть в рейтинг и синхронизировать прогресс между устройствами.")}</span>`}
      <button class="btn btn-ghost btn-sm" onclick="App.openAccount()">${cs.status === "in" ? T("Управление") : T("Войти")}</button></div>`;
  }

  let lbLoading = false;
  async function renderLeaderboard(period) {
    period = period === "week" ? "week" : "all";
    const head = `${crumbs([["home", T("Главная")], [null, T("Рейтинг")]])}
      <div class="page-title"><h1>${T("Рейтинг")}</h1><p>${T("Очки считаются на сервере: задания курсов (с учётом подсказок и множителя серии), экзамены, боссфайты, миссии, инструменты, флаги, ежедневный вопрос и недельный ивент.")}</p></div>
      <div class="seg lb-tabs"><a class="seg-btn ${period === "all" ? "on" : ""}" href="#/leaderboard">${T("За всё время")}</a><a class="seg-btn ${period === "week" ? "on" : ""}" href="#/leaderboard/week">${T("За 7 дней")}</a></div>`;
    if (!window.Cloud || !Cloud.enabled) {
      root().innerHTML = `<section class="section">${head}${emptyState("🏆", T("Рейтинг скоро появится"), T("Аккаунты и общий рейтинг ещё не подключены. Ваш прогресс сохраняется на этом устройстве."))}</section>`;
      return;
    }
    root().innerHTML = `<section class="section">${head}<div class="card lb-card"><div class="acc-wait">${T("Загрузка…")}</div></div></section>`;
    lbLoading = true;
    let res;
    try { res = await Cloud.leaderboard(period); }
    catch (e) { lbLoading = false; if (current.view !== "leaderboard") return; root().querySelector(".lb-card").innerHTML = emptyState("📡", T("Не удалось загрузить рейтинг"), cloudErr(e), `<button class="btn btn-ghost btn-sm" onclick="App.go('leaderboard',{period:'${period}'})">${T("Повторить")}</button>`); return; }
    lbLoading = false;
    if (current.view !== "leaderboard" || current.period !== period) return;
    const cs = Cloud.state;
    const medal = (n) => (n === 1 ? "🥇" : n === 2 ? "🥈" : n === 3 ? "🥉" : n);
    const rows = res.rows.map((r) => `<tr class="${r.is_me ? "me" : ""}"><td class="lb-place">${medal(Number(r.place))}</td><td class="lb-nick">${escapeHtml(String(r.nick))}${r.is_me ? ` <em>${T("вы")}</em>` : ""}</td><td class="lb-xp">${Number(r.xp)} XP</td><td class="lb-solved">${Number(r.solved)}</td></tr>`).join("");
    const me = res.me;
    const meLine = cs.status !== "in"
      ? `<div class="lb-me">${T("Войдите, чтобы попасть в рейтинг.")} <button class="btn btn-primary btn-sm" onclick="App.openAccount()">${T("Войти")}</button></div>`
      : me ? `<div class="lb-me">${T("Ваше место")}: <b>${Number(me.place)}</b> ${T("из")} ${Number(me.total)} · ${Number(me.xp)} XP${cs.pending ? ` · ${T("ещё в очереди")}: ${cs.pending}` : ""}</div>`
      : `<div class="lb-me">${T("Решите задание, чтобы появиться в рейтинге.")}${cs.pending ? ` ${T("В очереди на отправку")}: ${cs.pending}` : ""}</div>`;
    root().querySelector(".lb-card").innerHTML = res.rows.length
      ? `${meLine}<table class="lb-table"><thead><tr><th>#</th><th>${T("Ник")}</th><th>${T("Очки")}</th><th>${T("Заданий")}</th></tr></thead><tbody>${rows}</tbody></table>`
      : `${meLine}${emptyState("🏁", T("Пока никого нет"), T("Станьте первым в рейтинге!"))}`;
  }

  // Заголовок вкладки по текущей странице (для истории, закладок и вкладок)
  function updateTitle() {
    const base = "CyberPath";
    const h = document.querySelector("#view h1");
    const txt = h ? h.textContent.replace(/\s+/g, " ").trim() : "";
    document.title = current.view === "home" || !txt ? base + " — " + T("бесплатная платформа по кибербезопасности") : txt + " · " + base;
  }

  function renderNotFound(course) {
    const back = course
      ? `<button class="btn btn-primary" onclick="App.go('course',{courseId:'${course.id}'})">${T("К курсу")} «${escapeHtml(course.title)}»</button>`
      : `<button class="btn btn-primary" onclick="App.go('courses')">${T("Каталог курсов")}</button>`;
    root().innerHTML = `
      <section class="section notfound">
        <div class="nf-code" aria-hidden="true">404</div>
        <h1>${course ? T("Комната не найдена") : T("Страница не найдена")}</h1>
        <p>${T("Возможно, ссылка устарела или в ней опечатка. Даже лучшие разведчики иногда упираются в тупик.")}</p>
        <div class="nf-actions">${back}
          <button class="btn btn-ghost" onclick="App.go('home')">${T("На главную")}</button>
          <button class="btn btn-ghost" onclick="App.openPalette()">${T("Поиск")} ⌘K</button>
        </div>
        <pre class="nf-term" aria-hidden="true">$ cd ${escapeHtml(location.hash.replace(/^#/, "") || "/")}\nbash: cd: No such file or directory</pre>
      </section>`;
  }

  function renderLegal(page) {
    const keys = Object.keys(LEGAL);
    if (!LEGAL[page]) page = "about";
    const lang = window.I18N && I18N.current() === "en" ? "en" : "ru";
    const doc = LEGAL[page][lang];
    root().innerHTML = `
      <section class="section legal">
        ${crumbs([["home", T("Главная")], [null, doc.t]])}
        <div class="legal-tabs">${keys.map((k) => `<a href="#/legal/${k}" class="seg-btn ${k === page ? "on" : ""}">${LEGAL[k][lang].t}</a>`).join("")}</div>
        <article class="card legal-body"><h1>${doc.t}</h1>${doc.b}</article>
      </section>`;
    window.scrollTo(0, 0);
  }

  function renderNotes() {
    const list = Progress.notes();
    const groups = {};
    list.forEach((n) => (groups[n.courseId] = groups[n.courseId] || []).push(n));
    const roomTitle = (c, rid) => { const r = c && c.rooms.find((x) => x.id === rid); return r ? r.title : rid; };
    root().innerHTML = `
      <section class="section">
        ${crumbs([["home", T("Главная")], [null, T("Заметки")]])}
        <div class="page-title"><h1>${T("Мои заметки")}</h1>
          <p>${T("Выделите текст в любом уроке и нажмите «В заметки». Здесь можно дописать комментарий и скачать конспект.")}</p></div>
        <div class="notes-bar">
          <input class="lab-input" id="notes-q" placeholder="${T("Поиск по заметкам…")}" oninput="App.notesFilter(this.value)">
          <button class="btn btn-ghost btn-sm" onclick="App.exportNotes()" ${list.length ? "" : "disabled"}>⬇ ${T("Скачать конспект (.md)")}</button>
        </div>
        ${list.length ? Object.keys(groups).map((cid) => {
          const c = COURSES.find((x) => x.id === cid);
          return `<h2 class="rooms-title">${c ? c.title : cid}</h2>
            <div class="notes-grid">${groups[cid].map((n) => `
              <article class="note-card" data-q="${escapeAttr((n.text + " " + n.comment).toLowerCase())}">
                <a class="note-src" onclick="App.go('room',{courseId:'${cid}',roomId:'${n.roomId}'})">${roomTitle(c, n.roomId)} →</a>
                <blockquote>${escapeHtml(n.text)}</blockquote>
                <textarea class="note-com" placeholder="${T("Ваш комментарий…")}" onchange="App.noteComment('${n.id}',this.value)">${escapeHtml(n.comment || "")}</textarea>
                <div class="note-foot"><span>${new Date(n.ts).toLocaleDateString()}</span>
                  <button class="hint-btn" onclick="App.noteDelete('${n.id}')">${T("Удалить")}</button></div>
              </article>`).join("")}</div>`;
        }).join("") : `<div class="empty-state card"><div class="es-ic">📝</div><h3>${T("Пока нет заметок")}</h3>
            <p>${T("Откройте любую комнату, выделите важный фрагмент теории — появится кнопка «В заметки».")}</p>
            <button class="btn btn-primary" onclick="App.go('courses')">${T("К курсам")}</button></div>`}
      </section>`;
  }
  function notesFilter(q) {
    q = q.toLowerCase().trim();
    let shown = 0;
    document.querySelectorAll(".note-card").forEach((el) => { const ok = !q || el.dataset.q.includes(q); el.style.display = ok ? "" : "none"; if (ok) shown++; });
    let e = document.getElementById("notes-empty");
    if (!shown && q) {
      if (!e) { e = document.createElement("div"); e.id = "notes-empty"; const first = document.querySelector(".note-card"); if (first) first.parentElement.appendChild(e); }
      e.innerHTML = emptyState("📝", T("Ничего не найдено"), T("В заметках нет совпадений с запросом."));
    } else if (e) e.remove();
  }
  function noteComment(id, v) { Progress.updateNote(id, v); toast(T("Комментарий сохранён")); }
  function noteDelete(id) { Progress.deleteNote(id); renderNotes(); }
  function exportNotes() {
    const list = Progress.notes();
    let md = "# " + T("Конспект CyberPath") + "\n\n";
    const byC = {};
    list.forEach((n) => (byC[n.courseId] = byC[n.courseId] || []).push(n));
    Object.keys(byC).forEach((cid) => {
      const c = COURSES.find((x) => x.id === cid);
      md += "## " + (c ? c.title : cid) + "\n\n";
      byC[cid].forEach((n) => {
        const r = c && c.rooms.find((x) => x.id === n.roomId);
        md += "> " + n.text.replace(/\n/g, "\n> ") + "\n\n" + (r ? "_" + r.title + "_\n\n" : "") + (n.comment ? n.comment + "\n\n" : "");
      });
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    a.download = "cyberpath-notes.md";
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  }

  /* ---------- Хлебные крошки ---------- */
  function crumbs(items) {
    const parts = items.map(([to, label], i) => {
      const last = i === items.length - 1;
      if (last || to === null) return `<span class="crumb cur" aria-current="page">${label}</span>`;
      const act = typeof to === "string" ? `App.go('${to}')` : `App.go('course',{courseId:'${to.courseId}'})`;
      return `<a class="crumb" onclick="${act}">${i === 0 ? '<svg class="crumb-home" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>' : ""}<span>${label}</span></a>`;
    });
    return `<nav class="crumbs" aria-label="breadcrumb">${parts.join('<span class="crumb-sep" aria-hidden="true">/</span>')}</nav>`;
  }

  /* ---------- Значки званий (SVG-шеврон, цвет по «лиге») ---------- */
  const TIER_COLORS = {
    iron: ["#b4bac2", "#5d646d"], bronze: ["#f0b27a", "#9a5a2a"], silver: ["#eef1f5", "#8d97a5"],
    gold: ["#ffe08a", "#c68a08"], platinum: ["#b8f1ec", "#2f8f96"], diamond: ["#d3c6ff", "#5a3fd8"], legend: ["#ffb35c", "#d2312a"],
  };
  let badgeSeq = 0;
  function rankBadge(r, size, locked) {
    size = size || 44;
    const id = "rb" + (++badgeSeq);
    const [a, b] = locked ? ["#d5d8dd", "#9aa0a8"] : TIER_COLORS[r.tier] || TIER_COLORS.iron;
    const idx = RANKS.indexOf(r);
    const stars = Math.min(3, idx % 3 + 1);
    const pips = locked ? "" : Array.from({ length: stars }, (_, k) =>
      `<circle cx="${50 + (k - (stars - 1) / 2) * 11}" cy="98" r="3.4" fill="${b}"/>`).join("");
    const wings = !locked && (r.tier === "diamond" || r.tier === "legend")
      ? `<path d="M14 40 L2 30 L6 52 L14 58Z M86 40 L98 30 L94 52 L86 58Z" fill="${b}" opacity=".85"/>` : "";
    return `<span class="rbadge tier-${locked ? "locked" : r.tier}" style="width:${size}px;height:${size}px">
      <svg viewBox="0 0 100 106" aria-hidden="true">
        <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
        ${wings}
        <path d="M50 4 L88 20 L88 56 Q88 80 50 94 Q12 80 12 56 L12 20 Z" fill="url(#${id})" stroke="${b}" stroke-width="3"/>
        <path d="M50 13 L79 25 L79 55 Q79 73 50 85 Q21 73 21 55 L21 25 Z" fill="rgba(255,255,255,.22)"/>
        ${pips}
      </svg>
      <span class="rbadge-ic" style="font-size:${Math.round(size * 0.36)}px">${locked ? "🔒" : r.icon}</span>
    </span>`;
  }

  /* ---------- Дашборд: графики (inline SVG) ---------- */
  function dashboardSection() {
    const acc = Progress.accuracyOverall();
    const due = Progress.srsDueCount();
    const active = Object.keys(Progress._state().activeDays || {}).length;
    const kpis = [
      [T("Точность ответов"), acc.total ? acc.pct + "%" : "—", acc.total ? acc.correct + "/" + acc.total : T("нет данных")],
      [T("На повторение"), String(due), due ? T("карточек готово") : T("всё повторено")],
      [T("Активных дней"), String(active), T("с начала обучения")],
      [T("Всего попыток"), String(acc.total), acc.wrong + " " + T("с ошибкой")],
    ];
    return `
      <h2 class="rooms-title">${T("Аналитика")}</h2>
      <div class="kpi-row">
        ${kpis.map(([t, v, s]) => `<div class="kpi"><span class="kpi-t">${t}</span><b class="kpi-v">${v}</b><span class="kpi-s">${s}</span></div>`).join("")}
      </div>
      <div class="dash-grid">
        <div class="card chart-card">
          <div class="chart-head">
            <h3>${dashXpMode === "day" ? T("XP по дням") : T("XP по неделям")}</h3>
            <div class="seg" role="tablist" aria-label="${T("Период")}">
              <button class="seg-btn${dashXpMode === "week" ? " on" : ""}" role="tab" aria-selected="${dashXpMode === "week"}" onclick="App.setXpMode('week')">${T("Недели")}</button>
              <button class="seg-btn${dashXpMode === "day" ? " on" : ""}" role="tab" aria-selected="${dashXpMode === "day"}" onclick="App.setXpMode('day')">${T("Дни")}</button>
            </div>
          </div>
          ${xpBarsSVG()}
        </div>
        <div class="card chart-card">
          <div class="chart-head"><h3>${T("Радар навыков")}</h3><span class="chart-sub" title="${T("Оценка навыка = прохождение связанных курсов × качество (точность, подсказки) + сданные экзамены")}">${T("оценка 0–100 · наведите на навык")}</span></div>
          ${radarSVG()}
        </div>
        <div class="card chart-card wide">
          <div class="chart-head"><h3>${T("Календарь активности")}</h3><span class="chart-sub">${T("последние 17 недель")}</span></div>
          ${heatmapSVG()}
        </div>
      </div>`;
  }

  function xpBarsSVG() {
    const byDay = dashXpMode === "day";
    const data = byDay ? Progress.xpByDay(14) : Progress.xpByWeek(8);
    const max = Math.max(1, ...data);
    const W = 460, H = 170, pad = 26, bw = (W - pad * 2) / data.length;
    const bars = data.map((v, i) => {
      const h = Math.round((v / max) * (H - pad - 24));
      const x = pad + i * bw + bw * 0.18, y = H - 24 - h, w = bw * 0.64;
      const back = data.length - 1 - i;
      const showLbl = i === data.length - 1 || !byDay || back % 2 === 0;
      const lbl = !showLbl ? "" : (i === data.length - 1 ? T("сейчас") : (byDay ? back + T("д") : back + T("н")));
      return `<g>
        <rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${Math.max(h, 2)}" rx="4" fill="var(--o-500)"><title>${v} XP</title></rect>
        ${v > 0 ? `<text x="${(x + w / 2).toFixed(1)}" y="${y - 5}" class="c-val">${v}</text>` : ""}
        <text x="${(x + w / 2).toFixed(1)}" y="${H - 8}" class="c-axis">${lbl}</text>
      </g>`;
    }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="XP по неделям">
      <line x1="${pad}" y1="${H - 24}" x2="${W - pad}" y2="${H - 24}" class="c-base"/>${bars}</svg>`;
  }

  function radarSVG() {
    const data = Progress.skillRadar();
    const W = 560, H = 400, cx = W / 2, cy = H / 2, R = 132;
    const n = data.length;
    const pt = (i, r) => {
      const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
      return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r];
    };
    const f1 = (v) => v.toFixed(1);
    const rings = [0.25, 0.5, 0.75, 1].map((f) =>
      `<polygon points="${data.map((_, i) => pt(i, R * f).map(f1).join(",")).join(" ")}" class="c-ring"/>
       <text x="${cx + 5}" y="${f1(cy - R * f + 11)}" class="c-ring-lbl">${f * 100}</text>`).join("");
    const spokes = data.map((_, i) => { const [x, y] = pt(i, R); return `<line x1="${cx}" y1="${cy}" x2="${f1(x)}" y2="${f1(y)}" class="c-spoke"/>`; }).join("");
    const poly = data.map((d, i) => pt(i, Math.max(3, R * (d.pct / 100))).map(f1).join(",")).join(" ");
    const dots = data.map((d, i) => { const [x, y] = pt(i, R * (d.pct / 100)); return d.pct ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="4" fill="${d.color}" stroke="var(--surface)" stroke-width="1.5"><title>${T(d.title)}: ${d.pct}/100</title></circle>` : ""; }).join("");
    const labels = data.map((d, i) => {
      const [x, y] = pt(i, R + 20);
      const c = Math.cos(-Math.PI / 2 + (i / n) * Math.PI * 2);
      const anchor = Math.abs(c) < 0.2 ? "middle" : c > 0 ? "start" : "end";
      const tt = T(d.title), name = tt.length > 22 ? tt.slice(0, 21) + "…" : tt;
      return `<g class="radar-lbl"><title>${T(d.title)}: ${d.pct}/100\n${d.parts.join("\n")}</title>
        <text x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" class="c-lbl">${name}</text>
        <text x="${f1(x)}" y="${f1(y + 13)}" text-anchor="${anchor}" class="c-lbl-pct ${d.pct >= 85 ? "full" : ""}">${d.pct}/100</text></g>`;
    }).join("");
    const empty = data.every((d) => !d.pct);
    return `<svg viewBox="0 0 ${W} ${H}" class="chart-svg radar" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${T("Радар навыков")}">
      ${rings}${spokes}
      <polygon points="${poly}" class="radar-area"/>
      ${dots}${labels}
      ${empty ? `<text x="${cx}" y="${cy + 4}" text-anchor="middle" class="c-empty">${T("Решите первые задания — радар оживёт")}</text>` : ""}</svg>`;
  }

  function heatmapSVG() {
    const days = Progress.activityMap(119);
    const cell = 14, gap = 4, left = 30, top = 20;
    const offset = days[0].dow; // выравниваем по дням недели: строка = Пн..Вс
    const cols = Math.ceil((days.length + offset) / 7);
    const W = left + cols * (cell + gap) + 4, H = top + 7 * (cell + gap) + 4;
    const max = Math.max(1, ...days.map((d) => d.xp));
    const lvl = (xp) => xp <= 0 ? 0 : Math.min(4, 1 + Math.floor((xp / max) * 3.999));
    const shades = ["var(--heat-0)", "var(--o-200)", "var(--o-300)", "var(--o-500)", "var(--o-700)"];
    const MONTHS = I18N_MONTHS();
    let lastMonth = -1, monthLbls = "";
    const cells = days.map((d, i) => {
      const pos = i + offset, col = Math.floor(pos / 7), row = pos % 7;
      const x = left + col * (cell + gap), y = top + row * (cell + gap);
      if ((row === 0 || i === 0) && d.month !== lastMonth) {
        monthLbls += `<text x="${x}" y="12" class="c-axis-l">${MONTHS[d.month]}</text>`; lastMonth = d.month;
      }
      const fill = d.xp > 0 ? shades[lvl(d.xp)] : d.visited ? "var(--o-100)" : shades[0];
      const today = i === days.length - 1;
      return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3" fill="${fill}" class="hm-cell${today ? " today" : ""}" style="--i:${col}"><title>${d.date}: ${d.xp} XP${d.visited && !d.xp ? " (" + T("визит") + ")" : ""}</title></rect>`;
    }).join("");
    const dows = [[0, T("Пн")], [2, T("Ср")], [4, T("Пт")], [6, T("Вс")]].map(([r, l]) =>
      `<text x="0" y="${top + r * (cell + gap) + 11}" class="c-axis-l">${l}</text>`).join("");
    // Сводка
    const active = days.filter((d) => d.xp > 0 || d.visited).length;
    const best = days.reduce((m, d) => d.xp > m.xp ? d : m, { xp: 0 });
    let run = 0, bestRun = 0;
    days.forEach((d) => { run = d.xp > 0 || d.visited ? run + 1 : 0; bestRun = Math.max(bestRun, run); });
    const total = days.reduce((n, d) => n + d.xp, 0);
    return `<div class="heatmap-wrap">
      <div class="hm-stats">
        <div><b>${active}</b><span>${T("активных дней")}</span></div>
        <div><b>${total}</b><span>${T("XP за период")}</span></div>
        <div><b>${best.xp || "—"}</b><span>${T("лучший день")}${best.date ? " · " + best.date.slice(5) : ""}</span></div>
        <div><b>${bestRun}</b><span>${T("макс. серия дней")}</span></div>
      </div>
      <div class="hm-scroll"><svg viewBox="0 0 ${W} ${H}" class="heatmap" role="img" aria-label="${T("Календарь активности")}">${monthLbls}${dows}${cells}</svg></div>
      <div class="heat-legend"><span>${T("меньше")}</span>
        ${[0, 1, 2, 3, 4].map((l) => `<span class="heat-key" style="background:${shades[l]}"></span>`).join("")}
        <span>${T("больше")}</span></div></div>`;
  }
  function I18N_MONTHS() {
    return (window.I18N && I18N.get() === "en")
      ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      : ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  }

  /* ---------- Аватар и редактор профиля ---------- */
  const AVATAR_PRESETS = ["🦊", "🐺", "🦉", "🐱", "🐼", "🐧", "🤖", "👾", "🧠", "🛡️", "🕵️", "🧑‍💻", "🐉", "🦅", "🐍", "⚡", "🔥", "🌌", "🎯", "🗝️"];
  const AVATAR_BGS = [
    ["#ff8c47", "#db5300"], ["#60a5fa", "#1d4ed8"], ["#34d399", "#047857"], ["#c084fc", "#6d28d9"],
    ["#f472b6", "#be185d"], ["#fbbf24", "#b45309"], ["#94a3b8", "#334155"], ["#2dd4bf", "#0f766e"],
  ];
  const RING_COLORS = { tier: null, orange: "#f2620a", blue: "#2563eb", green: "#16a34a", purple: "#7c3aed", pink: "#db2777", mono: "#6b7280" };
  function displayName() { const n = Progress.profile().nick; return n || T("Оператор CyberPath"); }
  function avatarHTML(size, pr) {
    pr = pr || Progress.profile();
    const bg = AVATAR_BGS[pr.bg % AVATAR_BGS.length];
    const ring = RING_COLORS[pr.ring] || "var(--tier-b, var(--o-500))";
    const inner = pr.avatar.kind === "upload" && /^data:image\/(png|jpeg|webp);base64,/.test(pr.avatar.value)
      ? `<img src="${pr.avatar.value}" alt="">`
      : `<span style="font-size:${Math.round(size * 0.5)}px">${escapeHtml(pr.avatar.value || "🦊")}</span>`;
    return `<span class="avatar" style="width:${size}px;height:${size}px;--av1:${bg[0]};--av2:${bg[1]};--ring:${ring}">${inner}</span>`;
  }
  let profDraft = null;
  function openProfileEditor() {
    const pr = Progress.profile();
    profDraft = JSON.parse(JSON.stringify(pr));
    let ov = document.getElementById("profile-modal");
    if (ov) ov.remove();
    ov = document.createElement("div");
    ov.id = "profile-modal"; ov.className = "modal-overlay";
    ov.innerHTML = `<div class="modal prof-panel" role="dialog" aria-label="${T("Редактировать профиль")}">
      <div class="modal-head"><h3>${T("Редактировать профиль")}</h3><button class="modal-x" onclick="App.closeProfileEditor()" aria-label="Close">✕</button></div>
      <div class="prof-body">
        <div class="prof-preview" id="prof-preview"></div>
        <label class="prof-f"><span>${T("Ник")}</span>
          <input class="lab-input" id="pf-nick" maxlength="24" placeholder="${T("Например, NightOwl")}" value="${escapeAttr(pr.nick)}" oninput="App.profDraftSet('nick', this.value)"></label>
        <label class="prof-f"><span>${T("Статус")}</span>
          <input class="lab-input" id="pf-bio" maxlength="120" placeholder="${T("Пара слов о себе или цели")}" value="${escapeAttr(pr.bio)}" oninput="App.profDraftSet('bio', this.value)"></label>
        <div class="prof-f"><span>${T("Аватар")}</span>
          <div class="seg prof-tabs">
            <button data-t="preset" onclick="App.profTab('preset')">${T("Готовые")}</button>
            <button data-t="emoji" onclick="App.profTab('emoji')">${T("Свой эмодзи")}</button>
            <button data-t="upload" onclick="App.profTab('upload')">${T("Загрузить")}</button>
          </div>
          <div id="prof-tab"></div>
        </div>
        <div class="prof-f"><span>${T("Фон аватара")}</span>
          <div class="swatches">${AVATAR_BGS.map((b, i) => `<button class="sw" data-bg="${i}" style="background:linear-gradient(135deg,${b[0]},${b[1]})" onclick="App.profDraftSet('bg', ${i})" aria-label="bg ${i + 1}"></button>`).join("")}</div>
        </div>
        <div class="prof-f"><span>${T("Обводка")}</span>
          <div class="swatches">${Object.entries(RING_COLORS).map(([k, c]) => `<button class="sw ring-sw" data-ring="${k}" style="${c ? `background:${c}` : ""}" title="${k === "tier" ? T("По лиге звания") : k}" onclick="App.profDraftSet('ring','${k}')">${k === "tier" ? "🏅" : ""}</button>`).join("")}</div>
        </div>
        <div class="prof-f"><span>${T("Витрина достижений")} <small>(${T("до 3")})</small></span>
          <div class="showcase-pick">${ACHIEVEMENTS.filter((a) => Progress.hasAchievement(a.id)).map((a) => `<button class="sc-opt" data-id="${a.id}" title="${escapeAttr(a.title)}" onclick="App.profToggleShowcase('${a.id}')">${a.icon}</button>`).join("") || `<span class="muted">${T("Получите первые достижения — их можно будет показать здесь.")}</span>`}</div>
        </div>
      </div>
      <div class="prof-foot">
        <button class="btn btn-ghost" onclick="App.closeProfileEditor()">${T("Отмена")}</button>
        <button class="btn btn-primary" onclick="App.saveProfile()">${T("Сохранить")}</button>
      </div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener("click", (e) => { if (e.target === ov) closeProfileEditor(); });
    requestAnimationFrame(() => ov.classList.add("show"));
    profTab(profDraft.avatar.kind === "upload" ? "upload" : profDraft.avatar.kind === "emoji" ? "emoji" : "preset");
    profRefresh();
  }
  function closeProfileEditor() { const ov = document.getElementById("profile-modal"); if (ov) ov.classList.remove("show"); }
  function profTab(t) {
    document.querySelectorAll(".prof-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.t === t));
    const box = document.getElementById("prof-tab"); if (!box) return;
    if (t === "preset") {
      box.innerHTML = `<div class="av-grid">${AVATAR_PRESETS.map((e) => `<button class="av-opt ${profDraft.avatar.kind === "preset" && profDraft.avatar.value === e ? "on" : ""}" onclick="App.profAvatar('preset', this.textContent)">${e}</button>`).join("")}</div>`;
    } else if (t === "emoji") {
      box.innerHTML = `<div class="av-row"><input class="lab-input av-emoji" maxlength="8" placeholder="🙂" value="${profDraft.avatar.kind === "emoji" ? escapeAttr(profDraft.avatar.value) : ""}" oninput="App.profAvatar('emoji', this.value)">
        <span class="muted">${T("Вставьте любой эмодзи или 1–2 символа (например, инициалы).")}</span></div>`;
    } else {
      box.innerHTML = `<div class="av-row">
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('pf-file').click()">📁 ${T("Выбрать изображение")}</button>
        <input id="pf-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onchange="App.profUpload(this.files[0])">
        <span class="muted">${T("PNG/JPG/WebP до 5 МБ. Картинка обрежется до квадрата и сожмётся, хранится только в этом браузере.")}</span></div>`;
    }
  }
  function profAvatar(kind, value) {
    value = String(value || "").trim();
    if (kind === "emoji") value = Array.from(value).slice(0, 4).join("");
    if (!value) return;
    profDraft.avatar = { kind, value };
    document.querySelectorAll(".av-opt").forEach((b) => b.classList.toggle("on", kind === "preset" && b.textContent === value));
    profRefresh();
  }
  function profUpload(file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { toast(T("Нужен файл изображения")); return; }
    if (file.size > 5 * 1024 * 1024) { toast(T("Файл больше 5 МБ")); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const S = 192, cv = document.createElement("canvas");
      cv.width = cv.height = S;
      const g = cv.getContext("2d");
      const m = Math.min(img.width, img.height);
      g.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S);
      URL.revokeObjectURL(url);
      profDraft.avatar = { kind: "upload", value: cv.toDataURL("image/jpeg", 0.86) };
      profRefresh();
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast(T("Не удалось прочитать изображение")); };
    img.src = url;
  }
  function profDraftSet(k, v) { profDraft[k] = v; profRefresh(); }
  function profToggleShowcase(id) {
    const sc = profDraft.showcase || (profDraft.showcase = []);
    const i = sc.indexOf(id);
    if (i >= 0) sc.splice(i, 1); else if (sc.length < 3) sc.push(id); else toast(T("Можно выбрать не больше трёх"));
    profRefresh();
  }
  function profRefresh() {
    const pv = document.getElementById("prof-preview"); if (!pv) return;
    const s = Progress.overallStats();
    pv.className = "prof-preview tier-" + s.rank.tier;
    pv.innerHTML = `${avatarHTML(72, profDraft)}<div><b>${escapeHtml(profDraft.nick || T("Оператор CyberPath"))}</b>
      <span>${s.rank.icon} ${s.rank.name} · LVL ${s.level}</span>${profDraft.bio ? `<em>${escapeHtml(profDraft.bio)}</em>` : ""}
      <span class="pv-sc">${(profDraft.showcase || []).map((id) => (ACHIEVEMENTS.find((a) => a.id === id) || {}).icon || "").join(" ")}</span></div>`;
    document.querySelectorAll(".sw[data-bg]").forEach((b) => b.classList.toggle("on", +b.dataset.bg === +profDraft.bg));
    document.querySelectorAll(".sw[data-ring]").forEach((b) => b.classList.toggle("on", b.dataset.ring === profDraft.ring));
    document.querySelectorAll(".sc-opt").forEach((b) => b.classList.toggle("on", (profDraft.showcase || []).includes(b.dataset.id)));
  }
  function saveProfile() {
    Progress.setProfile(profDraft);
    closeProfileEditor();
    toast("✓ " + T("Профиль сохранён"));
    renderNav();
    if (current.view === "profile") renderProfile();
  }

  /* ---------- Карточка игрока (уникальный вид на каждой лиге) ---------- */
  function playerCard(s) {
    const r = s.rank, next = s.nextRank;
    const prevMin = r.min, nextMin = next ? next.min : r.min;
    const rankPct = next ? Math.round(((s.level - prevMin) + s.xpInLevel / 100) / (nextMin - prevMin) * 100) : 100;
    const rIdx = RANKS.indexOf(r);
    return `
      <div class="player-card tier-${r.tier}">
        <div class="pc-glow"></div>
        <div class="pc-left">
          <button class="pc-avatar" onclick="App.openProfileEditor()" title="${T("Редактировать профиль")}">${avatarHTML(104)}<span class="pc-edit">✎</span>
            <span class="pc-mini-badge" onclick="event.stopPropagation();App.openRanks()" title="${T("Лестница званий")}">${rankBadge(r, 44)}</span></button>
          <span class="pc-tier">${T(TIER_NAMES[r.tier])} · ${rIdx + 1}/${RANKS.length}</span>
        </div>
        <div class="pc-main">
          <h2 class="pc-rank pc-nick">${escapeHtml(displayName())}</h2>
          <button class="pc-cur-rank" onclick="App.openRanks()" title="${T("Лестница званий")}">
            <span class="pcr-ic">${r.icon}</span><span class="pcr-txt"><small>${T("Ваше звание")} · ${T(TIER_NAMES[r.tier])}</small><b>${r.name}</b></span></button>
          ${Progress.profile().bio ? `<p class="pc-bio">${escapeHtml(Progress.profile().bio)}</p>` : ""}
          ${Progress.profile().showcase.length ? `<div class="pc-showcase">${Progress.profile().showcase.map((id) => { const a = ACHIEVEMENTS.find((x) => x.id === id); return a ? `<span class="pcs r-${ACH_RARITY[id] || "common"}" title="${escapeAttr(a.title)}">${a.icon}<b>${a.title}</b></span>` : ""; }).join("")}</div>` : ""}
          <div class="pc-lvl"><b>LVL ${s.level}</b><span>${s.xp} XP</span></div>
          <div class="pc-bar" title="${T("до следующего уровня")}"><span style="width:${s.xpInLevel}%"></span></div>
          <div class="pc-bar-meta"><span>${T("до следующего уровня")}</span><span>${s.xpToNext} XP</span></div>
          <div class="pc-next">${next
            ? `<span>${T("Далее")}: ${next.icon} ${next.name} · LVL ${next.min}</span><div class="pc-bar thin"><span style="width:${Math.max(3, Math.min(100, rankPct))}%"></span></div>`
            : `<b>${T("Высшее звание достигнуто")}</b>`}</div>
        </div>
        <div class="pc-stats">
          <div class="ps"><b>${s.tasksDone}<small>/${s.tasksTotal}</small></b><span>${T("заданий")}</span></div>
          <div class="ps"><b>${s.coursesDone}<small>/${s.coursesTotal}</small></b><span>${T("курсов пройдено")}</span></div>
          <div class="ps"><b>${s.streak}🔥</b><span>${T("дней подряд")}</span></div>
          <div class="ps"><b>${s.achievements}<small>/${s.achievementsTotal}</small></b><span>${T("Достижения")}</span></div>
        </div>
        <div class="pc-actions">
          <button class="btn btn-ghost btn-sm" onclick="App.openProfileEditor()">✎ ${T("Редактировать профиль")}</button>
          <button class="btn btn-ghost btn-sm" onclick="App.go('notes')">📝 ${T("Заметки")} (${Progress.notes().length})</button>
          <button class="btn btn-ghost btn-sm" onclick="App.openRanks()">${T("Звания")}</button>
          <button class="btn btn-ghost btn-sm" onclick="App.shareCard()">${Icon.ui("progress")} ${T("Поделиться карточкой")}</button>
        </div>
      </div>`;
  }

  /* ---------- Достижения: редкость, прогресс, фильтр ---------- */
  let achFilter = "all";
  function achGrid() {
    const RL = { common: T("Обычное"), rare: T("Редкое"), epic: T("Эпическое"), legendary: T("Легендарное") };
    const st = Progress._state();
    const list = ACHIEVEMENTS.map((a) => {
      const got = Progress.hasAchievement(a.id);
      const cur = a.metric ? Math.min(a.goal, Progress.metric(a.metric)) : 0;
      return { a, got, cur, rar: ACH_RARITY[a.id] || "common" };
    }).filter((x) => achFilter === "all" || (achFilter === "got" ? x.got : !x.got));
    const order = { legendary: 0, epic: 1, rare: 2, common: 3 };
    list.sort((x, y) => (y.got - x.got) || (y.cur / (y.a.goal || 1) - x.cur / (x.a.goal || 1)) || order[x.rar] - order[y.rar]);
    return list.map(({ a, got, cur, rar }) => {
      const when = got && typeof st.achievements[a.id] === "number" ? new Date(st.achievements[a.id]).toLocaleDateString() : "";
      return `<div class="ach r-${rar} ${got ? "got" : "locked"}" title="${a.desc}" onmousemove="App.tilt(event,this)" onmouseleave="this.style.transform=''">
        <span class="ach-rar">${RL[rar]}</span>
        <span class="ach-ic">${a.icon}</span>
        <b>${a.title}</b>
        <span class="ach-desc">${a.desc}</span>
        ${got ? `<span class="ach-when">✓ ${when}</span>`
          : a.metric ? `<div class="ach-prog"><span style="width:${Math.round(cur / a.goal * 100)}%"></span></div><span class="ach-when">${cur} / ${a.goal}</span>` : ""}
      </div>`;
    }).join("") || `<p class="muted">${T("Пока пусто")}</p>`;
  }
  function achSetFilter(f) {
    achFilter = f;
    document.querySelectorAll(".ach-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.f === f));
    const g = document.getElementById("ach-grid"); if (g) g.innerHTML = achGrid();
  }
  function tilt(e, el) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(600px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg) translateY(-3px)`;
  }

  /* ---------- Послужной список (доп. сводка профиля) ---------- */
  function profileExtras() {
    const st = Progress._state();
    const M = (n) => Progress.metric(n);
    const missionsDone = typeof MISSIONS !== "undefined" ? MISSIONS.filter((m) => st.completed["mission_" + m.id]).length : 0;
    const missionsTotal = typeof MISSIONS !== "undefined" ? MISSIONS.length : 0;
    const roomsTotal = COURSES.reduce((n, c) => n + c.rooms.filter((r) => r.tasks.length).length, 0);
    const since = st.createdAt ? new Date(st.createdAt) : new Date();
    const days = Math.max(1, Math.round((Date.now() - since.getTime()) / 86400000));
    const active = Object.keys(st.activeDays || {}).length;
    const rec = [
      [Icon.ui("check"), M("rooms") + "/" + roomsTotal, T("комнат пройдено")],
      [Icon.ui("terminal"), M("labs"), T("лабораторных")],
      [Icon.ui("book"), M("exams"), T("экзаменов сдано")],
      [Icon.ui("target"), missionsDone + "/" + missionsTotal, T("CTF-миссий")],
      [Icon.ui("shield"), M("tools") + "/6", T("расследований Blue Team")],
      [Icon.ui("flag"), M("flags") + "/6", T("флагов найдено")],
      [Icon.ui("code"), M("cmds"), T("команд в терминале")],
      [Icon.ui("bolt"), M("combo"), T("лучшее комбо")],
    ];
    const skills = Progress.skillRadar().slice().sort((a, b) => b.pct - a.pct).slice(0, 4);
    const goals = ACHIEVEMENTS.filter((a) => a.metric && !Progress.hasAchievement(a.id))
      .map((a) => ({ a, cur: Math.min(a.goal, M(a.metric)) }))
      .sort((x, y) => y.cur / y.a.goal - x.cur / x.a.goal).slice(0, 3);
    const recent = Object.entries(st.achievements || {}).filter(([, t]) => typeof t === "number")
      .sort((x, y) => y[1] - x[1]).slice(0, 4)
      .map(([id, t]) => ({ a: ACHIEVEMENTS.find((x) => x.id === id), t })).filter((x) => x.a);
    return `
      <h2 class="rooms-title">${T("Послужной список")}</h2>
      <p class="pe-since">${T("В CyberPath с")} <b>${since.toLocaleDateString(window.I18N && I18N.current() === "en" ? "en-GB" : "ru-RU")}</b> · ${days} ${T("дн.")} · ${active} ${T("активных дней")}</p>
      <div class="pe-grid">
        ${rec.map(([ic, v, l]) => `<div class="pe-cell"><span class="pe-ic">${ic}</span><b>${v}</b><span>${l}</span></div>`).join("")}
      </div>
      <div class="pe-cols">
        <div class="card pe-card"><h3>${T("Сильные стороны")}</h3>
          ${skills.map((k) => `<div class="pe-skill"><span>${T(k.title)}</span><div class="pe-sbar"><i style="width:${k.pct}%;background:${k.color}"></i></div><b>${k.pct}</b></div>`).join("")}
        </div>
        <div class="card pe-card"><h3>${T("Ближайшие цели")}</h3>
          ${goals.length ? goals.map(({ a, cur }) => `<div class="pe-goal"><span class="pe-gi">${a.icon}</span><div><b>${a.title}</b><div class="pe-sbar"><i style="width:${Math.round(cur / a.goal * 100)}%"></i></div></div><em>${cur}/${a.goal}</em></div>`).join("") : `<p class="muted">${T("Все цели достигнуты")}</p>`}
        </div>
        <div class="card pe-card"><h3>${T("Последние достижения")}</h3>
          ${recent.length ? recent.map(({ a, t }) => `<div class="pe-goal"><span class="pe-gi">${a.icon}</span><div><b>${a.title}</b><small>${new Date(t).toLocaleDateString()}</small></div></div>`).join("") : `<p class="muted">${T("Пока пусто")}</p>`}
        </div>
      </div>`;
  }

  function platformMasteryCard(s) {
    const pct = s.tasksTotal ? Math.round(s.tasksDone / s.tasksTotal * 100) : 0;
    const next = s.nextRank;
    // XP до следующего звания (звание даётся по уровню, уровень = 100 XP)
    const xpToRank = next ? Math.max(0, (next.min - 1) * 100 - s.xp) : 0;
    const tasksToRank = Math.ceil(xpToRank / 13); // ~13 XP за задание в среднем
    const seg = [
      [s.coursesDone, s.coursesTotal, T("курсы")],
      [Progress.metric("rooms"), COURSES.reduce((n, c) => n + c.rooms.filter((r) => r.tasks.length).length, 0), T("комнаты")],
      [Progress.metric("labs"), COURSES.reduce((n, c) => n + c.rooms.reduce((a, r) => a + r.tasks.filter((t) => t.type === "lab").length, 0), 0), T("лаборатории")],
      [Progress.metric("flags"), 6, T("флаги")],
      [Progress.metric("exams"), COURSES.length, T("экзамены")],
    ];
    return `
      <div class="pmastery card">
        <div class="pm-top">
          <div><span class="pm-kicker">${T("Освоение платформы")}</span><h2>${pct}%</h2></div>
          <div class="pm-sub">
            <b>${s.tasksDone} / ${s.tasksTotal}</b> <span>${T("заданий выполнено")}</span>
            ${next ? `<div class="pm-forecast">${T("До звания")} <b>${next.icon || ""} ${next.name}</b>: ${xpToRank} XP <span class="muted">(≈ ${tasksToRank} ${T("заданий")})</span></div>`
              : `<div class="pm-forecast">🏆 ${T("Высшее звание достигнуто")}</div>`}
          </div>
        </div>
        <div class="pm-bar"><span style="width:${pct}%"></span></div>
        <div class="pm-seg">
          ${seg.map(([d, t, l]) => `<div class="pm-chip ${d >= t ? "full" : ""}"><b>${d}/${t}</b><span>${l}</span></div>`).join("")}
        </div>
      </div>`;
  }

  function capstoneCard(s) {
    const done = s.coursesDone, total = s.coursesTotal, pct = Math.round(done / total * 100);
    if (done >= total) {
      return `
        <div class="capstone done">
          <div class="cap-badge">★</div>
          <div class="cap-body">
            <span class="cap-kicker">${T("Диплом мастера CyberPath")}</span>
            <h2>${T("Все курсы пройдены!")}</h2>
            <p>${T("Вы освоили все")} ${total} ${T("курсов направления. Скачайте именной диплом мастера.")}</p>
          </div>
          <div class="cap-dl"><button class="btn btn-primary" onclick="App.downloadMasterCertificate('pdf')">${Icon.ui("progress")} ${T("Скачать диплом")} PDF</button><button class="btn btn-ghost" onclick="App.downloadMasterCertificate('png')">PNG</button></div>
        </div>`;
    }
    return `
      <div class="capstone">
        <div class="cap-badge locked">★</div>
        <div class="cap-body">
          <span class="cap-kicker">${T("Диплом мастера CyberPath")}</span>
          <h2>${done}/${total} ${T("курсов")}</h2>
          <p>${T("Пройдите все курсы на 100%, чтобы получить именной диплом мастера.")}</p>
          <div class="cap-bar"><span style="width:${pct}%"></span></div>
        </div>
        <span class="cap-pct">${pct}%</span>
      </div>`;
  }

  function certificatesSection(s) {
    const earned = COURSES.filter((c) => Progress.courseProgress(c).pct === 100);
    const all = s.coursesDone >= s.coursesTotal;
    return `
      <h2 class="rooms-title">${T("Мои сертификаты")} (${earned.length}/${s.coursesTotal})</h2>
      ${earned.length || all ? `<div class="cert-grid">
        ${all ? `<button class="cert-chip master" onclick="App.downloadMasterCertificate()">
          <span class="cc-ic">★</span><div><b>${T("Диплом мастера")}</b><span>${T("весь путь")} · PNG</span></div>${Icon.ui("progress")}</button>` : ""}
        ${earned.map((c) => `<button class="cert-chip" style="--c:${c.color}" onclick="App.downloadCertificate('${c.id}')">
          <span class="cc-ic" style="color:${c.color}">${Icon.course(c.id)}</span><div><b>${c.title}</b><span>${T("сертификат")} · PNG</span></div>${Icon.ui("progress")}</button>`).join("")}
      </div>` : `<p class="muted cert-empty">${T("Пройдите курс на 100%, чтобы получить сертификат. Он появится здесь для скачивания.")}</p>`}`;
  }

  function renderProfile() {
    const s = Progress.overallStats();
    root().innerHTML = `
      <section class="section">
        <div class="page-title"><h1>${T("Профиль и прогресс")}</h1></div>

        ${playerCard(s)}

        ${platformMasteryCard(s)}

        ${capstoneCard(s)}

        ${profileExtras()}

        ${dashboardSection()}

        <h2 class="rooms-title">${T("Прогресс по курсам")}</h2>
        <div class="course-progress-list">
          ${COURSES.map((c) => {
            const p = Progress.courseProgress(c);
            const m = Progress.courseMastery(c);
            return `<div class="cpl-row" onclick="App.go('course',{courseId:'${c.id}'})">
              <span class="cpl-ic" style="color:${c.color}">${Icon.course(c.id)}</span>
              <div class="cpl-body">
                <div class="cpl-head"><b>${c.title}</b><span>${p.pct}%${p.done ? ` · <span class="mastery" title="${T("Освоение: прохождение × точность (подсказки снижают) + экзамен")}">${T("освоение")} ${m.score}/100${m.exam ? " 📜" : ""}</span>` : ""}</span></div>
                <div class="xp-bar"><span style="width:${p.pct}%;background:${c.color}"></span></div>
              </div>
            </div>`;
          }).join("")}
        </div>

        ${certificatesSection(s)}

        <h2 class="rooms-title">${T("Достижения")} (${s.achievements}/${s.achievementsTotal})</h2>
        <div class="ach-tabs">
          ${[["all", T("Все")], ["got", T("Получены")], ["todo", T("В процессе")]].map(([f, l]) => `<button data-f="${f}" class="${achFilter === f ? "on" : ""}" onclick="App.achSetFilter('${f}')">${l}</button>`).join("")}
        </div>
        <div class="ach-grid" id="ach-grid">${achGrid()}</div>

        <h2 class="rooms-title">${T("Данные и синхронизация")}</h2>
        <div class="data-zone card">
          <div>
            <h3>${T("Перенос прогресса")}</h3>
            <p>${T("Прогресс хранится в этом браузере. Чтобы перенести его на другое устройство, войдите в аккаунт — он синхронизируется автоматически.")}</p>
          </div>
          ${accountCard()}
          <div class="data-actions">
            <button class="btn btn-ghost" onclick="App.startOnboard()">${Icon.ui("quest")} ${T("Пройти тур заново")}</button>
            <button class="btn btn-ghost" onclick="App.startPlacement()">🧭 ${Progress.placement() ? T("Пройти тест уровня заново") : T("Тест уровня")}</button>
            <button class="btn btn-ghost" onclick="App.toggleSound()">${Icon.ui(soundOn() ? "bolt" : "lock")} ${soundOn() ? T("Звук наград: вкл") : T("Звук наград: выкл")}</button>
          </div>
        </div>

        <div class="danger-zone card">
          <div>
            <h3>${T("Сброс прогресса")}</h3>
            <p>${T("Удалит весь локальный прогресс без возможности восстановления.")}</p>
          </div>
          <button class="btn btn-danger" onclick="App.resetConfirm()">${T("Сбросить всё")}</button>
        </div>
      </section>`;
    highlightNav();
  }

  function exportProgress() {
    const blob = new Blob([Progress.exportData()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cyberpath-progress-${Progress.completedAtISO()}.json`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
    toast("Прогресс сохранён в файл");
  }
  function importProgress(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = Progress.importData(String(reader.result));
      if (res.ok) { toast("Прогресс загружен ✓"); renderNav(); render(); }
      else { toast(res.error || "Не удалось загрузить файл"); }
    };
    reader.onerror = () => toast("Ошибка чтения файла");
    reader.readAsText(file);
  }

  /* ---------- Действия ---------- */
  // Проверка по журналу терминала (для sandbox-заданий) — вызывается по кнопке
  function terminalSatisfies(task) {
    if (!window.Sandbox || !Sandbox.getTranscript) return false;
    const tr = Sandbox.getTranscript();
    if (!tr.length) return false;
    const answers = task.answers || (task.answer ? [task.answer] : []);
    if (task.type === "flag") {
      const outAll = tr.map((x) => x.out || "").join("\n");
      return answers.some((a) => task.caseSensitive ? outAll.includes(a) : outAll.toLowerCase().includes(String(a).toLowerCase()));
    }
    const cmds = tr.map((x) => (x.cmd || "").toLowerCase());
    return answers.some((a) => { const x = String(a).toLowerCase(); return cmds.some((c) => c.split(/\s+/).includes(x) || c.includes(x)); });
  }

  function submit(courseId, taskId) {
    const course = COURSES.find((c) => c.id === courseId);
    const task = course.rooms.flatMap((r) => r.tasks).find((t) => t.id === taskId);
    const input = document.getElementById(`ans-${taskId}`).value;
    const fb = document.getElementById(`fb-${taskId}`);
    const raw = input.trim();
    if (!raw && !task.sandbox) { fb.innerHTML = `<span class="fb-warn">${T("Введите ответ")}</span>`; return; }

    let ok = raw && checkAnswer(task, input);
    if (!ok && task.sandbox) ok = terminalSatisfies(task); // проверяем то, что сделано в терминале
    if (!Progress.isDone(taskId)) Progress.recordAttempt(taskId, !!ok);
    if (ok) {
      const res = Progress.completeTask(task, courseId);
      celebrate(res);
      const roomId = course.rooms.find((r) => r.tasks.includes(task)).id;
      afterSolve(course, task, roomId);
    } else {
      const msg = (!raw && task.sandbox)
        ? T("Выполните команду в терминале и нажмите «Проверить».")
        : T("Неверно, попробуйте ещё раз.");
      const tip = mentorTip(task, raw);
      fb.innerHTML = `<span class="fb-err">✗ ${msg}</span>${tip ? `<div class="mentor-tip"><span class="mt-ic">🧑‍🏫</span><span>${tip}</span></div>` : ""}`;
      const el = document.getElementById(`task-${taskId}`);
      el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake");
    }
  }

  /* ---------- Ментор: объясняет, в чём именно ошибка ---------- */
  const lastWrong = {};
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > 3) return 99;
    const d = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }
  function mentorTip(task, raw) {
    const answers = (task.answers || (task.answer ? [task.answer] : [])).map(String);
    const low = raw.toLowerCase(), squash = (x) => x.toLowerCase().replace(/[\s\-_.:'"]/g, "");
    if (!raw) {
      if (task.sandbox && window.Sandbox && Sandbox.getTranscript) {
        const tr = Sandbox.getTranscript();
        if (!tr.length) return T("Терминал пока пуст — введите команду слева, затем нажмите «Проверить».");
        if (tr.some((x) => /не найден|не удается|not found|cannot find|is not recognized|не является/i.test(x.out || ""))) return T("В выводе есть ошибка «не найдено» — проверьте текущий каталог (dir) и путь (cd).");
        if (task.type === "flag" && tr.some((x) => /CYBER\{/.test(x.out || ""))) return T("В выводе уже есть флаг — скопируйте его в поле ответа целиком, вместе с CYBER{...}.");
      }
      return "";
    }
    if (lastWrong[task.id] === low) return T("Этот ответ вы уже пробовали. Попробуйте другой вариант или откройте подсказку.");
    lastWrong[task.id] = low;
    const a0 = answers[0] || "";
    if (task.type === "flag" || /^CYBER\{/.test(a0)) {
      if (!/^CYBER\{.*\}$/i.test(raw)) return T("Флаг имеет формат CYBER{...} — вводите его целиком, с фигурными скобками.");
      if (answers.some((a) => a.toLowerCase() === low)) return T("Почти: не совпадает регистр букв. Флаги чувствительны к регистру.");
    }
    if (answers.some((a) => squash(a) === squash(raw))) return T("Суть верная, но формат другой: проверьте пробелы, дефисы и знаки.");
    if (answers.some((a) => a.length > 3 && levenshtein(a.toLowerCase(), low) <= 2)) return T("Очень близко! Похоже на опечатку — проверьте написание.");
    if (answers.some((a) => a.length > 2 && low.includes(a.toLowerCase()))) return T("Правильный ответ спрятан в вашем — уберите лишнее, нужен только сам ответ.");
    if (answers.some((a) => a.length > 3 && a.toLowerCase().includes(low) && low.length >= 2)) return T("Вы на верном пути, но ответ неполный.");
    const cyr = (x) => /[а-яё]/i.test(x), lat = (x) => /[a-z]/i.test(x);
    if (answers.every((a) => cyr(a)) && lat(raw) && !cyr(raw)) return T("Ответ ожидается на русском языке.");
    if (answers.every((a) => lat(a) && !cyr(a)) && cyr(raw)) return T("Ответ ожидается латиницей (на английском).");
    if (answers.every((a) => /^\d+$/.test(a)) && !/^\d+$/.test(raw)) return T("Здесь нужен ответ числом.");
    const att = (Progress._state().attempts || {})[task.id];
    if (att && att.w >= 3 && !Progress.hintsUsedFor(task.id) && (task.hints || []).length) return T("Уже несколько попыток — откройте подсказку ниже, она подтолкнёт в нужную сторону.");
    return "";
  }

  function markInfo(courseId, taskId) {
    solveTask(courseId, taskId);
  }
  function saveDraft(taskId, val) { Progress.setDraft(taskId, val); }

  // Общий путь «задание решено»
  function findTask(courseId, taskId) {
    const course = COURSES.find((c) => c.id === courseId);
    const task = course.rooms.flatMap((r) => r.tasks).find((t) => t.id === taskId);
    const roomId = course.rooms.find((r) => r.tasks.includes(task)).id;
    return { course, task, roomId };
  }
  function solveTask(courseId, taskId) {
    const { course, task, roomId } = findTask(courseId, taskId);
    const res = Progress.completeTask(task, courseId);
    celebrate(res);
    afterSolve(course, task, roomId);
  }
  // Обновление после решения: на месте (сохраняя терминал), полный ререндер — при завершении комнаты
  function afterSolve(course, task, roomId) {
    const room = course.rooms.find((r) => r.id === roomId);
    if (room && Progress.roomCompleted(room)) { renderRoom(course.id, roomId); return; }
    const el = document.getElementById("task-" + task.id);
    if (el) el.outerHTML = taskBlock(course, task);
    else renderRoom(course.id, roomId);
  }
  function wrongFx(taskId, msg) {
    const fb = document.getElementById(`fb-${taskId}`);
    if (fb) fb.innerHTML = `<span class="fb-err">✗ ${msg || "Неверно, попробуйте ещё раз."}</span>`;
    const el = document.getElementById(`task-${taskId}`);
    if (el) { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); }
  }

  function submitChoice(courseId, taskId, btn) {
    const { task } = findTask(courseId, taskId);
    const ok = checkAnswer(task, btn.textContent);
    if (!Progress.isDone(taskId)) Progress.recordAttempt(taskId, ok);
    if (ok) solveTask(courseId, taskId);
    else { btn.classList.add("wrong"); setTimeout(() => btn.classList.remove("wrong"), 600); wrongFx(taskId); }
  }

  function submitMatch(courseId, taskId) {
    const { task } = findTask(courseId, taskId);
    const sels = document.querySelectorAll(`#match-${taskId} .match-sel`);
    const correct = {};
    task.pairs.forEach((p) => (correct[p[0]] = p[1]));
    let allFilled = true, allRight = true;
    sels.forEach((s) => {
      if (!s.value) allFilled = false;
      const ok = s.value === correct[s.dataset.left];
      s.classList.toggle("bad", !!s.value && !ok);
      if (!ok) allRight = false;
    });
    if (!allFilled) { wrongFx(taskId, "Заполните все пары."); return; }
    if (!Progress.isDone(taskId)) Progress.recordAttempt(taskId, allRight);
    if (allRight) solveTask(courseId, taskId);
    else wrongFx(taskId, "Есть ошибки в сопоставлении.");
  }

  function orderPick(courseId, taskId, btn) {
    const picked = document.getElementById(`order-picked-${taskId}`);
    const tok = document.createElement("span");
    tok.className = "order-num";
    tok.textContent = (picked.children.length + 1) + ". " + btn.textContent;
    picked.appendChild(tok);
    btn.disabled = true; btn.classList.add("used");
    const { task } = findTask(courseId, taskId);
    if (picked.children.length === task.items.length) {
      const seq = Array.from(picked.children).map((c) => c.textContent.replace(/^\d+\.\s/, ""));
      const ok = seq.every((v, i) => v === task.items[i]);
      if (ok) solveTask(courseId, taskId);
      else { wrongFx(taskId, "Порядок неверный, сброшено."); setTimeout(() => orderReset(taskId), 700); }
    }
  }
  function orderReset(taskId) {
    const picked = document.getElementById(`order-picked-${taskId}`);
    if (picked) picked.innerHTML = "";
    document.querySelectorAll(`#order-pool-${taskId} .order-tok`).forEach((b) => { b.disabled = false; b.classList.remove("used"); });
    const fb = document.getElementById(`fb-${taskId}`); if (fb) fb.innerHTML = "";
  }

  function showHint(taskId, i) {
    Progress.useHint(taskId);
    // перерисуем текущую комнату
    render();
  }

  /* ---------- Звуки наград (WebAudio, без файлов) ---------- */
  const SFX_KEY = "cyberpath_sound";
  function soundOn() { try { return localStorage.getItem(SFX_KEY) !== "0"; } catch (e) { return true; } }
  function setSound(on) { try { localStorage.setItem(SFX_KEY, on ? "1" : "0"); } catch (e) {} }
  const Sfx = (() => {
    let ctx = null;
    const ac = () => (ctx = ctx || (window.AudioContext ? new AudioContext() : null));
    function notes(seq, type = "sine") {
      if (!soundOn()) return;
      const a = ac(); if (!a) return;
      if (a.state === "suspended") a.resume();
      const t0 = a.currentTime;
      seq.forEach(([f, start, dur, vol]) => {
        const o = a.createOscillator(), g = a.createGain();
        o.type = type; o.frequency.value = f;
        o.connect(g); g.connect(a.destination);
        const t = t0 + start;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime((vol || 0.18), t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
        o.start(t); o.stop(t + dur + 0.02);
      });
    }
    return {
      solve: () => notes([[660, 0, 0.12], [880, 0.08, 0.16]], "triangle"),
      flag: () => notes([[784, 0, 0.1], [1047, 0.07, 0.1], [1319, 0.14, 0.22]], "triangle"),
      achievement: () => notes([[523, 0, 0.18, 0.14], [659, 0, 0.18, 0.12], [784, 0, 0.3, 0.14]], "sine"),
      level: () => notes([[523, 0, 0.12], [659, 0.09, 0.12], [784, 0.18, 0.12], [1047, 0.27, 0.3]], "triangle"),
      win: () => notes([[523, 0, 0.14], [659, 0.12, 0.14], [784, 0.24, 0.14], [1047, 0.36, 0.18], [1319, 0.5, 0.4, 0.2]], "sine"),
    };
  })();
  function toggleSound() { setSound(!soundOn()); toast(soundOn() ? T("Звук наград включён") : T("Звук наград выключен")); if (soundOn()) Sfx.solve(); if (current.view === "profile") renderProfile(); }

  function celebrate(res) {
    if (!res || res.already) return;
    if (res.xpGained) { flyXP(res.xpGained, res.mult); animateXP(Progress.overallStats().xp); }
    if (res.streakDay) {
      const si = res.streakDay;
      toast(si.nextPct > 100
        ? `🔥 ${T("День засчитан в серию")}: ${si.days} ${T("дн.")} · ${T("множитель")} ×${(si.nextPct / 100).toFixed(2)} ${T("до конца дня")}`
        : `🔥 ${T("День засчитан в серию")}: ${si.days} ${T("дн.")}`);
    }
    else renderNav();
    // звук — по значимости события (самое крупное имеет приоритет)
    if (res.courseDone || res.levelUp) Sfx.win ? (res.courseDone ? Sfx.win() : Sfx.level()) : 0;
    else if ((res.newAchievements || []).length) Sfx.achievement();
    else if (res.xpGained) Sfx.solve();
    if (res.levelUp) { toast(`🎉 Новый уровень: ${res.levelUp}!`); confetti(); }
    if (res.newRank) toast(`${res.newRank.icon} Новое звание: ${res.newRank.name}`);
    if (res.courseDone) confetti();
    (res.newAchievements || []).forEach((id) => toastAchievement(id));
  }

  /* ---------- Конфетти (без библиотек) ---------- */
  function confetti() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = document.createElement("canvas");
    cv.className = "confetti-canvas";
    document.body.appendChild(cv);
    const ctx = cv.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr;
    cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px";
    const colors = ["#f2620a", "#ff8c47", "#ffb182", "#1f9d61", "#74b9ff", "#ffd23f"];
    const N = 140;
    const parts = Array.from({ length: N }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 120 * dpr,
      y: H * 0.28,
      vx: (Math.random() - 0.5) * 15 * dpr,
      vy: (Math.random() * -12 - 4) * dpr,
      s: (Math.random() * 6 + 4) * dpr,
      c: colors[(Math.random() * colors.length) | 0],
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
    }));
    let t = 0;
    (function frame() {
      t++; ctx.clearRect(0, 0, W, H);
      parts.forEach((p) => {
        p.vy += 0.35 * dpr; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore();
      });
      if (t < 140) requestAnimationFrame(frame); else cv.remove();
    })();
  }

  /* ---------- Тосты ---------- */
  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.getElementById("toasts").appendChild(t);
    setTimeout(() => t.classList.add("show"), 10);
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2600);
  }
  function toastAchievement(id) {
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a) return;
    const t = document.createElement("div");
    t.className = "toast toast-ach";
    const rar = ACH_RARITY[a.id] || "common";
    t.classList.add("r-" + rar);
    t.innerHTML = `<span class="ta-ic">${a.icon}</span><div><b>${T("Достижение!")}</b><br>${a.title}</div>`;
    if (rar === "epic" || rar === "legendary") confetti(rar === "legendary" ? 90 : 50);
    document.getElementById("toasts").appendChild(t);
    setTimeout(() => t.classList.add("show"), 10);
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 3600);
  }

  function resetConfirm() {
    if (confirm("Точно сбросить весь прогресс? Это необратимо.")) {
      Progress.reset();
      toast("Прогресс сброшен");
      go("home");
    }
  }

  /* ---------- Тема (светлая / тёмная) ---------- */
  const THEME_KEY = "cyberpath_theme";
  function currentTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const btn = document.getElementById("theme-toggle");
    if (btn) btn.innerHTML = theme === "dark" ? Icon.ui("sun") : Icon.ui("moon");
  }
  function toggleTheme() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    const root = document.documentElement;
    root.classList.add("theme-anim");
    applyTheme(next);
    renderNav();
    if (next === "dark") Progress.unlockAchievement("dark_side");
    clearTimeout(toggleTheme._t);
    toggleTheme._t = setTimeout(() => root.classList.remove("theme-anim"), 360);
  }

  function toggleLang() {
    if (window.I18N) { I18N.toggle(); render(); Progress.unlockAchievement("polyglot"); }
  }

  /* ---------- Инициализация ---------- */
  function init() {
    applyTheme(currentTheme());
    if (window.I18N) I18N.apply(I18N.get());
    Progress.trackVisit();
    window.addEventListener("hashchange", () => {
      current = parseHash();
      render();
    });
    // реагируем на смену системной темы, если пользователь не выбрал вручную
    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
        let saved = null;
        try { saved = localStorage.getItem(THEME_KEY); } catch (err) {}
        if (!saved) applyTheme(e.matches ? "dark" : "light");
      });
    }
    // глобальные горячие клавиши
    document.addEventListener("keydown", (e) => {
      const tag = (e.target && e.target.tagName) || "";
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault(); palette.open ? closePalette() : openPalette();
      } else if (e.key === "Escape") {
        closePalette(); closeShortcuts(); closeRanks(); closeUserMenu(); closeAccount();
      } else if (e.key === "?" && !typing) {
        e.preventDefault(); openShortcuts();
      }
    });
    // установка PWA
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault(); deferredInstall = e;
      const pill = document.getElementById("install-pill");
      if (pill) pill.hidden = false;
    });
    window.addEventListener("appinstalled", () => {
      const pill = document.getElementById("install-pill");
      if (pill) pill.hidden = true;
      toast("Приложение установлено 🎉");
    });
    initA11y();
    initUpdateCheck();
    // EN-контент курсов подгрузился лениво — перерисовать текущий экран
    window.addEventListener("i18n:content", () => render());
    // Облако: смена статуса входа и подтянутый из облака прогресс
    if (window.Cloud) {
      Cloud.onChange((cs) => {
        renderNav();
        if (cs.status === "needNick") openNickModal();
        if (document.getElementById("account-modal")) renderAccountModal();
        if (current.view === "leaderboard" && !lbLoading) renderLeaderboard(current.period);
        if (current.view === "profile") { const z = document.getElementById("acc-card"); if (z) z.outerHTML = accountCard(); }
      });
      window.addEventListener("cloud:merged", () => { render(); toast(T("Прогресс синхронизирован с облаком")); });
      Cloud.init();
    }
    current = parseHash();
    render();
    document.body.classList.add("ready");
    maybeOnboard();
  }

  /* ---------- Новая версия сайта: Service Worker обновился → предложить перезагрузку ---------- */
  function initUpdateCheck() {
    if (!("serviceWorker" in navigator)) return;
    const hadController = !!navigator.serviceWorker.controller;   // при первом визите баннер не нужен
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController) showUpdateBanner(); });
    navigator.serviceWorker.ready.then((reg) => {
      const check = () => reg.update().catch(() => {});
      setInterval(check, 30 * 60 * 1000);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
    }).catch(() => {});
  }
  function showUpdateBanner() {
    if (document.getElementById("update-bar")) return;
    const bar = document.createElement("div");
    bar.id = "update-bar"; bar.className = "update-bar"; bar.setAttribute("role", "status");
    bar.innerHTML = `<span>✨ ${T("Доступна новая версия CyberPath")}</span>
      <button class="btn btn-primary btn-sm" onclick="location.reload()">${T("Обновить")}</button>
      <button class="update-x" onclick="this.parentElement.remove()" aria-label="${T("Закрыть")}">✕</button>`;
    document.body.appendChild(bar);
  }

  /* ---------- Доступность: клавиатура для кликабельных div/span ---------- */
  const NATIVE = /^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY|LABEL)$/;
  function enhanceA11y(scope) {
    (scope || document).querySelectorAll("[onclick]").forEach((el) => {
      if (el.dataset.a11y) return;
      el.dataset.a11y = "1";
      if (el.tagName === "A" && !el.hasAttribute("href")) { el.setAttribute("href", "javascript:void(0)"); el.setAttribute("role", el.getAttribute("role") || "link"); return; }
      if (NATIVE.test(el.tagName)) return;
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
      if (!el.hasAttribute("role")) el.setAttribute("role", "button");
    });
  }
  function initA11y() {
    enhanceA11y();
    new MutationObserver(() => enhanceA11y()).observe(document.body, { childList: true, subtree: true });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const el = e.target;
      if (!el || !el.dataset || !el.dataset.a11y || NATIVE.test(el.tagName) || el.hasAttribute("onkeydown")) return;
      e.preventDefault(); el.click();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && document.getElementById("onboard")) endOnboard(); });
  }

  /* ---------- Онбординг при первом запуске ---------- */
  const ONBOARD_KEY = "cyberpath_onboarded";
  function onboardSteps() {
    return [
      { ic: "book", t: T("Добро пожаловать в CyberPath!"), d: T("Бесплатная платформа, где вы осваиваете кибербезопасность на практике: теория, задания, интерактивные лаборатории и флаги. Весь прогресс хранится локально в этом браузере.") },
      { ic: "shield", t: T("Курсы и путь"), d: T("14 курсов от основ до продвинутого — по уровням сложности. «Путь» показывает карту с зависимостями: продвинутые курсы открываются по мере прохождения базовых.") },
      { ic: "terminal", t: T("Песочница и инструменты"), d: T("Учебный терминал Windows для квестов и 8 Blue Team-симуляторов (разбор писем, трафика, логов). Безопасно и на вымышленных данных.") },
      { ic: "flag", t: T("Флаги и достижения"), d: T("Находите скрытые флаги CYBER{…} в заданиях — все они собраны на странице CTF. Зарабатывайте XP, уровни, звания и достижения.") },
      { ic: "progress", t: T("Профиль и сертификаты"), d: T("В профиле — ваша статистика, аналитика и сертификаты. Пройдите курс на 100% и скачайте именной сертификат, а все 14 — диплом мастера.") },
    ];
  }
  let obStep = 0;
  function maybeOnboard() {
    let seen = null; try { seen = localStorage.getItem(ONBOARD_KEY); } catch (e) {}
    if (seen) return;
    obStep = 0; renderOnboard();
  }
  function startOnboard() { obStep = 0; renderOnboard(); }
  function renderOnboard() {
    const steps = onboardSteps(), s = steps[obStep], last = obStep === steps.length - 1;
    let ov = document.getElementById("onboard");
    if (!ov) { ov = document.createElement("div"); ov.id = "onboard"; ov.className = "modal-overlay onboard-overlay"; document.body.appendChild(ov); requestAnimationFrame(() => ov.classList.add("show")); }
    ov.innerHTML = `
      <div class="onboard" role="dialog" aria-modal="true" aria-label="${T("Добро пожаловать")}">
        <div class="ob-ic">${Icon.ui(s.ic)}</div>
        <h2>${escapeHtml(s.t)}</h2>
        <p>${escapeHtml(s.d)}</p>
        <div class="ob-dots">${steps.map((_, i) => `<span class="${i === obStep ? "on" : ""}"></span>`).join("")}</div>
        <div class="ob-actions">
          <button class="btn btn-ghost btn-sm" onclick="App.endOnboard()">${T("Пропустить")}</button>
          ${last ? `<button class="btn btn-ghost btn-sm" onclick="App.placeSkip(true)">${T("Начать с основ")}</button>
          <button class="btn btn-primary btn-sm" onclick="App.startPlacement()">${T("Определить мой уровень")}</button>`
          : `<button class="btn btn-primary btn-sm" onclick="App.nextOnboard()">${T("Далее")}</button>`}
        </div>
      </div>`;
  }
  function nextOnboard() { const steps = onboardSteps(); if (obStep < steps.length - 1) { obStep++; renderOnboard(); } else endOnboard(); }
  function endOnboard() {
    try { localStorage.setItem(ONBOARD_KEY, "1"); } catch (e) {}
    const ov = document.getElementById("onboard"); if (ov) ov.remove();
  }

  let deferredInstall = null;
  function installApp() {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    deferredInstall.userChoice.finally(() => {
      deferredInstall = null;
      const pill = document.getElementById("install-pill");
      if (pill) pill.hidden = true;
    });
  }

  /* ---------- Справка по горячим клавишам ---------- */
  function openShortcuts() {
    let ov = document.getElementById("shortcuts");
    if (!ov) {
      ov = document.createElement("div");
      ov.id = "shortcuts"; ov.className = "modal-overlay";
      const rows = [
        ["Ctrl / ⌘ + K", "Быстрый переход (палитра)"],
        ["?", "Эта справка"],
        ["Esc", "Закрыть окно"],
        ["↑ / ↓, Enter", "Навигация в палитре"],
        ["Tab", "Автодополнение в песочнице"],
        ["↑ / ↓", "История команд в песочнице"],
      ];
      ov.innerHTML = `
        <div class="modal" role="dialog" aria-label="Горячие клавиши">
          <div class="modal-head"><h3>Горячие клавиши</h3><button class="modal-x" onclick="App.closeShortcuts()" aria-label="Закрыть">✕</button></div>
          <div class="sc-list">
            ${rows.map(([k, d]) => `<div class="sc-row"><kbd>${k}</kbd><span>${d}</span></div>`).join("")}
          </div>
        </div>`;
      document.body.appendChild(ov);
      ov.addEventListener("click", (e) => { if (e.target === ov) closeShortcuts(); });
    }
    ov.classList.add("show");
  }
  function closeShortcuts() { const ov = document.getElementById("shortcuts"); if (ov) ov.classList.remove("show"); }

  /* ---------- Лестница званий ---------- */
  function openRanks() {
    const lvl = Progress.level();
    const curName = rankForLevel(lvl).name;
    const next = nextRank(lvl);
    let ov = document.getElementById("ranks-modal");
    if (ov) ov.remove(); // пересобираем с актуальным состоянием
    ov = document.createElement("div");
    ov.id = "ranks-modal"; ov.className = "modal-overlay";
    let lastTier = "";
    const rows = RANKS.map((r) => {
      const reached = lvl >= r.min;
      const isCur = r.name === curName;
      const head = r.tier !== lastTier ? `<div class="tier-head tier-${r.tier}"><span></span>${T(TIER_NAMES[r.tier])}<span></span></div>` : "";
      lastTier = r.tier;
      return `${head}<div class="rank-row ${reached ? "reached" : "locked"} ${isCur ? "current" : ""} tier-${r.tier}">
        ${rankBadge(r, 40, !reached)}
        <span class="rank-name">${r.name}</span>
        <span class="rank-req">${isCur ? `<em>${T("сейчас")}</em>` : ""}LVL ${r.min}</span>
      </div>`;
    }).join("");
    ov.innerHTML = `
      <div class="modal ranks-panel" role="dialog" aria-label="${T("Лестница званий")}">
        <div class="modal-head">
          <h3>${T("Лестница званий")}</h3>
          <button class="modal-x" onclick="App.closeRanks()" aria-label="Close">✕</button>
        </div>
        <div class="ranks-sub">${T("Ваш уровень")}: <b>LVL ${lvl}</b> · ${rankForLevel(lvl).icon} ${curName}${next ? ` — ${T("до")} ${next.icon} ${next.name}: ${T("уровень")} ${next.min}` : ` — ${T("максимум!")}`}</div>
        <div class="ranks-list">${rows}</div>
        <p class="ranks-note">${T("Звания — игровые: они отражают прогресс на платформе, а не профессиональную квалификацию. Настоящий опыт приходит с практикой, проектами и работой.")}</p>
      </div>`;
    document.body.appendChild(ov);
    ov.addEventListener("click", (e) => { if (e.target === ov) closeRanks(); });
    requestAnimationFrame(() => ov.classList.add("show"));
    const cur = ov.querySelector(".rank-row.current");
    if (cur) cur.scrollIntoView({ block: "center" });
  }
  function closeRanks() { const ov = document.getElementById("ranks-modal"); if (ov) ov.classList.remove("show"); }

  return {
    init, go, submit, markInfo, showHint, toast, toastAchievement, resetConfirm, toggleTheme,
    toggleUserMenu, closeUserMenu, startOnboard, nextOnboard, endOnboard, toggleSound,
    catalogSearch, catalogLevel, catalogSort, downloadCertificate, downloadMasterCertificate,
    submitChoice, submitMatch, orderPick, orderReset, submitDaily,
    submitMission, toggleShell, openShortcuts, closeShortcuts,
    glossarySearch, glossaryClear, placeAnswer, placeFinish, placeSkip, reportTask, openAccount, closeAccount, accSetTab, accOAuth, accLink, accSubmit, accSignOut, accDelete, nickSubmit, nickCancel, placeRetry, startPlacement, catalogReset, submitExam, retryExam, openPalette, palettePick, installApp,
    reviewChoose, reviewCheck, reviewNext, reviewStart, setXpMode, shareCard, saveDraft, toggleLang,
    openRanks, closeRanks, achSetFilter, tilt, openProfileEditor, closeProfileEditor, profTab, profAvatar, profUpload,
    profDraftSet, profToggleShowcase, saveProfile, chalStart, chalAnswer, chalSkip, chalRestart, notesFilter, noteComment, noteDelete, exportNotes,
  };
})();

try { window.App = App; window.Progress = Progress; } catch (e) {}
document.addEventListener("DOMContentLoaded", App.init);
