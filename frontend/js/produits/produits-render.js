// js/produits/produits-render.js
// Affichage, tri et chargement des produits

// ===========================================
// GESTION DU TOGGLE VUE
// ===========================================

function initViewToggle() {
  const viewCardsBtn = document.getElementById("view-cards");
  const viewTableBtn = document.getElementById("view-table");

  // Appliquer la vue sauvegardée
  setViewMode(AppState.currentView);

  viewCardsBtn.addEventListener("click", () => {
    setViewMode("cards");
  });

  viewTableBtn.addEventListener("click", () => {
    setViewMode("table");
  });

  function setViewMode(mode) {
    AppState.currentView = mode;
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
  if (AppState.sortColumn === column) {
    AppState.sortDirection = AppState.sortDirection === "asc" ? "desc" : "asc";
  } else {
    AppState.sortColumn = column;
    AppState.sortDirection = "asc";
  }

  // Sauvegarder les préférences de tri
  localStorage.setItem("produits_sort_column", AppState.sortColumn);
  localStorage.setItem("produits_sort_direction", AppState.sortDirection);

  // Réafficher les produits triés
  displayProduits(AppState.currentFilteredProduits);
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
      AppState.currentFranchiseFilter &&
      currentUser &&
      isCatalogAdminRole(currentUser)
    ) {
      console.log(
        `🔍 Chargement des produits pour la franchise ID ${AppState.currentFranchiseFilter}`,
      );

      produits = await apiGet(
        `/admin/franchises/${AppState.currentFranchiseFilter}/produits`,
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
        `✅ ${produits.length} produits chargés pour la franchise ID ${AppState.currentFranchiseFilter}`,
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

    AppState.allProduits = produits;
    allProduits = AppState.allProduits;
    AppState.currentFilteredProduits = produits;
    currentFilteredProduits = AppState.currentFilteredProduits;
    displayProduits(AppState.currentFilteredProduits);
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
    if (AppState.currentView === "cards") {
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
  const sortedProduits = sortProduits(
    produits,
    AppState.sortColumn,
    AppState.sortDirection,
  );

  if (AppState.currentView === "cards") {
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
    if (AppState.sortColumn !== column) return "sortable";
    return AppState.sortDirection === "asc" ? "sort-asc" : "sort-desc";
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
