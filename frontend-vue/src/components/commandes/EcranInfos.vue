<script setup>
import { ref, computed } from 'vue'
import { TYPES_PRESTATION } from '@/utils/typesPrestation'
import { changerNote, partsProduites, NOTE_PAR_DEFAUT } from '@/utils/nouvelleCommande'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import Popover from 'primevue/popover'

// Écran 1 de la commande : informations générales et service.
// Ordre demandé par la cuisine : le type de prestation AVANT le nombre de couverts.
const commande = defineModel({ type: Object, required: true })
defineProps({ aujourdhui: { type: String, required: true } })

const OUI_NON = [
  { valeur: false, libelle: 'Non' },
  { valeur: true, libelle: 'Oui' },
]
const SERVICE = [
  { valeur: false, libelle: 'Sans service' },
  { valeur: true, libelle: 'Avec service' },
]

const estMariage = computed(() => commande.value.type_prestation === 'mariage')
const convives = computed(() => (commande.value.nb_adultes || 0) + (commande.value.nb_enfants || 0))
const parts = computed(() => partsProduites(commande.value))

function repondreNote(oui) {
  if (oui === null) return // SelectButton envoie null si on reclique sur le choix actif
  commande.value = changerNote(commande.value, oui)
}
function choisirService(avec) {
  if (avec !== null) commande.value.avec_service = avec
}

// Petite fenêtre d'aide de la pondération (bouton « ? »)
const aidePonderation = ref()
</script>

<template>
  <div class="formulaire">
    <div class="champ">
      <label for="commande-client">Client *</label>
      <InputText id="commande-client" v-model="commande.nom_client" maxlength="200" />
    </div>

    <div class="champ">
      <label for="commande-type">Type de prestation *</label>
      <Select
        v-model="commande.type_prestation"
        :options="TYPES_PRESTATION"
        option-label="libelle"
        option-value="valeur"
        input-id="commande-type"
      />
    </div>

    <!-- Mariage : convives en deux nombres et part d'un enfant ; sinon : couverts -->
    <div v-if="estMariage" class="grille-champs">
      <div class="champ">
        <label for="commande-adultes">Adultes *</label>
        <InputNumber v-model="commande.nb_adultes" input-id="commande-adultes" :min="0" />
      </div>
      <div class="champ">
        <label for="commande-enfants">Enfants *</label>
        <InputNumber v-model="commande.nb_enfants" input-id="commande-enfants" :min="0" />
      </div>
      <div class="champ">
        <label for="commande-taux-enfant">Part d'un enfant</label>
        <InputNumber
          v-model="commande.taux_enfant"
          input-id="commande-taux-enfant"
          suffix=" %"
          :min="0"
          :max="100"
        />
      </div>
      <p class="aide-champ resume-convives">
        {{ convives }} convives · {{ parts }} parts produites
      </p>
    </div>
    <div v-else class="champ">
      <label for="commande-couverts">Nombre de couverts *</label>
      <InputNumber v-model="commande.nombre_couverts" input-id="commande-couverts" :min="1" />
    </div>

    <div class="grille-champs">
      <div class="champ">
        <label for="commande-date">Date de livraison *</label>
        <InputText
          id="commande-date"
          v-model="commande.delivery_date"
          type="date"
          :min="aujourdhui"
        />
      </div>
      <div class="champ">
        <label for="commande-heure">Heure de livraison *</label>
        <InputText id="commande-heure" v-model="commande.delivery_hour" type="time" />
      </div>
      <div class="champ">
        <!-- Libellé et bouton « ? » sur la même ligne -->
        <label for="commande-ponderation" class="libelle-avec-aide">
          Pondération
          <Button
            type="button"
            label="?"
            text
            rounded
            size="small"
            class="bouton-aide"
            aria-label="À quoi sert la pondération ?"
            data-test="aide-ponderation"
            @click="aidePonderation.toggle($event)"
          />
        </label>
        <InputNumber
          v-model="commande.ponderation"
          input-id="commande-ponderation"
          suffix=" %"
          :min="1"
          :max="1000"
        />
        <Popover ref="aidePonderation">
          <p class="texte-aide" data-test="texte-aide-ponderation">
            La pondération s'applique aux quantités <strong>des formules et des produits</strong> de
            la commande (100 % = quantités normales, 90 % = 10 % de moins).<br />
            Les quantités pondérées sont <strong>arrondies à l'unité supérieure</strong>.
          </p>
        </Popover>
      </div>
    </div>

    <!-- Sur une ligne : service, repas du personnel (si avec service), et la note à droite -->
    <div class="ligne-choix">
      <div class="champ">
        <span class="libelle">Service</span>
        <SelectButton
          :model-value="commande.avec_service"
          :options="SERVICE"
          option-label="libelle"
          option-value="valeur"
          aria-label="Service"
          data-test="service"
          @update:model-value="choisirService"
        />
      </div>
      <div v-if="commande.avec_service" class="champ">
        <label for="commande-repas">Repas du personnel</label>
        <!-- Compteur : boutons − et + de chaque côté, pratiques au doigt sur tablette -->
        <InputNumber
          v-model="commande.nb_repas_personnel"
          input-id="commande-repas"
          :min="0"
          show-buttons
          button-layout="horizontal"
          class="compteur"
          title="0 si aucun repas à prévoir"
        />
      </div>
      <div class="champ choix-note">
        <span class="libelle">Ajouter une note ?</span>
        <SelectButton
          :model-value="commande.a_une_note"
          :options="OUI_NON"
          option-label="libelle"
          option-value="valeur"
          aria-label="Ajouter une note ?"
          data-test="note"
          @update:model-value="repondreNote"
        />
      </div>
    </div>

    <div v-if="commande.a_une_note" class="champ">
      <label for="commande-notes">Note</label>
      <!-- Texte proposé par défaut : en italique et en gris, pour le distinguer d'une vraie note -->
      <Textarea
        id="commande-notes"
        v-model="commande.notes"
        rows="3"
        maxlength="5000"
        :class="{ 'note-par-defaut': commande.notes === NOTE_PAR_DEFAUT }"
      />
    </div>

    <div class="case-a-cocher">
      <Checkbox v-model="commande.en_attente" input-id="commande-en-attente" binary />
      <label for="commande-en-attente">Commande en attente de validation</label>
    </div>
  </div>
</template>

<style scoped>
.grille-champs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  align-items: end; /* champs alignés en bas, même si un libellé est plus haut (bouton « ? ») */
}
.resume-convives {
  grid-column: 1 / -1;
  margin: 0;
}
.libelle {
  font-weight: 600;
}
.ligne-choix {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 16px 32px;
}
.choix-note {
  margin-left: auto; /* poussée à droite */
}
.libelle-avec-aide {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
.bouton-aide {
  width: 28px;
  height: 28px;
  flex: none;
}
.texte-aide {
  max-width: 300px;
  margin: 0;
}
/* Compteur étroit : le champ du nombre ne prend que la place de 3 chiffres */
.compteur :deep(input) {
  width: 3.5rem;
  text-align: center;
}
.note-par-defaut {
  font-style: italic;
  color: var(--p-surface-600); /* gris foncé du thème PrimeVue */
}
.case-a-cocher {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
}
</style>
