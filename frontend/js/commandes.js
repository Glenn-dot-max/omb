// js/commandes.js

// ===============================================
// VARIABLES GLOBALES
// ===============================================

let allCommandes = []; // Tableau pour stocker toutes les commandes
let currentSearchTerm = "";
let currentDateFilter = "";
let tempFormules = [];
let tempProduits = [];
let allFormules = [];
let allProduits = [];
let allUnites = [];
let currentEditingCommande = null;
let editFormules = [];
let editProduits = [];
let currentTab = "active";

// ===============================================
// INITIALISATION AU CHARGEMENT DE LA PAGE
// ===============================================

document.addEventListener("DOMContentLoaded", () => {
  loadInitialData();
  setupEventListeners();
});

async function loadInitialData() {
  await loadCommandes();
  await loadDataForModal();
}

// ===============================================
// CHARGEMENT DES COMMANDES
// ===============================================

async function loadCommandes() {
  try {
    const commandesList = document.getElementById("commandes-list");
    commandesList.innerHTML = '<div class="loader"></div>';

    // Charger selon l'onglet actif
    if (currentTab === "active") {
      allCommandes = await getCommandes();
    } else {
      allCommandes = await getArchivedCommandes();
    }

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

  // ==============================================
  // SI ON EST DANS L'ONGLET ARCHIVÉ
  // ==============================================

  if (currentTab === "archived") {
    // Pour les commandes archivées, on affiche simplement par date décroissante
    commandesList.innerHTML = "";

    const sortedCommandes = [...commandes].sort((a, b) => {
      const dateA = new Date(a.delivery_date);
      const dateB = new Date(b.delivery_date);
      return dateB - dateA; // Ordre décroissant (plus récent en premier)
    });

    const section = document.createElement("div");
    section.className = "commandes-section archived-section";

    const header = document.createElement("div");
    header.className = "section-header future-header";
    header.innerHTML = `
      <div class="section-title">
        <h3>🗄️ Commandes archivées</h3>
        <p class="section-subtitle">Triées par date (plus récent en premier)</p>
      </div>
      <div class="section-stats">
        <span class="section-count">📦 ${commandes.length} commande${commandes.length > 1 ? "s" : ""}</span>
      </div>
    `;

    section.appendChild(header);

    const commandesGroup = document.createElement("div");
    commandesGroup.className = "commandes-group";

    sortedCommandes.forEach((commande) => {
      const commandeCard = createCommandeElement(commande, false);
      commandesGroup.appendChild(commandeCard);
    });

    section.appendChild(commandesGroup);
    commandesList.appendChild(section);

    return; // On arrête ici pour les commandes archivées
  }

  // ==============================================
  // SÉPARER ET TRIER LES COMMANDES ACTIVES
  // ==============================================

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);

  const in14Days = new Date(today);
  in14Days.setDate(in14Days.getDate() + 14);

  // Créer les groupes
  const commandesAujourdHui = [];
  const commandesDemain = [];
  const commandesCetteSemaine = [];
  const commandesSemaineProchaine = [];
  const commandesPlusTard = [];

  commandes.forEach((commande) => {
    const commandeDate = new Date(commande.delivery_date + "T12:00:00");
    commandeDate.setHours(0, 0, 0, 0);

    if (commandeDate.getTime() === today.getTime()) {
      commandesAujourdHui.push(commande);
    } else if (commandeDate.getTime() === tomorrow.getTime()) {
      commandesDemain.push(commande);
    } else if (commandeDate >= dayAfterTomorrow && commandeDate <= in7Days) {
      commandesCetteSemaine.push(commande);
    } else if (commandeDate > in7Days && commandeDate <= in14Days) {
      commandesSemaineProchaine.push(commande);
    } else if (commandeDate > in14Days) {
      commandesPlusTard.push(commande);
    }
  });

  // Fonction pour trier par heure
  const sortByTime = (a, b) => {
    const timeA = a.delivery_hour || "00:00";
    const timeB = b.delivery_hour || "00:00";
    return timeA.localeCompare(timeB);
  };

  // Fonction pour trier par date puis heure
  const sortByDateTime = (a, b) => {
    const dateA = new Date(a.delivery_date);
    const dateB = new Date(b.delivery_date);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA - dateB;
    }
    return sortByTime(a, b);
  };

  // Trier par chaque groupe
  commandesAujourdHui.sort(sortByTime);
  commandesDemain.sort(sortByTime);
  commandesCetteSemaine.sort(sortByDateTime);
  commandesSemaineProchaine.sort(sortByDateTime);
  commandesPlusTard.sort(sortByDateTime);

  // Fonction pour calculer le total de couverts
  const getTotalCouverts = (commandes) => {
    return commandes.reduce(
      (total, cmd) => total + (cmd.nombre_couverts || 0),
      0,
    );
  };

  // ==============================================
  // AFFICHER LES SECTIONS
  // ==============================================

  commandesList.innerHTML = "";

  // Section Aujourd'hui
  if (commandesAujourdHui.length > 0) {
    const section = createSection({
      title: "Aujourd'hui",
      subtitle: getDateLabel(today),
      commandes: commandesAujourdHui,
      totalCouverts: getTotalCouverts(commandesAujourdHui),
      className: "today-section",
      urgent: true,
    });
    commandesList.appendChild(section);
  }

  // Section Demain
  if (commandesDemain.length > 0) {
    const section = createSection({
      title: "⚠️ Demain",
      subtitle: getDateLabel(tomorrow),
      commandes: commandesDemain,
      totalCouverts: getTotalCouverts(commandesDemain),
      className: "tomorrow-section",
      urgent: true,
    });
    commandesList.appendChild(section);
  }

  // Section Cette semaine
  if (commandesCetteSemaine.length > 0) {
    const section = createSection({
      title: "📅 CETTE SEMAINE (J+2 à J+7)",
      subtitle: `${getDateLabel(dayAfterTomorrow)} - ${getDateLabel(in7Days)}`,
      commandes: commandesCetteSemaine,
      totalCouverts: getTotalCouverts(commandesCetteSemaine),
      className: "week-section",
      urgent: false,
    });
    commandesList.appendChild(section);
  }

  // Section Semaine prochaine
  if (commandesSemaineProchaine.length > 0) {
    const section = createSection({
      title: "📅 SEMAINE PROCHAINE (J+8 à J+14)",
      subtitle: `${getDateLabel(new Date(in7Days.getTime() + 24 * 60 * 60 * 1000))} - ${getDateLabel(in14Days)}`,
      commandes: commandesSemaineProchaine,
      totalCouverts: getTotalCouverts(commandesSemaineProchaine),
      className: "next-week-section",
      urgent: false,
    });
    commandesList.appendChild(section);
  }

  // Section Plus tard
  if (commandesPlusTard.length > 0) {
    const section = createSection({
      title: "📆 PLUS TARD (Au-delà de J+14)",
      subtitle: "Commandes futures",
      commandes: commandesPlusTard,
      totalCouverts: getTotalCouverts(commandesPlusTard),
      className: "later-section",
      urgent: false,
    });
    commandesList.appendChild(section);
  }
}

