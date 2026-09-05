// js/commandes/commandes-filters.js
// Filtres, recherche et gestion des événements

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

  const filterFranchise = document.getElementById("filter-franchise");
  if (filterFranchise) {
    filterFranchise.addEventListener("change", handleFranchiseChange);
  }

  const resetBtn = document.getElementById("reset-filters");
  resetBtn.addEventListener("click", handleResetFilters);

  // Onglets & archivages
  const tabActive = document.getElementById("tab-active");
  tabActive.addEventListener("click", handleTabActive);

  const tabArchived = document.getElementById("tab-archived");
  tabArchived.addEventListener("click", handleTabArchived);

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

  // EDIT MODAL EVENT LISTENERS
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

  document
    .getElementById("create-type-prestation")
    .addEventListener("change", (e) => {
      const isMariage = e.target.value === "mariage";
      document.getElementById("create-ponderation-group").style.display =
        isMariage ? "block" : "none";
      if (!isMariage)
        document.getElementById("create-coefficient").value = "1.0";
    });

  document
    .getElementById("edit-type-prestation")
    .addEventListener("change", (e) => {
      const isMariage = e.target.value === "mariage";
      document.getElementById("edit-ponderation-group").style.display =
        isMariage ? "block" : "none";
      if (!isMariage) document.getElementById("edit-coefficient").value = "1.0";
      recalcEditFormulesEtProduits();
    });

  function recalcEditFormulesEtProduits() {
    const val = parseInt(document.getElementById("edit-nombre-couverts").value);
    if (!val || val < 1) return;
    const couverts = getCouverts(
      val,
      "edit-coefficient",
      "edit-type-prestation",
    );
    if (Array.isArray(editFormules))
      editFormules.forEach((f) => {
        f.couverts = couverts;
      });
    if (Array.isArray(editProduits))
      editProduits.forEach((p) => {
        p.quantite = couverts;
      });
    if (typeof displayEditFormules === "function") displayEditFormules();
    if (typeof displayEditProduits === "function") displayEditProduits();
  }

  function getCouverts(nbCouverts, coeffFieldId, typePrestationFieldId) {
    return nbCouverts;
  }

  document
    .getElementById("create-nombre-couverts")
    .addEventListener("input", (e) => {
      const val = parseInt(e.target.value);
      if (val >= 1) {
        const couverts = getCouverts(
          val,
          "create-coefficient",
          "create-type-prestation",
        );
        document.getElementById("formule-couverts").value = couverts;
        document.getElementById("produit-quantite").value = couverts;
      }
    });

  document
    .getElementById("create-coefficient")
    .addEventListener("input", () => {
      const val = parseInt(
        document.getElementById("create-nombre-couverts").value,
      );
      if (val >= 1) {
        const couverts = getCouverts(
          val,
          "create-coefficient",
          "create-type-prestation",
        );
        document.getElementById("formule-couverts").value = couverts;
        document.getElementById("produit-quantite").value = couverts;
      }
    });

  document
    .getElementById("edit-nombre-couverts")
    .addEventListener("input", (e) => {
      const val = parseInt(e.target.value);
      if (val >= 1) {
        const couverts = getCouverts(
          val,
          "edit-coefficient",
          "edit-type-prestation",
        );
        document.getElementById("edit-formule-couverts").value = couverts;
        document.getElementById("edit-produit-quantite").value = couverts;
        recalcEditFormulesEtProduits();
      }
    });

  document.getElementById("edit-coefficient").addEventListener("input", () => {
    const val = parseInt(document.getElementById("edit-nombre-couverts").value);
    if (val >= 1) {
      const couverts = getCouverts(
        val,
        "edit-coefficient",
        "edit-type-prestation",
      );
      document.getElementById("edit-formule-couverts").value = couverts;
      document.getElementById("edit-produit-quantite").value = couverts;
      recalcEditFormulesEtProduits();
    }
  });
}

// ===============================================
// GESTION DES FILTRES
// ===============================================

function handleSearch(event) {
  AppState.currentSearchTerm = event.target.value.toLowerCase();
  applyFilters();
}

function handleDateFilter(event) {
  AppState.currentDateFilter = document.getElementById("filter-date").value;
  applyFilters();
}

async function handleFranchiseChange() {
  const currentUser = getUser();

  if (!currentUser || currentUser.role !== "TECH_ADMIN") {
    return;
  }

  AppState.currentFranchiseFilter =
    document.getElementById("filter-franchise").value;
  loadCommandes();
}

function handleResetFilters() {
  AppState.currentSearchTerm = "";
  AppState.currentDateFilter = "";
  AppState.currentFranchiseFilter = "";

  const searchInput = document.getElementById("search-input");
  if (searchInput) searchInput.value = "";

  const filterDate = document.getElementById("filter-date");
  if (filterDate) filterDate.value = "";

  const filterFranchise = document.getElementById("filter-franchise");
  if (filterFranchise) filterFranchise.value = "";

  loadCommandes();
}

function applyFilters() {
  let filtered = AppState.allCommandes;

  // Filtre par texte (nom du client)
  if (AppState.currentSearchTerm) {
    filtered = filtered.filter((c) =>
      c.nom_client.toLowerCase().includes(AppState.currentSearchTerm),
    );
  }

  // Filtre par date
  if (AppState.currentDateFilter) {
    filtered = filtered.filter((c) =>
      c.delivery_date.startsWith(AppState.currentDateFilter),
    );
  }

  displayCommandes(filtered);
  const count = document.getElementById("commandes-count");
  if (count) {
    count.textContent = `${filtered.length} commande${filtered.length > 1 ? "s" : ""}`;
  }
}
