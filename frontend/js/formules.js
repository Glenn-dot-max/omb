// js/formules.js
// Logique de la page formules : affichage, ajout, suppression, recherche

// ===========================================
// VARIABLES GLOBALES
// ===========================================

let allFormules = [];

let currentTypeFilter = "";
let currentSearchTerm = "";

let currentEditingFormule = null;
let tempProduitsToCreate = [];

let allUnite = [];

// ===========================================
// INITIALISATION AU CHARGEMENT DE LA PAGE
// ===========================================

document.addEventListener("DOMContentLoaded", () => {
  loadInitialData();
  setupEventListeners();
});

async function loadInitialData() {
  await loadFormules();
  await loadUnite();
}

// ============================================
// CHARGEMENT DES UNITÉS
// ============================================

async function loadUnite() {
  try {
    allUnite = await getUnite();
    populateUniteSelects();
  } catch (error) {
    console.error("Erreur lors du chargement des unités :", error);
  }
}

function populateUniteSelects() {
  const selects = [
    document.getElementById("produit-unite"),
    document.getElementById("create-produit-unite"),
  ];

  selects.forEach((select) => {
    if (select) {
      select.innerHTML = '<option value="">--Sélectionner--</option>';
      allUnite.forEach((unite) => {
        const option = document.createElement("option");
        option.value = unite.nom;
        option.textContent = unite.nom;
        select.appendChild(option);
      });

      // Sélectionner "pièces" par défaut si disponible
      if (select.querySelector('option[value="pièces"]')) {
        select.value = "pièces";
      }
    }
  });
}

// ===========================================
// CHARGEMENT DES FORMULES
// ===========================================

async function loadFormules() {
  try {
    const formulesList = document.getElementById("formules-list");
    formulesList.innerHTML = "<p>Chargement des formules...</p>";
    allFormules = await getFormules();
    displayFormules(allFormules);
  } catch (error) {
    console.error("Erreur lors du chargement des formules :", error);
    const formulesList = document.getElementById("formules-list");
    formulesList.innerHTML =
      '<p style="color: red;">Erreur lors du chargement des formules.</p>';
  }
}

// ===========================================
// AFFICHAGE DES FORMULES
// ===========================================

function displayFormules(formules) {
  const formulesList = document.getElementById("formules-list");

  if (formules.length === 0) {
    formulesList.innerHTML = "<p>Aucune formule disponible.</p>";
    return;
  }

  formulesList.innerHTML = "";

  formules.forEach((formule) => {
    const formuleItem = createFormuleElement(formule);
    formulesList.appendChild(formuleItem);
  });
}

function createFormuleElement(formule) {
  const div = document.createElement("div");
  div.className = "product-item";

  const nameSpan = document.createElement("span");
  nameSpan.className = "product-name";
  nameSpan.textContent = formule.name;

  const detailsDiv = document.createElement("div");
  detailsDiv.className = "product-details";

  // Badge nombre de couverts
  const couvertsBadge = document.createElement("span");
  couvertsBadge.className = "badge category";
  couvertsBadge.textContent = `${formule.nombre_couverts} couverts`;
  detailsDiv.appendChild(couvertsBadge);

  // Badge type de formule
  const typeBadge = document.createElement("span");
  typeBadge.className = "badge type";
  typeBadge.textContent = formule.type_formule;
  detailsDiv.appendChild(typeBadge);

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "product-actions";

  // Bouton modifier
  const editBtn = document.createElement("button");
  editBtn.className = "edit-btn";
  editBtn.textContent = "✏️ Modifier";
  editBtn.onclick = () => handleEditFormule(formule);

  // Bouton supprimer
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "🗑️ Supprimer";
  deleteBtn.onclick = () => handleDeleteFormule(formule.id);

  actionsDiv.appendChild(editBtn);
  actionsDiv.appendChild(deleteBtn);

  div.appendChild(nameSpan);
  div.appendChild(detailsDiv);
  div.appendChild(actionsDiv);

  return div;
}

// ===========================================
// GESTION DES ÉVÉNEMENTS
// ===========================================

