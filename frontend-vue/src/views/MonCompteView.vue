<script setup>
import { ref, computed } from 'vue'
import { apiPost, saveToken } from '@/api/client'
import { useUtilisateurStore } from '@/stores/utilisateur'
import { useNotificationsStore } from '@/stores/notifications'
import { useAction } from '@/composables/useAction'
import { verifierNouveauMotDePasse } from '@/utils/motDePasse'

const store = useUtilisateurStore()
const notifications = useNotificationsStore()

const LIBELLES_ROLES = {
  TECH_ADMIN: 'Administrateur',
  CATALOG_ADMIN: 'Administrateur du catalogue',
  USER: 'Utilisateur',
}
const libelleRole = computed(() => LIBELLES_ROLES[store.utilisateur.role] || store.utilisateur.role)

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
  } catch (e) {
    notifications.erreur(e.message)
  }
})
</script>

<template>
  <main class="container">
    <h2>👤 Mon compte</h2>

    <div class="form-card">
      <h3>📋 Mes informations</h3>
      <div class="info-grid">
        <div class="info-item">
          <label>Email :</label>
          <span>{{ store.utilisateur.email }}</span>
        </div>
        <div class="info-item">
          <label>Franchise :</label>
          <span>{{ store.utilisateur.franchise_nom || 'Aucune franchise' }}</span>
        </div>
        <div class="info-item">
          <label>Rôle :</label>
          <span>{{ libelleRole }}</span>
        </div>
      </div>
    </div>

    <div class="form-card">
      <h3>🔒 Changer mon mot de passe</h3>
      <form @submit.prevent="changerMotDePasse">
        <div class="form-group">
          <label for="ancien-mot-de-passe">Mot de passe actuel *</label>
          <input
            id="ancien-mot-de-passe"
            v-model="ancien"
            type="password"
            autocomplete="current-password"
            required
          />
        </div>
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
          <label for="confirmation-mot-de-passe">Confirmer le nouveau mot de passe *</label>
          <input
            id="confirmation-mot-de-passe"
            v-model="confirmation"
            type="password"
            autocomplete="new-password"
            required
          />
        </div>
        <button type="submit" class="btn" :disabled="enCours">
          {{ enCours ? 'Enregistrement…' : '✅ Changer mon mot de passe' }}
        </button>
      </form>
    </div>

    <div class="form-card">
      <h3>🚪 Déconnexion</h3>
      <button type="button" class="btn-secondary" @click="store.deconnecter()">
        Se déconnecter
      </button>
    </div>
  </main>
</template>

<style scoped>
.aide-champ {
  font-size: 0.85rem;
  opacity: 0.8;
}
</style>
