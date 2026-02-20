// =======================================================
// VARIABLES GLOBALES
// =======================================================

let planningData = null;

// =======================================================
// INITIALISATION AU CHARGEMENT DE LA PAGE
// =======================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("Planning module loaded");

  // initialiser les dates par défaut (aujourd'hui et dans 7 jours)
  initDefaultDates();

  // Attacher les évènements
  attachEventListeners();
});

// =======================================================
// INITIALISER LES DATES PAR DÉFAUT
// =======================================================

function initDefaultDates() {
  const today = new Date();
  const in7Days = new Date();
  in7Days.setDate(today.getDate() + 7);

  // Formater en YYYY-MM-DD
  const formatDate = (date) => {
    return date.toISOString().split("T")[0];
  };

  document.getElementById("date-debut").value = formatDate(today);
  document.getElementById("date-fin").value = formatDate(in7Days);

  console.log(
    "📅 Dates initialisées:",
    formatDate(today),
    "->",
    formatDate(in7Days),
  );
}

// =======================================================
// ATTACHER LES ÉVÈNEMENTS
// =======================================================

function attachEventListeners() {
  // Bouton de génération du planning
  document
    .getElementById("generate-planning")
    .addEventListener("click", handleGeneratePlanning);

  // Bouton "Exporter Excel"
  document
    .getElementById("export-excel")
    .addEventListener("click", handleExportExcel);
}

