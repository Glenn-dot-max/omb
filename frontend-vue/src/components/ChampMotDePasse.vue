<script setup>
import { ref } from 'vue'

// Champ de mot de passe avec un bouton 👁️ pour l'afficher ou le masquer.
// Utilisation : <ChampMotDePasse id="nouveau-mot-de-passe" v-model="nouveau" autocomplete="new-password" />
const valeur = defineModel({ type: String, default: '' })
defineProps({
  id: { type: String, required: true },
  autocomplete: { type: String, default: 'current-password' },
})

const visible = ref(false)
</script>

<template>
  <div class="champ-mot-de-passe">
    <input
      :id="id"
      v-model="valeur"
      :type="visible ? 'text' : 'password'"
      :autocomplete="autocomplete"
      required
    />
    <button
      type="button"
      class="bouton-oeil"
      :aria-label="visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
      :title="visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
      @click="visible = !visible"
    >
      {{ visible ? '🙈' : '👁️' }}
    </button>
  </div>
</template>

<style scoped>
.champ-mot-de-passe {
  position: relative;
}
.champ-mot-de-passe input {
  width: 100%;
  padding-right: 3rem; /* place pour le bouton */
}
.bouton-oeil {
  position: absolute;
  top: 50%;
  right: 0.5rem;
  transform: translateY(-50%);
  min-width: 44px; /* cible confortable au doigt (tablette) */
  min-height: 44px;
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
}
</style>
