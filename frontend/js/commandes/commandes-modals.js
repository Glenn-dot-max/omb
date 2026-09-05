// js/commandes/commandes-filters.js
// Filtre, recherche et gestion des événements

// ===============================================
// ACTIONS SUR LES COMMANDES
// ===============================================

async function handleOpenCreateModal() {
  // 1. Réinitialiser les listes temporaires
  tempFormules = [];
  tempProduits = [];

  // 2. Charger les données si pas encore fait
  if (allFormules.length === 0 || allProduits.length === 0) {
    await loadDataForModal();
  }

  // 3. Réinitialiser les champs du formulaire
  document.getElementById("create-nom-client").value = "";
  document.getElementById("create-delivery-date").value = getTodayDate();
  document.getElementById("create-delivery-hour").value = "10:00";
  document.getElementById("create-nombre-couverts").value = "1";
  document.getElementById("create-avec-service").checked = true;
  document.getElementById("create-en-attente").checked = false;
  document.getElementById("create-notes").value = "";
  document.getElementById("formule-couverts").value = "1";
  document.getElementById("create-type-prestation").value = "non-brunch";
  document.getElementById("create-coefficient").value = "1.0";
  document.getElementById("create-ponderation-group").style.display = "none";

  // 4. Afficher les listes vides
  displayTempFormules();
  displayTempProduits();

  // 5. Afficher la modale (passer de display:none à display:block)
  document.getElementById("create-modal").style.display = "block";
}

async function closeCreateCommandeModal() {
  if (hasUnsavedData()) {
    const confirmed = await showConfirm(
      "⚠️ Êtes-vous sûr de vouloir arrêter la création de cette commande ?\n\n❌ Les informations saisies ne seront pas récupérables.",
      "Quitter sans sauvegarder",
    );
    if (!confirmed) return;
  }

  // Cacher la modale
  document.getElementById("create-modal").style.display = "none";

  // Vider les données temporaires
  tempFormules = [];
  tempProduits = [];

  // Réinitialiser les champs du formulaire
  document.getElementById("create-nom-client").value = "";
  document.getElementById("create-notes").value = "";
  document.getElementById("create-nombre-couverts").value = "1";
}

async function handleViewDetails(commande) {
  try {
    if (allFormules.length === 0 || allProduits.length === 0) {
      await loadDataForModal();
    }

    document.getElementById("detail-nom-client").textContent =
      commande.nom_client;
    const deliveryDateOnly = commande.delivery_date.split("T")[0];
    const [year, month, day] = deliveryDateOnly.split("-").map(Number);
    const displayDate = new Date(year, month - 1, day);
    displayDate.setHours(0, 0, 0, 0);
    document.getElementById("detail-delivery-date").textContent =
      displayDate.toLocaleDateString("fr-FR");
    document.getElementById("detail-delivery-hour").textContent =
      commande.delivery_hour;
    document.getElementById("detail-nombre-couverts").textContent =
      `${commande.nombre_couverts} personne${commande.nombre_couverts > 1 ? "s" : ""}`;

    document.getElementById("detail-avec-service").textContent =
      commande.avec_service ? "✅ Oui" : "⭕ Non";
    document.getElementById("detail-type-prestation").textContent =
      commande.type_prestation || "non-brunch";
    const ponderationItem = document.getElementById("detail-ponderation-item");
    const coeff = commande.coefficient_ponderation || 1.0;
    if (commande.type_prestation === "mariage") {
      document.getElementById("detail-coefficient").textContent = `x${coeff}`;
      ponderationItem.style.display = "block";
    } else {
      ponderationItem.style.display = "none";
    }
    document.getElementById("detail-notes").textContent =
      commande.notes || "Aucune note";

    const formules = await getCommandeFormules(commande.id);
    const produits = await getCommandeProduits(commande.id);

    const coefficient = commande.coefficient_ponderation || 1.0;
    await displayDetailsFormules(
      formules,
      coefficient,
      commande.type_prestation,
    );
    displayDetailsProduits(produits);

    document.getElementById("detail-modal").style.display = "block";
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des détails de la commande :",
      error,
    );
    showToast(
      "Erreur lors de la récupération des détails de la commande.",
      "error",
    );
  }
}

async function displayDetailsFormules(
  formules,
  coefficient = 1.0,
  typePrestation = "non-brunch",
) {
  const container = document.getElementById("detail-formules-list");
  const count = document.getElementById("detail-formules-count");

  count.textContent = formules.length;

  if (formules.length === 0) {
    container.innerHTML = '<p class="empty-list">Aucune formule.</p>';
    return;
  }

  container.innerHTML = "";

  for (const formule of formules) {
    const div = document.createElement("div");
    div.className = "item-row";

    const formuleData = allFormules.find((f) => f.id === formule.formule_id);
    const formuleName = formuleData ? formuleData.name : "Formule Inconnue";

    // Couverts effectifs après application du coefficient
    let couvertsEffectifs;
    if (typePrestation === "mariage") {
      // pour les mariages, arrondir à l'unité supérieure
      couvertsEffectifs = Math.ceil(formule.quantite_finale * coefficient);
    } else {
      couvertsEffectifs =
        Math.round(formule.quantite_finale * coefficient * 100) / 100;
    }
    const couvertsLabel =
      coefficient !== 1.0
        ? `${formule.quantite_finale} × ${coefficient} = <strong>${couvertsEffectifs} couverts effectifs</strong>`
        : `${formule.quantite_finale} couverts`;

    // Récupérer les exclusions
    const exclusions = await getCommandeFormuleExclusions(formule.id);

    // Récupérer les produits de la formule
    const formuleProduits = await getFormuleProduits(formule.formule_id);

    // Filtrer les produits exclus
    const produitsActifs = formuleProduits.filter(
      (fp) => !exclusions.includes(fp.produit_id),
    );

    let produitsHTML = "";
    if (produitsActifs.length > 0) {
      produitsHTML = '<div class="formule-composition">';
      produitsHTML += "<strong>📦 Composition :</strong>";
      produitsHTML += '<ul class="composition-list">';

      for (const fp of produitsActifs) {
        const produitName = fp.produit_name || "Produit Inconnu";
        let totalQuantite;
        if (typePrestation === "mariage") {
          totalQuantite = Math.ceil(fp.quantite * couvertsEffectifs);
        } else {
          totalQuantite =
            Math.round(fp.quantite * couvertsEffectifs * 100) / 100;
        }
        produitsHTML += `<li>${produitName} — ${totalQuantite} ${fp.unite}</li>`;
      }

      produitsHTML += "</ul></div>";
    }

    // Afficher un message si des produits sont exclus
    if (exclusions.length > 0) {
      produitsHTML += `<p style="color: #ff6b6b; font-size: 12px; margin-top: 8px;">🚫 ${exclusions.length} produit(s) exclus</p>`;
    }

    div.innerHTML = `
      <div class="item-info">
        <div class="item-name">${formuleName}</div>
        <div class="item-detail">Quantité : ${couvertsLabel}</div>
        ${produitsHTML}
      </div>
    `;

    container.appendChild(div);
  }
}

