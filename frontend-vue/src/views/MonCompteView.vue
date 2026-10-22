<script setup>
import { useUtilisateurStore } from '@/stores/utilisateur'
import FormulaireMotDePasse from '@/components/FormulaireMotDePasse.vue'
import { libelleRole } from '@/utils/roles'
import Button from 'primevue/button'

const store = useUtilisateurStore()
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
          <span>{{ libelleRole(store.utilisateur.role) }}</span>
        </div>
      </div>
    </div>

    <div class="form-card">
      <h3>🔒 Changer mon mot de passe</h3>
      <FormulaireMotDePasse />
    </div>

    <div class="form-card">
      <h3>🚪 Déconnexion</h3>
      <Button
        type="button"
        label="Se déconnecter"
        severity="secondary"
        outlined
        @click="store.deconnecter()"
      />
    </div>
  </main>
</template>
