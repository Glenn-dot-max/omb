// ==============================================
//  CONFIGURATION GLOBALE - OH MY BRUNCH
// ==============================================

/**
 * Détecte automatiquement l'environnement et configure l'URL de l'API
 * En développement (local) : http://localhost:8000
 * En production (Render): hhtps://[votre-backend].onrender.com
 */

const API_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000"
    : "https://TO_BE_REPLACED_AFTER_DEPLOYMENT";

// Logs de débogage
console.log("🌍 Environnement détecté :", window.location.hostname);
console.log("🔗 API URL:", API_URL);
console.log(
  "📍 Mode:",
  window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
    ? "DÉVELOPPEMENT"
    : "PRODUCTION",
);

// Configuration exportée globalement
window.APP_CONFIG = {
  API_URL: API_URL,
  VERSION: "1.0.0",
  API_NAME: "Oh My Brunch",
};
