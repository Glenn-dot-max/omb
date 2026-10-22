<script setup>
import { ref, watch } from 'vue'
import { apiPost } from '@/api/client'
import { useNotificationsStore } from '@/stores/notifications'
import { useAction } from '@/composables/useAction'
import {
  commandeVide,
  erreurEtape,
  donneesPourLeServeur,
  partsProduites,
} from '@/utils/nouvelleCommande'
import EcranInfos from '@/components/commandes/EcranInfos.vue'
import EcranContenu from '@/components/commandes/EcranContenu.vue'
import EcranRecap from '@/components/commandes/EcranRecap.vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Stepper from 'primevue/stepper'
import StepList from 'primevue/steplist'
import Step from 'primevue/step'
import StepPanels from 'primevue/steppanels'
import StepPanel from 'primevue/steppanel'

// Nouvelle commande en 3 écrans : 1. infos et service · 2. formules et produits · 3. récapitulatif.
// On ne quitte que par le bouton « Quitter » (ni clic à côté, ni touche Échap, ni croix) :
// si quelque chose a été saisi, on propose de continuer, de quitter sans enregistrer,
// ou de mettre la commande en attente.
const visible = defineModel('visible', { type: Boolean, default: false })
const props = defineProps({ aujourdhui: { type: String, required: true } })
const emit = defineEmits(['enregistree'])

const notifications = useNotificationsStore()

const commande = ref(commandeVide(props.aujourdhui))
const etape = ref('1')

// À chaque ouverture : formulaire vide, premier écran
watch(visible, (ouvert) => {
  if (!ouvert) return
  commande.value = commandeVide(props.aujourdhui)
  etape.value = '1'
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

const aEteModifiee = () =>
  JSON.stringify(commande.value) !== JSON.stringify(commandeVide(props.aujourdhui))

const questionQuitter = ref(false) // fenêtre « Quitter la commande ? »
function quitter() {
  if (aEteModifiee()) questionQuitter.value = true
  else visible.value = false
}
function quitterSansEnregistrer() {
  questionQuitter.value = false
  visible.value = false
}

// Enregistre la commande (validée, ou en attente de validation) en un seul appel
async function enregistrer(enAttente) {
  const erreur = erreurEtape(commande.value, 1) || erreurEtape(commande.value, 2)
  if (erreur) {
    notifications.erreur(
      enAttente ? `Pour mettre la commande en attente : ${erreur.toLowerCase()}` : erreur,
    )
    return
  }
  try {
    await apiPost(
      '/commandes/complete',
      donneesPourLeServeur({ ...commande.value, en_attente: enAttente }),
    )
    notifications.succes(enAttente ? '⏸️ Commande mise en attente' : '✅ Commande créée')
    questionQuitter.value = false
    visible.value = false
    emit('enregistree')
  } catch (e) {
    notifications.erreur(e.message)
  }
}
const { executer: mettreEnAttente, enCours: miseEnAttenteEnCours } = useAction(() =>
  enregistrer(true),
)
// Bouton final du récapitulatif : validée, ou en attente si la case est cochée à l'écran 1
const { executer: creer, enCours: creationEnCours } = useAction(() =>
  enregistrer(commande.value.en_attente),
)
</script>
<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="Nouvelle commande"
    :closable="false"
    :close-on-escape="false"
    :style="{ width: '48rem' }"
    :breakpoints="{ '768px': '100vw' }"
  >
    <Stepper v-model:value="etape" linear>
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
        <div class="boutons">
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
            :label="commande.en_attente ? 'Enregistrer en attente' : 'Créer la commande'"
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
    header="Quitter la commande ?"
    :closable="false"
    :style="{ width: '30rem' }"
    :breakpoints="{ '768px': '95vw' }"
  >
    <p>
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
          @click="quitterSansEnregistrer"
        />
        <Button
          label="Mettre en attente"
          severity="warn"
          :loading="miseEnAttenteEnCours"
          data-test="mettre-en-attente"
          @click="mettreEnAttente"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.pied {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
  flex-wrap: wrap;
}
</style>
