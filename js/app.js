/* ============================================================
   CyberPath — ядро приложения: прогресс, роутинг, рендер
   ============================================================ */

/* ---------- Прогресс (localStorage) ---------- */
const Progress = (() => {
  const KEY = "cyberpath_progress_v1";
  const XP_PER_LEVEL = 100; // XP на уровень

  const defaultState = {
    completed: {},        // taskId -> true
    hintsUsed: {},        // taskId -> count
    xp: 0,
    achievements: {},     // id -> timestamp
    lastVisit: null,      // YYYY-MM-DD
    streak: 0,
    createdAt: Date.now(),
  };

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

  function completeTask(task, courseId) {
    if (state.completed[task.id]) return { already: true };
    state.completed[task.id] = true;
    state.xp += task.points || 0;

    const events = { xpGained: task.points || 0, newAchievements: [] };

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

  return {
    isDone, completeTask, useHint, hintsUsedFor, roomCompleted, roomUsedNoHints,
    courseProgress, overallStats, level, xpInLevel, xpToNext,
    unlockAchievement, hasAchievement, trackVisit, reset,
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
        ${s.streak > 0 ? `<span class="streak" title="Серия дней подряд">🔥 ${s.streak}</span>` : ""}
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
            <span class="hero-badge">🛡️ Бесплатно · Без регистрации · Прогресс сохраняется локально</span>
            <h1>Учись <span class="accent">кибербезопасности</span><br>на практике</h1>
            <p class="hero-sub">Интерактивные курсы, квесты, задания и живая песочница-терминал.
            От основ до пентеста, веба, сетей, криптографии и OSINT.</p>
            <div class="hero-actions">
              <button class="btn btn-primary btn-lg" onclick="App.go('courses')">🚀 Начать обучение</button>
              <button class="btn btn-ghost btn-lg" onclick="App.go('sandbox')">🧪 Открыть песочницу</button>
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
              <div><b>🔥 ${s.streak}</b><span>дней</span></div>
            </div>
          </div>
        </div>
      </section>

      <section class="features">
        ${[
          ["🎯", "Реальные навыки", "Задания построены на настоящих концепциях: SQLi, XSS, Nmap, права Linux, хеши."],
          ["🧩", "Квесты и флаги", "Находи флаги CYBER{...} в песочнице — как в CTF."],
          ["📈", "Система прогрессии", "XP, уровни, серии дней и достижения за каждый шаг."],
          ["💾", "Прогресс локально", "Всё хранится в браузере. Никаких аккаунтов и слежки."],
        ].map(([i, t, d]) => `
          <div class="feature">
            <div class="feature-ic">${i}</div>
            <h3>${t}</h3><p>${d}</p>
          </div>`).join("")}
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Популярные курсы</h2>
          <a class="link" onclick="App.go('courses')">Все курсы →</a>
        </div>
        <div class="course-grid">
          ${COURSES.slice(0, 3).map(courseCard).join("")}
        </div>
      </section>
    `;
    highlightNav();
  }

  function courseCard(course) {
    const p = Progress.courseProgress(course);
    return `
      <article class="course-card" style="--c:${course.color}" onclick="App.go('course',{courseId:'${course.id}'})">
        <div class="cc-top">
          <span class="cc-icon">${course.icon}</span>
          <span class="cc-level">${course.level}</span>
        </div>
        <h3>${course.title}</h3>
        <p>${course.summary}</p>
        <div class="cc-tags">${course.tags.map((t) => `<span>#${t}</span>`).join("")}</div>
        <div class="cc-progress">
          <div class="xp-bar"><span style="width:${p.pct}%"></span></div>
          <span class="cc-pct">${p.done}/${p.total} · ${p.pct}%</span>
        </div>
      </article>`;
  }

  function renderCourses() {
    root().innerHTML = `
      <section class="section">
        <div class="page-title">
          <h1>Каталог курсов</h1>
          <p>${COURSES.length} курсов · от новичка до продвинутого уровня</p>
        </div>
        <div class="course-grid">
          ${COURSES.map(courseCard).join("")}
        </div>
      </section>`;
    highlightNav();
  }

  function renderCourse(courseId) {
    const course = COURSES.find((c) => c.id === courseId);
    if (!course) return go("courses");
    const p = Progress.courseProgress(course);
    root().innerHTML = `
      <section class="section">
        <a class="back" onclick="App.go('courses')">← Все курсы</a>
        <div class="course-head" style="--c:${course.color}">
          <span class="ch-icon">${course.icon}</span>
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
        <h2 class="rooms-title">Комнаты курса</h2>
        <div class="room-list">
          ${course.rooms.map((room, i) => roomRow(course, room, i)).join("")}
        </div>
      </section>`;
    highlightNav();
  }

  function roomRow(course, room, i) {
    const done = room.tasks.filter((t) => Progress.isDone(t.id)).length;
    const total = room.tasks.length;
    const complete = done === total;
    const locked = i > 0 && !Progress.roomCompleted(course.rooms[i - 1]);
    return `
      <div class="room-row ${complete ? "done" : ""} ${locked ? "locked" : ""}"
           onclick="${locked ? "App.toast('Сначала завершите предыдущую комнату 🔒')" : `App.go('room',{courseId:'${course.id}',roomId:'${room.id}'})`}">
        <span class="rr-num">${complete ? "✓" : locked ? "🔒" : i + 1}</span>
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

    // проверка "без подсказок"
    if (Progress.roomCompleted(room) && Progress.roomUsedNoHints(room)) {
      Progress.unlockAchievement("no_hints");
    }
  }

  function taskBlock(course, task) {
    const done = Progress.isDone(task.id);
    const hintsShown = Progress.hintsUsedFor(task.id);
    const hints = task.hints || [];
    return `
      <div class="task ${done ? "done" : ""}" id="task-${task.id}">
        <div class="task-head">
          <span class="task-check">${done ? "✓" : ""}</span>
          <div class="task-title">
            <h4>${task.title}</h4>
            <span class="task-points">+${task.points} XP</span>
            ${task.sandbox ? '<span class="task-sandbox" title="Решается в песочнице">🧪</span>' : ""}
          </div>
        </div>
        <p class="task-prompt">${task.prompt}</p>
        ${task.type === "info"
          ? (done ? `<div class="task-ok">Отмечено как прочитанное ✓</div>`
                  : `<button class="btn btn-primary btn-sm" onclick="App.markInfo('${course.id}','${task.id}')">Понятно, дальше</button>`)
          : (done
              ? `<div class="task-ok">Верно! Решено ✓</div>`
              : `
                <div class="answer-row">
                  <input type="text" id="ans-${task.id}" placeholder="${task.type === "flag" ? "CYBER{...}" : "Ваш ответ"}"
                         onkeydown="if(event.key==='Enter')App.submit('${course.id}','${task.id}')">
                  <button class="btn btn-primary btn-sm" onclick="App.submit('${course.id}','${task.id}')">Проверить</button>
                </div>
                <div class="feedback" id="fb-${task.id}"></div>
                ${hints.length ? `
                  <div class="hints">
                    ${hints.map((h, i) => i < hintsShown
                      ? `<div class="hint-shown">💡 ${h}</div>`
                      : (i === hintsShown ? `<button class="hint-btn" onclick="App.showHint('${task.id}',${i})">Показать подсказку ${i + 1} (−0 XP)</button>` : "")
                    ).join("")}
                  </div>` : ""}
              `)
        }
      </div>`;
  }

  function completionBanner(course, room, nextRoom) {
    return `
      <div class="complete-banner">
        <div class="cb-icon">🎉</div>
        <h3>Комната пройдена!</h3>
        <p>Отличная работа. ${nextRoom ? "Готовы к следующей?" : "Это была последняя комната курса!"}</p>
        ${nextRoom
          ? `<button class="btn btn-primary" onclick="App.go('room',{courseId:'${course.id}',roomId:'${nextRoom.id}'})">Следующая комната →</button>`
          : `<button class="btn btn-primary" onclick="App.go('course',{courseId:'${course.id}'})">К обзору курса</button>`}
      </div>`;
  }

  function renderSandbox() {
    root().innerHTML = `
      <section class="section">
        <div class="page-title">
          <h1>🧪 Песочница</h1>
          <p>Безопасный учебный терминал. Отрабатывайте команды и ищите флаги. Наберите <code>help</code>.</p>
        </div>
        <div class="term-wrap card">
          <div class="term-bar">
            <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
            <span class="term-title">hacker@cyberpath: ~</span>
          </div>
          <div class="term-body" id="term-body">
            <div id="term-out"></div>
            <div class="term-input-row">
              <span class="term-prompt">hacker@cyberpath</span>:<span class="term-path">~</span>$
              <input type="text" id="term-input" autocomplete="off" spellcheck="false" autofocus>
            </div>
          </div>
        </div>
        <div class="sandbox-hints card">
          <h3>Быстрый старт</h3>
          <div class="cheat">
            ${["help — все команды","ls -la — файлы и скрытые","cat secret.txt — читать файл","nmap 10.10.10.5 — скан портов","base64 -d <строка> — декод","rot13 <текст> — шифр"].map(c=>`<code>${c}</code>`).join("")}
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
        <div class="page-title"><h1>👤 Профиль и прогресс</h1></div>

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
            <div class="ps"><b>🔥 ${s.streak}</b><span>дней подряд</span></div>
          </div>
        </div>

        <h2 class="rooms-title">Прогресс по курсам</h2>
        <div class="course-progress-list">
          ${COURSES.map((c) => {
            const p = Progress.courseProgress(c);
            return `<div class="cpl-row" onclick="App.go('course',{courseId:'${c.id}'})">
              <span class="cpl-ic">${c.icon}</span>
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
    const course = COURSES.find((c) => c.id === courseId);
    const task = course.rooms.flatMap((r) => r.tasks).find((t) => t.id === taskId);
    const res = Progress.completeTask(task, courseId);
    celebrate(res);
    const roomId = course.rooms.find((r) => r.tasks.includes(task)).id;
    renderRoom(courseId, roomId);
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

  /* ---------- Инициализация ---------- */
  function init() {
    Progress.trackVisit();
    window.addEventListener("hashchange", () => {
      current = parseHash();
      render();
    });
    current = parseHash();
    render();
  }

  return { init, go, submit, markInfo, showHint, toast, toastAchievement, resetConfirm };
})();

document.addEventListener("DOMContentLoaded", App.init);
