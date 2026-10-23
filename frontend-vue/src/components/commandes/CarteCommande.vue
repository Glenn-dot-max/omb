<script setup>
import { computed } from 'vue'
import { dateIso, formaterDate, jourCourt } from '@/utils/planning'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import HistoriqueCommande from '@/components/commandes/HistoriqueCommande.vue'

// Une commande dans la liste. Les actions sont faites par la page (événements).
const props = defineProps({
  commande: { type: Object, required: true },
  aujourdhui: { type: String, required: true }, // 'AAAA-MM-JJ', date de Paris donnée par le serveur
  archivee: { type: Boolean, default: false },
})
defineEmits(['valider', 'supprimer'])

const c = computed(() => props.commande)
const enAttente = computed(() => c.value.validated === false)

const demain = computed(() => {
  const [annee, mois, jour] = props.aujourdhui.split('-').map(Number)
  return dateIso(new Date(annee, mois - 1, jour + 1))
})
const libelleDate = computed(() => {
  const date = c.value.delivery_date.slice(0, 10)
  if (date === props.aujourdhui) return "Aujourd'hui"
  if (date === demain.value) return 'Demain'
  return `${jourCourt(date)} ${formaterDate(date)}`
})
const heure = computed(() => (c.value.delivery_hour || '').slice(0, 5))
</script>

<template>
  <article class="carte-commande" :class="{ 'en-attente': enAttente }">
    <header class="entete">
      <h4 class="client">{{ c.nom_client }}</h4>
      <span class="quand">
        📅 {{ libelleDate }} · ⏰ {{ heure }}
        <HistoriqueCommande :commande-id="c.id" />
      </span>
    </header>

    <div class="badges">
      <Tag :value="`🍽️ ${c.nombre_couverts} couverts`" severity="secondary" />
      <Tag :value="c.avec_service ? 'Avec service' : 'Sans service'" severity="secondary" />
      <Tag :value="c.type_prestation || 'non-brunch'" severity="secondary" />
      <Tag v-if="enAttente" value="En attente de validation" severity="warn" />
    </div>

    <p v-if="c.notes && c.notes.trim()" class="notes">📝 {{ c.notes }}</p>

    <div v-if="!archivee" class="boutons">
      <template v-if="enAttente">
        <Button
          label="Confirmer la commande"
          size="small"
          severity="success"
          :data-test="`valider-${c.id}`"
          @click="$emit('valider', c)"
        />
        <Button
          label="Abandonner"
          size="small"
          severity="danger"
          outlined
          :data-test="`supprimer-${c.id}`"
          @click="$emit('supprimer', c)"
        />
      </template>
      <Button
        v-else
        label="Supprimer"
        size="small"
        severity="danger"
        outlined
        :data-test="`supprimer-${c.id}`"
        @click="$emit('supprimer', c)"
      />
    </div>
  </article>
</template>

<style scoped>
.carte-commande {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  background: var(--color-bg-cream);
  border: 1px solid var(--color-border-warm);
  border-radius: 8px;
  min-width: 0;
}
.carte-commande.en-attente {
  border: 2px dashed var(--color-accent-orange);
}
.entete {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
.client {
  margin: 0;
  overflow-wrap: anywhere;
}
.quand {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.9rem;
  white-space: nowrap;
}
.badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.notes {
  margin: 0;
  font-size: 0.9rem;
  white-space: pre-line;
  overflow-wrap: anywhere;
}
</style>
