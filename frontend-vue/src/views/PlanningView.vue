<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiGet } from '@/api/client'
import { useUtilisateurStore } from '@/stores/utilisateur'
import { useNotificationsStore } from '@/stores/notifications'
import { useAction } from '@/composables/useAction'
import { dateIso, formaterDate, libelleSemaines } from '@/utils/planning'
import { exporterPlanning } from '@/utils/exportPlanning'
import TableauPlanning from '@/components/planning/TableauPlanning.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import MultiSelect from 'primevue/multiselect'
import Select from 'primevue/select'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'

const utilisateur = useUtilisateurStore()
const notifications = useNotificationsStore()

// Valeurs attendues par le serveur (GET /planning/production)
const TYPES_PRESTATION = [
  { valeur: 'brunch', libelle: 'Brunch' },
  { valeur: 'non-brunch', libelle: 'Non-Brunch' },
  { valeur: 'pause petit déjeuner', libelle: 'Pause petit déjeuner' },
  { valeur: 'mariage', libelle: 'Mariage' },
  { valeur: 'NC', libelle: 'Non classé' },
]
const CATEGORIES = [
  { valeur: 'tous', libelle: 'Tous les produits' },
  { valeur: 'sucré', libelle: 'Produits sucrés' },
  { valeur: 'salé', libelle: 'Produits salés' },
]

// Par défaut : d'aujourd'hui à dans 7 jours
const dansSeptJours = new Date()
dansSeptJours.setDate(dansSeptJours.getDate() + 7)
const filtres = ref({
  debut: dateIso(new Date()),
  fin: dateIso(dansSeptJours),
  types: [], // aucun choisi = toutes
  categorie: 'tous',
  franchiseId: null, // TECH_ADMIN seulement ; null = toutes
  afficherTotaux: true,
})

// Aucun type coché ou tous cochés : « toutes » (le serveur garde aussi les commandes sans type)
const tousLesTypes = computed(
  () => !filtres.value.types.length || filtres.value.types.length === TYPES_PRESTATION.length,
)
function cocherTousLesTypes(coche) {
  filtres.value.types = coche ? TYPES_PRESTATION.map((t) => t.valeur) : []
}

const franchises = ref([])
const resultat = ref(null)

onMounted(async () => {
  if (!utilisateur.estTechAdmin) return
  try {
    franchises.value = await apiGet('/admin/franchises')
  } catch (e) {
    notifications.erreur(e.message)
  }
})

function adresseDuPlanning() {
  const f = filtres.value
  const parametres = new URLSearchParams({
    date_debut: f.debut,
    date_fin: f.fin,
    type_prestation: tousLesTypes.value ? 'toutes' : f.types.join(','),
    categorie: f.categorie,
  })
  // franchise_id (et non « franchise » comme l'ancienne page, que le serveur ignorait)
  if (utilisateur.estTechAdmin && f.franchiseId) parametres.set('franchise_id', f.franchiseId)
  return `/planning/production?${parametres}`
}

const { executer: generer, enCours } = useAction(async () => {
  const { debut, fin } = filtres.value
  if (!debut || !fin) {
    notifications.erreur('Choisissez une date de début et une date de fin')
    return
  }
  // Dates 'AAAA-MM-JJ' : l'ordre alphabétique est l'ordre chronologique
  if (debut > fin) {
    notifications.erreur('La date de début doit être avant la date de fin')
    return
  }
  try {
    resultat.value = await apiGet(adresseDuPlanning())
  } catch (e) {
    notifications.erreur(e.message)
  }
})

// Export Excel du planning affiché (mêmes filtres que la génération)
const { executer: exporter, enCours: exportEnCours } = useAction(async () => {
  try {
    // Bouton bloqué au moins 1 seconde : l'export est si rapide qu'un double-clic
    // en lancerait deux sans cette pause
    await Promise.all([
      exporterPlanning(resultat.value, {
        afficherTotaux: filtres.value.afficherTotaux,
        categorie: filtres.value.categorie,
      }),
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ])
  } catch (e) {
    notifications.erreur(`Export Excel impossible : ${e.message}`)
  }
})

const aDesCommandes = computed(() => Object.keys(resultat.value?.planning || {}).length > 0)
const commandesNonValidees = computed(() => resultat.value?.commandes_non_validees || [])
</script>

