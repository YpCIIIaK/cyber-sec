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
  const EXAM_PASS = 0.8;   // порог сдачи
  const EXAM_BONUS = 30;   // бонус XP за первую сдачу

  const HINT_PENALTY = 5; // XP штраф за каждую использованную подсказку

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(defaultState);
      return Object.assign(structuredClone(defaultState), JSON.parse(raw));
    } catch (e) {
      return structuredClone(defaultState);
    }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn("Не удалось сохранить прогресс", e); }
  }

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

  function completeTask(task, courseId) {
    if (state.completed[task.id]) return { already: true };
    const gained = effectivePoints(task);
    state.completed[task.id] = true;
    state.earned[task.id] = gained;
    if (state.drafts) delete state.drafts[task.id];

    const events = { xpGained: gained, newAchievements: [] };
    if (Object.keys(state.completed).length === 1) tryAch("first_blood", events);
    awardXP(gained, events);
    srsEnsure(task);
    checkCourseCompletion(courseId, events);

    save();
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
  function courseUnlocked(course) {
    if (!course.prereq || !course.prereq.length) return true;
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
    if (state.lastVisit === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (state.lastVisit === yesterday) state.streak = (state.streak || 0) + 1;
    else state.streak = 1;
    state.lastVisit = today;
    if (!state.activeDays) state.activeDays = {};
    if (state.activeDays[today] === undefined) state.activeDays[today] = 0; // отметка визита
    if (state.streak >= 3) tryAch("streak_3");
    if (state.streak >= 7) tryAch("streak_7");
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
    return Object.values(agg).sort((a, b) => b.wrong - a.wrong);
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
  function activityMap(days) {
    days = days || 84;
    const out = [];
    const now = new Date(todayStr() + "T00:00:00");
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      out.push({ date: key, xp: (state.activeDays || {})[key] || 0, dow: (d.getDay() + 6) % 7 });
    }
    return out;
  }
  function skillRadar() {
    return COURSES.map((c) => ({ id: c.id, title: c.title, color: c.color, pct: courseProgress(c).pct }));
  }

  return {
    isDone, completeTask, useHint, hintsUsedFor, roomCompleted, roomUsedNoHints,
    courseProgress, courseUnlocked, missingPrereqs, overallStats, level, xpInLevel, xpToNext,
    unlockAchievement, hasAchievement, trackVisit, reset,
    exportData, importData, courseXP, completedAtISO,
    effectivePoints, hintPenalty: () => HINT_PENALTY,
    dailyToday, dailyIsDone, dailyCount, solveDaily,
    missionDone, completeMission,
    examPassed, examBest, recordExam,
    recordAttempt, accuracyOverall, taskInfo,
    getDraft, setDraft, clearDraft,
    srsEnsure, srsDueList, srsDueCount, srsTotal, srsReview, srsEligible,
    weakTasks, weakCourses, xpByWeek, activityMap, skillRadar,
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
    if (parts[0] === "course" && parts[1]) {
      if (parts[2] === "room" && parts[3])
        return { view: "room", courseId: parts[1], roomId: parts[3] };
      if (parts[2] === "exam")
        return { view: "exam", courseId: parts[1] };
      return { view: "course", courseId: parts[1] };
    }
    return { view: "home" };
  }

  /* ---------- Рендер шапки/навигации ---------- */
  let displayedXP = null;
  function renderNav() {
    const s = Progress.overallStats();
    const nav = document.getElementById("nav-stats");
    if (nav) {
      nav.innerHTML = `
        <button class="rank-chip" title="${T("Открыть лестницу званий")}" onclick="App.openRanks()">${s.rank.icon} ${s.rank.name}</button>
        <div class="nav-xp" title="Ваш уровень и опыт">
          <span class="lvl-badge">LVL ${s.level}</span>
          <div class="xp-bar-mini"><span style="width:${(s.xpInLevel)}%"></span></div>
          <span class="xp-text">${s.xp} XP</span>
        </div>
        ${s.streak > 0 ? `<span class="streak" title="Серия дней подряд">${Icon.ui("flame")}${s.streak}</span>` : ""}
      `;
      displayedXP = s.xp;
    }
  }

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
  function flyXP(amount) {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const el = document.createElement("div");
    el.className = "xp-fly";
    el.textContent = "+" + amount + " XP";
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
      case "exam": renderExam(c.courseId); break;
      default: renderHome();
    }
    highlightNav();
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
      ${dailyCard()}
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

  function continueBlock() {
    const n = nextUp();
    if (!n) return "";
    const started = Progress.overallStats().tasksDone > 0;
    return `
      <section class="section continue-section">
        <div class="continue-card" style="--c:${n.course.color}" onclick="App.go('room',{courseId:'${n.course.id}',roomId:'${n.room.id}'})">
          <span class="cont-ic">${Icon.course(n.course.id)}</span>
          <div class="cont-body">
            <span class="cont-label">${started ? "Продолжить обучение" : "Начните здесь"}</span>
            <h3>${n.course.title}</h3>
            <p>${n.room.title} · курс пройден на ${n.pct}%</p>
          </div>
          <button class="btn btn-primary">${started ? "Продолжить" : "Начать"} ${Icon.ui("arrow")}</button>
        </div>
      </section>`;
  }

  function reviewCardHome() {
    const due = Progress.srsDueCount();
    if (!due) return "";
    return `
      <section class="section daily-section">
        <div class="daily-card" style="border-left-color:var(--o-500);cursor:pointer" onclick="App.go('review')">
          <div class="daily-badge">${Icon.ui("book")} Повторение<span class="daily-bonus" style="background:var(--o-500)">${due}</span></div>
          <p class="daily-q">К повторению готово ${due} ${plural(due, "карточка", "карточки", "карточек")}. Закрепите слабые темы — интервальное повторение работает.</p>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();App.go('review')">Начать повторение ${Icon.ui("arrow")}</button>
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
          <div class="daily-badge">${Icon.ui("flame")} Задание дня<span class="daily-bonus">+${DAILY_BONUS} XP</span></div>
          ${done
            ? `<p class="daily-done">${Icon.ui("check")} Решено сегодня! Возвращайтесь завтра за новым заданием. Решено всего: ${Progress.dailyCount()}.</p>`
            : `
              <p class="daily-q">${q.q}</p>
              <div class="answer-row daily-row">
                <input type="text" id="daily-input" placeholder="Ваш ответ"
                       onkeydown="if(event.key==='Enter')App.submitDaily()">
                <button class="btn btn-primary btn-sm" onclick="App.submitDaily()">Ответить</button>
              </div>
              <div class="feedback" id="fb-daily"></div>`}
        </div>
      </section>`;
  }
  function submitDaily() {
    const input = document.getElementById("daily-input");
    const fb = document.getElementById("fb-daily");
    if (!input || !input.value.trim()) { if (fb) fb.innerHTML = `<span class="fb-warn">Введите ответ</span>`; return; }
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
      <article class="course-card reveal ${unlocked ? "" : "locked"} ${p.pct === 100 ? "completed" : ""}" style="--c:${course.color}" onclick="${onclick}" tabindex="0" role="button" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}">
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
      </article>`;
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
      : `<div class="empty-state">Ничего не найдено. Попробуйте изменить запрос или фильтр.</div>`;
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
          <select class="sort-select" onchange="App.catalogSort(this.value)">
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
  function catalogLevel(lv) {
    catalog.level = lv;
    document.querySelectorAll(".filter-chips .chip").forEach((el) =>
      el.classList.toggle("active", el.getAttribute("data-lv") === lv));
    renderCourseGrid();
  }
  function catalogSort(v) { catalog.sort = v; renderCourseGrid(); }

  function renderCourse(courseId) {
    const course = COURSES.find((c) => c.id === courseId);
    if (!course) return go("courses");
    const p = Progress.courseProgress(course);

    if (!Progress.courseUnlocked(course)) {
      const missing = Progress.missingPrereqs(course);
      root().innerHTML = `
        <section class="section">
          <a class="back" onclick="App.go('courses')">← Все курсы</a>
          <div class="locked-screen card">
            <div class="ls-icon">${Icon.ui("lock")}</div>
            <h1><span class="ls-course-ic" style="color:${course.color}">${Icon.course(course.id)}</span> ${course.title}</h1>
            <p class="ls-sub">Этот курс уровня «${course.level}» откроется, когда вы завершите предыдущие. Так сложность растёт постепенно.</p>
            <h3>Нужно пройти на 100%:</h3>
            <div class="ls-prereq">
              ${missing.map((m) => {
                const mp = Progress.courseProgress(m);
                return `<div class="ls-row" onclick="App.go('course',{courseId:'${m.id}'})">
                  <span class="cpl-ic" style="color:${m.color}">${Icon.course(m.id)}</span>
                  <div class="cpl-body">
                    <div class="cpl-head"><b>${m.title}</b><span>${mp.pct}%</span></div>
                    <div class="xp-bar"><span style="width:${mp.pct}%;background:${m.color}"></span></div>
                  </div>
                  <span class="ls-go">Открыть →</span>
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
        <a class="back" onclick="App.go('courses')">← Все курсы</a>
        <div class="course-head" style="--c:${course.color}">
          <span class="ch-icon">${Icon.course(course.id)}</span>
          <div>
            <span class="cc-level">${TL(course.level)}</span>
            <h1>${course.title}</h1>
            <p>${course.summary}</p>
            <div class="cc-progress wide">
              <div class="xp-bar"><span style="width:${p.pct}%"></span></div>
              <span class="cc-pct">${p.done}/${p.total} заданий · ${p.pct}%</span>
            </div>
          </div>
        </div>
        ${p.pct === 100 ? certificateCard(course) + nextCourseCard(course) : ""}
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
        <div class="cert-ribbon">${Icon.ui("check")} Курс пройден</div>
        <div class="cert-ic">${Icon.course(course.id)}</div>
        <div class="cert-body">
          <h3>Поздравляем!</h3>
          <p>Вы завершили курс «${course.title}» и заработали ${Progress.courseXP(course)} XP.${Progress.examPassed(course.id) ? " Экзамен сдан на " + Progress.examBest(course.id) + "%." : ""}</p>
        </div>
        <div class="cert-actions">
          <button class="btn btn-ghost btn-sm" onclick="App.go('exam',{courseId:'${course.id}'})">${Icon.ui("quest")} ${Progress.examPassed(course.id) ? "Пересдать экзамен" : "Сдать экзамен"}</button>
          <button class="btn btn-primary btn-sm" onclick="App.downloadCertificate('${course.id}')">${Icon.ui("progress")} Сертификат</button>
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
          <span class="rr-meta">${done}/${total} заданий</span>
        </div>
        <div class="rr-bar"><span style="width:${total ? (done / total) * 100 : 0}%"></span></div>
      </div>`;
  }

  function renderRoom(courseId, roomId) {
    const course = COURSES.find((c) => c.id === courseId);
    const room = course && course.rooms.find((r) => r.id === roomId);
    if (!room) return go("course", { courseId });
    const idx = course.rooms.indexOf(room);
    const nextRoom = course.rooms[idx + 1];
    const hasSandbox = room.tasks.some((t) => t.sandbox);

    root().innerHTML = `
      <section class="section room-view">
        <a class="back" onclick="App.go('course',{courseId:'${course.id}'})">← ${course.title}</a>
        <div class="room-header">
          <span class="rh-tag">${T("Комната")} ${idx + 1}/${course.rooms.length}</span>
          <h1>${room.title}</h1>
          <div class="room-meta">
            <span class="room-chip timer-chip">${Icon.ui("progress")} <span id="room-timer">00:00</span></span>
            <span class="room-chip nohint-chip ${Progress.roomUsedNoHints(room) ? "on" : "off"}">
              ${Icon.ui("bolt")} ${Progress.roomUsedNoHints(room) ? T("Без подсказок") : T("Подсказки использованы")}
            </span>
          </div>
        </div>
        <div class="room-columns">
          <div class="lesson-col">
            <div class="lesson card">${window.I18N && I18N.current() === "en" ? `<div class="lang-note">🌐 Lesson text is currently in Russian — English translation in progress.</div>` : ""}${room.intro}</div>
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
    startRoomTimer(Progress.roomCompleted(room));
    if (hasSandbox) {
      const out = document.getElementById("term-out"), inp = document.getElementById("term-input");
      if (out && inp) {
        Sandbox.init(out, inp);
        Sandbox.setHook((cmd, output) => autoCheckSandbox(course, room, cmd, output));
      }
    }

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
            <input type="text" id="term-input" autocomplete="off" spellcheck="false">
          </div>
        </div>
      </div>`;
  }

  // Кнопка «копировать» на блоках кода в уроке
  function addCopyButtons() {
    document.querySelectorAll(".lesson pre").forEach((pre) => {
      if (pre.querySelector(".copy-btn")) return;
      const btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.type = "button";
      btn.textContent = "копировать";
      btn.addEventListener("click", () => {
        const text = pre.innerText.replace(/копировать|скопировано$/g, "").trim();
        const done = () => { btn.textContent = "скопировано"; setTimeout(() => (btn.textContent = "копировать"), 1400); };
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
    if (frozen) { el.textContent = "готово"; return; }
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
  function downloadCertificate(courseId) {
    const course = COURSES.find((c) => c.id === courseId);
    if (!course) return;
    const W = 1200, H = 848, scale = 2;
    const cv = document.createElement("canvas");
    cv.width = W * scale; cv.height = H * scale;
    const g = cv.getContext("2d");
    g.scale(scale, scale);
    // фон
    g.fillStyle = "#fffdfb"; g.fillRect(0, 0, W, H);
    // рамка
    g.strokeStyle = course.color; g.lineWidth = 6; g.strokeRect(28, 28, W - 56, H - 56);
    g.strokeStyle = "#ece5dd"; g.lineWidth = 1.5; g.strokeRect(44, 44, W - 88, H - 88);
    const cx = W / 2;
    g.textAlign = "center";
    g.fillStyle = "#8c8178"; g.font = "600 22px Inter, sans-serif";
    g.fillText("CYBERPATH · СЕРТИФИКАТ О ПРОХОЖДЕНИИ", cx, 150);
    g.fillStyle = "#1a1613"; g.font = "800 40px Sora, Inter, sans-serif";
    g.fillText("Настоящим подтверждается, что", cx, 250);
    g.fillStyle = course.color; g.font = "800 60px Sora, Inter, sans-serif";
    wrapText(g, course.title, cx, 360, W - 220, 66);
    g.fillStyle = "#4b433c"; g.font = "400 24px Inter, sans-serif";
    g.fillText("успешно завершён.", cx, 470);
    const total = totalTasksInCourse(course);
    g.fillStyle = "#1a1613"; g.font = "700 26px Inter, sans-serif";
    g.fillText(`${Progress.courseXP(course)} XP  ·  ${total} заданий  ·  ${Progress.completedAtISO()}`, cx, 560);
    // печать-кружок
    g.beginPath(); g.arc(cx, 660, 46, 0, Math.PI * 2); g.strokeStyle = course.color; g.lineWidth = 3; g.stroke();
    g.fillStyle = course.color; g.font = "800 30px Sora, Inter, sans-serif"; g.fillText("✓", cx, 672);
    g.fillStyle = "#8c8178"; g.font = "500 18px Inter, sans-serif";
    g.fillText("cyberpath · учись этично, применяй ответственно", cx, 770);

    const a = document.createElement("a");
    a.href = cv.toDataURL("image/png");
    a.download = `CyberPath-${course.id}-certificate.png`;
    document.body.appendChild(a); a.click(); a.remove();
    toast("Сертификат скачан");
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
            <h4>${task.title}</h4>
            <span class="task-points">+${task.points} XP</span>
            ${task.sandbox ? `<span class="task-sandbox" title="Решается в песочнице">${Icon.ui("terminal")} песочница</span>` : ""}
          </div>
        </div>
        <p class="task-prompt">${task.prompt}</p>
        ${done
          ? `<div class="task-ok">${Icon.ui("check")} ${task.type === "info" ? T("Отмечено как прочитанное") : T("Верно! Решено") + " (+" + (Progress._state().earned[task.id] ?? task.points) + " XP)"}</div>`
          : answerArea(course, task) + hintsArea(course, task)}
      </div>`;
  }

  function answerArea(course, task) {
    const cid = course.id, tid = task.id;
    switch (task.type) {
      case "info":
        return `<button class="btn btn-primary btn-sm" onclick="App.markInfo('${cid}','${tid}')">${T("Понятно, дальше")}</button>`;
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
                <select class="match-sel" data-left="${escapeAttr(p[0])}">
                  <option value="">— выбрать —</option>
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
          <button class="hint-btn" onclick="App.orderReset('${tid}')">Сбросить</button>
          <div class="feedback" id="fb-${tid}"></div>`;
      }
      default: // question / flag
        return `
          <div class="answer-row">
            <input type="text" id="ans-${tid}" placeholder="${task.type === "flag" ? "CYBER{...}" : "Ваш ответ"}"
                   value="${escapeAttr(Progress.getDraft(tid))}"
                   oninput="App.saveDraft('${tid}',this.value)"
                   onkeydown="if(event.key==='Enter')App.submit('${cid}','${tid}')">
            <button class="btn btn-primary btn-sm" onclick="App.submit('${cid}','${tid}')">${T("Проверить")}</button>
          </div>
          <div class="feedback" id="fb-${tid}"></div>`;
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
  function escapeAttr(s) { return String(s).replace(/"/g, "&quot;"); }

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
          <h1>Песочница</h1>
          <p>Безопасный учебный терминал. Отрабатывайте команды и ищите флаги. Наберите <code>help</code>.</p>
        </div>
        <div class="term-wrap card">
          <div class="term-bar">
            <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
            <span class="term-title">CyberPath Sandbox</span>
            <button id="shell-toggle" class="shell-toggle" onclick="App.toggleShell()" title="Переключить cmd / PowerShell">cmd</button>
          </div>
          <div class="term-body" id="term-body">
            <div id="term-out"></div>
            <div class="term-input-row">
              <span class="term-path" id="term-cwd">C:\\Users\\hacker</span><span class="term-prompt">&gt;</span>
              <input type="text" id="term-input" autocomplete="off" spellcheck="false" autofocus>
            </div>
          </div>
        </div>
        <div class="sandbox-hints card">
          <h3>${T("Быстрый старт")}</h3>
          <div class="cheat">
            ${["help — все команды","dir / type — файлы","findstr CYBER файл","reg query …Run — реестр","certutil -decode <b64>","nmap 10.10.10.5","nslookup target.local","Tab — автодополнение"].map(c=>`<code>${c}</code>`).join("")}
          </div>
        </div>

        <h2 class="rooms-title">${T("Квесты-машины")}</h2>
        <p class="missions-intro">Многошаговые сценарии: выполняйте команды в терминале выше, находите флаг и вводите его здесь.</p>
        <div class="mission-list">
          ${MISSIONS.map(missionCard).join("")}
        </div>
      </section>`;
    highlightNav();
    Sandbox.init(document.getElementById("term-out"), document.getElementById("term-input"));
    Sandbox.setHook((cmd, output) => autoCheckMissions(output));
    setTimeout(() => { const i = document.getElementById("term-input"); if (i) i.focus(); }, 100);
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
               <button class="btn btn-primary btn-sm" onclick="App.submitMission('${m.id}')">Сдать флаг</button>
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
          <p>${GLOSSARY.length} определений ключевых понятий кибербезопасности — по реальным стандартам.</p>
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
    if (!items.length) { el.innerHTML = `<div class="empty-state">Ничего не найдено.</div>`; return; }
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

  /* ---------- Дорожная карта (граф зависимостей) ---------- */
  function renderRoadmap() {
    const tiers = { "Новичок": [], "Средний": [], "Сложный": [] };
    COURSES.forEach((c) => (tiers[c.level] || (tiers[c.level] = [])).push(c));
    const s = Progress.overallStats();
    root().innerHTML = `
      <section class="section">
        <div class="page-title">
          <h1>${T("Путь обучения")}</h1>
          <p>Курсы выстроены по сложности: продвинутые открываются по мере прохождения предыдущих. Ваше звание — ${s.rank.icon} <b>${s.rank.name}</b>.</p>
        </div>
        <div class="roadmap">
          ${["Новичок", "Средний", "Сложный"].map((tier) => `
            <div class="tier">
              <div class="tier-label"><span>${tier}</span></div>
              <div class="tier-courses">
                ${tiers[tier].map((c) => {
                  const p = Progress.courseProgress(c);
                  const unlocked = Progress.courseUnlocked(c);
                  const state = p.pct === 100 ? "done" : unlocked ? "open" : "locked";
                  return `<button class="rm-node ${state}" style="--c:${c.color}"
                            onclick="App.go('course',{courseId:'${c.id}'})"
                            title="${unlocked ? c.title : "Требуется: " + Progress.missingPrereqs(c).map((m) => m.title).join(", ")}">
                    <span class="rm-ic">${state === "locked" ? Icon.ui("lock") : Icon.course(c.id)}</span>
                    <span class="rm-name">${c.title}</span>
                    <span class="rm-pct">${state === "done" ? "✓ 100%" : unlocked ? p.pct + "%" : "заблокировано"}</span>
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

  /* ---------- Финальный экзамен курса ---------- */
  const examState = {};
  function buildExam(course) {
    // берём вопросы с проверяемым ответом (question/flag/choice), перемешиваем, до 5
    const pool = course.rooms.flatMap((r) => r.tasks)
      .filter((t) => (t.type === "question" || t.type === "choice") && (t.answers || t.answer));
    const shuffled = pool.slice().sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(5, shuffled.length));
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
        <a class="back" onclick="App.go('course',{courseId:'${course.id}'})">← ${course.title}</a>
        <div class="page-title">
          <h1>Экзамен: ${course.title}</h1>
          <p>Ответьте на ${ex.qs.length} вопросов. Порог сдачи — 80%. ${Progress.examPassed(courseId) ? "Лучший результат: " + Progress.examBest(courseId) + "%." : ""}</p>
        </div>
        <div class="exam-list">
          ${ex.qs.map((q, i) => `
            <div class="exam-q card">
              <div class="exam-q-head"><span class="exam-num">${i + 1}</span><h4>${q.title}</h4></div>
              <p class="task-prompt" style="padding-left:0">${q.prompt}</p>
              ${q.type === "choice"
                ? `<div class="exam-choices">${q.options.map((o) => `<label class="exam-opt"><input type="radio" name="eq-${i}" value="${escapeAttr(o)}"> ${o}</label>`).join("")}</div>`
                : `<input class="exam-input" type="text" name="eq-${i}" placeholder="Ваш ответ">`}
            </div>`).join("")}
        </div>
        <button class="btn btn-primary btn-lg" onclick="App.submitExam('${courseId}')">Завершить экзамен</button>
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
  function buildShareCanvas() {
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
    // щит на панели
    g.save(); g.translate(120, 150); g.scale(5, 5);
    g.strokeStyle = "rgba(255,255,255,.95)"; g.lineWidth = 1.4; g.lineJoin = "round"; g.lineCap = "round";
    g.beginPath(); g.moveTo(12, 3); g.lineTo(19, 6); g.lineTo(19, 11);
    g.bezierCurveTo(19, 15.4, 16, 18.6, 12, 20); g.bezierCurveTo(8, 18.6, 5, 15.4, 5, 11); g.lineTo(5, 6); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(9, 12); g.lineTo(11, 14); g.lineTo(15, 10); g.stroke(); g.restore();
    // ранг на панели
    g.fillStyle = "#fff"; g.textAlign = "center";
    g.font = "800 34px Sora, Inter, sans-serif"; g.fillText(s.rank.icon || "", 180, 340);
    g.font = "800 30px Sora, Inter, sans-serif"; g.fillText(s.rank.name, 180, 400);
    g.font = "600 22px Inter, sans-serif"; g.fillStyle = "rgba(255,255,255,.85)"; g.fillText("LVL " + s.level, 180, 440);
    // правая часть — заголовок
    g.textAlign = "left"; g.fillStyle = "#1a1613";
    g.font = "800 30px Sora, Inter, sans-serif"; g.fillText("CyberPath", 410, 90);
    g.fillStyle = "#8c8178"; g.font = "600 20px Inter, sans-serif";
    g.fillText("Мой прогресс в кибербезопасности", 410, 122);
    // метрики
    const stats = [
      [String(s.xp), "всего XP"],
      [s.tasksDone + "/" + s.tasksTotal, "заданий"],
      [s.coursesDone + "/" + s.coursesTotal, "курсов"],
      [(acc.total ? acc.pct + "%" : "—"), "точность"],
      [s.streak + "🔥", "дней подряд"],
      [s.achievements + "/" + s.achievementsTotal, "достижений"],
    ];
    let x0 = 410, y0 = 180, cw = 250, ch = 130;
    stats.forEach((st, i) => {
      const col = i % 3, row = (i / 3) | 0;
      const x = x0 + col * cw, y = y0 + row * (ch + 20);
      g.fillStyle = "#fff"; roundRect(g, x, y, cw - 20, ch, 16); g.fill();
      g.strokeStyle = "#fde3d0"; g.lineWidth = 1.5; roundRect(g, x, y, cw - 20, ch, 16); g.stroke();
      g.fillStyle = "#db5300"; g.font = "800 40px Sora, Inter, sans-serif"; g.textAlign = "left";
      g.fillText(st[0], x + 22, y + 60);
      g.fillStyle = "#8c8178"; g.font = "600 18px Inter, sans-serif"; g.fillText(st[1], x + 22, y + 95);
    });
    g.fillStyle = "#b3a99e"; g.font = "500 18px Inter, sans-serif";
    g.fillText("Бесплатная платформа · учись этично, применяй ответственно", 410, 600);
    return cv;
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function shareCard() {
    const cv = buildShareCanvas();
    cv.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "cyberpath-card.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: "CyberPath", text: "Мой прогресс в CyberPath" }).catch(() => {});
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = "cyberpath-card.png";
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
        toast("Карточка профиля скачана");
      }
    }, "image/png");
  }

  /* ---------- Режим повторения (spaced repetition) ---------- */
  let reviewSession = null;
  function renderReview() {
    const total = Progress.srsTotal();
    const due = Progress.srsDueList();
    if (!due.length) {
      root().innerHTML = `
        <section class="section">
          <div class="page-title"><h1>${T("Повторение")}</h1><p>Интервальное повторение слабых тем — как флеш-карты Anki.</p></div>
          <div class="review-empty card">
            <div class="cb-icon">${Icon.ui("check")}</div>
            <h3>${total ? "Всё повторено на сегодня!" : "Карточки появятся автоматически"}</h3>
            <p>${total
              ? "Вы разобрали все карточки, готовые к повторению. Возвращайтесь завтра — система напомнит нужное."
              : "Решайте задания в курсах — вопросы с ответами станут карточками и будут возвращаться на повторение через растущие интервалы."}</p>
            <p class="review-stat">Всего карточек в колоде: <b>${total}</b></p>
            <button class="btn btn-primary" onclick="App.go('courses')">${Icon.ui("arrow")} К курсам</button>
          </div>
        </section>`;
      highlightNav();
      return;
    }
    reviewSession = { queue: due.slice(), idx: 0, correct: 0, total: due.length, revealed: false };
    root().innerHTML = `<section class="section"><div class="page-title"><h1>${T("Повторение")}</h1><p>Сессия: ${due.length} карточек к повторению.</p></div><div id="review-stage"></div></section>`;
    highlightNav();
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
      { label: "Повторение", sub: "Карточки на повторение", go: () => go("review") },
      { label: "Словарь терминов", sub: "Глоссарий", go: () => go("glossary") },
      { label: "Профиль", sub: "Прогресс и достижения", go: () => go("profile") },
    ];
    COURSES.forEach((c) => {
      items.push({ label: c.title, sub: "Курс · " + c.level, go: () => go("course", { courseId: c.id }) });
      c.rooms.forEach((r) => items.push({ label: r.title, sub: "Комната · " + c.title, go: () => go("room", { courseId: c.id, roomId: r.id }) }));
    });
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
    if (!palette.filtered.length) { box.innerHTML = `<div class="palette-empty">Ничего не найдено</div>`; return; }
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

  /* ---------- Дашборд: графики (inline SVG) ---------- */
  function dashboardSection() {
    const acc = Progress.accuracyOverall();
    const due = Progress.srsDueCount();
    const active = Object.keys(Progress._state().activeDays || {}).length;
    const weak = Progress.weakCourses().slice(0, 4);
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
          <div class="chart-head"><h3>${T("XP по неделям")}</h3><span class="chart-sub">${T("последние 8 недель")}</span></div>
          ${xpBarsSVG()}
        </div>
        <div class="card chart-card">
          <div class="chart-head"><h3>${T("Радар навыков")}</h3><span class="chart-sub">${T("% прохождения курсов")}</span></div>
          ${radarSVG()}
        </div>
        <div class="card chart-card wide">
          <div class="chart-head"><h3>${T("Календарь активности")}</h3><span class="chart-sub">${T("последние 12 недель")}</span></div>
          ${heatmapSVG()}
        </div>
        ${weak.length ? `
        <div class="card chart-card wide">
          <div class="chart-head"><h3>${T("Слабые места")}</h3><span class="chart-sub">${T("где чаще ошибки — стоит повторить")}</span></div>
          <div class="weak-list">
            ${weak.map((w) => `<div class="weak-row" onclick="App.go('course',{courseId:'${w.course.id}'})">
              <span class="cpl-ic" style="color:${w.course.color}">${Icon.course(w.course.id)}</span>
              <span class="weak-name">${w.course.title}</span>
              <span class="weak-count">${w.wrong} ${T("ошибок")}</span>
            </div>`).join("")}
          </div>
        </div>` : ""}
      </div>`;
  }

  function xpBarsSVG() {
    const data = Progress.xpByWeek(8);
    const max = Math.max(1, ...data);
    const W = 460, H = 170, pad = 26, bw = (W - pad * 2) / data.length;
    const bars = data.map((v, i) => {
      const h = Math.round((v / max) * (H - pad - 24));
      const x = pad + i * bw + bw * 0.18, y = H - 24 - h, w = bw * 0.64;
      const lbl = i === data.length - 1 ? "сейчас" : (data.length - 1 - i) + "н";
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
    const W = 460, H = 300, cx = W / 2, cy = H / 2 + 6, R = 108;
    const n = data.length;
    const pt = (i, r) => {
      const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
      return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r];
    };
    const rings = [0.25, 0.5, 0.75, 1].map((f) =>
      `<polygon points="${data.map((_, i) => pt(i, R * f).map((v) => v.toFixed(1)).join(",")).join(" ")}" class="c-ring"/>`).join("");
    const spokes = data.map((_, i) => { const [x, y] = pt(i, R); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="c-spoke"/>`; }).join("");
    const poly = data.map((d, i) => pt(i, R * (d.pct / 100)).map((v) => v.toFixed(1)).join(",")).join(" ");
    const dots = data.map((d, i) => { const [x, y] = pt(i, R * (d.pct / 100)); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="var(--o-600)"><title>${d.title}: ${d.pct}%</title></circle>`; }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Радар навыков">
      ${rings}${spokes}
      <polygon points="${poly}" fill="var(--o-500)" fill-opacity="0.18" stroke="var(--o-500)" stroke-width="2"/>
      ${dots}</svg>`;
  }

  function heatmapSVG() {
    const days = Progress.activityMap(84);
    const cell = 15, gap = 4, cols = Math.ceil(days.length / 7);
    const W = cols * (cell + gap) + 8, H = 7 * (cell + gap) + 8;
    const xps = days.filter((d) => d.xp > 0).map((d) => d.xp);
    const max = Math.max(1, ...xps);
    const lvl = (xp) => xp <= 0 ? 0 : Math.min(4, 1 + Math.floor((xp / max) * 3.999));
    const shades = ["var(--bg-3)", "var(--o-200)", "var(--o-300)", "var(--o-400)", "var(--o-600)"];
    const cells = days.map((d, i) => {
      const col = Math.floor(i / 7), row = i % 7;
      const x = 4 + col * (cell + gap), y = 4 + row * (cell + gap);
      const has = (Progress._state().activeDays || {})[d.date] !== undefined;
      const fill = d.xp > 0 ? shades[lvl(d.xp)] : (has ? "var(--o-100)" : "var(--bg-3)");
      return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3" fill="${fill}"><title>${d.date}: ${d.xp} XP</title></rect>`;
    }).join("");
    return `<div class="heatmap-wrap"><svg viewBox="0 0 ${W} ${H}" class="chart-svg heatmap" role="img" aria-label="Календарь активности">${cells}</svg>
      <div class="heat-legend"><span>меньше</span>
        ${[0,1,2,3,4].map((l)=>`<span class="heat-key" style="background:${shades[l]}"></span>`).join("")}
        <span>больше</span></div></div>`;
  }

  function renderProfile() {
    const s = Progress.overallStats();
    root().innerHTML = `
      <section class="section">
        <div class="page-title"><h1>${T("Профиль и прогресс")}</h1></div>

        <div class="profile-top card">
          <div class="pt-level">
            <div class="lvl-circle" style="--pct:${s.xpInLevel}">
              <span>LVL<br><b>${s.level}</b></span>
            </div>
          </div>
          <div class="pt-stats">
            <div class="ps"><b>${s.xp}</b><span>${T("всего XP")}</span></div>
            <div class="ps"><b>${s.tasksDone}/${s.tasksTotal}</b><span>${T("заданий")}</span></div>
            <div class="ps"><b>${s.coursesDone}/${s.coursesTotal}</b><span>${T("курсов пройдено")}</span></div>
            <div class="ps"><b>${s.streak}</b><span>${T("дней подряд")}</span></div>
          </div>
          <div class="pt-actions">
            <button class="btn btn-ghost btn-sm" onclick="App.openRanks()">${s.rank.icon} ${T("Звания")}</button>
            <button class="btn btn-ghost btn-sm" onclick="App.shareCard()">${Icon.ui("progress")} ${T("Поделиться карточкой")}</button>
          </div>
        </div>

        ${dashboardSection()}

        <h2 class="rooms-title">${T("Прогресс по курсам")}</h2>
        <div class="course-progress-list">
          ${COURSES.map((c) => {
            const p = Progress.courseProgress(c);
            return `<div class="cpl-row" onclick="App.go('course',{courseId:'${c.id}'})">
              <span class="cpl-ic" style="color:${c.color}">${Icon.course(c.id)}</span>
              <div class="cpl-body">
                <div class="cpl-head"><b>${c.title}</b><span>${p.pct}%</span></div>
                <div class="xp-bar"><span style="width:${p.pct}%;background:${c.color}"></span></div>
              </div>
            </div>`;
          }).join("")}
        </div>

        <h2 class="rooms-title">${T("Достижения")} (${s.achievements}/${s.achievementsTotal})</h2>
        <div class="ach-grid">
          ${ACHIEVEMENTS.map((a) => {
            const got = Progress.hasAchievement(a.id);
            return `<div class="ach ${got ? "got" : "locked"}" title="${a.desc}">
              <span class="ach-ic">${got ? a.icon : "🔒"}</span>
              <b>${a.title}</b>
              <span class="ach-desc">${a.desc}</span>
            </div>`;
          }).join("")}
        </div>

        <h2 class="rooms-title">${T("Данные и синхронизация")}</h2>
        <div class="data-zone card">
          <div>
            <h3>Перенос прогресса</h3>
            <p>Прогресс хранится локально в этом браузере. Скачайте файл, чтобы перенести его на другое устройство или сделать резервную копию.</p>
          </div>
          <div class="data-actions">
            <button class="btn btn-ghost" onclick="App.exportProgress()">${Icon.ui("progress")} Скачать прогресс</button>
            <button class="btn btn-ghost" onclick="document.getElementById('import-file').click()">${Icon.ui("book")} Загрузить из файла</button>
            <input id="import-file" type="file" accept="application/json,.json" hidden onchange="App.importProgress(this.files[0])">
          </div>
        </div>

        <div class="danger-zone card">
          <div>
            <h3>Сброс прогресса</h3>
            <p>Удалит весь локальный прогресс без возможности восстановления.</p>
          </div>
          <button class="btn btn-danger" onclick="App.resetConfirm()">Сбросить всё</button>
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
  function submit(courseId, taskId) {
    const course = COURSES.find((c) => c.id === courseId);
    const task = course.rooms.flatMap((r) => r.tasks).find((t) => t.id === taskId);
    const input = document.getElementById(`ans-${taskId}`).value;
    const fb = document.getElementById(`fb-${taskId}`);
    if (!input.trim()) { fb.innerHTML = `<span class="fb-warn">Введите ответ</span>`; return; }

    const ok = checkAnswer(task, input);
    if (!Progress.isDone(taskId)) Progress.recordAttempt(taskId, ok);
    if (ok) {
      const res = Progress.completeTask(task, courseId);
      celebrate(res);
      const roomId = course.rooms.find((r) => r.tasks.includes(task)).id;
      renderRoom(courseId, roomId);
    } else {
      fb.innerHTML = `<span class="fb-err">✗ Неверно, попробуйте ещё раз.</span>`;
      const el = document.getElementById(`task-${taskId}`);
      el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake");
    }
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
    const { task, roomId } = findTask(courseId, taskId);
    const res = Progress.completeTask(task, courseId);
    celebrate(res);
    renderRoom(courseId, roomId);
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

  function celebrate(res) {
    if (!res || res.already) return;
    if (res.xpGained) { flyXP(res.xpGained); animateXP(Progress.overallStats().xp); }
    else renderNav();
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
    t.innerHTML = `<span class="ta-ic">${a.icon}</span><div><b>Достижение!</b><br>${a.title}</div>`;
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
    clearTimeout(toggleTheme._t);
    toggleTheme._t = setTimeout(() => root.classList.remove("theme-anim"), 360);
  }

  function toggleLang() {
    if (window.I18N) { I18N.toggle(); render(); }
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
        closePalette(); closeShortcuts(); closeRanks();
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
    current = parseHash();
    render();
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
    const rows = RANKS.map((r) => {
      const reached = lvl >= r.min;
      const isCur = r.name === curName;
      return `<div class="rank-row ${reached ? "reached" : "locked"} ${isCur ? "current" : ""}">
        <span class="rank-ic">${reached ? r.icon : "🔒"}</span>
        <span class="rank-name">${r.name}</span>
        <span class="rank-req">${T("с уровня")} ${r.min}${isCur ? " · " + T("сейчас") : ""}</span>
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
    catalogSearch, catalogLevel, catalogSort, downloadCertificate, exportProgress, importProgress,
    submitChoice, submitMatch, orderPick, orderReset, submitDaily,
    submitMission, toggleShell, openShortcuts, closeShortcuts,
    glossarySearch, submitExam, retryExam, openPalette, palettePick, installApp,
    reviewChoose, reviewCheck, reviewNext, shareCard, saveDraft, toggleLang,
    openRanks, closeRanks,
  };
})();

try { window.App = App; } catch (e) {}
document.addEventListener("DOMContentLoaded", App.init);
