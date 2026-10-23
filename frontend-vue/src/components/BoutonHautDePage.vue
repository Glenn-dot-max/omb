<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Button from 'primevue/button'

// B10 : bouton flottant « Remonter en haut », sur les longues pages (commandes, planning…).
// Il apparaît dès qu'on a fait défiler la page, et y remonte en douceur d'un clic.
const SEUIL = 400 // en pixels : environ un écran de tablette défilé
const visible = ref(false)

const surveiller = () => (visible.value = window.scrollY > SEUIL)
const remonter = () => window.scrollTo({ top: 0, behavior: 'smooth' })

onMounted(() => window.addEventListener('scroll', surveiller, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', surveiller))
</script>

<template>
  <Button
    v-if="visible"
    type="button"
    label="⬆"
    rounded
    class="haut-de-page"
    aria-label="Remonter en haut de la page"
    title="Remonter en haut de la page"
    @click="remonter"
  />
</template>

<style scoped>
/* En bas à droite, au-dessus de la page mais sous les fenêtres (Dialog) de PrimeVue */
.haut-de-page {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 900;
  width: 48px;
  height: 48px;
  font-size: 1.3rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
</style>