// =======================================================
// GÉNÉRER LE CLIC SUR "GÉNÉRER"
// =======================================================
async function handleGeneratePlanning() {
  console.log("🔄 Génération du planning...");

  //1. Récupérer les valeurs des filtres
  const dateDebut = document.getElementById("date-debut").value;
  const dateFin = document.getElementById("date-fin").value;
  const typeFormule = document.getElementById("type-formule").value;
  const afficherTotaux = document.getElementById("afficher-totaux").checked;

  // 2. Validation
  if (!dateDebut || !dateFin) {
    alert("⚠️ Veuillez sélectionner une période");
    return;
  }

  if (new Date(dateDebut) > new Date(dateFin)) {
    alert("⚠️ La date de début doit être antérieure à la date de fin");
    return;
  }

  // 3. Afficher un loader
  const container = document.getElementById("planning-container");
  container.innerHTML = '<p style="text-align:center;">⏳ Chargement...</p>';

  try {
    // 4. Appeler le backend
    const url = `${API_URL}/planning/production?date_debut=${dateDebut}&date_fin=${dateFin}&type_formule=${typeFormule}`;
    console.log("🌐 Appel API:", url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ Données reçues:", data);

    // 5. Stocker les données globalement
    planningData = data;

    // 6. Afficher le planning
    renderPlanning(data, afficherTotaux);

    // 7. Afficher le bouton export
    document.getElementById("export-excel").style.display = "inline-block";
  } catch (error) {
    console.error("❌ Erreur lors de la génération du planning:", error);
    container.innerHTML = `
      <p style="text-align:center; color:#c0392b;">
        ⚠️ Une erreur est survenue lors de la génération du planning: ${error.message}
      </p>
    `;
  }
}

// =======================================================
// GÉNÉRER L'EXPORT EXCEL
// =======================================================
function handleExportExcel() {
  console.log("📤 Export Excel...");

  if (!planningData || !planningData.planning) {
    alert(
      "⚠️ Aucun planning à exporter. Veuillez générer le planning d'abord.",
    );
    return;
  }

  try {
    // Créer un nouveau workbook
    const wb = XLSX.utils.book_new();

    // Extraire les dates
    const dates = Object.keys(planningData.planning).sort();

    // Organiser par catégorie
    const produitsByCategorie = organizeProduitsByCategorie(planningData);

    // Créer les données pour Excel
    const excelData = generateExcelData(
      dates,
      produitsByCategorie,
      planningData.planning,
      document.getElementById("afficher-totaux").checked,
    );

    // Créer les feuilles de calcul
    const ws = XLSX.utils.aoa_to_sheet(excelData.data);

    // Appliquer les styles
    ws["!cols"] = excelData.colWidths;

    // Fusionner les cellules
    ws["!merges"] = excelData.merges;

    // Ajouter la feuille au workbook
    XLSX.utils.book_append_sheet(wb, ws, "Planning Production");

    // Générer le nom du fichier
    const filename = `planning_production_${planningData.periode.debut}_to_${planningData.periode.fin}.xlsx`;

    // Télécharger le fichier
    XLSX.writeFile(wb, filename);

    console.log("✅ Export Excel généré:", filename);
  } catch (error) {
    console.error("❌ Erreur lors de l'export Excel:", error);
    alert(
      "⚠️ Une erreur est survenue lors de l'export Excel: " + error.message,
    );
  }
}

// =======================================================
// GÉNÉRER LES DONNÉES POUR EXCEL
// =======================================================
function generateExcelData(
  dates,
  produitsByCategorie,
  planning,
  afficherTotaux,
) {
  const data = [];
  const merges = [];
  const colWidths = [{ wch: 25 }];

  let currentRow = 0;

  // ============== TITRE ==============
  data.push([
    `Planning de Production du ${formatDateLong(planningData.periode.debut)} au ${formatDateLong(planningData.periode.fin)}`,
  ]);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } });
  currentRow++;

  // Ligne vide
  data.push([]);
  currentRow++;

  // Statistiques
  data.push([
    `${planningData.commandes_count} commande(s)`,
    `${Object.keys(produitsByCategorie).length} catégorie(s)`,
  ]);
  currentRow++;

  // Ligne vide
  data.push([]);
  currentRow++;

  // Calculer le nombre total de colonnes
  let totalCols = 1; // Colonne Produit
  dates.forEach((date) => {
    const commandes = planning[date].commandes || [];
    const nbCols = commandes.length + (afficherTotaux ? 1 : 0);
    totalCols += nbCols > 0 ? nbCols : afficherTotaux ? 2 : 1;
  });
  if (afficherTotaux) {
    totalCols += 1; // Colonne TOTAL GÉNÉRAL
  }

  // Pré-remplir les largeurs de colonnes
  while (colWidths.length < totalCols) {
    colWidths.push({ wch: 12 });
  }

  // ============== POUR CHAQUE CATÉGORIE ==============
  for (const categorie in produitsByCategorie) {
    const startRow = currentRow;

    // Titre de la catégorie
    data.push([`📦 ${categorie}`]);
    merges.push({
      s: { r: currentRow, c: 0 },
      e: { r: currentRow, c: totalCols - 1 },
    });
    currentRow++;

    // ============== EN-TÊTE: DATES ==============
    const headerRow1 = ["Produit"];
    let colIdx = 1;

    dates.forEach((date) => {
      const commandes = planning[date].commandes || [];
      const nbCols = commandes.length + (afficherTotaux ? 1 : 0);

      const [year, month, day] = date.split("-");
      const dateObj = new Date(year, month - 1, day);
      const joursSemaine = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
      const jourNom = joursSemaine[dateObj.getDay()];

      headerRow1.push(`${day}/${month}\n${jourNom}`);

      // Fusionner les colonnes pour cette date
      if (nbCols > 1) {
        merges.push({
          s: { r: currentRow, c: colIdx },
          e: { r: currentRow, c: colIdx + nbCols - 1 },
        });
      }

      // Ajouter des colonnes vides pour les commandes supplémentaires
      for (let i = 1; i < nbCols; i++) {
        headerRow1.push("");
      }

      colIdx += nbCols;
    });

    // Colonne TOTAL GÉNÉRAL
    if (afficherTotaux) {
      headerRow1.push("TOTAL GÉNÉRAL");
      colWidths.push({ wch: 15 });
    }

    data.push(headerRow1);
    currentRow++;

    // ==============  SOUS-EN-TÊTE: CLIENTS ==============
    const headerRow2 = ["Client"];
    dates.forEach((date) => {
      const commandes = planning[date].commandes || [];

      if (commandes.length > 0) {
        commandes.forEach((cmd) => {
          headerRow2.push(
            `${(cmd.client || "").substring(0, 20)}\n${cmd.heure || ""}`,
          );
        });

        // Colonne TOTAL du jour
        if (afficherTotaux) {
          const [year, month, day] = date.split("-");
          const dateObj = new Date(year, month - 1, day);
          const joursSemaine = [
            "Dim",
            "Lun",
            "Mar",
            "Mer",
            "Jeu",
            "Ven",
            "Sam",
          ];
          const jourNom = joursSemaine[dateObj.getDay()];
          headerRow2.push(`TOTAL ${jourNom}`);
        }
      } else {
        headerRow2.push("-");
        if (afficherTotaux) {
          headerRow2.push("-");
        }
      }
    });

    // Sous-en-tête TOTAL GÉNÉRAL
    if (afficherTotaux) {
      headerRow2.push("");
    }

    data.push(headerRow2);
    currentRow++;

    // ============== PRODUITS DE LA CATÉGORIE ==============
    const produits = produitsByCategorie[categorie];

    for (const produitId in produits) {
      const produit = produits[produitId];

      // Produit + Type sur 2 lignes dans la même cellule
      const produitNom = produit.nom || "Sans nom";
      const produitType = produit.type || "Type inconnu";
      const celluleNom = `${produitNom}\n(${produitType})`;

      const row = [celluleNom];
      let totalGeneral = 0;

      // Pour chaque date
      dates.forEach((date) => {
        const commandes = planning[date].commandes || [];
        let totalJour = 0;

        if (commandes.length > 0) {
          // Pour chaque commande
          commandes.forEach((cmd) => {
            const produitData = cmd.produits[produitId];

            if (produitData) {
              const qte = produitData.quantite || 0;
              totalJour += qte;
              totalGeneral += qte;
              row.push(formatNumber(qte));
            } else {
              row.push("-");
            }
          });

          // Colonne TOTAL du jour
          if (afficherTotaux) {
            row.push(totalJour > 0 ? formatNumber(totalJour) : "-");
          }
        } else {
          row.push("-");
          if (afficherTotaux) {
            row.push("-");
          }
        }
      });

      // Colonne TOTAL GÉNÉRAL
      if (afficherTotaux) {
        row.push(
          totalGeneral > 0
            ? `${formatNumber(totalGeneral)} ${produit.unite || ""}`
            : "-",
        );
      }

      data.push(row);
      currentRow++;
    }

    data.push([]); // Ligne vide après chaque catégorie
    currentRow++;
  }

  return {
    data: data,
    colWidths: colWidths,
    merges: merges,
  };
}

