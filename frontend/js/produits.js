// js/produits.js
// Logique de la page produits : affichage, ajout, suppression, recherche

const __ombNativeAlertProduits = window.alert.bind(window);
window.alert = function (message) {
  if (typeof showToast === "function") {
    const msg = String(message ?? "");
    const isError = /❌|erreur|impossible|refus|introuvable/i.test(msg);
    const isSuccess =
      /✅|succès|créé|ajouté|modifié|supprimé|mis à jour|réactiv/i.test(msg);
    showToast(msg, isError ? "error" : isSuccess ? "success" : "info", 3500);
    return;
  }
  __ombNativeAlertProduits(String(message ?? ""));
};

// ===========================================
// VARIABLES GLOBALES
// ===========================================

let allProduits = [];
let allCategories = [];
let allTypes = [];
let allFranchises = [];

// Variables pour le toggle et le tri
let currentView = localStorage.getItem("produits_view") || "cards";
let sortColumn = localStorage.getItem("produits_sort_column") || "name";
let sortDirection = localStorage.getItem("produits_sort_direction") || "asc";

let currentCategoryFilter = "";
let currentTypeFilter = "";
let currentSearchTerm = "";
let currentFranchiseFilter = "";

let currentEditingProduct = null;

let currentFilteredProduits = [];

function isCatalogAdminRole(user = getUser()) {
  return (
    !!user && (user.role === "TECH_ADMIN" || user.role === "CATALOG_ADMIN")
  );
}

// ===========================================
// INITIALISATION AU CHARGEMENT DE LA PAGE
// ===========================================

document.addEventListener("DOMContentLoaded", () => {
  initViewToggle();
  loadInitialData();
  setupEventListeners();

  const currentuser = getUser();
  if (currentuser && currentuser.role === "TECH_ADMIN") {
    const adminLink = document.getElementById("admin-link");
    if (adminLink) {
      adminLink.style.display = "inline-block";
    }
  }
});

async function loadInitialData() {
  await Promise.allSettled([loadCategories(), loadTypes(), loadFranchises()]);
  await loadProduits();
}

function showProduitsLoading() {
  const loading = document.getElementById("produits-loading");
  if (loading) loading.style.display = "block";
}

function hideProduitsLoading() {
  const loading = document.getElementById("produits-loading");
  if (loading) loading.style.display = "none";
}

function getDisplayProduitName(name) {
  if (!name) return "";
  return name.replace(
    /\s*\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)\s*$/i,
    "",
  );
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

async function loadFranchises() {
  try {
    const currentUser = getUser();
    const filterFranchise = document.getElementById("filter-franchise");
    const franchiseSelector = document.getElementById("franchise-selector");

    if (!isCatalogAdminRole(currentUser)) {
      // Masquer le filtre de franchise pour les non-admins
      if (filterFranchise) {
        filterFranchise.style.display = "none";
      }
      if (franchiseSelector) {
        franchiseSelector.style.display = "none";
      }
      return;
    }

    if (filterFranchise) {
      filterFranchise.style.display = "block";
    }
    if (franchiseSelector) {
      franchiseSelector.style.display = "block";
    }

    allFranchises = await apiGet("/admin/franchises");

    populateFranchiseSelect();

    populateFranchiseCheckboxes();

    setupFranchiseAccordion();
  } catch (error) {
    console.error("Erreur lors du chargement des franchises :", error);
    const filterFranchise = document.getElementById("filter-franchise");
    const franchiseSelector = document.getElementById("franchise-selector");
    if (filterFranchise) {
      filterFranchise.style.display = "none";
    }
    if (franchiseSelector) {
      franchiseSelector.style.display = "none";
    }
  }
}

function populateFranchiseSelect() {
  const select = document.getElementById("filter-franchise");
  select.innerHTML = '<option value="">-- Toutes les franchises --</option>';
  allFranchises.forEach((franchise) => {
    const option = document.createElement("option");
    option.value = franchise.id;
    option.textContent = franchise.nom;
    select.appendChild(option);
  });
}

function populateFranchiseCheckboxes() {
  const container = document.getElementById("franchise-checkboxes");
  if (!container) return;

  container.innerHTML = "";

  allFranchises.forEach((franchise) => {
    const label = document.createElement("label");
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.gap = "0.5rem";
    label.style.padding = "0.5rem";
    label.style.cursor = "pointer";
    label.style.borderRadius = "3px";
    label.style.transition = "background 0.2s";

    label.addEventListener("mouseover", () => {
      label.style.background = "#e9ecef";
    });
    label.addEventListener("mouseout", () => {
      label.style.background = "transparent";
    });

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = franchise.id;
    checkbox.className = "franchise-checkbox";
    checkbox.style.cursor = "pointer";

    const text = document.createElement("span");
    text.textContent = franchise.nom;

    label.appendChild(checkbox);
    label.appendChild(text);
    container.appendChild(label);
  });

  const selectAllCheckbox = document.getElementById("select-all-franchises");
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", (e) => {
      const checkboxes = document.querySelectorAll(".franchise-checkbox");
      checkboxes.forEach((cb) => {
        cb.checked = e.target.checked;
      });
    });
  }
}