// Fonction helper pour créer une section de commandes
function createSection({
  title,
  subtitle,
  commandes,
  totalCouverts,
  className,
  urgent,
}) {
  const section = document.createElement("div");
  section.className = `commandes-section ${className}`;

  const header = document.createElement("div");
  header.className = `section-header ${urgent ? "urgent-header" : "future-header"}`;
  header.innerHTML = `
    <div class="section-title">
      <h3>${title}</h3>
      <p class="section-subtitle">${subtitle}</p>
    </div>
    <div class="section-stats">
      <span class="section-count">📦 ${commandes.length} commande${commandes.length > 1 ? "s" : ""}</span>
      <span class="section-couverts">🍽️ ${totalCouverts} couvert${totalCouverts > 1 ? "s" : ""}</span>
    </div>
  `;

  section.appendChild(header);

  const commandesGroup = document.createElement("div");
  commandesGroup.className = "commandes-group";

  commandes.forEach((commande) => {
    const commandeCard = createCommandeElement(commande, urgent);
    commandesGroup.appendChild(commandeCard);
  });

  section.appendChild(commandesGroup);

  return section;
}

// Fonction helper pour formater les dates
function getDateLabel(date) {
  const options = { weekday: "long", day: "numeric", month: "long" };
  return date.toLocaleDateString("fr-FR", options);
}

function createCommandeElement(commande, isUrgent = false) {
  const div = document.createElement("div");
  div.className = `product-item ${isUrgent ? "urgent-item" : ""}`;

  // Nom du client
  const nameSpan = document.createElement("span");
  nameSpan.className = "product-name";
  nameSpan.textContent = commande.nom_client;

  // Bandeau
  const bandeau = document.createElement("div");
  bandeau.className = "product-bandeau";

  // Heure de livraison dans le bandeau
  const heureSpan = document.createElement("span");
  heureSpan.textContent = `⏰ ${commande.delivery_hour}`;
  bandeau.appendChild(heureSpan);

  // DÉTAILS (badges)

  const detailsDiv = document.createElement("div");
  detailsDiv.className = "product-detail";

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

  // AJOUTER UN BOUTON ARCHIVER SI ON EST DANS L'ONGLET ACTIVE
  if (currentTab === "active") {
    const archiveBtn = document.createElement("button");
    archiveBtn.className = "archive-btn";
    archiveBtn.textContent = "🗄️ Archiver";
    archiveBtn.onclick = () => handleArchiveCommande(commande.id);
    actionsDiv.appendChild(archiveBtn);
  }

  actionsDiv.appendChild(deleteBtn);

  // Assembler l'élément commande
  div.appendChild(nameSpan);
  div.appendChild(bandeau);
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
  count.textContent = `${allCommandes.length} commande${allCommandes.length > 1 ? "s" : ""}`;
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

  // Onglets & archivages
  const tabActive = document.getElementById("tab-active");
  tabActive.addEventListener("click", handleTabActive);

  const tabArchived = document.getElementById("tab-archived");
  tabArchived.addEventListener("click", handleTabArchived);

  const autoArchiveBtn = document.getElementById("auto-archive-btn");
  autoArchiveBtn.addEventListener("click", handleAutoArchive);

  const openCreateModal = document.getElementById("open-create-modal");
  openCreateModal.addEventListener("click", handleOpenCreateModal);

  // ===============================================
  // CREATE MODAL EVENT LISTENERS
  // ===============================================

  const closeCreateModal = document.getElementById("close-create-modal");
  closeCreateModal.addEventListener("click", closeCreateCommandeModal);

  const cancelCreate = document.getElementById("cancel-create");
  cancelCreate.addEventListener("click", closeCreateCommandeModal);

  const saveCreate = document.getElementById("save-create-commande");
  saveCreate.addEventListener("click", handleCreateCommande);

  const addFormulebtn = document.getElementById("add-formule-btn");
  addFormulebtn.addEventListener("click", handleAddFormule);

  const addProduitbtn = document.getElementById("add-produit-btn");
  addProduitbtn.addEventListener("click", handleAddProduit);

  const createModal = document.getElementById("create-modal");
  createModal.addEventListener("click", (event) => {
    if (event.target === createModal) {
      closeCreateCommandeModal();
    }
  });

  // ===============================================
  // DETAIL MODAL EVENT LISTENERS
  // ===============================================

  const closeDetailModalBtn = document.getElementById("close-detail-modal");
  closeDetailModalBtn.addEventListener("click", closeDetailModal);

  const closeDetailBtnFooter = document.getElementById("close-detail-btn");
  closeDetailBtnFooter.addEventListener("click", closeDetailModal);

  const detailModal = document.getElementById("detail-modal");
  detailModal.addEventListener("click", (event) => {
    if (event.target === detailModal) {
      closeDetailModal();
    }
  });

  // ===============================================
  // ✅ EDIT MODAL EVENT LISTENERS (AJOUTE ÇA!)
  // ===============================================

  // Fermer avec le X
  const closeEditModalBtn = document.getElementById("close-edit-modal");
  closeEditModalBtn.addEventListener("click", closeEditModal);

  // Annuler
  const cancelEdit = document.getElementById("cancel-edit");
  cancelEdit.addEventListener("click", closeEditModal);

  // Sauvegarder
  const saveEdit = document.getElementById("save-edit-commande");
  saveEdit.addEventListener("click", handleSaveEditCommande);

  // Ajouter formule
  const addEditFormule = document.getElementById("edit-add-formule-btn");
  addEditFormule.addEventListener("click", handleAddEditFormule);

  // Ajouter produit
  const addEditProduit = document.getElementById("edit-add-produit-btn");
  addEditProduit.addEventListener("click", handleAddEditProduit);

  // Fermer en cliquant sur le fond gris
  const editModal = document.getElementById("edit-modal");
  editModal.addEventListener("click", (event) => {
    if (event.target === editModal) {
      closeEditModal();
    }
  });
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

async function handleOpenCreateModal() {
  console.log("Ouvertire de la modale de création");

  // 1. Réinitialiser les listes temporaires
  tempFormules = [];
  tempProduits = [];

  // 2. Charger les données (formules, produits, unités)
  await loadDataForModal();

  // 3. Réinitialiser les champs du formulaire
  document.getElementById("create-nom-client").value = "";
  document.getElementById("create-delivery-date").value = getTodayDate();
  document.getElementById("create-delivery-hour").value = "10:00";
  document.getElementById("create-nombre-couverts").value = "1";
  document.getElementById("create-avec-service").checked = true;
  document.getElementById("create-notes").value = "";
  document.getElementById("formule-couverts").value = "1";

  // 4. Afficher les listes vides
  displayTempFormules();
  displayTempProduits();

  // 5. Afficher la modale (passer de display:none à display:block)
  document.getElementById("create-modal").style.display = "block";
}

function closeCreateCommandeModal() {
  // Cacher la modale
  document.getElementById("create-modal").style.display = "none";

  // Vider les données temporaires
  tempFormules = [];
  tempProduits = [];
}

async function handleViewDetails(commande) {
  try {
    if (allFormules.length === 0 || allProduits.length === 0) {
      await loadDataForModal();
    }

    document.getElementById("detail-nom-client").textContent =
      commande.nom_client;
    document.getElementById("detail-delivery-date").textContent = new Date(
      commande.delivery_date,
    ).toLocaleDateString("fr-FR");
    document.getElementById("detail-delivery-hour").textContent =
      commande.delivery_hour;
    document.getElementById("detail-nombre-couverts").textContent =
      `${commande.nombre_couverts} personne${commande.nombre_couverts > 1 ? "s" : ""}`;

    document.getElementById("detail-avec-service").textContent =
      commande.avec_service ? "✅ Oui" : "⭕ Non";
    document.getElementById("detail-notes").textContent =
      commande.notes || "Aucune note";

    const formules = await getCommandeFormules(commande.id);
    const produits = await getCommandeProduits(commande.id);

    await displayDetailsFormules(formules);
    displayDetailsProduits(produits);

    document.getElementById("detail-modal").style.display = "block";
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des détails de la commande :",
      error,
    );
    showToast(
      "Erreur lors de la récupération des détails de la commande.",
      "error",
    );
  }
}