// ===========================================
// AFFICHER LE PLANNING
// ===========================================
function renderPlanning(data, afficherTotaux) {
  const container = document.getElementById("planning-container");

  // Vérifier s'il y a des données
  if (!data.planning || Object.keys(data.planning).length === 0) {
    container.innerHTML = `
      <p style="text-align:center; color:#999;">
        Aucune commande trouvée pour cette période
      </p>
    `;
    return;
  }

  // 1. Extraire toutes les dates de la période (triées)
  const dates = Object.keys(data.planning).sort();

  // 2. Organiser les produits par catégorie
  const produitsByCategorie = organizeProduitsByCategorie(data);

  // 3. Créer le HTML
  let html = `
    <div class="form-card">
      <h3>📊 Planning du ${formatDateLong(data.periode.debut)} au ${formatDateLong(data.periode.fin)}</h3>
      <p style="color:#666; margin-bottom:1rem;">
        ${data.commandes_count} commande(s) · ${Object.keys(produitsByCategorie).length} catégorie(s)
      </p>
  `;

  // 4. Pour chaque catégorie, créer un tableau
  for (const categorie in produitsByCategorie) {
    html += `
      <div style="margin-bottom: 2rem;">
        <h4 style="background: linear-gradient(135deg, #503224 0%, #6b4233 100%); color: #f5c842; padding: 0.75rem 1rem; border-radius: 8px 8px 0 0; margin: 0;">
          📦 ${categorie}
        </h4>
        <div style="overflow-x: auto; border: 2px solid #503224; border-top: none; border-radius: 0 0 8px 8px;">
          <table style="width:100%; border-collapse: collapse;">
            ${generateTableHeader(dates, data.planning, afficherTotaux)}
            ${generateTableBody(produitsByCategorie[categorie], dates, data.planning, afficherTotaux)}
          </table>
        </div>
      </div>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;
}

// ===========================================
// ORGANISER LES PRODUITS PAR CATÉGORIE
// ===========================================
function organizeProduitsByCategorie(data) {
  const result = {};

  // Parcourir tous les jours
  for (const date in data.planning) {
    const totaux = data.planning[date].totaux;

    // Parcourir tous les produits dans les totaux
    for (const produitId in totaux) {
      const produit = totaux[produitId];
      const categorie = produit.categorie || "Autre";

      // Initialiser la catégorie si elle n'existe pas
      if (!result[categorie]) {
        result[categorie] = {};
      }

      // Ajouter le produit (une seule fois par ID)
      if (!result[categorie][produitId]) {
        result[categorie][produitId] = {
          id: produitId,
          nom: produit.nom,
          type: produit.type || "Type inconnu",
          unite: produit.unite,
          categorie: categorie,
        };
      }
    }
  }

  return result;
}

// ===========================================
// GÉNÉRER L'EN-TÊTE DU TABLEAU
// ===========================================
function generateTableHeader(dates, planning, afficherTotaux) {
  let html = `
    <thead>
      <!-- Ligne 1: Dates -->
      <tr style="background:#4472C4; color:white;">
        <th style="padding:0.75rem; text-align:left; border:1px solid #ddd; min-width: 180px;">Produit</th>
  `;

  // Pour chaque date
  dates.forEach((date) => {
    const commandes = planning[date].commandes || [];
    const nbCols = commandes.length + (afficherTotaux ? 1 : 0);

    const [year, month, day] = date.split("-");
    const dateObj = new Date(year, month - 1, day);
    const joursSemaine = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const jourNom = joursSemaine[dateObj.getDay()];

    html += `
      <th colspan="${nbCols}" style="padding:0.75rem; text-align:center; border:1px solid #ddd; background:#5B9BD5;">
        ${day}/${month}<br/>${jourNom}
      </th>
    `;
  });

  // Colonne TOTAL GÉNÉRAL
  if (afficherTotaux) {
    html += `
      <th style="padding:0.75rem; text-align:center; border:1px solid #ddd; background:#ED7D31; color:white;">
        TOTAL<br/>GÉNÉRAL
      </th>
    `;
  }

  html += `</tr>`;

  // Ligne 2: Noms des clients
  html += `<tr style="background:#D9E1F2;">
    <th style="padding:0.5rem; border:1px solid #ddd; font-weight:normal; font-style:italic; font-size:0.85rem;">Client</th>
  `;

  dates.forEach((date) => {
    const commandes = planning[date].commandes || [];

    if (commandes.length > 0) {
      commandes.forEach((cmd) => {
        const clientShort = (cmd.client || "").substring(0, 20);
        html += `
          <th style="padding:0.5rem; border:1px solid #ddd; font-size:0.75rem; font-weight:normal; text-align:center;">
            ${clientShort}<br/>
            <span style="color:#666;">${cmd.heure || ""}</span>
          </th>
        `;
      });

      // Colonne TOTAL du jour
      if (afficherTotaux) {
        const [year, month, day] = date.split("-");
        const dateObj = new Date(year, month - 1, day);
        const joursSemaine = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
        const jourNom = joursSemaine[dateObj.getDay()];

        html += `
          <th style="padding:0.5rem; border:1px solid #ddd; font-weight:bold; text-align:center; background:#F4B084; font-size:0.75rem;">
            TOTAL<br/>${jourNom}
          </th>
        `;
      }
    } else {
      html += `<th style="padding:0.5rem; border:1px solid #ddd;">-</th>`;
      if (afficherTotaux) {
        html += `<th style="padding:0.5rem; border:1px solid #ddd; background:#F4B084;">-</th>`;
      }
    }
  });

  // En-tête TOTAL GÉNÉRAL
  if (afficherTotaux) {
    html += `<th style="padding:0.5rem; border:1px solid #ddd; background:#F4B084;"></th>`;
  }

  html += `</tr></thead>`;

  return html;
}

// ===========================================
// GÉNÉRER LE CORPS DU TABLEAU
// ===========================================
function generateTableBody(produits, dates, planning, afficherTotaux) {
  let html = `<tbody>`;

  // Pour chaque produit de la catégorie
  for (const produitId in produits) {
    const produit = produits[produitId];

    html += `<tr>`;

    // Colonne Produit
    html += `
      <td style="padding:0.75rem; font-weight:600; border:1px solid #ddd; background:#FFF2CC;">

        ${produit.nom}<br/>
        <span style="font-size:0.85rem; color:#666; font-weight:normal;">[${produit.type || "Type inconnu"}]</span>
      </td>
    `;

    let totalGeneral = 0;

    // Pour chaque date
    dates.forEach((date) => {
      const commandes = planning[date].commandes || [];
      let totalJour = 0;

      if (commandes.length > 0) {
        // Pour chaque commande
        commandes.forEach((cmd) => {
          const produitData = cmd.produits[produitId];

          if (produitData) {
            const qte = produitData.quantite || 0;
            totalJour += qte;
            totalGeneral += qte;

            // Couleur selon source
            const bgColor =
              produitData.source === "formule" ? "#E8F5E9" : "#FFF3E0";

            html += `
              <td style="padding:0.5rem; text-align:center; border:1px solid #ddd; background:${bgColor}; font-weight:600;">
                ${formatNumber(qte)}
              </td>
            `;
          } else {
            html += `
              <td style="padding:0.5rem; text-align:center; border:1px solid #ddd; background:#f9f9f9; color:#999;">
                -
              </td>
            `;
          }
        });

        // Colonne TOTAL du jour
        if (afficherTotaux) {
          if (totalJour > 0) {
            html += `
              <td style="padding:0.5rem; text-align:center; border:1px solid #ddd; background:#FFE699; font-weight:bold;">
                ${formatNumber(totalJour)}
              </td>
            `;
          } else {
            html += `
              <td style="padding:0.5rem; text-align:center; border:1px solid #ddd; background:#f9f9f9;">
                -
              </td>
            `;
          }
        }
      } else {
        html += `
          <td style="padding:0.5rem; text-align:center; border:1px solid #ddd; background:#f9f9f9; color:#999;">
            -
          </td>
        `;
        if (afficherTotaux) {
          html += `
            <td style="padding:0.5rem; text-align:center; border:1px solid #ddd; background:#f9f9f9;">
              -
            </td>
          `;
        }
      }
    });

    // Colonne TOTAL GÉNÉRAL
    if (afficherTotaux) {
      if (totalGeneral > 0) {
        html += `
          <td style="padding:0.5rem; text-align:center; border:1px solid #ddd; background:#F8CBAD; font-weight:bold; font-size:1rem;">
            ${formatNumber(totalGeneral)} ${produit.unite || ""}
          </td>
        `;
      } else {
        html += `
          <td style="padding:0.5rem; text-align:center; border:1px solid #ddd; background:#f9f9f9;">
            -
          </td>
        `;
      }
    }

    html += `</tr>`;
  }

  html += `</tbody>`;
  return html;
}

// ===========================================
// FORMATER UNE DATE (YYYY-MM-DD → JJ/MM)
// ===========================================
function formatDateLong(dateStr) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

// ===========================================
// FORMATER UN NOMBRE (entier si possible)
// ===========================================
function formatNumber(num) {
  if (Number.isInteger(num)) {
    return num.toString();
  }
  return num.toFixed(1);
}
