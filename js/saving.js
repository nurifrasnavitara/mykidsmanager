/* ===========================================================
   saving.js
   =========================================================== */

let currentChildId = null;
let activeSavingId = null;

document.addEventListener("DOMContentLoaded", async () => {
  App.requireAuth();
  const children = await API.getChildren();
  const select = document.getElementById("childSelect");
  select.innerHTML = children.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join("");

  const params = new URLSearchParams(location.search);
  const requestedChild = params.get("child");
  currentChildId = requestedChild && children.some(c => c.id === requestedChild) ? requestedChild : children[0]?.id;
  select.value = currentChildId;
  select.addEventListener("change", () => { currentChildId = select.value; loadSaving(); });

  document.getElementById("addTargetLink").addEventListener("click", e => {
    e.preventDefault();
    document.getElementById("targetForm").reset();
    document.getElementById("targetModal").style.display = "block";
  });
  document.getElementById("targetCancel").addEventListener("click", () => document.getElementById("targetModal").style.display = "none");
  document.querySelector("#targetModal .modal-backdrop").addEventListener("click", () => document.getElementById("targetModal").style.display = "none");

  document.getElementById("targetForm").addEventListener("submit", async e => {
    e.preventDefault();
    const title = document.getElementById("targetTitle").value.trim();
    const amount = document.getElementById("targetAmount").value;
    const res = await API.addSavingTarget(currentChildId, title, amount);
    if (!res.ok) { App.toast(res.message || "Gagal menyimpan target", "❌"); return; }
    App.toast("Target tabungan ditambahkan", "🎯");
    document.getElementById("targetModal").style.display = "none";
    loadSaving();
  });

  document.getElementById("saveCancel").addEventListener("click", () => document.getElementById("saveModal").style.display = "none");
  document.querySelector("#saveModal .modal-backdrop").addEventListener("click", () => document.getElementById("saveModal").style.display = "none");

  document.getElementById("saveForm").addEventListener("submit", async e => {
    e.preventDefault();
    const amount = document.getElementById("saveAmount").value;
    const res = await API.addSaving(currentChildId, amount, activeSavingId);
    if (!res.ok) { App.toast(res.message || "Gagal menyimpan tabungan", "❌"); return; }
    App.toast("Tabungan bertambah", "🏦");
    document.getElementById("saveModal").style.display = "none";
    loadSaving();
  });

  const action = params.get("action");
  if (action === "save") document.getElementById("saveModal").style.display = "block";

  await loadSaving();
  App.initPullToRefresh(loadSaving);
});

async function loadSaving() {
  const targetList = document.getElementById("targetList");
  const historyList = document.getElementById("savingHistory");
  targetList.innerHTML = App.skeletonRows(2, 120);
  historyList.innerHTML = App.skeletonRows(2, 52);

  const [targets, tx] = await Promise.all([
    API.getSaving(currentChildId),
    API.getTransactions(currentChildId)
  ]);

  if (targets.length === 0) {
    targetList.innerHTML = `<div class="empty-state"><div class="empty-emoji">🎯</div><p>Belum ada target tabungan</p></div>`;
  } else {
    targetList.innerHTML = targets.map(t => {
      const pct = t.target ? Math.min(100, Math.round((t.current / t.target) * 100)) : 0;
      return `
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <div class="fw-700">${escapeHtml(t.title)}</div>
            <div class="text-soft text-sm">${App.formatRupiah(t.current)} / ${App.formatRupiah(t.target)}</div>
          </div>
          <button class="btn btn-primary btn-sm ripple" onclick="openSaveModal('${t.id}')">+ Nabung</button>
        </div>
        <div class="grow-bar mt-16"><div class="grow-bar__fill" style="width:${pct}%"></div></div>
        <div class="text-soft text-sm mt-8">${pct}% tercapai</div>
      </div>`;
    }).join("");
  }

  const savingTx = tx.filter(t => t.type === "saving");
  if (savingTx.length === 0) {
    historyList.innerHTML = `<div class="empty-state"><div class="empty-emoji">📒</div><p>Belum ada riwayat menabung</p></div>`;
  } else {
    historyList.innerHTML = savingTx.map(t => `
      <div class="card flex items-center justify-between" style="padding:14px 16px;">
        <div class="flex items-center gap-12">
          <div class="timeline-dot">🏦</div>
          <div>
            <div class="fw-600 text-sm">${t.note || "Menabung"}</div>
            <div class="text-soft" style="font-size:11px;">${App.formatDate(t.date)}</div>
          </div>
        </div>
        <div class="fw-700 text-success">+${App.formatRupiah(t.amount)}</div>
      </div>`).join("");
  }
}

function openSaveModal(savingId) {
  activeSavingId = savingId;
  document.getElementById("saveForm").reset();
  document.getElementById("saveModal").style.display = "block";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
