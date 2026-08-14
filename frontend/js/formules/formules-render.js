// js/formules/formules-render.js
// Affichage, tri et changement des formules

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
  setViewMode(AppState.currentView);

  viewCardsBtn.addEventListener("click", () => setViewMode("cards"));
  viewTableBtn.addEventListener("click", () => setViewMode("table"));
}

function setViewMode(mode) {
  AppState.currentView = mode;
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
        aVal = a.name?.toLowerCase() || "";
        bVal = b.name?.toLowerCase() || "";
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
  if (AppState.sortColumn === column) {
    sortDirection = sortDirection === "asc" ? "desc" : "asc";
  } else {
    AppState.sortColumn = column;
    sortDirection = "asc";
  }

  localStorage.setItem("formules_sort_column", AppState.sortColumn);
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
    if (AppState.currentView === "cards") {
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
  const sortedFormules = sortFormules(
    formules,
    AppState.sortColumn,
    sortDirection,
  );

  if (AppState.currentView === "cards") {
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
      const typeBadgeClass = "category";
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
    if (AppState.sortColumn !== column) return "sortable";
    return sortDirection === "asc" ? "sort-asc" : "sort-desc";
  };

  container.innerHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th class="${getSortClass("name")}" onclick="handleSort('name')">Nom</th>
            <th class="${getSortClass("couverts")}" onclick="handleSort('couverts')">Couverts</th>
            ${isTechAdmin ? '<th style="min-width: 200px;">Franchises</th>' : ""}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${formules
            .map((formule) => {
              const typeBadgeClass = "category";
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
