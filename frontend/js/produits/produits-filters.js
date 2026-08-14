// js/produits/produits-filters.js
// Filtres, recherche et écouteurs d'événements

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

  const filterFranchise = document.getElementById("filter-franchise");
  if (filterFranchise) {
    filterFranchise.addEventListener("change", handleFranchiseChange);
  }

  const resetBtn = document.getElementById("reset-filters");
  resetBtn.addEventListener("click", handleResetFilters);

  // Modale de modification
  const closeModal = document.querySelector(".close-modal");
  closeModal.addEventListener("click", closeEditModal);

  const cancelEdit = document.getElementById("cancel-edit");
  cancelEdit.addEventListener("click", closeEditModal);

  const cancelManageFranchises = document.getElementById(
    "cancel-manage-produit-franchises",
  );
  if (cancelManageFranchises) {
    cancelManageFranchises.addEventListener(
      "click",
      closeManageProduitFranchisesModal,
    );
  }

  const saveManageFranchises = document.getElementById(
    "save-manage-produit-franchises",
  );
  if (saveManageFranchises) {
    saveManageFranchises.addEventListener(
      "click",
      handleSaveManageProduitFranchises,
    );
  }

  const selectAllManageBtn = document.getElementById(
    "select-all-manage-produit-franchises",
  );
  if (selectAllManageBtn) {
    selectAllManageBtn.addEventListener("click", () => {
      const checkboxes = document.querySelectorAll(
        ".manage-produit-franchise-checkbox",
      );
      checkboxes.forEach((cb) => {
        cb.checked = true;
      });
      updateManageProduitFranchisesSelectionUI();
    });
  }

  const clearAllManageBtn = document.getElementById(
    "clear-all-manage-produit-franchises",
  );
  if (clearAllManageBtn) {
    clearAllManageBtn.addEventListener("click", () => {
      const checkboxes = document.querySelectorAll(
        ".manage-produit-franchise-checkbox",
      );
      checkboxes.forEach((cb) => {
        cb.checked = false;
      });
      updateManageProduitFranchisesSelectionUI();
    });
  }

  const editForm = document.getElementById("edit-product-form");
  editForm.addEventListener("submit", handleUpdateProduit);

  // Fermer la modale en cliquant en dehors
  const modal = document.getElementById("edit-modal");
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeEditModal();
    }
  });

  const manageModal = document.getElementById(
    "manage-produit-franchises-modal",
  );
  if (manageModal) {
    manageModal.addEventListener("click", (event) => {
      if (event.target === manageModal) {
        closeManageProduitFranchisesModal();
      }
    });
  }
}

function handleSearch(event) {
  AppState.currentSearchTerm = event.target.value.toLowerCase();
  applyFilters();
}

function handleFilterChange() {
  AppState.currentCategoryFilter =
    document.getElementById("filter-category").value;
  AppState.currentTypeFilter = document.getElementById("filter-type").value;
  applyFilters();
}

function handleFranchiseChange() {
  const currentUser = getUser();

  if (!isCatalogAdminRole(currentUser)) {
    return;
  }

  AppState.currentFranchiseFilter =
    document.getElementById("filter-franchise").value;

  // Recharger les produits avec le nouveau filtre
  loadProduits();
}

function handleResetFilters() {
  AppState.currentSearchTerm = "";
  AppState.currentCategoryFilter = "";
  AppState.currentTypeFilter = "";
  AppState.currentFranchiseFilter = "";

  document.getElementById("search-input").value = "";
  document.getElementById("filter-category").value = "";
  document.getElementById("filter-type").value = "";
  const franchiseFilter = document.getElementById("filter-franchise");
  if (franchiseFilter) {
    franchiseFilter.value = "";
  }

  AppState.currentFilteredProduits = allProduits;
  displayProduits(allProduits);
}

function applyFilters() {
  let filteredProduits = allProduits;

  // Filtre par recherche
  if (AppState.currentSearchTerm) {
    filteredProduits = filteredProduits.filter((produit) =>
      produit.name.toLowerCase().includes(AppState.currentSearchTerm),
    );
  }

  // Filtre par catégorie
  if (AppState.currentCategoryFilter) {
    filteredProduits = filteredProduits.filter(
      (produit) =>
        (produit.category_id || produit.categorie_id) ==
        AppState.currentCategoryFilter,
    );
  }

  // Filtre par type
  if (AppState.currentTypeFilter) {
    filteredProduits = filteredProduits.filter(
      (produit) => produit.type_id == AppState.currentTypeFilter,
    );
  }

  AppState.currentFilteredProduits = filteredProduits;

  displayProduits(filteredProduits);
}
