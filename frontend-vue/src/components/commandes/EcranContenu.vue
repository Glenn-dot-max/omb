<script setup>
import { ref, watch, onMounted } from 'vue'
import { apiGet } from '@/api/client'
import { useUtilisateurStore } from '@/stores/utilisateur'
import { useNotificationsStore } from '@/stores/notifications'
import {
  pourMaFranchise,
  chercher,
  ajouterFormule,
  retirerFormule,
  basculerExclusion,
  ajouterProduit,
  retirerProduit,
} from '@/utils/contenuCommande'
import AutoComplete from 'primevue/autocomplete'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'

// Écran 2 de la commande : formules (avec leurs couverts et leurs exclusions) et produits ajoutés
const commande = defineModel({ type: Object, required: true })
const props = defineProps({
  couvertsProposes: { type: Number, required: true }, // parts produites (écran 1)
})

const utilisateur = useUtilisateurStore()
const notifications = useNotificationsStore()

// ---------- Catalogue de la franchise ----------
const formules = ref([])
const produits = ref([])
const unites = ref([])
onMounted(async () => {
  try {
    const [listeFormules, listeProduits, listeUnites] = await Promise.all([
      apiGet('/formules/'),
      apiGet('/produits/'),
      apiGet('/unite/'),
    ])
    const maFranchise = utilisateur.utilisateur?.franchise_id
    formules.value = pourMaFranchise(listeFormules, maFranchise)
    produits.value = pourMaFranchise(listeProduits, maFranchise)
    unites.value = listeUnites.map((u) => u.nom.trim())
    uniteChoisie.value = unites.value.includes('unité') ? 'unité' : unites.value[0] || null
  } catch (e) {
    notifications.erreur(e.message)
  }
})

// ---------- Formules ----------
const rechercheFormule = ref('')
const suggestionsFormules = ref([])
function choisirFormule({ value: formule }) {
  if (commande.value.formules.some((f) => f.formule_id === formule.id)) {
    notifications.avertissement('Cette formule est déjà dans la commande.')
  } else {
    commande.value = ajouterFormule(commande.value, formule, props.couvertsProposes)
  }
  rechercheFormule.value = ''
}

// Composition d'une formule, chargée seulement quand on l'ouvre (une fois)
const compositions = ref({}) // formule_id -> liste des produits
const ouvertes = ref({}) // formule_id -> composition affichée ?
async function basculerComposition(formuleId) {
  ouvertes.value[formuleId] = !ouvertes.value[formuleId]
  if (!ouvertes.value[formuleId] || compositions.value[formuleId]) return
  try {
    compositions.value[formuleId] = await apiGet(`/formule-produits/formule/${formuleId}`)
  } catch (e) {
    ouvertes.value[formuleId] = false
    notifications.erreur(e.message)
  }
}

// ---------- Produits ajoutés ----------
const rechercheProduit = ref('')
const suggestionsProduits = ref([])
const produitChoisi = ref(null)
const quantiteProduit = ref(props.couvertsProposes)
const uniteChoisie = ref(null)
// L'écran 2 est créé dès l'ouverture du formulaire, quand les couverts valent encore 1 :
// la quantité proposée suit donc les parts saisies ensuite à l'écran 1
watch(
  () => props.couvertsProposes,
  (parts) => (quantiteProduit.value = parts),
)
function ajouterLeProduit() {
  if (!produitChoisi.value) {
    notifications.avertissement('Choisissez un produit dans la liste.')
    return
  }
  if (!(quantiteProduit.value > 0) || !uniteChoisie.value) {
    notifications.avertissement('Indiquez une quantité et une unité.')
    return
  }
  // On compare avec le résultat calculé ici, pas en relisant commande.value : la nouvelle valeur
  // n'est renvoyée par le parent (v-model) qu'au prochain rendu, après cette fonction.
  const nouvelle = ajouterProduit(
    commande.value,
    produitChoisi.value,
    quantiteProduit.value,
    uniteChoisie.value,
  )
  if (nouvelle === commande.value) {
    notifications.avertissement('Ce produit est déjà dans la commande avec cette unité.')
  } else {
    commande.value = nouvelle
  }
  produitChoisi.value = null
  rechercheProduit.value = ''
  quantiteProduit.value = props.couvertsProposes
}
</script>

