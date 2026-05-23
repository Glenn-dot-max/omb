// js/formules.js
// Logique de la page formules : affichage, ajout, suppression, recherche

const __ombNativeAlertFormules = window.alert.bind(window);
window.alert = function (message) {
  if (typeof showToast === "function") {
    const msg = String(message ?? "");
    const isError = /❌|erreur|impossible|refus|introuvable/i.test(msg);
    const isSuccess =
      /✅|succès|créé|ajouté|modifié|supprimé|mis à jour|réactiv|restaur/i.test(
        msg,
      );
    showToast(msg, isError ? "error" : isSuccess ? "success" : "info", 3500);
    return;
  }
  __ombNativeAlertFormules(String(message ?? ""));
};

// ===========================================
// VARIABLES GLOBALES
// ===========================================

let allFormules = [];
let allProduits = [];
let allUnites = [];
let allFranchises = [];

// Variables pour le toggle et le tri
let currentView = localStorage.getItem("formulesView") || "cards";
let sortColumn = localStorage.getItem("formules_sort_column") || "name";
let sortDirection = localStorage.getItem("formules_sort_direction") || "asc";

// Variables de filtrage
let currentTypeFilter = "";
let currentSearchTerm = "";
let currentFranchiseFilter = "";
let currentFilteredFormules = [];

let currentEditingFormule = null;
let currentManagingFranchisesFormule = null;
let tempProduitsToCreate = [];

let allUnite = [];

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
  await Promise.allSettled([loadFormules(), loadFranchises(), loadUnite()]);
}

function showFormulesLoading() {
  const loading = document.getElementById("formules-loading");
  if (loading) loading.style.display = "block";
}

function hideFormulesLoading() {
  const loading = document.getElementById("formules-loading");
  if (loading) loading.style.display = "none";
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
      console.log("✅ Filtre franchise masqué (utilisateur non TECH_ADMIN)");
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

    console.log(
      `✅ Filtre franchise activé pour TECH_ADMIN (${allFranchises.length} franchises chargées)`,
    );
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
  if (!select) return;

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

function setupFranchiseAccordion() {
  const header = document.getElementById("franchise-accordion-header");
  const content = document.getElementById("franchise-accordion-content");
  const icon = document.getElementById("franchise-accordion-icon");

  if (!header || !content || !icon) return;

  let isOpen = false;

  header.addEventListener("click", () => {
    isOpen = !isOpen;

    if (isOpen) {
      content.style.maxHeight = content.scrollHeight + "px";
      icon.style.transform = "rotate(180deg)";
      header.style.background =
        "linear-gradient(135deg, #d4862d 0%, #f4a460 100%)";
    } else {
      content.style.maxHeight = "0";
      icon.style.transform = "rotate(0deg)";
      header.style.background =
        "linear-gradient(135deg, #f4a460 0%, #d4862d 100%)";
    }
  });
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
        // Nettoyer la valeur
        const nomPropre = unite.nom.trim();
        option.value = nomPropre;
        option.textContent = nomPropre;
        select.appendChild(option);
      });

      // Sélectionner "unité" par défault si disponible
      if (select.querySelector('option[value="unité"]')) {
        select.value = "unité";
        console.log(`✅ "unité" sélectionné par défaut dans ${select.id}`);
      }
    }
  });
}

// ===========================================
// GESTION DU TOGGLE DE VUE
// ===========================================

function initViewToggle() {
  const viewCardsBtn = document.getElementById("view-cards");
  const viewTableBtn = document.getElementById("view-table");

  if (!viewCardsBtn || !viewTableBtn) {
    console.warn("Boutons de toggle de vue non trouvés.");
    return;
  }

  // Appliquer la vue sauvegardée
  setViewMode(currentView);

  viewCardsBtn.addEventListener("click", () => setViewMode("cards"));
  viewTableBtn.addEventListener("click", () => setViewMode("table"));
}

function setViewMode(mode) {
  currentView = mode;
  localStorage.setItem("formulesView", mode);

  const viewCardsBtn = document.getElementById("view-cards");
  const viewTableBtn = document.getElementById("view-table");

  if (mode === "cards") {
    viewCardsBtn.classList.add("active");
    viewTableBtn.classList.remove("active");
  } else {
    viewCardsBtn.classList.remove("active");
    viewTableBtn.classList.add("active");
  }

  const formules =
    currentFilteredFormules.length > 0 ? currentFilteredFormules : allFormules;
  displayFormules(formules);
}

// ===========================================
// GESTION DU TRI
// ===========================================

