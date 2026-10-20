import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiGet, removeToken } from '@/api/client'
import { allerALaConnexion } from '@/api/navigation'

// L'utilisateur connecté, relu sur le serveur (GET /auth/me) : rôle et franchise toujours à jour,
// même après un changement de rôle dans l'admin (tâche 1.10), contrairement au token figé à la connexion.
export const useUtilisateurStore = defineStore('utilisateur', () => {
  const utilisateur = ref(null)

  const estConnecte = computed(() => utilisateur.value !== null)
  const estTechAdmin = computed(() => utilisateur.value?.role === 'TECH_ADMIN')
  const estCatalogAdmin = computed(() => utilisateur.value?.role === 'CATALOG_ADMIN')
  const aAccesCatalogue = computed(() => estTechAdmin.value || estCatalogAdmin.value)

  async function charger() {
    utilisateur.value = await apiGet('/auth/me')
  }

  function deconnecter() {
    removeToken()
    utilisateur.value = null
    allerALaConnexion()
  }

  return {
    utilisateur,
    estConnecte,
    estTechAdmin,
    estCatalogAdmin,
    aAccesCatalogue,
    charger,
    deconnecter,
  }
})
