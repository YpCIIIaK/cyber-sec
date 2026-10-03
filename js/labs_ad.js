/* ============================================================
   CyberPath — лаборатория: путь к Domain Admin в Active Directory
   (имитация отчёта BloodHound: собрать цепочку привилегий).
   Подключается ПОСЛЕ js/labs.js (Labs.register).
   ============================================================ */
(function () {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const t = (s) => (window.I18N ? I18N.t(s) : s);
  const appwin = (title, icon, body) => `
    <div class="aw">
      <div class="aw-top"><span class="aw-ic">${icon}</span><span class="aw-title">${esc(title)}</span>
        <span class="aw-btns"><i>–</i><i>▢</i><i class="aw-x">✕</i></span></div>
      <div class="aw-body">${body}</div>
    </div>`;

  /* Узлы: [подпись, тип] */
  const N = {
    svc_backup: ["svc_backup@CYBER.LOCAL", "user"],
    ops_backup: ["Backup Operators@CYBER.LOCAL", "group"],
    dc01: ["DC01.corp.local", "host"],
    shares: ["\\\\dc01\\backup$ (ntds.dit)", "data"],
    helpdesk: ["Helpdesk@CYBER.LOCAL", "group"],
    tier1: ["Tier1 Admins@CYBER.LOCAL", "group"],
    gpo_backup: ["GPO-Backup@CYBER.LOCAL", "gpo"],
    fs_admin: ["FS-Admin@CONTOSO.local", "user"],
    domain_admins: ["Domain Admins@CYBER.LOCAL", "target"],
  };
  /* Рёбра: [откуда, куда, подпись, полезное ли] */
  const E = [
    ["svc_backup", "ops_backup", "MemberOf (локальный член на DC01)", 1],
    ["svc_backup", "helpdesk", "MemberOf (Helpdesk)", 0],
    ["ops_backup", "dc01", "MemberOf", 1],
    ["dc01", "shares", "HasSession → чтение резервной копии домена", 1],
    ["ops_backup", "domain_admins", "устаревшее ребро (stale), помечено как неактуальное", 0],
    ["helpdesk", "tier1", "MemberOf", 0],
    ["tier1", "gpo_backup", "Owns", 0],
    ["gpo_backup", "dc01", "GenericAll → SYSTEM на контроллере", 0],
    ["gpo_backup", "domain_admins", "AddMember + SeRestorePrivilege", 0],
    ["fs_admin", "domain_admins", "учётка другого домена (вне леса)", 0],
  ];

  function bhgraph(el, onSolve) {
    el.innerHTML = `
      <p class="lab-hint">${t("Аудит AD: скомпрометирована сервисная учётка svc_backup. Соберите кратчайшую цепочку привилегий до Domain Admin и решите, какое действие выполнить первым.")}</p>
      ${appwin("BloodHound — CYBER.LOCAL", "🕸", `
        <div class="bh-legend">
          <span class="bh-chip user">${t("пользователь")}</span><span class="bh-chip group">${t("группа")}</span>
          <span class="bh-chip host">${t("хост")}</span><span class="bh-chip gpo">${t("GPO")}</span>
          <span class="bh-chip data">${t("данные")}</span><span class="bh-chip target">${t("цель")}</span>
        </div>
        <table class="bh-table">
          <thead><tr><th>${t("Откуда")}</th><th>${t("Связь")}</th><th>${t("Куда")}</th><th></th></tr></thead>
          <tbody id="bh-rows">
            ${E.map((e, i) => `<tr class="bh-row" data-i="${i}">
              <td>${esc(N[e[0]][0])}</td><td class="bh-rel">${esc(e[2])}</td>
              <td>${esc(N[e[1]][0])}</td>
              <td><button class="bh-take" data-i="${i}">${t("Взять в путь")}</button></td></tr>`).join("")}
          </tbody>
        </table>
        <div class="bh-path"><b>${t("Ваш путь:")}</b> <span id="bh-chain">svc_backup</span>
          <span class="bh-count" id="bh-count">(${t("рёбер")}: 0)</span></div>
        <div class="bh-acts" id="bh-acts">
          <button data-a="reset">${t("Сбросить svc_backup и отозвать её билеты")}</button>
          <button data-a="fs">${t("Сбросить FS-Admin (другая сеть)")}</button>
          <button data-a="none">${t("Ничего не сбрасывать — только наблюдать")}</button>
        </div>
        <div class="lab-out" id="bh-out"></div>`)}`;

    const need = [0, 2, 3]; // MemberOf → Backup Operators → DC01 → backup$
    const picked = new Set();
    const chain = el.querySelector("#bh-chain"), cnt = el.querySelector("#bh-count");
    el.querySelector("#bh-rows").addEventListener("click", (ev) => {
      const b = ev.target.closest(".bh-take"); if (!b) return;
      const i = +b.dataset.i;
      if (picked.has(i)) return;
      picked.add(i);
      chain.textContent += " → " + N[E[i][1]][0];
      cnt.textContent = `(${t("рёбер")}: ${picked.size})`;
      b.disabled = true;
    });
    let solved = false;
    el.querySelector("#bh-acts").addEventListener("click", (ev) => {
      const b = ev.target.closest("button[data-a]"); if (!b) return;
      const out = el.querySelector("#bh-out");
      const pathOk = picked.size === need.length && need.every((i) => picked.has(i));
      if (b.dataset.a === "reset" && pathOk) {
        out.className = "lab-out ok";
        out.innerHTML = "✓ " + t("Верно: svc_backup → Backup Operators → DC01 → backup$. Пароль доменного админа менялся на том же контроллере, поэтому скомпрометирована база ntds.dit вместе со всеми хешами домена — это и есть кратчайший путь к Domain Admin. Первый шаг — сбросить svc_backup и отозвать её билеты (krbtgt при компрометации DC).");
        if (!solved) { solved = true; setTimeout(onSolve, 1400); }
      } else if (b.dataset.a === "reset") {
        out.className = "lab-out no";
        out.innerHTML = "✗ " + t("Действие верное, но путь собран неверно. Нужна цепочка: членство в группе на контроллере домена → сессия/доступ к резервным копиям домена. Устаревшие и «другие домены» в путь не идут.");
      } else {
        out.className = "lab-out no";
        out.textContent = t("✗ Недостаточно: пока учётка жива, злоумышленник повторит путь. FS-Admin относится к другому домену и к этому инциденту отношения не имеет.");
      }
    });
  }

  if (window.Labs && Labs.register) Labs.register("bhgraph", bhgraph);
})();