import { defineStore } from 'pinia'
import { ref } from 'vue'

// Notifications (« toasts ») en haut à droite : remplace frontend/js/toast.js.
// Mêmes classes CSS que l'ancien frontend : .toast, .toast-success, .toast-error, .toast-info, .toast-warning, .show
const DUREE_TRANSITION = 300 // durée de l'animation CSS de sortie (ms)

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref([])
  let prochainId = 1

  function afficher(message, type = 'success', duree = 3000) {
    const id = prochainId++
    notifications.value.push({ id, message, type, visible: false })
    const trouver = () => notifications.value.find((n) => n.id === id)

    // Animation d'entrée : ajouter la classe .show juste après l'affichage
    setTimeout(() => {
      const notification = trouver()
      if (notification) notification.visible = true
    }, 10)

    // Animation de sortie, puis suppression
    setTimeout(() => {
      const notification = trouver()
      if (notification) notification.visible = false
      setTimeout(() => {
        notifications.value = notifications.value.filter((n) => n.id !== id)
      }, DUREE_TRANSITION)
    }, duree)
  }

  const succes = (message) => afficher(message, 'success')
  const erreur = (message) => afficher(message, 'error', 5000) // le temps de lire le message d'erreur
  const info = (message) => afficher(message, 'info')
  const avertissement = (message) => afficher(message, 'warning', 4000)

  return { notifications, afficher, succes, erreur, info, avertissement }
})
