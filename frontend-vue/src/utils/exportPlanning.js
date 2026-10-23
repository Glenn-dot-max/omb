// Export Excel du planning de production (pour la cuisine).
// remplirFeuille() construit la feuille, sans navigateur : testée à part.
// exporterPlanning() charge ExcelJS seulement au clic (bibliothèque lourde), puis télécharge le fichier.
import {
  joursDuPlanning,
  produitsParGroupe,
  quantiteCommande,
  totalJour,
  totalGeneral,
  formaterDate,
  jourCourt,
  libelleSemaines,
  convives,
} from './planning'

// Couleur d'une variable du thème (theme.css) au format Excel 'FFRRGGBB' : marque blanche.
// Couleur neutre si la variable est absente (tests, autre thème incomplet).
function couleurDuTheme(variable, neutre) {
  const valeur = getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
  return /^#[0-9a-f]{6}$/i.test(valeur) ? `FF${valeur.slice(1).toUpperCase()}` : neutre
}
export function couleursDuTheme() {
  return {
    entete: couleurDuTheme('--color-brand', 'FF444444'),
    sousEntete: couleurDuTheme('--color-bg-cream', 'FFF2F2F2'),
    groupe: couleurDuTheme('--color-brand-light', 'FF666666'),
    categorie: couleurDuTheme('--color-border-warm', 'FFDDDDDD'),
    produit: couleurDuTheme('--color-bg-warm', 'FFFAFAFA'),
    supplement: couleurDuTheme('--color-accent', 'FFCCCCCC'),
    totalJour: couleurDuTheme('--color-primary-bright', 'FFE0E0E0'),
    totalPeriode: couleurDuTheme('--color-primary-deep', 'FFC8C8C8'),
  }
}
// Couleurs « métier », pas de marque : alerte des notes
const ROUGE_NOTE = 'FFD32F2F'
const BLANC = 'FFFFFFFF'

const fond = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const trait = (style) => ({ style, color: { argb: 'FF000000' } })
const centre = { vertical: 'middle', horizontal: 'center', wrapText: true }
const COLONNES_FIXES = 3 // Type, Catégorie, Produit

export function nomFichierPlanning(periode, categorie = 'tous') {
  const suffixe = categorie && categorie !== 'tous' ? `_${categorie}` : ''
  return `planning_production_${periode.debut}_au_${periode.fin}${suffixe}.xlsx`
}

