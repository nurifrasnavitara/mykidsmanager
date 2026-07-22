/* ===========================================================
   api.js — REST layer for My Kids Manager
   -----------------------------------------------------------
   Endpoints (see backend-gas/ for the Apps Script implementation):
     POST /login          GET /children      GET /wallet
     GET  /transactions    GET /wishlist       GET /needs
     GET  /saving           GET /timeline       POST /topup
     POST /expense          POST /saving        POST /wishlist
     POST /needs             POST /note          GET /dashboard

   Two modes, chosen automatically:
   - GAS_URL empty  → uses localStorage as a mock database, so the
     frontend works fully standalone for design/demo purposes.
   - GAS_URL set     → every call goes to the real Google Apps
     Script Web App instead. No other file needs to change, since
     every page already calls these same API.* functions.

   To go live: paste your deployed Web App URL below, see
   backend-gas/README-BACKEND.md for deployment steps.
   =========================================================== */

const API = (() => {
  const DB_KEY = "mkm_db_v1";
  const delay = (ms = 350) => new Promise(r => setTimeout(r, ms));
  const isLive = () => !!(window.CONFIG && CONFIG.GAS_URL);

  /* ---------- Live backend transport ---------- */

  async function gasGet(action, params = {}) {
    const url = new URL(CONFIG.GAS_URL);
    url.searchParams.set("action", action);
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) url.searchParams.set(k, v); });
    const res = await fetch(url.toString(), { method: "GET" });
    return res.json();
  }

  // GET endpoints return different shapes (arrays, single objects) depending
  // on the endpoint, unlike POST actions which always return {ok, message}.
  // On network failure we can't return a generic {ok:false} object here —
  // callers like `children.map(...)` would crash on it — so each call site
  // provides its own safe fallback value (e.g. [] for lists, null for a
  // single record) and we just surface the failure as a toast.
  async function safeGet(action, params, fallback) {
    try {
      return await gasGet(action, params);
    } catch (err) {
      console.error("GAS GET failed:", action, err);
      if (window.App?.toast) App.toast("Gagal memuat data dari server", "❌");
      return fallback;
    }
  }

  async function gasPost(action, body = {}) {
    // Content-Type text/plain avoids a CORS preflight that GAS Web Apps
    // can't answer; the server still JSON.parse()s the body itself.
    try {
      const res = await fetch(CONFIG.GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action, ...body })
      });
      return await res.json();
    } catch (err) {
      console.error("GAS POST failed:", action, err);
      return { ok: false, message: "Gagal terhubung ke server. Cek koneksi internet atau GAS_URL di config.js." };
    }
  }

  /* ---------- Mock (localStorage) backend ---------- */

  function seed() {
    return {
      user: { name: "Tommy", role: "Ayah", email: "ayah@keluarga.com" },
      children: [
        {
          id: "c1", name: "Kaldera", emoji: "👦",
          dob: "2016-03-12", school: "SMP Muhammadiyah 9 Nagreg",
          clothingSize: "M (Anak)", shoeSize: "35", bloodType: "O",
          hobby: "Sepak bola, menggambar",
          balance: 350000, savings: 2300000, savingsTarget: 3500000,
          wishlistCount: 3
        },
        {
          id: "c2", name: "Kanala", emoji: "👧",
          dob: "2018-07-24", school: "SD Muhammadiyah Nagreg",
          clothingSize: "S (Anak)", shoeSize: "30", bloodType: "AB",
          hobby: "Menari, membaca",
          balance: 250000, savings: 1900000, savingsTarget: 2375000,
          wishlistCount: 2
        }
      ],
      transactions: [
        { id: "t1", childId: "c1", type: "topup", amount: 100000, note: "Uang saku mingguan", date: todayISO() },
        { id: "t2", childId: "c2", type: "expense", amount: 75000, note: "Sepatu sekolah", date: todayISO() },
        { id: "t3", childId: "c1", type: "saving", amount: 50000, note: "Nabung sisa jajan", date: todayISO() }
      ],
      savings: [
        { id: "s1", childId: "c1", title: "Sepeda Baru", target: 1500000, current: 950000 },
        { id: "s2", childId: "c2", title: "Tas Sekolah", target: 400000, current: 320000 }
      ],
      wishlist: [
        { id: "w1", childId: "c1", item: "Bola futsal", price: 150000, status: "belum" },
        { id: "w2", childId: "c1", item: "Buku gambar A3", price: 45000, status: "disetujui" },
        { id: "w3", childId: "c1", item: "Sepatu bola", price: 320000, status: "sudah" },
        { id: "w4", childId: "c2", item: "Boneka baru", price: 120000, status: "belum" },
        { id: "w5", childId: "c2", item: "Buku cerita", price: 60000, status: "disetujui" }
      ],
      needs: [
        { id: "n1", childId: "c1", category: "sekolah", icon: "📚", item: "Buku tulis 10 pcs", price: 55000, status: "pending" },
        { id: "n2", childId: "c2", category: "pakaian", icon: "👕", item: "Seragam olahraga", price: 90000, status: "dibeli" },
        { id: "n3", childId: "c1", category: "sepatu", icon: "👟", item: "Sepatu sekolah", price: 175000, status: "selesai" },
        { id: "n4", childId: "c2", category: "kesehatan", icon: "💊", item: "Vitamin anak", price: 40000, status: "pending" }
      ],
      timeline: [
        { id: "tl1", icon: "💰", text: "Ayah memberi uang saku Rp100.000 ke Kaldera", date: todayISO() },
        { id: "tl2", icon: "👟", text: "Ibu membeli sepatu untuk Kanala", date: todayISO() },
        { id: "tl3", icon: "🏦", text: "Kaldera menabung Rp50.000", date: todayISO() }
      ],
      notes: [],
      school: [
        { id: "sc1", childId: "c1", type: "tugas", title: "PR Matematika bab pecahan", date: todayISO(), note: "Dikumpulkan hari Jumat" },
        { id: "sc2", childId: "c1", type: "nilai", title: "Ulangan IPA: 88", date: todayISO(), note: "" },
        { id: "sc3", childId: "c2", type: "jadwal", title: "Ujian Tengah Semester", date: todayISO(), note: "Mulai minggu depan" }
      ],
      health: [
        { id: "he1", childId: "c1", type: "checkup", title: "Kontrol gigi rutin", date: todayISO(), note: "Tidak ada masalah" },
        { id: "he2", childId: "c2", type: "imunisasi", title: "Imunisasi lanjutan", date: todayISO(), note: "" }
      ],
      settings: { darkMode: false }
    };
  }

  function todayISO() { return new Date().toISOString(); }

  function load() {
    let raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(DB_KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw);
  }

  function save(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  function uid(prefix) {
    return prefix + Math.random().toString(36).slice(2, 9);
  }

  /* ---------- Public API (used by every page) ---------- */

  return {
    async login(email, password) {
      if (isLive()) return gasPost("login", { email, password });
      await delay();
      const db = load();
      // Demo mode: any email/password combination signs in as the seeded user
      return { ok: true, user: db.user };
    },

    async googleLogin(idToken) {
      if (isLive()) return gasPost("googleLogin", { idToken });
      await delay();
      const db = load();
      // Demo mode: simulate a successful Google sign-in
      return { ok: true, user: db.user };
    },

    async getDashboard() {
      if (isLive()) return safeGet("dashboard", {}, { children: [], totalBalance: 0, totalSavings: 0, needsCount: 0, timeline: [] });
      await delay();
      const db = load();
      const totalBalance = db.children.reduce((a, c) => a + c.balance, 0);
      const totalSavings = db.children.reduce((a, c) => a + c.savings, 0);
      return {
        user: db.user,
        children: db.children,
        totalBalance,
        totalSavings,
        needsCount: db.needs.filter(n => n.status !== "selesai").length,
        timeline: db.timeline.slice(0, 5)
      };
    },

    async getChildren() {
      if (isLive()) return safeGet("children", {}, []);
      await delay(); return load().children;
    },
    async getChild(id) {
      if (isLive()) return safeGet("child", { childId: id }, null);
      await delay(); return load().children.find(c => c.id === id);
    },

    async updateChild(childId, data) {
      if (isLive()) return gasPost("updateChild", { childId, ...data });
      await delay();
      const db = load();
      const child = db.children.find(c => c.id === childId);
      if (!child) return { ok: false };
      Object.assign(child, data);
      save(db);
      return { ok: true, child };
    },

    async getWallet(childId) {
      if (isLive()) return safeGet("wallet", { childId }, { balance: 0, transactions: [] });
      await delay();
      const db = load();
      const child = db.children.find(c => c.id === childId);
      const tx = db.transactions.filter(t => t.childId === childId).sort((a, b) => new Date(b.date) - new Date(a.date));
      return { balance: child?.balance ?? 0, transactions: tx };
    },

    async getTransactions(childId) {
      if (isLive()) return safeGet("transactions", { childId }, []);
      await delay();
      const db = load();
      return db.transactions.filter(t => !childId || t.childId === childId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    async getSaving(childId) {
      if (isLive()) return safeGet("saving", { childId }, []);
      await delay();
      const db = load();
      return db.savings.filter(s => !childId || s.childId === childId);
    },

    async getWishlist(childId) {
      if (isLive()) return safeGet("wishlist", { childId }, []);
      await delay();
      const db = load();
      return db.wishlist.filter(w => !childId || w.childId === childId);
    },

    async getNeeds(childId) {
      if (isLive()) return safeGet("needs", { childId }, []);
      await delay();
      const db = load();
      return db.needs.filter(n => !childId || n.childId === childId);
    },

    async getTimeline() {
      if (isLive()) return safeGet("timeline", {}, []);
      await delay();
      const db = load();
      return db.timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    async topup(childId, amount, note) {
      if (isLive()) return gasPost("topup", { childId, amount: Number(amount), note });
      await delay();
      const db = load();
      const child = db.children.find(c => c.id === childId);
      if (!child) return { ok: false };
      child.balance += Number(amount);
      const t = { id: uid("t"), childId, type: "topup", amount: Number(amount), note: note || "Top up", date: todayISO() };
      db.transactions.unshift(t);
      db.timeline.unshift({ id: uid("tl"), icon: "💰", text: `${db.user.role} memberi uang saku Rp${Number(amount).toLocaleString("id-ID")} ke ${child.name}`, date: todayISO() });
      save(db);
      return { ok: true, balance: child.balance };
    },

    async expense(childId, amount, note) {
      if (isLive()) return gasPost("expense", { childId, amount: Number(amount), note });
      await delay();
      const db = load();
      const child = db.children.find(c => c.id === childId);
      if (!child) return { ok: false };
      child.balance = Math.max(0, child.balance - Number(amount));
      const t = { id: uid("t"), childId, type: "expense", amount: Number(amount), note: note || "Pengeluaran", date: todayISO() };
      db.transactions.unshift(t);
      db.timeline.unshift({ id: uid("tl"), icon: "🛒", text: `Pengeluaran Rp${Number(amount).toLocaleString("id-ID")} untuk ${child.name}${note ? " — " + note : ""}`, date: todayISO() });
      save(db);
      return { ok: true, balance: child.balance };
    },

    async addSaving(childId, amount, savingId) {
      if (isLive()) return gasPost("saving", { childId, amount: Number(amount), savingId });
      await delay();
      const db = load();
      const child = db.children.find(c => c.id === childId);
      if (!child) return { ok: false };
      child.savings += Number(amount);
      if (savingId) {
        const s = db.savings.find(s => s.id === savingId);
        if (s) s.current = Math.min(s.target, s.current + Number(amount));
      }
      const t = { id: uid("t"), childId, type: "saving", amount: Number(amount), note: "Menabung", date: todayISO(), savingId: savingId || "" };
      db.transactions.unshift(t);
      db.timeline.unshift({ id: uid("tl"), icon: "🏦", text: `${child.name} menabung Rp${Number(amount).toLocaleString("id-ID")}`, date: todayISO() });
      save(db);
      return { ok: true, savings: child.savings };
    },

    async addSavingTarget(childId, title, target) {
      if (isLive()) return gasPost("saving", { childId, title, target: Number(target) });
      await delay();
      const db = load();
      const s = { id: uid("s"), childId, title, target: Number(target), current: 0 };
      db.savings.push(s);
      save(db);
      return { ok: true, saving: s };
    },

    async addWishlist(childId, item, price) {
      if (isLive()) return gasPost("wishlist", { childId, item, price: Number(price) });
      await delay();
      const db = load();
      const w = { id: uid("w"), childId, item, price: Number(price), status: "belum" };
      db.wishlist.push(w);
      const c = db.children.find(c => c.id === childId);
      if (c) c.wishlistCount = db.wishlist.filter(x => x.childId === childId).length;
      save(db);
      return { ok: true, wishlist: w };
    },

    async updateWishlistStatus(id, status) {
      if (isLive()) return gasPost("wishlist", { id, status });
      await delay();
      const db = load();
      const w = db.wishlist.find(w => w.id === id);
      if (w) w.status = status;
      save(db);
      return { ok: true };
    },

    async addNeed(childId, category, icon, item, price) {
      if (isLive()) return gasPost("needs", { childId, category, icon, item, price: Number(price) });
      await delay();
      const db = load();
      const n = { id: uid("n"), childId, category, icon, item, price: Number(price), status: "pending" };
      db.needs.push(n);
      save(db);
      return { ok: true, need: n };
    },

    async updateNeedStatus(id, status) {
      if (isLive()) return gasPost("needs", { id, status });
      await delay();
      const db = load();
      const n = db.needs.find(n => n.id === id);
      if (n) n.status = status;
      save(db);
      return { ok: true };
    },

    async addNote(childId, text) {
      if (isLive()) return gasPost("note", { childId, text });
      await delay();
      const db = load();
      const n = { id: uid("note"), childId, text, date: todayISO() };
      db.notes.push(n);
      save(db);
      return { ok: true, note: n };
    },

    /* ---------- Delete (with balance/savings reversal in mock mode) ---------- */

    async deleteTransaction(id) {
      if (isLive()) return gasPost("deleteTransaction", { id });
      await delay();
      const db = load();
      const tx = db.transactions.find(t => t.id === id);
      if (!tx) return { ok: false };
      const child = db.children.find(c => c.id === tx.childId);
      if (child) {
        if (tx.type === "topup") child.balance = Math.max(0, child.balance - tx.amount);
        else if (tx.type === "expense") child.balance += tx.amount;
        else if (tx.type === "saving") {
          child.savings = Math.max(0, child.savings - tx.amount);
          if (tx.savingId) {
            const target = db.savings.find(s => s.id === tx.savingId);
            if (target) target.current = Math.max(0, target.current - tx.amount);
          }
        }
      }
      db.transactions = db.transactions.filter(t => t.id !== id);
      save(db);
      return { ok: true };
    },

    async deleteWishlist(id) {
      if (isLive()) return gasPost("deleteWishlist", { id });
      await delay();
      const db = load();
      db.wishlist = db.wishlist.filter(w => w.id !== id);
      save(db);
      return { ok: true };
    },

    async deleteNeed(id) {
      if (isLive()) return gasPost("deleteNeed", { id });
      await delay();
      const db = load();
      db.needs = db.needs.filter(n => n.id !== id);
      save(db);
      return { ok: true };
    },

    /* ---------- Modul Sekolah ---------- */

    async getSchool(childId) {
      if (isLive()) return safeGet("school", { childId }, []);
      await delay();
      const db = load();
      db.school = db.school || [];
      return db.school.filter(s => !childId || s.childId === childId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    async addSchool(childId, type, title, date, note) {
      if (isLive()) return gasPost("addSchool", { childId, type, title, date, note });
      await delay();
      const db = load();
      db.school = db.school || [];
      const entry = { id: uid("sc"), childId, type, title, date: date || todayISO(), note: note || "" };
      db.school.push(entry);
      save(db);
      return { ok: true, entry };
    },

    async deleteSchool(id) {
      if (isLive()) return gasPost("deleteSchool", { id });
      await delay();
      const db = load();
      db.school = (db.school || []).filter(s => s.id !== id);
      save(db);
      return { ok: true };
    },

    /* ---------- Modul Kesehatan ---------- */

    async getHealth(childId) {
      if (isLive()) return safeGet("health", { childId }, []);
      await delay();
      const db = load();
      db.health = db.health || [];
      return db.health.filter(h => !childId || h.childId === childId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    async addHealth(childId, type, title, date, note) {
      if (isLive()) return gasPost("addHealth", { childId, type, title, date, note });
      await delay();
      const db = load();
      db.health = db.health || [];
      const entry = { id: uid("he"), childId, type, title, date: date || todayISO(), note: note || "" };
      db.health.push(entry);
      save(db);
      return { ok: true, entry };
    },

    async deleteHealth(id) {
      if (isLive()) return gasPost("deleteHealth", { id });
      await delay();
      const db = load();
      db.health = (db.health || []).filter(h => h.id !== id);
      save(db);
      return { ok: true };
    },

    async getSettings() {
      if (isLive()) return safeGet("settings", {}, {});
      await delay(100); return load().settings;
    },
    async saveSettings(settings) {
      if (isLive()) return gasPost("settings", settings);
      await delay(100);
      const db = load();
      db.settings = { ...db.settings, ...settings };
      save(db);
      return { ok: true };
    },

    _raw: { load, save }
  };
})();
