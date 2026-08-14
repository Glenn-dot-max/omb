// js/commandes-render.js
// Affichage et rendu des commandes

// ===============================================
// AFFICHAGE DES COMMANDES
// ===============================================

function displayCommandes(commandes) {
  const commandesList = document.getElementById("commandes-list");

  if (commandes.length === 0) {
    commandesList.innerHTML = "<p>Aucune commande trouvée.</p>";
    return;
  }

  // ==============================================
  // SI ON EST DANS L'ONGLET ARCHIVÉ
  // ==============================================

  if (AppState.currentTab === "archived") {
    // Pour les commandes archivées, on affiche simplement par date décroissante
    commandesList.innerHTML = "";

    const sortedCommandes = [...commandes].sort((a, b) => {
      const dateA = new Date(a.delivery_date);
      const dateB = new Date(b.delivery_date);
      return dateB - dateA; // Ordre décroissant (plus récent en premier)
    });

    const section = document.createElement("div");
    section.className = "commandes-section archived-section";

    const header = document.createElement("div");
    header.className = "section-header future-header";
    header.innerHTML = `
      <div class="section-title">
        <h3>🗄️ Commandes archivées</h3>
        <p class="section-subtitle">Triées par date (plus récent en premier)</p>
      </div>
      <div class="section-stats">
        <span class="section-count">📦 ${commandes.length} commande${commandes.length > 1 ? "s" : ""}</span>
      </div>
    `;

    section.appendChild(header);

    const commandesGroup = document.createElement("div");
    commandesGroup.className = "commandes-group";

    sortedCommandes.forEach((commande) => {
      const commandeCard = createCommandeElement(commande, false);
      commandesGroup.appendChild(commandeCard);
    });

    section.appendChild(commandesGroup);
    commandesList.appendChild(section);

    return; // On arrête ici pour les commandes archivées
  }

  // ==============================================
  // SÉPARER ET TRIER LES COMMANDES ACTIVES
  // ==============================================

  let todayParis;
  if (window.parisDate) {
    const [pYear, pMonth, pDay] = window.parisDate.split("-").map(Number);
    todayParis = new Date(pYear, pMonth - 1, pDay);
    todayParis.setHours(0, 0, 0, 0);
  } else {
    todayParis = new Date();
    todayParis.setHours(0, 0, 0, 0);
  }

  const tomorrow = new Date(todayParis);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayAfterTomorrow = new Date(todayParis);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  const in7Days = new Date(todayParis);
  in7Days.setDate(in7Days.getDate() + 7);

  const in14Days = new Date(todayParis);
  in14Days.setDate(in14Days.getDate() + 14);

  // Créer les groupes
  const commandesAujourdHui = [];
  const commandesDemain = [];
  const commandesCetteSemaine = [];
  const commandesSemaineProchaine = [];
  const commandesPlusTard = [];

  commandes.forEach((commande) => {
    const deliveryDateOnly = commande.delivery_date.split("T")[0];
    const [year, month, day] = deliveryDateOnly.split("-").map(Number);
    const commandeDate = new Date(year, month - 1, day);
    commandeDate.setHours(0, 0, 0, 0);

    if (commandeDate.getTime() === todayParis.getTime()) {
      commandesAujourdHui.push(commande);
    } else if (commandeDate.getTime() === tomorrow.getTime()) {
      commandesDemain.push(commande);
    } else if (commandeDate >= dayAfterTomorrow && commandeDate <= in7Days) {
      commandesCetteSemaine.push(commande);
    } else if (commandeDate > in7Days && commandeDate <= in14Days) {
      commandesSemaineProchaine.push(commande);
    } else if (commandeDate > in14Days) {
      commandesPlusTard.push(commande);
    }
  });

  // Fonction pour trier par heure
  const sortByTime = (a, b) => {
    const timeA = a.delivery_hour || "00:00";
    const timeB = b.delivery_hour || "00:00";
    return timeA.localeCompare(timeB);
  };

  // Fonction pour trier par date puis heure
  const sortByDateTime = (a, b) => {
    const dateA = new Date(a.delivery_date);
    const dateB = new Date(b.delivery_date);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA - dateB;
    }
    return sortByTime(a, b);
  };

  // Trier par chaque groupe
  commandesAujourdHui.sort(sortByTime);
  commandesDemain.sort(sortByTime);
  commandesCetteSemaine.sort(sortByDateTime);
  commandesSemaineProchaine.sort(sortByDateTime);
  commandesPlusTard.sort(sortByDateTime);

  // Fonction pour calculer le total de couverts
  const getTotalCouverts = (commandes) => {
    return commandes.reduce(
      (total, cmd) => total + (cmd.nombre_couverts || 0),
      0,
    );
  };

  // ==============================================
  // AFFICHER LES SECTIONS
  // ==============================================

  commandesList.innerHTML = "";

  // Section Aujourd'hui
  if (commandesAujourdHui.length > 0) {
    const section = createSection({
      title: "Aujourd'hui",
      subtitle: getDateLabel(todayParis),
      commandes: commandesAujourdHui,
      totalCouverts: getTotalCouverts(commandesAujourdHui),
      className: "today-section",
      urgent: true,
    });
    commandesList.appendChild(section);
  }

  // Section Demain
  if (commandesDemain.length > 0) {
    const section = createSection({
      title: "⚠️ Demain",
      subtitle: getDateLabel(tomorrow),
      commandes: commandesDemain,
      totalCouverts: getTotalCouverts(commandesDemain),
      className: "tomorrow-section",
      urgent: true,
    });
    commandesList.appendChild(section);
  }

  // Section Cette semaine
  if (commandesCetteSemaine.length > 0) {
    const section = createSection({
      title: "📅 CETTE SEMAINE (J+2 à J+7)",
      subtitle: `${getDateLabel(dayAfterTomorrow)} - ${getDateLabel(in7Days)}`,
      commandes: commandesCetteSemaine,
      totalCouverts: getTotalCouverts(commandesCetteSemaine),
      className: "week-section",
      urgent: false,
    });
    commandesList.appendChild(section);
  }

  // Section Semaine prochaine
  if (commandesSemaineProchaine.length > 0) {
    const section = createSection({
      title: "📅 SEMAINE PROCHAINE (J+8 à J+14)",
      subtitle: `${getDateLabel(new Date(in7Days.getTime() + 24 * 60 * 60 * 1000))} - ${getDateLabel(in14Days)}`,
      commandes: commandesSemaineProchaine,
      totalCouverts: getTotalCouverts(commandesSemaineProchaine),
      className: "next-week-section",
      urgent: false,
    });
    commandesList.appendChild(section);
  }

  // Section Plus tard
  if (commandesPlusTard.length > 0) {
    const section = createSection({
      title: "📆 PLUS TARD (Au-delà de J+14)",
      subtitle: "Commandes futures",
      commandes: commandesPlusTard,
      totalCouverts: getTotalCouverts(commandesPlusTard),
      className: "later-section",
      urgent: false,
    });
    commandesList.appendChild(section);
  }
}

