/* ============================================================
   CyberPath — лаборатории: OSINT с соблюдением границ
   и базовая проверка подозрительного письма.
   Подключается ПОСЛЕ js/labs.js (Labs.register).
   ============================================================ */
(function () {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const t = (s) => (window.I18N ? I18N.t(s) : s);

  /* ------------------------------------------------------------
     1. OSINT: где проходит граница открытых данных
     ------------------------------------------------------------ */
  const OSINT = [
    { id: "whois", ok: 1, act: t("Проверить whois домена и историю регистрации"), why: t("Публичные регистрационные данные: легально и не оставляет следа.") },
    { id: "dork", ok: 1, act: t("Найти открытые листинги: site:corp.ru filetype:xlsx"), why: t("Поисковая выдача — публичный источник, цель ничего не замечает.") },
    { id: "exif", ok: 1, act: t("Снять EXIF с фотографии из открытого профиля"), why: t("Метаданные уже опубликованы вместе с файлом — это и есть OSINT.") },
    { id: "hibp", ok: 1, act: t("Проверить свой email по базам утечек (HIBP)"), why: t("Свой адрес — законно и полезно; чужие адреса проверять нельзя.") },
    { id: "hackmail", ok: 0, act: t("Перебирать логины, чтобы узнать, есть ли у человека почта на сервисе"), why: t("Перебор учётных записей — активная атака на доступ, это уже не OSINT.") },
    { id: "portscan", ok: 0, act: t("Просканировать порты сервера, найденного в вакансии"), why: t("Активное сканирование чужой системы требует разрешения.") },
    { id: "photos", ok: 0, act: t("Следить за маршрутом сотрудника"), why: t("Скрытое наблюдение нарушает приватность — это слежка, а не разведка по открытым источникам.") },
  ];

  function domainenum(el, onSolve) {
    const need = OSINT.filter((o) => o.ok).map((o) => o.id);
    el.innerHTML = `
      <p class="lab-hint">${t("Вам поручили собрать открытую информацию о компании для отчёта. Отметьте действия, которые остаются в рамках OSINT.")}</p>
      <div class="net-finds" id="os-picks">
        ${OSINT.map((o) => `<label class="net-row" data-id="${o.id}"><input type="checkbox"><span>${esc(o.act)}</span></label>`).join("")}
      </div>
      <button class="btn btn-primary btn-sm" id="os-go">${t("Отправить план разведки")}</button>
      <div class="lab-out" id="os-out"></div>`;

    const sel = new Set();
    el.querySelectorAll("#os-picks .net-row").forEach((row) => {
      const cb = row.querySelector("input");
      row.addEventListener("click", () => {
        const id = row.dataset.id;
        if (sel.has(id)) { sel.delete(id); cb.checked = false; row.classList.remove("sel"); }
        else { sel.add(id); cb.checked = true; row.classList.add("sel"); }
      });
    });
    let solved = false;
    el.querySelector("#os-go").addEventListener("click", () => {
      const out = el.querySelector("#os-out");
      const okAll = sel.size === need.length && need.every((i) => sel.has(i));
      if (okAll) {
        out.className = "lab-out ok";
        out.innerHTML = "✓ " + t("Верно: OSINT работает только с опубликованными данными. Перебор учётных записей, сканирование портов и слежка за сотрудником — активные действия или нарушение приватности: они требуют разрешения либо запрещены.");
        if (!solved) { solved = true; setTimeout(onSolve, 1300); }
      } else {
        out.className = "lab-out no";
        out.innerHTML = "✗ " + t("Граница простая: OSINT — то, что владелец сам опубликовал, без технического воздействия. Спросите себя: «я что-то делаю с чужой системой или только читаю открытое?»") +
          `<ul class="tri-why">${OSINT.filter((o) => !o.ok && sel.has(o.id)).map((o) => `<li>${o.why}</li>`).join("")}</ul>`;
      }
    });
  }

  /* ------------------------------------------------------------
     2. Базовая проверка письма: маркеры до разбора заголовков
     ------------------------------------------------------------ */
  const MAIL = [
    { id: "domain", ok: 1, why: t("Домен отправителя support@secure-portal[.]ru не совпадает с брендом получателя — письмо из чужого домена.") },
    { id: "urgent", ok: 1, why: t("Давление и угроза: «в течение 24 часов счёт будет заблокирован» — лишает времени на проверку.") },
    { id: "creds", ok: 1, why: t("Просьба войти по ссылке и подтвердить данные карты — фишинговая форма забирает учётные данные.") },
    { id: "greet", ok: 0, why: t("Обращение по имени — признак персонализации, но не доказательство вредоносности.") },
    { id: "logo", ok: 0, why: t("Логотип в письме ничего не значит: его копируют за секунду.") },
  ];

  function mailbasics(el, onSolve) {
    const need = MAIL.filter((m) => m.ok).map((m) => m.id);
    el.innerHTML = `
      <p class="lab-hint">${t("Перед вами письмо «от банка». Разбор заголовков будет на следующем занятии — пока отметьте маркеры, которые видны без инструментов.")}</p>
      <div class="mail-card">
        <div class="mail-head"><b>${t("От")}:</b> support@secure-portal[.]ru &nbsp; ${t("→")} &nbsp; <b>${t("Кому")}:</b> you@home.example</div>
        <div class="mail-body">
          <p>${t("Уважаемый клиент!")}</p>
          <p>${t("Ваш счёт заблокирован из-за подозрительной активности. В течение 24 часов доступ будет закрыт.")}</p>
          <p>${t("Подтвердите данные карты:")} <span class="mail-link">https://secure-portal.ru/verify</span></p>
        </div>
      </div>
      <h4 class="net-h">${t("Красные флаги")}</h4>
      <div class="net-finds" id="mb-picks">
        ${MAIL.map((m) => `<label class="net-row" data-id="${m.id}"><input type="checkbox"><span>${esc(m.why)}</span></label>`).join("")}
      </div>
      <button class="btn btn-primary btn-sm" id="mb-go">${t("Отправить в антифишинг")}</button>
      <div class="lab-out" id="mb-out"></div>`;

    const sel = new Set();
    el.querySelectorAll("#mb-picks .net-row").forEach((row) => {
      const cb = row.querySelector("input");
      row.addEventListener("click", () => {
        const id = row.dataset.id;
        if (sel.has(id)) { sel.delete(id); cb.checked = false; row.classList.remove("sel"); }
        else { sel.add(id); cb.checked = true; row.classList.add("sel"); }
      });
    });
    let solved = false;
    el.querySelector("#mb-go").addEventListener("click", () => {
      const out = el.querySelector("#mb-out");
      const okAll = sel.size === need.length && need.every((i) => sel.has(i));
      if (okAll) {
        out.className = "lab-out ok";
        out.innerHTML = "✓ " + t("Верно: три маркера — чужой домен, давление сроком и просьба подтвердить данные по ссылке. Обращение по имени и картинка ничего не доказывают: их легко подделать.");
        if (!solved) { solved = true; setTimeout(onSolve, 1300); }
      } else {
        out.className = "lab-out no";
        out.innerHTML = "✗ " + t("Смотрите на домен, тон письма и требуемые действия. И проверьте, что не является признаком: вежливость и оформление ничего не доказывают.") +
          `<ul class="tri-why">${MAIL.filter((m) => m.ok && !sel.has(m.id)).map((m) => `<li>${m.why}</li>`).join("")}</ul>`;
      }
    });
  }

  if (window.Labs && Labs.register) {
    Labs.register("domainenum", domainenum);
    Labs.register("mailbasics", mailbasics);
  }
})();