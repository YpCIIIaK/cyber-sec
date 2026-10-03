-- ============================================================
-- CyberPath — схема Supabase (аккаунты, прогресс, рейтинг)
-- Запускать целиком в Supabase → SQL Editor. Скрипт идемпотентен.
-- После него выполните supabase/catalog.sql (каталог заданий).
--
-- Принципы безопасности:
--  * клиент НЕ может писать в таблицы напрямую — только через RPC-функции
--    с проверками (security definer + жёсткий search_path);
--  * XP считает база по каталогу заданий (с подсказками и множителем серии), а не браузер;
--  * лимиты частоты отправки решений (минута / час / сутки);
--  * ник — только латиница/цифры/_ (никаких HTML и омоглифов);
--  * каждый видит только свои строки (RLS), рейтинг — через функцию,
--    отдающую лишь ник и очки.
-- ============================================================

create extension if not exists citext;

-- Домен «служебных» email для входа по нику и паролю.
-- Должен совпадать с pseudoEmailDomain в js/config.js.
-- Зона .invalid зарезервирована (RFC 2606): письма туда физически не уходят,
-- поэтому сброс пароля по email для таких аккаунтов невозможен — это by design.
create or replace function public.cp_pseudo_domain() returns text
language sql immutable as $$ select 'players.cyberpath.invalid' $$;

-- ---------- Таблицы ----------
create table if not exists public.task_catalog (
  task_id   text primary key,
  course_id text not null,
  points    int  not null check (points between 0 and 500)
);

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nick       citext not null unique check (nick ~ '^[A-Za-z0-9_]{3,20}$'),
  hidden     boolean not null default false,   -- скрыт из рейтинга (модерация)
  created_at timestamptz not null default now()
);

create table if not exists public.solves (
  user_id   uuid not null references auth.users(id) on delete cascade,
  task_id   text not null references public.task_catalog(task_id) on delete cascade,
  hints     smallint not null default 0 check (hints between 0 and 10),
  xp        int not null check (xp between 0 and 500),
  solved_at timestamptz not null default now(),
  primary key (user_id, task_id)
);
create index if not exists solves_user_time on public.solves (user_id, solved_at desc);
create index if not exists solves_time on public.solves (solved_at desc);

-- Разовые бонусы (экзамены, боссы, миссии, инструменты, флаги, ежедневный вопрос, недельный ивент).
-- Стоимость задаёт база (bonus_catalog из catalog.sql), а не браузер.
create table if not exists public.bonus_catalog (
  key       text primary key,
  xp        int  not null check (xp between 0 and 500),
  course_id text
);
create table if not exists public.bonuses (
  user_id   uuid not null references auth.users(id) on delete cascade,
  key       text not null check (length(key) <= 64),
  xp        int  not null check (xp between 0 and 500),
  earned_at timestamptz not null default now(),
  primary key (user_id, key)
);
create index if not exists bonuses_time on public.bonuses (earned_at desc);

create table if not exists public.progress (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null check (pg_column_size(data) < 262144),  -- < 256 КБ
  updated_at timestamptz not null default now()
);

-- Зарезервированные ники
create table if not exists public.reserved_nicks (nick citext primary key);
insert into public.reserved_nicks (nick) values
  ('admin'),('administrator'),('root'),('system'),('support'),('moderator'),('mod'),
  ('cyberpath'),('official'),('staff'),('owner'),('security'),('null'),('undefined'),('anonymous')
on conflict do nothing;

-- Настройки публичного профиля. Профиль публичный по умолчанию;
-- anonymous — в рейтинге вместо ника «Анонимный участник».
-- Аватар — только из готового набора (индексы пресета и фона, цвет рамки), без загрузки картинок.
alter table public.profiles add column if not exists is_public   boolean  not null default true;
alter table public.profiles add column if not exists anonymous   boolean  not null default false;
alter table public.profiles add column if not exists av          smallint not null default 0 check (av between 0 and 19);
alter table public.profiles add column if not exists av_bg       smallint not null default 0 check (av_bg between 0 and 7);
alter table public.profiles add column if not exists av_ring     text     not null default 'tier'
  check (av_ring in ('tier','orange','blue','green','purple','pink','mono'));
