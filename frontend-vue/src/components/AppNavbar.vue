<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useUtilisateurStore } from '@/stores/utilisateur'
import { marque } from '@/config/marque'

const store = useUtilisateurStore()
const router = useRouter()
const menuOuvert = ref(false)

// Pages migrées en Vue : « route » (nom de la route, sans recharger la page).
// Pages pas encore migrées : « href » vers l'ancien frontend.
const liens = [
  { texte: 'Produits', href: '/pages/produits.html' },
  { texte: 'Formules', href: '/pages/formules.html' },
  { texte: 'Commandes', route: 'commandes' },
  { texte: 'Planning', route: 'planning' },
]

// Page déjà migrée en Vue : on change de page sans recharger
function allerAMonCompte() {
  menuOuvert.value = false
  router.push({ name: 'mon-compte' })
}

// Fermer le menu utilisateur quand on clique ailleurs dans la page
function fermerSiClicDehors(evenement) {
  if (!evenement.target.closest('#burger-btn, #burger-menu')) {
    menuOuvert.value = false
  }
}
onMounted(() => document.addEventListener('click', fermerSiClicDehors))
onBeforeUnmount(() => document.removeEventListener('click', fermerSiClicDehors))
</script>

<template>
  <nav class="navbar">
    <h1>{{ marque.emoji }} {{ marque.nom }}</h1>
    <ul class="nav-links">
      <li v-for="lien in liens" :key="lien.texte">
        <RouterLink v-if="lien.route" :to="{ name: lien.route }">{{ lien.texte }}</RouterLink>
        <a v-else :href="lien.href">{{ lien.texte }}</a>
      </li>
      <li v-if="store.estTechAdmin"><RouterLink :to="{ name: 'admin' }">🔧 Admin</RouterLink></li>
      <li><RouterLink :to="{ name: 'aide' }">❓ Aide</RouterLink></li>
    </ul>
  </nav>

  <!-- Menu utilisateur (mêmes classes CSS que l'ancien frontend) -->
  <button
    id="burger-btn"
    :class="{ active: menuOuvert }"
    aria-label="Menu utilisateur"
    @click="menuOuvert = !menuOuvert"
  >
    <div class="burger-icon"><span></span><span></span><span></span></div>
  </button>
  <div id="burger-menu" class="burger-menu" :class="{ active: menuOuvert }">
    <div class="user-section">
      <div class="user-email">{{ store.utilisateur.email }}</div>
      <div class="user-franchise">{{ store.utilisateur.franchise_nom || 'Aucune franchise' }}</div>
    </div>
    <div class="menu-divider"></div>
    <button class="menu-btn" @click="allerAMonCompte">👤 Mon compte</button>
    <button class="logout-btn" @click="store.deconnecter()">🚪 Déconnexion</button>
  </div>
</template>
