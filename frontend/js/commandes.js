// js/commandes.js

// ===============================================
// APP STATE - point de vérité unique
// ===============================================

const AppState = {
  // Données chargées depuis l'API
  allCommandes: [],
  allFormules: [],
  allProduits: [],
  allUnites: [],
  allFranchises: [],

  // État de l'interface
  currentTab: "active",
  currentSearchTerm: "",
  currentDateFilter: "",
  currentFranchiseFilter: "",

  // Édition / création en cours
  currentEditingCommande: null,
  tempFormules: [],
  tempProduits: [],
  editFormules: [],
  editProduits: [],
};

// Aliases de compatibilité - évitent de tout réécrire en une fois
// À supprimer progressivement au fur et à mesure du refactoring
let allCommandes = AppState.allCommandes;
let allFormules = AppState.allFormules;
let allProduits = AppState.allProduits;
let allUnites = AppState.allUnites;
let allFranchises = AppState.allFranchises;
let tempFormules = AppState.tempFormules;
let tempProduits = AppState.tempProduits;
let editFormules = AppState.editFormules;
let editProduits = AppState.editProduits;

// ===============================================
// INITIALISATION AU CHARGEMENT DE LA PAGE
// ===============================================

document.addEventListener("DOMContentLoaded", () => {
  const currentuser = getUser();
  loadInitialData();
  setupEventListeners();

  if (currentuser && currentuser.role === "TECH_ADMIN") {
    const adminLink = document.getElementById("admin-link");
    if (adminLink) {
      adminLink.style.display = "inline-block";
    }
  }
});

async function loadInitialData() {
  await Promise.allSettled([loadFranchises(), loadCommandes()]);
}

// ===============================================
// BOÎTE DE CONFIRMATION PERSONNALISÉE
// ===============================================

function showConfirm(
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-dialog">
        <p class="confirm-message">${message.replace(/\n/g, "<br>")}</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary confirm-cancel-btn">${cancelLabel}</button>
          <button class="btn btn-danger confirm-ok-btn">${confirmLabel}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector(".confirm-ok-btn").addEventListener("click", () => {
      document.body.removeChild(overlay);
      resolve(true);
    });
    overlay
      .querySelector(".confirm-cancel-btn")
      .addEventListener("click", () => {
        document.body.removeChild(overlay);
        resolve(false);
      });
  });
}

function displayParisTimeInfo() {
  if (window.parisDate) {
    const infoDiv = document.getElementById("commandes-count");
    if (infoDiv) {
      const originalText = infoDiv.textContent;

      const localDate = new Date().toLocaleDateString("fr-FR");
      const parisDateFormatted = window.parisDate;

      if (localDate !== parisDateFormatted) {
        infoDiv.title = `⏰ Votre heure locale: ${localDate}\nHeure de Paris: ${parisDateFormatted}`;
      }
    }
  }
}

// ===============================================
// CHARGER LES FRANCHISES (TECH_ADMIN)
// ===============================================

async function loadFranchises() {
  try {
    const currentUser = getUser();
    const filterFranchise = document.getElementById("filter-franchise");

    if (!currentUser || currentUser.role !== "TECH_ADMIN") {
      if (filterFranchise) {
        filterFranchise.style.display = "none";
      }
      return;
    }

    if (filterFranchise) {
      filterFranchise.style.display = "block";
    }

    allFranchises = await apiGet("/admin/franchises");
    populateFranchiseSelect();
  } catch (error) {
    console.error("Erreur lors du chargement des franchises :", error);
    const filterFranchise = document.getElementById("filter-franchise");
    if (filterFranchise) {
      filterFranchise.style.display = "none";
    }
  }
}

function populateFranchiseSelect() {
  const select = document.getElementById("filter-franchise");
  if (!select) return;

  select.innerHTML = '<option value="">Toutes les franchises</option>';

  allFranchises.forEach((franchise) => {
    const option = document.createElement("option");
    option.value = franchise.id;
    option.textContent = franchise.nom;
    select.appendChild(option);
  });
}

// ===============================================
// CHARGEMENT DES COMMANDES
// ===============================================

async function loadCommandes() {
  try {
    const commandesList = document.getElementById("commandes-list");
    commandesList.innerHTML = '<div class="loader"></div>';

    if (AppState.currentTab === "active") {
      try {
        const result = await autoArchiveCommandes();
        if (result.count > 0) {
          // auto-archived silently
        }
      } catch (error) {
        console.error("Erreur lors de l'archivage automatique :", error);
      }
    }

    const currentUser = getUser();
    let response;

    if (
      AppState.currentFranchiseFilter &&
      currentUser &&
      currentUser.role === "TECH_ADMIN"
    ) {
      if (AppState.currentTab === "active") {
        response = await apiGet(
          `/admin/franchises/${AppState.currentFranchiseFilter}/commandes?archived=false`,
        );
      } else {
        response = await apiGet(
          `/admin/franchises/${AppState.currentFranchiseFilter}/commandes?archived=true`,
        );
      }
    } else {
      if (AppState.currentTab === "active") {
        response = await getCommandes();
      } else {
        response = await getArchivedCommandes();
      }
    }

    if (response.commandes) {
      allCommandes = response.commandes;
      window.parisDate = response.paris_date;
    } else {
      allCommandes = response;
    }

    displayCommandes(allCommandes);
    updateCommandesCount();
    displayParisTimeInfo();
  } catch (error) {
    console.error("Erreur lors du chargement des commandes :", error);
    const commandesList = document.getElementById("commandes-list");
    commandesList.innerHTML =
      '<p style="color: red;">Erreur lors du chargement des commandes.</p>';
  }
}

// ===============================================
// GESTION DES ONGLETS ET ARCHIVAGE
// ===============================================

function handleTabActive() {
  AppState.currentTab = "active";

  // Mettre à jour les classes CSS
  document.getElementById("tab-active").classList.add("active");
  document.getElementById("tab-archived").classList.remove("active");

  // Réinitialiser les filtres
  handleResetFilters();

  // Recharger les commandes actives
  loadCommandes();
}

function handleTabArchived() {
  AppState.currentTab = "archived";

  // Mettre à jour les classes CSS
  document.getElementById("tab-active").classList.remove("active");
  document.getElementById("tab-archived").classList.add("active");

  // Réinitialiser les filtres
  handleResetFilters();

  // Recharger les commandes archivées
  loadCommandes();
}