// Remplit la feuille ExcelJS avec le planning (réponse de GET /planning/production)
export function remplirFeuille(feuille, resultat, options = {}) {
  const { afficherTotaux = true, couleurs = couleursDuTheme() } = options
  const jours = joursDuPlanning(resultat.planning)
  const groupes = produitsParGroupe(resultat.planning)
  const colonnesDuJour = (jour) => Math.max(jour.commandes.length, 1) + (afficherTotaux ? 1 : 0)
  const derniereColonne =
    COLONNES_FIXES +
    jours.reduce((total, jour) => total + colonnesDuJour(jour), 0) +
    (afficherTotaux ? 1 : 0)

  // ---------- Titre, semaine(s), nombre de commandes ----------
  const { debut, fin } = resultat.periode
  feuille.mergeCells(1, 1, 1, derniereColonne)
  const titre = feuille.getCell(1, 1)
  titre.value = `Planning de production du ${formaterDate(debut)} au ${formaterDate(fin)}`
  titre.font = { bold: true, size: 16, color: { argb: BLANC } }
  titre.fill = fond(couleurs.entete)
  titre.alignment = centre
  feuille.getRow(1).height = 30
  feuille.mergeCells(2, 1, 2, derniereColonne)
  const semaine = feuille.getCell(2, 1)
  semaine.value = `${libelleSemaines(debut, fin)} · ${resultat.commandes_count} commande(s)`
  semaine.font = { bold: true, size: 13 }
  semaine.alignment = centre

  // ---------- En-têtes : une ligne par information sur les commandes ----------
  const LIGNE_DATES = 4
  const lignesCommande = [
    ['Client', (c) => c.client],
    // Mariage : « 50/10 » (adultes/enfants), sinon le nombre de couverts
    ['Couverts (mariage : adultes/enfants)', (c) => convives(c) || c.couverts || ''],
    ['Heure de livraison', (c) => (c.heure || '').slice(0, 5)],
    ['Service', (c) => (c.avec_service ? 'Avec' : 'Sans')],
    ['Notes', (c) => (c.notes && c.notes.trim() ? 'VOIR NOTES' : '')],
  ]
  ;['Type', 'Catégorie', 'Produit'].forEach((texte, i) => {
    const cellule = feuille.getCell(LIGNE_DATES, i + 1)
    cellule.value = texte
    cellule.font = { bold: true, color: { argb: BLANC } }
    cellule.fill = fond(couleurs.entete)
    cellule.alignment = centre
  })
  // Sous les en-têtes Type et Catégorie : une zone vide ; sous Produit : le nom de chaque ligne
  feuille.mergeCells(LIGNE_DATES + 1, 1, LIGNE_DATES + lignesCommande.length, 2)
  feuille.getCell(LIGNE_DATES + 1, 1).fill = fond(couleurs.sousEntete)
  lignesCommande.forEach(([libelle], j) => {
    const cellule = feuille.getCell(LIGNE_DATES + 1 + j, 3)
    cellule.value = libelle
    cellule.font = { italic: true, bold: j === 0 }
    cellule.fill = fond(couleurs.sousEntete)
    cellule.alignment = { vertical: 'middle', horizontal: 'right' }
  })

  let colonne = COLONNES_FIXES + 1
  for (const jour of jours) {
    const largeur = colonnesDuJour(jour)
    feuille.mergeCells(LIGNE_DATES, colonne, LIGNE_DATES, colonne + largeur - 1)
    const cellule = feuille.getCell(LIGNE_DATES, colonne)
    cellule.value = `${formaterDate(jour.date).slice(0, 5)} ${jourCourt(jour.date)}`
    cellule.font = { bold: true, color: { argb: BLANC } }
    cellule.fill = fond(couleurs.entete)
    cellule.alignment = centre

    const commandes = jour.commandes.length ? jour.commandes : [null]
    commandes.forEach((commande, i) => {
      lignesCommande.forEach(([, valeur], j) => {
        const c = feuille.getCell(LIGNE_DATES + 1 + j, colonne + i)
        c.value = commande ? valeur(commande) : '-'
        c.font = { size: 9, bold: j === 0 }
        c.fill = fond(couleurs.sousEntete)
        c.alignment = centre
        // Commande avec une note : case rouge, la cuisine va lire le bon de commande
        if (commande && j === lignesCommande.length - 1 && c.value) {
          c.fill = fond(ROUGE_NOTE)
          c.font = { size: 9, bold: true, color: { argb: BLANC } }
        }
      })
    })
    if (afficherTotaux) {
      const colonneTotal = colonne + largeur - 1
      feuille.mergeCells(
        LIGNE_DATES + 1,
        colonneTotal,
        LIGNE_DATES + lignesCommande.length,
        colonneTotal,
      )
      const total = feuille.getCell(LIGNE_DATES + 1, colonneTotal)
      total.value = `Total ${jourCourt(jour.date)}`
      total.font = { bold: true }
      total.fill = fond(couleurs.totalJour)
      total.alignment = centre
    }
    colonne += largeur
  }
  if (afficherTotaux) {
    feuille.mergeCells(
      LIGNE_DATES,
      derniereColonne,
      LIGNE_DATES + lignesCommande.length,
      derniereColonne,
    )
    const total = feuille.getCell(LIGNE_DATES, derniereColonne)
    total.value = 'Total période'
    total.font = { bold: true }
    total.fill = fond(couleurs.totalPeriode)
    total.alignment = centre
  }

  // ---------- Produits : groupe (Sucré/Salé) > catégorie > produit ----------
  const ecrireQuantite = (cellule, quantite, couleur, gras = false) => {
    if (quantite) {
      cellule.value = Math.round(quantite * 10) / 10
      cellule.numFmt = Number.isInteger(cellule.value) ? '0' : '0.0'
    } else {
      cellule.value = '-'
    }
    cellule.font = { bold: gras }
    cellule.alignment = centre
    if (couleur) cellule.fill = fond(couleur)
  }

  let ligne = LIGNE_DATES + lignesCommande.length + 1
  for (const groupe of groupes) {
    const debutGroupe = ligne
    for (const categorie of groupe.categories) {
      const debutCategorie = ligne
      for (const produit of categorie.produits) {
        const nom = feuille.getCell(ligne, 3)
        nom.value = `${produit.nom} (${produit.unite})`
        nom.font = { bold: true }
        nom.fill = fond(couleurs.produit)
        nom.alignment = { vertical: 'middle', wrapText: true }

        let col = COLONNES_FIXES + 1
        for (const jour of jours) {
          const commandes = jour.commandes.length ? jour.commandes : [null]
          for (const commande of commandes) {
            const quantite = commande ? quantiteCommande(commande, produit.id) : null
            const ajout = quantite && commande.produits[produit.id].source !== 'formule'
            ecrireQuantite(
              feuille.getCell(ligne, col++),
              quantite,
              ajout ? couleurs.supplement : null,
            )
          }
          if (afficherTotaux) {
            ecrireQuantite(
              feuille.getCell(ligne, col++),
              totalJour(jour, produit.id),
              couleurs.totalJour,
              true,
            )
          }
        }
        if (afficherTotaux) {
          ecrireQuantite(
            feuille.getCell(ligne, col),
            totalGeneral(resultat.planning, produit.id),
            couleurs.totalPeriode,
            true,
          )
        }
        // Pas de trait en haut : c'est le trait du bas de la ligne précédente qui s'affiche
        // (trait épais sous une catégorie), sans qu'un trait fin vienne le remplacer
        for (let c = 1; c <= derniereColonne; c++) {
          feuille.getCell(ligne, c).border = {
            bottom: trait('thin'),
            left: trait('thin'),
            right: trait('thin'),
          }
        }
        ligne++
      }
      // Colonne Catégorie fusionnée, et traits épais sous la catégorie, jusqu'au bout du tableau
      // (demande de la cuisine ; le trait "double" n'est pas affiché par Numbers)
      feuille.mergeCells(debutCategorie, 2, ligne - 1, 2)
      const cellule = feuille.getCell(debutCategorie, 2)
      cellule.value = categorie.nom
      cellule.font = { bold: true, size: 12 }
      cellule.fill = fond(couleurs.categorie)
      cellule.alignment = centre
      for (let c = 2; c <= derniereColonne; c++) {
        feuille.getCell(ligne - 1, c).border = {
          ...feuille.getCell(ligne - 1, c).border,
          bottom: trait('thick'),
        }
      }
    }
    // Colonne Type fusionnée, trait épais sous le groupe
    feuille.mergeCells(debutGroupe, 1, ligne - 1, 1)
    const cellule = feuille.getCell(debutGroupe, 1)
    cellule.value = groupe.groupe.toUpperCase()
    cellule.font = { bold: true, size: 12, color: { argb: BLANC } }
    cellule.fill = fond(couleurs.groupe)
    cellule.alignment = centre
    for (let c = 1; c <= derniereColonne; c++) {
      feuille.getCell(ligne - 1, c).border = {
        ...feuille.getCell(ligne - 1, c).border,
        bottom: trait('thick'),
      }
    }
  }

  // Largeurs, et en-têtes figés : ils restent visibles quand on fait défiler
  feuille.getColumn(1).width = 12
  feuille.getColumn(2).width = 20
  feuille.getColumn(3).width = 32
  for (let c = COLONNES_FIXES + 1; c <= derniereColonne; c++) feuille.getColumn(c).width = 12
  feuille.views = [
    { state: 'frozen', xSplit: COLONNES_FIXES, ySplit: LIGNE_DATES + lignesCommande.length },
  ]
  feuille.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
}

// Construit le fichier et le fait télécharger par le navigateur
export async function exporterPlanning(
  resultat,
  { afficherTotaux = true, categorie = 'tous' } = {},
) {
  const { default: ExcelJS } = await import('exceljs') // chargée seulement maintenant
  const classeur = new ExcelJS.Workbook()
  remplirFeuille(classeur.addWorksheet('Planning production'), resultat, { afficherTotaux })
  const contenu = await classeur.xlsx.writeBuffer()
  const fichier = new Blob([contenu], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const lien = document.createElement('a')
  lien.href = URL.createObjectURL(fichier)
  lien.download = nomFichierPlanning(resultat.periode, categorie)
  lien.click()
  // Libérer la mémoire un peu plus tard (tout de suite, Safari annulerait le téléchargement)
  setTimeout(() => URL.revokeObjectURL(lien.href), 1000)
}
