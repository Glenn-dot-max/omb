<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { apiPostPublic } from '@/api/client'
import { allerALaConnexion } from '@/api/navigation'
import { useNotificationsStore } from '@/stores/notifications'
import { useAction } from '@/composables/useAction'
import ChampMotDePasse from '@/components/ChampMotDePasse.vue'
import Button from 'primevue/button'
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
      <form v-else class="formulaire" @submit.prevent="reinitialiser">
        <div class="champ">
          <label for="nouveau-mot-de-passe">Nouveau mot de passe *</label>
          <ChampMotDePasse
            id="nouveau-mot-de-passe"
            v-model="nouveau"
            autocomplete="new-password"
          />
          <small class="aide-champ"
            >Minimum 8 caractères, avec majuscule, minuscule et chiffre</small
          >
        </div>
        <div class="champ">
          <label for="confirmation-mot-de-passe">Confirmer le mot de passe *</label>
          <ChampMotDePasse
            id="confirmation-mot-de-passe"
            v-model="confirmation"
            autocomplete="new-password"
          />
        </div>
        <div class="boutons">
          <Button type="submit" label="Enregistrer le mot de passe" :loading="enCours" />
        </div>
      </form>
      <p>
        <Button
          type="button"
          label="← Aller à la connexion"
          severity="secondary"
          text
          @click="allerALaConnexion"
        />
      </p>
    </div>
  </main>
</template>
