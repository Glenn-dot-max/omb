<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useUtilisateurStore } from '@/stores/utilisateur'
import { marque } from '@/config/marque'

const store = useUtilisateurStore()
const router = useRouter()
const menuOuvert = ref(false)

// Pages pas encore migrées : liens vers l'ancien frontend.
// Quand une page sera migrée, son lien deviendra un <RouterLink> vers /app/...
const liens = [
  { texte: 'Produits', href: '/pages/produits.html' },
  { texte: 'Formules', href: '/pages/formules.html' },
  { texte: 'Commandes', href: '/pages/commandes.html' },
  { texte: 'Planning', href: '/pages/planning.html' },
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
      <li v-for="lien in liens" :key="lien.href">
        <a :href="lien.href">{{ lien.texte }}</a>
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
