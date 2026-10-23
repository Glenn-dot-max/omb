<script setup>
import { ref, computed, watch } from 'vue'
import { apiGet, apiPost, apiPut } from '@/api/client'
import { useNotificationsStore } from '@/stores/notifications'
import { useAction } from '@/composables/useAction'
import {
  commandeVide,
  erreurEtape,
  donneesPourLeServeur,
  partsProduites,
} from '@/utils/nouvelleCommande'
import {
  commandeDepuisServeur,
  modificationPourLeServeur,
  copieDeCommande,
} from '@/utils/modificationCommande'
import { pourMaFranchise } from '@/utils/contenuCommande'
import { useUtilisateurStore } from '@/stores/utilisateur'
import EcranInfos from '@/components/commandes/EcranInfos.vue'
import EcranContenu from '@/components/commandes/EcranContenu.vue'
import EcranRecap from '@/components/commandes/EcranRecap.vue'
import HistoriqueCommande from '@/components/commandes/HistoriqueCommande.vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Stepper from 'primevue/stepper'
import StepList from 'primevue/steplist'
import Step from 'primevue/step'
import StepPanels from 'primevue/steppanels'
import StepPanel from 'primevue/steppanel'

// Commande en 3 écrans : 1. infos et service · 2. formules et produits · 3. récapitulatif.
// Sans commandeId : nouvelle commande. Avec : la commande est chargée puis modifiée (V5.4c2b),
// et seuls les changements sont envoyés au serveur. Avec commandeId et copie : duplication,
// la commande chargée sert de modèle à une NOUVELLE commande (V5.4c3).
// On ne quitte que par le bouton « Quitter » (ni clic à côté, ni touche Échap, ni croix) :
// si quelque chose a été saisi, on propose de continuer, de quitter sans enregistrer,
// ou de mettre la commande en attente.
const visible = defineModel('visible', { type: Boolean, default: false })
const props = defineProps({
  aujourdhui: { type: String, required: true },
  commandeId: { type: String, default: null },
  copie: { type: Boolean, default: false },
})
const emit = defineEmits(['enregistree'])

const notifications = useNotificationsStore()
const utilisateur = useUtilisateurStore()

const modification = computed(() => !!props.commandeId && !props.copie)
const titre = computed(() => {
  if (props.copie) return 'Dupliquer la commande'
  return modification.value ? 'Modifier la commande' : 'Nouvelle commande'
})
const commande = ref(commandeVide(props.aujourdhui))
const etape = ref('1')
const chargement = ref(false)
// La commande telle qu'elle était à l'ouverture : pour savoir ce qui a changé
let origine = commandeVide(props.aujourdhui)

// À chaque ouverture, premier écran : formulaire vide, ou commande chargée
watch(visible, async (ouvert) => {
  if (!ouvert) return
  etape.value = '1'
  if (!props.commandeId) {
    origine = commandeVide(props.aujourdhui)
    commande.value = commandeVide(props.aujourdhui)
    return
  }
  chargement.value = true
  try {
    const id = props.commandeId
    const [ligne, formules, produits, catalogueFormules, catalogueProduits] = await Promise.all([
      apiGet(`/commandes/${id}`),
      apiGet(`/commande-formules/commande/${id}`),
      apiGet(`/commande-produits/commande/${id}`),
      apiGet('/formules/'),
      apiGet('/produits/'),
    ])
    const noms = Object.fromEntries(
      [...catalogueFormules, ...catalogueProduits].map((e) => [e.id, e.name]),
    )
    if (props.copie) {
      // Seulement ce qui est encore au catalogue de la franchise
      const maFranchise = utilisateur.utilisateur?.franchise_id
      const disponibles = new Set(
        [
          ...pourMaFranchise(catalogueFormules, maFranchise),
          ...pourMaFranchise(catalogueProduits, maFranchise),
        ].map((e) => e.id),
      )
      const { commande: copie, nonCopies } = copieDeCommande(
        commandeDepuisServeur(ligne, formules, produits, noms),
        props.aujourdhui,
        disponibles,
      )
      // Deux objets séparés (structuredClone = copie complète) : modifier le formulaire
      // ne doit pas changer l'origine
      origine = copie
      commande.value = structuredClone(copie)
      if (nonCopies)
        notifications.avertissement(
          `${nonCopies} formule ou produit de la commande d'origine n'est plus disponible : pas copié.`,
        )
    } else {
      // Deux copies séparées : modifier le formulaire ne doit pas changer l'origine
      origine = commandeDepuisServeur(ligne, formules, produits, noms)
      commande.value = commandeDepuisServeur(ligne, formules, produits, noms)
    }
  } catch (e) {
    notifications.erreur(e.message)
    visible.value = false
  } finally {
    chargement.value = false
  }
})

function suivant() {
  const erreur = erreurEtape(commande.value, Number(etape.value))
  if (erreur) {
    notifications.erreur(erreur)
    return
  }
  etape.value = String(Number(etape.value) + 1)
}
function precedent() {
  etape.value = String(Number(etape.value) - 1)
}

const aEteModifiee = () => JSON.stringify(commande.value) !== JSON.stringify(origine)

const questionQuitter = ref(false) // fenêtre « Quitter la commande ? »
function quitter() {
  if (aEteModifiee()) questionQuitter.value = true
  else visible.value = false
}
function fermer() {
  questionQuitter.value = false
  visible.value = false
}

