/* ===========================================================
   school.js
   =========================================================== */

let currentChildId = null;
let currentFilter = "semua";

const schoolTypeMeta = {
  tugas: { icon: "📝", label: "Tugas / PR" },
  nilai: { icon: "💯", label: "Nilai" },
  jadwal: { icon: "📅", label: "Jadwal / Ujian" },
  pengumuman: { icon: "📢", label: "Pengumuman" }
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
  select.addEventListener("change", () => { currentChildId = select.value; loadSchool(); });

  document.querySelectorAll("#filterChips button").forEach(btn => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      document.querySelectorAll("#filterChips button").forEach(b => b.style.outline = "");
      btn.style.outline = "2px solid var(--accent)";
      loadSchool();
    });
  });

  const openModal = () => {
    document.getElementById("schoolForm").reset();
    document.getElementById("schoolDate").value = new Date().toISOString().slice(0, 10);
    document.getElementById("schoolModal").style.display = "block";
  };
  document.getElementById("addSchoolLink").addEventListener("click", e => { e.preventDefault(); openModal(); });
  document.getElementById("schoolCancel").addEventListener("click", () => document.getElementById("schoolModal").style.display = "none");
  document.querySelector("#schoolModal .modal-backdrop").addEventListener("click", () => document.getElementById("schoolModal").style.display = "none");

  document.getElementById("schoolForm").addEventListener("submit", async e => {
    e.preventDefault();
    const type = document.getElementById("schoolType").value;
    const title = document.getElementById("schoolTitle").value.trim();
    const date = document.getElementById("schoolDate").value || new Date().toISOString();
    const note = document.getElementById("schoolNote").value.trim();
    const res = await API.addSchool(currentChildId, type, title, date, note);
    if (!res.ok) { App.toast(res.message || "Gagal menyimpan catatan sekolah", "❌"); return; }
    App.toast("Catatan sekolah ditambahkan", "📚");
    document.getElementById("schoolModal").style.display = "none";
    loadSchool();
  });

  const action = params.get("action");
  if (action === "add") openModal();

  await loadSchool();
  App.initPullToRefresh(loadSchool);
});

async function loadSchool() {
  const list = document.getElementById("schoolItems");
  list.innerHTML = App.skeletonRows(3, 64);

  let items = await API.getSchool(currentChildId);
  if (currentFilter !== "semua") items = items.filter(s => s.type === currentFilter);

  if (items.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-emoji">📚</div><p>Belum ada catatan sekolah</p></div>`;
    return;
  }

  list.innerHTML = items.map(s => {
    const meta = schoolTypeMeta[s.type] || schoolTypeMeta.tugas;
    return `
    <div class="card flex items-center justify-between">
      <div class="flex items-center gap-12">
        <div class="timeline-dot">${meta.icon}</div>
        <div>
          <div class="fw-700">${escapeHtml(s.title)}</div>
          <div class="text-soft text-sm">${meta.label} · ${App.formatDate(s.date)}</div>
          ${s.note ? `<div class="text-soft text-sm mt-8">${escapeHtml(s.note)}</div>` : ""}
        </div>
      </div>
      <button class="header-icon-btn ripple" style="width:32px;height:32px;background:rgba(229,57,53,.1);color:var(--danger);flex-shrink:0;" onclick="deleteSchoolItem('${s.id}')" aria-label="Hapus"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>
    </div>`;
  }).join("");
}

async function deleteSchoolItem(id) {
  if (!confirm("Hapus catatan sekolah ini?")) return;
  await API.deleteSchool(id);
  App.toast("Catatan dihapus", "🗑️");
  loadSchool();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
