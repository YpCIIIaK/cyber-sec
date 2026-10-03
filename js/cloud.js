/* ============================================================
   CyberPath — облако: аккаунты (GitHub / Google / ник+пароль),
   синхронизация прогресса и отправка решений для рейтинга.
   Библиотека supabase-js лежит локально (js/vendor) и грузится
   только когда облако реально нужно.
   ============================================================ */
const Cloud = (() => {
  const CFG = window.CYBERPATH_CONFIG || {};
  const enabled = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  const FLAG = "cyberpath_cloud";          // был вход — подключаться при запуске
  const BACK = "cyberpath_cloud_back";     // куда вернуться после OAuth
  const NICK_RE = /^[A-Za-z0-9_]{3,20}$/;

  let sb = null, libP = null, connectP = null;
  const st = { status: enabled ? "out" : "off", user: null, nick: null, pending: 0, error: null, syncing: false };
  const subs = new Set();
  let serverSolved = null;                 // Set id заданий, уже засчитанных базой
  let flushTimer = null, pushTimer = null, retryTimer = null;

  function notify() { subs.forEach((f) => { try { f(st); } catch (e) {} }); }
  function onChange(f) { subs.add(f); return () => subs.delete(f); }
  function flag(on) { try { on ? localStorage.setItem(FLAG, "1") : localStorage.removeItem(FLAG); } catch (e) {} }
  function hasFlag() { try { return !!localStorage.getItem(FLAG); } catch (e) { return false; } }

  function loadLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    if (!libP) libP = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "js/vendor/supabase.js"; s.onload = res;
      s.onerror = () => { libP = null; rej(new Error("lib")); };
      document.head.appendChild(s);
    });
    return libP;
  }

  // Подключение: создаёт клиент и подхватывает сессию (в т.ч. ?code= после OAuth)
  function connect() {
    if (!enabled) return Promise.reject(new Error("disabled"));
    if (connectP) return connectP;
    st.status = "loading"; notify();
    connectP = loadLib().then(async () => {
      sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
        auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "cyberpath_auth" },
      });
      sb.auth.onAuthStateChange((ev, session) => {
        if (ev === "SIGNED_OUT") { reset(); return; }
        if (session && session.user && (!st.user || st.user.id !== session.user.id)) setTimeout(() => afterLogin(session.user), 0);
        else if (session && session.user) st.user = session.user;
      });
      const { data } = await sb.auth.getSession();
      cleanUrl();
      if (data && data.session) await afterLogin(data.session.user);
      else { st.status = "out"; flag(false); notify(); }
      return sb;
    }).catch((e) => { connectP = null; st.status = "out"; st.error = "network"; notify(); throw e; });
    return connectP;
  }

  // Убираем ?code=… из адреса и возвращаемся на страницу, с которой уходили на вход
  function cleanUrl() {
    const q = location.search;
    if (/[?&](code|error|error_description)=/.test(q)) {
      let back = "";
      try { back = sessionStorage.getItem(BACK) || ""; sessionStorage.removeItem(BACK); } catch (e) {}
      if (/[?&]error/.test(q)) st.error = "oauth";
      history.replaceState(null, "", location.pathname + (back || location.hash));
      if (back) window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  }

  function reset() {
    st.status = enabled ? "out" : "off"; st.user = null; st.nick = null; st.pending = 0;
    serverSolved = null; flag(false);
    clearTimeout(flushTimer); clearTimeout(pushTimer); clearTimeout(retryTimer);
    notify();
  }

  async function afterLogin(user) {
    st.user = user; st.error = null; flag(true);
    const { data: prof } = await sb.from("profiles").select("nick").eq("id", user.id).maybeSingle();
    st.nick = prof ? prof.nick : null;
    st.status = st.nick ? "in" : "needNick";
    notify();
    if (st.nick) await initialSync();
  }

  /* ---------- Синхронизация ---------- */
  // Слияние локального и облачного прогресса: ничего не теряем
  function mergeState(a, b) {
    if (a === undefined || a === null) return b;
    if (b === undefined || b === null) return a;
    if (Array.isArray(a) || Array.isArray(b)) {
      const la = Array.isArray(a) ? a.length : -1, lb = Array.isArray(b) ? b.length : -1;
      return la >= lb ? a : b;
    }
    if (typeof a === "object" && typeof b === "object") {
      const o = Object.assign({}, b, a);
      for (const k of Object.keys(o)) if (k in a && k in b) o[k] = mergeState(a[k], b[k]);
      return o;
    }
    if (typeof a === "number" && typeof b === "number") return Math.max(a, b);
    return a;
  }

  async function initialSync() {
    st.syncing = true; notify();
    try {
      const { data: row } = await sb.from("progress").select("data").eq("user_id", st.user.id).maybeSingle();
      const local = Progress.getState();
      if (row && row.data && typeof row.data === "object" && typeof row.data.completed === "object") {
        const merged = mergeState(local, row.data);
        const earnedSum = Object.values(merged.earned || {}).reduce((s, v) => s + (Number(v) || 0), 0);
        merged.xp = Math.max(Number(merged.xp) || 0, earnedSum);
        if (JSON.stringify(merged) !== JSON.stringify(local)) {
          Progress.replaceState(merged);
          window.dispatchEvent(new Event("cloud:merged"));
        }
      }
      await pushProgress();
      const { data: solved } = await sb.from("solves").select("task_id");
      serverSolved = new Set((solved || []).map((r) => r.task_id));
      await flush();
    } catch (e) { st.error = "sync"; }
    st.syncing = false; notify();
  }

  function catalogIds() {
    const ids = new Set();
    COURSES.forEach((c) => c.rooms.forEach((r) => r.tasks.forEach((t) => ids.add(t.id))));
    return ids;
  }
  function pendingSolves() {
    if (!serverSolved) return [];
    const cat = catalogIds(), s = Progress.getState();
    return Object.keys(s.completed || {}).filter((id) => cat.has(id) && !serverSolved.has(id));
  }

  // Отправка решённых заданий партиями; база сама считает XP и применяет лимиты
  async function flush() {
    if (st.status !== "in" || !serverSolved) return;
    clearTimeout(retryTimer);
    let queue = pendingSolves();
    st.pending = queue.length; notify();
    while (queue.length) {
      const batch = queue.slice(0, 20).map((id) => ({ id, h: Progress.hintsFor(id) }));
      const { data, error } = await sb.rpc("submit_solves", { items: batch });
      if (error) { st.error = "sync"; break; }
      (data.accepted || []).forEach((id) => serverSolved.add(id));
      (data.rejected || []).forEach((id) => serverSolved.add(id)); // нет в каталоге — не повторяем
      if ((data.deferred || []).length) { retryTimer = setTimeout(flush, 65000); break; } // лимит — позже
      queue = pendingSolves();
    }
    st.pending = pendingSolves().length; notify();
  }

  async function pushProgress() {
    if (st.status !== "in") return;
    clearTimeout(pushTimer);
    const s = Progress.getState();
    delete s.drafts;                         // черновики ответов в облако не нужны
    const { data, error } = await sb.rpc("save_progress", { p_data: s });
    if (error) st.error = "sync";
    else if (data === false) pushTimer = setTimeout(pushProgress, 6000);
  }

  window.addEventListener("cp:solved", () => {
    if (st.status !== "in") return;
    clearTimeout(flushTimer); flushTimer = setTimeout(flush, 1500);
  });
  window.addEventListener("cp:saved", () => {
    if (st.status !== "in") return;
    clearTimeout(pushTimer); pushTimer = setTimeout(pushProgress, 10000);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && st.status === "in" && pushTimer) pushProgress();
  });
  window.addEventListener("online", () => { if (st.status === "in") { flush(); pushProgress(); } });

  /* ---------- Вход / регистрация ---------- */
  function redirectTo() { return location.origin + location.pathname; }
  function rememberBack() { try { sessionStorage.setItem(BACK, location.hash || "#/"); } catch (e) {} }
  function pseudoEmail(nick) { return nick.toLowerCase() + "@" + (CFG.pseudoEmailDomain || "players.cyberpath.invalid"); }

  async function signInOAuth(provider) {
    if (provider !== "github" && provider !== "google") throw new Error("provider");
    await connect().catch(() => {});
    rememberBack();
    const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: redirectTo() } });
    if (error) throw error;
  }

  async function signUpNick(nick, password, captchaToken) {
    if (!NICK_RE.test(nick)) throw new Error("invalid_nick");
    if (!password || password.length < 8) throw new Error("weak_password");
    await connect().catch(() => {});
    const { data: free } = await sb.rpc("nick_available", { p_nick: nick });
    if (!free) throw new Error("nick_taken");
    const { error } = await sb.auth.signUp({ email: pseudoEmail(nick), password, options: { data: { nick }, captchaToken: captchaToken || undefined } });
    if (error) throw error;
  }

  async function signInNick(nick, password, captchaToken) {
    if (!NICK_RE.test(nick)) throw new Error("invalid_login");
    await connect().catch(() => {});
    const { error } = await sb.auth.signInWithPassword({ email: pseudoEmail(nick), password, options: { captchaToken: captchaToken || undefined } });
    if (error) throw error;
  }

  async function claimNick(nick) {
    if (!NICK_RE.test(nick)) throw new Error("invalid_nick");
    const { error } = await sb.rpc("claim_nick", { p_nick: nick });
    if (error) throw new Error((error.message || "").match(/nick_\w+|invalid_nick/) ? error.message.match(/nick_\w+|invalid_nick/)[0] : "error");
    st.nick = nick; st.status = "in"; notify();
    await initialSync();
  }

  async function nickAvailable(nick) {
    if (!NICK_RE.test(nick)) return false;
    await connect().catch(() => {});
    const { data } = await sb.rpc("nick_available", { p_nick: nick });
    return !!data;
  }

  // Привязать GitHub/Google к аккаунту (даёт способ восстановить доступ)
  async function linkProvider(provider) {
    if (st.status !== "in") throw new Error("auth");
    rememberBack();
    const { error } = await sb.auth.linkIdentity({ provider, options: { redirectTo: redirectTo() } });
    if (error) throw error;
  }
  function identities() { return ((st.user && st.user.identities) || []).map((i) => i.provider); }
  function isPasswordAccount() { return identities().includes("email"); }

  async function signOut() {
    if (st.status === "in") await pushProgress().catch(() => {});
    if (sb) await sb.auth.signOut().catch(() => {});
    reset();
  }

  async function deleteAccount() {
    const { error } = await sb.rpc("delete_my_account");
    if (error) throw error;
    await sb.auth.signOut().catch(() => {});
    reset();
  }

  async function leaderboard(period) {
    await connect().catch(() => {});
    if (!sb) throw new Error("network");
    const p = period === "week" ? "week" : "all";
    const [lb, me] = await Promise.all([
      sb.rpc("leaderboard", { p_period: p, p_limit: 50 }),
      st.status === "in" ? sb.rpc("my_place", { p_period: p }) : Promise.resolve({ data: null }),
    ]);
    if (lb.error) throw lb.error;
    return { rows: lb.data || [], me: me.data && me.data[0] ? me.data[0] : null };
  }

  /* ---------- Cloudflare Turnstile (если настроен) ---------- */
  let tsP = null;
  function captchaEnabled() { return enabled && !!CFG.turnstileSiteKey; }
  function renderCaptcha(el, onToken) {
    if (!captchaEnabled() || !el) return;
    if (!tsP) tsP = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
    tsP.then(() => window.turnstile.render(el, { sitekey: CFG.turnstileSiteKey, callback: onToken, "expired-callback": () => onToken("") })).catch(() => {});
  }

  function init() {
    if (!enabled) return;
    const fromOAuth = /[?&](code|error)=/.test(location.search);
    if (fromOAuth || hasFlag()) connect().catch(() => {});
  }

  return {
    enabled, state: st, onChange, init, connect,
    signInOAuth, signUpNick, signInNick, claimNick, nickAvailable, linkProvider, identities, isPasswordAccount,
    signOut, deleteAccount, leaderboard, flush, captchaEnabled, renderCaptcha, NICK_RE,
    _mergeState: mergeState,
  };
})();
try { window.Cloud = Cloud; } catch (e) {}
