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
    createdAt: Date.now(),
  };
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
  function awardXP(amount, events) {
    const beforeLvl = level();
    const beforeRank = rankForLevel(beforeLvl).name;
    state.xp += amount;
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

    const events = { xpGained: gained, newAchievements: [] };
    if (Object.keys(state.completed).length === 1) tryAch("first_blood", events);
    awardXP(gained, events);
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

  return {
    isDone, completeTask, useHint, hintsUsedFor, roomCompleted, roomUsedNoHints,
    courseProgress, courseUnlocked, missingPrereqs, overallStats, level, xpInLevel, xpToNext,
    unlockAchievement, hasAchievement, trackVisit, reset,
    exportData, importData, courseXP, completedAtISO,
    effectivePoints, hintPenalty: () => HINT_PENALTY,
    dailyToday, dailyIsDone, dailyCount, solveDaily,
    missionDone, completeMission,
    examPassed, examBest, recordExam,
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
  function renderNav() {
    const s = Progress.overallStats();
    const nav = document.getElementById("nav-stats");
    if (nav) {
      nav.innerHTML = `
        <span class="rank-chip" title="Ваше звание">${s.rank.icon} ${s.rank.name}</span>
        <div class="nav-xp" title="Ваш уровень и опыт">
          <span class="lvl-badge">LVL ${s.level}</span>
          <div class="xp-bar-mini"><span style="width:${(s.xpInLevel)}%"></span></div>
          <span class="xp-text">${s.xp} XP</span>
        </div>
        ${s.streak > 0 ? `<span class="streak" title="Серия дней подряд">${Icon.ui("flame")}${s.streak}</span>` : ""}
      `;
    }
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
            <span class="hero-badge">Бесплатно · Без регистрации · Прогресс сохраняется локально</span>
            <h1>Учись <span class="accent">кибербезопасности</span><br>на практике</h1>
            <p class="hero-sub">Интерактивные курсы, квесты, задания и живая песочница-терминал.
            От основ до пентеста, веба, сетей, Active Directory и форензики.</p>
            <div class="hero-actions">
              <button class="btn btn-primary btn-lg" onclick="App.go('courses')">Начать обучение ${Icon.ui("arrow")}</button>
              <button class="btn btn-ghost btn-lg" onclick="App.go('sandbox')">${Icon.ui("terminal")} Открыть песочницу</button>
            </div>
          </div>
          <div class="hero-card">
            <div class="hc-row"><span>Ваш уровень</span><b class="accent">LVL ${s.level}</b></div>
            <div class="xp-bar"><span style="width:${s.xpInLevel}%"></span></div>
            <div class="hc-sub">${s.xpInLevel} / 100 XP до ${s.level + 1} уровня</div>
            <div class="hc-grid">
              <div><b>${s.tasksDone}</b><span>заданий</span></div>
              <div><b>${s.coursesDone}/${s.coursesTotal}</b><span>курсов</span></div>
              <div><b>${s.achievements}/${s.achievementsTotal}</b><span>ачивок</span></div>
              <div><b>${s.streak}</b><span>дней подряд</span></div>
            </div>
          </div>
        </div>
      </section>

      ${continueBlock()}
      ${dailyCard()}

      <section class="features">
        ${[
          ["target", "Реальные навыки", "Задания на настоящих концепциях: SQLi, XSS, Nmap, cmd/PowerShell, Active Directory, хеши."],
          ["flag", "Квесты и флаги", "Находи флаги CYBER{…} в живой песочнице — как в CTF-соревнованиях."],
          ["progress", "Система прогрессии", "XP, уровни, серии дней и достижения. Сложные курсы открываются по мере роста."],
          ["terminal", "Прогресс локально", "Всё хранится в браузере. Никаких аккаунтов, регистрации и слежки."],
        ].map(([i, t, d]) => `
          <div class="feature reveal">
            <div class="feature-ic">${Icon.ui(i)}</div>
            <h3>${t}</h3><p>${d}</p>
          </div>`).join("")}
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Популярные курсы</h2>
          <a class="link" onclick="App.go('courses')">Все курсы ${Icon.ui("arrow")}</a>
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
          <span class="cc-level">${unlocked ? "" : Icon.ui("lock")}${course.level}</span>
        </div>
        <h3>${course.title}</h3>
        <p>${course.summary}</p>
        <div class="cc-tags">${course.tags.map((t) => `<span>#${t}</span>`).join("")}</div>
        ${unlocked ? `
        <div class="cc-progress">
          <div class="xp-bar"><span style="width:${p.pct}%"></span></div>
          <span class="cc-pct">${p.pct === 100 ? "✓ Пройдено" : p.done + "/" + p.total + " · " + p.pct + "%"}</span>
        </div>`
        : `<div class="cc-lock">${Icon.ui("lock")} Требуется: ${missing.map((m) => m.title).join(", ")}</div>`}
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
    if (count) count.textContent = `${list.length} из ${COURSES.length}`;
    observeReveal();
  }

  function renderCourses() {
    root().innerHTML = `
      <section class="section">
        <div class="page-title">
          <h1>Каталог курсов</h1>
          <p>Выберите направление. Сложные курсы открываются по мере прохождения предыдущих.</p>
        </div>
        <div class="catalog-toolbar">
          <div class="search-box">
            ${Icon.ui("quest")}
            <input id="catalog-search" type="text" placeholder="Поиск по курсам и темам…" value="${catalog.q}"
                   oninput="App.catalogSearch(this.value)">
          </div>
          <div class="filter-chips">
            ${LEVELS.map((lv) => `<button class="chip ${catalog.level === lv ? "active" : ""}" onclick="App.catalogLevel('${lv}')">${lv === "all" ? "Все уровни" : lv}</button>`).join("")}
          </div>
          <select class="sort-select" onchange="App.catalogSort(this.value)">
            <option value="default" ${catalog.sort === "default" ? "selected" : ""}>По умолчанию</option>
            <option value="progress" ${catalog.sort === "progress" ? "selected" : ""}>По прогрессу</option>
            <option value="level" ${catalog.sort === "level" ? "selected" : ""}>По сложности</option>
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
      el.classList.toggle("active", el.textContent === (lv === "all" ? "Все уровни" : lv)));
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
            <span class="cc-level">${course.level}</span>
            <h1>${course.title}</h1>
            <p>${course.summary}</p>
            <div class="cc-progress wide">
              <div class="xp-bar"><span style="width:${p.pct}%"></span></div>
              <span class="cc-pct">${p.done}/${p.total} заданий · ${p.pct}%</span>
            </div>
          </div>
        </div>
        ${p.pct === 100 ? certificateCard(course) : ""}
        <h2 class="rooms-title">Комнаты курса</h2>
        <div class="room-list">
          ${course.rooms.map((room, i) => roomRow(course, room, i)).join("")}
        </div>
      </section>`;
    highlightNav();
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

    root().innerHTML = `
      <section class="section room-view">
        <a class="back" onclick="App.go('course',{courseId:'${course.id}'})">← ${course.title}</a>
        <div class="room-header">
          <span class="rh-tag">Комната ${idx + 1}/${course.rooms.length}</span>
          <h1>${room.title}</h1>
          <div class="room-meta">
            <span class="room-chip timer-chip">${Icon.ui("progress")} <span id="room-timer">00:00</span></span>
            <span class="room-chip nohint-chip ${Progress.roomUsedNoHints(room) ? "on" : "off"}">
              ${Icon.ui("bolt")} ${Progress.roomUsedNoHints(room) ? "Без подсказок" : "Подсказки использованы"}
            </span>
          </div>
        </div>
        <div class="room-columns">
          <div class="lesson card">${room.intro}</div>
          <div class="tasks">
            <h2>Задания</h2>
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

    // проверка "без подсказок"
    if (Progress.roomCompleted(room) && Progress.roomUsedNoHints(room)) {
      Progress.unlockAchievement("no_hints");
    }
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
          ? `<div class="task-ok">${Icon.ui("check")} ${task.type === "info" ? "Отмечено как прочитанное" : "Верно! Решено (+" + (Progress._state().earned[task.id] ?? task.points) + " XP)"}</div>`
          : answerArea(course, task) + hintsArea(course, task)}
      </div>`;
  }

  function answerArea(course, task) {
    const cid = course.id, tid = task.id;
    switch (task.type) {
      case "info":
        return `<button class="btn btn-primary btn-sm" onclick="App.markInfo('${cid}','${tid}')">Понятно, дальше</button>`;
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
          <button class="btn btn-primary btn-sm" onclick="App.submitMatch('${cid}','${tid}')">Проверить</button>
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
                   onkeydown="if(event.key==='Enter')App.submit('${cid}','${tid}')">
            <button class="btn btn-primary btn-sm" onclick="App.submit('${cid}','${tid}')">Проверить</button>
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
          : (i === shown ? `<button class="hint-btn" onclick="App.showHint('${task.id}',${i})">Показать подсказку ${i + 1} (−${cost} XP)</button>` : "")
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
    return `
      <div class="complete-banner">
        <div class="cb-icon">${Icon.ui("check")}</div>
        <h3>Комната пройдена!</h3>
        <p>Отличная работа. ${nextRoom ? "Готовы к следующей?" : "Это была последняя комната курса!"}</p>
        ${nextRoom
          ? `<button class="btn btn-primary" onclick="App.go('room',{courseId:'${course.id}',roomId:'${nextRoom.id}'})">Следующая комната ${Icon.ui("arrow")}</button>`
          : `<button class="btn btn-primary" onclick="App.go('course',{courseId:'${course.id}'})">К обзору курса</button>`}
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
          <h3>Быстрый старт</h3>
          <div class="cheat">
            ${["help — все команды","dir / type — файлы","findstr CYBER файл","reg query …Run — реестр","certutil -decode <b64>","nmap 10.10.10.5","nslookup target.local","Tab — автодополнение"].map(c=>`<code>${c}</code>`).join("")}
          </div>
        </div>

        <h2 class="rooms-title">Квесты-машины</h2>
        <p class="missions-intro">Многошаговые сценарии: выполняйте команды в терминале выше, находите флаг и вводите его здесь.</p>
        <div class="mission-list">
          ${MISSIONS.map(missionCard).join("")}
        </div>
      </section>`;
    highlightNav();
    Sandbox.init(document.getElementById("term-out"), document.getElementById("term-input"));
    setTimeout(() => { const i = document.getElementById("term-input"); if (i) i.focus(); }, 100);
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
          <h1>Словарь терминов</h1>
          <p>${GLOSSARY.length} определений ключевых понятий кибербезопасности — по реальным стандартам.</p>
        </div>
        <div class="catalog-toolbar">
          <div class="search-box">
            ${Icon.ui("quest")}
            <input id="gloss-search" type="text" placeholder="Поиск термина или определения…" value="${glossaryState.q}" oninput="App.glossarySearch(this.value)">
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
          <h1>Путь обучения</h1>
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
      .filter((t) => (t.type === "question" || t.type === "choice" || t.type === "flag") && (t.answers || t.answer));
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

  /* ---------- Командная палитра (Ctrl/⌘+K) ---------- */
  const palette = { open: false, items: [], active: 0, filtered: [] };
  function buildPaletteItems() {
    const items = [
      { label: "Главная", sub: "Домашняя страница", go: () => go("home") },
      { label: "Каталог курсов", sub: "Все курсы", go: () => go("courses") },
      { label: "Путь обучения", sub: "Дорожная карта", go: () => go("roadmap") },
      { label: "Песочница", sub: "Терминал и квесты", go: () => go("sandbox") },
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

  function renderProfile() {
    const s = Progress.overallStats();
    root().innerHTML = `
      <section class="section">
        <div class="page-title"><h1>Профиль и прогресс</h1></div>

        <div class="profile-top card">
          <div class="pt-level">
            <div class="lvl-circle" style="--pct:${s.xpInLevel}">
              <span>LVL<br><b>${s.level}</b></span>
            </div>
          </div>
          <div class="pt-stats">
            <div class="ps"><b>${s.xp}</b><span>всего XP</span></div>
            <div class="ps"><b>${s.tasksDone}/${s.tasksTotal}</b><span>заданий</span></div>
            <div class="ps"><b>${s.coursesDone}/${s.coursesTotal}</b><span>курсов пройдено</span></div>
            <div class="ps"><b>${s.streak}</b><span>дней подряд</span></div>
          </div>
        </div>

        <h2 class="rooms-title">Прогресс по курсам</h2>
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

        <h2 class="rooms-title">Достижения (${s.achievements}/${s.achievementsTotal})</h2>
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

        <h2 class="rooms-title">Данные и синхронизация</h2>
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

    if (checkAnswer(task, input)) {
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
    if (checkAnswer(task, btn.textContent)) solveTask(courseId, taskId);
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
    if (res.xpGained) toast(`+${res.xpGained} XP`);
    if (res.levelUp) { toast(`🎉 Новый уровень: ${res.levelUp}!`); confetti(); }
    if (res.newRank) toast(`${res.newRank.icon} Новое звание: ${res.newRank.name}`);
    if (res.courseDone) confetti();
    (res.newAchievements || []).forEach((id) => toastAchievement(id));
    renderNav();
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
    applyTheme(next);
  }

  /* ---------- Инициализация ---------- */
  function init() {
    applyTheme(currentTheme());
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
        closePalette(); closeShortcuts();
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

  return {
    init, go, submit, markInfo, showHint, toast, toastAchievement, resetConfirm, toggleTheme,
    catalogSearch, catalogLevel, catalogSort, downloadCertificate, exportProgress, importProgress,
    submitChoice, submitMatch, orderPick, orderReset, submitDaily,
    submitMission, toggleShell, openShortcuts, closeShortcuts,
    glossarySearch, submitExam, retryExam, openPalette, palettePick, installApp,
  };
})();

document.addEventListener("DOMContentLoaded", App.init);