// Fonction helper pour créer une section de commandes
function createSection({
  title,
  subtitle,
  commandes,
  totalCouverts,
  className,
  urgent,
}) {
  const section = document.createElement("div");
  section.className = `commandes-section ${className}`;

  const header = document.createElement("div");
  header.className = `section-header ${urgent ? "urgent-header" : "future-header"}`;
  header.innerHTML = `
    <div class="section-title">
      <h3>${title}</h3>
      <p class="section-subtitle">${subtitle}</p>
    </div>
    <div class="section-stats">
      <span class="section-count">📦 ${commandes.length} commande${commandes.length > 1 ? "s" : ""}</span>
      <span class="section-couverts">🍽️ ${totalCouverts} couvert${totalCouverts > 1 ? "s" : ""}</span>
    </div>
  `;

  section.appendChild(header);

  const commandesGroup = document.createElement("div");
  commandesGroup.className = "commandes-group";

  commandes.forEach((commande) => {
    const commandeCard = createCommandeElement(commande, urgent);
    commandesGroup.appendChild(commandeCard);
  });

  section.appendChild(commandesGroup);

  return section;
}

// Fonction helper pour formater les dates
function getDateLabel(date) {
  const options = { weekday: "long", day: "numeric", month: "long" };
  return date.toLocaleDateString("fr-FR", options);
}

