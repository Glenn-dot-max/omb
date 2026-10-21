<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { apiPostPublic } from '@/api/client'
import { allerALaConnexion } from '@/api/navigation'
import { useNotificationsStore } from '@/stores/notifications'
import { useAction } from '@/composables/useAction'
import { verifierNouveauMotDePasse } from '@/utils/motDePasse'

// Page ouverte depuis le lien de l'email : …/reinitialiser-mot-de-passe?token=…
const jeton = useRoute().query.token
const notifications = useNotificationsStore()
const nouveau = ref('')
const confirmation = ref('')
const reussi = ref(false)

const { executer: reinitialiser, enCours } = useAction(async () => {
  // Pas d'ancien mot de passe ici : '' ne peut jamais être égal au nouveau
  const erreur = verifierNouveauMotDePasse('', nouveau.value, confirmation.value)
  if (erreur) {
    notifications.erreur(erreur)
    return
  }
  try {
    await apiPostPublic('/auth/reset-password', { token: jeton, new_password: nouveau.value })
    reussi.value = true
  } catch (e) {
    notifications.erreur(e.message)
  }
})
</script>

<template>
  <main class="container">
    <h2>🔒 Nouveau mot de passe</h2>
    <div class="form-card">
      <p v-if="!jeton">
        ❌ Lien invalide : utilisez le lien reçu par email, ou faites une nouvelle demande.
      </p>
      <p v-else-if="reussi">✅ Mot de passe réinitialisé. Vous pouvez maintenant vous connecter.</p>
      <form v-else @submit.prevent="reinitialiser">
        <div class="form-group">
          <label for="nouveau-mot-de-passe">Nouveau mot de passe *</label>
          <input
            id="nouveau-mot-de-passe"
            v-model="nouveau"
            type="password"
            autocomplete="new-password"
            required
          />
          <small class="aide-champ"
            >Minimum 8 caractères, avec majuscule, minuscule et chiffre</small
          >
        </div>
        <div class="form-group">
          <label for="confirmation-mot-de-passe">Confirmer le mot de passe *</label>
          <input
            id="confirmation-mot-de-passe"
            v-model="confirmation"
            type="password"
            autocomplete="new-password"
            required
          />
        </div>
        <button type="submit" class="btn" :disabled="enCours">
          {{ enCours ? 'Enregistrement…' : 'Enregistrer le mot de passe' }}
        </button>
      </form>
      <p>
        <button type="button" class="btn-secondary" @click="allerALaConnexion">
          ← Aller à la connexion
        </button>
      </p>
    </div>
  </main>
</template>

<style scoped>
.aide-champ {
  font-size: 0.85rem;
  opacity: 0.8;
}
</style>