alter table public.profiles add column if not exists settings_at timestamptz;

-- Автомодерация: запрещённые корни (в нормализованном виде, латиницей).
-- mode = 'sub' — запрещено где угодно в нике; 'exact' — только целым словом (между _ ),
-- чтобы не ловить безобидные слова. Пополнять:  insert into public.banned_words values ('слово','sub');
create table if not exists public.banned_words (
  word text primary key check (word ~ '^[a-z]{2,30}$'),
  mode text not null default 'sub' check (mode in ('sub', 'exact'))
);
insert into public.banned_words (word, mode) values
  ('huy','sub'),('hui','sub'),('xuy','sub'),('xui','sub'),('huj','sub'),('pizd','sub'),('pisd','sub'),
  ('ebal','sub'),('eban','sub'),('ebat','sub'),('yeba','sub'),('ebuch','sub'),('ebl','exact'),('ebla','sub'),
  ('blyad','sub'),('blyat','sub'),('blya','exact'),('suka','exact'),('suki','exact'),('cyka','exact'),
  ('mudak','sub'),('mudil','sub'),('pidor','sub'),('pidar','sub'),('pidr','sub'),('gandon','sub'),
  ('shluh','sub'),('shlyuh','sub'),('zalup','sub'),('dolboeb','sub'),('dolbaeb','sub'),('debil','exact'),
  ('chmo','exact'),('loh','exact'),('lox','exact'),('urod','exact'),('daun','exact'),('manda','exact'),
  ('fuck','sub'),('fuk','exact'),('fck','exact'),('shit','sub'),('bitch','sub'),('cunt','sub'),('dick','exact'),
  ('cock','exact'),('pussy','sub'),('whore','sub'),('slut','sub'),('nigg','sub'),('niga','exact'),('faggot','sub'),
  ('fag','exact'),('retard','sub'),('rape','exact'),('rapist','sub'),('porn','sub'),('sex','exact'),('anal','exact'),
  ('penis','sub'),('vagina','sub'),('hitler','sub'),('nazi','sub'),('heil','exact'),('isis','exact'),
  ('pedo','sub'),('pedik','sub'),('zoofil','sub'),('kill','exact'),('suicide','sub'),('nude','sub'),
  ('hoy','exact'),('phuck','sub'),('phuk','sub'),
  -- выдача себя за администрацию
  ('admin','exact'),('adm','exact'),('moder','exact'),('moderator','exact'),('support','exact'),('official','exact'),
  ('staff','exact'),('owner','exact'),('root','exact'),('system','exact'),('cyberpath','sub')
on conflict do nothing;
delete from public.banned_words where word in ('kkk', 'xxx');

-- Нормализация против обхода фильтра: регистр, цифры/символы-двойники, разделители, повторы.
create or replace function public.cp_norm(t text) returns text
language sql immutable as $$
  select regexp_replace(
           regexp_replace(translate(lower(coalesce(t, '')), '01345789@$!|', 'oieastbgasii'), '[^a-z]', '', 'g'),
           '(.)\1+', '\1', 'g')
$$;

-- Проверка текста: null — всё в порядке, иначе причина ('link' | 'banned').
create or replace function public.cp_text_bad(t text) returns text
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare n text := cp_norm(t); tok text;
begin
  if t ~* '(https?:|www\.|t\.me|discord|telegram|bit\.ly|\.(ru|com|net|org|io|me|gg|xyz|su|рф)(\M|$)|@[a-z0-9_]{3,})' then
    return 'link';
  end if;
  if exists (select 1 from banned_words b where b.mode = 'sub' and position(cp_norm(b.word) in n) > 0) then return 'banned'; end if;
  for tok in select cp_norm(x) from regexp_split_to_table(lower(coalesce(t, '')), '[_\s]+') x loop
    if exists (select 1 from banned_words b where b.mode = 'exact' and cp_norm(b.word) = tok) then return 'banned'; end if;
  end loop;
  if exists (select 1 from banned_words b where b.mode = 'exact' and cp_norm(b.word) = n) then return 'banned'; end if;
  return null;
