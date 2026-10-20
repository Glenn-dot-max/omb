<script setup>
import { useUtilisateurStore } from '@/stores/utilisateur'
import { useNotificationsStore } from '@/stores/notifications'
import { useAction } from '@/composables/useAction'

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
    <button class="btn" :disabled="enCours" @click="tester">
      {{ enCours ? 'Patiente…' : 'Tester une notification' }}
    </button>
  </main>
</template>
