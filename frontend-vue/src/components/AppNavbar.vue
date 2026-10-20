<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useUtilisateurStore } from '@/stores/utilisateur'
import { marque } from '@/config/marque'

const store = useUtilisateurStore()
const menuOuvert = ref(false)

// Pages pas encore migrées : liens vers l'ancien frontend.
// Quand une page sera migrée, son lien deviendra un <RouterLink> vers /app/...
const liens = [
  { texte: 'Produits', href: '/pages/produits.html' },
  { texte: 'Formules', href: '/pages/formules.html' },
  { texte: 'Commandes', href: '/pages/commandes.html' },
  { texte: 'Planning', href: '/pages/planning.html' },
]

function allerVers(adresse) {
  window.location.href = adresse
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
      <li v-if="store.estTechAdmin"><a href="/pages/admin.html">🔧 Admin</a></li>
      <li><a href="/pages/aide.html">❓ Aide</a></li>
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
    <button class="menu-btn" @click="allerVers('/pages/mon-compte.html')">👤 Mon compte</button>
    <button class="logout-btn" @click="store.deconnecter()">🚪 Déconnexion</button>
  </div>
</template>