<template>
  <main class="container">
    <h2>📊 Planning de production</h2>

    <div class="form-card">
      <form class="filtres" @submit.prevent="generer">
        <div class="champ">
          <label for="planning-debut">Date de début</label>
          <InputText id="planning-debut" v-model="filtres.debut" type="date" />
        </div>
        <div class="champ">
          <label for="planning-fin">Date de fin</label>
          <InputText id="planning-fin" v-model="filtres.fin" type="date" />
        </div>
        <div class="champ">
          <label for="planning-types">Type de prestation</label>
          <MultiSelect
            v-model="filtres.types"
            :options="TYPES_PRESTATION"
            option-label="libelle"
            option-value="valeur"
            placeholder="Tous les types"
            :show-toggle-all="false"
            input-id="planning-types"
            display="chip"
          >
            <!-- Case « Tous les types » en tête de liste (celle de PrimeVue n'a pas de libellé) -->
            <template #header>
              <div class="tous-les-types">
                <Checkbox
                  :model-value="filtres.types.length === TYPES_PRESTATION.length"
                  input-id="planning-types-tous"
                  binary
                  @update:model-value="cocherTousLesTypes"
                />
                <label for="planning-types-tous">Tous les types</label>
              </div>
            </template>
          </MultiSelect>
        </div>
        <div class="champ">
          <label for="planning-categorie">Catégorie produit</label>
          <Select
            v-model="filtres.categorie"
            :options="CATEGORIES"
            option-label="libelle"
            option-value="valeur"
            input-id="planning-categorie"
          />
        </div>
        <div v-if="utilisateur.estTechAdmin" class="champ">
          <label for="planning-franchise">Franchise</label>
          <Select
            v-model="filtres.franchiseId"
            :options="franchises"
            option-label="nom"
            option-value="id"
            placeholder="Toutes les franchises"
            show-clear
            input-id="planning-franchise"
          />
        </div>
        <div class="case-a-cocher">
          <Checkbox v-model="filtres.afficherTotaux" input-id="planning-totaux" binary />
          <label for="planning-totaux">Afficher les totaux</label>
        </div>
        <div class="boutons">
          <Button type="submit" label="Générer le planning" :loading="enCours" />
        </div>
      </form>
    </div>

    <template v-if="resultat">
      <Message v-if="commandesNonValidees.length" severity="warn" class="avertissement">
        <strong>
          {{ commandesNonValidees.length }} commande(s) non validée(s), exclue(s) de ce planning :
        </strong>
        <ul>
          <li v-for="commande in commandesNonValidees" :key="commande.id">
            {{ commande.nom_client }} : {{ formaterDate(commande.delivery_date) }} à
            {{ (commande.delivery_hour || '').slice(0, 5) }} ({{ commande.nombre_couverts }}
            couverts)
          </li>
        </ul>
      </Message>

      <div class="form-card">
        <h3>
          Planning du {{ formaterDate(resultat.periode.debut) }} au
          {{ formaterDate(resultat.periode.fin) }}
        </h3>
        <p class="resume">
          <strong>{{ libelleSemaines(resultat.periode.debut, resultat.periode.fin) }}</strong>
          · {{ resultat.commandes_count }} commande(s)
        </p>
        <div v-if="aDesCommandes" class="boutons export">
          <Button
            type="button"
            label="Exporter en Excel"
            severity="secondary"
            outlined
            :loading="exportEnCours"
            @click="exporter"
          />
        </div>
        <TableauPlanning
          v-if="aDesCommandes"
          :planning="resultat.planning"
          :afficher-totaux="filtres.afficherTotaux"
        />
        <p v-else class="aucune-commande">Aucune commande validée sur cette période.</p>
      </div>
    </template>
  </main>
</template>

<style scoped>
/* Filtres sur plusieurs colonnes, qui passent à la ligne sur tablette */
.filtres {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  align-items: end;
}
.tous-les-types {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border-warm);
  font-weight: 600;
}
.case-a-cocher {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
}
.avertissement {
  margin-bottom: 16px;
}
.avertissement ul {
  margin: 8px 0 0;
  padding-left: 20px;
}
.export {
  margin-bottom: 12px;
}
.resume {
  margin-bottom: 12px;
}
.aucune-commande {
  text-align: center;
  opacity: 0.7;
}
</style>
