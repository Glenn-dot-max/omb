<script setup>
import { RouterView } from 'vue-router'
import AppNavbar from '@/components/AppNavbar.vue'
import { useUtilisateurStore } from '@/stores/utilisateur'

const store = useUtilisateurStore()
</script>

<template>
  <!-- La barre n'apparaît qu'une fois l'utilisateur chargé par la garde du routeur -->
  <AppNavbar v-if="store.estConnecte" />
  <RouterView />
</template>