end $$;

-- ---------- RLS: всё закрыто, читать можно только своё ----------
alter table public.task_catalog   enable row level security;
alter table public.profiles       enable row level security;
alter table public.solves         enable row level security;
alter table public.progress       enable row level security;
alter table public.reserved_nicks enable row level security;
alter table public.bonus_catalog  enable row level security;
alter table public.bonuses        enable row level security;
alter table public.banned_words   enable row level security;

drop policy if exists own_profile_read  on public.profiles;
drop policy if exists own_solves_read   on public.solves;
drop policy if exists own_progress_read on public.progress;
drop policy if exists own_bonuses_read  on public.bonuses;
create policy own_profile_read  on public.profiles for select to authenticated using (id = auth.uid());
create policy own_solves_read   on public.solves   for select to authenticated using (user_id = auth.uid());
create policy own_progress_read on public.progress for select to authenticated using (user_id = auth.uid());
create policy own_bonuses_read  on public.bonuses  for select to authenticated using (user_id = auth.uid());

-- Снимаем стандартные гранты Supabase и выдаём минимум
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant select on public.profiles, public.solves, public.progress, public.bonuses to authenticated;

alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- ---------- Регистрация по нику: профиль создаётся атомарно ----------
-- Любая регистрация через email-провайдер обязана нести ник в метаданных,
-- email вида <ник>@<служебный домен>. Иначе регистрация отклоняется —
-- так через API нельзя наплодить аккаунты на произвольные адреса.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare n text;
begin
  if coalesce(new.raw_app_meta_data->>'provider', 'email') <> 'email' then
    return new;                                   -- GitHub/Google: ник выберут после входа
  end if;
  n := new.raw_user_meta_data->>'nick';
  if n is null or n !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'invalid_nick';
  end if;
  if lower(new.email) <> (lower(n) || '@' || cp_pseudo_domain()) then
    raise exception 'email_signup_disabled';
  end if;
  if exists (select 1 from reserved_nicks r where r.nick = n::citext) then
    raise exception 'nick_reserved';
  end if;
  if cp_text_bad(n) is not null then raise exception 'nick_banned'; end if;
  insert into profiles (id, nick) values (new.id, n);   -- unique → nick_taken
  return new;
exception when unique_violation then
  raise exception 'nick_taken';
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RPC ----------
-- Подробная проверка ника для подсказки в интерфейсе: ok | invalid | taken | reserved | banned
create or replace function public.nick_check(p_nick text) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select case
    when p_nick is null or p_nick !~ '^[A-Za-z0-9_]{3,20}$' then 'invalid'
    when exists (select 1 from reserved_nicks where nick = p_nick::citext) then 'reserved'
    when cp_text_bad(p_nick) is not null then 'banned'
    when exists (select 1 from profiles where nick = p_nick::citext) then 'taken'
    else 'ok' end
$$;

