<script setup>
import { useUtilisateurStore } from '@/stores/utilisateur'
import { useNotificationsStore } from '@/stores/notifications'
import { useAction } from '@/composables/useAction'
import Button from 'primevue/button'

const store = useUtilisateurStore()
const notifications = useNotificationsStore()

// Démonstration provisoire du socle (cette page sera remplacée par les écrans migrés)
const { executer: tester, enCours } = useAction(async () => {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  notifications.succes('Le socle fonctionne !')
})
</script>

<template>
  <main class="container">
    <h2>Application Vue</h2>
    <p>Bonjour {{ store.utilisateur.email }} ({{ store.utilisateur.role }}).</p>
    <p>Socle en place. Les écrans migrés apparaîtront ici.</p>
    <!-- Premier composant PrimeVue : bouton avec indicateur de chargement intégré -->
    <Button label="Tester une notification" :loading="enCours" @click="tester" />
  </main>
</template>
