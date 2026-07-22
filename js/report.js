/* ===========================================================
   report.js
   =========================================================== */

let currentChildId = null;
let currentChildName = "";
let charts = {};

document.addEventListener("DOMContentLoaded", async () => {
  App.requireAuth();
  const children = await API.getChildren();
  const select = document.getElementById("childSelect");
  select.innerHTML = `<option value="all">👨‍👩‍👧 Semua Anak</option>` +
    children.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join("");
  currentChildId = "all";
  select.addEventListener("change", () => { currentChildId = select.value; currentChildName = select.selectedOptions[0].textContent; loadReport(); });

  document.getElementById("exportPdfBtn").addEventListener("click", exportPdf);
  document.getElementById("exportExcelBtn").addEventListener("click", exportExcel);

  await loadReport();
  App.initPullToRefresh(loadReport);
});

async function loadReport() {
  const childId = currentChildId === "all" ? undefined : currentChildId;
  const [tx, savings, needs, timeline] = await Promise.all([
    API.getTransactions(childId),
    API.getSaving(childId),
    API.getNeeds(childId),
    API.getTimeline()
  ]);

  renderExpenseChart(tx);
  renderSavingChart(savings, tx);
  renderCategoryChart(needs);
  renderTimeline(timeline);
}

function monthLabels() {
  const labels = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleDateString("id-ID", { month: "short" }));
  }
  return labels;
}

function renderExpenseChart(tx) {
  const labels = monthLabels();
  const now = new Date();
  const data = labels.map((_, i) => {
    const target = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return tx.filter(t => t.type === "expense" && sameMonth(new Date(t.date), target))
      .reduce((a, t) => a + t.amount, 0);
  });

  charts.expense?.destroy();
  charts.expense = new Chart(document.getElementById("chartExpense"), {
    type: "bar",
    data: { labels, datasets: [{ label: "Pengeluaran", data, backgroundColor: "#FFB300", borderRadius: 8 }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => "Rp" + (v / 1000) + "k" } } } }
  });
}

function renderSavingChart(savings, tx) {
  const labels = monthLabels();
  const now = new Date();
  const savingTx = tx.filter(t => t.type === "saving");
  let running = 0;
  const monthlyTotals = labels.map((_, i) => {
    const target = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return savingTx.filter(t => sameMonth(new Date(t.date), target)).reduce((a, t) => a + t.amount, 0);
  });
  const cumulative = monthlyTotals.map(v => (running += v));

  charts.saving?.destroy();
  charts.saving = new Chart(document.getElementById("chartSaving"), {
    type: "line",
    data: { labels, datasets: [{ label: "Tabungan", data: cumulative, borderColor: "#4CAF50", backgroundColor: "rgba(76,175,80,.15)", fill: true, tension: 0.4 }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => "Rp" + (v / 1000) + "k" } } } }
  });
}

function renderCategoryChart(needs) {
  const byCategory = {};
  needs.forEach(n => { byCategory[n.category] = (byCategory[n.category] || 0) + n.price; });
  const labels = Object.keys(byCategory);
  const data = Object.values(byCategory);
  const colors = ["#FBC02D", "#FFB300", "#4CAF50", "#E53935", "#8D6E63", "#7986CB"];

  charts.category?.destroy();
  charts.category = new Chart(document.getElementById("chartCategory"), {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: colors }] },
    options: { plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } } }
  });
}

function renderTimeline(timeline) {
  const el = document.getElementById("fullTimeline");
  if (timeline.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-emoji">🗒️</div><p>Belum ada aktivitas</p></div>`;
    return;
  }
  el.innerHTML = timeline.map(t => `
    <div class="card flex items-center gap-12" style="padding:14px 16px;">
      <div class="timeline-dot">${t.icon}</div>
      <div>
        <div class="text-sm">${escapeHtml(t.text)}</div>
        <div class="text-soft" style="font-size:11px;">${App.formatDate(t.date)}</div>
      </div>
    </div>`).join("");
}

function sameMonth(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth(); }

async function exportPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const childId = currentChildId === "all" ? undefined : currentChildId;
  const tx = await API.getTransactions(childId);

  doc.setFontSize(16);
  doc.text("Laporan My Kids Manager", 14, 18);
  doc.setFontSize(10);
  doc.text(`Anak: ${currentChildName || "Semua Anak"}`, 14, 26);
  doc.text(`Tanggal: ${new Date().toLocaleDateString("id-ID")}`, 14, 32);

  let y = 44;
  doc.setFontSize(11);
  doc.text("Tanggal", 14, y);
  doc.text("Jenis", 70, y);
  doc.text("Catatan", 105, y);
  doc.text("Jumlah", 170, y);
  y += 6;
  doc.setDrawColor(220);
  doc.line(14, y - 4, 196, y - 4);

  tx.slice(0, 25).forEach(t => {
    if (y > 280) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.text(new Date(t.date).toLocaleDateString("id-ID"), 14, y);
    doc.text(t.type, 70, y);
    doc.text((t.note || "-").slice(0, 28), 105, y);
    doc.text("Rp" + t.amount.toLocaleString("id-ID"), 170, y);
    y += 7;
  });

  doc.save("laporan-my-kids-manager.pdf");
  App.toast("PDF berhasil diunduh", "📄");
}

async function exportExcel() {
  const childId = currentChildId === "all" ? undefined : currentChildId;
  const tx = await API.getTransactions(childId);
  const rows = tx.map(t => ({
    Tanggal: new Date(t.date).toLocaleDateString("id-ID"),
    Jenis: t.type,
    Catatan: t.note || "-",
    Jumlah: t.amount
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transaksi");
  XLSX.writeFile(wb, "laporan-my-kids-manager.xlsx");
  App.toast("Excel berhasil diunduh", "📊");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
