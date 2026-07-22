/* ===========================================================
   wallet.js
   =========================================================== */

let currentChildId = null;
let currentMode = "topup";

document.addEventListener("DOMContentLoaded", async () => {
  App.requireAuth();
  const children = await API.getChildren();
  const select = document.getElementById("childSelect");
  select.innerHTML = children.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join("");

  const params = new URLSearchParams(location.search);
  const requestedChild = params.get("child");
  currentChildId = requestedChild && children.some(c => c.id === requestedChild) ? requestedChild : children[0]?.id;
  select.value = currentChildId;

  select.addEventListener("change", () => { currentChildId = select.value; loadWallet(); });

  document.getElementById("topupBtn").addEventListener("click", () => openModal("topup"));
  document.getElementById("expenseBtn").addEventListener("click", () => openModal("expense"));
  document.getElementById("modalCancel").addEventListener("click", closeModal);
  document.querySelector("#txModal .modal-backdrop").addEventListener("click", closeModal);

  document.getElementById("txForm").addEventListener("submit", async e => {
    e.preventDefault();
    const amount = document.getElementById("txAmount").value;
    const note = document.getElementById("txNote").value;
    if (!amount || Number(amount) <= 0) { App.toast("Masukkan jumlah yang valid", "⚠️"); return; }

    if (currentMode === "topup") {
      const res = await API.topup(currentChildId, amount, note);
      if (!res.ok) { App.toast(res.message || "Gagal menyimpan top up", "❌"); return; }
    } else {
      const res = await API.expense(currentChildId, amount, note);
      if (!res.ok) { App.toast(res.message || "Gagal menyimpan pengeluaran", "❌"); return; }
    }

    App.toast(currentMode === "topup" ? "Top up berhasil" : "Pengeluaran dicatat", "✅");
    closeModal();
    loadWallet();
  });

  const action = params.get("action");
  if (action === "topup" || action === "expense") openModal(action);

  await loadWallet();
  App.initPullToRefresh(loadWallet);
});

function openModal(mode) {
  currentMode = mode;
  document.getElementById("modalTitle").textContent = mode === "topup" ? "Top Up Saldo" : "Catat Pengeluaran";
  document.getElementById("txForm").reset();
  document.getElementById("txModal").style.display = "block";
}
function closeModal() {
  document.getElementById("txModal").style.display = "none";
}

async function loadWallet() {
  const balanceEl = document.getElementById("balanceValue");
  const txList = document.getElementById("txList");
  txList.innerHTML = App.skeletonRows(4, 52);

  const wallet = await API.getWallet(currentChildId);
  balanceEl.textContent = App.formatRupiah(wallet.balance);

  if (wallet.transactions.length === 0) {
    txList.innerHTML = `<div class="empty-state"><div class="empty-emoji">💸</div><p>Belum ada transaksi</p></div>`;
    return;
  }

  const typeMeta = {
    topup: { icon: "💰", label: "Top Up", cls: "text-success", sign: "+" },
    expense: { icon: "🛒", label: "Pengeluaran", cls: "text-danger", sign: "-" },
    saving: { icon: "🏦", label: "Menabung", cls: "text-soft", sign: "-" }
  };

  txList.innerHTML = wallet.transactions.map(t => {
    const meta = typeMeta[t.type] || typeMeta.expense;
    return `
    <div class="card flex items-center justify-between" style="padding:14px 16px;">
      <div class="flex items-center gap-12">
        <div class="timeline-dot">${meta.icon}</div>
        <div>
          <div class="fw-600 text-sm">${t.note || meta.label}</div>
          <div class="text-soft" style="font-size:11px;">${App.formatDate(t.date)}</div>
        </div>
      </div>
      <div class="flex items-center gap-12">
        <div class="fw-700 ${meta.cls}">${meta.sign}${App.formatRupiah(t.amount)}</div>
        <button class="header-icon-btn ripple" style="width:32px;height:32px;background:rgba(229,57,53,.1);color:var(--danger);" onclick="deleteTx('${t.id}')" aria-label="Hapus"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>
      </div>
    </div>`;
  }).join("");
}

async function deleteTx(id) {
  if (!confirm("Hapus transaksi ini? Saldo akan disesuaikan kembali.")) return;
  await API.deleteTransaction(id);
  App.toast("Transaksi dihapus", "🗑️");
  loadWallet();
}