async function displayDetailsFormules(formules) {
  const container = document.getElementById("detail-formules-list");
  const count = document.getElementById("detail-formules-count");

  count.textContent = formules.length;

  if (formules.length === 0) {
    container.innerHTML = '<p class="empty-list">Aucune formule.</p>';
    return;
  }

  container.innerHTML = "";

  for (const formule of formules) {
    const div = document.createElement("div");
    div.className = "item-row";

    const formuleData = allFormules.find((f) => f.id === formule.formule_id);
    const formuleName = formuleData ? formuleData.name : "Formule Inconnue";

    const formuleProduits = await getFormuleProduits(formule.formule_id);

    let produitsHTML = "";
    if (formuleProduits.length > 0) {
      produitsHTML = '<div class="formule-composition">';
      produitsHTML += "<strong>📦 Composition :</strong>";
      produitsHTML += '<ul class="composition-list">';

      for (const fp of formuleProduits) {
        const produitData = allProduits.find((p) => p.id === fp.produit_id);
        const produitName = produitData ? produitData.name : "Produit Inconnu";

        const totalQuantite =
          fp.quantite_par_personne * formule.quantite_finale;

        produitsHTML += `<li>${produitName} - ${totalQuantite} ${fp.unite}</li>`;
      }

      produitsHTML += "</ul></div>";
    }

    div.innerHTML = `
      <div class="item-info">
        <div class="item-name">${formuleName}</div>
        <div class="item-detail">Quantité : ${formule.quantite_finale} couverts</div>
        ${produitsHTML}
      </div>
    `;

    container.appendChild(div);
  }
}

function displayDetailsProduits(produits) {
  const container = document.getElementById("detail-produits-list");
  const count = document.getElementById("detail-produits-count");

  count.textContent = produits.length;

  if (produits.length === 0) {
    container.innerHTML = '<p class="empty-list">Aucun produit.</p>';
    return;
  }

  container.innerHTML = "";

  produits.forEach((produit) => {
    const div = document.createElement("div");
    div.className = "item-row";

    const produitData = allProduits.find((p) => p.id === produit.produit_id);
    const produitName = produitData ? produitData.name : "Produit Inconnu";

    div.innerHTML = `
      <div class="item-info">
        <div class="item-name">${produitName}</div>
        <div class="item-detail">Quantité : ${produit.quantite} ${produit.unite}</div>
      </div>
    `;

    container.appendChild(div);
  });
}

function closeDetailModal() {
  document.getElementById("detail-modal").style.display = "none";
}

