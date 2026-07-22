/* ===========================================================
   auth.js — login page logic
   =========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  if (!form) return;

  // Already logged in? skip straight to dashboard
  if (App.getSession()) {
    location.href = "dashboard.html";
    return;
  }

  const btn = document.getElementById("loginBtn");
  const pwToggle = document.getElementById("pwToggle");
  const pwInput = document.getElementById("password");

  pwToggle?.addEventListener("click", () => {
    const isPw = pwInput.type === "password";
    pwInput.type = isPw ? "text" : "password";
    pwToggle.innerHTML = `<i class="fa-solid ${isPw ? "fa-eye-slash" : "fa-eye"}"></i>`;
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = pwInput.value;
    const remember = document.getElementById("remember").checked;

    if (!email || !password) {
      App.toast("Email dan password wajib diisi", "⚠️");
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Memproses...';

    const res = await API.login(email, password);

    if (res.ok) {
      App.setSession(res.user);
      if (remember) localStorage.setItem("mkm_remember_email", email);
      App.toast(`Selamat datang, ${res.user.role}!`, "👋");
      setTimeout(() => (location.href = "dashboard.html"), 500);
    } else {
      App.toast("Email atau password salah", "❌");
      btn.disabled = false;
      btn.innerHTML = "Masuk";
    }
  });

  const savedEmail = localStorage.getItem("mkm_remember_email");
  if (savedEmail) {
    document.getElementById("email").value = savedEmail;
    document.getElementById("remember").checked = true;
  }

  document.getElementById("googleLoginBtn")?.addEventListener("click", async () => {
    const res = await API.googleLogin("demo-token");
    App.setSession(res.user);
    App.toast("Login dengan Google berhasil", "👋");
    setTimeout(() => (location.href = "dashboard.html"), 500);
  });

  document.getElementById("forgotPassword")?.addEventListener("click", e => {
    e.preventDefault();
    App.toast("Fitur reset password segera hadir", "ℹ️");
  });

  initGoogleSignIn();
});

function initGoogleSignIn() {
  const clientId = window.CONFIG && CONFIG.GOOGLE_CLIENT_ID;
  const realContainer = document.getElementById("googleBtnContainer");
  const demoBtn = document.getElementById("googleLoginBtn");

  if (!clientId || !window.google?.accounts?.id) {
    // No Client ID configured yet (or GIS script failed to load) —
    // fall back to the one-click demo button.
    demoBtn.style.display = "flex";
    return;
  }

  google.accounts.id.initialize({
    client_id: clientId,
    callback: handleGoogleCredential
  });
  google.accounts.id.renderButton(realContainer, {
    theme: "outline", size: "large", shape: "pill", width: 320, text: "signin_with"
  });
}

async function handleGoogleCredential(response) {
  // response.credential is a signed Google ID token (JWT). It's sent
  // as-is to the backend, which verifies it with Google before trusting
  // the email/name inside it — the frontend never decodes it itself.
  App.toast("Memverifikasi akun Google...", "🔐");
  const res = await API.googleLogin(response.credential);

  if (res.ok) {
    App.setSession(res.user);
    App.toast(`Selamat datang, ${res.user.role}!`, "👋");
    setTimeout(() => (location.href = "dashboard.html"), 500);
  } else {
    App.toast(res.message || "Login Google gagal", "❌");
  }
}