function displayDetailsProduits(produits) {
  const container = document.getElementById("detail-produits-list");
  const count = document.getElementById("detail-produits-count");

  count.textContent = produits.length;

  if (produits.length === 0) {
    container.innerHTML = '<p class="empty-list">Aucun produit.</p>';
    return;
  }

  container.innerHTML = "";

  produits.forEach((produit) => {
    const div = document.createElement("div");
    div.className = "item-row";

    const produitData = allProduits.find((p) => p.id === produit.produit_id);
    const produitName = produitData ? produitData.name : "Produit Inconnu";

    div.innerHTML = `
      <div class="item-info">
        <div class="item-name">${produitName}</div>
        <div class="item-detail">Quantité : ${produit.quantite} ${produit.unite}</div>
      </div>
    `;

    container.appendChild(div);
  });
}

function closeDetailModal() {
  document.getElementById("detail-modal").style.display = "none";
}

async function handleEditCommande(commande) {
  try {
    // 1. Store the command being edited
    AppState.currentEditingCommande = commande;

    // 2. Load data for the selectors
    if (allFormules.length === 0 || allProduits.length === 0) {
      await loadDataForModal();
    }

    // 3. Fill basic from fields with existing data
    document.getElementById("edit-nom-client").value = commande.nom_client;
    document.getElementById("edit-delivery-date").value =
      commande.delivery_date;
    document.getElementById("edit-delivery-hour").value =
      commande.delivery_hour;
    document.getElementById("edit-nombre-couverts").value =
      commande.nombre_couverts;
    document.getElementById("edit-avec-service").checked =
      commande.avec_service;
    const editTypePrestation = commande.type_prestation || "non-brunch";
    document.getElementById("edit-type-prestation").value = editTypePrestation;
    const editCoeff = commande.coefficient_ponderation || 1.0;
    document.getElementById("edit-coefficient").value = editCoeff;
    document.getElementById("edit-ponderation-group").style.display =
      editTypePrestation === "mariage" ? "block" : "none";
    document.getElementById("edit-notes").value = commande.notes || "";
    document.getElementById("edit-formule-couverts").value =
      commande.nombre_couverts;

    // 4. Load existing formules and products from API
    const [formules, produits] = await Promise.all([
      getCommandeFormules(commande.id),
      getCommandeProduits(commande.id),
    ]);

    // 5. Convert to edit format et charger les exclusions
    editFormules = await Promise.all(
      formules.map(async (f) => {
        const formuleData = allFormules.find(
          (form) => form.id === f.formule_id,
        );

        // Charger les exclusions existantes
        const exclusions = await getCommandeFormuleExclusions(f.id);

        return {
          id: f.id,
          formule_id: f.formule_id,
          formule_name: formuleData ? formuleData.name : "Formule Inconnue",
          couverts: f.quantite_finale,
          produits_exclus: exclusions || [],
          expanded: false,
        };
      }),
    );

    editProduits = produits.map((p) => {
      const produitData = allProduits.find((prod) => prod.id === p.produit_id);
      return {
        id: p.id,
        produit_id: p.produit_id,
        produit_name: produitData ? produitData.name : "Produit Inconnu",
        quantite: p.quantite,
        unite: p.unite,
      };
    });

    // 6. Populate selectors
    populateEditFormuleSelector();
    populateEditProduitSelector();
    populateEditUniteSelect();

    // 7. Display existing items
    displayEditFormules();
    displayEditProduits();

    // 8. Show the edit modal
    document.getElementById("edit-modal").style.display = "block";
  } catch (error) {
    console.error("Erreur lors de l'ouverture de l'édition:", error);
    showToast(
      "Erreur lors de l'ouverture de l'édition de la commande.",
      "error",
    );
  }
}

function populateEditFormuleSelector() {
  const select = document.getElementById("edit-formule-select");
  select.innerHTML = '<option value="">-- Sélectionner une formule --</option>';

  allFormules.forEach((formule) => {
    const option = document.createElement("option");
    option.value = formule.id;
    option.textContent = formule.name;
    select.appendChild(option);
  });
}

function populateEditProduitSelector() {
  const select = document.getElementById("edit-produit-select");
  select.innerHTML = '<option value="">-- Sélectionner un produit --</option>';

  allProduits.forEach((produit) => {
    const option = document.createElement("option");
    option.value = produit.id;
    option.textContent = produit.name;
    select.appendChild(option);
  });
}

function populateEditUniteSelect() {
  const select = document.getElementById("edit-produit-unite");
  select.innerHTML = '<option value="">-- Unité --</option>';

  allUnites.forEach((unite) => {
    const option = document.createElement("option");
    option.value = unite.nom.trim();
    option.textContent = unite.nom.trim();
    select.appendChild(option);
  });

  // Sélectionner "unité" par défaut
  if (select.querySelector('option[value="unité"]')) {
    select.value = "unité";
  }
}

function displayEditFormules() {
  const container = document.getElementById("edit-formules-list");
  const count = document.getElementById("edit-formules-count");

  count.textContent = editFormules.length;

  if (editFormules.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucune formule ajoutée.</p>';
    return;
  }

  container.innerHTML = "";

  editFormules.forEach((formule, index) => {
    const div = document.createElement("div");
    div.className = "item-row";

    // Afficher un badge si des produits sont exclus
    const exclusionsDisplay =
      formule.produits_exclus && formule.produits_exclus.length > 0
        ? `
          <span class="exclusions-badge" title="🚫 ${formule.produits_exclus.length} produit(s) exclus"></span>
          <span class="exclusions-warning" title="⚠️ Des produits ont été exclus de cette formule">❗</span>
        `
        : "";

    div.innerHTML = `
      <div class="item-info">
        <div class="item-name">${formule.formule_name}</div>
        <div class="item-detail" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <label style="margin:0; font-size:13px;">Couverts :</label>
          <input
            type="number"
            min="1"
            value="${formule.couverts}"
            style="width:70px; padding:4px 6px; border:1px solid #ddd; border-radius:4px;"
            onchange="editFormules[${index}].couverts = parseInt(this.value)"
          />
          ${exclusionsDisplay}
        </div>

        <!-- Zone de composition -->
        <div id="edit-composition-${index}" class="formule-composition" style="display: none; margin-top: 10px;">
          <p><strong>📦 Composition :</strong></p>
          <div id="edit-produits-formule-${index}">
            <em>Chargement...</em>
          </div>
        </div>
      </div>

      <div class="item-actions">
        <!-- Bouton pour voir/cacher la composition -->
        <button class="btn-icon" onclick="toggleEditComposition(${index})" title="Voir la composition">
          <span id="edit-toggle-icon-${index}">👁️</span>
        </button>
        <button class="btn-icon" onclick="handleRemoveEditFormule(${index})" title="Retirer">🗑️</button>
      </div>
    `;
    container.appendChild(div);
  });
}