function sortFormules(formules, column, direction) {
  return [...formules].sort((a, b) => {
    let aVal, bVal;

    switch (column) {
      case "name":
        aVal = a.name?.toLowerCase() || "";
        bVal = b.name?.toLowerCase() || "";
        break;
      case "type":
        aVal = a.type_formule?.toLowerCase() || "";
        bVal = b.type_formule?.toLowerCase() || "";
        break;
      case "couverts":
        aVal = parseInt(a.nombre_couverts) || 0;
        bVal = parseInt(b.nombre_couverts) || 0;
        break;
      default:
        return 0;
    }

    if (typeof aVal === "string") {
      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
    } else {
      return direction === "asc" ? aVal - bVal : bVal - aVal;
    }
  });
}

function handleSort(column) {
  if (sortColumn === column) {
    sortDirection = sortDirection === "asc" ? "desc" : "asc";
  } else {
    sortColumn = column;
    sortDirection = "asc";
  }

  localStorage.setItem("formules_sort_column", sortColumn);
  localStorage.setItem("formules_sort_direction", sortDirection);

  const formules =
    currentFilteredFormules.length > 0 ? currentFilteredFormules : allFormules;
  displayFormules(formules);
}

// ===========================================
// CHARGEMENT DES FORMULES
// ===========================================
async function loadFormules() {
  showFormulesLoading();
  try {
    const currentUser = getUser();
    const formulesList = document.getElementById("formules-list");
    formulesList.innerHTML = "";

    let formules;

    if (
      currentFranchiseFilter &&
      currentUser &&
      isCatalogAdminRole(currentUser)
    ) {
      console.log(
        `🔍 Chargement des formules pour la franchise ID ${currentFranchiseFilter}`,
      );

      const [franchiseFormules, catalogFormules] = await Promise.all([
        apiGet(`/admin/franchises/${currentFranchiseFilter}/formules`),
        getFormules(),
      ]);

      const activeIds = new Set(
        (franchiseFormules || []).filter((f) => f.active).map((f) => f.id),
      );

      formules = (catalogFormules || []).filter((f) => activeIds.has(f.id));

      console.log(
        `✅ ${formules.length} formules chargées pour la franchise ID ${currentFranchiseFilter}`,
      );
    } else {
      console.log("📦 Chargement de toutes les formules");
      formules = await getFormules();
    }

    allFormules = formules;
    currentFilteredFormules = formules;
    displayFormules(formules);
  } catch (error) {
    console.error("Erreur lors du chargement des formules :", error);
    const formulesList = document.getElementById("formules-list");
    formulesList.innerHTML =
      '<p style="color: red;">Erreur lors du chargement des formules.</p>';
  } finally {
    hideFormulesLoading();
  }
}

// ===========================================
// AFFICHAGE DES FORMULES
// ===========================================

function displayFormules(formules) {
  const container = document.getElementById("formules-list");

  if (!formules || formules.length === 0) {
    if (currentView === "cards") {
      container.className = "products-list";
      container.innerHTML =
        '<p style="text-align: center; color: #999; padding: 2rem;">Aucune formule trouvée</p>';
    } else {
      container.className = "products-table";
      container.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Type</th>
                <th>Couverts</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="4" class="empty-table">Aucune formule trouvée</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }
    return;
  }

  // Trier les formules
  const sortedFormules = sortFormules(formules, sortColumn, sortDirection);

  if (currentView === "cards") {
    displayFormulesCards(sortedFormules, container);
  } else {
    displayFormulesTable(sortedFormules, container);
  }
}

function getDisplayFormuleName(name) {
  if (!name) return "";
  // Masquer le suffixe technique ajouté côté backend: "Nom (uuid-franchise)"
  return name.replace(
    /\s*\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)\s*$/i,
    "",
  );
}

// ===========================================
// AFFICHAGE VUE CARTES
// ===========================================

