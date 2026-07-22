/* ===========================================================
   wishlist.js
   =========================================================== */

let currentChildId = null;
let currentFilter = "semua";

const statusMeta = {
  belum: { label: "Belum", cls: "badge-warning" },
  disetujui: { label: "Disetujui", cls: "badge-neutral" },
  sudah: { label: "Sudah dibeli", cls: "badge-success" }
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
  select.addEventListener("change", () => { currentChildId = select.value; loadWishlist(); });

  document.querySelectorAll("#filterChips button").forEach(btn => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      document.querySelectorAll("#filterChips button").forEach(b => b.style.outline = "");
      btn.style.outline = "2px solid var(--accent)";
      loadWishlist();
    });
  });

  document.getElementById("addWishLink").addEventListener("click", e => {
    e.preventDefault();
    document.getElementById("wishForm").reset();
    document.getElementById("wishModal").style.display = "block";
  });
  document.getElementById("wishCancel").addEventListener("click", () => document.getElementById("wishModal").style.display = "none");
  document.querySelector("#wishModal .modal-backdrop").addEventListener("click", () => document.getElementById("wishModal").style.display = "none");

  document.getElementById("wishForm").addEventListener("submit", async e => {
    e.preventDefault();
    const item = document.getElementById("wishItem").value.trim();
    const price = document.getElementById("wishPrice").value;
    const res = await API.addWishlist(currentChildId, item, price);
    if (!res.ok) { App.toast(res.message || "Gagal menyimpan wishlist", "❌"); return; }
    App.toast("Wishlist ditambahkan", "🎁");
    document.getElementById("wishModal").style.display = "none";
    loadWishlist();
  });

  const action = params.get("action");
  if (action === "add") document.getElementById("wishModal").style.display = "block";

  await loadWishlist();
  App.initPullToRefresh(loadWishlist);
});

async function loadWishlist() {
  const list = document.getElementById("wishlistItems");
  list.innerHTML = App.skeletonRows(3, 70);

  let items = await API.getWishlist(currentChildId);
  if (currentFilter !== "semua") items = items.filter(w => w.status === currentFilter);

  if (items.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-emoji">🎁</div><p>Belum ada wishlist di kategori ini</p></div>`;
    return;
  }

  list.innerHTML = items.map(w => {
    const meta = statusMeta[w.status] || statusMeta.belum;
    return `
    <div class="card flex items-center justify-between">
      <div>
        <div class="fw-700">${escapeHtml(w.item)}</div>
        <div class="text-soft text-sm">${App.formatRupiah(w.price)}</div>
        <span class="badge ${meta.cls} mt-8" style="display:inline-block;">${meta.label}</span>
      </div>
      <div class="flex items-center gap-8" style="flex-direction:column;">
        <select class="btn-sm" style="border:1px solid var(--secondary);border-radius:10px;padding:6px 8px;" onchange="updateStatus('${w.id}', this.value)">
          <option value="belum" ${w.status === "belum" ? "selected" : ""}>Belum</option>
          <option value="disetujui" ${w.status === "disetujui" ? "selected" : ""}>Disetujui</option>
          <option value="sudah" ${w.status === "sudah" ? "selected" : ""}>Sudah dibeli</option>
        </select>
        <button class="header-icon-btn ripple" style="width:28px;height:28px;background:rgba(229,57,53,.1);color:var(--danger);" onclick="deleteWish('${w.id}')" aria-label="Hapus"><i class="fa-solid fa-trash" style="font-size:11px;"></i></button>
      </div>
    </div>`;
  }).join("");
}

async function deleteWish(id) {
  if (!confirm("Hapus item wishlist ini?")) return;
  await API.deleteWishlist(id);
  App.toast("Wishlist dihapus", "🗑️");
  loadWishlist();
}

async function updateStatus(id, status) {
  await API.updateWishlistStatus(id, status);
  App.toast("Status diperbarui", "✅");
  loadWishlist();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
