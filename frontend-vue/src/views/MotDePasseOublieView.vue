<script setup>
import { ref } from 'vue'
import { apiPostPublic } from '@/api/client'
import { allerALaConnexion } from '@/api/navigation'
import { useNotificationsStore } from '@/stores/notifications'
import { useAction } from '@/composables/useAction'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'

const notifications = useNotificationsStore()
const email = ref('')
const messageEnvoye = ref('')

const { executer: envoyer, enCours } = useAction(async () => {
  try {
    const reponse = await apiPostPublic('/auth/forgot-password', { email: email.value.trim() })
    // Le serveur répond la même chose que le compte existe ou non (on ne révèle pas qui est inscrit)
    messageEnvoye.value = reponse.message
  } catch (e) {
    notifications.erreur(e.message)
  }
})
</script>
<template>
  <main class="container">
    <h2>🔑 Mot de passe oublié</h2>
    <div class="form-card">
      <p v-if="messageEnvoye">📧 {{ messageEnvoye }}</p>
      <form v-else class="formulaire" @submit.prevent="envoyer">
        <p>Saisissez votre email : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
        <div class="champ">
          <label for="email">Email *</label>
          <InputText id="email" v-model="email" type="email" autocomplete="email" required />
        </div>
        <div class="boutons">
          <Button type="submit" label="Recevoir le lien" :loading="enCours" />
        </div>
      </form>
      <p>
        <Button
          type="button"
          label="← Retour à la connexion"
          severity="secondary"
          text
          @click="allerALaConnexion"
        />
      </p>
    </div>
  </main>
</template>
