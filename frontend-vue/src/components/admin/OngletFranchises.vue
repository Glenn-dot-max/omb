<script setup>
import { ref, onMounted } from 'vue'
import { apiGet, apiPost, apiPut, apiDelete } from '@/api/client'
import { useNotificationsStore } from '@/stores/notifications'
import { useAction } from '@/composables/useAction'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Tag from 'primevue/tag'

const notifications = useNotificationsStore()
const confirm = useConfirm()

const franchises = ref([])
const chargement = ref(false)

// Fenêtre de création / modification
const fenetreOuverte = ref(false)
const franchiseEnCours = ref(null) // null = création, sinon la franchise modifiée
const formulaire = ref(formulaireVide())

function formulaireVide() {
  return { nom: '', city: '', address: '', phone: '', email: '' }
}

async function charger() {
  chargement.value = true
  try {
    franchises.value = await apiGet('/admin/franchises')
  } catch (e) {
    notifications.erreur(e.message)
  } finally {
    chargement.value = false
  }
}
onMounted(charger)

function ouvrirCreation() {
  franchiseEnCours.value = null
  formulaire.value = formulaireVide()
  fenetreOuverte.value = true
}

function ouvrirModification(franchise) {
  franchiseEnCours.value = franchise
  formulaire.value = {
    nom: franchise.nom,
    city: franchise.city || '',
    address: franchise.address || '',
    phone: franchise.phone || '',
    email: franchise.email || '',
  }
  fenetreOuverte.value = true
}

const { executer: enregistrer, enCours: enregistrementEnCours } = useAction(async () => {
  // Champs vides -> null ; uniquement les champs attendus par le backend (extra = 'forbid')
  const f = formulaire.value
  const donnees = {
    nom: f.nom.trim(),
    city: f.city.trim() || null,
    address: f.address.trim() || null,
    phone: f.phone.trim() || null,
    email: f.email.trim() || null,
  }
  if (!donnees.nom) {
    notifications.erreur('Le nom de la franchise est obligatoire')
    return
  }
  try {
    if (franchiseEnCours.value) {
      await apiPut(`/admin/franchises/${franchiseEnCours.value.id}`, donnees)
      notifications.succes('✅ Franchise modifiée')
    } else {
      await apiPost('/admin/franchises', donnees)
      notifications.succes('✅ Franchise créée')
    }
    fenetreOuverte.value = false
    await charger()
  } catch (e) {
    notifications.erreur(e.message)
  }
})

const { executer: changerStatut } = useAction(async (franchise) => {
  try {
    if (franchise.active) {
      await apiDelete(`/admin/franchises/${franchise.id}`)
      notifications.succes('✅ Franchise désactivée')
    } else {
      await apiPut(`/admin/franchises/${franchise.id}`, { active: true })
      notifications.succes('✅ Franchise réactivée')
    }
    await charger()
  } catch (e) {
    notifications.erreur(e.message)
  }
})

function demanderChangementStatut(franchise) {
  const action = franchise.active ? 'désactiver' : 'réactiver'
  confirm.require({
    header: 'Confirmation',
    message: `Voulez-vous vraiment ${action} la franchise « ${franchise.nom} » ?`,
    acceptProps: {
      label: franchise.active ? 'Désactiver' : 'Réactiver',
      severity: franchise.active ? 'danger' : 'success',
    },
    rejectProps: { label: 'Annuler', severity: 'secondary', outlined: true },
    accept: () => changerStatut(franchise),
  })
}
</script>

<template>
  <section>
    <div class="entete-onglet">
      <h3>🏢 Franchises</h3>
      <Button label="Nouvelle franchise" @click="ouvrirCreation" />
    </div>

    <div class="tableau-defilable">
      <DataTable
        :value="franchises"
        :loading="chargement"
        data-key="id"
        sort-field="nom"
        :sort-order="1"
      >
        <template #empty>Aucune franchise</template>
        <Column field="nom" header="Nom" sortable />
        <Column field="city" header="Ville" sortable>
          <template #body="{ data }">{{ data.city || '-' }}</template>
        </Column>
        <Column field="email" header="Email">
          <template #body="{ data }">{{ data.email || '-' }}</template>
        </Column>
        <Column field="phone" header="Téléphone">
          <template #body="{ data }">{{ data.phone || '-' }}</template>
        </Column>
        <Column field="active" header="Statut" sortable>
          <template #body="{ data }">
            <Tag
              :value="data.active ? 'Active' : 'Inactive'"
              :severity="data.active ? 'success' : 'secondary'"
            />
          </template>
        </Column>
        <Column header="Actions">
          <template #body="{ data }">
            <div class="actions">
              <Button
                label="Modifier"
                size="small"
                severity="secondary"
                outlined
                :data-test="`modifier-${data.id}`"
                @click="ouvrirModification(data)"
              />
              <Button
                :label="data.active ? 'Désactiver' : 'Réactiver'"
                size="small"
                :severity="data.active ? 'danger' : 'success'"
                outlined
                :data-test="`statut-${data.id}`"
                @click="demanderChangementStatut(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Un clic hors de la fenêtre ne la ferme pas (dismissableMask à false par défaut) -->
    <Dialog
      v-model:visible="fenetreOuverte"
      modal
      :header="franchiseEnCours ? 'Modifier la franchise' : 'Nouvelle franchise'"
      :style="{ width: '32rem' }"
      :breakpoints="{ '768px': '95vw' }"
    >
      <form id="formulaire-franchise" class="formulaire" @submit.prevent="enregistrer">
        <div class="champ">
          <label for="franchise-nom">Nom de la franchise *</label>
          <InputText id="franchise-nom" v-model="formulaire.nom" maxlength="100" />
        </div>
        <div class="champ">
          <label for="franchise-ville">Ville</label>
          <InputText id="franchise-ville" v-model="formulaire.city" />
        </div>
        <div class="champ">
          <label for="franchise-adresse">Adresse</label>
          <Textarea id="franchise-adresse" v-model="formulaire.address" rows="2" />
        </div>
        <div class="champ">
          <label for="franchise-telephone">Téléphone</label>
          <InputText id="franchise-telephone" v-model="formulaire.phone" type="tel" />
        </div>
        <div class="champ">
          <label for="franchise-email">Email</label>
          <InputText id="franchise-email" v-model="formulaire.email" type="email" />
        </div>
      </form>
      <template #footer>
        <Button label="Annuler" severity="secondary" outlined @click="fenetreOuverte = false" />
        <Button
          type="submit"
          form="formulaire-franchise"
          label="Enregistrer"
          :loading="enregistrementEnCours"
        />
      </template>
    </Dialog>
  </section>
</template>

<style scoped>
.entete-onglet {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
/* Sur tablette portrait, le tableau défile horizontalement au lieu d'élargir la page */
.tableau-defilable {
  overflow-x: auto;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.formulaire {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.champ {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
