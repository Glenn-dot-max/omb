<script setup>
import { ref } from 'vue'
import { apiPost, saveToken } from '@/api/client'
import { useNotificationsStore } from '@/stores/notifications'
import { useAction } from '@/composables/useAction'
import ChampMotDePasse from '@/components/ChampMotDePasse.vue'
import { verifierNouveauMotDePasse } from '@/utils/motDePasse'

// Formulaire de changement de mot de passe, utilisé par « Mon compte » et par
// « Changement obligatoire » (première connexion). Prévient le parent après un succès.
const props = defineProps({
  libelleAncien: { type: String, default: 'Mot de passe actuel *' },
})
const emit = defineEmits(['change'])

const notifications = useNotificationsStore()
const ancien = ref('')
const nouveau = ref('')
const confirmation = ref('')

const { executer: changerMotDePasse, enCours } = useAction(async () => {
  const erreur = verifierNouveauMotDePasse(ancien.value, nouveau.value, confirmation.value)
  if (erreur) {
    notifications.erreur(erreur)
    return
  }
  try {
    const reponse = await apiPost('/auth/change-password', {
      old_password: ancien.value,
      new_password: nouveau.value,
    })
    // L'ancien token est invalidé par le changement : on garde le nouveau pour rester connecté
    saveToken(reponse.access_token)
    notifications.succes('✅ Mot de passe changé avec succès !')
    ancien.value = ''
    nouveau.value = ''
    confirmation.value = ''
    emit('change')
  } catch (e) {
    notifications.erreur(e.message)
  }
})
</script>

<template>
  <form @submit.prevent="changerMotDePasse">
    <div class="form-group">
      <label for="ancien-mot-de-passe">{{ props.libelleAncien }}</label>
      <ChampMotDePasse id="ancien-mot-de-passe" v-model="ancien" autocomplete="current-password" />
    </div>
    <div class="form-group">
      <label for="nouveau-mot-de-passe">Nouveau mot de passe *</label>
      <ChampMotDePasse id="nouveau-mot-de-passe" v-model="nouveau" autocomplete="new-password" />
      <small class="aide-champ">Minimum 8 caractères, avec majuscule, minuscule et chiffre</small>
    </div>
    <div class="form-group">
      <label for="confirmation-mot-de-passe">Confirmer le nouveau mot de passe *</label>
      <ChampMotDePasse
        id="confirmation-mot-de-passe"
        v-model="confirmation"
        autocomplete="new-password"
      />
    </div>
    <button type="submit" class="btn" :disabled="enCours">
      {{ enCours ? 'Enregistrement…' : '✅ Changer mon mot de passe' }}
    </button>
  </form>
</template>

<style scoped>
.aide-champ {
  font-size: 0.85rem;
  opacity: 0.8;
}
</style>
