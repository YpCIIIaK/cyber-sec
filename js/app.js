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
    createdAt: Date.now(),
  };

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

  function completeTask(task, courseId) {
    if (state.completed[task.id]) return { already: true };
    const gained = effectivePoints(task);
    state.completed[task.id] = true;
    state.earned[task.id] = gained;
    state.xp += gained;

    const events = { xpGained: gained, newAchievements: [] };

    // достижения
    if (Object.keys(state.completed).length === 1) tryAch("first_blood", events);
    if (state.xp >= 1000) tryAch("hundred_k", events);
    const lvl = level();
    if (lvl >= 5) tryAch("level_5", events);
    if (lvl >= 10) tryAch("level_10", events);

    // завершение курса
    checkCourseCompletion(courseId, events);

    save();
    return events;
  }

  function checkCourseCompletion(courseId, events) {
    let doneCourses = 0;
    for (const c of COURSES) {
      const all = c.rooms.flatMap((r) => r.tasks.map((t) => t.id));
      const done = all.every((id) => state.completed[id]);
      if (done) {
        doneCourses++;
        if (c.id === courseId) tryAch("course_done", events);
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
    state.xp += DAILY_BONUS;
    const events = { xpGained: DAILY_BONUS, newAchievements: [] };
    if (state.dailySolved >= 5) tryAch("daily_5", events);
    if (state.xp >= 1000) tryAch("hundred_k", events);
    const lvl = level();
    if (lvl >= 5) tryAch("level_5", events);
    if (lvl >= 10) tryAch("level_10", events);
    save();
    return events;
  }
  function completedAtISO() {
    return new Date().toISOString().slice(0, 10);
  }

  return {
    isDone, completeTask, useHint, hintsUsedFor, roomCompleted, roomUsedNoHints,
    courseProgress, courseUnlocked, missingPrereqs, overallStats, level, xpInLevel, xpToNext,
    unlockAchievement, hasAchievement, trackVisit, reset,
    exportData, importData, courseXP, completedAtISO,
    effectivePoints, hintPenalty: () => HINT_PENALTY,
    dailyToday, dailyIsDone, dailyCount, solveDaily,
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
    if (view === "sandbox") return "#/sandbox";
    if (view === "profile") return "#/profile";
    if (view === "courses") return "#/courses";
    return "#/";
  }
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, "");
    const parts = h.split("/").filter(Boolean);
    if (parts.length === 0) return { view: "home" };
    if (parts[0] === "courses") return { view: "courses" };
    if (parts[0] === "sandbox") return { view: "sandbox" };
    if (parts[0] === "profile") return { view: "profile" };
    if (parts[0] === "course" && parts[1]) {
      if (parts[2] === "room" && parts[3])
        return { view: "room", courseId: parts[1], roomId: parts[3] };
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
      case "home": return renderHome();
      case "courses": return renderCourses();
      case "course": return renderCourse(c.courseId);
      case "room": return renderRoom(c.courseId, c.roomId);
      case "sandbox": return renderSandbox();
      case "profile": return renderProfile();
      default: return renderHome();
    }
    highlightNav();
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
          <div class="feature">
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
      <article class="course-card ${unlocked ? "" : "locked"} ${p.pct === 100 ? "completed" : ""}" style="--c:${course.color}" onclick="${onclick}">
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
          <p>Вы завершили курс «${course.title}» и заработали ${Progress.courseXP(course)} XP.</p>
        </div>
        <button class="btn btn-primary" onclick="App.downloadCertificate('${course.id}')">${Icon.ui("progress")} Скачать сертификат</button>
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
            <span class="term-title">C:\\Users\\hacker — CyberPath Sandbox</span>
          </div>
          <div class="term-body" id="term-body">
            <div id="term-out"></div>
            <div class="term-input-row">
              <span class="term-path">C:\\Users\\hacker</span><span class="term-prompt">&gt;</span>
              <input type="text" id="term-input" autocomplete="off" spellcheck="false" autofocus>
            </div>
          </div>
        </div>
        <div class="sandbox-hints card">
          <h3>Быстрый старт</h3>
          <div class="cheat">
            ${["help — все команды","dir — файлы и папки","type secret.txt — читать файл","findstr CYBER файл — поиск","systeminfo — инфо о системе","nmap 10.10.10.5 — скан портов","base64 -d <строка> — декод","rot13 <текст> — шифр"].map(c=>`<code>${c}</code>`).join("")}
          </div>
        </div>
      </section>`;
    highlightNav();
    Sandbox.init(document.getElementById("term-out"), document.getElementById("term-input"));
    setTimeout(() => document.getElementById("term-input").focus(), 100);
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
    if (res.xpGained) toast(`+${res.xpGained} XP 🎉`);
    (res.newAchievements || []).forEach((id) => toastAchievement(id));
    renderNav();
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
    current = parseHash();
    render();
  }

  return {
    init, go, submit, markInfo, showHint, toast, toastAchievement, resetConfirm, toggleTheme,
    catalogSearch, catalogLevel, catalogSort, downloadCertificate, exportProgress, importProgress,
    submitChoice, submitMatch, orderPick, orderReset, submitDaily,
  };
})();

document.addEventListener("DOMContentLoaded", App.init);
