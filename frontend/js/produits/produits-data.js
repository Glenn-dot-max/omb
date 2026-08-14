// js/produits/produits-data.js
// Chargement des données et sélecteurs

function isCatalogAdminRole(user = getUser()) {
  return (
    !!user && (user.role === "TECH_ADMIN" || user.role === "CATALOG_ADMIN")
  );
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
    AppState.allCategories = await getCategories();
    allCategories = AppState.allCategories;
    populateCategorySelect();
    populateFilterCategorySelect();
    populateEditCategorySelect();
  } catch (error) {
    console.error("Erreur lors du chargement des catégories :", error);
  }
}

async function loadTypes() {
  try {
    AppState.allTypes = await getTypes();
    allTypes = AppState.allTypes;
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

    AppState.allFranchises = await apiGet("/admin/franchises");
    allFranchises = AppState.allFranchises;

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
