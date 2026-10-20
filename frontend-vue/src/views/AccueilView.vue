<script setup>
import { useUtilisateurStore } from '@/stores/utilisateur'

const store = useUtilisateurStore()
</script>

<template>
  <main class="container">
    <h2>Application Vue d'OMB</h2>
    <p>Bonjour {{ store.utilisateur.email }} ({{ store.utilisateur.role }}).</p>
    <p>Socle en place. Les écrans migrés apparaîtront ici.</p>
  </main>
</template>
