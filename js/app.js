/* ===========================================================
   app.js — shared utilities loaded on every page
   =========================================================== */

const App = (() => {
  const SESSION_KEY = "mkm_session";

  function formatRupiah(n) {
    return "Rp" + Number(n || 0).toLocaleString("id-ID");
  }

  function formatDate(iso) {
    const d = new Date(iso);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    if (sameDay) return "Hari ini, " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }

  /* ---------- Session ---------- */
  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
  }
  function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }
  function requireAuth() {
    if (!getSession() && !location.pathname.endsWith("login.html") && !location.pathname.endsWith("index.html") && location.pathname !== "/") {
      location.href = "login.html";
    }
  }

  /* ---------- Toast ---------- */
  function toast(msg, icon = "✅") {
    let stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      document.body.appendChild(stack);
    }
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = `${icon} ${msg}`;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  /* ---------- Ripple ---------- */
  function initRipple() {
    document.addEventListener("click", e => {
      const target = e.target.closest(".ripple, .btn, .menu-icon, .nav-fab, .header-icon-btn");
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const circle = document.createElement("span");
      const size = Math.max(rect.width, rect.height);
      circle.className = "ripple-effect";
      circle.style.width = circle.style.height = size + "px";
      circle.style.left = (e.clientX - rect.left - size / 2) + "px";
      circle.style.top = (e.clientY - rect.top - size / 2) + "px";
      const pos = getComputedStyle(target).position;
      if (pos === "static") target.style.position = "relative";
      target.style.overflow = target.style.overflow || "hidden";
      target.appendChild(circle);
      setTimeout(() => circle.remove(), 550);
    });
  }

  /* ---------- Dark mode ---------- */
  function initDarkMode() {
    const stored = localStorage.getItem("mkm_theme");
    if (stored === "dark") document.documentElement.setAttribute("data-theme", "dark");
    document.querySelectorAll("[data-toggle-theme]").forEach(btn => {
      updateThemeIcon(btn);
      btn.addEventListener("click", () => {
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        if (isDark) {
          document.documentElement.removeAttribute("data-theme");
          localStorage.setItem("mkm_theme", "light");
        } else {
          document.documentElement.setAttribute("data-theme", "dark");
          localStorage.setItem("mkm_theme", "dark");
        }
        updateThemeIcon(btn);
      });
    });
  }
  function updateThemeIcon(btn) {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    btn.innerHTML = `<i class="fa-solid ${isDark ? "fa-sun" : "fa-moon"}"></i>`;
  }

  /* ---------- Bottom nav active state ---------- */
  function markActiveNav() {
    const page = location.pathname.split("/").pop() || "dashboard.html";
    document.querySelectorAll(".nav-item[data-page]").forEach(item => {
      item.classList.toggle("active", item.dataset.page === page);
    });
  }

  /* ---------- Pull to refresh ---------- */
  function initPullToRefresh(onRefresh) {
    const container = document.querySelector("[data-ptr]");
    if (!container) return;
    let startY = 0, pulling = false;
    const indicator = document.createElement("div");
    indicator.className = "ptr-indicator";
    indicator.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Menyegarkan...';
    container.prepend(indicator);

    container.addEventListener("touchstart", e => {
      if (container.scrollTop === 0) { startY = e.touches[0].clientY; pulling = true; }
    });
    container.addEventListener("touchmove", e => {
      if (!pulling) return;
      const diff = e.touches[0].clientY - startY;
      if (diff > 60) indicator.classList.add("active");
    });
    container.addEventListener("touchend", async () => {
      if (indicator.classList.contains("active")) {
        await onRefresh?.();
        toast("Data diperbarui", "🔄");
      }
      indicator.classList.remove("active");
      pulling = false;
    });
  }

  /* ---------- Skeleton helper ---------- */
  function skeletonRows(count, height = 60) {
    return Array.from({ length: count })
      .map(() => `<div class="skeleton" style="height:${height}px;margin-bottom:12px;"></div>`)
      .join("");
  }

  /* ---------- PWA / Service worker ---------- */
  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("service-worker.js").catch(() => {});
      });
    }
  }
  let deferredPrompt = null;
  function initInstallPrompt() {
    window.addEventListener("beforeinstallprompt", e => {
      e.preventDefault();
      deferredPrompt = e;
      document.querySelectorAll("[data-install-app]").forEach(b => b.style.display = "flex");
    });
    document.querySelectorAll("[data-install-app]").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
      });
    });
  }

  /* ---------- Growth ring renderer ---------- */
  function renderGrowthRing(el, percent) {
    const r = 26, c = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(100, percent));
    el.innerHTML = `
      <svg viewBox="0 0 64 64">
        <circle class="ring-track" cx="32" cy="32" r="${r}"></circle>
        <circle class="ring-fill" cx="32" cy="32" r="${r}" style="stroke-dasharray:${c};stroke-dashoffset:${c}"></circle>
      </svg>
      <div class="ring-sprout">${pct}%</div>`;
    requestAnimationFrame(() => {
      const fill = el.querySelector(".ring-fill");
      fill.style.strokeDashoffset = c - (pct / 100) * c;
    });
  }

  function init() {
    initRipple();
    initDarkMode();
    markActiveNav();
    registerServiceWorker();
    initInstallPrompt();
  }

  document.addEventListener("DOMContentLoaded", init);

  return {
    formatRupiah, formatDate,
    getSession, setSession, clearSession, requireAuth,
    toast, skeletonRows, initPullToRefresh, renderGrowthRing
  };
})();