async function handleEditCommande(commande) {
  console.log("✏️ Modification la commande :", commande);

  try {
    // 1. Store the command being edited
    currentEditingCommande = commande;

    // 2. Load data for the selectors
    if (allFormules.length === 0 || allProduits.length === 0) {
      await loadDataForModal();
    }

    // 3. Fill basic from fields with existing data
    document.getElementById("edit-nom-client").value = commande.nom_client;
    document.getElementById("edit-delivery-date").value =
      commande.delivery_date;
    document.getElementById("edit-delivery-hour").value =
      commande.delivery_hour;
    document.getElementById("edit-nombre-couverts").value =
      commande.nombre_couverts;
    document.getElementById("edit-avec-service").checked =
      commande.avec_service;
    document.getElementById("edit-notes").value = commande.notes || "";
    document.getElementById("edit-formule-couverts").value =
      commande.nombre_couverts;

    // 4. Load existing formules and products from API
    const [formules, produits] = await Promise.all([
      getCommandeFormules(commande.id),
      getCommandeProduits(commande.id),
    ]);

    // 5. Convert to edit format
    editFormules = formules.map((f) => {
      const formuleData = allFormules.find((form) => form.id === f.formule_id);
      return {
        id: f.id,
        formule_id: f.formule_id,
        formule_name: formuleData ? formuleData.name : "Formule Inconnue",
        formule_type: formuleData ? formuleData.type_formule : "",
        couverts: f.quantite_finale,
      };
    });

    editProduits = produits.map((p) => {
      const produitData = allProduits.find((prod) => prod.id === p.produit_id);
      return {
        id: p.id,
        produit_id: p.produit_id,
        produit_name: produitData ? produitData.name : "Produit Inconnu",
        quantite: p.quantite,
        unite: p.unite,
      };
    });

    // 6. Populate selectors
    populateEditFormuleSelector();
    populateEditProduitSelector();
    populateEditUniteSelect();

    // 7. Display existing items
    displayEditFormules();
    displayEditProduits();

    // 8. Show the edit modal
    document.getElementById("edit-modal").style.display = "block";
  } catch (error) {
    console.error("Erreur lors de l'ouverture de l'édition:", error);
    showToast(
      "Erreur lors de l'ouverture de l'édition de la commande.",
      "error",
    );
  }
}

function populateEditFormuleSelector() {
  const select = document.getElementById("edit-formule-select");
  select.innerHTML = '<option value="">-- Sélectionner une formule --</option>';

  allFormules.forEach((formule) => {
    const option = document.createElement("option");
    option.value = formule.id;
    option.textContent = `${formule.name} - (${formule.type_formule})`;
    select.appendChild(option);
  });
}

function populateEditProduitSelector() {
  const select = document.getElementById("edit-produit-select");
  select.innerHTML = '<option value="">-- Sélectionner un produit --</option>';

  allProduits.forEach((produit) => {
    const option = document.createElement("option");
    option.value = produit.id;
    option.textContent = produit.name;
    select.appendChild(option);
  });
}

function populateEditUniteSelect() {
  const select = document.getElementById("edit-produit-unite");
  select.innerHTML = '<option value="">-- Unité --</option>';

  allUnites.forEach((unite) => {
    const option = document.createElement("option");
    option.value = unite.nom.trim();
    option.textContent = unite.nom.trim();
    select.appendChild(option);
  });

  // Sélectionner "unité" par défaut
  if (select.querySelector('option[value="unité"]')) {
    select.value = "unité";
    console.log('✅ "unité" sélectionnée par défaut dans produit-unité');
  }
}

function displayEditFormules() {
  const container = document.getElementById("edit-formules-list");
  const count = document.getElementById("edit-formules-count");

  count.textContent = editFormules.length;

  if (editFormules.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucune formule ajoutée.</p>';
    return;
  }

  container.innerHTML = "";

  editFormules.forEach((formule, index) => {
    const div = document.createElement("div");
    div.className = "item-row";

    div.innerHTML = `
      <div class="item-info">
        <div class="item-name">${formule.formule_name}</div>
        <div class="item-detail">${formule.formule_type} • ${formule.couverts} couverts</div>
      </div>
      <div class="item-actions">
        <button class="btn-icon" onclick="handleRemoveEditFormule(${index})" title="Retirer">🗑️</button>
      </div>
    `;
    container.appendChild(div);
  });
}

function displayEditProduits() {
  const container = document.getElementById("edit-produits-list");
  const count = document.getElementById("edit-produits-count");

  count.textContent = editProduits.length;

  if (editProduits.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucun produit ajouté.</p>';
    return;
  }

  container.innerHTML = "";

  editProduits.forEach((produit, index) => {
    const div = document.createElement("div");
    div.className = "item-row";

    div.innerHTML = `
      <div class="item-info">
        <div class="item-name">${produit.produit_name}</div>
        <div class="item-detail">${produit.quantite} ${produit.unite}</div>
      </div>
      <div class="item-actions">
        <button class="btn-icon" onclick="handleRemoveEditProduit(${index})" title="Retirer">🗑️</button>
      </div>
    `;
    container.appendChild(div);
  });
}

async function handleRemoveEditFormule(index) {
  const formule = editFormules[index];

  if (formule.id) {
    try {
      await deleteCommandeFormule(formule.id);
      // ✅ Will show toast at the end
    } catch (error) {
      console.error("Erreur lors de la suppression de la formule :", error);
      showToast("Erreur lors de la suppression de la formule.", "error");
      return;
    }
  }

  editFormules.splice(index, 1);
  displayEditFormules();

  // ✅ One toast for both cases
  showToast("Formule retirée.", "success");
}

async function handleRemoveEditProduit(index) {
  const produit = editProduits[index];
  if (produit.id) {
    try {
      await deleteCommandeProduit(produit.id);
      // ✅ Will show toast at the end
    } catch (error) {
      console.error("Erreur lors de la suppression du produit :", error);
      showToast("Erreur lors de la suppression du produit.", "error");
      return;
    }
  }
  editProduits.splice(index, 1);
  displayEditProduits();
  showToast("Produit retiré.", "success");
}

function handleAddEditFormule() {
  const select = document.getElementById("edit-formule-select");
  const formuleId = select.value;
  const couverts = parseInt(
    document.getElementById("edit-formule-couverts").value,
  );

  if (!formuleId) {
    showToast("Veuillez sélectionner une formule.", "warning");
    return;
  }

  if (!couverts || couverts < 1) {
    showToast("Le nombre de couverts doit être au moins de 1.", "warning");
    return;
  }

  const dejaAjoute = editFormules.find((f) => f.formule_id === formuleId);
  if (dejaAjoute) {
    showToast("Cette formule a déjà été ajoutée.", "warning");
    return;
  }

  const formule = allFormules.find((f) => f.id === formuleId);

  if (!formule) {
    showToast("Erreur : Formule introuvable.", "error");
    return;
  }

  editFormules.push({
    formule_id: formule.id,
    formule_name: formule.name,
    formule_type: formule.type_formule,
    couverts: couverts,
  });

  displayEditFormules();

  select.value = "";
  const nombreCouverts = document.getElementById("edit-nombre-couverts").value;
  document.getElementById("edit-formule-couverts").value = nombreCouverts;

  showToast("Formule ajoutée.", "success");
}