// ===============================================
// Gestion de la composition en édition
// ===============================================

async function toggleEditComposition(index) {
  const compositionDiv = document.getElementById(`edit-composition-${index}`);
  const icon = document.getElementById(`edit-toggle-icon-${index}`);

  if (!compositionDiv || !icon) {
    showToast("Erreur d'affichage. Veuillez réessayer.", "error");
    return;
  }

  // Toggle affichage
  if (compositionDiv.style.display === "none") {
    // on affiche
    compositionDiv.style.display = "block";
    icon.textContent = "👁️‍🗨️";

    // Charger les produits de la formule
    await loadEditFormuleProduits(index);
  } else {
    // on cache
    compositionDiv.style.display = "none";
    icon.textContent = "👁️";
  }
}

async function loadEditFormuleProduits(index) {
  const formule = editFormules[index];
  const container = document.getElementById(`edit-produits-formule-${index}`);

  try {
    const produits = await getFormuleProduits(formule.formule_id);

    if (produits.length === 0) {
      container.innerHTML =
        '<p class="empty-list">Aucun produit dans cette formule.</p>';
      return;
    }

    // Afficher la liste des produits avec checkbox
    container.innerHTML = "";

    // Message d'instruction
    const infoDiv = document.createElement("div");
    infoDiv.className = "composition-info";
    infoDiv.innerHTML = `
      <p style="margin: 0 0 12px 0; padding: 10px; background: #fffbea; border-left: 4px solid #f5c05c; color: #555; font-size: 13px; border-radius: 4px; line-height: 1.5;">
        💡 <strong>Décochez</strong> les produits que vous souhaitez exlure de la formule pour cette commande.
      </p>
    `;
    container.appendChild(infoDiv);

    // Liste des produits
    const produitsContainer = document.createElement("div");
    produitsContainer.id = `edit-produits-container-${index}`;

    produits.forEach((produit) => {
      const produitName = produit.produit_name || "Produit Inconnu";

      const isExcluded = formule.produits_exclus.includes(produit.produit_id);
      const isChecked = !isExcluded;

      // Créer la ligne avec checkbox
      const checkboxDiv = document.createElement("div");
      checkboxDiv.className = "produit-checkbox";
      checkboxDiv.innerHTML = `
        <label>
          <input
            type="checkbox"
            ${isChecked ? "checked" : ""}
            data-produit-id="${produit.produit_id}"
            onchange="handleEditProduitCheckChange(${index})"
          />
          <span style="font-style: italic;">${produitName}</span>
        </label>
      `;

      produitsContainer.appendChild(checkboxDiv);
    });

    container.appendChild(produitsContainer);

    // Bouton exclure
    const btnDiv = document.createElement("div");
    btnDiv.style.marginTop = "15px";
    btnDiv.style.textAlign = "center";
    btnDiv.innerHTML = `
      <button
        type="button"
        class="btn-exclude"
        onclick="confirmEditExclusions(${index})"
      >
        🚫 Exclure les produits décochés
      </button>
    `;
    container.appendChild(btnDiv);
  } catch (error) {
    console.error(
      "Erreur lors du chargement des produits de la formule :",
      error,
    );
    container.innerHTML =
      '<p style="color: red;">Erreur lors du chargement des produits.</p>';
  }
}

// Gérer le changement du checkbox en édition
function handleEditProduitCheckChange(index) {
  const container = document.getElementById(`edit-produits-container-${index}`);
  const checkboxes = container.querySelectorAll('input[type="checkbox"]');

  checkboxes.forEach((checkbox) => {
    const label = checkbox.closest("label");
    if (checkbox.checked) {
      label.classList.remove("produit-unchecked");
    } else {
      label.classList.add("produit-unchecked");
    }
  });
}

// Confirmer les exclusions en édition
async function confirmEditExclusions(index) {
  const container = document.getElementById(`edit-produits-container-${index}`);
  const checkboxes = container.querySelectorAll('input[type="checkbox"]');
  const formule = editFormules[index];

  // Récupérer les produits décochés
  const produitsAExclure = [];
  checkboxes.forEach((checkbox) => {
    if (!checkbox.checked) {
      const produitId = checkbox.getAttribute("data-produit-id");
      const produitName = checkbox.nextElementSibling.textContent;
      produitsAExclure.push({ id: produitId, name: produitName });
    }
  });

  // Si aucun produit à exclure
  if (produitsAExclure.length === 0) {
    formule.produits_exclus = [];
    showToast("✅ Tous les produits sont inclus dans la formule.", "success");
    displayEditFormules();
    return;
  }

  // Confirmer avec l'utilisateur
  const listeProduits = produitsAExclure.map((p) => `- ${p.name}`).join("\n");
  const confirmMsg = `Exclure les produits suivants de la formule "${formule.formule_name}" ?\n\n${listeProduits}`;

  const confirmed = await showConfirm(confirmMsg, "Exclure");
  if (confirmed) {
    formule.produits_exclus = produitsAExclure.map((p) => p.id);
    showToast(
      `${produitsAExclure.length} produit(s) exclus de la formule.`,
      "success",
    );
    displayEditFormules();
  } else {
    showToast("Exclusion annulée.", "info");
  }
}

function displayEditProduits() {
  const container = document.getElementById("edit-produits-list");
  const count = document.getElementById("edit-produits-count");

  count.textContent = editProduits.length;

  if (editProduits.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucun produit ajouté.</p>';
    return;
  }

  container.innerHTML = "";

  editProduits.forEach((produit, index) => {
    const div = document.createElement("div");
    div.className = "item-row";

    div.innerHTML = `
      <div class="item-info">
        <div class="item-name">${produit.produit_name}</div>
        <div class="item-detail">${produit.quantite} ${produit.unite}</div>
      </div>
      <div class="item-actions">
        <button class="btn-icon" onclick="handleRemoveEditProduit(${index})" title="Retirer">🗑️</button>
      </div>
    `;
    container.appendChild(div);
  });
}

