<script setup>
import { computed } from 'vue'
import { libelleType } from '@/utils/typesPrestation'
import { partsProduites } from '@/utils/nouvelleCommande'
import { formaterDate, jourCourt } from '@/utils/planning'
import Button from 'primevue/button'
import Tag from 'primevue/tag'

// Écran 3 : récapitulatif de la commande avant de l'enregistrer.
// « Modifier » renvoie à l'écran concerné, sans rien perdre.
const props = defineProps({ commande: { type: Object, required: true } })
defineEmits(['aller'])

const c = computed(() => props.commande)
const estMariage = computed(() => c.value.type_prestation === 'mariage')
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`
</script>

<template>
  <div class="recap">
    <Tag
      v-if="c.en_attente"
      value="Sera enregistrée EN ATTENTE de validation (hors planning)"
      severity="warn"
    />

    <section class="bloc-recap" data-test="recap-infos">
      <div class="entete-recap">
        <h4>Informations</h4>
        <Button
          label="Modifier"
          size="small"
          text
          data-test="modifier-1"
          @click="$emit('aller', '1')"
        />
      </div>
      <dl class="infos">
        <dt>Client</dt>
        <dd>{{ c.nom_client.trim() }}</dd>
        <dt>Prestation</dt>
        <dd>{{ libelleType(c.type_prestation) }}</dd>
        <dt>Livraison</dt>
        <dd>
          {{ jourCourt(c.delivery_date) }} {{ formaterDate(c.delivery_date) }} à
          {{ c.delivery_hour }}
        </dd>
        <template v-if="estMariage">
          <dt>Convives</dt>
          <dd>
            {{ pluriel(c.nb_adultes, 'adulte') }} + {{ pluriel(c.nb_enfants, 'enfant') }} (enfant à
            {{ c.taux_enfant }} %) = {{ pluriel(partsProduites(c), 'part') }}
          </dd>
        </template>
        <template v-else>
          <dt>Couverts</dt>
          <dd>{{ c.nombre_couverts }}</dd>
        </template>
        <dt>Pondération</dt>
        <dd>
          {{ c.ponderation }} %
          <span v-if="c.ponderation !== 100" class="precision" data-test="recap-arrondi">
            (quantités des formules et produits arrondies à l'unité supérieure)
          </span>
        </dd>
        <dt>Service</dt>
        <dd>
          {{ c.avec_service ? 'Avec service' : 'Sans service' }}
          <template v-if="c.avec_service && c.nb_repas_personnel > 0">
            · {{ c.nb_repas_personnel }} repas du personnel
          </template>
        </dd>
        <dt>Note</dt>
        <dd class="note">{{ c.a_une_note && c.notes.trim() ? c.notes.trim() : 'Aucune' }}</dd>
      </dl>
    </section>

    <section class="bloc-recap" data-test="recap-contenu">
      <div class="entete-recap">
        <h4>Formules et produits</h4>
        <Button
          label="Modifier"
          size="small"
          text
          data-test="modifier-2"
          @click="$emit('aller', '2')"
        />
      </div>
      <ul class="contenu">
        <li v-for="f in c.formules" :key="f.formule_id">
          <strong>{{ f.nom }}</strong> · {{ pluriel(f.couverts, 'couvert') }}
          <span v-if="f.produits_exclus.length" class="precision">
            · {{ f.produits_exclus.length }} produit(s) retiré(s)
          </span>
        </li>
        <li v-for="p in c.produits" :key="`${p.produit_id}-${p.unite}`">
          <strong>{{ p.nom }}</strong> · {{ p.quantite }} {{ p.unite }}
          <span class="precision">(ajouté hors formule)</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.recap {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.bloc-recap {
  padding: 12px 16px;
  background: var(--color-bg-cream);
  border: 1px solid var(--color-border-warm);
  border-left: 4px solid var(--color-primary);
  border-radius: 8px;
}
.entete-recap {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.entete-recap h4 {
  margin: 0;
  color: var(--color-brand);
}
/* Libellés à gauche, valeurs à droite ; l'un sous l'autre sur écran étroit */
.infos {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 16px;
  margin: 8px 0 0;
}
.infos dt {
  font-weight: 600;
}
.infos dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.note {
  white-space: pre-line;
}
.contenu {
  margin: 8px 0 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.precision {
  font-size: 0.85rem;
  opacity: 0.8;
}
@media (max-width: 480px) {
  .infos {
    grid-template-columns: 1fr;
  }
}
</style>
