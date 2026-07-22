/* ===========================================================
   needs.js
   =========================================================== */

let currentChildId = null;
let currentCategory = "semua";
let searchTerm = "";
let currentPage = 1;
const PAGE_SIZE = 5;

const categories = [
  { id: "semua", icon: "🗂️", label: "Semua" },
  { id: "pakaian", icon: "👕", label: "Pakaian" },
  { id: "sepatu", icon: "👟", label: "Sepatu" },
  { id: "sekolah", icon: "📚", label: "Sekolah" },
  { id: "kesehatan", icon: "💊", label: "Kesehatan" },
  { id: "makanan", icon: "🍔", label: "Makanan" }
];

const statusMeta = {
  pending: { label: "Pending", cls: "badge-warning" },
  dibeli: { label: "Dibeli", cls: "badge-neutral" },
  selesai: { label: "Selesai", cls: "badge-success" }
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
  select.addEventListener("change", () => { currentChildId = select.value; currentPage = 1; loadNeeds(); });

  document.getElementById("categoryGrid").innerHTML = categories.map(c => `
    <button class="category-chip ${c.id === currentCategory ? "active" : ""}" data-cat="${c.id}">
      <span class="category-chip-icon">${c.icon}</span>${c.label}
    </button>`).join("");
  document.querySelectorAll("[data-cat]").forEach(btn => {
    btn.addEventListener("click", () => {
      currentCategory = btn.dataset.cat;
      currentPage = 1;
      document.querySelectorAll("[data-cat]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadNeeds();
    });
  });

  document.getElementById("searchInput").addEventListener("input", e => {
    searchTerm = e.target.value.toLowerCase();
    currentPage = 1;
    loadNeeds();
  });

  const openModal = () => { document.getElementById("needForm").reset(); document.getElementById("needModal").style.display = "block"; };
  document.getElementById("addNeedLink").addEventListener("click", e => { e.preventDefault(); openModal(); });
  document.getElementById("fabAdd").addEventListener("click", e => { e.preventDefault(); openModal(); });
  document.getElementById("needCancel").addEventListener("click", () => document.getElementById("needModal").style.display = "none");
  document.querySelector("#needModal .modal-backdrop").addEventListener("click", () => document.getElementById("needModal").style.display = "none");

  document.getElementById("needForm").addEventListener("submit", async e => {
    e.preventDefault();
    const category = document.getElementById("needCategory").value;
    const icons = { pakaian: "👕", sepatu: "👟", sekolah: "📚", kesehatan: "💊", makanan: "🍔", mainan: "🧸" };
    const item = document.getElementById("needItem").value.trim();
    const price = document.getElementById("needPrice").value;
    const res = await API.addNeed(currentChildId, category, icons[category], item, price);
    if (!res.ok) { App.toast(res.message || "Gagal menyimpan kebutuhan", "❌"); return; }
    App.toast("Kebutuhan ditambahkan", "🛒");
    document.getElementById("needModal").style.display = "none";
    loadNeeds();
  });

  const action = params.get("action");
  if (action === "add") openModal();

  await loadNeeds();
  App.initPullToRefresh(loadNeeds);
});

async function loadNeeds() {
  const list = document.getElementById("needsItems");
  list.innerHTML = App.skeletonRows(3, 70);

  let items = await API.getNeeds(currentChildId);
  if (currentCategory !== "semua") items = items.filter(n => n.category === currentCategory);
  if (searchTerm) items = items.filter(n => n.item.toLowerCase().includes(searchTerm));

  if (items.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-emoji">🔍</div><p>Tidak ada kebutuhan yang cocok</p></div>`;
    return;
  }

  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  currentPage = Math.min(currentPage, totalPages);
  const pageItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const rows = pageItems.map(n => {
    const meta = statusMeta[n.status] || statusMeta.pending;
    return `
    <div class="card flex items-center justify-between">
      <div class="flex items-center gap-12">
        <div class="timeline-dot">${n.icon}</div>
        <div>
          <div class="fw-700">${escapeHtml(n.item)}</div>
          <div class="text-soft text-sm">${App.formatRupiah(n.price)}</div>
        </div>
      </div>
      <div class="flex items-center gap-8" style="flex-direction:column;">
        <select class="btn-sm" style="border:1px solid var(--secondary);border-radius:10px;padding:6px 8px;" onchange="updateNeedStatus('${n.id}', this.value)">
          <option value="pending" ${n.status === "pending" ? "selected" : ""}>Pending</option>
          <option value="dibeli" ${n.status === "dibeli" ? "selected" : ""}>Dibeli</option>
          <option value="selesai" ${n.status === "selesai" ? "selected" : ""}>Selesai</option>
        </select>
        <button class="header-icon-btn ripple" style="width:28px;height:28px;background:rgba(229,57,53,.1);color:var(--danger);" onclick="deleteNeedItem('${n.id}')" aria-label="Hapus"><i class="fa-solid fa-trash" style="font-size:11px;"></i></button>
      </div>
    </div>`;
  }).join("");

  let pagination = "";
  if (totalPages > 1) {
    pagination = `<div class="flex items-center justify-between mt-16">
      <button class="btn btn-outline btn-sm ripple" ${currentPage === 1 ? "disabled" : ""} onclick="changePage(-1)">Sebelumnya</button>
      <span class="text-soft text-sm">Hal ${currentPage} / ${totalPages}</span>
      <button class="btn btn-outline btn-sm ripple" ${currentPage === totalPages ? "disabled" : ""} onclick="changePage(1)">Berikutnya</button>
    </div>`;
  }

  list.innerHTML = rows + pagination;
}

function changePage(dir) {
  currentPage += dir;
  loadNeeds();
}

async function updateNeedStatus(id, status) {
  await API.updateNeedStatus(id, status);
  App.toast("Status diperbarui", "✅");
  loadNeeds();
}

async function deleteNeedItem(id) {
  if (!confirm("Hapus kebutuhan ini?")) return;
  await API.deleteNeed(id);
  App.toast("Kebutuhan dihapus", "🗑️");
  loadNeeds();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
