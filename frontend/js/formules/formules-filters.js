// js/formules/formules-filters.js
// Filtres, recherche et gestion des franchises d'une formule

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
          `${index + 1}. ${getDisplayFormuleName(f.name)} (${f.nombre_couverts || 0} couverts)`,
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
    filteredFormules = filteredFormules.filter();
  }

  currentFilteredFormules = filteredFormules;
  displayFormules(filteredFormules);
}
