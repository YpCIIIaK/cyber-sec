# Запуск CyberPath: GitHub Pages + Supabase

Сайт статический и работает без сервера. Supabase нужен только для аккаунтов, рейтинга
и синхронизации. Пока `js/config.js` пуст, сайт работает полностью локально.

## 1. GitHub Pages

1. Слейте рабочую ветку в `main`.
2. Откройте **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Каждый пуш в `main` запускает `.github/workflows/pages.yml`: проверки контента, проверку
   каталога и конфига, затем публикацию. В `_site` попадают только файлы сайта: `tests/`,
   `supabase/` и `docs/` не публикуются.
4. Адрес сайта: `https://<user>.github.io/<repo>/`. Если он отличается от
   `https://ypciiiak.github.io/cyber-sec/`, замените адрес в `index.html` (`canonical`, `og:*`, `twitter:*`).
5. **Settings → Pages → Enforce HTTPS** — включено.

## 2. Supabase: база

1. Создайте проект на supabase.com (регион ближе к аудитории).
2. **SQL Editor** → выполните целиком `supabase/schema.sql`, затем `supabase/catalog.sql`.
3. После любого изменения курсов: `node tests/gen-catalog.cjs` и снова выполните `catalog.sql`
   (CI не даст опубликовать сайт с устаревшим каталогом).

## 3. Supabase: авторизация (Authentication)

| Настройка | Значение | Зачем |
|---|---|---|
| **URL Configuration → Site URL** | `https://<user>.github.io/<repo>/` | куда возвращать после входа |
| **URL Configuration → Redirect URLs** | только адрес сайта (без `*`) | чтобы токены нельзя было увести на чужой домен |
| **Providers → Email**: Enable | вкл | вход по нику и паролю |
| **Providers → Email → Confirm email** | **выкл** | служебные адреса `@players.cyberpath.invalid` не получают писем |
| **Providers → Email → Secure password change** | вкл | |
| **Providers → Email → Minimum password length** | 8 | |
| **Providers → GitHub** | вкл, Client ID/Secret из GitHub OAuth App | Callback URL берётся со страницы провайдера в Supabase |
| **Providers → Google** | вкл, Client ID/Secret из Google Cloud | то же |
| **Sign In / Providers → Allow manual linking** | **вкл** | привязка GitHub/Google к аккаунту с паролем (восстановление доступа) |
| **Rate Limits** | sign-ups ≤ 30/час, sign-ins ≤ 30/5 мин с одного IP | защита от перебора |
| **Attack Protection → Bot protection (CAPTCHA)** | рекомендуется: Cloudflare Turnstile | защита регистрации от ботов. Тот же site key — в `turnstileSiteKey` |

> Почему регистрация по email без подтверждения безопасна: триггер `handle_new_user` пропускает
> только адреса вида `<ник>@players.cyberpath.invalid` с совпадающим ником. Регистрация на любые
> другие адреса через API отклоняется базой.

## 4. Подключение сайта

В `js/config.js`:

```js
supabaseUrl: "https://<ref>.supabase.co",
supabaseAnonKey: "<anon public key>",   // Project Settings → API → anon public / publishable
turnstileSiteKey: "",                    // если включили CAPTCHA
```

⚠️ **Никогда не вставляйте `service_role` / `sb_secret_…`.** CI (`tests/check-config.cjs`)
откажется публиковать сайт с таким ключом.

## 5. Что защищено и как

- **Таблицы закрыты** для прямой записи. Всё идёт через RPC-функции с проверками.
  Читать можно только свои строки (RLS).
- **XP рейтинга считает база** по каталогу заданий: стоимость − 5×подсказки, × множитель серии.
  Браузер передаёт только id задания и число подсказок (оно может только уменьшить очки).
- **Лимиты**: 12 заданий в минуту, 120 в час, 300 в сутки. Лишние откладываются и досылаются позже.
- **Ник**: 3–20 символов `A–Z a–z 0–9 _`, уникален без учёта регистра, есть список зарезервированных.
  HTML и похожие буквы из других алфавитов в ник не пройдут.
- **Рейтинг** отдаёт только ник, очки и число заданий.
- **Удаление аккаунта** стирает профиль, решения и облачную копию прогресса (каскадом).
- **Сайт**: CSP (скрипты только свои, сеть только к своему домену и `*.supabase.co`), защита
  от встраивания во фрейм, supabase-js лежит в репозитории (без стороннего CDN), Service Worker
  не кэширует запросы к API.

### Ограничение, о котором надо помнить
Ответы на задания проверяются в браузере. Технически подкованный человек может найти их в коде
и отправлять решения без реального прохождения. Лимиты делают это медленным (не быстрее честного
прохождения), а модерация позволяет скрыть нарушителя. Полностью исключить это можно только
проверкой ответов на сервере.

## 6. Модерация

В SQL Editor (готовые запросы — в конце `schema.sql`):

```sql
update public.profiles set hidden = true where nick = 'Nick';      -- скрыть из рейтинга
delete from public.solves where user_id = (select id from public.profiles where nick = 'Nick');  -- обнулить
```

## 7. Бесплатный тариф Supabase

Проект на бесплатном тарифе засыпает после 7 дней без активности. Сайт продолжит работать
локально, а рейтинг и вход будут недоступны, пока проект не разбудят в панели.
Актуальные лимиты смотрите на supabase.com/pricing.
