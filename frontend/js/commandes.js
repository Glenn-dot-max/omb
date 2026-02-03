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

  // Fermer le modal avec le X
  const closeCreateModal = document.getElementById("close-create-modal");
  closeCreateModal.addEventListener("click", closeCreateCommandeModal);

  // Fermer le bouton Annuler
  const cancelCreate = document.getElementById("cancel-create");
  cancelCreate.addEventListener("click", closeCreateCommandeModal);

  // Créer la commande
  const saveCreate = document.getElementById("save-create-commande");
  saveCreate.addEventListener("click", handleCreateCommande);

  // Ajouter une formule
  const addFormulebtn = document.getElementById("add-formule-btn");
  addFormulebtn.addEventListener("click", handleAddFormule);

  // Ajouter un produit
  const addProduitbtn = document.getElementById("add-produit-btn");
  addProduitbtn.addEventListener("click", handleAddProduit);

  // Fermer en cliquant sur le fond gris
  const createModal = document.getElementById("create-modal");
  createModal.addEventListener("click", (event) => {
    if (event.target === createModal) {
      closeCreateCommandeModal();
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
    option.textContent = `${formule.name} - (${formule.type_formule})`;
    select.appendChild(option);
  });
}

function populateProduitSelector() {
  const select = document.getElementById("produit-select");
  select.innerHTML = '<option value="">-- Sélectionner un produit --</option>';

  allProduits.forEach((produit) => {
    const option = document.createElement("option");
    option.value = produit.id;
    option.textContent = produit.name;
    select.appendChild(option);
  });
}

function populateUniteSelect() {
  const select = document.getElementById("produit-unite");
  select.innerHTML = '<option value="">-- Unité --</option>';

  allUnites.forEach((unite) => {
    const option = document.createElement("option");
    option.value = unite.nom;
    option.textContent = unite.nom;
    select.appendChild(option);
  });
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

  // Mettre à jour le compteur
  count.textContent = tempFormules.length;

  // Si vide, afficher un message
  if (tempFormules.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucune formule ajoutée.</p>';
    return;
  }

  // Vider le container
  container.innerHTML = "";

  // Pour chaque formule, créer un élément visuel
  tempFormules.forEach((formule, index) => {
    const div = document.createElement("div");
    div.className = "item-row";

    div.innerHTML = `
      <div class="item-info">
        <div class="item-name">${formule.formule_name}</div>
        <div class="item-details">${formule.formule_type} • ${formule.couverts} couverts</div>
      </div>
      <div class="item-actions">
        <button class="btn-icon" onclick="handleRemoveFormule(${index})" title="Retirer">🗑️</button>
      </div>
    `;

    container.appendChild(div);
  });
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
        <div class="item-details">${produit.quantite} ${produit.unite}</div>
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
  document.getElementById("formule-couverts").value = "1";

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
  document.getElementById("produit-unite").value = "";

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
}
