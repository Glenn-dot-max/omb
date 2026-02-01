// js/commandes.js

// ===============================================
// VARIABLES GLOBALES
// ===============================================

let allCommandes = []; // Tableau pour stocker toutes les commandes
let currentSearchTerm = "";
let currentDateFilter = "";

// ===============================================
// INITIALISATION AU CHARGEMENT DE LA PAGE
// ===============================================

document.addEventListener("DOMContentLoaded", () => {
  loadInitialData();
  setupEventListeners();
});

async function loadInitialData() {
  await loadCommandes();
}

// ===============================================
// CHARGEMENT DES COMMANDES
// ===============================================

async function loadCommandes() {
  try {
    const commandesList = document.getElementById("commandes-list");
    commandesList.innerHTML = '<div class="loader"></div>';

    allCommandes = await getCommandes();

    displayCommandes(allCommandes);
    updateCommandesCount();
  } catch (error) {
    console.error("Erreur lors du chargement des commandes :", error);
    const commandesList = document.getElementById("commandes-list");
    commandesList.innerHTML =
      '<p style="color: red;">Erreur lors du chargement des commandes.</p>';
  }
}

// ===============================================
// AFFICHAGE DES COMMANDES
// ===============================================

function displayCommandes(commandes) {
  const commandesList = document.getElementById("commandes-list");

  if (commandes.length === 0) {
    commandesList.innerHTML = "<p>Aucune commande trouvée.</p>";
    return;
  }

  commandesList.innerHTML = "";

  commandes.forEach((commande) => {
    const commandeItem = createCommandeElement(commande);
    commandesList.appendChild(commandeItem);
  });
}

function createCommandeElement(commande) {
  const div = document.createElement("div");
  div.className = "product-item";

  // Nom du client
  const nameSpan = document.createElement("span");
  nameSpan.className = "product-name";
  nameSpan.textContent = commande.nom_client;

  // Détails
  const detailsDiv = document.createElement("div");
  detailsDiv.className = "product-details";

  // Badge date avec indicateur d'urgence
  const dateBadge = document.createElement("span");
  const dateInfo = getDateInfo(commande.delivery_date);
  dateBadge.className = `badge category ${dateInfo.urgent ? "badge-urgent" : ""}`;
  dateBadge.textContent = `📅 ${dateInfo.text} à ${commande.delivery_hour}`;
  detailsDiv.appendChild(dateBadge);

  // Badge couverts
  const couvertsBadge = document.createElement("span");
  couvertsBadge.className = "badge type";
  couvertsBadge.textContent = `🍽️ ${commande.nombre_couverts} couverts`;
  detailsDiv.appendChild(couvertsBadge);

  // Badge service
  const serviceBadge = document.createElement("span");
  serviceBadge.className = commande.avec_service
    ? "badge service-oui"
    : "badge service-non";
  serviceBadge.textContent = commande.avec_service
    ? "✅ Service inclus"
    : "⭕ Sans service";
  detailsDiv.appendChild(serviceBadge);

  // Notes
  if (commande.notes && commande.notes.trim()) {
    const notesP = document.createElement("p");
    notesP.className = "product-notes";
    notesP.textContent = `📝 ${commande.notes}`;
    notesP.style.fontSize = "0.9em";
    notesP.style.color = "#666";
    notesP.style.marginTop = "0.5rem";
    detailsDiv.appendChild(notesP);
  }

  // Actions
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "product-actions";

  const detailsBtn = document.createElement("button");
  detailsBtn.className = "edit-btn";
  detailsBtn.textContent = "👁️ Détails";
  detailsBtn.onclick = () => handleViewDetails(commande);

  const editBtn = document.createElement("button");
  editBtn.className = "edit-btn";
  editBtn.textContent = "✏️ Modifier";
  editBtn.onclick = () => handleEditCommande(commande);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "🗑️ Supprimer";
  deleteBtn.onclick = () => handleDeleteCommande(commande.id);

  actionsDiv.appendChild(detailsBtn);
  actionsDiv.appendChild(editBtn);
  actionsDiv.appendChild(deleteBtn);

  // Assembler l'élément commande
  div.appendChild(nameSpan);
  div.appendChild(detailsDiv);
  div.appendChild(actionsDiv);

  return div;
}