// Enregistre la commande (validée, ou en attente de validation) en un seul appel
async function enregistrer(enAttente) {
  const erreur = erreurEtape(commande.value, 1) || erreurEtape(commande.value, 2)
  if (erreur) {
    notifications.erreur(
      enAttente && !modification.value
        ? `Pour mettre la commande en attente : ${erreur.toLowerCase()}`
        : erreur,
    )
    return
  }
  const aEnregistrer = { ...commande.value, en_attente: enAttente }
  try {
    if (modification.value) {
      const changements = modificationPourLeServeur(origine, aEnregistrer)
      if (!Object.keys(changements).length) {
        notifications.info('Aucune modification à enregistrer')
        fermer()
        return
      }
      await apiPut(`/commandes/${props.commandeId}/complete`, changements)
      notifications.succes('✅ Commande modifiée')
    } else {
      await apiPost('/commandes/complete', donneesPourLeServeur(aEnregistrer))
      notifications.succes(enAttente ? '⏸️ Commande mise en attente' : '✅ Commande créée')
    }
    fermer()
    emit('enregistree')
  } catch (e) {
    notifications.erreur(e.message)
  }
}
// Fenêtre « Quitter » : nouvelle commande → mise en attente ;
// modification → enregistrée telle quelle (une commande validée reste validée)
const { executer: enregistrerEnQuittant, enCours: enregistrementEnQuittantEnCours } = useAction(
  () => enregistrer(modification.value ? commande.value.en_attente : true),
)
// Bouton final du récapitulatif : validée, ou en attente si la case est cochée à l'écran 1
const { executer: creer, enCours: creationEnCours } = useAction(() =>
  enregistrer(commande.value.en_attente),
)
const libelleFinal = computed(() => {
  if (commande.value.en_attente) return 'Enregistrer en attente'
  return modification.value ? 'Enregistrer les modifications' : 'Créer la commande'
})
</script>
<template>
  <Dialog
    v-model:visible="visible"
    modal
    :closable="false"
    :close-on-escape="false"
    :style="{ width: '48rem' }"
    :breakpoints="{ '768px': '100vw' }"
  >
    <!-- Titre, et en modification l'horloge : l'historique complet dans un panneau à droite -->
    <template #header>
      <div class="entete-fenetre">
        <span class="p-dialog-title">
          {{ titre }}
        </span>
        <HistoriqueCommande v-if="modification" :commande-id="commandeId" panneau />
      </div>
    </template>
    <p v-if="chargement" class="chargement">Chargement de la commande…</p>
    <Stepper v-else v-model:value="etape" linear>
      <StepList>
        <Step value="1">Infos et service</Step>
        <Step value="2">Formules et produits</Step>
        <Step value="3">Récapitulatif</Step>
      </StepList>
      <StepPanels>
        <StepPanel value="1">
          <EcranInfos v-model="commande" :aujourdhui="aujourdhui" />
        </StepPanel>
        <StepPanel value="2">
          <div data-test="ecran-2">
            <EcranContenu v-model="commande" :couverts-proposes="partsProduites(commande)" />
          </div>
        </StepPanel>
        <StepPanel value="3">
          <div data-test="ecran-3">
            <EcranRecap :commande="commande" @aller="etape = $event" />
          </div>
        </StepPanel>
      </StepPanels>
    </Stepper>

    <template #footer>
      <div class="pied">
        <Button label="Quitter" severity="secondary" text data-test="quitter" @click="quitter" />
        <div v-if="!chargement" class="boutons">
          <Button
            v-if="etape !== '1'"
            label="Précédent"
            severity="secondary"
            outlined
            data-test="precedent"
            @click="precedent"
          />
          <Button v-if="etape !== '3'" label="Suivant" data-test="suivant" @click="suivant" />
          <Button
            v-else
            :label="libelleFinal"
            :loading="creationEnCours"
            data-test="creer"
            @click="creer"
          />
        </div>
      </div>
    </template>
  </Dialog>

  <!-- Quitter avec une saisie en cours : trois choix -->
  <Dialog
    v-model:visible="questionQuitter"
    modal
    :header="modification ? 'Quitter la modification ?' : 'Quitter la commande ?'"
    :closable="false"
    :style="{ width: '30rem' }"
    :breakpoints="{ '768px': '95vw' }"
  >
    <p v-if="modification">
      Les modifications ne sont pas enregistrées. Vous pouvez les enregistrer, ou quitter sans les
      enregistrer : la commande restera telle qu'elle était.
    </p>
    <p v-else>
      La commande n'est pas enregistrée. Vous pouvez la mettre en attente de validation pour la
      reprendre plus tard, ou quitter sans l'enregistrer.
    </p>
    <template #footer>
      <div class="boutons">
        <Button
          label="Continuer la saisie"
          severity="secondary"
          outlined
          data-test="continuer"
          @click="questionQuitter = false"
        />
        <Button
          label="Quitter sans enregistrer"
          severity="danger"
          outlined
          data-test="quitter-sans-enregistrer"
          @click="fermer"
        />
        <Button
          v-if="modification"
          label="Enregistrer les modifications"
          :loading="enregistrementEnQuittantEnCours"
          data-test="enregistrer-modifications"
          @click="enregistrerEnQuittant"
        />
        <Button
          v-else
          label="Mettre en attente"
          severity="warn"
          :loading="enregistrementEnQuittantEnCours"
          data-test="mettre-en-attente"
          @click="enregistrerEnQuittant"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.entete-fenetre {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.chargement {
  text-align: center;
  opacity: 0.7;
}
.pied {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
  flex-wrap: wrap;
}
</style>
