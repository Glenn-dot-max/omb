import { ref } from 'vue'

// Anti double-clic (remplace preventDoubleClick de l'ancien frontend).
// Utilisation dans un composant :
//   const { executer: enregistrer, enCours } = useAction(async () => { ... })
//   <button :disabled="enCours" @click="enregistrer">Enregistrer</button>
export function useAction(action) {
  const enCours = ref(false)

  async function executer(...args) {
    if (enCours.value) return // déjà en cours : on ignore le clic
    enCours.value = true
    try {
      return await action(...args)
    } finally {
      enCours.value = false // succès ou erreur : le bouton redevient cliquable
    }
  }

  return { executer, enCours }
}
