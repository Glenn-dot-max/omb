// js/produits.js
// Logique de la page produits : affichage, ajout, suppression, recherche

// ===========================================
// VARIABLES GLOBALES
// ===========================================

let allProduits = [];
let allCategories = [];
let allTypes = [];

let currentCategoryFilter = "";
let currentTypeFilter = "";
let currentSearchTerm = "";

let currentEditingProduct = null;

// ===========================================
// INITIALISATION AU CHARGEMENT DE LA PAGE
// ===========================================

document.addEventListener("DOMContentLoaded", () => {
  loadInitialData();
  setupEventListeners();
});

async function loadInitialData() {
  await loadCategories();
  await loadTypes();
  await loadProduits();
}

async function loadCategories() {
  try {
    allCategories = await getCategories();
    populateCategorySelect();
    populateFilterCategorySelect();
    populateEditCategorySelect();
  } catch (error) {
    console.error("Erreur lors du chargement des catégories :", error);
  }
}

async function loadTypes() {
  try {
    allTypes = await getTypes();
    populateTypeSelect();
    populateFilterTypeSelect();
    populateEditTypeSelect();
  } catch (error) {
    console.error("Erreur lors du chargement des types :", error);
  }
}

function populateCategorySelect() {
  const select = document.getElementById("product-category");
  allCategories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.id;
    option.textContent = cat.name;
    select.appendChild(option);
  });
}

function populateTypeSelect() {
  const select = document.getElementById("product-type");
  allTypes.forEach((type) => {
    const option = document.createElement("option");
    option.value = type.id;
    option.textContent = type.name;
    select.appendChild(option);
  });
}

function populateFilterCategorySelect() {
  const select = document.getElementById("filter-category");
  allCategories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.id;
    option.textContent = cat.name;
    select.appendChild(option);
  });
}

function populateFilterTypeSelect() {
  const select = document.getElementById("filter-type");
  allTypes.forEach((type) => {
    const option = document.createElement("option");
    option.value = type.id;
    option.textContent = type.name;
    select.appendChild(option);
  });
}

function populateEditCategorySelect() {
  const select = document.getElementById("edit-product-category");
  select.innerHTML = '<option value="">-- Catégorie --</option>';

  allCategories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.id;
    option.textContent = cat.name;
    select.appendChild(option);
  });
}

function populateEditTypeSelect() {
  const select = document.getElementById("edit-product-type");
  select.innerHTML = '<option value="">-- Type --</option>';

  allTypes.forEach((type) => {
    const option = document.createElement("option");
    option.value = type.id;
    option.textContent = type.name;
    select.appendChild(option);
  });
}

// ===========================================
// CHARGEMENT DES PRODUITS
// ===========================================

async function loadProduits() {
  try {
    const productsList = document.getElementById("products-list");
    productsList.innerHTML = "<p>Chargement des produits...</p>";
    allProduits = await getProduits();
    displayProduits(allProduits);
  } catch (error) {
    console.error("Erreur lors du chargement des produits :", error);
    const productsList = document.getElementById("products-list");
    productsList.innerHTML =
      '<p style="color: red;">Erreur lors du chargement des produits.</p>';
  }
}

// ===========================================
// AFFICHAGE DES PRODUITS
// ===========================================

function displayProduits(produits) {
  const productsList = document.getElementById("products-list");
  if (produits.length === 0) {
    productsList.innerHTML = "<p>Aucun produit disponible.</p>";
    return;
  }

  productsList.innerHTML = "";

  produits.forEach((produit) => {
    const productItem = createProductElement(produit);
    productsList.appendChild(productItem);
  });
}

function createProductElement(produit) {
  const div = document.createElement("div");
  div.className = "product-item";

  const nameSpan = document.createElement("span");
  nameSpan.className = "product-name";
  nameSpan.textContent = produit.name;

  const detailsDiv = document.createElement("div");
  detailsDiv.className = "product-details";

  if (produit.categorie_id && allCategories.length > 0) {
    const catBadge = document.createElement("span");
    catBadge.className = "badge category";
    const cat = allCategories.find((c) => c.id == produit.categorie_id);
    catBadge.textContent = cat ? cat.name : "Catégorie inconnue";
    detailsDiv.appendChild(catBadge);
  }

  if (produit.type_id && allTypes.length > 0) {
    const typeBadge = document.createElement("span");
    typeBadge.className = "badge type";
    const type = allTypes.find((t) => t.id == produit.type_id);
    typeBadge.textContent = type ? type.name : "Type inconnu";
    detailsDiv.appendChild(typeBadge);
  }

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "product-actions";

  // Bouton modifier
  const editBtn = document.createElement("button");
  editBtn.className = "edit-btn";
  editBtn.textContent = "✏️ Modifier";
  editBtn.onclick = () => handleEditProduct(produit);

  // Bouton supprimer
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "🗑️ Supprimer";
  deleteBtn.onclick = () => handleDeleteProduit(produit.id);

  actionsDiv.appendChild(editBtn);
  actionsDiv.appendChild(deleteBtn);

  div.appendChild(nameSpan);
  if (detailsDiv.children.length > 0) {
    div.appendChild(detailsDiv);
  }
  div.appendChild(actionsDiv);

  return div;
}

// ===========================================
// GESTION DES ÉVÉNEMENTS
// ===========================================