<template>
  <div class="formulaire">
    <!-- ================= FORMULES ================= -->
    <section class="bloc-contenu">
      <h4>Formules</h4>
      <div class="champ">
        <label for="recherche-formule">Ajouter une formule</label>
        <AutoComplete
          v-model="rechercheFormule"
          :suggestions="suggestionsFormules"
          option-label="name"
          input-id="recherche-formule"
          placeholder="Tapez une partie du nom…"
          dropdown
          dropdown-mode="current"
          data-test="recherche-formule"
          @complete="suggestionsFormules = chercher(formules, $event.query)"
          @option-select="choisirFormule"
        />
      </div>

      <p v-if="!commande.formules.length" class="vide">Aucune formule.</p>
      <ul v-else class="liste">
        <li v-for="(formule, i) in commande.formules" :key="formule.formule_id" class="element">
          <div class="ligne-principale">
            <span class="nom">{{ formule.nom }}</span>
            <label :for="`couverts-${formule.formule_id}`" class="petit">Couverts</label>
            <InputNumber
              v-model="commande.formules[i].couverts"
              :input-id="`couverts-${formule.formule_id}`"
              :min="1"
              class="nombre"
            />
            <Button
              :label="ouvertes[formule.formule_id] ? 'Masquer' : 'Composition'"
              size="small"
              severity="secondary"
              text
              :data-test="`composition-${formule.formule_id}`"
              @click="basculerComposition(formule.formule_id)"
            />
            <Button
              label="Retirer"
              size="small"
              severity="danger"
              text
              :data-test="`retirer-formule-${formule.formule_id}`"
              @click="commande = retirerFormule(commande, formule.formule_id)"
            />
          </div>
          <p v-if="formule.produits_exclus.length" class="exclusions">
            {{ formule.produits_exclus.length }} produit(s) retiré(s) de cette formule
          </p>
          <!-- Composition : décocher un produit le retire de CETTE commande seulement -->
          <ul
            v-if="ouvertes[formule.formule_id] && compositions[formule.formule_id]"
            class="composition"
          >
            <li v-for="produit in compositions[formule.formule_id]" :key="produit.produit_id">
              <Checkbox
                :model-value="!formule.produits_exclus.includes(produit.produit_id)"
                :input-id="`compo-${formule.formule_id}-${produit.produit_id}`"
                binary
                @update:model-value="
                  commande = basculerExclusion(commande, formule.formule_id, produit.produit_id)
                "
              />
              <label :for="`compo-${formule.formule_id}-${produit.produit_id}`">
                {{ produit.produit_name }}
                <span class="petit">({{ produit.quantite }} {{ produit.unite }} / pers.)</span>
              </label>
            </li>
          </ul>
        </li>
      </ul>
    </section>

    <!-- ================= PRODUITS AJOUTÉS ================= -->
    <section class="bloc-contenu">
      <h4>Produits ajoutés (hors formule)</h4>
      <div class="ajout-produit">
        <div class="champ grand">
          <label for="recherche-produit">Produit</label>
          <AutoComplete
            v-model="rechercheProduit"
            :suggestions="suggestionsProduits"
            option-label="name"
            input-id="recherche-produit"
            placeholder="Tapez une partie du nom…"
            dropdown
            dropdown-mode="current"
            data-test="recherche-produit"
            @complete="suggestionsProduits = chercher(produits, $event.query)"
            @option-select="produitChoisi = $event.value"
          />
        </div>
        <div class="champ">
          <label for="quantite-produit">Quantité</label>
          <InputNumber
            v-model="quantiteProduit"
            input-id="quantite-produit"
            :min="0"
            :max-fraction-digits="2"
            class="nombre"
          />
        </div>
        <div class="champ">
          <label for="unite-produit">Unité</label>
          <Select v-model="uniteChoisie" :options="unites" input-id="unite-produit" />
        </div>
        <Button
          type="button"
          label="Ajouter"
          severity="secondary"
          outlined
          data-test="ajouter-produit"
          @click="ajouterLeProduit"
        />
      </div>

      <p v-if="!commande.produits.length" class="vide">Aucun produit ajouté.</p>
      <ul v-else class="liste">
        <li
          v-for="(produit, i) in commande.produits"
          :key="`${produit.produit_id}-${produit.unite}`"
          class="element ligne-principale"
        >
          <span class="nom">{{ produit.nom }}</span>
          <InputNumber
            v-model="commande.produits[i].quantite"
            :input-id="`quantite-${produit.produit_id}-${produit.unite}`"
            :min="0"
            :max-fraction-digits="2"
            class="nombre"
            :aria-label="`Quantité de ${produit.nom}`"
          />
          <span>{{ produit.unite }}</span>
          <Button
            label="Retirer"
            size="small"
            severity="danger"
            text
            :data-test="`retirer-produit-${produit.produit_id}`"
            @click="commande = retirerProduit(commande, produit.produit_id, produit.unite)"
          />
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.bloc-contenu {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.bloc-contenu h4 {
  margin: 0;
  color: var(--color-brand);
}
.liste,
.composition {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
/* (« element » et non « ligne » : .ligne existe déjà dans styles/formulaires.css) */
.element {
  padding: 8px 12px;
  background: var(--color-bg-cream);
  border: 1px solid var(--color-border-warm);
  border-left: 4px solid var(--color-primary);
  border-radius: 8px;
}
.ligne-principale {
  display: flex;
  align-items: center;
  gap: 8px 12px;
  flex-wrap: wrap;
}
.nom {
  flex: 1;
  min-width: 10rem;
  font-weight: 600;
  color: var(--color-brand-dark);
  overflow-wrap: anywhere;
}
.nombre :deep(input) {
  width: 5rem;
  text-align: center;
}
.composition {
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--color-bg-warm);
  border-radius: 6px;
}
.composition li {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
}
.ajout-produit {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}
.grand {
  flex: 1;
  min-width: 14rem;
}
.petit,
.exclusions,
.vide {
  font-size: 0.85rem;
  opacity: 0.8;
}
.exclusions,
.vide {
  margin: 4px 0 0;
}
</style>