function createCommandeElement(commande, isUrgent = false) {
  const div = document.createElement("div");

  const isValidated = commande.validated !== false;
  div.className = `product-item ${isUrgent ? "urgent-item" : ""} ${!isValidated ? "non-validated" : ""}`;

  // Nom du client
  const nameSpan = document.createElement("span");
  nameSpan.className = "product-name";
  nameSpan.textContent = commande.nom_client;

  // Bandeau
  const bandeau = document.createElement("div");
  bandeau.className = "product-bandeau";

  // Date de livraison dans le bandeau
  const dateSpan = document.createElement("span");
  const dateInfo = getDateInfo(commande.delivery_date);
  dateSpan.textContent = `📅 ${dateInfo.text}`;
  dateSpan.style.fontWeight = dateInfo.urgent ? "bold" : "normal";
  dateSpan.style.color = "#f5a623";
  bandeau.appendChild(dateSpan);

  // Heure de livraison dans le bandeau
  const heureSpan = document.createElement("span");
  heureSpan.textContent = `⏰ ${commande.delivery_hour}`;
  bandeau.appendChild(heureSpan);

  // DÉTAILS (badges)

  const detailsDiv = document.createElement("div");
  detailsDiv.className = "product-detail";

  // Badge couverts
  const couvertsBadge = document.createElement("span");
  couvertsBadge.className = "badge type";
  couvertsBadge.textContent = `🍽️ ${commande.nombre_couverts} couverts`;
  detailsDiv.appendChild(couvertsBadge);

  // Badge service
  const serviceBadge = document.createElement("span");
  serviceBadge.className = commande.avec_service
    ? "badge service-oui"
    : "badge service-non";
  serviceBadge.textContent = commande.avec_service
    ? "✅ Service inclus"
    : "⭕ Sans service";
  detailsDiv.appendChild(serviceBadge);

  // Badge type prestation
  const typeBadge = document.createElement("span");
  typeBadge.className = "badge category";
  typeBadge.textContent = `🏷️ ${commande.type_prestation || "non-brunch"}`;
  detailsDiv.appendChild(typeBadge);

  // Notes
  if (commande.notes && commande.notes.trim()) {
    const notesP = document.createElement("p");
    notesP.className = "product-notes";
    notesP.textContent = `📝 ${commande.notes}`;
    detailsDiv.appendChild(notesP);
  }

  // Actions
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "product-actions";

  // ==================================
  // SI LA COMMANDE N'EST PAS VALIDÉE
  // ==================================
  if (!isValidated) {
    const validationOverlay = document.createElement("div");
    validationOverlay.className = "validation-overlay";
    validationOverlay.innerHTML = `
      <div class="validation-message">⚠️ Commande en attente de validation</div>
      <div class="validation-actions">
        <button class="validate-btn">✅ Confirmer la commande</button>
        <button class="edit-commande-btn">✏️ Modifier la commande</button>
        <button class="refuse-btn">❌ Abandonner</button>
      </div>
    `;

    // Événements pour les boutons de l'overlay
    const btnConfirm = validationOverlay.querySelector(".validate-btn");
    const btnAbandon = validationOverlay.querySelector(".refuse-btn");
    const btnEdit = validationOverlay.querySelector(".edit-commande-btn");

    btnConfirm.onclick = (e) => {
      e.stopPropagation();
      handleValidateCommande(commande.id);
    };

    btnAbandon.onclick = (e) => {
      e.stopPropagation();
      handleDeleteCommande(commande.id);
    };

    btnEdit.onclick = (e) => {
      e.stopPropagation();
      handleEditCommande(commande);
    };

    div.appendChild(validationOverlay);
  } else {
    // ==================================
    // SI LA COMMANDE EST VALIDÉE (AFFICHAGE NORMAL)
    // ==================================

    const detailsBtn = document.createElement("button");
    detailsBtn.className = "edit-btn";
    detailsBtn.textContent = "👁️ Détails";
    detailsBtn.onclick = () => handleViewDetails(commande);

    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.textContent = "✏️ Modifier";
    editBtn.onclick = () => handleEditCommande(commande);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "🗑️ Supprimer";
    deleteBtn.onclick = () => handleDeleteCommande(commande.id);

    const duplicateBtn = document.createElement("button");
    duplicateBtn.className = "edit-btn";
    duplicateBtn.textContent = "📄 Dupliquer";
    duplicateBtn.onclick = () => handleDuplicateCommande(commande);

    actionsDiv.appendChild(detailsBtn);
    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(duplicateBtn);
    actionsDiv.appendChild(deleteBtn);
  }

  // Assembler l'élément commande
  div.appendChild(nameSpan);
  div.appendChild(bandeau);
  div.appendChild(detailsDiv);
  div.appendChild(actionsDiv);

  return div;
}

// ===============================================
// VALIDATION D'UNE COMMANDE
// ===============================================

async function handleValidateCommande(commandeId) {
  try {
    await validateCommande(commandeId);
    showToast("✅ Commande validée avec succès!", "success");
    await loadCommandes();
  } catch (error) {
    console.error("Erreur lors de la validation de la commande :", error);
    showToast("Erreur lors de la validation de la commande.", "error");
  }
}

// ===============================================
// FONCTIONS UTILITAIRES
// ===============================================

function getDateInfo(dateString) {
  let today;
  if (window.parisDate) {
    const [pYear, pMonth, pDay] = window.parisDate.split("-").map(Number);
    today = new Date(pYear, pMonth - 1, pDay);
    today.setHours(0, 0, 0, 0);
  } else {
    today = new Date();
    today.setHours(0, 0, 0, 0);
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const deliveryDateOnly = dateString.split("T")[0];
  const [year, month, day] = deliveryDateOnly.split("-").map(Number);
  const commandeDate = new Date(year, month - 1, day);
  commandeDate.setHours(0, 0, 0, 0);

  if (commandeDate.getTime() === today.getTime()) {
    return { text: "Aujourd'hui", urgent: true };
  } else if (commandeDate.getTime() === tomorrow.getTime()) {
    return { text: "Demain", urgent: true };
  } else {
    const displayDate = new Date(year, month - 1, day);
    displayDate.setHours(0, 0, 0, 0);
    return {
      text: displayDate.toLocaleDateString("fr-FR"),
      urgent: false,
    };
  }
}

function updateCommandesCount() {
  const count = document.getElementById("commandes-count");
  count.textContent = `${allCommandes.length} commande${allCommandes.length > 1 ? "s" : ""}`;
}
