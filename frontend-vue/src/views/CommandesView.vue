<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/api/client'
import { useUtilisateurStore } from '@/stores/utilisateur'
import { useNotificationsStore } from '@/stores/notifications'
import { useAction } from '@/composables/useAction'
import { useConfirm } from 'primevue/useconfirm'
import { blocsDeCommandes, filtrerCommandes } from '@/utils/commandes'
import { dateIso, formaterDate } from '@/utils/planning'
import CarteCommande from '@/components/commandes/CarteCommande.vue'
import FormulaireCommande from '@/components/commandes/FormulaireCommande.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Panel from 'primevue/panel'

const utilisateur = useUtilisateurStore()
const notifications = useNotificationsStore()
const confirm = useConfirm()

const ONGLETS = [
  { valeur: 'actives', libelle: 'Commandes actives' },
  { valeur: 'archivees', libelle: 'Archivées' },
]
const onglet = ref('actives')
const commandes = ref([])
const aujourdhui = ref(dateIso(new Date())) // remplacée par la date de Paris donnée par le serveur
const chargement = ref(false)
const franchises = ref([])
const filtres = ref({ recherche: '', date: '', franchiseId: null })
const formulaireOuvert = ref(false)
const commandeAModifier = ref(null) // id de la commande ouverte en modification ; null = nouvelle

function nouvelleCommande() {
  commandeAModifier.value = null
  formulaireOuvert.value = true
}
function modifier(commande) {
  commandeAModifier.value = commande.id
  formulaireOuvert.value = true
}

const archivees = computed(() => onglet.value === 'archivees')
const commandesFiltrees = computed(() => filtrerCommandes(commandes.value, filtres.value))
const blocs = computed(() => blocsDeCommandes(commandesFiltrees.value, aujourdhui.value))
// Archivées : la plus récente d'abord
const commandesArchivees = computed(() =>
  [...commandesFiltrees.value].sort((a, b) => b.delivery_date.localeCompare(a.delivery_date)),
)

function adresseDesCommandes() {
  const franchiseId = utilisateur.estTechAdmin && filtres.value.franchiseId
  if (franchiseId) return `/admin/franchises/${franchiseId}/commandes?archived=${archivees.value}`
  return archivees.value ? '/commandes/archived' : '/commandes/'
}

async function charger() {
  chargement.value = true
  try {
    // À l'ouverture des commandes actives : archiver celles dont la date est passée.
    // Un échec ici n'empêche pas d'afficher la liste.
    if (!archivees.value) {
      try {
        await apiPost('/commandes/auto-archive', {})
      } catch {
        /* archivage reporté à la prochaine ouverture */
      }
    }
    const reponse = await apiGet(adresseDesCommandes())
    // Actives : { commandes, paris_date } ; archivées : directement la liste
    commandes.value = Array.isArray(reponse) ? reponse : reponse.commandes || []
    if (reponse.paris_date) aujourdhui.value = reponse.paris_date
  } catch (e) {
    notifications.erreur(e.message)
  } finally {
    chargement.value = false
  }
}

onMounted(async () => {
  if (utilisateur.estTechAdmin) {
    try {
      franchises.value = await apiGet('/admin/franchises')
    } catch (e) {
      notifications.erreur(e.message)
    }
  }
  await charger()
})

function changerOnglet(valeur) {
  if (!valeur || valeur === onglet.value) return // SelectButton envoie null si on reclique
  onglet.value = valeur
  filtres.value.recherche = ''
  filtres.value.date = ''
  charger()
}
function changerFranchise(id) {
  filtres.value.franchiseId = id
  charger()
}
function reinitialiser() {
  filtres.value = { recherche: '', date: '', franchiseId: null }
  charger()
}

const { executer: valider } = useAction(async (commande) => {
  try {
    await apiPatch(`/commandes/${commande.id}/validate`)
    notifications.succes('✅ Commande validée')
    await charger()
  } catch (e) {
    notifications.erreur(e.message)
  }
})