function handleAddEditProduit() {
  const select = document.getElementById("edit-produit-select");
  const produitId = select.value;
  const quantite = parseFloat(
    document.getElementById("edit-produit-quantite").value,
  );
  const unite = document.getElementById("edit-produit-unite").value;

  if (!produitId) {
    showToast("Veuillez sélectionner un produit.", "warning");
    return;
  }

  if (!quantite || quantite < 1) {
    showToast("La quantité doit être au moins de 1.", "warning");
    return;
  }

  if (!unite) {
    showToast("Veuillez sélectionner une unité.", "warning");
    return;
  }

  const dejaAjoute = editProduits.find((p) => p.produit_id === produitId);
  if (dejaAjoute) {
    showToast("Ce produit a déjà été ajouté.", "warning");
    return;
  }

  const produit = allProduits.find((p) => p.id === produitId);

  if (!produit) {
    showToast("Erreur : Produit introuvable.", "error");
    return;
  }

  editProduits.push({
    produit_id: produit.id,
    produit_name: produit.name,
    quantite: quantite,
    unite: unite,
  });

  displayEditProduits();

  select.value = "";
  document.getElementById("edit-produit-quantite").value = "1";

  // Remettre "unité" par défaut
  const uniteSelect = document.getElementById("edit-produit-unite");
  if (uniteSelect.querySelector('option[value="unité"]')) {
    uniteSelect.value = "unité";
  }
  showToast("Produit ajouté.", "success");
}

async function handleSaveEditCommande() {
  console.log("💾 Sauvegarde de la commande...");

  try {
    // ===============================================
    // STEP 1 : Get form values
    // ===============================================

    const nomClient = document.getElementById("edit-nom-client").value.trim();
    const deliveryDate = document.getElementById("edit-delivery-date").value;
    const deliveryHour = document.getElementById("edit-delivery-hour").value;
    const nombreCouverts = parseInt(
      document.getElementById("edit-nombre-couverts").value,
    );
    const avecService = document.getElementById("edit-avec-service").checked;
    const notes = document.getElementById("edit-notes").value.trim();

    // ===============================================
    // STEP 2 : Validate inputs
    // ===============================================
    if (!nomClient) {
      showToast("Le nom du client est requis.", "warning");
      return;
    }

    if (!deliveryDate) {
      showToast("La date de livraison est requise.", "warning");
      return;
    }

    if (!deliveryHour) {
      showToast("L'heure de livraison est requise.", "warning");
      return;
    }

    if (!nombreCouverts || nombreCouverts < 1) {
      showToast("Le nombre de couverts doit être au moins de 1.", "warning");
      return;
    }

    // ===============================================
    // STEP 3 : Update the commande
    // ===============================================

    const commandeData = {
      nom_client: nomClient,
      delivery_date: deliveryDate,
      delivery_hour: deliveryHour,
      nombre_couverts: nombreCouverts,
      avec_service: avecService,
      service: avecService,
      notes: notes || null,
    };

    console.log("📝 Mise à jour commande:", commandeData);
    await updateCommande(currentEditingCommande.id, commandeData);
    console.log("✅ Commande mise à jour.");

    // ===============================================
    // STEP 4 : CREATE NEW formules
    // ===============================================

    const newFormules = editFormules.filter((f) => !f.id);

    if (newFormules.length > 0) {
      console.log(
        `➕ Ajout de ${newFormules.length} nouvelle(s) formule(s):`,
        newFormules,
      );

      for (const formule of newFormules) {
        const formuleData = {
          commande_id: currentEditingCommande.id,
          formule_id: formule.formule_id,
          quantite_finale: formule.couverts,
        };
        await createCommandeFormule(formuleData);
      }

      console.log("✅ Nouvelles formules ajoutées.");
    }

    // ===============================================
    // STEP 5 : CREATE NEW produits
    // ===============================================

    const newProduits = editProduits.filter((p) => !p.id);

    if (newProduits.length > 0) {
      console.log(
        `➕ Ajout de ${newProduits.length} nouveau(x) produit(s):`,
        newProduits,
      );

      for (const produit of newProduits) {
        const produitData = {
          commande_id: currentEditingCommande.id,
          produit_id: produit.produit_id,
          quantite: produit.quantite,
          unite: produit.unite,
        };
        await createCommandeProduit(produitData);
      }

      console.log("✅ Nouveaux produits ajoutés.");
    }

    // ===============================================
    // STEP 6 : Finalize
    // ===============================================
    console.log("🔄 Rafraîchissement des données...");
    await loadCommandes();

    closeEditModal();

    showToast(`Commande "${nomClient}" mise à jour avec succès.`, "success");
  } catch (error) {
    console.error("Erreur lors de la sauvegarde de la commande :", error);
    showToast("Erreur lors de la sauvegarde de la commande.", "error");
  }
}