function populateCategorySelect() {
  const select = document.getElementById("product-category");
  select.innerHTML = '<option value="">-- Catégorie --</option>';
  allCategories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.id;
    option.textContent = cat.name;
    select.appendChild(option);
  });
}

function populateTypeSelect() {
  const select = document.getElementById("product-type");
  select.innerHTML = '<option value="">-- Type --</option>';
  allTypes.forEach((type) => {
    const option = document.createElement("option");
    option.value = type.id;
    option.textContent = type.name;
    select.appendChild(option);
  });
}

function populateFilterCategorySelect() {
  const select = document.getElementById("filter-category");
  select.innerHTML = '<option value="">📂 Filtrer par catégorie</option>';
  allCategories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.id;
    option.textContent = cat.name;
    select.appendChild(option);
  });
}

function populateFilterTypeSelect() {
  const select = document.getElementById("filter-type");
  select.innerHTML = '<option value="">🏷️ Filtrer par type</option>';
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

      // Styles pour le bouton actif (cartes)
      viewCardsBtn.style.background = "white";
      viewCardsBtn.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";

      // Styles pour le bouton inactif (tableau)
      viewTableBtn.style.background = "transparent";
      viewTableBtn.style.boxShadow = "none";
    } else {
      viewTableBtn.classList.add("active");
      viewCardsBtn.classList.remove("active");

      // Styles pour le bouton actif (tableau)
      viewTableBtn.style.background = "white";
      viewTableBtn.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";

      // Styles pour le bouton inactif (cartes)
      viewCardsBtn.style.background = "transparent";
      viewCardsBtn.style.boxShadow = "none";
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
  showProduitsLoading();
  try {
    const currentUser = getUser();
    let produits;

    if (
      currentFranchiseFilter &&
      currentUser &&
      isCatalogAdminRole(currentUser)
    ) {
      console.log(
        `🔍 Chargement des produits pour la franchise ID ${currentFranchiseFilter}`,
      );

      produits = await apiGet(
        `/admin/franchises/${currentFranchiseFilter}/produits`,
      );

      produits = produits.filter((p) => p.active);

      produits = produits.map((p) => {
        const categorie = allCategories.find((c) => c.name === p.categorie);
        const type = allTypes.find((t) => t.name === p.type);

        return {
          id: p.id,
          name: p.nom,
          category_id: categorie ? categorie.id : null,
          type_id: type ? type.id : null,
          category_name: p.categorie || "Sans catégorie",
          type_name: p.type || "Sans type",
        };
      });

      console.log(
        `✅ ${produits.length} produits chargés pour la franchise ID ${currentFranchiseFilter}`,
      );
    } else {
      console.log("📦 Chargement de tous les produits");
      produits = await getProduits();

      produits = produits.map((p) => {
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
    }

    allProduits = produits;
    currentFilteredProduits = produits;
    displayProduits(produits);
  } catch (error) {
    console.error("Erreur chargement produits:", error);
    alert("Erreur lors du chargement des produits.");
  } finally {
    hideProduitsLoading();
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
  const currentUser = getUser();
  const isTechAdmin = isCatalogAdminRole(currentUser);

  container.className = "products-list";
  container.innerHTML = produits
    .map((produit) => {
      const displayName = getDisplayProduitName(produit.name);
      const categoryName = produit.category_name || "Non catégorisé";
      const typeName = produit.type_name || "Sans type";
      const isFranchiseOwned =
        !isTechAdmin && (produit.nb_franchises || 0) === 1;
      const ownershipBadge = isFranchiseOwned
        ? `<div style="
            margin-top: 0.5rem;
            display: inline-block;
            padding: 0.25rem 0.6rem;
            font-size: 0.78rem;
            font-weight: 600;
            color: #1e7e34;
            background: #e9f7ef;
            border: 1px solid #b7e4c7;
            border-radius: 999px;
          ">✅ Produit propre à votre franchise</div>`
        : "";

      let franchiseInfo = "";
      if (isTechAdmin) {
        if (produit.nb_franchises === 0) {
          franchiseInfo = `
            <div style="
              margin-top: 0.75rem;
              padding: 0.5rem;
              font-size: 0.85rem;
              color: #e74c3c;
              background: #fceae9;
              border-radius: 4px;
              text-align: center;
              border-left: 4px solid #e74c3c;
            ">
              ⚠️ Aucune franchise active
            </div>
          `;
        } else if (produit.is_limited && produit.nb_franchises > 0) {
          const franchisesText = produit.franchises.join(", ");
          franchiseInfo = `
            <div style="
              margin-top: 0.75rem;
              padding: 0.75rem;
              background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
              border-left: 4px solid #d4862d;
              border-radius: 6px;
              font-size: 0.85rem;
            ">
              <div style="color: #d4862d; font-weight: 600; margin-bottom: 0.4rem;">
                📍 Limité aux franchises :
              </div>
              <div style="color: #5d4037; line-height: 1.4;">${franchisesText}</div>
              <div style="color: #999; font-size: 0.75rem; margin-top: 0.3rem;">
                (${produit.nb_franchises}/${produit.total_franchises} franchises)
              </div>
            </div>
          `;
        } else {
          franchiseInfo = `
            <div style="
              margin-top: 0.75rem;
              padding: 0.5rem;
              font-size: 0.85rem;
              color: #666;
              font-style: italic;
              background: #f5f5f5;
              border-radius: 4px;
              text-align: center;
            ">
              ✓ Disponible pour toutes les franchises
            </div>
          `;
        }
      }

      const manageFranchisesButton =
        isTechAdmin && (produit.nb_franchises || 0) > 0
          ? `<button class="edit-btn" onclick="handleOpenManageProduitFranchises(${JSON.stringify(produit).replace(/"/g, "&quot;")})">🏢 Franchises</button>`
          : "";

      return `
        <div class="product-item">
          <div class="product-name">${displayName}</div>
          <div class="product-details">
            <span class="badge category">${categoryName}</span>
            <span class="badge type">${typeName}</span>
          </div>
          ${ownershipBadge}
          ${franchiseInfo}
          <div class="product-actions">
            <button class="edit-btn"
              onclick="handleEditProduit(${JSON.stringify(produit).replace(/"/g, "&quot;")})">✏️ Modifier</button>
            ${manageFranchisesButton}
            <button class="delete-btn" onclick="handleDeleteProduit('${produit.id}')">
              ${isTechAdmin ? "🗑️ Supprimer" : "🚫 Désactiver"}
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

// ===========================================
// AFFICHAGE VUE TABLEAU
// ===========================================

function displayProduitsTable(produits, container) {
  container.className = "products-table";

  const currentUser = getUser();
  const isTechAdmin = isCatalogAdminRole(currentUser);

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
            ${isTechAdmin ? '<th style="min-width: 200px;">Franchises</th>' : ""}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${produits
            .map((produit) => {
              const categoryName = produit.category_name || "Non catégorisé";
              const typeName = produit.type_name || "Sans type";
              const displayName = getDisplayProduitName(produit.name);
              const isFranchiseOwned =
                !isTechAdmin && (produit.nb_franchises || 0) === 1;
              const ownershipBadge = isFranchiseOwned
                ? `<span style="
                    margin-left: 0.5rem;
                    display: inline-block;
                    padding: 0.2rem 0.5rem;
                    font-size: 0.72rem;
                    font-weight: 600;
                    color: #1e7e34;
                    background: #e9f7ef;
                    border: 1px solid #b7e4c7;
                    border-radius: 999px;
                    vertical-align: middle;
                  ">Propre</span>`
                : "";
              const produitJson = JSON.stringify(produit).replace(
                /"/g,
                "&quot;",
              );
              const manageFranchisesButton =
                isTechAdmin && (produit.nb_franchises || 0) > 0
                  ? `<button class="edit-btn" onclick="handleOpenManageProduitFranchises(${produitJson})">🏢 Franchises</button>`
                  : "";

              let franchisesCell = "";
              if (isTechAdmin) {
                if (produit.nb_franchises === 0) {
                  franchisesCell = `
                    <td style="color: #e74c3c; font-weight: 600; text-align: center;">
                      ⚠️ Aucune franchise active
                    </td>
                  `;
                } else if (
                  produit.is_limited &&
                  produit.franchises &&
                  produit.franchises.length > 0
                ) {
                  const franchisesText = produit.franchises.join(", ");
                  franchisesCell = `
                    <td style="font-size: 0.9rem;">
                      <div style="color: #d4862d; font-weight: 600; margin-bottom: 0.3rem;">
                        📍 ${franchisesText}
                      </div>
                      <small style="color: #999;">
                        (${produit.nb_franchises}/${produit.total_franchises} franchises)
                      </small>
                    </td>
                  `;
                } else {
                  franchisesCell = `
                    <td style="color: #666; font-style: italic; text-align: center;">
                      ✓ Disponible pour toutes les franchises
                    </td>
                  `;
                }
              }

              return `
                <tr>
                  <td class="product-name">${displayName}${ownershipBadge}</td>
                  <td><span class="badge category">${categoryName}</span></td>
                  <td><span class="badge type">${typeName}</span></td>
                  ${franchisesCell}
                  <td>
                    <div class="table-actions">
                      <button class="edit-btn" onclick="handleEditProduit(${produitJson})">✏️ Modifier</button>
                      ${manageFranchisesButton}
                      <button class="delete-btn" onclick="handleDeleteProduit('${produit.id}')">
                        ${isTechAdmin ? "🗑️ Supprimer" : "🚫 Désactiver"}
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
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

// ===========================================
// GESTION DE L'ACCORDÉON FRANCHISES
// ===========================================

function setupFranchiseAccordion() {
  const header = document.getElementById("franchise-accordion-header");
  const content = document.getElementById("franchise-accordion-content");
  const icon = document.getElementById("franchise-accordion-icon");

  if (!header || !content || !icon) return;

  let isOpen = false;

  header.addEventListener("click", () => {
    isOpen = !isOpen;

    if (isOpen) {
      // Ouvrir l'accordéon
      content.style.maxHeight = content.scrollHeight + "px";
      icon.style.transform = "rotate(180deg)";
      header.style.background =
        "linear-gradient(135deg, #d4862d 0%, #f4a460 100%)";
    } else {
      // Fermer l'accordéon
      content.style.maxHeight = "0";
      icon.style.transform = "rotate(0deg)";
      header.style.background =
        "linear-gradient(135deg, #f4a460 0%, #d4862d 100%)";
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

  const currentUser = getUser();
  let franchiseIds = null;

  if (isCatalogAdminRole(currentUser)) {
    const checkedBoxes = document.querySelectorAll(
      ".franchise-checkbox:checked",
    );

    if (checkedBoxes.length > 0) {
      franchiseIds = Array.from(checkedBoxes).map((cb) => cb.value);
    } else {
      franchiseIds = [];
    }
  }

  try {
    const produitData = {
      name: name,
      categorie_id: categoryId ? parseInt(categoryId) : null,
      type_id: typeId ? parseInt(typeId) : null,
    };

    if (isCatalogAdminRole(currentUser)) {
      produitData.franchise_ids = franchiseIds;
    }

    await createProduit(produitData);

    // ✅ RECHARGER tous les produits pour avoir les métadonnées
    await loadProduits();

    // Vider le formulaire
    document.getElementById("product-name").value = "";
    document.getElementById("product-category").value = "";
    document.getElementById("product-type").value = "";

    const allCheckboxes = document.querySelectorAll(".franchise-checkbox");
    allCheckboxes.forEach((cb) => (cb.checked = false));
    const selectAll = document.getElementById("select-all-franchises");
    if (selectAll) selectAll.checked = false;

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
  const currentUser = getUser();
  const isTechAdmin = isCatalogAdminRole(currentUser);

  // Message de confirmation adapté au rôle
  const message = isTechAdmin
    ? "⚠️ Êtes-vous sûr de vouloir supprimer définitivement ce produit ?\n\nCette action est irréversible pour toutes les franchises."
    : "Êtes-vous sûr de vouloir désactiver ce produit ?\n\nIl ne sera plus visible pour votre franchise.";

  if (!confirm(message)) return;
  try {
    await deleteProduit(produitId);
    allProduits = allProduits.filter((p) => p.id !== produitId);
    currentFilteredProduits = allProduits;
    displayProduits(allProduits);
    alert(
      isTechAdmin
        ? "✅ Produit supprimé avec succès !"
        : "✅ Produit désactivé pour votre franchise !",
    );
  } catch (error) {
    console.error("Erreur lors de la suppression du produit :", error);
    alert(
      isTechAdmin
        ? "❌ Erreur lors de la suppression du produit."
        : "❌ Erreur lors de la désactivation du produit pour votre franchise.",
    );
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
  handleEditProduit(produit);
}

function handleEditProduit(produit) {
  currentEditingProduct = produit;

  // Pré-remplir les champs de la modale
  document.getElementById("edit-product-name").value = getDisplayProduitName(
    produit.name,
  );
  const categoryId = produit.category_id || produit.categorie_id;
  document.getElementById("edit-product-category").value = categoryId
    ? categoryId.toString()
    : "";
  document.getElementById("edit-product-type").value = produit.type_id
    ? produit.type_id.toString()
    : "";

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
    await updateProduit(currentEditingProduct.id, {
      name: name,
      categorie_id: categoryId ? parseInt(categoryId) : null,
      type_id: typeId ? parseInt(typeId) : null,
    });

    await loadProduits();

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

function handleFranchiseChange() {
  const currentUser = getUser();

  if (!isCatalogAdminRole(currentUser)) {
    return;
  }

  currentFranchiseFilter = document.getElementById("filter-franchise").value;

  // Recharger les produits avec le nouveau filtre
  loadProduits();
}

function handleResetFilters() {
  currentSearchTerm = "";
  currentCategoryFilter = "";
  currentTypeFilter = "";
  currentFranchiseFilter = "";

  document.getElementById("search-input").value = "";
  document.getElementById("filter-category").value = "";
  document.getElementById("filter-type").value = "";
  const franchiseFilter = document.getElementById("filter-franchise");
  if (franchiseFilter) {
    franchiseFilter.value = "";
  }

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

// ============================================
// GESTION DES CATÉGORIES
// ============================================

// Afficher la section catégories avec restrictions selon le rôle
function initCategoriesSection() {
  const currentUser = getUser();
  const categoriesSection = document.getElementById("categories-types-section");
  const addCategoryContainer = document.getElementById(
    "add-category-container",
  );
  const btnCategories = document.getElementById("toggle-categories");
  const btnTypes = document.getElementById("toggle-types");

  if (isCatalogAdminRole(currentUser)) {
    categoriesSection.style.display = "block";

    // Boutons mode gestion
    if (btnCategories) btnCategories.textContent = "📂 Gérer les catégories";
    if (btnTypes) btnTypes.textContent = "🏷️ Gérer les types";

    if (addCategoryContainer) addCategoryContainer.style.display = "block";

    loadCategoriesManagement();
  } else if (currentUser) {
    categoriesSection.style.display = "block";

    if (btnCategories)
      btnCategories.textContent = "📂 Consulter les catégories";
    if (btnTypes) btnTypes.textContent = "🏷️ Consulter les types";

    if (addCategoryContainer) addCategoryContainer.style.display = "none";

    loadCategoriesManagement();
  } else {
    categoriesSection.style.display = "none";
  }
}

// Charger les catégories pour la gestion
async function loadCategoriesManagement() {
  try {
    const data = await getCategories();
    allCategories = data;
    displayCategoriesManagement();
  } catch (error) {
    console.error("Erreur chargement catégories:", error);
  }
}

// Afficher les catégories dans la section de gestion
function displayCategoriesManagement() {
  const list = document.getElementById("categories-list");

  if (!list) return;

  if (allCategories.length === 0) {
    list.innerHTML = `
      <div style="
        text-align: center;
        padding: 3rem 2rem;
        color: #999;
        font-size: 1rem;
      ">
        <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
        <div>Aucune catégorie disponible</div>
      </div>
    `;
    return;
  }

  const currentUser = getUser();
  const isTechAdmin = isCatalogAdminRole(currentUser);

  list.innerHTML = allCategories
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (cat) => `
        <div class="category-item" style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-bottom: 0.75rem;
          background: white;
          border: 1px solid #e8e8e8;
          border-radius: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        "
        onmouseover="this.style.boxShadow='0 4px 12px rgba(212, 134, 45, 0.15)'; this.style.borderColor='#d4862d';"
        onmouseout="this.style.boxShadow='0 1px 3px rgba(0, 0, 0, 0.05)'; this.style.borderColor='#e8e8e8';">
          
          <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
            <div style="
              width: 40px;
              height: 40px;
              background: linear-gradient(135deg, #f4a460 0%, #d4862d 100%);
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.2rem;
              box-shadow: 0 2px 4px rgba(212, 134, 45, 0.3);
            ">
              🏷️
            </div>

            <div style="flex: 1;">
              <div style="
                font-weight: 600;
                color: #2c3e50;
                font-size: 1rem;
                margin-bottom: 0.25rem;
              ">
                ${cat.name}
              </div>
              <div style="
                font-size: 0.75rem;
                color: #95a5a6;
                font-family: 'Courier New', monospace;
              ">
                ID: ${cat.id}
              </div>
            </div>
          </div>

          ${
            isTechAdmin
              ? `
            <div style="display: flex; gap: 0.5rem;">
              <button
                onclick="openEditCategoryModal(${cat.id})"
                class="action-btn edit-btn"
                style="
                  padding: 0.5rem 1rem;
                  background: white;
                  color: #2ecc71;
                  border: 2px solid #2ecc71;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 0.875rem;
                  font-weight: 600;
                  transition: all 0.2s ease;
                  display: flex;
                  align-items: center;
                  gap: 0.4rem;
                "
                onmouseover="this.style.background='#2ecc71'; this.style.color='white';"
                onmouseout="this.style.background='white'; this.style.color='#2ecc71';"
              >
                <span>✏️</span>
                <span>Modifier</span>
              </button>

              <button
                onclick="deleteCategoryFromManagement(${cat.id}, '${cat.name.replace(/'/g, "\\'")}')"
                class="action-btn delete-btn"
                style="
                  padding: 0.5rem 1rem;
                  background: white;
                  color: #e74c3c;
                  border: 2px solid #e74c3c;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 0.875rem;
                  font-weight: 600;
                  transition: all 0.2s ease;
                  display: flex;
                  align-items: center;
                  gap: 0.4rem;
                "
                onmouseover="this.style.background='#e74c3c'; this.style.color='white';"
                onmouseout="this.style.background='white'; this.style.color='#e74c3c';"
              >
                <span>🗑️</span>
                <span>Supprimer</span>
              </button>
            </div>
          `
              : ""
          }
        </div>
      `,
    )
    .join("");
}

// Ajouter une catégorie (tous les utilisateurs)
document
  .getElementById("add-category-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("category-name").value.trim();

    if (!name) {
      alert("⚠️ Le nom de la catégorie est requis");
      return;
    }

    try {
      await createCategory({ name });
      alert("✅ Catégorie ajoutée avec succès !");
      document.getElementById("category-name").value = "";

      await loadCategoriesManagement();
      await loadCategories();
      await loadProduits();
    } catch (error) {
      console.error("Erreur:", error);

      if (error.message && error.message.includes("403")) {
        alert(
          "❌ Vous n'avez pas les permissions nécessaires pour effectuer cette action.",
        );
      } else {
        alert(
          `❌ ${error.message || "Erreur lors de l'ajout de la catégorie"}`,
        );
      }
    }
  });

// Modifier une catégorie (TECH_ADMIN uniquement)
function openEditCategoryModal(categoryId) {
  const category = allCategories.find((c) => c.id === categoryId);
  if (!category) return;

  const newName = prompt(
    `Modifier la catégorie "${category.name}":\n\nNouveau nom:`,
    category.name,
  );

  if (newName && newName.trim() !== "" && newName.trim() !== category.name) {
    updateCategoryFromManagement(categoryId, newName.trim());
  }
}

async function updateCategoryFromManagement(categoryId, newName) {
  try {
    await updateCategory(categoryId, { name: newName });
    alert("✅ Catégorie modifiée avec succès !");

    await loadCategoriesManagement();
    await loadCategories();
    await loadProduits();
  } catch (error) {
    console.error("Erreur:", error);
    alert(
      `❌ ${error.message || "Erreur lors de la modification de la catégorie"}`,
    );
  }
}

// Supprimer une catégorie (TECH_ADMIN uniquement)
async function deleteCategoryFromManagement(categoryId, categoryName) {
  if (
    !confirm(
      `⚠️ Êtes-vous sûr de vouloir supprimer la catégorie "${categoryName}" ?\n\nCette action est irréversible.\n\n⚠️ La suppression échouera si des produits utilisent encore cette catégorie.`,
    )
  ) {
    return;
  }

  try {
    await deleteCategoryById(categoryId);
    alert("✅ Catégorie supprimée avec succès !");

    await loadCategoriesManagement();
    await loadCategories();
    await loadProduits();
  } catch (error) {
    console.error("Erreur:", error);
    if (error.message && error.message.includes("403")) {
      alert(
        "❌ Vous n'avez pas les permissions nécessaires pour effectuer cette action.",
      );
    } else {
      alert(
        `❌ Impossible de supprimer cette catégorie\n\nDes produits utilisent probablement encore cette catégorie.`,
      );
    }
  }
}

// ===========================================
// GESTION DES TYPES
// ===========================================

// Afficher la section types avec restrictions selon le rôle
function initTypesSection() {
  const currentUser = getUser();
  const addTypeContainer = document.getElementById("add-type-container");

  if (isCatalogAdminRole(currentUser)) {
    if (addTypeContainer) {
      addTypeContainer.style.display = "block";
    }
    loadTypesManagement();
  } else if (currentUser) {
    if (addTypeContainer) {
      addTypeContainer.style.display = "none";
    }
    loadTypesManagement();
  }
}

// Charger les types pour la gestion
async function loadTypesManagement() {
  try {
    const data = await getTypes();
    allTypes = data;
    displayTypesManagement();
  } catch (error) {
    console.error("Erreur chargement types:", error);
  }
}

function displayTypesManagement() {
  const list = document.getElementById("types-list");

  if (!list) return;

  if (allTypes.length === 0) {
    list.innerHTML = `
      <div style="
        text-align: center;
        padding: 3rem 2rem;
        color: #999;
        font-size: 1rem;
      ">
        <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
        <div>Aucun type disponible</div>
      </div>
    `;
    return;
  }

  const currentUser = getUser();
  const isTechAdmin = isCatalogAdminRole(currentUser);

  list.innerHTML = allTypes
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (type) => `
        <div class="type-item" style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-bottom: 0.75rem;
          background: white;
          border: 1px solid #e8e8e8;
          border-radius: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        "
        onmouseover="this.style.boxShadow='0 4px 12px rgba(212, 134, 45, 0.15)'; this.style.borderColor='#d4862d';"
        onmouseout="this.style.boxShadow='0 1px 3px rgba(0, 0, 0, 0.05)'; this.style.borderColor='#e8e8e8';">
          
          <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
            <div style="
              width: 40px;
              height: 40px;
              background: linear-gradient(135deg, #f4a460 0%, #d4862d 100%);
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.2rem;
              box-shadow: 0 2px 4px rgba(212, 134, 45, 0.3);
            ">
              🗂️
            </div>

            <div style="flex: 1;">
              <div style="
                font-weight: 600;
                color: #2c3e50;
                font-size: 1rem;
                margin-bottom: 0.25rem;
              ">
                ${type.name}
              </div>
              <div style="
                font-size: 0.75rem;
                color: #95a5a6;
                font-family: 'Courier New', monospace;
              ">
                ID: ${type.id}
              </div>
            </div>
          </div>

          ${
            isTechAdmin
              ? `
            <div style="display: flex; gap: 0.5rem;">
              <button
                onclick="openEditTypeModal(${type.id})"
                class="action-btn edit-btn"
                style="
                  padding: 0.5rem 1rem;
                  background: white;
                  color: #2ecc71;
                  border: 2px solid #2ecc71;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 0.875rem;
                  font-weight: 600;
                  transition: all 0.2s ease;
                  display: flex;
                  align-items: center;
                  gap: 0.4rem;
                "
                onmouseover="this.style.background='#2ecc71'; this.style.color='white';"
                onmouseout="this.style.background='white'; this.style.color='#2ecc71';"
              >
                <span>✏️</span>
                <span>Modifier</span>
              </button>

              <button
                onclick="deleteTypeFromManagement(${type.id}, '${type.name.replace(/'/g, "\\'")}')"
                class="action-btn delete-btn"
                style="
                  padding: 0.5rem 1rem;
                  background: white;
                  color: #e74c3c;
                  border: 2px solid #e74c3c;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 0.875rem;
                  font-weight: 600;
                  transition: all 0.2s ease;
                  display: flex;
                  align-items: center;
                  gap: 0.4rem;
                "
                onmouseover="this.style.background='#e74c3c'; this.style.color='white';"
                onmouseout="this.style.background='white'; this.style.color='#e74c3c';"
              >
                <span>🗑️</span>
                <span>Supprimer</span>
              </button>
            </div>
          `
              : ""
          }
        </div>
      `,
    )
    .join("");
}

// Ajouter un type (TECH_ADMIN uniquement)
document
  .getElementById("add-type-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("type-name").value.trim();

    if (!name) {
      alert("⚠️ Le nom du type est requis");
      return;
    }

    try {
      await createType({ name });
      alert("✅ Type ajouté avec succès !");
      document.getElementById("type-name").value = "";

      await loadTypesManagement();
      await loadTypes();
      await loadProduits();
    } catch (error) {
      console.error("Erreur:", error);

      if (error.message && error.message.includes("403")) {
        alert(
          "❌ Vous n'avez pas les permissions nécessaires pour effectuer cette action.",
        );
      } else {
        alert(`❌ ${error.message || "Erreur lors de l'ajout du type"}`);
      }
    }
  });

// Modifier un type (TECH_ADMIN uniquement)
function openEditTypeModal(typeId) {
  const type = allTypes.find((t) => t.id === typeId);
  if (!type) return;

  const newName = prompt(
    `Modifier le type "${type.name}":\n\nNouveau nom:`,
    type.name,
  );

  if (newName && newName.trim() !== "" && newName.trim() !== type.name) {
    updateTypeFromManagement(typeId, newName.trim());
  }
}

async function updateTypeFromManagement(typeId, newName) {
  try {
    await updateType(typeId, { name: newName });
    alert("✅ Type modifié avec succès !");

    await loadTypesManagement();
    await loadTypes();
    await loadProduits();
  } catch (error) {
    console.error("Erreur:", error);
    alert(`❌ ${error.message || "Erreur lors de la modification du type"}`);
  }
}

// Supprimer un type (TECH_ADMIN uniquement)
async function deleteTypeFromManagement(typeId, typeName) {
  if (
    !confirm(
      `⚠️ Êtes-vous sûr de vouloir supprimer le type "${typeName}" ?\n\nCette action est irréversible.\n\n⚠️ La suppression échouera si des produits utilisent encore ce type.`,
    )
  ) {
    return;
  }

  try {
    await deleteTypeById(typeId);
    alert("✅ Type supprimé avec succès !");

    await loadTypesManagement();
    await loadTypes();
    await loadProduits();
  } catch (error) {
    console.error("Erreur:", error);
    if (error.message && error.message.includes("403")) {
      alert(
        "❌ Vous n'avez pas les permissions nécessaires pour effectuer cette action.",
      );
    } else {
      alert(
        `❌ Impossible de supprimer ce type\n\nDes produits utilisent probablement encore ce type.`,
      );
    }
  }
}

// Initialiser au chargement
window.addEventListener("DOMContentLoaded", () => {
  initCategoriesSection();
  initTypesSection();
});

// ===========================================
// GESTION DES FRANCHISES (TECH_ADMIN)
// ===========================================

let currentManagingProduitFranchises = null;

function updateManageProduitFranchisesSelectionUI() {
  const checkboxes = document.querySelectorAll(
    ".manage-produit-franchise-checkbox",
  );
  const selectedCount = Array.from(checkboxes).filter(
    (cb) => cb.checked,
  ).length;
  const totalCount = checkboxes.length;

  const countEl = document.getElementById("manage-produit-franchises-count");
  if (countEl) {
    countEl.textContent = `${selectedCount}/${totalCount} sélectionnée${selectedCount > 1 ? "s" : ""}`;
  }

  const saveBtn = document.getElementById("save-manage-produit-franchises");
  if (saveBtn && currentManagingProduitFranchises) {
    const selectedSet = new Set(
      Array.from(checkboxes)
        .filter((cb) => cb.checked)
        .map((cb) => String(cb.value)),
    );
    const previousSet = new Set(
      (currentManagingProduitFranchises.franchise_ids || []).map((id) =>
        String(id),
      ),
    );

    let hasChanges = selectedSet.size !== previousSet.size;
    if (!hasChanges) {
      for (const id of selectedSet) {
        if (!previousSet.has(id)) {
          hasChanges = true;
          break;
        }
      }
    }

    saveBtn.disabled = !hasChanges;
    saveBtn.style.opacity = hasChanges ? "1" : "0.6";
    saveBtn.style.cursor = hasChanges ? "pointer" : "not-allowed";
  }
}

function handleOpenManageProduitFranchises(produit) {
  currentManagingProduitFranchises = produit;

  const title = document.getElementById("manage-produit-franchises-title");
  if (title) {
    title.textContent = `🏢 Gérer les franchises`;
  }

  const subtitle = document.getElementById(
    "manage-produit-franchises-subtitle",
  );
  if (subtitle) {
    subtitle.textContent = `Produit : ${getDisplayProduitName(produit.name)}`;
  }

  renderManageProduitFranchiseCheckboxes(produit);
  updateManageProduitFranchisesSelectionUI();
  document.getElementById("manage-produit-franchises-modal").style.display =
    "block";
}

function renderManageProduitFranchiseCheckboxes(produit) {
  const container = document.getElementById(
    "manage-produit-franchise-checkboxes",
  );
  if (!container) return;

  const activeIds = new Set(
    (produit.franchise_ids || []).map((id) => String(id)),
  );

  container.innerHTML = allFranchises
    .map((franchise) => {
      const isChecked = activeIds.has(String(franchise.id));
      return `
        <label style="
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.7rem 0.75rem;
          border: 1px solid #eee;
          border-radius: 8px;
          margin-bottom: 0.5rem;
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease;
        ">
          <input
            type="checkbox"
            class="manage-produit-franchise-checkbox"
            value="${franchise.id}"
            ${isChecked ? "checked" : ""}
          />
          <span style="font-weight: 600; color: #2c3e50">${franchise.nom}</span>
        </label>
      `;
    })
    .join("");

  const checkboxes = container.querySelectorAll(
    ".manage-produit-franchise-checkbox",
  );
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener(
      "change",
      updateManageProduitFranchisesSelectionUI,
    );
  });
}

function closeManageProduitFranchisesModal() {
  document.getElementById("manage-produit-franchises-modal").style.display =
    "none";

  const subtitle = document.getElementById(
    "manage-produit-franchises-subtitle",
  );
  if (subtitle) {
    subtitle.textContent = "";
  }

  currentManagingProduitFranchises = null;
}

async function handleSaveManageProduitFranchises() {
  if (!currentManagingProduitFranchises) return;

  const checkboxes = document.querySelectorAll(
    ".manage-produit-franchise-checkbox",
  );

  const selectedIds = Array.from(checkboxes)
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);

  const previousIds = new Set(
    (currentManagingProduitFranchises.franchise_ids || []).map((id) =>
      String(id),
    ),
  );
  const selectedSet = new Set(selectedIds.map((id) => String(id)));

  const toActivate = selectedIds.filter((id) => !previousIds.has(String(id)));
  const toDeactivate = Array.from(previousIds).filter(
    (id) => !selectedSet.has(String(id)),
  );

  try {
    if (toActivate.length > 0) {
      await toggleProduitFranchise(
        currentManagingProduitFranchises.id,
        toActivate,
        true,
      );
    }

    if (toDeactivate.length > 0) {
      await toggleProduitFranchise(
        currentManagingProduitFranchises.id,
        toDeactivate,
        false,
      );
    }

    closeManageProduitFranchisesModal();
    await loadProduits();
    alert("✅ Franchises du produit mises à jour.");
  } catch (error) {
    console.error(
      "Erreur lors de la mise à jour des franchises produit:",
      error,
    );
    alert("❌ Erreur lors de la mise à jour des franchises.");
  }
}
