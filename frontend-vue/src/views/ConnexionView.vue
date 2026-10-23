<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { apiPostPublic, saveToken, saveUser, getToken } from '@/api/client'
import { useAction } from '@/composables/useAction'
import { marque } from '@/config/marque'
import ChampMotDePasse from '@/components/ChampMotDePasse.vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'

// Connexion (V6) : remplace pages/login.html, dans le même style (fond dégradé, logo en filigrane).
// Le token reste dans localStorage (omb_token), partagé avec l'ancien frontend (décision du 2026-10-23).
const router = useRouter()
const email = ref('')
const motDePasse = ref('')
const erreur = ref('')

// Logo en filigrane : passé au CSS par une variable (marque blanche, rien d'écrit en dur)
const filigrane = { '--logo-filigrane': `url(${marque.logo})` }

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
  <main class="page-connexion" :style="filigrane">
    <div class="carte">
      <header class="entete">
        <img :src="marque.logo" :alt="marque.nom" class="logo" />
        <h1>{{ marque.nom }}</h1>
        <p>Accédez à votre espace</p>
      </header>

      <Message v-if="erreur" severity="error" role="alert" class="erreur">{{ erreur }}</Message>

      <form class="formulaire" @submit.prevent="seConnecter">
        <div class="champ">
          <label for="connexion-email">Email</label>
          <InputText
            id="connexion-email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="votre@email.com"
            required
          />
        </div>
        <div class="champ">
          <label for="connexion-mot-de-passe">Mot de passe</label>
          <ChampMotDePasse id="connexion-mot-de-passe" v-model="motDePasse" />
        </div>
        <Button type="submit" label="Se connecter" :loading="enCours" class="bouton-connexion" />
      </form>
      <p class="oubli">
        <RouterLink :to="{ name: 'mot-de-passe-oublie' }" data-test="mot-de-passe-oublie">
          Mot de passe oublié ?
        </RouterLink>
      </p>
    </div>
  </main>
</template>

<style scoped>
/* Toute la page : dégradé aux couleurs de la marque, défilement vertical toujours possible
   (petit écran, clavier d'une tablette) */
.page-connexion {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  overflow-x: hidden;
  background: linear-gradient(135deg, var(--color-brand-dark) 0%, var(--color-brand-light) 100%);
}
/* Grand logo en filigrane derrière la carte */
.page-connexion::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(600px, 90vw);
  aspect-ratio: 1;
  background: var(--logo-filigrane) center / contain no-repeat;
  opacity: 0.08;
  pointer-events: none;
}
.carte {
  position: relative;
  width: 100%;
  max-width: 450px;
  padding: 40px 32px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  animation: apparition 0.5s ease-out;
}
@keyframes apparition {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
}
.entete {
  text-align: center;
  margin-bottom: 28px;
}
.logo {
  width: 100px;
  height: 100px;
}
.entete h1 {
  margin: 12px 0 6px;
  font-size: 2rem;
  color: var(--color-brand-dark);
}
.entete p {
  margin: 0;
  color: var(--color-brand-light);
}
.oubli {
  margin: 20px 0 0;
  text-align: center;
}
.oubli a {
  display: inline-block;
  padding: 10px; /* zone tactile d'au moins 44 px */
  color: var(--color-brand-light);
}
.erreur {
  margin-bottom: 16px;
}
.bouton-connexion {
  width: 100%;
  margin-top: 8px;
  min-height: 48px;
}
@media (max-width: 480px) {
  .carte {
    padding: 32px 20px;
  }
}
</style>
