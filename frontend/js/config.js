// ==============================================
//  CONFIGURATION GLOBALE - OH MY BRUNCH
// ==============================================

/**
 * Détecte automatiquement l'environnement et configure l'URL de l'API
 * En développement (local) : http://localhost:8000
 * En production (Render): https://[votre-backend].onrender.com
 */

const isLocalDev = (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
) && window.location.port !== "";

const API_URL = isLocalDev
  ? "http://localhost:8000"
  : window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "/api"
    : "https://omb-backend.onrender.com";

// Logs de débogage
if (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
) {
  console.log("🌍 Environnement : DÉVELOPPEMENT");
  console.log("🔗 URL de l'API :", API_URL);
}

// Configuration exportée globalement
window.APP_CONFIG = {
  API_URL: API_URL,
  VERSION: "1.0.0",
  API_NAME: "Oh My Brunch",
};