async function handleRemoveEditFormule(index) {
  const formule = editFormules[index];

  if (formule.id) {
    try {
      await deleteCommandeFormule(formule.id);
      // ✅ Will show toast at the end
    } catch (error) {
      console.error("Erreur lors de la suppression de la formule :", error);
      showToast("Erreur lors de la suppression de la formule.", "error");
      return;
    }
  }

  editFormules.splice(index, 1);
  displayEditFormules();

  // ✅ One toast for both cases
  showToast("Formule retirée.", "success");
}

async function handleRemoveEditProduit(index) {
  const produit = editProduits[index];
  if (produit.id) {
    try {
      await deleteCommandeProduit(produit.id);
      // ✅ Will show toast at the end
    } catch (error) {
      console.error("Erreur lors de la suppression du produit :", error);
      showToast("Erreur lors de la suppression du produit.", "error");
      return;
    }
  }
  editProduits.splice(index, 1);
  displayEditProduits();
  showToast("Produit retiré.", "success");
}

function handleAddEditFormule() {
  const select = document.getElementById("edit-formule-select");
  const formuleId = select.value;
  const couverts = parseInt(
    document.getElementById("edit-formule-couverts").value,
  );

  if (!formuleId) {
    showToast("Veuillez sélectionner une formule.", "warning");
    return;
  }

  if (!couverts || couverts < 1) {
    showToast("Le nombre de couverts doit être au moins de 1.", "warning");
    return;
  }

  const dejaAjoute = editFormules.find((f) => f.formule_id === formuleId);
  if (dejaAjoute) {
    showToast("Cette formule a déjà été ajoutée.", "warning");
    return;
  }

  const formule = allFormules.find((f) => f.id === formuleId);

  if (!formule) {
    showToast("Erreur : Formule introuvable.", "error");
    return;
  }

  editFormules.push({
    formule_id: formule.id,
    formule_name: formule.name,
    couverts: couverts,
    produits_exclus: [],
    expanded: false,
  });

  displayEditFormules();

  select.value = "";
  const nombreCouverts = document.getElementById("edit-nombre-couverts").value;
  document.getElementById("edit-formule-couverts").value = nombreCouverts;

  showToast("Formule ajoutée.", "success");
}

function handleAddEditProduit() {
  const select = document.getElementById("edit-produit-select");
  const produitId = select.value;
  const quantite = parseFloat(
    document.getElementById("edit-produit-quantite").value,
  );
  const unite = document.getElementById("edit-produit-unite").value;

  if (!produitId) {
    showToast("Veuillez sélectionner un produit.", "warning");
    return;
  }

  if (!quantite || quantite < 1) {
    showToast("La quantité doit être au moins de 1.", "warning");
    return;
  }

  if (!unite) {
    showToast("Veuillez sélectionner une unité.", "warning");
    return;
  }

  const dejaAjoute = editProduits.find((p) => p.produit_id === produitId);
  if (dejaAjoute) {
    showToast("Ce produit a déjà été ajouté.", "warning");
    return;
  }

  const produit = allProduits.find((p) => p.id === produitId);

  if (!produit) {
    showToast("Erreur : Produit introuvable.", "error");
    return;
  }

  editProduits.push({
    produit_id: produit.id,
    produit_name: produit.name,
    quantite: quantite,
    unite: unite,
  });

  displayEditProduits();

  select.value = "";
  document.getElementById("edit-produit-quantite").value = "1";

  // Remettre "unité" par défaut
  const uniteSelect = document.getElementById("edit-produit-unite");
  if (uniteSelect.querySelector('option[value="unité"]')) {
    uniteSelect.value = "unité";
  }
  showToast("Produit ajouté.", "success");
}