-- Свободен ли ник
create or replace function public.nick_available(p_nick text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select nick_check(p_nick) = 'ok'
$$;

-- Выбрать ник (для входа через GitHub/Google). Ник постоянный.
create or replace function public.claim_nick(p_nick text) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'auth_required'; end if;
  if exists (select 1 from profiles where id = uid) then raise exception 'nick_already_set'; end if;
  if p_nick is null or p_nick !~ '^[A-Za-z0-9_]{3,20}$' then raise exception 'invalid_nick'; end if;
  if exists (select 1 from reserved_nicks where nick = p_nick::citext) then raise exception 'nick_reserved'; end if;
  if cp_text_bad(p_nick) is not null then raise exception 'nick_banned'; end if;
  insert into profiles (id, nick) values (uid, p_nick);
  return p_nick;
exception when unique_violation then
  raise exception 'nick_taken';
end $$;

-- Учебная серия: подряд идущие UTC-сутки (до вчера) с ≥3 решёнными заданиями.
-- Один пропущенный день раз в 7 дней прощается. Совпадает с streakBefore() в js/app.js.
create or replace function public.cp_streak_before(p_uid uuid) returns int
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  today date := (now() at time zone 'utc')::date;
  d date := today - 1; n int := 0; grace date := null;
  cnt jsonb;
begin
  select coalesce(jsonb_object_agg(day::text, c), '{}'::jsonb) into cnt from (
    select (solved_at at time zone 'utc')::date as day, count(*) as c
      from solves where user_id = p_uid and solved_at > now() - interval '800 days' group by 1) q;
  loop
    exit when d < today - 800;
    if coalesce((cnt->>d::text)::int, 0) >= 3 then n := n + 1;
    elsif (grace is null or grace - d >= 7) and coalesce((cnt->>(d - 1)::text)::int, 0) >= 3 then grace := d;
    else exit;
    end if;
    d := d - 1;
  end loop;
  return n;
end $$;

-- Множитель серии в процентах: 3+ дн 105 · 7+ 110 · 14+ 115 · 30+ 120
create or replace function public.cp_streak_pct(p_days int) returns int
language sql immutable as $$
  select case when p_days >= 30 then 120 when p_days >= 14 then 115
              when p_days >= 7 then 110 when p_days >= 3 then 105 else 100 end
$$;

-- Отправка решённых заданий. XP считает база по каталогу.
-- Лимиты: 30 в минуту, 300 в час, 400 в сутки; лишнее возвращается как deferred
-- (клиент отправит позже). Вход: [{ "id": "task_id", "h": подсказок }], до 20 штук.
create or replace function public.submit_solves(items jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  c_min int; c_hour int; c_day int; budget int; c_today int; s_before int; pct int;
  it jsonb; tid text; h int; pts int;
  acc text[] := '{}'; def text[] := '{}'; rej text[] := '{}';
begin
  if uid is null then raise exception 'auth_required'; end if;
  if not exists (select 1 from profiles where id = uid) then raise exception 'no_profile'; end if;
  if items is null or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 20 then
    raise exception 'bad_input';
  end if;
  -- сериализуем запросы одного пользователя, чтобы параллельные вызовы не обходили лимиты
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));

  select count(*) filter (where solved_at > now() - interval '1 minute'),
         count(*) filter (where solved_at > now() - interval '1 hour'),
         count(*)
    into c_min, c_hour, c_day
    from solves where user_id = uid and solved_at > now() - interval '1 day';
  budget := least(30 - c_min, 300 - c_hour, 400 - c_day);
  select count(*) into c_today from solves
   where user_id = uid and solved_at >= ((now() at time zone 'utc')::date)::timestamp at time zone 'utc';
  s_before := cp_streak_before(uid);

  for it in select * from jsonb_array_elements(items) loop
    if jsonb_typeof(it) <> 'object' then continue; end if;
    tid := it->>'id';
    if tid is null or length(tid) > 64 then continue; end if;
    h := case when (it->>'h') ~ '^[0-9]{1,2}$' then least((it->>'h')::int, 10) else 0 end;
    select points into pts from task_catalog where task_id = tid;
    if pts is null then rej := rej || tid; continue; end if;
    if exists (select 1 from solves where user_id = uid and task_id = tid) then
      acc := acc || tid; continue;                 -- уже засчитано (идемпотентно)
    end if;
    if budget <= 0 then def := def || tid; continue; end if;
    -- множитель серии действует с 3-го задания за UTC-сутки
    pct := case when c_today >= 2 then cp_streak_pct(s_before + 1) else 100 end;
    insert into solves (user_id, task_id, hints, xp)
      values (uid, tid, h, round(greatest(1, pts - h * 5) * pct / 100.0)::int)
      on conflict do nothing;
    acc := acc || tid; budget := budget - 1; c_today := c_today + 1;
  end loop;
  return jsonb_build_object('accepted', to_jsonb(acc), 'deferred', to_jsonb(def), 'rejected', to_jsonb(rej));
end $$;

