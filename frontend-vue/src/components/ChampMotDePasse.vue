<script setup>
import { ref } from 'vue'
import InputGroup from 'primevue/inputgroup'
import InputGroupAddon from 'primevue/inputgroupaddon'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'

// Champ de mot de passe avec un bouton 👁️ pour l'afficher ou le masquer.
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
  <InputGroup>
    <InputText
      :id="id"
      v-model="valeur"
      :type="visible ? 'text' : 'password'"
      :autocomplete="autocomplete"
      required
    />
    <InputGroupAddon>
      <Button
        type="button"
        text
        severity="secondary"
        :label="visible ? '🙈' : '👁️'"
        :aria-label="visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
        :title="visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
        @click="visible = !visible"
      />
    </InputGroupAddon>
  </InputGroup>
</template>
