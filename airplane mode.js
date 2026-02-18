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
        // 🎯 Nettoyer la valeur
        const nomPropre = unite.nom.trim();
        option.value = nomPropre;
        option.textContent = nomPropre;
        select.appendChild(option);
      });

      // Sélectionner "unité" par défaut si disponible
      if (select.querySelector('option[value="unité"]')) {
        select.value = "unité";
        console.log(`✅ "unité" sélectionné par défaut dans ${select.id}`);
      }
    }
  });
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

  const existe = tempProduitsToCreate.find((p) => p.produit_id === produitId);
  if (existe) {
    alert("Ce produit a déjà été ajouté.");
    return;
  }

  tempProduitsToCreate.push({
    produit_id: produitId,
    produit_name: produitName,
    quantite: parseFloat(quantite),
    unite: unite.trim(), // 🎯 Nettoyer
  });

  displayCreateProduitsList();

  // Réinitialiser le formulaire
  document.getElementById("create-produit-select").value = "";
  document.getElementById("create-produit-quantite").value = "1";
  
  // 🎯 Remettre "unité" par défaut
  const uniteSelect = document.getElementById("create-produit-unite");
  if (uniteSelect.querySelector('option[value="unité"]')) {
    uniteSelect.value = "unité";
  }
}




// console JS
// Recharger les unités
await loadUnite()

// Vérifier
allUnite.map(u => ({nom: u.nom, longueur: u.nom.length}))








