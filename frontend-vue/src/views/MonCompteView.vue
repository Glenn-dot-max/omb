<script setup>
import { computed } from 'vue'
import { useUtilisateurStore } from '@/stores/utilisateur'
import FormulaireMotDePasse from '@/components/FormulaireMotDePasse.vue'

const store = useUtilisateurStore()

const LIBELLES_ROLES = {
  TECH_ADMIN: 'Administrateur',
  CATALOG_ADMIN: 'Administrateur du catalogue',
  USER: 'Utilisateur',
}
const libelleRole = computed(() => LIBELLES_ROLES[store.utilisateur.role] || store.utilisateur.role)
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
      <FormulaireMotDePasse />
    </div>

    <div class="form-card">
      <h3>🚪 Déconnexion</h3>
      <button type="button" class="btn-secondary" @click="store.deconnecter()">
        Se déconnecter
      </button>
    </div>
  </main>
</template>
