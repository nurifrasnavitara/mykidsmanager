/* ===========================================================
   dashboard.js
   =========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  App.requireAuth();
  const session = App.getSession();
  if (!session) return;

  document.getElementById("greetingText").textContent = `Halo, ${session.role} 👋`;

  document.getElementById("logoutBtn").addEventListener("click", () => {
    App.clearSession();
    location.href = "login.html";
  });

  // Quick action sheet
  const sheet = document.getElementById("quickSheet");
  const openSheet = () => (sheet.style.display = "block");
  const closeSheetFn = () => (sheet.style.display = "none");
  document.getElementById("quickActionBtn")?.addEventListener("click", e => { e.preventDefault(); openSheet(); });
  document.getElementById("closeSheet")?.addEventListener("click", e => { e.preventDefault(); closeSheetFn(); });
  sheet?.querySelector(".quick-backdrop")?.addEventListener("click", closeSheetFn);

  document.querySelectorAll("[data-soon]").forEach(el => {
    el.addEventListener("click", e => { e.preventDefault(); App.toast("Modul ini akan segera hadir", "🚧"); });
  });

  await renderDashboard();
  App.initPullToRefresh(renderDashboard);
});

async function renderDashboard() {
  const session = App.getSession();
  const familyCard = document.getElementById("familyCard");
  const childrenList = document.getElementById("childrenList");
  const summaryScroll = document.getElementById("summaryScroll");
  const timelineCard = document.getElementById("timelineCard");

  familyCard.innerHTML = App.skeletonRows(1, 90);
  childrenList.innerHTML = App.skeletonRows(2, 140);
  summaryScroll.innerHTML = App.skeletonRows(1, 70);
  timelineCard.innerHTML = App.skeletonRows(3, 44);

  const data = await API.getDashboard();

  familyCard.innerHTML = `
    <div class="flex items-center gap-16">
      <div style="width:56px;height:56px;border-radius:18px;background:var(--gradient);display:flex;align-items:center;justify-content:center;font-size:26px;">👨‍👩‍👧‍👦</div>
      <div style="flex:1;">
        <div class="fw-700" style="font-size:15px;">Keluarga ${escapeHtml(session?.name || "Kita")}</div>
        <div class="text-soft text-sm">${data.children.length} anak · Target bulan ini ${data.children.length > 0 ? "on track" : "-"}</div>
      </div>
    </div>
    <div class="flex gap-12 mt-16">
      <div style="flex:1;">
        <div class="text-soft text-sm">Saldo Seluruh Anak</div>
        <div class="fw-700" style="font-size:16px;">${App.formatRupiah(data.totalBalance)}</div>
      </div>
      <div style="flex:1;">
        <div class="text-soft text-sm">Total Tabungan</div>
        <div class="fw-700" style="font-size:16px;">${App.formatRupiah(data.totalSavings)}</div>
      </div>
    </div>`;

  childrenList.innerHTML = data.children.map(c => {
    const pct = c.savingsTarget ? Math.round((c.savings / c.savingsTarget) * 100) : 0;
    return `
    <div class="card card-hover">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-12">
          <div style="font-size:26px;">${c.emoji}</div>
          <div>
            <div class="fw-700">${escapeHtml(c.name)}</div>
            <div class="text-soft text-sm">Wishlist ${c.wishlistCount}</div>
          </div>
        </div>
        <div class="growth-ring" data-ring="${pct}"></div>
      </div>
      <div class="flex justify-between mt-16">
        <div>
          <div class="text-soft text-sm">Saldo</div>
          <div class="fw-700">${App.formatRupiah(c.balance)}</div>
        </div>
        <div style="text-align:right;">
          <div class="text-soft text-sm">Tabungan</div>
          <div class="fw-700">${App.formatRupiah(c.savings)}</div>
        </div>
      </div>
      <a href="profile.html?child=${c.id}" class="btn btn-outline btn-block btn-sm mt-16 ripple">Lihat Detail</a>
    </div>`;
  }).join("");

  document.querySelectorAll("[data-ring]").forEach(el => {
    App.renderGrowthRing(el, Number(el.dataset.ring));
  });

  const summary = [
    { icon: "💰", label: "Saldo", value: App.formatRupiah(data.totalBalance) },
    { icon: "🎯", label: "Target Tabungan", value: App.formatRupiah(data.totalSavings) },
    { icon: "🛒", label: "Kebutuhan", value: `${data.needsCount} item` },
    { icon: "📅", label: "Jadwal", value: "2 aktif" }
  ];
  summaryScroll.innerHTML = summary.map(s => `
    <div class="stat-pill">
      <div class="stat-icon">${s.icon}</div>
      <div class="stat-label">${s.label}</div>
      <div class="stat-value">${s.value}</div>
    </div>`).join("");

  if (data.timeline.length === 0) {
    timelineCard.innerHTML = `<div class="empty-state"><div class="empty-emoji">🗒️</div><p>Belum ada aktivitas hari ini</p></div>`;
  } else {
    timelineCard.innerHTML = data.timeline.map(t => `
      <div class="timeline-item">
        <div class="timeline-dot">${t.icon}</div>
        <div class="timeline-body">
          <p>${escapeHtml(t.text)}</p>
          <span>${App.formatDate(t.date)}</span>
        </div>
      </div>`).join("");
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
