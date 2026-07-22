/* ===========================================================
   profile.js
   =========================================================== */

let currentChildId = null;

document.addEventListener("DOMContentLoaded", async () => {
  App.requireAuth();
  const children = await API.getChildren();
  const select = document.getElementById("childSelect");
  select.innerHTML = children.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join("");

  const params = new URLSearchParams(location.search);
  const requestedChild = params.get("child");
  currentChildId = requestedChild && children.some(c => c.id === requestedChild) ? requestedChild : children[0]?.id;
  select.value = currentChildId;
  select.addEventListener("change", () => { currentChildId = select.value; loadProfile(); });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    App.clearSession();
    location.href = "login.html";
  });

  document.getElementById("noteForm").addEventListener("submit", async e => {
    e.preventDefault();
    const input = document.getElementById("noteInput");
    if (!input.value.trim()) return;
    await API.addNote(currentChildId, input.value.trim());
    App.toast("Catatan disimpan", "📝");
    input.value = "";
  });

  document.getElementById("editProfileBtn").addEventListener("click", openEditModal);
  document.getElementById("editCancel").addEventListener("click", () => document.getElementById("editModal").style.display = "none");
  document.querySelector("#editModal .modal-backdrop").addEventListener("click", () => document.getElementById("editModal").style.display = "none");

  document.getElementById("editForm").addEventListener("submit", async e => {
    e.preventDefault();
    const data = {
      emoji: document.getElementById("editEmoji").value.trim() || "🧒",
      name: document.getElementById("editName").value.trim(),
      dob: document.getElementById("editDob").value,
      school: document.getElementById("editSchool").value.trim(),
      clothingSize: document.getElementById("editClothingSize").value.trim(),
      shoeSize: document.getElementById("editShoeSize").value.trim(),
      bloodType: document.getElementById("editBloodType").value.trim(),
      hobby: document.getElementById("editHobby").value.trim()
    };
    if (!data.name) { App.toast("Nama wajib diisi", "⚠️"); return; }

    const res = await API.updateChild(currentChildId, data);
    if (res.ok) {
      App.toast("Profil anak diperbarui", "✅");
      document.getElementById("editModal").style.display = "none";
      loadProfile();
    } else {
      App.toast(res.message || "Gagal menyimpan perubahan", "❌");
    }
  });

  await loadProfile();
});

async function openEditModal() {
  const c = await API.getChild(currentChildId);
  if (!c) return;
  document.getElementById("editEmoji").value = c.emoji || "";
  document.getElementById("editName").value = c.name || "";
  document.getElementById("editDob").value = c.dob ? String(c.dob).slice(0, 10) : "";
  document.getElementById("editSchool").value = c.school || "";
  document.getElementById("editClothingSize").value = c.clothingSize || "";
  document.getElementById("editShoeSize").value = c.shoeSize || "";
  document.getElementById("editBloodType").value = c.bloodType || "";
  document.getElementById("editHobby").value = c.hobby || "";
  document.getElementById("editModal").style.display = "block";
}

async function loadProfile() {
  const card = document.getElementById("profileCard");
  card.innerHTML = App.skeletonRows(1, 320);

  const c = await API.getChild(currentChildId);
  if (!c) return;

  const age = calcAge(c.dob);

  card.innerHTML = `
    <div class="card card-hover slide-up">
      <div style="text-align:center;">
        <div style="font-size:48px;">${c.emoji}</div>
        <div class="fw-700" style="font-size:18px;margin-top:6px;">${escapeHtml(c.name)}</div>
        <div class="text-soft text-sm">${age} tahun · ${escapeHtml(c.school)}</div>
      </div>

      <div class="mt-16" style="display:flex;justify-content:center;">
        <div id="qrHolder" style="padding:10px;background:#fff;border-radius:14px;"></div>
      </div>
      <div class="text-soft text-sm mt-8" style="text-align:center;">Kode identitas anak — pindai untuk verifikasi cepat</div>

      <div class="mt-24" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        ${dataRow("Tanggal Lahir", formatDob(c.dob))}
        ${dataRow("Sekolah", c.school)}
        ${dataRow("Ukuran Baju", c.clothingSize)}
        ${dataRow("Ukuran Sepatu", c.shoeSize)}
        ${dataRow("Golongan Darah", c.bloodType)}
        ${dataRow("Hobi", c.hobby)}
      </div>
    </div>`;

  const qrHolder = document.getElementById("qrHolder");
  qrHolder.innerHTML = "";
  if (window.QRCode) {
    new QRCode(qrHolder, {
      text: `MKM:CHILD:${c.id}:${c.name}`,
      width: 120, height: 120,
      colorDark: "#263238", colorLight: "#ffffff"
    });
  }
}

function dataRow(label, value) {
  return `<div>
    <div class="text-soft" style="font-size:11px;">${label}</div>
    <div class="fw-600 text-sm mt-8" style="margin-top:2px;">${escapeHtml(value ?? "-")}</div>
  </div>`;
}

function calcAge(dob) {
  const d = new Date(dob);
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function formatDob(dob) {
  return new Date(dob).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
