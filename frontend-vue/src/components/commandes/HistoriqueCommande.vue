<script setup>
import { ref } from 'vue'
import { apiGet } from '@/api/client'
import ListeHistorique from '@/components/commandes/ListeHistorique.vue'
import Button from 'primevue/button'
import Popover from 'primevue/popover'
import Drawer from 'primevue/drawer'

// Horloge d'une commande : un clic ouvre son historique
// (qui a créé, modifié, validé la commande, quand, et ce qui a changé).
// - sur une carte : petit bandeau, détail replié derrière des flèches ;
// - dans la fenêtre de la commande (panneau) : panneau à droite, tout déplié.
const props = defineProps({
  commandeId: { type: String, required: true },
  panneau: { type: Boolean, default: false },
})

const bandeau = ref()
const panneauOuvert = ref(false)
const lignes = ref([])
const etat = ref('vide') // 'chargement' | 'pret' | 'erreur'

// Rechargé à chaque ouverture : l'historique a pu changer depuis la dernière fois
async function ouvrir(evenement) {
  if (props.panneau) panneauOuvert.value = true
  else bandeau.value.toggle(evenement)
  etat.value = 'chargement'
  try {
    lignes.value = await apiGet(`/commandes/${props.commandeId}/historique`)
    etat.value = 'pret'
  } catch {
    etat.value = 'erreur'
  }
}
</script>

<template>
  <Button
    type="button"
    label="🕐"
    text
    rounded
    size="small"
    class="horloge"
    aria-label="Historique de la commande"
    title="Historique de la commande"
    :data-test="`historique-${commandeId}`"
    @click="ouvrir"
  />
  <Drawer
    v-if="panneau"
    v-model:visible="panneauOuvert"
    position="right"
    header="Historique de la commande"
    :style="{ width: 'min(26rem, 90vw)' }"
  >
    <div :data-test="`panneau-${commandeId}`">
      <p v-if="etat === 'chargement'" class="discret">Chargement…</p>
      <p v-else-if="etat === 'erreur'" class="discret">Historique indisponible pour le moment.</p>
      <p v-else-if="!lignes.length" class="discret">
        Aucun historique : la commande a été créée avant la mise en place du suivi (23/10/2026).
      </p>
      <ListeHistorique v-else :lignes="lignes" tout-deplie />
    </div>
  </Drawer>
  <Popover v-else ref="bandeau">
    <div class="historique" :data-test="`bandeau-${commandeId}`">
      <h5>Historique de la commande</h5>
      <p v-if="etat === 'chargement'" class="discret">Chargement…</p>
      <p v-else-if="etat === 'erreur'" class="discret">Historique indisponible pour le moment.</p>
      <p v-else-if="!lignes.length" class="discret">
        Aucun historique : la commande a été créée avant la mise en place du suivi (23/10/2026).
      </p>
      <ListeHistorique v-else :lignes="lignes" />
    </div>
  </Popover>
</template>

<style scoped>
.horloge {
  width: 36px;
  height: 36px;
}
.historique {
  width: min(22rem, 85vw);
  max-height: 60vh;
  overflow-y: auto;
}
.historique h5 {
  margin: 0 0 8px;
  color: var(--color-brand);
}
.discret {
  font-size: 0.85rem;
  opacity: 0.75;
  margin: 0;
}
</style>
