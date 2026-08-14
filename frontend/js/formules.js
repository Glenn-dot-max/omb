// js/formules.js
// Logique de la page formules : affichage, ajout, suppression, recherche

const __ombNativeAlertFormules = window.alert.bind(window);
window.alert = function (message) {
  if (typeof showToast === "function") {
    const msg = String(message ?? "");
    const isError = /❌|erreur|impossible|refus|introuvable/i.test(msg);
    const isSuccess =
      /✅|succès|créé|ajouté|modifié|supprimé|mis à jour|réactiv|restaur/i.test(
        msg,
      );
    showToast(msg, isError ? "error" : isSuccess ? "success" : "info", 3500);
    return;
  }
  __ombNativeAlertFormules(String(message ?? ""));
};

// ===========================================
// VARIABLES GLOBALES
// ===========================================

const AppState = {
  allFormules: [],
  allProduits: [],
  allUnites: [],
  allFranchises: [],
  currentView: localStorage.getItem("formulesView") || "cards",
  sortColumn: localStorage.getItem("formules_sort_column") || "name",
};

// Aliases de compatibilité
let allFormules = AppState.allFormules;
let allProduits = AppState.allProduits;
let allUnites = AppState.allUnites;
let allFranchises = AppState.allFranchises;

let sortDirection = localStorage.getItem("formules_sort_direction") || "asc";

// Variables de filtrage
let currentTypeFilter = "";
let currentSearchTerm = "";
let currentFranchiseFilter = "";
let currentFilteredFormules = [];

let currentEditingFormule = null;
let currentManagingFranchisesFormule = null;
let tempProduitsToCreate = [];

let allUnite = [];

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
  await Promise.allSettled([loadFormules(), loadFranchises(), loadUnite()]);
}