function displayFormulesCards(formules, container) {
  const currentUser = getUser();
  const isTechAdmin = isCatalogAdminRole(currentUser);

  container.className = "products-list";
  container.innerHTML = formules
    .map((formule) => {
      const typeBadgeClass =
        formule.type_formule === "Brunch" ? "type" : "category";
      const isFranchiseOwned =
        !isTechAdmin && (formule.nb_franchises || 0) === 1;
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
          ">✅ Formule propre à votre franchise</div>`
        : "";

      let franchiseInfo = "";
      if (isTechAdmin) {
        if (formule.nb_franchises === 0) {
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
              ⚠️ Non assignée à une franchise
            </div>
          `;
        } else if (
          formule.is_limited &&
          formule.franchises &&
          formule.franchises.length > 0
        ) {
          const franchisesText = formule.franchises.join(", ");
          franchiseInfo = `
            <div style="
              margin-top: 0.75rem;
              padding: 0.75rem;
              background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
              border-left: 4px solid #d4862d;
              border-radius: 6px;
              font-size: 0.85rem;
            ">
              <div style="
                color: #d4862d;
                font-weight: 600;
                margin-bottom: 0.4rem;
                display: flex;
                gap: 0.3rem;
              ">
                📍 Limité aux franchises :
              </div>
              <div style="color: #5d4037; line-height: 1.4;">${franchisesText}</div>
              <div style="color: #999; font-size: 0.75rem; margin-top: 0.3rem;">
                (${formule.nb_franchises}/${formule.total_franchises} franchises)
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

      const displayName = getDisplayFormuleName(formule.name);
      const manageFranchisesButton = isTechAdmin
        ? `<button class="edit-btn" onclick="handleOpenManageFranchises(${JSON.stringify(formule).replace(/"/g, "&quot;")})">🏢 Franchises</button>`
        : "";

      return `
        <div class="product-item">
          <div class="product-name">${displayName}</div>
          <div class="product-details">
            <span class="badge ${typeBadgeClass}">${formule.type_formule || "Non-Brunch"}</span>
            <span class="badge category">${formule.nombre_couverts} couverts</span>
          </div>
          ${ownershipBadge}
          ${franchiseInfo}
          <div class="product-actions">
          ${
            isTechAdmin
              ? `<button class="edit-btn" onclick="handleEditFormule(${JSON.stringify(formule).replace(/"/g, "&quot;")})">✏️ Modifier</button>`
              : `<button class="edit-btn" onclick="handleEditFormule(${JSON.stringify(formule).replace(/"/g, "&quot;")})">✏️ Modifier</button>`
          }
            ${manageFranchisesButton}
            <button class="delete-btn" onclick="handleDeleteFormule('${formule.id}')">
                ${isTechAdmin ? "🗑️ Supprimer" : "🚫 Désactiver"}</button>
          </div>
        </div>
      `;
    })
    .join("");
}

// ===========================================
// AFFICHAGE VUE TABLEAU
// ===========================================

function displayFormulesTable(formules, container) {
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
            <th class="${getSortClass("type")}" onclick="handleSort('type')">Type</th>
            <th class="${getSortClass("couverts")}" onclick="handleSort('couverts')">Couverts</th>
            ${isTechAdmin ? '<th style="min-width: 200px;">Franchises</th>' : ""}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${formules
            .map((formule) => {
              const typeBadgeClass =
                formule.type_formule === "Brunch" ? "type" : "category";
              const isFranchiseOwned =
                !isTechAdmin && (formule.nb_franchises || 0) === 1;
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
              const displayName = getDisplayFormuleName(formule.name);
              const formuleJson = JSON.stringify(formule).replace(
                /"/g,
                "&quot;",
              );
              const manageFranchisesButton = isTechAdmin
                ? `<button class="edit-btn" onclick="handleOpenManageFranchises(${formuleJson})">🏢 Franchises</button>`
                : "";

              let franchisesCell = "";
              if (isTechAdmin) {
                if (formule.nb_franchises === 0) {
                  franchisesCell = `
                    <td style="
                      color: #e74c3c;
                      font-weight: 600;
                      text-align: center;
                    ">
                      ⚠️ Non assignée à une franchise
                    </td>
                  `;
                } else if (
                  formule.is_limited &&
                  formule.franchises &&
                  formule.franchises.length > 0
                ) {
                  const franchisesText = formule.franchises.join(", ");
                  franchisesCell = `
                    <td style="font-size: 0.9rem;">
                      <div style="
                        color: #d4862d;
                        font-weight: 600;
                        margin-bottom: 0.3rem;
                      ">
                        📍 ${franchisesText}
                      </div>
                      <small style="color: #999;">
                        (${formule.nb_franchises}/${formule.total_franchises} franchises)
                      </small>
                    </td>
                  `;
                } else {
                  franchisesCell = `
                    <td style="
                      color: #666;
                      font-style: italic;
                      text-align: center;
                    ">
                      ✓ Disponible pour toutes les franchises
                    </td>
                  `;
                }
              }

              return `
                <tr>
                  <td class="product-name">${displayName}${ownershipBadge}</td>
                  <td><span class="badge ${typeBadgeClass}">${formule.type_formule || "Non-Brunch"}</span></td>
                  <td>${formule.nombre_couverts}</td>
                  ${franchisesCell}
                  <td>
                    <div class="table-actions">
                    ${
                      isTechAdmin
                        ? `<button class="edit-btn" onclick="handleEditFormule(${formuleJson})">✏️ Modifier</button>`
                        : `<button class="edit-btn" onclick="handleEditFormule(${formuleJson})">✏️ Modifier</button>`
                    }
                      ${manageFranchisesButton}
                      <button class="delete-btn" onclick="handleDeleteFormule('${formule.id}')">
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
  const form = document.getElementById("add-formule-form");
  if (form) {
    form.addEventListener("submit", handleAddFormule);
  }

  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", handleSearch);

  const filterType = document.getElementById("filter-type");
  filterType.addEventListener("change", handleFilterChange);

  const filterFranchise = document.getElementById("filter-franchise");
  if (filterFranchise) {
    filterFranchise.addEventListener("change", handleFranchiseChange);
  }

  const resetBtn = document.getElementById("reset-filters");
  resetBtn.addEventListener("click", handleResetFilters);

  // Fermer tous les modales avec X
  const closeButtons = document.querySelectorAll(".close-modal");
  closeButtons.forEach((btn, index) => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".modal");
      if (!modal) return;

      if (modal.id === "details-modal") {
        closeDetailsModal();
      } else if (modal.id === "create-modal") {
        closeCreateFormuleModal();
      } else if (modal.id === "manage-franchises-modal") {
        closeManageFranchisesModal();
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

  const saveDetailsFranchise = document.getElementById(
    "save-formule-details-franchise",
  );
  if (saveDetailsFranchise) {
    saveDetailsFranchise.addEventListener("click", handleSaveFormuleDetails);
  }

  const restoreOriginalBtn = document.getElementById(
    "restore-original-formule",
  );
  if (restoreOriginalBtn) {
    restoreOriginalBtn.addEventListener("click", handleRestoreOriginalFormule);
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

  const cancelManageFranchises = document.getElementById(
    "cancel-manage-franchises",
  );
  if (cancelManageFranchises) {
    cancelManageFranchises.addEventListener(
      "click",
      closeManageFranchisesModal,
    );
  }

  const saveManageFranchises = document.getElementById(
    "save-manage-franchises",
  );
  if (saveManageFranchises) {
    saveManageFranchises.addEventListener("click", handleSaveManageFranchises);
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
  const currentUser = getUser();
  const isTechAdmin = isCatalogAdminRole(currentUser);

  const message = isTechAdmin
    ? "⚠️ Êtes-vous sûr de vouloir supprimer définitivement cette formule ?\n\nCette action est irréversible pour toutes les franchises."
    : "⚠️ Êtes-vous sûr de vouloir supprimer cette formule ?\n\nElle ne sera plus visible pour votre franchise.";

  if (!confirm(message)) {
    return;
  }

  try {
    await deleteFormule(formuleId);

    allFormules = allFormules.filter((f) => f.id !== formuleId);
    currentFilteredFormules = currentFilteredFormules.filter(
      (f) => f.id !== formuleId,
    );
    displayFormules(
      currentFilteredFormules.length > 0
        ? currentFilteredFormules
        : allFormules,
    );
    alert(
      isTechAdmin
        ? "✅ Formule supprimée avec succès !"
        : "✅ Formule supprimée pour votre franchise !",
    );
  } catch (error) {
    console.error("Erreur lors de la suppression de la formule :", error);
    alert(
      isTechAdmin
        ? "❌ Erreur lors de la suppression de la formule."
        : "❌ Erreur lors de la suppression de la formule pour votre franchise.",
    );
  }
}

// ===========================================
// GESTION DES DÉTAILS D'UNE FORMULE
// ===========================================

async function handleEditFormule(formule) {
  currentEditingFormule = formule;

  const currentUser = getUser();
  const isTechAdmin = isCatalogAdminRole(currentUser);

  // Pré-remplir les informations générales
  document.getElementById("detail-formule-name").value = formule.name;
  document.getElementById("detail-formule-couverts").value =
    formule.nombre_couverts;
  document.getElementById("detail-formule-type").value = formule.type_formule;

  // Toujours afficher le bouton de sauvegarde pour non-admin et admin
  const saveBtn = document.getElementById("save-formule-details");
  const saveFranchiseBtn = document.getElementById(
    "save-formule-details-franchise",
  );
  const restoreOriginalBtn = document.getElementById(
    "restore-original-formule",
  );
  const isSharedForNonAdmin = !isTechAdmin && (formule.nb_franchises || 0) > 1;
  const isOwnedByFranchise = !isTechAdmin && (formule.nb_franchises || 0) === 1;

  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.style.display = isSharedForNonAdmin ? "none" : "inline-block";
    saveBtn.textContent = "Enregistrer les modifications";
  }

  if (saveFranchiseBtn) {
    saveFranchiseBtn.disabled = false;
    saveFranchiseBtn.style.display = isSharedForNonAdmin
      ? "inline-block"
      : "none";
  }

  if (restoreOriginalBtn) {
    restoreOriginalBtn.disabled = false;
    restoreOriginalBtn.style.display = "none";
  }

  // Charger les produits de la formule
  await loadFormuleProduits(formule.id);

  // Charger la liste de tous les produits pour le select
  await loadProduitsForSelect();

  // Afficher la modale
  document.getElementById("details-modal").style.display = "block";

  // ⚠️ Afficher l'avertissement si formule partagée et utilisateur non-admin
  let warningDiv = document.getElementById("warning-shared-formule");
  if (!warningDiv) {
    // Créer le div d'avertissement s'il n'existe pas
    warningDiv = document.createElement("div");
    warningDiv.id = "warning-shared-formule";
    warningDiv.style.cssText =
      "display: none; margin: 0.5rem 1rem; padding: 1rem; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;";
    warningDiv.innerHTML = `
      <div style="font-weight: 600; color: #856404; margin-bottom: 0.25rem;">⚠️ Formule partagée</div>
      <div style="font-size: 0.9rem; color: #856404;">Une copie exclusive sera créée pour votre franchise lors de la sauvegarde.</div>
    `;
    const modalBody = document.querySelector("#details-modal .modal-header");
    modalBody.insertAdjacentElement("afterend", warningDiv);
  }

  // Afficher le warning si non-admin et formule partagée
  if (isSharedForNonAdmin) {
    warningDiv.style.display = "block";
  } else {
    warningDiv.style.display = "none";
  }
}

function closeDetailsModal() {
  document.getElementById("details-modal").style.display = "none";
  currentEditingFormule = null;

  const saveBtn = document.getElementById("save-formule-details");
  const saveFranchiseBtn = document.getElementById(
    "save-formule-details-franchise",
  );
  const restoreOriginalBtn = document.getElementById(
    "restore-original-formule",
  );
  if (saveBtn) saveBtn.style.display = "inline-block";
  if (saveFranchiseBtn) saveFranchiseBtn.style.display = "none";
  if (restoreOriginalBtn) restoreOriginalBtn.style.display = "none";

  // Vider les champs
  document.getElementById("detail-formule-name").value = "";
  document.getElementById("detail-formule-couverts").value = "1";
  document.getElementById("detail-formule-type").value = "Brunch";
  document.getElementById("produits-list").innerHTML =
    '<p class="empty-state">Aucun produit dans cette formule.</p>';
}

async function handleRestoreOriginalFormule() {
  if (!currentEditingFormule) return;

  const confirmRestore = confirm(
    "⚠️ Restaurer la version partagée ?\n\n" +
      "Votre formule actuelle sera désactivée pour votre franchise et la version partagée sera réactivée.",
  );

  if (!confirmRestore) {
    return;
  }

  try {
    await restoreOriginalFormule(currentEditingFormule.id);
    closeDetailsModal();
    await loadFormules();
    alert("✅ Version partagée restaurée avec succès !");
  } catch (error) {
    console.error("Erreur restauration formule partagée:", error);
    alert(
      error.message ||
        "❌ Impossible de restaurer la version partagée pour cette formule.",
    );
  }
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
    document.getElementById("produit-unite").value = "unité";

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

  // ⚠️ Avertissement pour les non-admins si formule partagée
  const currentUser = getUser();
  const isTechAdmin = isCatalogAdminRole(currentUser);

  if (!isTechAdmin && currentEditingFormule.nb_franchises > 1) {
    const proceed = confirm(
      "⚠️ ATTENTION : Cette formule est partagée avec d'autres franchises.\n\n" +
        "Une copie exclusive sera créée pour votre franchise avec les mêmes produits.\n\n" +
        "Voulez-vous continuer ?",
    );
    if (!proceed) {
      return;
    }
  }

  try {
    const formuleModifiee = await updateFormule(currentEditingFormule.id, {
      name: name,
      nombre_couverts: parseInt(couverts),
      type_formule: type,
    });

    // ✅ Vérifier si une copie a été créée (réponse du backend avec is_new_copy)
    if (formuleModifiee.is_new_copy) {
      // Retirer l'ancienne formule de la liste
      allFormules = allFormules.filter(
        (f) => f.id !== currentEditingFormule.id,
      );

      // Ajouter la nouvelle formule à la liste
      allFormules.push(formuleModifiee);

      displayFormules(allFormules);
      closeDetailsModal();

      alert(
        "✅ Une copie exclusive de la formule a été créée pour votre franchise !\n\n" +
          "Vos produits ont été copiés automatiquement.\n\n" +
          "La formule partagée reste inchangée pour les autres franchises.",
      );
    } else {
      // Modification simple (formule exclusive)
      const index = allFormules.findIndex(
        (f) => f.id === currentEditingFormule.id,
      );
      if (index !== -1) {
        allFormules[index] = formuleModifiee;
      }

      displayFormules(allFormules);
      closeDetailsModal();
      alert("✅ Formule modifiée avec succès !");
    }
  } catch (error) {
    console.error("Erreur modification formule:", error);

    if (error.message && error.message.includes("403")) {
      alert(
        "❌ Vous n'avez pas les permissions nécessaires pour modifier cette formule. \n\n" +
          "Contactez l'administrateur.",
      );
    } else if (error.message && error.message.includes("404")) {
      alert(
        "❌ Formule introuvable. Il se peut qu'elle ait été supprimée ou que vous n'ayez plus accès à cette formule.",
      );
      closeDetailsModal();
      await loadFormules();
    } else {
      alert(
        `❌ ${error.message} || "Erreur lors de la modification de la formule."`,
      );
    }
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

function handleOpenManageFranchises(formule) {
  const currentUser = getUser();
  if (!isCatalogAdminRole(currentUser)) {
    return;
  }

  currentManagingFranchisesFormule = formule;

  const title = document.getElementById("manage-franchises-formule-name");
  if (title) {
    title.textContent = `Formule : ${getDisplayFormuleName(formule.name)}`;
  }

  renderManageFranchiseCheckboxes(formule.franchise_ids || []);
  document.getElementById("manage-franchises-modal").style.display = "block";
}

function renderManageFranchiseCheckboxes(activeFranchiseIds) {
  const container = document.getElementById("manage-franchises-checkboxes");
  if (!container) return;

  container.innerHTML = "";

  if (allFranchises.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:3rem 2rem;color:#999;font-size:1rem;grid-column:1/-1">
        <div style="font-size:3rem;margin-bottom:1rem;">🏢</div>
        <div>Aucune franchise disponible</div>
      </div>
    `;
    return;
  }

  allFranchises
    .slice()
    .sort((a, b) => (a.nom || "").localeCompare(b.nom || ""))
    .forEach((franchise) => {
      const isActive = activeFranchiseIds.includes(franchise.id);
      const item = document.createElement("div");
      item.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.25rem;
        background: white;
        border: 1px solid ${isActive ? "#d4862d" : "#e8e8e8"};
        border-radius: 8px;
        transition: all 0.3s ease;
        box-shadow: ${isActive ? "0 4px 12px rgba(212,134,45,0.15)" : "0 1px 3px rgba(0,0,0,0.05)"};
        cursor: pointer;
      `;

      item.onmouseover = () => {
        item.style.boxShadow = "0 4px 12px rgba(212,134,45,0.18)";
        item.style.borderColor = "#d4862d";
      };
      item.onmouseout = () => {
        const cb = item.querySelector(".manage-franchise-checkbox");
        const checked = cb && cb.checked;
        item.style.boxShadow = checked
          ? "0 4px 12px rgba(212,134,45,0.15)"
          : "0 1px 3px rgba(0,0,0,0.05)";
        item.style.borderColor = checked ? "#d4862d" : "#e8e8e8";
      };
      item.onclick = (e) => {
        if (e.target.tagName === "INPUT") return;
        const cb = item.querySelector(".manage-franchise-checkbox");
        if (cb) cb.click();
      };

      item.innerHTML = `
        <div style="display:flex;align-items:center;gap:1rem;flex:1">
          <div style="
            width:40px;height:40px;
            background:linear-gradient(135deg,#f4a460 0%,#d4862d 100%);
            border-radius:8px;
            display:flex;align-items:center;justify-content:center;
            font-size:1.2rem;
            box-shadow:0 2px 4px rgba(212,134,45,0.3);
            flex-shrink:0;
          ">🏢</div>
          <div style="flex:1">
            <div style="font-weight:600;color:#2c3e50;font-size:1rem;margin-bottom:0.15rem;">
              ${franchise.nom || "Franchise"}
            </div>
          </div>
        </div>
        <label style="display:flex;align-items:center;gap:0.6rem;cursor:pointer;user-select:none;">
          <input
            type="checkbox"
            class="manage-franchise-checkbox"
            value="${franchise.id}"
            ${isActive ? "checked" : ""}
            style="
              width:20px;height:20px;
              accent-color:#d4862d;
              cursor:pointer;
            "
          />
          <span style="font-size:0.85rem;font-weight:600;color:${isActive ? "#d4862d" : "#95a5a6"};"
            class="franchise-status-label">
            ${isActive ? "Activée" : "Désactivée"}
          </span>
        </label>
      `;

      // Mettre à jour l'apparence quand la case change
      const cb = item.querySelector(".manage-franchise-checkbox");
      cb.addEventListener("change", () => {
        const checked = cb.checked;
        item.style.borderColor = checked ? "#d4862d" : "#e8e8e8";
        item.style.boxShadow = checked
          ? "0 4px 12px rgba(212,134,45,0.15)"
          : "0 1px 3px rgba(0,0,0,0.05)";
        const label = item.querySelector(".franchise-status-label");
        if (label) {
          label.textContent = checked ? "Activée" : "Désactivée";
          label.style.color = checked ? "#d4862d" : "#95a5a6";
        }
      });

      container.appendChild(item);
    });
}

function closeManageFranchisesModal() {
  const modal = document.getElementById("manage-franchises-modal");
  if (modal) modal.style.display = "none";
  currentManagingFranchisesFormule = null;

  const container = document.getElementById("manage-franchises-checkboxes");
  if (container) container.innerHTML = "";
}

async function handleSaveManageFranchises() {
  if (!currentManagingFranchisesFormule) return;

  const selectedIds = Array.from(
    document.querySelectorAll(".manage-franchise-checkbox:checked"),
  ).map((checkbox) => checkbox.value);

  const currentIds = currentManagingFranchisesFormule.franchise_ids || [];
  const toActivate = selectedIds.filter((id) => !currentIds.includes(id));
  const toDeactivate = currentIds.filter((id) => !selectedIds.includes(id));

  try {
    if (toActivate.length > 0) {
      await toggleFormuleFranchises(
        currentManagingFranchisesFormule.id,
        toActivate,
        true,
      );
    }

    if (toDeactivate.length > 0) {
      await toggleFormuleFranchises(
        currentManagingFranchisesFormule.id,
        toDeactivate,
        false,
      );
    }

    closeManageFranchisesModal();
    await loadFormules();
    alert("✅ Franchises mises à jour avec succès !");
  } catch (error) {
    console.error("Erreur mise à jour franchises formule:", error);
    alert(error.message || "❌ Erreur lors de la mise à jour des franchises.");
  }
}

async function handleRestoreSharedDeletedFormule() {
  const currentUser = getUser();
  if (!isCatalogAdminRole(currentUser)) {
    alert("Cette action est réservée aux admins catalogue.");
    return;
  }

  if (!currentFranchiseFilter) {
    alert("Sélectionnez d'abord une franchise avec le filtre de franchise.");
    return;
  }

  try {
    const restorable = await getRestorableSharedFormules(
      currentFranchiseFilter,
    );

    if (!restorable || restorable.length === 0) {
      alert("Aucune formule partagée à restaurer.");
      return;
    }

    const optionsText = restorable
      .map(
        (f, index) =>
          `${index + 1}. ${getDisplayFormuleName(f.name)} (${f.type_formule || "Non-Brunch"}, ${f.nombre_couverts || 0} couverts)`,
      )
      .join("\n");

    const input = prompt(
      "Choisissez le numéro de la formule partagée à restaurer :\n\n" +
        optionsText,
    );

    if (!input) {
      return;
    }

    const selectedIndex = parseInt(input, 10) - 1;
    if (
      Number.isNaN(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex >= restorable.length
    ) {
      alert("Sélection invalide.");
      return;
    }

    const selected = restorable[selectedIndex];
    const selectedName = getDisplayFormuleName(selected.name);

    const confirmed = confirm(
      `Restaurer la formule partagée \"${selectedName}\" ?`,
    );
    if (!confirmed) {
      return;
    }

    await restoreSharedFormule(selected.id, currentFranchiseFilter);
    await loadFormules();
    alert(`✅ La formule \"${selectedName}\" a été restaurée.`);
  } catch (error) {
    console.error("Erreur restauration formule partagée:", error);
    alert(error.message || "❌ Erreur lors de la restauration.");
  }
}

function updateRestoreSharedButtonVisibility() {
  // Bouton supprimé du header - no-op
}

function handleFranchiseChange() {
  const currentuser = getUser();

  if (!isCatalogAdminRole(currentuser)) {
    console.warn("⚠️ Accès refusé : filtre franchise réservé aux TECH_ADMIN");
    return;
  }

  currentFranchiseFilter = document.getElementById("filter-franchise").value;

  if (currentFranchiseFilter) {
    console.log(`🔍 Filtrage par franchise : ${currentFranchiseFilter}`);
  } else {
    console.log("🔍 Retour à toutes les formules");
  }

  updateRestoreSharedButtonVisibility();
  loadFormules();
}

function handleResetFilters() {
  currentSearchTerm = "";
  currentTypeFilter = "";
  currentFranchiseFilter = "";

  document.getElementById("search-input").value = "";
  document.getElementById("filter-type").value = "";
  const filterFranchise = document.getElementById("filter-franchise");
  if (filterFranchise) {
    filterFranchise.value = "";
  }

  currentFilteredFormules = allFormules;
  displayFormules(allFormules);

  updateRestoreSharedButtonVisibility();
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

  currentFilteredFormules = filteredFormules;
  displayFormules(filteredFormules);
}

// ===========================================
// GESTION DE LA CRÉATION D'UNE FORMULE AVEC PRODUITS
// ===========================================

async function handleOpenCreateModal() {
  tempProduitsToCreate = [];

  // Charger la liste des produits pour le select
  await loadProduitsForCreateSelect();

  // S'assurer que les unités sont chargées
  if (allUnite.length === 0) {
    await loadUnite();
  } else {
    populateUniteSelects();
  }

  // Réinitialiser les champs
  document.getElementById("create-formule-name").value = "";
  document.getElementById("create-formule-couverts").value = "1";
  document.getElementById("create-formule-type").value = "Brunch";

  // Réinitialiser le quantité et unité
  document.getElementById("create-produit-quantite").value = "1";

  // Sélectionner 'unité' par défault
  const uniteSelect = document.getElementById("create-produit-unite");
  if (uniteSelect) {
    setTimeout(() => {
      if (uniteSelect.querySelector('option[value="unité"]')) {
        uniteSelect.value = "unité";
      }
    }, 100);
  }

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
  document.getElementById("create-produit-unite").value = "unité";
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

  const currentUser = getUser();
  let franchiseIds = null;

  if (isCatalogAdminRole(currentUser)) {
    const checkedBoxes = document.querySelectorAll(
      ".franchise-checkbox:checked",
    );

    if (checkedBoxes.length > 0) {
      franchiseIds = Array.from(checkedBoxes).map((cb) => cb.value);
      console.log(`✅ Franchises sélectionnées : ${franchiseIds.length}`);
    } else {
      console.log(
        "⚠️ Aucune franchise sélectionnée, la formule ne sera pas limitée",
      );
      franchiseIds = [];
    }
  }

  try {
    const formuleData = {
      name: name,
      nombre_couverts: parseInt(couverts),
      type_formule: type,
    };

    if (isCatalogAdminRole(currentUser)) {
      formuleData.franchise_ids = franchiseIds;
    }

    const nouvelleFormule = await createFormule(formuleData);

    for (const produit of tempProduitsToCreate) {
      await createFormuleProduit({
        formule_id: nouvelleFormule.id,
        produit_id: produit.produit_id,
        quantite: produit.quantite,
        unite: produit.unite,
      });
    }

    allFormules.push(nouvelleFormule);
    displayFormules(allFormules);
    closeCreateFormuleModal();

    const allCheckboxes = document.querySelectorAll(".franchise-checkbox");
    allCheckboxes.forEach((cb) => (cb.checked = false));
    const selectAll = document.getElementById("select-all-franchises");
    if (selectAll) selectAll.checked = false;

    alert(`Formule "${name}" créée avec succès !`);
  } catch (error) {
    console.error("Erreur création formule avec produits:", error);

    if (error.message && error.message.includes("existe déjà")) {
      alert("❌ Cette formule existe déjà dans la base de données.");
    } else {
      alert("Erreur lors de la création de la formule.");
    }
  }
}
