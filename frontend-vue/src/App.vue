<script setup>
import { RouterView } from 'vue-router'
import AppNavbar from '@/components/AppNavbar.vue'
import AppNotifications from '@/components/AppNotifications.vue'
import ConfirmDialog from 'primevue/confirmdialog'
import { useUtilisateurStore } from '@/stores/utilisateur'

const store = useUtilisateurStore()
</script>

<template>
  <!-- La barre n'apparaît qu'une fois l'utilisateur chargé par la garde du routeur -->
  <AppNavbar v-if="store.estConnecte" />
  <RouterView />
  <AppNotifications />
  <!-- Fenêtre de confirmation partagée par tous les écrans (useConfirm) -->
  <ConfirmDialog />
</template>
