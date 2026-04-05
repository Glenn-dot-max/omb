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
    const endpoint = `/planning/production?date_debut=${dateDebut}&date_fin=${dateFin}&type_formule=${typeFormule}`;
    console.log("🌐 Appel API:", endpoint);

    const data = await apiGet(endpoint);
    console.log("✅ Données reçues:", data);

    // Vérifier s'il y a des ocmmandes non validées
    if (data.commandes_non_validees && data.commandes_non_validees.length > 0) {
      const liste = data.commandes_non_validees
        .map(
          (c) =>
            `• ${c.nom_client} - ${c.delivery_date} à ${c.delivery_hour} (${c.nombre_couverts} couverts)`,
        )
        .join("\n");

      const message = `⚠️ Attention !\\${data.commandes_non_validees.length} commande(s) NON validée(s) ont été exclue(s) du planning:\\n\\n${liste}\\n\\nCes commandes ne sont PAS incluses dans ce planning.`;

      alert(message);
    }

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
// GÉNÉRER L'EXPORT EXCEL AVEC EXCELJS (TYPE + CATÉGORIE)
// =======================================================
async function handleExportExcel() {
  console.log("📤 Export Excel...");

  if (!planningData || !planningData.planning) {
    alert(
      "⚠️ Aucun planning à exporter. Veuillez générer le planning d'abord.",
    );
    return;
  }

  try {
    // Créer un nouveau workbook avec ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Planning Production");

    // Extraire les dates
    const dates = Object.keys(planningData.planning).sort();

    // Organiser par TYPE puis CATÉGORIE
    const produitsByType = organizeProduitsByType(planningData);

    // Afficher les totaux
    const afficherTotaux = document.getElementById("afficher-totaux").checked;

    let currentRow = 1;

    // ============== TITRE ==============
    const titleCell = worksheet.getCell(currentRow, 1);
    titleCell.value = `Planning de Production du ${formatDateLong(planningData.periode.debut)} au ${formatDateLong(planningData.periode.fin)}`;
    titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    worksheet.mergeCells(currentRow, 1, currentRow, 10);
    worksheet.getRow(currentRow).height = 30;
    currentRow++;

    // Ligne vide
    currentRow++;

    // Statistiques
    worksheet.getCell(currentRow, 1).value =
      `${planningData.commandes_count} commande(s)`;
    currentRow++;

    // Ligne vide
    currentRow++;

    // ============== EN-TÊTE: LIGNE 1 (DATES) ==============
    let colIdx = 1;

    // Colonnes TYPE, CATÉGORIE, PRODUIT
    worksheet.getCell(currentRow, colIdx).value = "Type";
    worksheet.getCell(currentRow, colIdx).font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    worksheet.getCell(currentRow, colIdx).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    worksheet.getCell(currentRow, colIdx).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    colIdx++;

    worksheet.getCell(currentRow, colIdx).value = "Catégorie";
    worksheet.getCell(currentRow, colIdx).font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    worksheet.getCell(currentRow, colIdx).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    worksheet.getCell(currentRow, colIdx).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    colIdx++;

    worksheet.getCell(currentRow, colIdx).value = "Produit";
    worksheet.getCell(currentRow, colIdx).font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    worksheet.getCell(currentRow, colIdx).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    worksheet.getCell(currentRow, colIdx).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    colIdx++;

    // Dates
    dates.forEach((date) => {
      const commandes = planningData.planning[date].commandes || [];
      const nbCols = commandes.length + (afficherTotaux ? 1 : 0);

      const [year, month, day] = date.split("-");
      const dateObj = new Date(year, month - 1, day);
      const joursSemaine = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
      const jourNom = joursSemaine[dateObj.getDay()];

      const dateCell = worksheet.getCell(currentRow, colIdx);
      dateCell.value = `${day}/${month}\n${jourNom}`;
      dateCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      dateCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF5B9BD5" },
      };
      dateCell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };

      if (nbCols > 1) {
        worksheet.mergeCells(
          currentRow,
          colIdx,
          currentRow,
          colIdx + nbCols - 1,
        );
      }

      colIdx += nbCols;
    });

    // Colonne TOTAL GÉNÉRAL
    if (afficherTotaux) {
      const totalCell = worksheet.getCell(currentRow, colIdx);
      totalCell.value = "TOTAL\nGÉNÉRAL";
      totalCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      totalCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFED7D31" },
      };
      totalCell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
    }

    currentRow++;

    // ============== EN-TÊTE: LIGNE 2 (CLIENT) ==============
    colIdx = 1;

    // Colonnes vides pour TYPE, CATÉGORIE
    worksheet.getCell(currentRow, colIdx).value = "";
    worksheet.getCell(currentRow, colIdx).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };
    colIdx++;

    worksheet.getCell(currentRow, colIdx).value = "";
    worksheet.getCell(currentRow, colIdx).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };
    colIdx++;

    worksheet.getCell(currentRow, colIdx).value = "Client";
    worksheet.getCell(currentRow, colIdx).font = {
      italic: true,
      size: 10,
      bold: true,
    };
    worksheet.getCell(currentRow, colIdx).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };
    worksheet.getCell(currentRow, colIdx).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    colIdx++;

    // Clients
    dates.forEach((date) => {
      const commandes = planningData.planning[date].commandes || [];

      if (commandes.length > 0) {
        commandes.forEach((cmd) => {
          const clientCell = worksheet.getCell(currentRow, colIdx);
          clientCell.value = cmd.client || "";
          clientCell.font = { size: 9, bold: true };
          clientCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD9E1F2" },
          };
          clientCell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
          };
          colIdx++;
        });

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

          const totalJourCell = worksheet.getCell(currentRow, colIdx);
          totalJourCell.value = `TOTAL ${jourNom}`;
          totalJourCell.font = { bold: true, size: 9 };
          totalJourCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF4B084" },
          };
          totalJourCell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
          };
          colIdx++;
        }
      } else {
        worksheet.getCell(currentRow, colIdx).value = "-";
        worksheet.getCell(currentRow, colIdx).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD9E1F2" },
        };
        colIdx++;
        if (afficherTotaux) {
          worksheet.getCell(currentRow, colIdx).value = "-";
          worksheet.getCell(currentRow, colIdx).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF4B084" },
          };
          colIdx++;
        }
      }
    });

    if (afficherTotaux) {
      worksheet.getCell(currentRow, colIdx).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF4B084" },
      };
    }

    currentRow++;

    // ============== EN-TÊTE: LIGNE 3 (NOMBRE DE COUVERTS) ==============
    colIdx = 1;

    worksheet.getCell(currentRow, colIdx).value = "";
    worksheet.getCell(currentRow, colIdx).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };
    colIdx++;

    worksheet.getCell(currentRow, colIdx).value = "";
    worksheet.getCell(currentRow, colIdx).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };
    colIdx++;

    worksheet.getCell(currentRow, colIdx).value = "Nombre de couverts";
    worksheet.getCell(currentRow, colIdx).font = { italic: true, size: 10 };
    worksheet.getCell(currentRow, colIdx).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };
    worksheet.getCell(currentRow, colIdx).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    colIdx++;

    dates.forEach((date) => {
      const commandes = planningData.planning[date].commandes || [];

      if (commandes.length > 0) {
        commandes.forEach((cmd) => {
          const couvertsCell = worksheet.getCell(currentRow, colIdx);
          couvertsCell.value = cmd.couverts || "";
          couvertsCell.font = { size: 9 };
          couvertsCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD9E1F2" },
          };
          couvertsCell.alignment = {
            vertical: "middle",
            horizontal: "center",
          };
          colIdx++;
        });

        if (afficherTotaux) {
          worksheet.getCell(currentRow, colIdx).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF4B084" },
          };
          colIdx++;
        }
      } else {
        worksheet.getCell(currentRow, colIdx).value = "-";
        worksheet.getCell(currentRow, colIdx).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD9E1F2" },
        };
        colIdx++;
        if (afficherTotaux) {
          worksheet.getCell(currentRow, colIdx).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF4B084" },
          };
          colIdx++;
        }
      }
    });

    if (afficherTotaux) {
      worksheet.getCell(currentRow, colIdx).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF4B084" },
      };
    }

    currentRow++;

    // ============== EN-TÊTE: LIGNE 4 (HEURE DE LIVRAISON) ==============
    colIdx = 1;

    worksheet.getCell(currentRow, colIdx).value = "";
    worksheet.getCell(currentRow, colIdx).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };
    colIdx++;

    worksheet.getCell(currentRow, colIdx).value = "";
    worksheet.getCell(currentRow, colIdx).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };
    colIdx++;

    worksheet.getCell(currentRow, colIdx).value = "Heure de livraison";
    worksheet.getCell(currentRow, colIdx).font = { italic: true, size: 10 };
    worksheet.getCell(currentRow, colIdx).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };
    worksheet.getCell(currentRow, colIdx).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    colIdx++;

    dates.forEach((date) => {
      const commandes = planningData.planning[date].commandes || [];

      if (commandes.length > 0) {
        commandes.forEach((cmd) => {
          const heureCell = worksheet.getCell(currentRow, colIdx);
          heureCell.value = cmd.heure || "";
          heureCell.font = { size: 9 };
          heureCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD9E1F2" },
          };
          heureCell.alignment = {
            vertical: "middle",
            horizontal: "center",
          };
          colIdx++;
        });

        if (afficherTotaux) {
          worksheet.getCell(currentRow, colIdx).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF4B084" },
          };
          colIdx++;
        }
      } else {
        worksheet.getCell(currentRow, colIdx).value = "-";
        worksheet.getCell(currentRow, colIdx).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD9E1F2" },
        };
        colIdx++;
        if (afficherTotaux) {
          worksheet.getCell(currentRow, colIdx).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF4B084" },
          };
          colIdx++;
        }
      }
    });

    if (afficherTotaux) {
      worksheet.getCell(currentRow, colIdx).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF4B084" },
      };
    }

    currentRow++;

    // ============== EN-TÊTE: LIGNE 5 (SERVICE) ==============
    colIdx = 1;

    worksheet.getCell(currentRow, colIdx).value = "";
    worksheet.getCell(currentRow, colIdx).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };
    colIdx++;

    worksheet.getCell(currentRow, colIdx).value = "";
    worksheet.getCell(currentRow, colIdx).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };
    colIdx++;

    worksheet.getCell(currentRow, colIdx).value = "Service";
    worksheet.getCell(currentRow, colIdx).font = { italic: true, size: 10 };
    worksheet.getCell(currentRow, colIdx).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };
    worksheet.getCell(currentRow, colIdx).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    colIdx++;

    dates.forEach((date) => {
      const commandes = planningData.planning[date].commandes || [];

      if (commandes.length > 0) {
        commandes.forEach((cmd) => {
          const serviceCell = worksheet.getCell(currentRow, colIdx);
          serviceCell.value = cmd.service || "Sans";
          serviceCell.font = { size: 9 };
          serviceCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD9E1F2" },
          };
          serviceCell.alignment = {
            vertical: "middle",
            horizontal: "center",
          };
          colIdx++;
        });

        if (afficherTotaux) {
          worksheet.getCell(currentRow, colIdx).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF4B084" },
          };
          colIdx++;
        }
      } else {
        worksheet.getCell(currentRow, colIdx).value = "-";
        worksheet.getCell(currentRow, colIdx).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD9E1F2" },
        };
        colIdx++;
        if (afficherTotaux) {
          worksheet.getCell(currentRow, colIdx).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF4B084" },
          };
          colIdx++;
        }
      }
    });

    if (afficherTotaux) {
      worksheet.getCell(currentRow, colIdx).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF4B084" },
      };
    }

    currentRow++;

    // ============== EN-TÊTE: LIGNE 6 (NOTES) ==============
    colIdx = 1;

    worksheet.getCell(currentRow, colIdx).value = "";
    worksheet.getCell(currentRow, colIdx).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };
    colIdx++;

    worksheet.getCell(currentRow, colIdx).value = "";
    worksheet.getCell(currentRow, colIdx).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };
    colIdx++;

    worksheet.getCell(currentRow, colIdx).value = "Notes";
    worksheet.getCell(currentRow, colIdx).font = { italic: true, size: 10 };
    worksheet.getCell(currentRow, colIdx).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };
    worksheet.getCell(currentRow, colIdx).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    colIdx++;

    dates.forEach((date) => {
      const commandes = planningData.planning[date].commandes || [];

      if (commandes.length > 0) {
        commandes.forEach((cmd) => {
          const notesCell = worksheet.getCell(currentRow, colIdx);
          notesCell.value = cmd.notes && cmd.notes.trim() ? "Voir notes" : "";
          notesCell.font = { size: 9 };
          notesCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD9E1F2" },
          };
          notesCell.alignment = {
            vertical: "middle",
            horizontal: "center",
          };
          colIdx++;
        });

        if (afficherTotaux) {
          worksheet.getCell(currentRow, colIdx).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF4B084" },
          };
          colIdx++;
        }
      } else {
        worksheet.getCell(currentRow, colIdx).value = "-";
        worksheet.getCell(currentRow, colIdx).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD9E1F2" },
        };
        colIdx++;
        if (afficherTotaux) {
          worksheet.getCell(currentRow, colIdx).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF4B084" },
          };
          colIdx++;
        }
      }
    });

    if (afficherTotaux) {
      worksheet.getCell(currentRow, colIdx).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF4B084" },
      };
    }
    currentRow++;

    // ============== LIGNES DE PRODUITS PAR TYPE ET CATÉGORIE ==============
    for (const typeGroupe in produitsByType) {
      const categories = produitsByType[typeGroupe];

      if (Object.keys(categories).length === 0) continue;

      // Calculer le nombre total de produits dans ce TYPE
      let totalProduitsType = 0;
      for (const categorie in categories) {
        totalProduitsType += Object.keys(categories[categorie]).length;
      }

      const startRowType = currentRow;
      let isFirstRowOfType = true;

      // Pour chaque CATÉGORIE
      for (const categorie in categories) {
        const produits = categories[categorie];
        const nbProduitsCategorie = Object.keys(produits).length;

        let isFirstRowOfCategorie = true;

        // Pour chaque PRODUIT
        for (const produitId in produits) {
          const produit = produits[produitId];

          colIdx = 1;

          // COLONNE TYPE (fusionnée verticalement)
          if (isFirstRowOfType) {
            const typeCell = worksheet.getCell(currentRow, colIdx);
            typeCell.value = typeGroupe.toUpperCase();
            typeCell.font = {
              bold: true,
              size: 12,
              color: { argb: "FFFFFFFF" },
            };
            typeCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: {
                argb: typeGroupe === "Sucré" ? "FFF4A460" : "FFFF8C42",
              },
            };
            typeCell.alignment = { vertical: "middle", horizontal: "center" };

            // Bordures épaisses autour de la section TYPE
            typeCell.border = {
              top: { style: "thick", color: { argb: "FF000000" } },
              left: { style: "thick", color: { argb: "FF000000" } },
              bottom: { style: "thick", color: { argb: "FF000000" } },
              right: { style: "medium", color: { argb: "FF000000" } },
            };

            worksheet.mergeCells(
              currentRow,
              colIdx,
              currentRow + totalProduitsType - 1,
              colIdx,
            );
            isFirstRowOfType = false;
          }
          colIdx++;

          // COLONNE CATÉGORIE (fusionnée verticalement)
          if (isFirstRowOfCategorie) {
            const catCell = worksheet.getCell(currentRow, colIdx);
            catCell.value = categorie;
            catCell.font = { bold: true, color: { argb: "FFF5C842" } };
            catCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF6B4233" },
            };
            catCell.alignment = { vertical: "middle", horizontal: "center" };

            // Bordure épaisse à gauche et à droite
            catCell.border = {
              top:
                currentRow === startRowType
                  ? { style: "thick", color: { argb: "FF000000" } }
                  : { style: "thin", color: { argb: "FF000000" } },
              left: { style: "medium", color: { argb: "FF000000" } },
              bottom: { style: "medium", color: { argb: "FF000000" } },
              right: { style: "medium", color: { argb: "FF000000" } },
            };

            worksheet.mergeCells(
              currentRow,
              colIdx,
              currentRow + nbProduitsCategorie - 1,
              colIdx,
            );
            isFirstRowOfCategorie = false;
          }
          colIdx++;

          // COLONNE PRODUIT
          const produitCell = worksheet.getCell(currentRow, colIdx);
          produitCell.value = `${produit.nom}`;
          produitCell.font = { bold: true };
          produitCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFF2CC" },
          };
          produitCell.alignment = {
            vertical: "middle",
            horizontal: "left",
            wrapText: true,
          };

          // Bordures pour les produits
          produitCell.border = {
            top:
              currentRow === startRowType
                ? { style: "thick", color: { argb: "FF000000" } }
                : { style: "thin", color: { argb: "FF000000" } },
            left: { style: "medium", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
          };

          colIdx++;

          let totalGeneral = 0;

          // Pour chaque date
          dates.forEach((date) => {
            const commandes = planningData.planning[date].commandes || [];
            let totalJour = 0;

            if (commandes.length > 0) {
              commandes.forEach((cmd) => {
                const produitData = cmd.produits[produitId];

                if (produitData) {
                  const qte = produitData.quantite || 0;
                  totalJour += qte;
                  totalGeneral += qte;

                  const qteCell = worksheet.getCell(currentRow, colIdx);
                  qteCell.value = formatNumber(qte);
                  qteCell.font = { bold: true };
                  qteCell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: {
                      argb:
                        produitData.source === "formule"
                          ? "FFE8F5E9"
                          : "FFFFF3E0",
                    },
                  };
                  qteCell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                  };
                  qteCell.border = {
                    top:
                      currentRow === startRowType
                        ? { style: "thick", color: { argb: "FF000000" } }
                        : { style: "thin", color: { argb: "FF000000" } },
                    left: { style: "thin", color: { argb: "FF000000" } },
                    bottom: { style: "thin", color: { argb: "FF000000" } },
                    right: { style: "thin", color: { argb: "FF000000" } },
                  };
                } else {
                  const emptyCell = worksheet.getCell(currentRow, colIdx);
                  emptyCell.value = "-";
                  emptyCell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFF9F9F9" },
                  };
                  emptyCell.font = { color: { argb: "FF999999" } };
                  emptyCell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                  };
                  emptyCell.border = {
                    top:
                      currentRow === startRowType
                        ? { style: "thick", color: { argb: "FF000000" } }
                        : { style: "thin", color: { argb: "FF000000" } },
                    left: { style: "thin", color: { argb: "FF000000" } },
                    bottom: { style: "thin", color: { argb: "FF000000" } },
                    right: { style: "thin", color: { argb: "FF000000" } },
                  };
                }

                colIdx++;
              });

              if (afficherTotaux) {
                const totalJourCell = worksheet.getCell(currentRow, colIdx);
                totalJourCell.value =
                  totalJour > 0 ? formatNumber(totalJour) : "-";
                totalJourCell.font = { bold: true };
                totalJourCell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFFFE699" },
                };
                totalJourCell.alignment = {
                  vertical: "middle",
                  horizontal: "center",
                };
                totalJourCell.border = {
                  top:
                    currentRow === startRowType
                      ? { style: "thick", color: { argb: "FF000000" } }
                      : { style: "thin", color: { argb: "FF000000" } },
                  left: { style: "medium", color: { argb: "FF000000" } },
                  bottom: { style: "thin", color: { argb: "FF000000" } },
                  right: { style: "thin", color: { argb: "FF000000" } },
                };
                colIdx++;
              }
            } else {
              const emptyCell = worksheet.getCell(currentRow, colIdx);
              emptyCell.value = "-";
              emptyCell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFF9F9F9" },
              };
              emptyCell.font = { color: { argb: "FF999999" } };
              emptyCell.alignment = {
                vertical: "middle",
                horizontal: "center",
              };
              emptyCell.border = {
                top:
                  currentRow === startRowType
                    ? { style: "thick", color: { argb: "FF000000" } }
                    : { style: "thin", color: { argb: "FF000000" } },
                left: { style: "thin", color: { argb: "FF000000" } },
                bottom: { style: "thin", color: { argb: "FF000000" } },
                right: { style: "thin", color: { argb: "FF000000" } },
              };
              colIdx++;

              if (afficherTotaux) {
                const emptyTotalCell = worksheet.getCell(currentRow, colIdx);
                emptyTotalCell.value = "-";
                emptyTotalCell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFF9F9F9" },
                };
                emptyTotalCell.border = {
                  top:
                    currentRow === startRowType
                      ? { style: "thick", color: { argb: "FF000000" } }
                      : { style: "thin", color: { argb: "FF000000" } },
                  left: { style: "medium", color: { argb: "FF000000" } },
                  bottom: { style: "thin", color: { argb: "FF000000" } },
                  right: { style: "thin", color: { argb: "FF000000" } },
                };
                colIdx++;
              }
            }
          });

          // TOTAL GÉNÉRAL
          if (afficherTotaux) {
            const totalGenCell = worksheet.getCell(currentRow, colIdx);
            totalGenCell.value =
              totalGeneral > 0
                ? `${formatNumber(totalGeneral)} ${produit.unite || ""}`
                : "-";
            totalGenCell.font = { bold: true, size: 11 };
            totalGenCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF8CBAD" },
            };
            totalGenCell.alignment = {
              vertical: "middle",
              horizontal: "center",
            };
            totalGenCell.border = {
              top:
                currentRow === startRowType
                  ? { style: "thick", color: { argb: "FF000000" } }
                  : { style: "thin", color: { argb: "FF000000" } },
              left: { style: "medium", color: { argb: "FF000000" } },
              bottom: { style: "thin", color: { argb: "FF000000" } },
              right: { style: "thick", color: { argb: "FF000000" } },
            };
          }

          currentRow++;
        }
      }

      // Appliquer la bordure épaisse en bas de la dernière ligne du type
      const lastRow = currentRow - 1;
      for (let col = 1; col <= colIdx; col++) {
        const cell = worksheet.getCell(lastRow, col);
        if (!cell.border) {
          cell.border = {};
        }
        cell.border.bottom = { style: "thick", color: { argb: "FF000000" } };
      }
    }

    // Ajuster les largeurs de colonnes
    worksheet.getColumn(1).width = 15;
    worksheet.getColumn(2).width = 20;
    worksheet.getColumn(3).width = 30;
    for (let i = 4; i <= 50; i++) {
      worksheet.getColumn(i).width = 12;
    }

    // Générer le fichier
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const filename = `planning_production_${planningData.periode.debut}_to_${planningData.periode.fin}.xlsx`;

    // Télécharger
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    console.log("✅ Export Excel généré avec couleurs:", filename);
  } catch (error) {
    console.error("❌ Erreur lors de l'export Excel:", error);
    alert(
      "⚠️ Une erreur est survenue lors de l'export Excel: " + error.message,
    );
  }
}

// ===========================================
// ORGANISER LES PRODUITS PAR TYPE ET CATÉGORIE (POUR EXCEL)
// ===========================================
function organizeProduitsByType(data) {
  const result = {
    Sucré: {},
    Salé: {},
  };

  // Parcourir tous les jours
  for (const date in data.planning) {
    const totaux = data.planning[date].totaux;

    // Parcourir tous les produits dans les totaux
    for (const produitId in totaux) {
      const produit = totaux[produitId];
      const categorie = produit.categorie || "Autre";
      const type = produit.type || "Autre";

      // Déterminer le groupe (Sucré ou Salé)
      let groupe = "Autre";
      if (type.toLowerCase().includes("sucr")) {
        groupe = "Sucré";
      } else if (type.toLowerCase().includes("sal")) {
        groupe = "Salé";
      }

      // Initialiser le groupe si nécessaire
      if (!result[groupe]) {
        result[groupe] = {};
      }

      // Initialiser la catégorie si elle n'existe pas
      if (!result[groupe][categorie]) {
        result[groupe][categorie] = {};
      }

      // Ajouter le produit (une seule fois par ID)
      if (!result[groupe][categorie][produitId]) {
        result[groupe][categorie][produitId] = {
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
