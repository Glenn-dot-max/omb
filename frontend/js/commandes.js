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

  // afficher la date de Paris dans la console
  console.log(`📅 Date actuelle à Paris: ${window.parisDate}`);
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
        console.log(` ℹ️ Décalage horaire détecté:`);
        console.log(`   - Date locale: ${localDate}`);
        console.log(`   - Date de Paris: ${parisDateFormatted}`);
      }
    }
  }
}

// ===============================================
// CHARGEMENT DES COMMANDES
// ===============================================

async function loadCommandes() {
  try {
    const commandesList = document.getElementById("commandes-list");
    commandesList.innerHTML = '<div class="loader"></div>';

    // Charger selon l'onglet actif
    let response;
    if (currentTab === "active") {
      response = await getCommandes();
    } else {
      response = await getArchivedCommandes();
    }

    // Extraire les commandes et la date de Paris
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

  let todayParis;
  if (window.parisDate) {
    const [pYear, pMonth, pDay] = window.parisDate.split("-").map(Number);
    todayParis = new Date(pYear, pMonth - 1, pDay);
    todayParis.setHours(0, 0, 0, 0);
  } else {
    todayParis = new Date();
    todayParis.setHours(0, 0, 0, 0);
  }

  const tomorrow = new Date(todayParis);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayAfterTomorrow = new Date(todayParis);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  const in7Days = new Date(todayParis);
  in7Days.setDate(in7Days.getDate() + 7);

  const in14Days = new Date(todayParis);
  in14Days.setDate(in14Days.getDate() + 14);

  // Créer les groupes
  const commandesAujourdHui = [];
  const commandesDemain = [];
  const commandesCetteSemaine = [];
  const commandesSemaineProchaine = [];
  const commandesPlusTard = [];

  commandes.forEach((commande) => {
    const deliveryDateOnly = commande.delivery_date.split("T")[0];
    const [year, month, day] = deliveryDateOnly.split("-").map(Number);
    const commandeDate = new Date(year, month - 1, day);
    commandeDate.setHours(0, 0, 0, 0);

    if (commandeDate.getTime() === todayParis.getTime()) {
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
      subtitle: getDateLabel(todayParis),
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

  const isValidated = commande.validated !== false;
  div.className = `product-item ${isUrgent ? "urgent-item" : ""} ${!isValidated ? "non-validated" : ""}`;

  // Nom du client
  const nameSpan = document.createElement("span");
  nameSpan.className = "product-name";
  nameSpan.textContent = commande.nom_client;

  // Bandeau
  const bandeau = document.createElement("div");
  bandeau.className = "product-bandeau";

  // Date de livraison dans le bandeau
  const dateSpan = document.createElement("span");
  const dateInfo = getDateInfo(commande.delivery_date);
  dateSpan.textContent = `📅 ${dateInfo.text}`;
  dateSpan.style.fontWeight = dateInfo.urgent ? "bold" : "normal";
  dateSpan.style.color = "#f5a623";
  bandeau.appendChild(dateSpan);

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

  // ==================================
  // SI LA COMMANDE N'EST PAS VALIDÉE
  // ==================================
  if (!isValidated) {
    const validationOverlay = document.createElement("div");
    validationOverlay.className = "validation-overlay";
    validationOverlay.innerHTML = `
      <div class="validation-message">⚠️ Commande en attente de validation</div>
      <div class="validation-actions">
        <button class="validate-btn">✅ Confirmer la commande</button>
        <button class="edit-commande-btn">✏️ Modifier la commande</button>
        <button class="refuse-btn">❌ Abandonner</button>
      </div>
    `;

    // Événements pour les boutons de l'overlay
    const btnConfirm = validationOverlay.querySelector(".validate-btn");
    const btnAbandon = validationOverlay.querySelector(".refuse-btn");
    const btnEdit = validationOverlay.querySelector(".edit-commande-btn");

    btnConfirm.onclick = (e) => {
      e.stopPropagation();
      handleValidateCommande(commande.id);
    };

    btnAbandon.onclick = (e) => {
      e.stopPropagation();
      handleDeleteCommande(commande.id);
    };

    btnEdit.onclick = (e) => {
      e.stopPropagation();
      handleEditCommande(commande);
    };

    div.appendChild(validationOverlay);
  } else {
    // ==================================
    // SI LA COMMANDE EST VALIDÉE (AFFICHAGE NORMAL)
    // ==================================

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
  }

  // Assembler l'élément commande
  div.appendChild(nameSpan);
  div.appendChild(bandeau);
  div.appendChild(detailsDiv);
  div.appendChild(actionsDiv);

  return div;
}

// ===============================================
// VALIDATION D'UNE COMMANDE
// ===============================================

async function handleValidateCommande(commandeId) {
  try {
    await validateCommande(commandeId);
    showToast("✅ Commande validée avec succès!", "success");
    await loadCommandes();
  } catch (error) {
    console.error("Erreur lors de la validation de la commande :", error);
    showToast("Erreur lors de la validation de la commande.", "error");
  }
}

// ===============================================
// FONCTIONS UTILITAIRES
// ===============================================

function getDateInfo(dateString) {
  let today;
  if (window.parisDate) {
    const [pYear, pMonth, pDay] = window.parisDate.split("-").map(Number);
    today = new Date(pYear, pMonth - 1, pDay);
    today.setHours(0, 0, 0, 0);
  } else {
    today = new Date();
    today.setHours(0, 0, 0, 0);
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const deliveryDateOnly = dateString.split("T")[0];
  const [year, month, day] = deliveryDateOnly.split("-").map(Number);
  const commandeDate = new Date(year, month - 1, day);
  commandeDate.setHours(0, 0, 0, 0);

  if (commandeDate.getTime() === today.getTime()) {
    return { text: "Aujourd'hui", urgent: true };
  } else if (commandeDate.getTime() === tomorrow.getTime()) {
    return { text: "Demain", urgent: true };
  } else {
    const displayDate = new Date(year, month - 1, day);
    displayDate.setHours(0, 0, 0, 0);
    return {
      text: displayDate.toLocaleDateString("fr-FR"),
      urgent: false,
    };
  }
}

function updateCommandesCount() {
  const count = document.getElementById("commandes-count");
  count.textContent = `${allCommandes.length} commande${allCommandes.length > 1 ? "s" : ""}`;
}

// ===============================================
// VERIFIER SI LA MODALE CONTIENT DES DONNÉES
// ===============================================

function hasUnsavedData() {
  const nomClient = document.getElementById("create-nom-client")?.value.trim();
  const notes = document.getElementById("create-notes")?.value.trim();
  const nombreCouverts = document.getElementById(
    "create-nombre-couverts",
  )?.value;

  const hasFormules = tempFormules.length > 0;
  const hasProduits = tempProduits.length > 0;

  const couvertsModified = nombreCouverts && parseInt(nombreCouverts) !== 1;

  return nomClient || notes || hasFormules || hasProduits || couvertsModified;
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
  // EDIT MODAL EVENT LISTENERS
  // ===============================================

  const closeEditModalBtn = document.getElementById("close-edit-modal");
  closeEditModalBtn.addEventListener("click", closeEditModal);

  const cancelEdit = document.getElementById("cancel-edit");
  cancelEdit.addEventListener("click", closeEditModal);

  const saveEdit = document.getElementById("save-edit-commande");
  saveEdit.addEventListener("click", handleSaveEditCommande);

  const addEditFormule = document.getElementById("edit-add-formule-btn");
  addEditFormule.addEventListener("click", handleAddEditFormule);

  const addEditProduit = document.getElementById("edit-add-produit-btn");
  addEditProduit.addEventListener("click", handleAddEditProduit);

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
    let today;
    if (window.parisDate) {
      const [pYear, pMonth, pDay] = window.parisDate.split("-").map(Number);
      today = new Date(pYear, pMonth - 1, pDay);
      today.setHours(0, 0, 0, 0);
    } else {
      today = new Date();
      today.setHours(0, 0, 0, 0);
    }

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
  console.log("Ouverture de la modale de création");

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
  document.getElementById("create-en-attente").checked = false;
  document.getElementById("create-notes").value = "";
  document.getElementById("formule-couverts").value = "1";

  // 4. Afficher les listes vides
  displayTempFormules();
  displayTempProduits();

  // 5. Afficher la modale
  document.getElementById("create-modal").style.display = "block";
}

function closeCreateCommandeModal() {
  if (hasUnsavedData()) {
    const confirmMsg =
      "⚠️ Êtes-vous sûr de vouloir arrêter la création de cette commande ?\n\n" +
      "❌ Les informations saisies ne seront pas récupérables.\n\n" +
      "Cliquez sur OK pour quitter sans sauvegarder.";

    if (!confirm(confirmMsg)) {
      return;
    }
  }

  document.getElementById("create-modal").style.display = "none";
  tempFormules = [];
  tempProduits = [];
  document.getElementById("create-nom-client").value = "";
  document.getElementById("create-notes").value = "";
  document.getElementById("create-nombre-couverts").value = "1";
}

async function handleCreateCommande() {
  // ==========================================
  // VÉRIFICATION : Exclusions non confirmées
  // ==========================================

  for (let index = 0; index < tempFormules.length; index++) {
    const compositionDiv = document.getElementById(`composition-${index}`);

    if (compositionDiv && compositionDiv.style.display !== "none") {
      const container = document.getElementById(`produits-container-${index}`);

      if (container) {
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        const uncheckedCount = Array.from(checkboxes).filter(
          (cb) => !cb.checked,
        ).length;

        if (uncheckedCount > 0) {
          const formule = tempFormules[index];

          const alertMessage =
            `⚠️ ATTENTION !\n\n` +
            `Vous avez décoché ${uncheckedCount} produit(s) dans la formule "${formule.formule_name}"\n` +
            `mais vous n'avez PAS cliqué sur le bouton "🚫 Exclure les produits décochés".\n\n` +
            `❌ Ces exclusions ne seront PAS prises en compte !\n\n` +
            `Voulez-vous continuer la création SANS ces exclusions ?\n\n` +
            `(Cliquez "Annuler" pour revenir en arrière et confirmer les exclusions)`;

          if (!confirm(alertMessage)) {
            showToast(
              "Création annulée. Veuillez confirmer les exclusions avant de continuer.",
              "info",
            );
            return;
          }
        }
      }
    }
  }

  // ==========================================
  // RÉCUPÉRATION DES VALEURS DU FORMULAIRE
  // ==========================================

  const nomClient = document.getElementById("create-nom-client").value.trim();
  const deliveryDate = document.getElementById("create-delivery-date").value;
  const deliveryHour = document.getElementById("create-delivery-hour").value;
  const nombreCouverts = parseInt(
    document.getElementById("create-nombre-couverts").value,
  );
  const avecService = document.getElementById("create-avec-service").checked;
  const enAttente = document.getElementById("create-en-attente").checked;
  const notes = document.getElementById("create-notes").value.trim();

  // ==========================================
  // ✅ VALIDATION : DATE DANS LE PASSÉ
  // ==========================================

  let todayParis;
  if (window.parisDate) {
    const [pYear, pMonth, pDay] = window.parisDate.split("-").map(Number);
    todayParis = new Date(pYear, pMonth - 1, pDay);
    todayParis.setHours(0, 0, 0, 0);
  } else {
    todayParis = new Date();
    todayParis.setHours(0, 0, 0, 0);
  }

  const [year, month, day] = deliveryDate.split("-").map(Number);
  const selectedDate = new Date(year, month - 1, day);
  selectedDate.setHours(0, 0, 0, 0);

  if (selectedDate < todayParis) {
    showToast(
      `❌ La date de livraison est dans le passé !\n\n` +
        `📅 Date sélectionnée : ${selectedDate.toLocaleDateString("fr-FR")}\n` +
        `📅 Date actuelle (Paris) : ${todayParis.toLocaleDateString("fr-FR")}\n\n` +
        `⚠️ Veuillez choisir une date égale ou postérieure à aujourd'hui.`,
      "error",
    );
    return;
  }

  // ==========================================
  // VALIDATION DES AUTRES CHAMPS
  // ==========================================

  if (!nomClient) {
    showToast("Veuillez entrer le nom du client.", "warning");
    return;
  }

  if (!deliveryDate) {
    showToast("Veuillez sélectionner une date de livraison.", "warning");
    return;
  }

  if (!deliveryHour) {
    showToast("Veuillez sélectionner une heure de livraison.", "warning");
    return;
  }

  if (!nombreCouverts || nombreCouverts < 1) {
    showToast("Le nombre de couverts doit être au moins de 1.", "warning");
    return;
  }

  if (tempFormules.length === 0 && tempProduits.length === 0) {
    showToast(
      "Veuillez ajouter au moins une formule ou un produit.",
      "warning",
    );
    return;
  }

  // ==========================================
  // CRÉATION DE LA COMMANDE
  // ==========================================

  try {
    console.log("📝 Création de la commande...");

    const commandeData = {
      nom_client: nomClient,
      delivery_date: deliveryDate,
      delivery_hour: deliveryHour,
      nombre_couverts: nombreCouverts,
      avec_service: avecService,
      service: avecService,
      notes: notes || null,
      validated: !enAttente,
    };

    console.log("Données de la commande :", commandeData);

    const createdCommande = await createCommande(commandeData);
    console.log("✅ Commande créée :", createdCommande);

    // Ajouter les formules
    if (tempFormules.length > 0) {
      console.log(`➕ Ajout de ${tempFormules.length} formule(s)...`);
      for (const formule of tempFormules) {
        const formuleData = {
          commande_id: createdCommande.id,
          formule_id: formule.formule_id,
          quantite_finale: formule.couverts,
          produits_exclus: formule.produits_exclus || [],
        };
        console.log("  - Ajout formule:", formuleData);
        await createCommandeFormule(formuleData);
      }
      console.log("✅ Formules ajoutées.");
    }

    // Ajouter les produits
    if (tempProduits.length > 0) {
      console.log(`➕ Ajout de ${tempProduits.length} produit(s)...`);
      for (const produit of tempProduits) {
        const produitData = {
          commande_id: createdCommande.id,
          produit_id: produit.produit_id,
          quantite: produit.quantite,
          unite: produit.unite,
        };
        await createCommandeProduit(produitData);
      }
      console.log("✅ Produits ajoutés.");
    }

    // Rafraîchir la liste et fermer la modale
    await loadCommandes();
    closeCreateCommandeModal();

    const messageValidation = enAttente
      ? "⏳ Commande créée en attente de validation."
      : "✅ Commande créée et validée avec succès !";

    showToast(messageValidation, "success");
  } catch (error) {
    console.error("❌ Erreur lors de la création de la commande :", error);
    showToast(
      "Erreur lors de la création de la commande. Vérifiez la console pour plus de détails.",
      "error",
    );
  }
}

// ===============================================
// SUITE DU FICHIER (partie 2 suit dans le prochain message)
// ===============================================