function setupEventListeners() {
  const form = document.getElementById("add-formule-form");
  if (form) {
    form.addEventListener("submit", handleAddFormule);
  }

  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", handleSearch);

  const filterType = document.getElementById("filter-type");
  filterType.addEventListener("change", handleFilterChange);

  const resetBtn = document.getElementById("reset-filters");
  resetBtn.addEventListener("click", handleResetFilters);

  // Fermer tous les modales avec X
  const closeButtons = document.querySelectorAll(".close-modal");
  closeButtons.forEach((btn, index) => {
    btn.addEventListener("click", () => {
      if (index === 0) {
        closeDetailsModal();
      } else if (index === 1) {
        closeCreateFormuleModal();
      }
    });
  });

  const cancelDetails = document.getElementById("cancel-details");
  if (cancelDetails) {
    cancelDetails.addEventListener("click", closeDetailsModal);
  }

  const saveDetails = document.getElementById("save-formule-details");
  if (saveDetails) {
    saveDetails.addEventListener("click", handleSaveFormuleDetails);
  }

  // Fermer le modale de détails en cliquant en dehors
  const detailsModal = document.getElementById("details-modal");
  if (detailsModal) {
    detailsModal.addEventListener("click", (event) => {
      if (event.target === detailsModal) {
        closeDetailsModal();
      }
    });
  }

  const addProduitBtn = document.getElementById("add-produit-btn");
  if (addProduitBtn) {
    addProduitBtn.addEventListener("click", handleAddProduitToFormule);
  }

  // Modale de création
  const openCreateModal = document.getElementById("open-create-modal");
  if (openCreateModal) {
    openCreateModal.addEventListener("click", handleOpenCreateModal);
  }

  const cancelCreate = document.getElementById("cancel-create");
  if (cancelCreate) {
    cancelCreate.addEventListener("click", closeCreateFormuleModal);
  }

  const createAddProduitBtn = document.getElementById("create-add-produit-btn");
  if (createAddProduitBtn) {
    createAddProduitBtn.addEventListener("click", handleAddProduitToCreate);
  }

  const saveCreateFormule = document.getElementById("save-create-formule");
  if (saveCreateFormule) {
    saveCreateFormule.addEventListener(
      "click",
      handleCreateFormuleWithProduits,
    );
  }

  // Fermer la modale en cliquant en dehors
  const createModal = document.getElementById("create-modal");
  if (createModal) {
    createModal.addEventListener("click", (event) => {
      if (event.target === createModal) {
        closeCreateFormuleModal();
      }
    });
  }
}

// ===========================================
// GESTION DE L'AJOUT D'UNE FORMULE
// ===========================================

async function handleAddFormule(event) {
  event.preventDefault();

  const name = document.getElementById("formule-name").value.trim();
  const couverts = document.getElementById("formule-couverts").value;
  const type = document.getElementById("formule-type").value;

  if (!name) {
    alert("Le nom de la formule est requis.");
    return;
  }

  try {
    const nouvelleFormule = await createFormule({
      name: name,
      nombre_couverts: parseInt(couverts),
      type_formule: type,
    });

    allFormules.push(nouvelleFormule);
    displayFormules(allFormules);

    // Vider le formulaire
    document.getElementById("formule-name").value = "";
    document.getElementById("formule-couverts").value = "1";
    document.getElementById("formule-type").value = "Brunch";

    alert("Formule ajoutée avec succès !");
  } catch (error) {
    console.error("Erreur lors de l'ajout de la formule :", error);
    alert("Erreur lors de l'ajout de la formule.");
  }
}

// ===========================================
// GESTION DE LA SUPPRESSION D'UNE FORMULE
// ===========================================

async function handleDeleteFormule(formuleId) {
  if (!confirm("Êtes-vous sûr de vouloir supprimer cette formule ?")) {
    return;
  }

  try {
    await deleteFormule(formuleId);
    allFormules = allFormules.filter((f) => f.id !== formuleId);
    displayFormules(allFormules);
    alert("Formule supprimée avec succès !");
  } catch (error) {
    console.error("Erreur lors de la suppression de la formule :", error);
    alert("Erreur lors de la suppression de la formule.");
  }
}

// ===========================================
// GESTION DES DÉTAILS D'UNE FORMULE
// ===========================================

async function handleEditFormule(formule) {
  currentEditingFormule = formule;

  // Pré-remplir les informations générales
  document.getElementById("detail-formule-name").value = formule.name;
  document.getElementById("detail-formule-couverts").value =
    formule.nombre_couverts;
  document.getElementById("detail-formule-type").value = formule.type_formule;

  // Charger les produits de la formule
  await loadFormuleProduits(formule.id);

  // Charger la liste de tous les produits pour le select
  await loadProduitsForSelect();

  // Afficher la modale
  document.getElementById("details-modal").style.display = "block";
}

function closeDetailsModal() {
  document.getElementById("details-modal").style.display = "none";
  currentEditingFormule = null;

  // Vider les champs
  document.getElementById("detail-formule-name").value = "";
  document.getElementById("detail-formule-couverts").value = "1";
  document.getElementById("detail-formule-type").value = "Brunch";
  document.getElementById("produits-list").innerHTML =
    '<p class="empty-state">Aucun produit dans cette formule.</p>';
}

async function loadFormuleProduits(formuleId) {
  try {
    const produits = await getFormuleProduits(formuleId);
    displayFormuleProduits(produits);
  } catch (error) {
    console.error("Erreur chargement produits formule:", error);
  }
}