-- Отправка разовых бонусов: ["exam:web", "boss:web", "mission:m_osint", "tool:pk_task",
-- "flag:pcap", "daily:20364", "weekly:w2909"]. XP берётся из bonus_catalog.
-- Проверки: экзамен — только если в базе решены все задания курса; босс — от 3 заданий курса;
-- ежедневный — только за сегодня/вчера (UTC); недельный — только за текущую неделю.
-- Лимиты: 10 в минуту, 40 в сутки. Ответ: accepted / deferred (лимит) / waiting (условие
-- ещё не выполнено) / rejected (неизвестный ключ).
create or replace function public.submit_bonuses(keys jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  c_min int; c_day int; budget int;
  k text; bx int; bcourse text; n int;
  d_today int := ((now() at time zone 'utc')::date - date '1970-01-01');
  wk int;
  acc text[] := '{}'; def text[] := '{}'; wait text[] := '{}'; rej text[] := '{}';
begin
  if uid is null then raise exception 'auth_required'; end if;
  if not exists (select 1 from profiles where id = uid) then raise exception 'no_profile'; end if;
  if keys is null or jsonb_typeof(keys) <> 'array' or jsonb_array_length(keys) > 20 then raise exception 'bad_input'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  wk := floor((d_today + 3) / 7.0)::int;
  select count(*) filter (where earned_at > now() - interval '1 minute'), count(*)
    into c_min, c_day from bonuses where user_id = uid and earned_at > now() - interval '1 day';
  budget := least(10 - c_min, 40 - c_day);

  for k in select value #>> '{}' from jsonb_array_elements(keys) loop
    if k is null or length(k) > 64 then continue; end if;
    if exists (select 1 from bonuses where user_id = uid and key = k) then acc := acc || k; continue; end if;
    bx := null; bcourse := null;
    if k ~ '^daily:[0-9]{1,6}$' then
      if substring(k from 7)::int in (d_today, d_today - 1) then select xp into bx from bonus_catalog where key = 'daily'; end if;
    elsif k ~ '^weekly:w[0-9]{1,6}$' then
      if substring(k from 9)::int = wk then select xp into bx from bonus_catalog where key = 'weekly'; end if;
    elsif k not in ('daily', 'weekly') then
      select xp, course_id into bx, bcourse from bonus_catalog where key = k;
    end if;
    if bx is null then rej := rej || k; continue; end if;
    if k like 'exam:%' then
      select count(*) into n from task_catalog t
       where t.course_id = bcourse and not exists (select 1 from solves s where s.user_id = uid and s.task_id = t.task_id);
      if n > 0 then wait := wait || k; continue; end if;
    elsif k like 'boss:%' then
      select count(*) into n from solves s join task_catalog t using (task_id) where s.user_id = uid and t.course_id = bcourse;
      if n < 3 then wait := wait || k; continue; end if;
    end if;
    if budget <= 0 then def := def || k; continue; end if;
    insert into bonuses (user_id, key, xp) values (uid, k, bx) on conflict do nothing;
    acc := acc || k; budget := budget - 1;
  end loop;
  return jsonb_build_object('accepted', to_jsonb(acc), 'deferred', to_jsonb(def), 'waiting', to_jsonb(wait), 'rejected', to_jsonb(rej));
end $$;

-- Резервная копия локального прогресса (для синхронизации между устройствами).
-- На рейтинг НЕ влияет. Не чаще раза в 5 секунд.
create or replace function public.save_progress(p_data jsonb) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); last timestamptz;
begin
  if uid is null then raise exception 'auth_required'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'bad_input'; end if;
  if pg_column_size(p_data) >= 262144 then raise exception 'too_large'; end if;
  select updated_at into last from progress where user_id = uid;
  if last is not null and last > now() - interval '5 seconds' then return false; end if;
  insert into progress (user_id, data, updated_at) values (uid, p_data, now())
    on conflict (user_id) do update set data = excluded.data, updated_at = now();
  return true;
end $$;

-- Рейтинг: ник (или «аноним»), аватар, очки и число заданий. p_period: 'all' | 'week'
-- Тип результата менялся — пересоздаём функцию.
drop function if exists public.leaderboard(text, int);
create function public.leaderboard(p_period text default 'all', p_limit int default 50)
returns table (place bigint, nick text, xp bigint, solved bigint, is_me boolean,
               anonymous boolean, is_public boolean, av smallint, av_bg smallint, av_ring text)
