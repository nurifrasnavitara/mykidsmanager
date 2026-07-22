/* ===========================================================
   health.js
   =========================================================== */

let currentChildId = null;
let currentFilter = "semua";

const healthTypeMeta = {
  imunisasi: { icon: "💉", label: "Imunisasi" },
  checkup: { icon: "🩺", label: "Checkup / Kontrol" },
  sakit: { icon: "🤒", label: "Sakit" },
  obat: { icon: "💊", label: "Obat" }
};

document.addEventListener("DOMContentLoaded", async () => {
  App.requireAuth();
  const children = await API.getChildren();
  const select = document.getElementById("childSelect");
  select.innerHTML = children.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join("");

  const params = new URLSearchParams(location.search);
  const requestedChild = params.get("child");
  currentChildId = requestedChild && children.some(c => c.id === requestedChild) ? requestedChild : children[0]?.id;
  select.value = currentChildId;
  select.addEventListener("change", () => { currentChildId = select.value; loadHealth(); });

  document.querySelectorAll("#filterChips button").forEach(btn => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      document.querySelectorAll("#filterChips button").forEach(b => b.style.outline = "");
      btn.style.outline = "2px solid var(--accent)";
      loadHealth();
    });
  });

  const openModal = () => {
    document.getElementById("healthForm").reset();
    document.getElementById("healthDate").value = new Date().toISOString().slice(0, 10);
    document.getElementById("healthModal").style.display = "block";
  };
  document.getElementById("addHealthLink").addEventListener("click", e => { e.preventDefault(); openModal(); });
  document.getElementById("healthCancel").addEventListener("click", () => document.getElementById("healthModal").style.display = "none");
  document.querySelector("#healthModal .modal-backdrop").addEventListener("click", () => document.getElementById("healthModal").style.display = "none");

  document.getElementById("healthForm").addEventListener("submit", async e => {
    e.preventDefault();
    const type = document.getElementById("healthType").value;
    const title = document.getElementById("healthTitle").value.trim();
    const date = document.getElementById("healthDate").value || new Date().toISOString();
    const note = document.getElementById("healthNote").value.trim();
    const res = await API.addHealth(currentChildId, type, title, date, note);
    if (!res.ok) { App.toast(res.message || "Gagal menyimpan catatan kesehatan", "❌"); return; }
    App.toast("Catatan kesehatan ditambahkan", "❤️");
    document.getElementById("healthModal").style.display = "none";
    loadHealth();
  });

  const action = params.get("action");
  if (action === "add") openModal();

  await loadHealth();
  App.initPullToRefresh(loadHealth);
});

async function loadHealth() {
  const list = document.getElementById("healthItems");
  list.innerHTML = App.skeletonRows(3, 64);

  let items = await API.getHealth(currentChildId);
  if (currentFilter !== "semua") items = items.filter(h => h.type === currentFilter);

  if (items.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-emoji">❤️</div><p>Belum ada catatan kesehatan</p></div>`;
    return;
  }

  list.innerHTML = items.map(h => {
    const meta = healthTypeMeta[h.type] || healthTypeMeta.checkup;
    return `
    <div class="card flex items-center justify-between">
      <div class="flex items-center gap-12">
        <div class="timeline-dot">${meta.icon}</div>
        <div>
          <div class="fw-700">${escapeHtml(h.title)}</div>
          <div class="text-soft text-sm">${meta.label} · ${App.formatDate(h.date)}</div>
          ${h.note ? `<div class="text-soft text-sm mt-8">${escapeHtml(h.note)}</div>` : ""}
        </div>
      </div>
      <button class="header-icon-btn ripple" style="width:32px;height:32px;background:rgba(229,57,53,.1);color:var(--danger);flex-shrink:0;" onclick="deleteHealthItem('${h.id}')" aria-label="Hapus"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>
    </div>`;
  }).join("");
}

async function deleteHealthItem(id) {
  if (!confirm("Hapus catatan kesehatan ini?")) return;
  await API.deleteHealth(id);
  App.toast("Catatan dihapus", "🗑️");
  loadHealth();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
