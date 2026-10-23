<script setup>
import { ref } from 'vue'
import { libelleAction, formaterHorodatage, resumeDetails } from '@/utils/historique'

// Les étapes de l'historique d'une commande, la plus récente d'abord.
// Détail de chaque étape replié derrière une flèche (bandeau de l'horloge),
// ou tout déplié (panneau de la fenêtre de commande).
const props = defineProps({
  lignes: { type: Array, required: true },
  toutDeplie: { type: Boolean, default: false },
})

const ouvertes = ref({}) // index -> détail affiché ?
const estOuverte = (i) => props.toutDeplie || ouvertes.value[i]
</script>

<template>
  <ol class="liste-historique">
    <li v-for="(ligne, i) in lignes" :key="i" :data-test="`etape-${i}`">
      <div class="entete-ligne">
        <button
          v-if="!toutDeplie && resumeDetails(ligne.action, ligne.details).length"
          type="button"
          class="fleche"
          :aria-expanded="!!ouvertes[i]"
          :aria-label="`${ouvertes[i] ? 'Masquer' : 'Voir'} le détail`"
          :data-test="`deplier-${i}`"
          @click="ouvertes[i] = !ouvertes[i]"
        >
          {{ ouvertes[i] ? '▾' : '▸' }}
        </button>
        <strong>{{ libelleAction(ligne.action) }}</strong>
        <span class="discret date">{{ formaterHorodatage(ligne.created_at) }}</span>
      </div>
      <div class="discret">par {{ ligne.auteur }}</div>
      <ul v-if="estOuverte(i) && resumeDetails(ligne.action, ligne.details).length" class="details">
        <li v-for="texte in resumeDetails(ligne.action, ligne.details)" :key="texte">
          {{ texte }}
        </li>
      </ul>
    </li>
  </ol>
</template>

<style scoped>
.liste-historique {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
/* Une frise : un trait doré à gauche de chaque étape */
.liste-historique > li {
  padding-left: 10px;
  border-left: 3px solid var(--color-primary);
}
.entete-ligne {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.date {
  margin-left: auto;
}
.fleche {
  border: none;
  background: none;
  cursor: pointer;
  padding: 0 4px;
  min-width: 28px;
  min-height: 28px;
  font-size: 1rem;
  color: var(--color-brand);
}
.details {
  margin: 4px 0 0;
  padding-left: 18px;
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}
.discret {
  font-size: 0.85rem;
  opacity: 0.75;
  margin: 0;
}
</style>
