/* CyberPath — публичная конфигурация облачных функций (аккаунты и рейтинг).
   Эти значения НЕ секретны: anon-ключ Supabase предназначен для браузера,
   доступ к данным ограничивают правила RLS и RPC-функции в supabase/schema.sql.
   НИКОГДА не вставляйте сюда service_role-ключ.
   Пока supabaseUrl пуст — сайт работает полностью локально, без аккаунтов. */
window.CYBERPATH_CONFIG = Object.freeze({
  supabaseUrl: "https://rdjuahwwmqjtauwedxjh.supabase.co",          // https://<project-ref>.supabase.co
  supabaseAnonKey: "sb_publishable_NJ0u4MMfMaZniSWUz75k6A_WoVo_jRR",      // Project Settings → API → anon public
  // Домен служебных email для входа по нику; должен совпадать с cp_pseudo_domain() в schema.sql
  pseudoEmailDomain: "players.cyberpath.invalid",
  // Необязательно: Cloudflare Turnstile (защита регистрации от ботов). Включите и в Supabase → Auth → Bot protection
  turnstileSiteKey: "0x4AAAAAAFMrOC5m55vb6ibM",
});
