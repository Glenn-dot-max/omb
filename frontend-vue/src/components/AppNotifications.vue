<script setup>
import { useNotificationsStore } from '@/stores/notifications'

const store = useNotificationsStore()
</script>

<template>
  <!-- Les notifications s'empilent en haut à droite (70 px d'écart entre chacune) -->
  <div
    v-for="(notification, index) in store.notifications"
    :key="notification.id"
    class="toast"
    :class="[`toast-${notification.type}`, { show: notification.visible }]"
    :style="{ top: `${20 + index * 70}px` }"
    role="status"
  >
    {{ notification.message }}
  </div>
</template>