async function handleSaveEditCommande() {
  try {
    // ===============================================
    // STEP 1 : Get form values
    // ===============================================

    const nomClient = document.getElementById("edit-nom-client").value.trim();
    const deliveryDate = document.getElementById("edit-delivery-date").value;
    const deliveryHour = document.getElementById("edit-delivery-hour").value;
    const nombreCouverts = parseInt(
      document.getElementById("edit-nombre-couverts").value,
    );
    const avecService = document.getElementById("edit-avec-service").checked;
    const typePrestation = document.getElementById(
      "edit-type-prestation",
    ).value;
    const coefficientPonderation =
      typePrestation === "mariage"
        ? parseFloat(document.getElementById("edit-coefficient").value) || 1.0
        : 1.0;
    const notes = document.getElementById("edit-notes").value.trim();

    // ===============================================
    // STEP 2 : Validate inputs
    // ===============================================
    if (!nomClient) {
      showToast("Le nom du client est requis.", "warning");
      return;
    }

    const invalidCharsRegex = /[<>"'\\\/]/;
    if (invalidCharsRegex.test(nomClient)) {
      showToast(
        " ❌ Le nom du client contient des caractères invalides (<>\"'\\/).",
        "error",
      );
      const nomClientField = document.getElementById("create-nom-client");
      if (nomClientField) {
        nomClientField.focus();
        nomClientField.style.border = "2px solid #ff3333";
        nomClientField.style.backgroundColor = "#fff5f5";

        setTimeout(() => {
          nomClientField.style.border = "";
          nomClientField.style.backgroundColor = "";
        }, 3000);
      }
      return;
    }

    if (!deliveryDate) {
      showToast("La date de livraison est requise.", "warning");
      return;
    }

    if (!deliveryHour) {
      showToast("L'heure de livraison est requise.", "warning");
      return;
    }

    if (!nombreCouverts || nombreCouverts < 1) {
      showToast("Le nombre de couverts doit être au moins de 1.", "warning");
      return;
    }

    // ===============================================
    // STEP 3 : Update the commande
    // ===============================================

    const commandeData = {
      nom_client: nomClient,
      delivery_date: deliveryDate,
      delivery_hour: deliveryHour,
      nombre_couverts: nombreCouverts,
      avec_service: avecService,
      service: avecService,
      type_prestation: typePrestation,
      coefficient_ponderation: coefficientPonderation,
      notes: notes || null,
    };

    await updateCommande(AppState.currentEditingCommande.id, commandeData);

    // ===============================================
    // STEP 4 : UPDATE EXISTING FORMULES EXCLUSIONS
    // ===============================================

    const existingFormules = editFormules.filter((f) => f.id);

    if (existingFormules.length > 0) {
      for (const formule of existingFormules) {
        await updateCommandeFormuleExclusions(
          formule.id,
          formule.produits_exclus || [],
          formule.couverts,
        );
      }
    }

    // ===============================================
    // STEP 5 : CREATE NEW FORMULES & PRODUITS
    // ===============================================

    const newFormules = editFormules.filter((f) => !f.id);

    if (newFormules.length > 0) {
      for (const formule of newFormules) {
        const formuleData = {
          commande_id: AppState.currentEditingCommande.id,
          formule_id: formule.formule_id,
          quantite_finale: formule.couverts,
          produits_exclus: formule.produits_exclus || [],
        };
        await createCommandeFormule(formuleData);
      }
    }

    const newProduits = editProduits.filter((p) => !p.id);

    if (newProduits.length > 0) {
      for (const produit of newProduits) {
        const produitData = {
          commande_id: AppState.currentEditingCommande.id,
          produit_id: produit.produit_id,
          quantite: produit.quantite,
          unite: produit.unite,
        };
        await createCommandeProduit(produitData);
      }
    }

    // ===============================================
    // STEP 6 : Finalize
    // ===============================================
    await loadCommandes();

    closeEditModal();

    showToast(`Commande "${nomClient}" mise à jour avec succès.`, "success");
    if (typePrestation === "mariage" && coefficientPonderation !== 1.0) {
      showToast(
        "ℹ️ Pour les mariages : les quantités sont arrondies à l'unité supérieure après application de la pondération.",
        "info",
      );
    }
  } catch (error) {
    console.error("Erreur lors de la sauvegarde de la commande :", error);
    showToast("Erreur lors de la sauvegarde de la commande.", "error");
  }
}

function closeEditModal() {
  // Cacher la modale
  document.getElementById("edit-modal").style.display = "none";

  // Réinitialiser les données
  AppState.currentEditingCommande = null;
  AppState.editFormules = [];
  AppState.editProduits = [];
}

async function handleDuplicateCommande(commande) {
  try {
    // 1. Charger les données si nécessaire
    if (allFormules.length === 0 || allProduits.length === 0) {
      await loadDataForModal();
    }

    // 2. Réinitialiser les listes temporaires
    AppState.tempFormules = [];
    AppState.tempProduits = [];

    // 3. Pré-remplir les champs du formulaire
    document.getElementById("create-nom-client").value =
      `Copie - ${commande.nom_client}`;
    document.getElementById("create-delivery-date").value =
      commande.delivery_date.split("T")[0];
    document.getElementById("create-delivery-hour").value =
      commande.delivery_hour;
    document.getElementById("create-nombre-couverts").value =
      commande.nombre_couverts;
    document.getElementById("create-avec-service").checked =
      commande.avec_service;
    document.getElementById("create-notes").value = commande.notes || "";
    document.getElementById("create-en-attente").checked = false;

    const typePrestation = commande.type_prestation || "non-brunch";
    document.getElementById("create-type-prestation").value = typePrestation;
    const coeff = commande.coefficient_ponderation || 1.0;
    document.getElementById("create-coefficient").value = coeff;
    document.getElementById("create-ponderation-group").style.display =
      typePrestation === "mariage" ? "block" : "none";

    // Valeur brute : le coefficient est appliqué une seule fois, côté backend
    // (planning.py), jamais stocké pré-multiplié dans quantite_finale/quantite.

    document.getElementById("formule-couverts").value =
      commande.nombre_couverts;
    document.getElementById("produit-quantite").value =
      commande.nombre_couverts;

    // 4. Charger les formules avec leurs exclusions
    const formules = await getCommandeFormules(commande.id);
    for (const f of formules) {
      const exclusions = await getCommandeFormuleExclusions(f.id);
      const formuleData = allFormules.find((form) => form.id === f.formule_id);
      if (formuleData) {
        AppState.tempFormules.push({
          formule_id: f.formule_id,
          formule_name: formuleData.name,
          couverts: f.quantite_finale,
          produits_exclus: exclusions || [],
          expanded: false,
        });
      }
    }

    // 5. Charger les produits directs
    const produits = await getCommandeProduits(commande.id);
    for (const p of produits) {
      const produitData = allProduits.find((prod) => prod.id === p.produit_id);
      AppState.tempProduits.push({
        produit_id: p.produit_id,
        produit_name: produitData ? produitData.name : "Produit Inconnu",
        quantite: p.quantite,
        unite: p.unite,
      });
    }

    // 6. Afficher les listes
    displayTempFormules();
    displayTempProduits();

    // 7. Ouvrir la modale de création
    document.getElementById("create-modal").style.display = "block";

    showToast(
      '📋 Commande pré-remplie. Modifiez le nom puis cliquez "Créer".',
      "info",
    );
  } catch (error) {
    console.error("Erreur lors de la duplication :", error);
    showToast("❌ Erreur lors de la préparation de la duplication.", "error");
  }
}

async function handleDeleteCommande(commandeId) {
  const confirmed = await showConfirm(
    "Êtes-vous sûr de vouloir supprimer cette commande ?\n\n⚠️ Cette action est irréversible.",
    "Supprimer",
  );
  if (!confirmed) return;

  try {
    await deleteCommande(commandeId);
    allCommandes = allCommandes.filter((c) => c.id !== commandeId);
    displayCommandes(allCommandes);
    updateCommandesCount();
    showToast("Commande supprimée avec succès.", "success");
  } catch (error) {
    console.error("Erreur lors de la suppression de la commande :", error);
    showToast("Erreur lors de la suppression de la commande.", "error");
  }
}

// ===============================================
// CHARGEMENT DES DONNÉES POUR LA MODALE
// ===============================================

async function loadDataForModal() {
  try {
    // Charger formules, produits et unités en parallèle
    const [formules, produits, unites] = await Promise.all([
      getFormules(),
      getProduits(),
      getUnite(),
    ]);

    // Stocker dans les variables globales
    allFormules = formules;
    allProduits = produits;
    allUnites = unites;

    // Remplir les sélecteurs
    populateFormuleSelector();
    populateProduitSelector();
    populateUniteSelect();
  } catch (error) {
    console.error("Erreur chargement données modale :", error);
    showToast("Erreur lors du chargement des données pour la modale.", "error");
  }
}

function populateFormuleSelector() {
  const select = document.getElementById("formule-select");
  select.innerHTML = '<option value="">-- Sélectionner une formule --</option>';

  allFormules.forEach((formule) => {
    const option = document.createElement("option");
    option.value = formule.id;
    option.textContent = formule.name.trim();
    select.appendChild(option);
  });
}

function populateProduitSelector() {
  const select = document.getElementById("produit-select");
  select.innerHTML = '<option value="">-- Sélectionner un produit --</option>';

  allProduits.forEach((produit) => {
    const option = document.createElement("option");
    option.value = produit.id;
    option.textContent = produit.name.trim();
    select.appendChild(option);
  });
}

function populateUniteSelect() {
  const select = document.getElementById("produit-unite");
  select.innerHTML = '<option value="">-- Unité --</option>';

  allUnites.forEach((unite) => {
    const option = document.createElement("option");
    option.value = unite.nom.trim();
    option.textContent = unite.nom.trim();
    select.appendChild(option);
  });

  // Sélectionner "unité" par défaut
  if (select.querySelector('option[value="unité"]')) {
    select.value = "unité";
  }
}

function getTodayDate() {
  // Utiliser la date de Paris fournie par le backend
  if (window.parisDate) {
    return window.parisDate;
  }

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayTempFormules() {
  const container = document.getElementById("formules-list");
  const count = document.getElementById("formules-count");

  count.textContent = tempFormules.length;

  if (tempFormules.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucune formule ajoutée.</p>';
    return;
  }

  container.innerHTML = "";

  tempFormules.forEach((formule, index) => {
    const div = document.createElement("div");
    div.className = "item-row";

    // Afficher un badge si des produits sont exclus de la formule
    const exclusionsDisplay =
      formule.produits_exclus && formule.produits_exclus.length > 0
        ? `
          <span class="exclusions-badge">🚫 ${formule.produits_exclus.length} produit(s) exclu(s)</span>
          <span class="exclusions-warning" title="⚠️ Des produits ont été exclus de cette fomrule">❗</span>
        `
        : "";

    div.innerHTML = `
        <div class="item-info">
          <div class="item-name">${formule.formule_name}</div>
          <div class="item-detail">
            ${formule.couverts} couverts
            ${exclusionsDisplay}
          </div>

          <!-- Zone de composition (cachée par défaut) -->
          <div id="composition-${index}" class="formule-composition" style="display: none; margin-top: 10px;">
            <p><strong>📦 Composition :</strong></p>
            <div id="produits-formule-${index}">
              <em>Chargement...</em>
            </div>
          </div>
        </div>

        <div class="item-actions">
          <!-- Bouton pour voir/cacher la composition -->
          <button class="btn-icon" onclick="toggleComposition(${index})" title="Voir la composition">
            <span id="toggle-icon-${index}">👁️</span>
          </button>
          <button class="btn-icon" onclick="handleRemoveFormule(${index})" title="Retirer">🗑️</button>
        </div>
      `;

    container.appendChild(div);
  });
}

// ===============================================
// V2 MODIFICATIONS - GESTION DE LA COMPOSITION DES FORMULES
// ===============================================

async function toggleComposition(index) {
  const compositionDiv = document.getElementById(`composition-${index}`);
  const icon = document.getElementById(`toggle-icon-${index}`);

  if (!compositionDiv || !icon) {
    showToast("Erreur d'affichage. Veuillez réessayer.", "error");
    return;
  }

  // Toggle affichage (afficher/cacher)
  if (compositionDiv.style.display === "none") {
    // On affiche
    compositionDiv.style.display = "block";
    icon.textContent = "👁️‍🗨️";

    // Charger les produits de la formule
    await loadFormuleProduits(index);
  } else {
    // On cache
    compositionDiv.style.display = "none";
    icon.textContent = "👁️";
  }
}

async function loadFormuleProduits(index) {
  const formule = tempFormules[index];
  const container = document.getElementById(`produits-formule-${index}`);

  try {
    const produits = await getFormuleProduits(formule.formule_id);

    if (produits.length === 0) {
      container.innerHTML =
        '<p class="empty-list">Aucun produit dans cette formule.</p>';
      return;
    }

    // Afficher la liste des produits avec checkboxes
    container.innerHTML = "";

    // Ajouter un message d'instruction
    const infoDiv = document.createElement("div");
    infoDiv.className = "composition-info";
    infoDiv.innerHTML = `
      <p style:"margin: 0 0 12px 0; padding: 10 px; background: #fffbea; border-left: 4px solid #f5c05c; color: #555; font-size: 13px; border-radius: 4px; line-height: 1.5;">
        💡 <strong>Décochez</strong> les produits que vous souhaitez exclure de la formule pour cette commande.
      </p>
    `;
    container.appendChild(infoDiv);

    // Liste des produits
    const produitsContainer = document.createElement("div");
    produitsContainer.id = `produits-container-${index}`;

    produits.forEach((produit) => {
      const produitName = produit.produit_name || "Produit Inconnu";

      const isExcluded = formule.produits_exclus.includes(produit.produit_id);
      const isChecked = !isExcluded;

      // Créer la ligne avec checkbox
      const checkboxDiv = document.createElement("div");
      checkboxDiv.className = "produit-checkbox";
      checkboxDiv.innerHTML = `
        <label>
          <input
            type="checkbox"
            ${isChecked ? "checked" : ""}
            data-produit-id="${produit.produit_id}"
            onchange="handleProduitCheckChange(${index})"
          />
          <span style="font-style: italic;">${produitName}</span>          
        </label>
      `;

      produitsContainer.appendChild(checkboxDiv);
    });
    container.appendChild(produitsContainer);

    // Bouton "Exclure"
    const btnDiv = document.createElement("div");
    btnDiv.style.marginTop = "15px";
    btnDiv.style.textAlign = "center";
    btnDiv.innerHTML = `
      <button
        type="button"
        class="btn-exclude"
        onclick="confirmExclusions(${index})"
      >
        🚫 Exclure les produits décochés
      </button>
    `;
    container.appendChild(btnDiv);
  } catch (error) {
    console.error(
      "Erreur lors du chargement des produits de la formule :",
      error,
    );
    container.innerHTML =
      '<p style="color: red;">Erreur lors du chargement des produits.</p>';
  }
}

// Gérer le changement de checkbox
function handleProduitCheckChange(index) {
  const container = document.getElementById(`produits-container-${index}`);
  const checkboxes = container.querySelectorAll('input[type="checkbox"]');

  checkboxes.forEach((checkbox) => {
    const label = checkbox.closest("label");
    if (checkbox.checked) {
      label.classList.remove("produit-unchecked");
    } else {
      label.classList.add("produit-unchecked");
    }
  });
}

// Confirmer les exclusions
async function confirmExclusions(index) {
  const formule = tempFormules[index];
  const container = document.getElementById(`produits-container-${index}`);
  const checkboxes = container.querySelectorAll('input[type="checkbox"]');

  // Récupérer les produits décochés
  const produitsAExclure = [];
  checkboxes.forEach((checkbox) => {
    if (!checkbox.checked) {
      const produitId = checkbox.getAttribute("data-produit-id");
      const produitName = checkbox.nextElementSibling.textContent;
      produitsAExclure.push({ id: produitId, name: produitName });
    }
  });

  // Si aucun produit à exclure
  if (produitsAExclure.length === 0) {
    formule.produits_exclus = [];
    showToast("Aucun produit exclu. La formule est complète.", "info");
    displayTempFormules();
    return;
  }

  // Construire le message de confirmation
  const listeProduits = produitsAExclure.map((p) => `• ${p.name}`).join("\n");
  const message = `Êtes-vous sûr de vouloir exclure les produits suivants de la formule "${formule.formule_name}" ?\n\n${listeProduits}`;

  if (confirm(message)) {
    // Mettre à jour la liste des exclusions
    formule.produits_exclus = produitsAExclure.map((p) => p.id);

    showToast(
      `${produitsAExclure.length} produit(s) exclu(s) de la formule.`,
      "success",
    );
    displayTempFormules();
  } else {
    showToast("Exclusion annulée. La formule reste complète.", "info");
  }
}

function handleRemoveFormule(index) {
  tempFormules.splice(index, 1);
  displayTempFormules();
  showToast("Formule retirée.", "info");
}

function handleRemoveProduit(index) {
  tempProduits.splice(index, 1);
  displayTempProduits();
  showToast("Produit retiré.", "info");
}

function displayTempProduits() {
  const container = document.getElementById("produits-list");
  const count = document.getElementById("produits-count");

  count.textContent = tempProduits.length;

  if (tempProduits.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucun produit ajouté.</p>';
    return;
  }

  container.innerHTML = "";

  tempProduits.forEach((produit, index) => {
    const div = document.createElement("div");
    div.className = "item-row";

    div.innerHTML = `
      <div class="item-info">
        <div class="item-name">${produit.produit_name}</div>
        <div class="item-detail">${produit.quantite} ${produit.unite}</div>
      </div>
      <div class="item-actions">
        <button class="btn-icon" onclick="handleRemoveProduit(${index})" title="Retirer">🗑️</button>
      </div>
    `;

    container.appendChild(div);
  });
}

function handleAddFormule() {
  const formulesSelect = document.getElementById("formule-select");
  const formuleId = formulesSelect.value;
  const couverts = parseInt(document.getElementById("formule-couverts").value);

  // Validation
  if (!formuleId) {
    showToast("Veuillez sélectionner une formule.", "warning");
    return;
  }

  if (!couverts || couverts < 1) {
    showToast("Le nombre de couverts doit être au moins 1.", "warning");
    return;
  }

  // Vérifier si la formule est déjà ajoutée
  const dejaAjoute = tempFormules.find((f) => f.formule_id === formuleId);
  if (dejaAjoute) {
    showToast("Cette formule a déjà été ajoutée.", "warning");
    return;
  }

  // trouver le nom de la formule dans allFormules
  const formule = allFormules.find((f) => f.id === formuleId);

  if (!formule) {
    showToast("Erreur : Formule introuvable.", "error");
    return;
  }

  // Ajouter à la liste temporaire avec TOUTES les infos
  tempFormules.push({
    formule_id: formuleId,
    formule_name: formule.name,
    couverts: couverts,
    produits_exclus: [],
    expanded: false,
  });

  // Mettre à jour l'affichage
  displayTempFormules();

  // Réinitialiser le formulaire
  formulesSelect.value = "";

  const nombreCouverts = document.getElementById(
    "create-nombre-couverts",
  ).value;
  document.getElementById("formule-couverts").value = nombreCouverts;

  showToast("Formule ajoutée.", "success");
}

function handleAddProduit() {
  const produitSelect = document.getElementById("produit-select");
  const produitId = produitSelect.value;
  const quantite = parseFloat(
    document.getElementById("produit-quantite").value,
  );
  const unite = document.getElementById("produit-unite").value;

  // Validation
  if (!produitId) {
    showToast("Veuillez sélectionner un produit.", "warning");
    return;
  }

  if (!quantite || quantite <= 0) {
    showToast("La quantité doit être supérieur à 0.", "warning");
    return;
  }

  if (!unite) {
    showToast("Veuillez sélectionner une unité.", "warning");
    return;
  }

  // Vérifier si le produit n'est pas djà ajouté
  const dejaAjoute = tempProduits.find((p) => p.produit_id === produitId);
  if (dejaAjoute) {
    showToast("Ce produit a déjà été ajouté.", "warning");
    return;
  }

  // Trouver le nom du produit
  const produit = allProduits.find((p) => p.id === produitId);

  if (!produit) {
    showToast("Erreur : Produit introuvable.", "error");
    return;
  }

  // Ajouter à la liste temporaire
  tempProduits.push({
    produit_id: produitId,
    produit_name: produit.name,
    quantite: quantite,
    unite: unite,
  });

  // Mettre à jour l'affichage
  displayTempProduits();

  // Réinitialiser le formulaire
  produitSelect.value = "";
  document.getElementById("produit-quantite").value = "1";

  // Remettre "unité" par défaut
  const uniteSelect = document.getElementById("produit-unite");
  if (uniteSelect.querySelector('option[value="unité"]')) {
    uniteSelect.value = "unité";
  }
  showToast("Produit ajouté.", "success");
}

async function handleCreateCommande() {
  // ==========================================
  // VÉRIFICATION : Exclusions non confirmées
  // ==========================================

  for (let index = 0; index < tempFormules.length; index++) {
    const compositionDiv = document.getElementById(`composition-${index}`);

    if (compositionDiv && compositionDiv.style.display !== "none") {
      const container = document.getElementById(`produits-container-${index}`);

      if (container) {
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        const uncheckedCount = Array.from(checkboxes).filter(
          (cb) => !cb.checked,
        ).length;

        if (uncheckedCount > 0) {
          const formule = tempFormules[index];

          const alertMessage =
            `⚠️ ATTENTION !\n\n` +
            `Vous avez décoché ${uncheckedCount} produit(s) dans la formule "${formule.formule_name}"\n` +
            `mais vous n'avez PAS cliqué sur le bouton "🚫 Exclure les produits décochés".\n\n` +
            `❌ Ces exclusions ne seront PAS prises en compte !\n\n` +
            `Voulez-vous continuer la création SANS ces exclusions ?\n\n` +
            `(Cliquez "Annuler" pour revenir en arrière et confirmer les exclusions)`;

          const proceed = await showConfirm(
            alertMessage,
            "Continuer sans exclure",
          );
          if (!proceed) {
            showToast(
              "⚠️ Création annulée. Cliquez sur 🚫 pour confirmer vos exclusions.",
              "warning",
            );
            return;
          }
        }
      }
    }
  }

  // ==========================================
  // 1. RÉCUPÉRER LES DONNÉES DU FORMULAIRE
  // ==========================================

  const nomClient = document.getElementById("create-nom-client").value.trim();
  const deliveryDate = document.getElementById("create-delivery-date").value;
  const deliveryHour = document.getElementById("create-delivery-hour").value;
  const nombreCouverts = parseInt(
    document.getElementById("create-nombre-couverts").value,
  );
  const avecService = document.getElementById("create-avec-service").checked;
  const typePrestation = document.getElementById(
    "create-type-prestation",
  ).value;
  const coefficientPonderation =
    typePrestation === "mariage"
      ? parseFloat(document.getElementById("create-coefficient").value) || 1.0
      : 1.0;
  const enAttente = document.getElementById("create-en-attente").checked;
  const notes = document.getElementById("create-notes").value.trim();

  // ==========================================
  // 2. VALIDATION DES DONNÉES
  // ==========================================

  // Valider le nom du client
  if (!nomClient) {
    showToast("Le nom du client est obligatoire.", "error");
    return;
  }

  const invalidCharsRegex = /[<>"'\\\/]/;
  if (invalidCharsRegex.test(nomClient)) {
    showToast(
      " ❌ Le nom du client contient des caractères invalides (<>\"'\\/).",
      "error",
    );
    const nomClientField = document.getElementById("create-nom-client");
    if (nomClientField) {
      nomClientField.focus();
      nomClientField.style.border = "2px solid #ff3333";
      nomClientField.style.backgroundColor = "#fff5f5";

      setTimeout(() => {
        nomClientField.style.border = "";
        nomClientField.style.backgroundColor = "";
      }, 3000);
    }
    return;
  }

  // Valider la date
  if (!deliveryDate) {
    showToast("La date de livraison est obligatoire.", "error");
    return;
  }

  // Valider l'heure
  if (!deliveryHour) {
    showToast("L'heure de livraison est obligatoire.", "error");
    return;
  }

  // Valider le nombre de couverts
  if (!nombreCouverts || nombreCouverts < 1) {
    showToast("Le nombre de couverts doit être au moins 1.", "error");
    return;
  }

  // Valider qu'il y a au moins une formule ou un produit
  if (tempFormules.length === 0 && tempProduits.length === 0) {
    showToast("Veuillez ajouter au moins une formule ou un produit.", "error");
    return;
  }

  // ==========================================
  // 3. CRÉER LA COMMANDE
  // ==========================================

  try {
    // Préparer les données de la commande
    const commandeData = {
      nom_client: nomClient,
      delivery_date: deliveryDate,
      delivery_hour: deliveryHour,
      nombre_couverts: nombreCouverts,
      avec_service: avecService,
      service: avecService,
      type_prestation: typePrestation,
      coefficient_ponderation: coefficientPonderation,
      notes: notes || null,
      validated: !enAttente,
    };

    // Appel API pour créer la commande
    const nouvelleCommande = await createCommande(commandeData);

    // ==========================================
    // 4. AJOUTER LES FORMULES
    // ==========================================

    if (tempFormules.length > 0) {
      for (const formule of tempFormules) {
        const formuleData = {
          commande_id: nouvelleCommande.id,
          formule_id: formule.formule_id,
          quantite_recommandee: formule.couverts,
          quantite_finale: formule.couverts,
          produits_exclus: formule.produits_exclus || [],
        };
        await createCommandeFormule(formuleData);
      }
    }

    // ==========================================
    // 5. AJOUTER LES PRODUITS
    // ==========================================

    if (tempProduits.length > 0) {
      for (const produit of tempProduits) {
        const produitData = {
          commande_id: nouvelleCommande.id,
          produit_id: produit.produit_id,
          quantite: produit.quantite,
          unite: produit.unite,
        };
        await createCommandeProduit(produitData);
      }
    }

    // ==========================================
    // 6. RAFRAÎCHIR LA LISTE
    // ==========================================

    await loadCommandes();

    // ==========================================
    // 7. VIDER LES DONNÉES TEMPORAIRES
    // ==========================================

    tempFormules = [];
    tempProduits = [];

    // ==========================================
    // 8. FERMER LA MODALE
    // ==========================================

    document.getElementById("create-modal").style.display = "none";

    // Réinitialiser le formulaire
    document.getElementById("create-nom-client").value = "";
    document.getElementById("create-delivery-date").value = getTodayDate();
    document.getElementById("create-delivery-hour").value = "10:00";
    document.getElementById("create-nombre-couverts").value = "1";
    document.getElementById("create-avec-service").checked = true;
    document.getElementById("create-type-prestation").value = "non-brunch";
    document.getElementById("create-en-attente").checked = false;
    document.getElementById("create-notes").value = "";
    document.getElementById("formule-couverts").value = "1";

    // ==========================================
    // 9. AFFICHER LE SUCCÈS
    // ==========================================

    showToast(`Commande "${nomClient}" créée avec succès ! 🎉`, "success");
    if (typePrestation === "mariage" && coefficientPonderation !== 1.0) {
      showToast(
        "ℹ️ Pour les mariages : les quantités sont arrondies à l'unité supérieure après application de la pondération.",
        "info",
      );
    }
  } catch (error) {
    console.error("❌ Erreur lors de la création de la commande:", error);

    let errorMessage = "Erreur lors de la création de la commande.";

    if (error.response) {
      // Récupérer le message d'erreur du backend
      try {
        const responseData = await error.response.json();
        if (responseData.detail) {
          errorMessage = responseData.detail;
        }
      } catch (e) {
        // Fallback si la réponse n'est pas du JSON
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Détecter si c'est une erreur de doublon (409 Conflict)
    if (error.response && error.response.status === 409) {
      showToast(errorMessage, "error");
      return;
    }

    // Détecter si c'est une erreur de date dans le passé
    if (
      errorMessage.includes("passé") ||
      errorMessage.includes("DATE INVALIDE")
    ) {
      showToast(
        "❌ Vous ne pouvez pas créer une commande avec une date de livraison dans le passé.",
        "error",
      );

      const dateField = document.getElementById("create-delivery-date");
      if (dateField) {
        dateField.focus();
        dateField.style.border = "2px solid #ff3333";
        dateField.style.backgroundColor = "#fff5f5";

        setTimeout(() => {
          dateField.style.border = "";
          dateField.style.backgroundColor = "";
        }, 3000);
      }
      return;
    }

    showToast(errorMessage, "error");
  }
}
