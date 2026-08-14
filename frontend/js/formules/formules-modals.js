// js/formules/formules-modals.js
// Événements, modales d'édition et gestion des produits d'une formule

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

    // Récupérer les IDs des produits déjà présents dans la formule en cours d'édition
    let produitsDejaPresents = [];
    if (currentEditingFormule?.id) {
      try {
        const composition = await getFormuleProduits(currentEditingFormule.id);
        produitsDejaPresents = composition.map((fp) => fp.produit_id);
      } catch (e) {
        console.warn("Impossible de charger la composition:", e);
      }
    }

    produits.forEach((produit) => {
      const option = document.createElement("option");
      option.value = produit.id;
      option.textContent = produit.name;

      if (produitsDejaPresents.includes(produit.id)) {
        option.textContent = `${produit.name} (déjà dans la formule)`;
        option.disabled = true;
        option.style.color = "#999";
      }

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

    const msg = String(error?.message || "");

    // Le backend renvoie 409 avec detail : "Ce produit est déjà présent dans la formule"
    if (
      msg.includes("déjà présent dans la formule") ||
      msg.includes("déjà présente dans la formule") ||
      msg.toLowerCase().includes("already")
    ) {
      alert(
        "⚠️ Ce produit est déjà présent dans cette formule.\n\n" +
          "👉 Modifie sa quantité directement dans la liste, " +
          "ou retire-le avant de l'ajouter à nouveau.",
      );
      return;
    }

    if (msg.includes("Access denied")) {
      alert("❌ Vous n'avez pas accès à ce produit ou à cette formule.");
      return;
    }

    alert(`Erreur lors de l'ajout du produit : ${msg || "erreur inconnue"}`);
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