function displayFormuleProduits(produits) {
  const container = document.getElementById("produits-list");
  const count = document.getElementById("produits-count");

  count.textContent = produits.length;

  if (produits.length === 0) {
    container.innerHTML =
      '<p class="empty-state">Aucun produit dans cette formule.</p>';
    return;
  }

  container.innerHTML = "";

  produits.forEach((item) => {
    const div = document.createElement("div");
    div.className = "produit-item";

    div.innerHTML = `
      <div class="produit-info">
        <div class="produit-name">${item.produit_name || "Produit"}</div>
        <div class="produit-quantity">${item.quantite} ${item.unite || ""}</div>
      </div>
      <div class="produit-actions">
        <button class="btn-icon" onclick="handleRemoveProduitFromFormule(${item.id})" title="Retirer">🗑️</button>
      </div>
    `;

    container.appendChild(div);
  });
}

async function loadProduitsForSelect() {
  try {
    const produits = await getProduits();
    const select = document.getElementById("produit-select");

    select.innerHTML =
      '<option value="">-- Sélectionner un produit --</option>';

    produits.forEach((produit) => {
      const option = document.createElement("option");
      option.value = produit.id;
      option.textContent = produit.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Erreur chargement produits:", error);
  }
}

async function handleAddProduitToFormule(event) {
  event.preventDefault();

  if (!currentEditingFormule) return;

  const produitId = document.getElementById("produit-select").value;
  const quantite = document.getElementById("produit-quantite").value;
  const unite = document.getElementById("produit-unite").value;

  if (!produitId) {
    alert("Veuillez sélectionner un produit.");
    return;
  }

  try {
    await createFormuleProduit({
      formule_id: currentEditingFormule.id,
      produit_id: produitId,
      quantite: parseFloat(quantite),
      unite: unite,
    });

    // Recharger la liste des produits
    await loadFormuleProduits(currentEditingFormule.id);

    // Réinitialiser le formulaire
    document.getElementById("produit-select").value = "";
    document.getElementById("produit-quantite").value = "1";
    document.getElementById("produit-unite").value = "pièces";

    alert("Produit ajouté à la formule !");
  } catch (error) {
    console.error("Erreur ajout produit:", error);
    alert("Erreur lors de l'ajout du produit.");
  }
}

async function handleRemoveProduitFromFormule(formuleProduitId) {
  if (!confirm("Retirer ce produit de la formule ?")) {
    return;
  }

  try {
    await deleteFormuleProduit(formuleProduitId);
    await loadFormuleProduits(currentEditingFormule.id);
    alert("Produit retiré de la formule !");
  } catch (error) {
    console.error("Erreur suppression produit:", error);
    alert("Erreur lors de la suppression du produit.");
  }
}

async function handleSaveFormuleDetails() {
  if (!currentEditingFormule) return;

  const name = document.getElementById("detail-formule-name").value.trim();
  const couverts = document.getElementById("detail-formule-couverts").value;
  const type = document.getElementById("detail-formule-type").value;

  if (!name) {
    alert("Le nom de la formule est requis.");
    return;
  }

  try {
    const formuleModifiee = await updateFormule(currentEditingFormule.id, {
      name: name,
      nombre_couverts: parseInt(couverts),
      type_formule: type,
    });

    // Mettre à jour dans le tableau local
    const index = allFormules.findIndex(
      (f) => f.id === currentEditingFormule.id,
    );
    if (index !== -1) {
      allFormules[index] = formuleModifiee;
    }

    // Réafficher les formules
    displayFormules(allFormules);

    // Fermer la modale
    closeDetailsModal();

    alert("Formule modifiée avec succès !");
  } catch (error) {
    console.error("Erreur modification formule:", error);
    alert("Erreur lors de la modification.");
  }
}

// ===========================================
// FONCTIONNALITÉ DE RECHERCHE ET FILTRAGE
// ===========================================

function handleSearch(event) {
  currentSearchTerm = event.target.value.toLowerCase();
  applyFilters();
}

function handleFilterChange() {
  currentTypeFilter = document.getElementById("filter-type").value;
  applyFilters();
}

function handleResetFilters() {
  currentSearchTerm = "";
  currentTypeFilter = "";

  document.getElementById("search-input").value = "";
  document.getElementById("filter-type").value = "";

  displayFormules(allFormules);
}

function applyFilters() {
  let filteredFormules = allFormules;

  // Filtre par recherche
  if (currentSearchTerm) {
    filteredFormules = filteredFormules.filter((formule) =>
      formule.name.toLowerCase().includes(currentSearchTerm),
    );
  }

  // Filtre par type
  if (currentTypeFilter) {
    filteredFormules = filteredFormules.filter(
      (formule) => formule.type_formule === currentTypeFilter,
    );
  }

  displayFormules(filteredFormules);
}

// ===========================================
// GESTION DE LA CRÉATION D'UNE FORMULE AVEC PRODUITS
// ===========================================

async function handleOpenCreateModal() {
  tempProduitsToCreate = [];

  // Charger la liste des produits pour le select
  await loadProduitsForCreateSelect();

  // Réinitialiser les champs
  document.getElementById("create-formule-name").value = "";
  document.getElementById("create-formule-couverts").value = "1";
  document.getElementById("create-formule-type").value = "Brunch";

  // Vider la liste des produits
  displayCreateProduitsList();

  // Afficher la modale
  document.getElementById("create-modal").style.display = "block";
}

function closeCreateFormuleModal() {
  document.getElementById("create-modal").style.display = "none";
  tempProduitsToCreate = [];
}

async function loadProduitsForCreateSelect() {
  try {
    const produits = await getProduits();
    const select = document.getElementById("create-produit-select");

    select.innerHTML =
      '<option value="">-- Sélectionner un produit --</option>';

    produits.forEach((produit) => {
      const option = document.createElement("option");
      option.value = produit.id;
      option.textContent = produit.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Erreur chargement produits:", error);
  }
}

function handleAddProduitToCreate(event) {
  const produitSelect = document.getElementById("create-produit-select");
  const produitId = produitSelect.value;
  const produitName = produitSelect.options[produitSelect.selectedIndex].text;
  const quantite = document.getElementById("create-produit-quantite").value;
  const unite = document.getElementById("create-produit-unite").value;

  if (!produitId) {
    alert("Veuillez sélectionner un produit.");
    return;
  }

  // Vérifier si le produit n'existe pas déjà dans la liste temporaire
  const existe = tempProduitsToCreate.find((p) => p.produit_id === produitId);
  if (existe) {
    alert("Ce produit a déjà été ajouté.");
    return;
  }

  // Ajouter à la liste temporaire
  tempProduitsToCreate.push({
    produit_id: produitId,
    produit_name: produitName,
    quantite: parseFloat(quantite),
    unite: unite,
  });

  // Réafficher la liste des produits
  displayCreateProduitsList();

  // Réinitialiser le formulaire d'ajout
  document.getElementById("create-produit-select").value = "";
  document.getElementById("create-produit-quantite").value = "1";
  document.getElementById("create-produit-unite").value = "pièces";
}

function displayCreateProduitsList() {
  const container = document.getElementById("create-produits-list");
  const count = document.getElementById("create-produits-count");

  count.textContent = tempProduitsToCreate.length;

  if (tempProduitsToCreate.length === 0) {
    container.innerHTML =
      '<p class="empty-state">Aucun produit ajouté. Ajoutez-en ci-dessous</p>';
    return;
  }

  container.innerHTML = "";

  tempProduitsToCreate.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "produit-item";

    div.innerHTML = `
      <div class="produit-info">
        <div class="produit-name">${item.produit_name}</div>
        <div class="produit-quantity">${item.quantite} ${item.unite}</div>
      </div>
      <div class="produit-actions">
        <button class="btn-icon" onclick="handleRemoveProduitFromCreate(${index})" title="Retirer">🗑️</button>
      </div>
    `;

    container.appendChild(div);
  });
}

function handleRemoveProduitFromCreate(index) {
  tempProduitsToCreate.splice(index, 1);
  displayCreateProduitsList();
}

async function handleCreateFormuleWithProduits() {
  const name = document.getElementById("create-formule-name").value.trim();
  const couverts = document.getElementById("create-formule-couverts").value;
  const type = document.getElementById("create-formule-type").value;

  if (!name) {
    alert("Le nom de la formule est requis.");
    return;
  }

  if (tempProduitsToCreate.length === 0) {
    alert("Veuillez ajouter au moins un produit à la formule.");
    return;
  }

  try {
    // Créer la formule
    const nouvelleFormule = await createFormule({
      name: name,
      nombre_couverts: parseInt(couverts),
      type_formule: type,
    });

    // 2. Ajouter tous les produits
    for (const produit of tempProduitsToCreate) {
      await createFormuleProduit({
        formule_id: nouvelleFormule.id,
        produit_id: produit.produit_id,
        quantite: produit.quantite,
        unite: produit.unite,
      });
    }

    // 3. Ajouter à la liste et réafficher
    allFormules.push(nouvelleFormule);
    displayFormules(allFormules);

    // 4. Fermer la modale
    closeCreateFormuleModal();

    alert(`Formule "${name}" créée avec succès !`);
  } catch (error) {
    console.error("Erreur création formule avec produits:", error);
    alert("Erreur lors de la création de la formule.");
  }
}
