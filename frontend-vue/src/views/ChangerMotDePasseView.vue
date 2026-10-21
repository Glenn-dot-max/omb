<script setup>
import { useUtilisateurStore } from '@/stores/utilisateur'
import { allerAuxCommandes } from '@/api/navigation'
import FormulaireMotDePasse from '@/components/FormulaireMotDePasse.vue'

const store = useUtilisateurStore()

// Première connexion : une fois le mot de passe provisoire remplacé, l'utilisateur peut travailler
function apresChangement() {
  store.utilisateur.must_change_password = false
  allerAuxCommandes()
}
</script>

<template>
  <main class="container">
    <h2>🔒 Changement obligatoire</h2>
    <p>
      Pour votre première connexion, remplacez le mot de passe provisoire par un mot de passe
      personnel.
    </p>
    <div class="form-card">
      <FormulaireMotDePasse libelle-ancien="Mot de passe provisoire *" @change="apresChangement" />
    </div>
  </main>
</template>
