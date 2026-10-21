// Thème (couleurs de la marque) puis CSS de l'ancien frontend, partagés pendant la migration
import '../../frontend/css/theme.css'
import '../../frontend/css/style.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'

import App from './App.vue'
import router from './router'
import { marque } from './config/marque'
import { optionsPrimeVue } from './config/primevue'

document.title = marque.nom

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue, optionsPrimeVue)

app.mount('#app')