function setupEventListeners() {
  const form = document.getElementById("add-product-form");
  form.addEventListener("submit", handleAddProduit);

  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", handleSearch);

  const filterCategory = document.getElementById("filter-category");
  filterCategory.addEventListener("change", handleFilterChange);

  const filterType = document.getElementById("filter-type");
  filterType.addEventListener("change", handleFilterChange);

  const resetBtn = document.getElementById("reset-filters");
  resetBtn.addEventListener("click", handleResetFilters);

  // Modale de modification
  const closeModal = document.querySelector(".close-modal");
  closeModal.addEventListener("click", closeEditModal);

  const cancelEdit = document.getElementById("cancel-edit");
  cancelEdit.addEventListener("click", closeEditModal);

  const editForm = document.getElementById("edit-product-form");
  editForm.addEventListener("submit", handleUpdateProduit);

  // Fermer la modale en cliquant en dehors
  const modal = document.getElementById("edit-modal");
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeEditModal();
    }
  });
}

// ===========================================
// GESTION DE L'AJOUT D'UN PRODUIT
// ===========================================

async function handleAddProduit(event) {
  event.preventDefault();

  const name = document.getElementById("product-name").value.trim();
  const categoryId = document.getElementById("product-category").value;
  const typeId = document.getElementById("product-type").value;

  if (!name) {
    alert("Le nom du produit est requis.");
    return;
  }

  try {
    const nouveauProduit = await createProduit({
      name: name,
      categorie_id: categoryId || null,
      type_id: typeId || null,
    });

    allProduits.push(nouveauProduit);
    displayProduits(allProduits);

    // Vider le formulaire
    document.getElementById("product-name").value = "";
    document.getElementById("product-category").value = "";
    document.getElementById("product-type").value = "";

    alert("Produit ajouté avec succès !");
  } catch (error) {
    console.error("Erreur lors de l'ajout du produit :", error);
    alert("Erreur lors de l'ajout du produit.");
  }
}

// ===========================================
// GESTION DE LA SUPPRESSION D'UN PRODUIT
// ===========================================

async function handleDeleteProduit(produitId) {
  if (!confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
    return;
  }

  try {
    await deleteProduit(produitId);
    allProduits = allProduits.filter((p) => p.id !== produitId);
    displayProduits(allProduits);
    alert("Produit supprimé avec succès !");
  } catch (error) {
    console.error("Erreur lors de la suppression du produit :", error);
    alert("Erreur lors de la suppression du produit.");
  }
}

// ===========================================
// GESTION DE LA MODIFICATION
// ===========================================

function handleEditProduct(produit) {
  currentEditingProduct = produit;

  // Pré-remplir les champs de la modale
  document.getElementById("edit-product-name").value = produit.name;
  document.getElementById("edit-product-category").value =
    produit.categorie_id || "";
  document.getElementById("edit-product-type").value = produit.type_id || "";

  // Afficher la modale
  document.getElementById("edit-modal").style.display = "block";
}

function closeEditModal() {
  document.getElementById("edit-modal").style.display = "none";
  currentEditingProduct = null;

  // Vider le formulaire
  document.getElementById("edit-product-name").value = "";
  document.getElementById("edit-product-category").value = "";
  document.getElementById("edit-product-type").value = "";
}

async function handleUpdateProduit(event) {
  event.preventDefault();

  if (!currentEditingProduct) return;

  const name = document.getElementById("edit-product-name").value.trim();
  const categoryId = document.getElementById("edit-product-category").value;
  const typeId = document.getElementById("edit-product-type").value;

  if (!name) {
    alert("Le nom du produit est requis.");
    return;
  }

  try {
    const produitModifie = await updateProduit(currentEditingProduct.id, {
      name: name,
      categorie_id: categoryId || null,
      type_id: typeId || null,
    });

    // Mettre à jour dans le tableau local
    const index = allProduits.findIndex(
      (p) => p.id === currentEditingProduct.id,
    );
    if (index !== -1) {
      allProduits[index] = produitModifie;
    }

    // Réafficher les produits
    displayProduits(allProduits);

    // Fermer la modale
    closeEditModal();

    alert("Produit modifié avec succès !");
  } catch (error) {
    console.error("Erreur lors de la modification :", error);
    alert("Erreur lors de la modification du produit.");
  }
}

// ===========================================
// FONCTIONNALITÉ DE RECHERCHE
// ===========================================

function handleSearch(event) {
  currentSearchTerm = event.target.value.toLowerCase();
  applyFilters();
}

function handleFilterChange() {
  currentCategoryFilter = document.getElementById("filter-category").value;
  currentTypeFilter = document.getElementById("filter-type").value;
  applyFilters();
}

function handleResetFilters() {
  currentSearchTerm = "";
  currentCategoryFilter = "";
  currentTypeFilter = "";

  document.getElementById("search-input").value = "";
  document.getElementById("filter-category").value = "";
  document.getElementById("filter-type").value = "";

  displayProduits(allProduits);
}

function applyFilters() {
  let filteredProduits = allProduits;

  // Filtre par recherche
  if (currentSearchTerm) {
    filteredProduits = filteredProduits.filter((produit) =>
      produit.name.toLowerCase().includes(currentSearchTerm),
    );
  }

  // Filtre par catégorie
  if (currentCategoryFilter) {
    filteredProduits = filteredProduits.filter(
      (produit) => produit.categorie_id == currentCategoryFilter,
    );
  }

  // Filtre par type
  if (currentTypeFilter) {
    filteredProduits = filteredProduits.filter(
      (produit) => produit.type_id == currentTypeFilter,
    );
  }

  displayProduits(filteredProduits);
}