// ===============================================
// FONCTIONS UTILITAIRES
// ===============================================

function getDateInfo(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const commandeDate = new Date(date);
  commandeDate.setHours(0, 0, 0, 0);

  if (commandeDate.getTime() === today.getTime()) {
    return { text: "Aujourd'hui", urgent: true };
  } else if (commandeDate.getTime() === tomorrow.getTime()) {
    return { text: "Demain", urgent: true };
  } else {
    return {
      text: date.toLocaleDateString("fr-FR"),
      urgent: false,
    };
  }
}

function updateCommandesCount() {
  const count = document.getElementById("commandes-count");
  count.textContent = `${allCommandes.length} commandes${allCommandes.length > 1 ? "s" : ""}`;
}

// ===============================================
// GESTION DES ÉVÉNEMENTS
// ===============================================

function setupEventListeners() {
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", handleSearch);

  const filterDate = document.getElementById("filter-date");
  filterDate.addEventListener("change", handleDateFilter);

  const resetBtn = document.getElementById("reset-filters");
  resetBtn.addEventListener("click", handleResetFilters);

  const openCreateModal = document.getElementById("open-create-modal");
  openCreateModal.addEventListener("click", handleOpenCreateModal);
}

// ===============================================
// GESTION DES FILTRES
// ===============================================

function handleSearch(event) {
  currentSearchTerm = event.target.value.toLowerCase();
  applyFilters();
}

function handleDateFilter(event) {
  currentDateFilter = document.getElementById("filter-date").value;
  applyFilters();
}

function handleResetFilters() {
  currentSearchTerm = "";
  currentDateFilter = "";

  document.getElementById("search-input").value = "";
  document.getElementById("filter-date").value = "";

  displayCommandes(allCommandes);
}

function applyFilters() {
  let filteredCommandes = allCommandes;

  // Filtre de recherche
  if (currentSearchTerm) {
    filteredCommandes = filteredCommandes.filter((commande) =>
      commande.nom_client.toLowerCase().includes(currentSearchTerm),
    );
  }

  // Filtre de date
  if (currentDateFilter) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    filteredCommandes = filteredCommandes.filter((commande) => {
      const commandeDate = new Date(commande.delivery_date);
      commandeDate.setHours(0, 0, 0, 0);

      switch (currentDateFilter) {
        case "today":
          return commandeDate.getTime() === today.getTime();
        case "tomorrow":
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          return commandeDate.getTime() === tomorrow.getTime();
        case "week":
          const weekFromNow = new Date(today);
          weekFromNow.setDate(weekFromNow.getDate() + 7);
          return commandeDate >= today && commandeDate <= weekFromNow;
        default:
          return true;
      }
    });
  }

  displayCommandes(filteredCommandes);
}

// ===============================================
// ACTIONS SUR LES COMMANDES
// ===============================================

function handleOpenCreateModal() {
  console.log("Ouvrir le modal de création de commande");
  showToast("Fonction de création de commande non implémentée.", "info");
}

function handleViewDetails(commande) {
  console.log("Voir les détails de la commande :", commande);
  showToast("Fonction de visualisation des détails non implémentée.", "info");
}

function handleEditCommande(commande) {
  console.log("Modifier la commande :", commande);
  showToast("Fonction de modification de commande non implémentée.", "info");
}

async function handleDeleteCommande(commandeId) {
  if (!confirm("Êtes-vous sûr de vouloir supprimer cette commande ?")) {
    return;
  }

  try {
    await deleteCommande(commandeId);
    allCommandes = allCommandes.filter((c) => c.id !== commandeId);
    displayCommandes(allCommandes);
    updateCommandesCount();
    showToast("Commande supprimée avec succès.", "success");
  } catch (error) {
    console.error("Erreur lors de la suppression de la commande :", error);
    showToast("Erreur lors de la suppression de la commande.", "error");
  }
}