language sql stable security definer set search_path = public, pg_temp as $$
  with ev as (
    select user_id, xp, solved_at as at, 1 as task from solves
     where p_period = 'all' or solved_at > now() - interval '7 days'
    union all
    select user_id, xp, earned_at, 0 from bonuses
     where p_period = 'all' or earned_at > now() - interval '7 days'
  ), s as (
    select user_id, sum(xp)::bigint as xp, sum(task)::bigint as solved, max(at) as last_at
      from ev group by user_id
  )
  select rank() over (order by s.xp desc) as place,
         case when p.anonymous and p.id is distinct from auth.uid() then null else p.nick::text end,
         s.xp, s.solved,
         coalesce(p.id = auth.uid(), false),
         p.anonymous,
         p.is_public and not p.anonymous,
         case when p.anonymous and p.id is distinct from auth.uid() then 0::smallint else p.av end,
         case when p.anonymous and p.id is distinct from auth.uid() then 6::smallint else p.av_bg end,
         case when p.anonymous and p.id is distinct from auth.uid() then 'mono' else p.av_ring end
    from s join profiles p on p.id = s.user_id
   where not p.hidden
   order by s.xp desc, s.last_at asc
   limit least(greatest(coalesce(p_limit, 50), 1), 100)
$$;

-- Моё место в рейтинге
create or replace function public.my_place(p_period text default 'all')
returns table (place bigint, xp bigint, solved bigint, total bigint)
language sql stable security definer set search_path = public, pg_temp as $$
  with ev as (
    select user_id, xp, 1 as task from solves
     where p_period = 'all' or solved_at > now() - interval '7 days'
    union all
    select user_id, xp, 0 from bonuses
     where p_period = 'all' or earned_at > now() - interval '7 days'
  ), s as (
    select user_id, sum(xp)::bigint as xp, sum(task)::bigint as solved from ev group by user_id
  ), v as (
    select s.*, rank() over (order by s.xp desc) as place
      from s join profiles p on p.id = s.user_id where not p.hidden
  )
  select v.place, v.xp, v.solved, (select count(*) from v)::bigint
    from v where v.user_id = auth.uid()
$$;

-- Настройки профиля: публичность, анонимность в рейтинге, аватар из набора. Не чаще раза в 2 с.
create or replace function public.set_profile_settings(p_public boolean, p_anonymous boolean,
                                                       p_av int, p_av_bg int, p_av_ring text)
returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); last timestamptz;
begin
  if uid is null then raise exception 'auth_required'; end if;
  select settings_at into last from profiles where id = uid;
  if not found then raise exception 'no_profile'; end if;
  if last is not null and last > now() - interval '2 seconds' then return false; end if;
  update profiles set
    is_public   = coalesce(p_public, is_public),
    anonymous   = coalesce(p_anonymous, anonymous),
    av          = case when p_av between 0 and 19 then p_av else av end,
    av_bg       = case when p_av_bg between 0 and 7 then p_av_bg else av_bg end,
    av_ring     = case when p_av_ring in ('tier','orange','blue','green','purple','pink','mono') then p_av_ring else av_ring end,
    settings_at = now()
  where id = uid;
  return true;
end $$;

