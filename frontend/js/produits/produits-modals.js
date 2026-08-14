// js/produits/produits-modals.js
// Ajout, suppression, modification et gestion des franchises produit

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
    AppState.allProduits = AppState.allProduits.filter(
      (p) => p.id !== produitId,
    );
    AppState.currentFilteredProduits = AppState.allProduits;
    displayProduits(AppState.currentFilteredProduits);
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
  const produit = AppState.allProduits.find((p) => p.id === produitId);
  if (!produit) {
    console.error("Produit non trouvé.", produitId);
    return;
  }
  handleEditProduit(produit);
}

function handleEditProduit(produit) {
  AppState.currentEditingProduct = produit;

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
  AppState.currentEditingProduct = null;

  // Vider le formulaire
  document.getElementById("edit-product-name").value = "";
  document.getElementById("edit-product-category").value = "";
  document.getElementById("edit-product-type").value = "";
}

async function handleUpdateProduit(event) {
  event.preventDefault();

  if (!AppState.currentEditingProduct) return;

  const name = document.getElementById("edit-product-name").value.trim();
  const categoryId = document.getElementById("edit-product-category").value;
  const typeId = document.getElementById("edit-product-type").value;

  if (!name) {
    alert("Le nom du produit est requis.");
    return;
  }

  try {
    await updateProduit(AppState.currentEditingProduct.id, {
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
