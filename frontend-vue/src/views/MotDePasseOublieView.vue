<script setup>
import { ref } from 'vue'
import { apiPostPublic } from '@/api/client'
import { allerALaConnexion } from '@/api/navigation'
import { useNotificationsStore } from '@/stores/notifications'
import { useAction } from '@/composables/useAction'
import { marque } from '@/config/marque'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'

const notifications = useNotificationsStore()
const email = ref('')
const messageEnvoye = ref('')
// Lien "écrire un email" tout prêtn avec l'objet déjà rempli
const lienContact = `mailto:${marque.contactMotDePasse}?subject=${encodeURIComponent('Mot de passe oublié')}`

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
      <!-- Pas encore d'envoi de lien par email (B1) : on écrit à la personne indiquée -->
      <template v-if="marque.contactMotDePasse">
        <p>Pour changer votre mot de passe, écrivez à :</p>
        <p class="contact">
          📧 <a :href="lienContact">{{ marque.contactMotDePasse }}</a>
        </p>
        <p>
          Indiquez l'email avec lequel vous vous connectez : un nouveau mot de passe provisoire vous
          sera communiqué, à changer à la première connexion.
        </p>
      </template>
      <p v-else-if="messageEnvoye">📧 {{ messageEnvoye }}</p>

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

<style scoped>
.contact {
  font-size: 1.1rem;
  font-weight: 600;
}
</style>
