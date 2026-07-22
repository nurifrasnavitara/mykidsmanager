/* ===========================================================
   config.js — single place to configure the deployed backend
   and Google Sign-In. Loaded before every other script.
   =========================================================== */

// IMPORTANT: this is assigned directly to `window` (not `const`),
// because api.js checks `window.CONFIG` — a top-level `const`
// would NOT create a `window.CONFIG` property in a classic
// script, which silently broke the live-backend switch.
window.CONFIG = {
  // Web App URL from Deploy > New deployment in Apps Script.
  // Leave empty to keep running on the localStorage mock.
  GAS_URL: "https://script.google.com/macros/s/AKfycbzoFXrwRu04eBAaXH8BLqiq_Jcnx7DSMafnAkmpzlclh7ZuPC_PEkQd7OhczRGo9XtO/exec",

  // OAuth 2.0 Client ID (type "Web application") from
  // Google Cloud Console > APIs & Services > Credentials.
  // Leave empty to keep the demo Google-login button.
  GOOGLE_CLIENT_ID: ""
};
