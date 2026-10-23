<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiPostPublic, saveToken, saveUser, getToken } from '@/api/client'
import { useAction } from '@/composables/useAction'
import { marque } from '@/config/marque'
import ChampMotDePasse from '@/components/ChampMotDePasse.vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'

// Connexion (V6) : remplace pages/login.html. Le token reste dans localStorage (omb_token),
// partagé avec l'ancien frontend (décision du 2026-10-23).
const router = useRouter()
const email = ref('')
const motDePasse = ref('')
const erreur = ref('')

// Déjà connecté : pas besoin de se reconnecter
onMounted(() => {
  if (getToken()) router.replace({ name: 'commandes' })
})

const { executer: seConnecter, enCours } = useAction(async () => {
  erreur.value = ''
  try {
    const reponse = await apiPostPublic('/auth/login', {
      email: email.value.trim(),
      password: motDePasse.value,
    })
    saveToken(reponse.access_token)
    saveUser(reponse.user)
    // Mot de passe provisoire : il faut le changer avant tout
    router.push({
      name: reponse.user.must_change_password ? 'changer-mot-de-passe' : 'commandes',
    })
  } catch (e) {
    erreur.value = e.message
  }
})
</script>

<template>
  <main class="container connexion">
    <div class="form-card">
      <h2 class="titre">{{ marque.emoji }} {{ marque.nom }}</h2>
      <p class="sous-titre">Accédez à votre espace</p>

      <Message v-if="erreur" severity="error" role="alert">{{ erreur }}</Message>

      <form class="formulaire" @submit.prevent="seConnecter">
        <div class="champ">
          <label for="connexion-email">Email</label>
          <InputText
            id="connexion-email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
          />
        </div>
        <div class="champ">
          <label for="connexion-mot-de-passe">Mot de passe</label>
          <ChampMotDePasse id="connexion-mot-de-passe" v-model="motDePasse" />
        </div>
        <div class="boutons">
          <Button type="submit" label="Se connecter" :loading="enCours" class="bouton-connexion" />
        </div>
      </form>
    </div>
  </main>
</template>

<style scoped>
.connexion {
  max-width: 26rem;
  margin: 10vh auto 0;
}
.titre {
  margin: 0;
  text-align: center;
  color: var(--color-brand);
}
.sous-titre {
  margin: 4px 0 16px;
  text-align: center;
  opacity: 0.75;
}
.bouton-connexion {
  width: 100%;
}
</style>
