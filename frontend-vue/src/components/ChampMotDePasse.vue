<script setup>
import { ref } from 'vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'

// Champ de mot de passe avec un œil gris, dans le champ à droite, pour l'afficher ou le masquer.
// Utilisation : <ChampMotDePasse id="nouveau-mot-de-passe" v-model="nouveau" autocomplete="new-password" />
// (Le champ Password de PrimeVue a aussi un œil, mais c'est une simple icône : ni atteignable au
// clavier, ni annoncée par un lecteur d'écran. On garde donc un vrai bouton.)
const valeur = defineModel({ type: String, default: '' })
defineProps({
  id: { type: String, required: true },
  autocomplete: { type: String, default: 'current-password' },
})

const visible = ref(false)
</script>

<template>
  <div class="champ-mot-de-passe">
    <InputText
      :id="id"
      v-model="valeur"
      :type="visible ? 'text' : 'password'"
      :autocomplete="autocomplete"
      class="saisie"
      required
    />
    <Button
      type="button"
      text
      rounded
      severity="secondary"
      class="oeil"
      :aria-label="visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
      :title="visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
      @click="visible = !visible"
    >
      <!-- Œil (barré quand le mot de passe est affiché), dessiné en SVG : prend la couleur grise du bouton -->
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        />
        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2" />
        <line v-if="visible" x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="2" />
      </svg>
    </Button>
  </div>
</template>

<style scoped>
.champ-mot-de-passe {
  position: relative;
  width: 100%;
}
/* Place laissée à droite pour l'œil */
.saisie {
  width: 100%;
  padding-right: 3rem;
}
.oeil {
  position: absolute;
  top: 50%;
  right: 4px;
  transform: translateY(-50%);
}
</style>
