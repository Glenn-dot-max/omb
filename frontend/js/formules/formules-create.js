// js/formules/formules-create.js
// Création d'une formule avec ses produits

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

// ===========================================
// DUPLICATION D'UNE FORMULE
// ===========================================
/**
 * Génère un nom de formule unique en se basant sur les formules déjà
 * chargées en mémoire (allFormules), pour éviter le 409 "nom déjà utilisé"
 * quand on duplique plusieurs fois la même formule.
 */
async function generateUniqueFormuleName(baseName) {
  let formulesForCheck;
  try {
    formulesForCheck = await getFormules();
  } catch (error) {
    console.warn(
      "Impossible de recharger les formules pour vérifier l'unicité du nom, utilisation de la liste en mémoire.",
      error,
    );
    formulesForCheck = typeof allFormules !== "undefined" ? allFormules : [];
  }

  const existingNames = new Set(
    formulesForCheck.map((f) => f.name.trim().toLowerCase()),
  );

  let candidate = `Copie - ${baseName}`;
  let counter = 2;

  while (existingNames.has(candidate.trim().toLowerCase())) {
    candidate = `Copie - ${baseName} (${counter})`;
    counter++;
  }

  return candidate;
}

async function handleDuplicateFormule(formule) {
  try {
    // 1. Charger la liste des produits pour le select + les unités
    await loadProduitsForCreateSelect();

    if (allUnite.length === 0) {
      await loadUnite();
    } else {
      populateUniteSelects();
    }

    // 2. Réinitialiser la liste temporaire
    tempProduitsToCreate = [];

    // 3. Pré-remplir les champs du formulaire
    const nameInput = document.getElementById("create-formule-name");
    nameInput.value = await generateUniqueFormuleName(formule.name);
    document.getElementById("create-formule-couverts").value =
      formule.nombre_couverts;

    // 4. Charger la composition de la formule source et la copier
    const composition = await getFormuleProduits(formule.id);
    for (const item of composition) {
      tempProduitsToCreate.push({
        produit_id: item.produit_id,
        produit_name: item.produit_name || "Produit inconnu",
        quantite: item.quantite,
        unite: item.unite,
      });
    }

    // 5. Afficher la liste des produits copiés
    displayCreateProduitsList();

    // 6. Ouvrir la modale de création
    document.getElementById("create-modal").style.display = "block";

    // 7. Mettre le focus sur le nom et sélectionner le texte pour inviter
    // l'utilisateur à personnaliser avant de valider

    setTimeout(() => {
      nameInput.focus();
      nameInput.select();
    }, 50);

    showToast(
      '📋 Formule pré-remplie avec un nom unique. Modifiez-le si besoin puis cliquez "Créer".',
      "info",
    );
  } catch (error) {
    console.error("Erreur lors de la duplication de la formule :", error);
    showToast("❌ Erreur lors de la préparation de la duplication.", "error");
  }
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
    };

    if (isCatalogAdminRole(currentUser)) {
      formuleData.franchise_ids = franchiseIds;
    }

    const nouvelleFormule = await createFormule(formuleData);

    await Promise.all(
      tempProduitsToCreate.map((produit) =>
        createFormuleProduit({
          formule_id: nouvelleFormule.id,
          produit_id: produit.produit_id,
          quantite: produit.quantite,
          unite: produit.unite,
        }),
      ),
    );

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

    const msg = String(error?.message || "");

    if (msg.includes("déjà présent dans la formule")) {
      alert(
        "⚠️ Un des produits est déjà présent dans cette formule. \n" +
          "La formule a été créée mais certains produits n'ont pas été ajoutés (doublons).",
      );
      return;
    }

    if (msg.includes("existe déjà")) {
      alert("❌ Cette formule existe déjà dans la base de données.");
      return;
    }

    alert(
      `Erreur lors de la création de la formule : ${msg || "erreur inconnue"}`,
    );
  }
}
