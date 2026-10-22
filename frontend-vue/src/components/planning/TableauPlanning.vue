<script setup>
import { computed } from 'vue'
import {
  joursDuPlanning,
  produitsParGroupe,
  quantiteCommande,
  totalJour,
  totalGeneral,
  formaterDate,
  formaterQuantite,
  jourCourt,
} from '@/utils/planning'

// Tableau de production : une ligne par produit, une colonne par commande (regroupées par jour),
// avec les totaux par jour et sur la période si demandé. Les calculs viennent de utils/planning.js.
const props = defineProps({
  planning: { type: Object, required: true },
  afficherTotaux: { type: Boolean, default: true },
})

const jours = computed(() => joursDuPlanning(props.planning))
const groupes = computed(() => produitsParGroupe(props.planning))

// Colonnes d'un jour : une par commande (au moins une), + le total du jour
const colonnesDuJour = (jour) => Math.max(jour.commandes.length, 1) + (props.afficherTotaux ? 1 : 0)
const nombreDeColonnes = computed(
  () =>
    1 +
    jours.value.reduce((total, jour) => total + colonnesDuJour(jour), 0) +
    (props.afficherTotaux ? 1 : 0),
)

const jourMois = (iso) => formaterDate(iso).slice(0, 5) // 'JJ/MM'
const heureCourte = (heure) => (heure || '').slice(0, 5) // 'HH:MM:SS' -> 'HH:MM'
const afficher = (quantite) => (quantite ? formaterQuantite(quantite) : '-')
</script>

<template>
  <!-- Légende : d'où vient chaque quantité -->
  <ul class="legende">
    <li><span class="pastille pastille-formule"></span> Produit d'une formule</li>
    <li>
      <span class="pastille pastille-supplement"></span> Produit ajouté à la commande (hors formule,
      ou en plus de la formule)
    </li>
    <li v-if="afficherTotaux"><span class="pastille pastille-total"></span> Totaux</li>
  </ul>
  <div class="tableau-defilable">
    <table class="tableau-planning">
      <thead>
        <tr>
          <th rowspan="2" class="colonne-produit">Produit</th>
          <th
            v-for="jour in jours"
            :key="jour.date"
            :colspan="colonnesDuJour(jour)"
            class="entete-jour"
          >
            {{ jourMois(jour.date) }}<br />{{ jourCourt(jour.date) }}
          </th>
          <th v-if="afficherTotaux" rowspan="2" class="total-general">Total<br />période</th>
        </tr>
        <tr>
          <template v-for="jour in jours" :key="jour.date">
            <th v-for="commande in jour.commandes" :key="commande.id" class="entete-commande">
              {{ commande.client }}<br /><span class="heure">{{
                heureCourte(commande.heure)
              }}</span>
            </th>
            <th v-if="!jour.commandes.length" class="entete-commande">-</th>
            <th v-if="afficherTotaux" class="total-jour">Total {{ jourCourt(jour.date) }}</th>
          </template>
        </tr>
      </thead>
      <tbody v-for="groupe in groupes" :key="groupe.groupe">
        <tr class="ligne-groupe">
          <th :colspan="nombreDeColonnes">{{ groupe.groupe }}</th>
        </tr>
        <template v-for="categorie in groupe.categories" :key="categorie.nom">
          <tr class="ligne-categorie">
            <th :colspan="nombreDeColonnes">{{ categorie.nom }}</th>
          </tr>
          <tr v-for="produit in categorie.produits" :key="produit.id" :data-produit="produit.id">
            <th scope="row" class="colonne-produit">
              {{ produit.nom }} <span class="unite">({{ produit.unite }})</span>
            </th>
            <template v-for="jour in jours" :key="jour.date">
              <td
                v-for="commande in jour.commandes"
                :key="commande.id"
                :class="{
                  vide: !quantiteCommande(commande, produit.id),
                  supplement: commande.produits?.[produit.id]?.source !== 'formule',
                }"
              >
                {{ afficher(quantiteCommande(commande, produit.id)) }}
              </td>
              <td v-if="!jour.commandes.length" class="vide">-</td>
              <td v-if="afficherTotaux" class="total-jour">
                {{ afficher(totalJour(jour, produit.id)) }}
              </td>
            </template>
            <td v-if="afficherTotaux" class="total-general">
              {{ afficher(totalGeneral(planning, produit.id)) }}
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* Le tableau peut être très large (une colonne par commande) : il défile seul, la page non */
.tableau-defilable {
  overflow-x: auto;
  border: 1px solid var(--color-border-warm);
  border-radius: 8px;
}
.tableau-planning {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.9rem;
}
th,
td {
  border: 1px solid var(--color-border-warm);
  padding: 6px 8px;
  text-align: center;
  white-space: nowrap;
}
/* Colonne des produits toujours visible quand on fait défiler vers la droite */
.colonne-produit {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--color-bg-warm);
  text-align: left;
  min-width: 180px;
  white-space: normal;
}
.entete-jour {
  background: var(--color-brand);
  color: var(--color-bg-cream);
}
.entete-commande {
  background: var(--color-bg-cream);
  font-weight: 600;
  font-size: 0.8rem;
  white-space: normal;
  min-width: 70px;
}
.heure,
.unite {
  font-weight: normal;
  opacity: 0.7;
}
.ligne-groupe th {
  background: var(--color-brand-light);
  color: var(--color-bg-cream);
  text-align: left;
  font-size: 1rem;
}
/* Sous-catégories bien séparées (demande de la cuisine) */
.ligne-categorie th {
  background: var(--color-bg-cream-2);
  text-align: left;
  font-weight: 700;
  border-top: 3px double var(--color-brand);
}
td.supplement:not(.vide),
.pastille-supplement {
  background: rgba(var(--color-accent-rgb), 0.45);
}
.legende {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
  font-size: 0.85rem;
}
.legende li {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pastille {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 1px solid var(--color-border-warm);
  border-radius: 3px;
}
td.vide {
  opacity: 0.4;
}
.total-jour,
.pastille-total {
  background: rgba(var(--color-primary-rgb), 0.25);
  font-weight: 700;
}
.total-general {
  background: rgba(var(--color-primary-rgb), 0.5);
  font-weight: 700;
}
</style>
