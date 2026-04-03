// js/produits.js
// Logique de la page produits : affichage, ajout, suppression, recherche

// ===========================================
// VARIABLES GLOBALES
// ===========================================

let allProduits = [];
let allCategories = [];
let allTypes = [];

// Variables pour le toggle et le tri
let currentView = localStorage.getItem("produits_view") || "cards";
let sortColumn = localStorage.getItem("produits_sort_column") || "name";
let sortDirection = localStorage.getItem("produits_sort_direction") || "asc";

let currentCategoryFilter = "";
let currentTypeFilter = "";
let currentSearchTerm = "";

let currentEditingProduct = null;

let currentFilteredProduits = [];

// ===========================================
// INITIALISATION AU CHARGEMENT DE LA PAGE
// ===========================================

document.addEventListener("DOMContentLoaded", () => {
  initViewToggle();
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
// GESTION DU TOGGLE VUE
// ===========================================

function initViewToggle() {
  const viewCardsBtn = document.getElementById("view-cards");
  const viewTableBtn = document.getElementById("view-table");

  // Appliquer la vue sauvegardée
  setViewMode(currentView);

  viewCardsBtn.addEventListener("click", () => {
    setViewMode("cards");
  });

  viewTableBtn.addEventListener("click", () => {
    setViewMode("table");
  });

  function setViewMode(mode) {
    currentView = mode;
    localStorage.setItem("produits_view", mode);

    const viewCardsBtn = document.getElementById("view-cards");
    const viewTableBtn = document.getElementById("view-table");

    if (mode === "cards") {
      viewCardsBtn.classList.add("active");
      viewTableBtn.classList.remove("active");
    } else {
      viewTableBtn.classList.add("active");
      viewCardsBtn.classList.remove("active");
    }

    // Recharger les produits pour appliquer la nouvelle vue
    displayProduits(allProduits);
  }
}

// ===========================================
// GESTION DU TRI
// ===========================================

function sortProduits(produits, column, direction) {
  return [...produits].sort((a, b) => {
    let aVal, bVal;

    switch (column) {
      case "name":
        aVal = a.name.toLowerCase() || "";
        bVal = b.name.toLowerCase() || "";
        break;
      case "category":
        aVal = a.category_name?.toLowerCase() || "";
        bVal = b.category_name?.toLowerCase() || "";
        break;
      case "type":
        aVal = a.type_name?.toLowerCase() || "";
        bVal = b.type_name?.toLowerCase() || "";
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return direction === "asc" ? -1 : 1;
    if (aVal > bVal) return direction === "asc" ? 1 : -1;
    return 0;
  });
}

function handleSort(column) {
  if (sortColumn === column) {
    sortDirection = sortDirection === "asc" ? "desc" : "asc";
  } else {
    sortColumn = column;
    sortDirection = "asc";
  }

  // Sauvegarder les préférences de tri
  localStorage.setItem("produits_sort_column", sortColumn);
  localStorage.setItem("produits_sort_direction", sortDirection);

  // Réafficher les produits triés
  displayProduits(currentFilteredProduits);
}

// ===========================================
// CHARGEMENT DES PRODUITS
// ===========================================

async function loadProduits() {
  try {
    const produits = await getProduits();

    // Enrichir avec les noms de catégories/types
    const enrichedProduits = produits.map((p) => {
      // ✅ Gère les deux noms de champs (category_id ET categorie_id)
      const catId = p.category_id || p.categorie_id;
      const typeId = p.type_id;

      return {
        ...p,
        category_id: catId,
        type_id: typeId,
        category_name:
          allCategories.find((c) => c.id === catId)?.name || "Sans catégorie",
        type_name: allTypes.find((t) => t.id === typeId)?.name || "Sans type",
      };
    });

    allProduits = enrichedProduits;
    currentFilteredProduits = enrichedProduits;
    displayProduits(enrichedProduits);
  } catch (error) {
    console.error("Erreur chargement produits:", error);
  }
}

// ===========================================
// AFFICHAGE DES PRODUITS
// ===========================================

function displayProduits(produits) {
  const container = document.getElementById("products-list");

  if (!produits || produits.length === 0) {
    if (currentView === "cards") {
      container.className = "products-list";
      container.innerHTML =
        '<p style="text-align: center; color: #999; padding: 2rem;">Aucun produit trouvé</p>';
    } else {
      container.className = "products-table";
      container.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Catégorie</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="4" class="empty-table">Aucun produit trouvé</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }
    return;
  }

  // Trier les produits
  const sortedProduits = sortProduits(produits, sortColumn, sortDirection);

  if (currentView === "cards") {
    displayProduitsCards(sortedProduits, container);
  } else {
    displayProduitsTable(sortedProduits, container);
  }
}

// ===========================================
// AFFICHAGE VUE CARTES
// ===========================================

function displayProduitsCards(produits, container) {
  container.className = "products-list";
  container.innerHTML = produits
    .map(
      (produit) => `
    <div class="product-item">
      <div class="product-name">${produit.name}</div>
      <div class="product-details">
        <span class="badge category">${produit.category_name || "Sans catégorie"}</span>
        <span class="badge type">${produit.type_name || "Sans type"}</span>
      </div>
      <div class="product-actions">
        <button class="edit-btn" onclick="openEditModal('${produit.id}')">✏️ Modifier</button>
        <button class="delete-btn" onclick="handleDeleteProduit('${produit.id}')">🗑️ Supprimer</button>
      </div>
    </div>
  `,
    )
    .join("");
}

// ===========================================
// AFFICHAGE VUE TABLEAU
// ===========================================

function displayProduitsTable(produits, container) {
  container.className = "products-table";

  const getSortClass = (column) => {
    if (sortColumn !== column) return "sortable";
    return sortDirection === "asc" ? "sort-asc" : "sort-desc";
  };

  container.innerHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th class="${getSortClass("name")}" onclick="handleSort('name')">Nom</th>
            <th class="${getSortClass("category")}" onclick="handleSort('category')">Catégorie</th>
            <th class="${getSortClass("type")}" onclick="handleSort('type')">Type</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${produits
            .map(
              (produit) => `
            <tr>
              <td class="product-name">${produit.name}</td>
              <td><span class="badge category">${produit.category_name || "Sans catégorie"}</span></td>
              <td><span class="badge type">${produit.type_name || "Sans type"}</span></td>
              <td>
                <div class="table-actions">
                  <button class="edit-btn" onclick="openEditModal('${produit.id}')">✏️ Modifier</button>
                  <button class="delete-btn" onclick="handleDeleteProduit('${produit.id}')">🗑️ Supprimer</button>
                </div>
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
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
      category_id: categoryId || null,
      type_id: typeId || null,
    });

    allProduits.push(nouveauProduit);
    currentFilteredProduits = allProduits;
    displayProduits(allProduits);

    // Vider le formulaire
    document.getElementById("product-name").value = "";
    document.getElementById("product-category").value = "";
    document.getElementById("product-type").value = "";

    alert("Produit ajouté avec succès !");
  } catch (error) {
    console.error("Erreur lors de l'ajout du produit :", error);

    // Vérifier si c'est une erreur de duplication
    if (error.message && error.message.includes("existe déjà")) {
      alert("❌ Ce produit existe déjà dans la base de données.");
    } else {
      alert("Erreur lors de l'ajout du produit.");
    }
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
    currentFilteredProduits = allProduits;
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

function openEditModal(produitId) {
  const produit = allProduits.find((p) => p.id === produitId);
  if (!produit) {
    console.error("Produit non trouvé.", produitId);
    return;
  }
  handleEditProduct(produit);
}

function handleEditProduct(produit) {
  currentEditingProduct = produit;

  // Pré-remplir les champs de la modale
  document.getElementById("edit-product-name").value = produit.name;
  document.getElementById("edit-product-category").value =
    produit.category_id || "";
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
      category_id: categoryId || null,
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

  currentFilteredProduits = allProduits;
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
      (produit) =>
        (produit.category_id || produit.categorie_id) == currentCategoryFilter,
    );
  }

  // Filtre par type
  if (currentTypeFilter) {
    filteredProduits = filteredProduits.filter(
      (produit) => produit.type_id == currentTypeFilter,
    );
  }

  currentFilteredProduits = filteredProduits;

  displayProduits(filteredProduits);
}
