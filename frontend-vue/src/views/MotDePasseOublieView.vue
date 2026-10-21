<script setup>
import { ref } from 'vue'
import { apiPostPublic } from '@/api/client'
import { allerALaConnexion } from '@/api/navigation'
import { useNotificationsStore } from '@/stores/notifications'
import { useAction } from '@/composables/useAction'

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
      <form v-else @submit.prevent="envoyer">
        <p>Saisissez votre email : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
        <div class="form-group">
          <label for="email">Email *</label>
          <input id="email" v-model="email" type="email" autocomplete="email" required />
        </div>
        <button type="submit" class="btn" :disabled="enCours">
          {{ enCours ? 'Envoi…' : 'Recevoir le lien' }}
        </button>
      </form>
      <p>
        <button type="button" class="btn-secondary" @click="allerALaConnexion">
          ← Retour à la connexion
        </button>
      </p>
    </div>
  </main>
</template>
