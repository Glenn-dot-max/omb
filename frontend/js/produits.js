// js/produits.js
// Logique de la page produits : affichage, ajout, suppression, recherche

const __ombNativeAlertProduits = window.alert.bind(window);
window.alert = function (message) {
  if (typeof showToast === "function") {
    const msg = String(message ?? "");
    const isError = /❌|erreur|impossible|refus|introuvable/i.test(msg);
    const isSuccess =
      /✅|succès|créé|ajouté|modifié|supprimé|mis à jour|réactiv/i.test(msg);
    showToast(msg, isError ? "error" : isSuccess ? "success" : "info", 3500);
    return;
  }
  __ombNativeAlertProduits(String(message ?? ""));
};

// ===========================================
// VARIABLES GLOBALES
// ===========================================

const AppState = {
  allProduits: [],
  allCategories: [],
  allTypes: [],
  allFranchises: [],
  currentView: localStorage.getItem("produits_view") || "cards",
  sortColumn: localStorage.getItem("produits_sort_column") || "name",
  sortDirection: localStorage.getItem("produits_sort_direction") || "asc",
  currentCategoryFilter: "",
  currentTypeFilter: "",
  currentSearchTerm: "",
  currentFranchiseFilter: "",
  currentEditingProduct: null,
  currentFilteredProduits: [],
};

// Aliases de compatibilité (arrays)
let allProduits = AppState.allProduits;
let allCategories = AppState.allCategories;
let allTypes = AppState.allTypes;
let allFranchises = AppState.allFranchises;
let currentFilteredProduits = AppState.currentFilteredProduits;

// ===========================================
// INITIALISATION AU CHARGEMENT DE LA PAGE
// ===========================================

document.addEventListener("DOMContentLoaded", () => {
  initViewToggle();
  loadInitialData();
  setupEventListeners();

  const currentuser = getUser();
  if (currentuser && currentuser.role === "TECH_ADMIN") {
    const adminLink = document.getElementById("admin-link");
    if (adminLink) {
      adminLink.style.display = "inline-block";
    }
  }
});

async function loadInitialData() {
  await Promise.allSettled([loadCategories(), loadTypes(), loadFranchises()]);
  await loadProduits();
}
