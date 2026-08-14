// js/formules/formules-data.js
// Chargement des données initiales et peuplement des selects

function isCatalogAdminRole(user = getUser()) {
  return (
    !!user && (user.role === "TECH_ADMIN" || user.role === "CATALOG_ADMIN")
  );
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