-- Публичный профиль по нику. Только серверная статистика (её нельзя подделать в браузере).
-- Приватный профиль видит только владелец; скрытый модерацией — не найден.
create or replace function public.public_profile(p_nick text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  p profiles%rowtype; me boolean; res jsonb; today date := (now() at time zone 'utc')::date;
  t_xp bigint; t_n bigint; b_xp bigint; place bigint; c_today int;
begin
  if p_nick is null or p_nick !~ '^[A-Za-z0-9_]{3,20}$' then return jsonb_build_object('found', false); end if;
  select * into p from profiles where nick = p_nick::citext and not hidden;
  if not found then return jsonb_build_object('found', false); end if;
  me := p.id = auth.uid();
  -- анонимный участник: профиль тоже закрыт, иначе его можно вычислить по очкам из рейтинга
  if (not p.is_public or p.anonymous) and not coalesce(me, false) then
    return jsonb_build_object('found', true, 'private', true, 'nick', p.nick::text);
  end if;
  select coalesce(sum(xp), 0), count(*) into t_xp, t_n from solves where user_id = p.id;
  select coalesce(sum(xp), 0) into b_xp from bonuses where user_id = p.id;
  select count(*) into c_today from solves where user_id = p.id and solved_at >= today::timestamp at time zone 'utc';
  if not p.anonymous then
    select r.place into place from (
      select user_id, rank() over (order by x desc) as place from (
        select e.user_id, sum(e.xp) as x from (
          select user_id, xp from solves union all select user_id, xp from bonuses) e
        join profiles q on q.id = e.user_id where not q.hidden group by e.user_id) z) r
     where r.user_id = p.id;
  end if;
  res := jsonb_build_object(
    'found', true, 'private', false, 'me', coalesce(me, false),
    'nick', p.nick::text, 'is_public', p.is_public, 'anonymous', p.anonymous,
    'av', p.av, 'av_bg', p.av_bg, 'av_ring', p.av_ring,
    'joined', p.created_at, 'xp', t_xp + b_xp, 'solved', t_n, 'place', place,
    'streak', cp_streak_before(p.id) + case when c_today >= 3 then 1 else 0 end,
    'courses', coalesce((
      select jsonb_agg(c.course_id order by c.course_id) from (
        select t.course_id from task_catalog t
          left join solves s on s.task_id = t.task_id and s.user_id = p.id
         group by t.course_id having count(*) = count(s.task_id)) c), '[]'::jsonb),
    'course_progress', coalesce((
      select jsonb_object_agg(course_id, pct) from (
        select t.course_id, round(100.0 * count(s.task_id) / count(*))::int as pct from task_catalog t
          left join solves s on s.task_id = t.task_id and s.user_id = p.id
         group by t.course_id) c), '{}'::jsonb),
    'exams',    (select count(*) from bonuses where user_id = p.id and key like 'exam:%'),
    'bosses',   (select count(*) from bonuses where user_id = p.id and key like 'boss:%'),
    'flags',    (select count(*) from bonuses where user_id = p.id and key like 'flag:%'),
    'missions', (select count(*) from bonuses where user_id = p.id and key like 'mission:%'),
    'activity', coalesce((
      select jsonb_object_agg(d, n) from (
        select ((solved_at at time zone 'utc')::date)::text as d, count(*) as n from solves
         where user_id = p.id and solved_at > now() - interval '120 days' group by 1) a), '{}'::jsonb)
  );
  return res;
end $$;

-- Удаление своего аккаунта со всеми данными (каскадом)
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'auth_required'; end if;
  delete from auth.users where id = uid;
end $$;

-- ---------- Права на функции: только то, что нужно ----------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.nick_available(text)        to anon, authenticated;
grant execute on function public.nick_check(text)            to anon, authenticated;
grant execute on function public.public_profile(text)        to anon, authenticated;
grant execute on function public.set_profile_settings(boolean, boolean, int, int, text) to authenticated;
grant execute on function public.leaderboard(text, int)      to anon, authenticated;
grant execute on function public.claim_nick(text)            to authenticated;
grant execute on function public.submit_solves(jsonb)        to authenticated;
grant execute on function public.submit_bonuses(jsonb)       to authenticated;
grant execute on function public.save_progress(jsonb)        to authenticated;
grant execute on function public.my_place(text)              to authenticated;
grant execute on function public.delete_my_account()         to authenticated;

-- ============================================================
-- Модерация (выполнять вручную в SQL Editor):
--   скрыть из рейтинга:  update public.profiles set hidden = true  where nick = 'Nick';
--   вернуть:             update public.profiles set hidden = false where nick = 'Nick';
--   обнулить очки:       delete from public.solves  where user_id = (select id from public.profiles where nick = 'Nick');
--                        delete from public.bonuses where user_id = (select id from public.profiles where nick = 'Nick');
--   самые быстрые за час (кандидаты на проверку):
--     select p.nick, count(*) from public.solves s join public.profiles p on p.id = s.user_id
--      where s.solved_at > now() - interval '1 hour' group by p.nick order by 2 desc limit 20;
-- ============================================================
