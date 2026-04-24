// js/produits.js
// Logique de la page produits : affichage, ajout, suppression, recherche

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
  await loadCategories();
  await loadTypes();
  await loadFranchises();
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

async function loadFranchises() {
  try {
    const currentUser = getUser();
    const filterFranchise = document.getElementById("filter-franchise");
    const franchiseSelector = document.getElementById("franchise-selector");

    if (!currentUser || currentUser.role !== "TECH_ADMIN") {
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
  try {
    const currentUser = getUser();
    let produits;

    if (
      currentFranchiseFilter &&
      currentUser &&
      currentUser.role === "TECH_ADMIN"
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
  const isTechAdmin = currentUser && currentUser.role === "TECH_ADMIN";

  container.className = "products-list";
  container.innerHTML = produits
    .map((produit) => {
      const categoryName = produit.category_name || "Non catégorisé";
      const typeName = produit.type_name || "Sans type";

      // ✅ NOUVELLE LOGIQUE : Afficher les franchises en texte
      let franchiseInfo = "";
      if (isTechAdmin) {
        if (
          produit.is_limited &&
          produit.franchises &&
          produit.franchises.length > 0
        ) {
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
              <div style="
                color: #d4862d;
                font-weight: 600;
                margin-bottom: 0.4rem;
                display: flex;
                align-items: center;
                gap: 0.3rem;
              ">
                ���� Limité aux franchises :
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

      return `
        <div class="product-item">
          <div class="product-name">${produit.name}</div>
          <div class="product-details">
            <span class="badge category">${categoryName}</span>
            <span class="badge type">${typeName}</span>
          </div>
          ${franchiseInfo}
          <div class="product-actions">
            <button class="edit-btn" onclick="handleEditProduit(${JSON.stringify(produit).replace(/"/g, "&quot;")})">✏️ Modifier</button>
            <button class="delete-btn" onclick="handleDeleteProduit('${produit.id}')">🗑️ Supprimer</button>
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
  const isTechAdmin = currentUser && currentUser.role === "TECH_ADMIN";

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
              const produitJson = JSON.stringify(produit).replace(
                /"/g,
                "&quot;",
              );

              // ✅ NOUVELLE LOGIQUE : Colonne franchises
              let franchisesCell = "";
              if (isTechAdmin) {
                if (
                  produit.is_limited &&
                  produit.franchises &&
                  produit.franchises.length > 0
                ) {
                  // Produit limité : afficher les franchises
                  const franchisesText = produit.franchises.join(", ");
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
                        (${produit.nb_franchises}/${produit.total_franchises} franchises)
                      </small>
                    </td>
                  `;
                } else {
                  // Produit global
                  franchisesCell = `
                    <td style="
                      color: #666;
                      font-style: italic;
                      text-align: center;
                    ">
                      Toutes les franchises
                    </td>
                  `;
                }
              }

              return `
                <tr>
                  <td class="product-name">${produit.name}</td>
                  <td><span class="badge category">${categoryName}</span></td>
                  <td><span class="badge type">${typeName}</span></td>
                  ${franchisesCell}
                  <td>
                    <div class="table-actions">
                      <button class="edit-btn" onclick='handleEditProduit(${produitJson})'>✏️ Modifier</button>
                      <button class="delete-btn" onclick="handleDeleteProduit('${produit.id}')">🗑️ Supprimer</button>
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

  if (currentUser && currentUser.role === "TECH_ADMIN") {
    const checkedBoxes = document.querySelectorAll(
      ".franchise-checkbox:checked",
    );

    if (checkedBoxes.length > 0) {
      franchiseIds = Array.from(checkedBoxes).map((cb) => cb.value);
      console.log(`✅ Franchises sélectionnées : ${franchiseIds.length}`);
    } else {
      console.log("⚠️ Aucune franchise sélectionnée, le produit sera global");
      franchiseIds = [];
    }
  }

  try {
    const produitData = {
      name: name,
      categorie_id: categoryId ? parseInt(categoryId) : null,
      type_id: typeId ? parseInt(typeId) : null,
    };

    if (currentUser && currentUser.role === "TECH_ADMIN") {
      produitData.franchise_ids = franchiseIds;
    }

    const nouveauProduit = await createProduit(produitData);
    allProduits.push(nouveauProduit);
    currentFilteredProduits = allProduits;
    displayProduits(allProduits);

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
  document.getElementById("edit-product-category").value = produit.categorie_id
    ? produit.categorie_id.toString()
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
    const produitModifie = await updateProduit(currentEditingProduct.id, {
      name: name,
      categorie_id: categoryId ? parseInt(categoryId) : null,
      type_id: typeId ? parseInt(typeId) : null,
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

function handleFranchiseChange() {
  const currentUser = getUser();

  // 🔒 DOUBLE VÉRIFICATION : Bloquer si pas TECH_ADMIN
  if (!currentUser || currentUser.role !== "TECH_ADMIN") {
    console.warn("⚠️ Accès refusé : filtre franchise réservé aux TECH_ADMIN");
    return;
  }

  currentFranchiseFilter = document.getElementById("filter-franchise").value;

  if (currentFranchiseFilter) {
    console.log(`🔍 Filtrage par franchise : ${currentFranchiseFilter}`);
  } else {
    console.log("🔍 Retour à tous les produits");
  }

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
  document.getElementById("filter-franchise").value = "";

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