function closeEditModal() {
  // Cacher la modale
  document.getElementById("edit-modal").style.display = "none";

  // Réinitialiser les données
  currentEditingCommande = null;
  editFormules = [];
  editProduits = [];
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

// ===============================================
// CHARGEMENT DES DONNÉES POUR LA MODALE
// ===============================================

async function loadDataForModal() {
  try {
    // Charger formules, produits et unités en parallèle
    const [formules, produits, unites] = await Promise.all([
      getFormules(),
      getProduits(),
      getUnite(),
    ]);

    // Stocker dans les variables globales
    allFormules = formules;
    allProduits = produits;
    allUnites = unites;

    // Remplir les sélecteurs
    populateFormuleSelector();
    populateProduitSelector();
    populateUniteSelect();
  } catch (error) {
    console.error("Erreur chargement données modale :", error);
    showToast("Erreur lors du chargement des données pour la modale.", "error");
  }
}

function populateFormuleSelector() {
  const select = document.getElementById("formule-select");
  select.innerHTML = '<option value="">-- Sélectionner une formule --</option>';

  allFormules.forEach((formule) => {
    const option = document.createElement("option");
    option.value = formule.id;
    option.textContent = `${formule.name.trim()} - (${formule.type_formule.trim()})`;
    select.appendChild(option);
  });
}

function populateProduitSelector() {
  const select = document.getElementById("produit-select");
  select.innerHTML = '<option value="">-- Sélectionner un produit --</option>';

  allProduits.forEach((produit) => {
    const option = document.createElement("option");
    option.value = produit.id;
    option.textContent = produit.name.trim();
    select.appendChild(option);
  });
}

function populateUniteSelect() {
  const select = document.getElementById("produit-unite");
  select.innerHTML = '<option value="">-- Unité --</option>';

  allUnites.forEach((unite) => {
    const option = document.createElement("option");
    option.value = unite.nom.trim();
    option.textContent = unite.nom.trim();
    select.appendChild(option);
  });

  // Sélectionner "unité" par défaut
  if (select.querySelector('option[value="unité"]')) {
    select.value = "unité";
    console.log('✅ "unité" sélectionnée par défaut dans produit-unité');
  }
}

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayTempFormules() {
  const container = document.getElementById("formules-list");
  const count = document.getElementById("formules-count");

  count.textContent = tempFormules.length;

  if (tempFormules.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucune formule ajoutée.</p>';
    return;
  }

  container.innerHTML = "";

  tempFormules.forEach((formule, index) => {
    const div = document.createElement("div");
    div.className = "item-row";

    // Afficher un badge si des produits sont exclus de la formule
    const exclusionsDisplay =
      formule.produits_exclus && formule.produits_exclus.length > 0
        ? `
          <span class="exclusions-badge">🚫 ${formule.produits_exclus.length} produit(s) exclu(s)</span>
          <span class="exclusions-warning" title="⚠️ Des produits ont été exclus de cette fomrule">❗</span>
        `
        : "";

    div.innerHTML = `
        <div class="item-info">
          <div class="item-name">${formule.formule_name}</div>
          <div class="item-detail">
            ${formule.formule_type} • ${formule.couverts} couverts
            ${exclusionsDisplay}
          </div>

          <!-- Zone de composition (cachée par défaut) -->
          <div id="composition-${index}" class="formule-composition" style="display: none; margin-top: 10px;">
            <p><strong>📦 Composition :</strong></p>
            <div id="produits-formule-${index}">
              <em>Chargement...</em>
            </div>
          </div>
        </div>

        <div class="item-actions">
          <!-- Bouton pour voir/cacher la composition -->
          <button class="btn-icon" onclick="toggleComposition(${index})" title="Voir la composition">
            <span id="toggle-icon-${index}">👁️</span>
          </button>
          <button class="btn-icon" onclick="handleRemoveFormule(${index})" title="Retirer">🗑️</button>
        </div>
      `;

    container.appendChild(div);
  });
}

// ===============================================
// V2 MODIFICATIONS - GESTION DE LA COMPOSITION DES FORMULES
// ===============================================

async function toggleComposition(index) {
  console.log("🔍 toggleComposition appelée avec index:", index);

  const compositionDiv = document.getElementById(`composition-${index}`);
  const icon = document.getElementById(`toggle-icon-${index}`);

  console.log("📦 compositionDiv:", compositionDiv);
  console.log("👁️ icon:", icon);

  // Vérifier que les éléments existent
  if (!compositionDiv || !icon) {
    console.error(
      "❌ Élément manquant ! compositionDiv:",
      compositionDiv,
      "icon:",
      icon,
    );
    showToast("Erreur d'affichage. Veuillez réessayer.", "error");
    return;
  }

  // Toggle affichage (afficher/cacher)
  if (compositionDiv.style.display === "none") {
    // On affiche
    compositionDiv.style.display = "block";
    icon.textContent = "👁️‍🗨️";

    // Charger les produits de la formule
    await loadFormuleProduits(index);
  } else {
    // On cache
    compositionDiv.style.display = "none";
    icon.textContent = "👁️";
  }
}

async function loadFormuleProduits(index) {
  const formule = tempFormules[index];
  const container = document.getElementById(`produits-formule-${index}`);

  try {
    const produits = await getFormuleProduits(formule.formule_id);

    if (produits.length === 0) {
      container.innerHTML =
        '<p class="empty-list">Aucun produit dans cette formule.</p>';
      return;
    }

    // Afficher la liste des produits avec checkboxes
    container.innerHTML = "";

    // Ajouter un message d'instruction
    const infoDiv = document.createElement("div");
    infoDiv.className = "composition-info";
    infoDiv.innerHTML = `
      <p style:"margin: 0 0 12px 0; padding: 10 px; background: #fffbea; border-left: 4px solid #f5c05c; color: #555; font-size: 13px; border-radius: 4px; line-height: 1.5;">
        💡 <strong>Décochez</strong> les produits que vous souhaitez exclure de la formule pour cette commande.
      </p>
    `;
    container.appendChild(infoDiv);

    // Liste des produits
    const produitsContainer = document.createElement("div");
    produitsContainer.id = `produits-container-${index}`;

    produits.forEach((produit) => {
      const produitData = allProduits.find((p) => p.id === produit.produit_id);
      const produitName = produitData ? produitData.name : "Produit Inconnu";

      const isExcluded = formule.produits_exclus.includes(produit.produit_id);
      const isChecked = !isExcluded;

      // Créer la ligne avec checkbox
      const checkboxDiv = document.createElement("div");
      checkboxDiv.className = "produit-checkbox";
      checkboxDiv.innerHTML = `
        <label>
          <input
            type="checkbox"
            ${isChecked ? "checked" : ""}
            data-produit-id="${produit.produit_id}"
            onchange="handleProduitCheckChange(${index})"
          />
          <span style="font-style: italic;">${produitName}</span>          
        </label>
      `;

      produitsContainer.appendChild(checkboxDiv);
    });
    container.appendChild(produitsContainer);

    // Bouton "Exclure"
    const btnDiv = document.createElement("div");
    btnDiv.style.marginTop = "15px";
    btnDiv.style.textAlign = "center";
    btnDiv.innerHTML = `
      <button
        type="button"
        class="btn-exclude"
        onclick="confirmExclusions(${index})"
      >
        🚫 Exclure les produits décochés
      </button>
    `;
    container.appendChild(btnDiv);
  } catch (error) {
    console.error(
      "Erreur lors du chargement des produits de la formule :",
      error,
    );
    container.innerHTML =
      '<p style="color: red;">Erreur lors du chargement des produits.</p>';
  }
}

// Gérer le changement de checkbox
function handleProduitCheckChange(index) {
  const container = document.getElementById(`produits-container-${index}`);
  const checkboxes = container.querySelectorAll('input[type="checkbox"]');

  checkboxes.forEach((checkbox) => {
    const label = checkbox.closest("label");
    if (checkbox.checked) {
      label.classList.remove("produit-unchecked");
    } else {
      label.classList.add("produit-unchecked");
    }
  });
}

// Confirmer les exclusions
function confirmExclusions(index) {
  const formule = tempFormules[index];
  const container = document.getElementById(`produits-container-${index}`);
  const checkboxes = container.querySelectorAll('input[type="checkbox"]');

  // Récupérer les produits décochés
  const produitsAExclure = [];
  checkboxes.forEach((checkbox) => {
    if (!checkbox.checked) {
      const produitId = checkbox.getAttribute("data-produit-id");
      const produitName = checkbox.nextElementSibling.textContent;
      produitsAExclure.push({ id: produitId, name: produitName });
    }
  });

  // Si aucun produit à exclure
  if (produitsAExclure.length === 0) {
    formule.produits_exclus = [];
    showToast("Aucun produit exclu. La formule est complète.", "info");
    displayTempFormules();
    return;
  }

  // Construire le message de confirmation
  const listeProduits = produitsAExclure.map((p) => `• ${p.name}`).join("\n");
  const message = `Êtes-vous sûr de vouloir exclure les produits suivants de la formule "${formule.formule_name}" ?\n\n${listeProduits}`;

  if (confirm(message)) {
    // Mettre à jour la liste des exclusions
    formule.produits_exclus = produitsAExclure.map((p) => p.id);

    showToast(
      `${produitsAExclure.length} produit(s) exclu(s) de la formule.`,
      "success",
    );
    displayTempFormules();
  } else {
    showToast("Exclusion annulée. La formule reste complète.", "info");
  }
}

function handleRemoveFormule(index) {
  tempFormules.splice(index, 1);
  displayTempFormules();
  showToast("Formule retirée.", "info");
}

function handleRemoveProduit(index) {
  tempProduits.splice(index, 1);
  displayTempProduits();
  showToast("Produit retiré.", "info");
}

function displayTempProduits() {
  const container = document.getElementById("produits-list");
  const count = document.getElementById("produits-count");

  count.textContent = tempProduits.length;

  if (tempProduits.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucun produit ajouté.</p>';
    return;
  }

  container.innerHTML = "";

  tempProduits.forEach((produit, index) => {
    const div = document.createElement("div");
    div.className = "item-row";

    div.innerHTML = `
      <div class="item-info">
        <div class="item-name">${produit.produit_name}</div>
        <div class="item-detail">${produit.quantite} ${produit.unite}</div>
      </div>
      <div class="item-actions">
        <button class="btn-icon" onclick="handleRemoveProduit(${index})" title="Retirer">🗑️</button>
      </div>
    `;

    container.appendChild(div);
  });
}

function handleAddFormule() {
  const formulesSelect = document.getElementById("formule-select");
  const formuleId = formulesSelect.value;
  const couverts = parseInt(document.getElementById("formule-couverts").value);

  // Validation
  if (!formuleId) {
    showToast("Veuillez sélectionner une formule.", "warning");
    return;
  }

  if (!couverts || couverts < 1) {
    showToast("Le nombre de couverts doit être au moins 1.", "warning");
    return;
  }

  // Vérifier si la formule est déjà ajoutée
  const dejaAjoute = tempFormules.find((f) => f.formule_id === formuleId);
  if (dejaAjoute) {
    showToast("Cette formule a déjà été ajoutée.", "warning");
    return;
  }

  // trouver le nom de la formule dans allFormules
  const formule = allFormules.find((f) => f.id === formuleId);

  if (!formule) {
    showToast("Erreur : Formule introuvable.", "error");
    return;
  }

  // Ajouter à la liste temporaire avec TOUTES les infos
  tempFormules.push({
    formule_id: formuleId,
    formule_name: formule.name,
    formule_type: formule.type_formule,
    couverts: couverts,
    produits_exclus: [],
    expanded: false,
  });

  // Mettre à jour l'affichage
  displayTempFormules();

  // Réinitialiser le formulaire
  formulesSelect.value = "";

  const nombreCouverts = document.getElementById(
    "create-nombre-couverts",
  ).value;
  document.getElementById("formule-couverts").value = nombreCouverts;

  showToast("Formule ajoutée.", "success");
}

function handleAddProduit() {
  const produitSelect = document.getElementById("produit-select");
  const produitId = produitSelect.value;
  const quantite = parseFloat(
    document.getElementById("produit-quantite").value,
  );
  const unite = document.getElementById("produit-unite").value;

  // Validation
  if (!produitId) {
    showToast("Veuillez sélectionner un produit.", "warning");
    return;
  }

  if (!quantite || quantite <= 0) {
    showToast("La quantité doit être supérieur à 0.", "warning");
    return;
  }

  if (!unite) {
    showToast("Veuillez sélectionner une unité.", "warning");
    return;
  }

  // Vérifier si le produit n'est pas djà ajouté
  const dejaAjoute = tempProduits.find((p) => p.produit_id === produitId);
  if (dejaAjoute) {
    showToast("Ce produit a déjà été ajouté.", "warning");
    return;
  }

  // Trouver le nom du produit
  const produit = allProduits.find((p) => p.id === produitId);

  if (!produit) {
    showToast("Erreur : Produit introuvable.", "error");
    return;
  }

  // Ajouter à la liste temporaire
  tempProduits.push({
    produit_id: produitId,
    produit_name: produit.name,
    quantite: quantite,
    unite: unite,
  });

  // Mettre à jour l'affichage
  displayTempProduits();

  // Réinitialiser le formulaire
  produitSelect.value = "";
  document.getElementById("produit-quantite").value = "1";

  // Remettre "unité" par défaut
  const uniteSelect = document.getElementById("produit-unite");
  if (uniteSelect.querySelector('option[value="unité"]')) {
    uniteSelect.value = "unité";
  }
  showToast("Produit ajouté.", "success");
}

async function handleCreateCommande() {
  // ==========================================
  // 1. RÉCUPÉRER LES DONNÉES DU FORMULAIRE
  // ==========================================

  const nomClient = document.getElementById("create-nom-client").value.trim();
  const deliveryDate = document.getElementById("create-delivery-date").value;
  const deliveryHour = document.getElementById("create-delivery-hour").value;
  const nombreCouverts = parseInt(
    document.getElementById("create-nombre-couverts").value,
  );
  const avecService = document.getElementById("create-avec-service").checked;
  const notes = document.getElementById("create-notes").value.trim();

  // ==========================================
  // 2. VALIDATION DES DONNÉES
  // ==========================================

  // Valider le nom du client
  if (!nomClient) {
    showToast("Le nom du client est obligatoire.", "error");
    return;
  }

  // Valider la date
  if (!deliveryDate) {
    showToast("La date de livraison est obligatoire.", "error");
    return;
  }

  // Valider l'heure
  if (!deliveryHour) {
    showToast("L'heure de livraison est obligatoire.", "error");
    return;
  }

  // Valider le nombre de couverts
  if (!nombreCouverts || nombreCouverts < 1) {
    showToast("Le nombre de couverts doit être au moins 1.", "error");
    return;
  }

  // Valider qu'il y a au moins une formule ou un produit
  if (tempFormules.length === 0 && tempProduits.length === 0) {
    showToast("Veuillez ajouter au moins une formule ou un produit.", "error");
    return;
  }

  // ==========================================
  // 3. CRÉER LA COMMANDE
  // ==========================================

  try {
    // Préparer les données de la commande
    const commandeData = {
      nom_client: nomClient,
      delivery_date: deliveryDate,
      delivery_hour: deliveryHour,
      nombre_couverts: nombreCouverts,
      avec_service: avecService,
      service: avecService, // Pour compatibilité avec l'API
      notes: notes || null, // null si vide
    };

    console.log("📤 Création de la commande:", commandeData);

    // Appel API pour créer la commande
    const nouvelleCommande = await createCommande(commandeData);

    console.log("✅ Commande créée:", nouvelleCommande);

    // ==========================================
    // 4. AJOUTER LES FORMULES
    // ==========================================

    if (tempFormules.length > 0) {
      console.log(`📦 Ajout de ${tempFormules.length} formule(s)...`);

      for (const formule of tempFormules) {
        const formuleData = {
          commande_id: nouvelleCommande.id,
          formule_id: formule.formule_id,
          quantite_recommandee: formule.couverts,
          quantite_finale: formule.couverts,
        };

        console.log("  ➕ Ajout formule:", formuleData);
        await createCommandeFormule(formuleData);
      }

      console.log("✅ Formules ajoutées");
    }

    // ==========================================
    // 5. AJOUTER LES PRODUITS
    // ==========================================

    if (tempProduits.length > 0) {
      console.log(`📦 Ajout de ${tempProduits.length} produit(s)...`);

      for (const produit of tempProduits) {
        const produitData = {
          commande_id: nouvelleCommande.id,
          produit_id: produit.produit_id,
          quantite: produit.quantite,
          unite: produit.unite,
        };

        console.log("  ➕ Ajout produit:", produitData);
        await createCommandeProduit(produitData);
      }

      console.log("✅ Produits ajoutés");
    }

    // ==========================================
    // 6. RAFRAÎCHIR LA LISTE
    // ==========================================

    console.log("🔄 Rafraîchissement de la liste...");
    await loadCommandes();

    // ==========================================
    // 7. FERMER LA MODALE
    // ==========================================

    closeCreateCommandeModal();

    // ==========================================
    // 8. AFFICHER LE SUCCÈS
    // ==========================================

    showToast(`Commande "${nomClient}" créée avec succès ! 🎉`, "success");
  } catch (error) {
    console.error("❌ Erreur lors de la création de la commande:", error);
    showToast(
      "Erreur lors de la création de la commande. Vérifiez la console.",
      "error",
    );
  }
} // ===============================================
// GESTION DES ONGLETS ET ARCHIVAGE
// ===============================================

function handleTabActive() {
  currentTab = "active";

  // Mettre à jour les classes CSS
  document.getElementById("tab-active").classList.add("active");
  document.getElementById("tab-archived").classList.remove("active");

  // Réinitialiser les filtres
  handleResetFilters();

  // Recharger les commandes actives
  loadCommandes();
}

function handleTabArchived() {
  currentTab = "archived";

  // Mettre à jour les classes CSS
  document.getElementById("tab-active").classList.remove("active");
  document.getElementById("tab-archived").classList.add("active");

  // Réinitialiser les filtres
  handleResetFilters();

  // Recharger les commandes archivées
  loadCommandes();
}

async function handleArchiveCommande(commandeId) {
  if (!confirm("Voulez-vous archiver cette commande?")) {
    return;
  }

  try {
    await archiveCommande(commandeId);
    showToast("Commande archivée avec succès.", "success");
    await loadCommandes();
  } catch (error) {
    console.error("Erreur lors de l'archivage de la commande :", error);
    showToast("Erreur lors de l'archivage de la commande.", "error");
  }
}

async function handleAutoArchive() {
  if (
    !confirm("Voulez-vous archiver toutes les commandes de plus de 2 jours?")
  ) {
    return;
  }

  try {
    const result = await autoArchiveCommandes();
    showToast(result.message, "success");

    // Recharger les commandes
    await loadCommandes();
  } catch (error) {
    console.error("Erreur lors de l'auto-archivage :", error);
    showToast("Erreur lors de l'auto-archivage des commandes.", "error");
  }
}