const { executer: supprimer } = useAction(async (commande) => {
  try {
    await apiDelete(`/commandes/${commande.id}`)
    notifications.succes('✅ Commande supprimée')
    await charger()
  } catch (e) {
    notifications.erreur(e.message)
  }
})
function demanderSuppression(commande) {
  confirm.require({
    header: 'Supprimer la commande',
    message: `Supprimer définitivement la commande de « ${commande.nom_client} » du ${formaterDate(commande.delivery_date.slice(0, 10))} ?`,
    acceptProps: { label: 'Supprimer', severity: 'danger' },
    rejectProps: { label: 'Annuler', severity: 'secondary', outlined: true },
    accept: () => supprimer(commande),
  })
}

const periode = (bloc) =>
  bloc.fin
    ? `du ${formaterDate(bloc.debut)} au ${formaterDate(bloc.fin)}`
    : `à partir du ${formaterDate(bloc.debut)}`
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`
</script>

<template>
  <main class="container">
    <div class="entete-page">
      <h2>📦 Commandes</h2>
      <Button label="Nouvelle commande" data-test="nouvelle-commande" @click="nouvelleCommande" />
    </div>
    <FormulaireCommande
      v-model:visible="formulaireOuvert"
      :aujourdhui="aujourdhui"
      :commande-id="commandeAModifier"
      @enregistree="charger"
    />
    <div class="form-card">
      <SelectButton
        :model-value="onglet"
        :options="ONGLETS"
        option-label="libelle"
        option-value="valeur"
        aria-label="Commandes actives ou archivées"
        @update:model-value="changerOnglet"
      />
      <div class="filtres">
        <div class="champ">
          <label for="commandes-recherche">Client</label>
          <InputText
            id="commandes-recherche"
            v-model="filtres.recherche"
            placeholder="Rechercher un client…"
          />
        </div>
        <div class="champ">
          <label for="commandes-date">Date de livraison</label>
          <InputText id="commandes-date" v-model="filtres.date" type="date" />
        </div>
        <div v-if="utilisateur.estTechAdmin" class="champ">
          <label for="commandes-franchise">Franchise</label>
          <Select
            :model-value="filtres.franchiseId"
            :options="franchises"
            option-label="nom"
            option-value="id"
            placeholder="Toutes les franchises"
            show-clear
            input-id="commandes-franchise"
            @update:model-value="changerFranchise"
          />
        </div>
        <div class="boutons">
          <Button
            type="button"
            label="Réinitialiser"
            severity="secondary"
            outlined
            @click="reinitialiser"
          />
        </div>
      </div>
      <p class="compteur">{{ pluriel(commandesFiltrees.length, 'commande') }}</p>
    </div>

    <p v-if="chargement" class="vide">Chargement…</p>
    <p v-else-if="!commandesFiltrees.length" class="vide">Aucune commande.</p>

    <template v-else-if="!archivees">
      <Panel
        v-for="bloc in blocs"
        :key="bloc.cle"
        toggleable
        :collapsed="bloc.cle === 'plusTard'"
        class="bloc"
        :data-bloc="bloc.cle"
      >
        <template #header>
          <div class="entete-bloc">
            <h3>{{ bloc.titre }}</h3>
            <span class="details-bloc">
              {{ periode(bloc) }} · {{ pluriel(bloc.commandes.length, 'commande') }} ·
              {{ pluriel(bloc.couverts, 'couvert') }}
            </span>
          </div>
        </template>
        <div class="grille">
          <CarteCommande
            v-for="commande in bloc.commandes"
            :key="commande.id"
            :commande="commande"
            :aujourdhui="aujourdhui"
            @modifier="modifier"
            @valider="valider"
            @supprimer="demanderSuppression"
          />
        </div>
      </Panel>
    </template>

    <div v-else class="grille">
      <CarteCommande
        v-for="commande in commandesArchivees"
        :key="commande.id"
        :commande="commande"
        :aujourdhui="aujourdhui"
        archivee
      />
    </div>
  </main>
</template>

<style scoped>
.entete-page {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.filtres {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  align-items: end;
  margin-top: 16px;
}
.compteur {
  margin: 12px 0 0;
  opacity: 0.8;
}
.vide {
  text-align: center;
  opacity: 0.7;
}
.bloc {
  margin-bottom: 16px;
}
.entete-bloc h3 {
  margin: 0;
}
.details-bloc {
  font-size: 0.9rem;
  opacity: 0.8;
}
/* Cartes sur plusieurs colonnes, une seule sur tablette portrait */
.grille {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}
@media (max-width: 768px) {
  .grille {
    grid-template-columns: 1fr;
  }
}
</style>
