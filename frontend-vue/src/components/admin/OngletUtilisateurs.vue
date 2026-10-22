<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiGet, apiPost, apiPut, apiDelete } from '@/api/client'
import { useNotificationsStore } from '@/stores/notifications'
import { useUtilisateurStore } from '@/stores/utilisateur'
import { useAction } from '@/composables/useAction'
import { genererMotDePasse, verifierNouveauMotDePasse } from '@/utils/motDePasse'
import { ROLES, libelleRole } from '@/utils/roles'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Tag from 'primevue/tag'

const notifications = useNotificationsStore()
const moi = useUtilisateurStore()
const confirm = useConfirm()

const utilisateurs = ref([])
const franchises = ref([])
const chargement = ref(false)
const filtreFranchise = ref(null)

// Franchises inactives gardées dans les listes (un compte peut y être encore rattaché), signalées
const optionsFranchises = computed(() =>
  franchises.value.map((f) => ({ id: f.id, libelle: f.active ? f.nom : `${f.nom} (inactive)` })),
)
const utilisateursAffiches = computed(() =>
  filtreFranchise.value
    ? utilisateurs.value.filter((u) => u.franchise_id === filtreFranchise.value)
    : utilisateurs.value,
)
const estMoi = (utilisateur) => utilisateur.id === moi.utilisateur?.id

const SEVERITE_ROLE = { TECH_ADMIN: 'warn', CATALOG_ADMIN: 'info', USER: 'secondary' }
const severiteRole = (role) => SEVERITE_ROLE[String(role || 'USER').toUpperCase()] || 'secondary'

async function charger() {
  chargement.value = true
  try {
    const [listeUtilisateurs, listeFranchises] = await Promise.all([
      apiGet('/admin/users'),
      apiGet('/admin/franchises'),
    ])
    utilisateurs.value = listeUtilisateurs
    franchises.value = listeFranchises
  } catch (e) {
    notifications.erreur(e.message)
  } finally {
    chargement.value = false
  }
}
onMounted(charger)

// ---------- Fenêtre de création / modification ----------
const fenetreOuverte = ref(false)
const utilisateurEnCours = ref(null) // null = création
const formulaire = ref(formulaireVide())

function formulaireVide() {
  return {
    email: '',
    full_name: '',
    role: 'USER',
    franchise_id: null,
    password: genererMotDePasse(),
  }
}

function ouvrirCreation() {
  utilisateurEnCours.value = null
  formulaire.value = formulaireVide()
  fenetreOuverte.value = true
}

function ouvrirModification(utilisateur) {
  utilisateurEnCours.value = utilisateur
  formulaire.value = {
    email: utilisateur.email,
    full_name: utilisateur.full_name || '',
    role: String(utilisateur.role || 'USER').toUpperCase(),
    franchise_id: utilisateur.franchise_id || null,
    password: '',
  }
  fenetreOuverte.value = true
}

const { executer: enregistrer, enCours: enregistrementEnCours } = useAction(async () => {
  const f = formulaire.value
  // Uniquement les champs attendus par le backend (extra = 'forbid')
  const donnees = {
    email: f.email.trim(),
    full_name: f.full_name.trim(),
    role: f.role,
    franchise_id: f.franchise_id || null,
  }
  if (!donnees.email || !donnees.full_name) {
    notifications.erreur("L'email et le nom sont obligatoires")
    return
  }
  if (donnees.role === 'USER' && !donnees.franchise_id) {
    notifications.erreur('Choisissez une franchise pour un utilisateur')
    return
  }
  const creation = !utilisateurEnCours.value
  if (creation) {
    const erreur = verifierNouveauMotDePasse('', f.password, f.password)
    if (erreur) {
      notifications.erreur(erreur)
      return
    }
    donnees.password = f.password
  }
  try {
    if (creation) {
      await apiPost('/admin/users', donnees)
      fenetreOuverte.value = false
      afficherMotDePasse(donnees.email, donnees.password, 'Compte créé')
    } else {
      await apiPut(`/admin/users/${utilisateurEnCours.value.id}`, donnees)
      fenetreOuverte.value = false
      notifications.succes('✅ Utilisateur modifié')
    }
    await charger()
  } catch (e) {
    notifications.erreur(e.message)
  }
})

// ---------- Mot de passe provisoire à transmettre ----------
const motDePasseAffiche = ref(null) // { titre, email, motDePasse }

function afficherMotDePasse(email, motDePasse, titre) {
  motDePasseAffiche.value = { titre, email, motDePasse }
}

async function copierMotDePasse() {
  try {
    await navigator.clipboard.writeText(motDePasseAffiche.value.motDePasse)
    notifications.succes('📋 Mot de passe copié')
  } catch {
    notifications.avertissement(
      'Copie impossible : sélectionnez le mot de passe et copiez-le à la main',
    )
  }
}

const { executer: reinitialiser } = useAction(async (utilisateur) => {
  const motDePasse = genererMotDePasse()
  try {
    await apiPost(`/admin/users/${utilisateur.id}/reset-password`, { new_password: motDePasse })
    afficherMotDePasse(utilisateur.email, motDePasse, 'Mot de passe réinitialisé')
  } catch (e) {
    notifications.erreur(e.message)
  }
})

function demanderReinitialisation(utilisateur) {
  confirm.require({
    header: 'Réinitialiser le mot de passe',
    message: `Un nouveau mot de passe provisoire va être créé pour ${utilisateur.email}. L'ancien ne fonctionnera plus.`,
    acceptProps: { label: 'Réinitialiser', severity: 'warn' },
    rejectProps: { label: 'Annuler', severity: 'secondary', outlined: true },
    accept: () => reinitialiser(utilisateur),
  })
}

// ---------- Activation / désactivation ----------
const { executer: changerStatut } = useAction(async (utilisateur) => {
  try {
    if (utilisateur.active) {
      await apiDelete(`/admin/users/${utilisateur.id}`)
      notifications.succes('✅ Utilisateur désactivé')
    } else {
      await apiPut(`/admin/users/${utilisateur.id}`, { active: true })
      notifications.succes('✅ Utilisateur réactivé')
    }
    await charger()
  } catch (e) {
    notifications.erreur(e.message)
  }
})

function demanderChangementStatut(utilisateur) {
  const action = utilisateur.active ? 'désactiver' : 'réactiver'
  confirm.require({
    header: 'Confirmation',
    message: `Voulez-vous vraiment ${action} le compte de ${utilisateur.email} ?`,
    acceptProps: {
      label: utilisateur.active ? 'Désactiver' : 'Réactiver',
      severity: utilisateur.active ? 'danger' : 'success',
    },
    rejectProps: { label: 'Annuler', severity: 'secondary', outlined: true },
    accept: () => changerStatut(utilisateur),
  })
}
</script>

<template>
  <section>
    <div class="entete-onglet">
      <h3>👥 Utilisateurs</h3>
      <div class="outils">
        <Select
          v-model="filtreFranchise"
          :options="optionsFranchises"
          option-label="libelle"
          option-value="id"
          placeholder="Toutes les franchises"
          show-clear
          input-id="filtre-franchise"
          aria-label="Filtrer par franchise"
        />
        <Button label="Nouvel utilisateur" @click="ouvrirCreation" />
      </div>
    </div>

    <div class="tableau-defilable">
      <DataTable
        :value="utilisateursAffiches"
        :loading="chargement"
        data-key="id"
        sort-field="email"
        :sort-order="1"
      >
        <template #empty>Aucun utilisateur</template>
        <Column field="email" header="Email" sortable />
        <Column field="full_name" header="Nom" sortable>
          <template #body="{ data }">{{ data.full_name || '-' }}</template>
        </Column>
        <Column header="Franchise">
          <template #body="{ data }">{{ data.franchises?.nom || '-' }}</template>
        </Column>
        <Column field="role" header="Rôle" sortable>
          <template #body="{ data }">
            <Tag :value="libelleRole(data.role)" :severity="severiteRole(data.role)" />
          </template>
        </Column>
        <Column field="active" header="Statut" sortable>
          <template #body="{ data }">
            <Tag
              :value="data.active ? 'Actif' : 'Inactif'"
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
                label="Mot de passe"
                size="small"
                severity="secondary"
                outlined
                :data-test="`mot-de-passe-${data.id}`"
                @click="demanderReinitialisation(data)"
              />
              <!-- Pas de désactivation de son propre compte (refusée aussi par le serveur) -->
              <Button
                v-if="!estMoi(data)"
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

    <!-- Création / modification -->
    <Dialog
      v-model:visible="fenetreOuverte"
      modal
      :header="utilisateurEnCours ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'"
      :style="{ width: '32rem' }"
      :breakpoints="{ '768px': '95vw' }"
    >
      <form id="formulaire-utilisateur" class="formulaire" @submit.prevent="enregistrer">
        <div class="champ">
          <label for="utilisateur-email">Email *</label>
          <InputText id="utilisateur-email" v-model="formulaire.email" type="email" />
        </div>
        <div class="champ">
          <label for="utilisateur-nom">Nom complet *</label>
          <InputText id="utilisateur-nom" v-model="formulaire.full_name" />
        </div>
        <div class="champ">
          <label for="utilisateur-role">Rôle *</label>
          <Select
            v-model="formulaire.role"
            :options="ROLES"
            option-label="libelle"
            option-value="valeur"
            input-id="utilisateur-role"
            :disabled="!!utilisateurEnCours && estMoi(utilisateurEnCours)"
          />
          <small v-if="utilisateurEnCours && estMoi(utilisateurEnCours)" class="aide-champ">
            Vous ne pouvez pas changer votre propre rôle.
          </small>
        </div>
        <div class="champ">
          <label for="utilisateur-franchise">
            {{ formulaire.role === 'USER' ? 'Franchise *' : 'Franchise (facultatif)' }}
          </label>
          <Select
            v-model="formulaire.franchise_id"
            :options="optionsFranchises"
            option-label="libelle"
            option-value="id"
            placeholder="Choisir une franchise"
            show-clear
            input-id="utilisateur-franchise"
          />
        </div>
        <div v-if="!utilisateurEnCours" class="champ">
          <label for="utilisateur-mot-de-passe">Mot de passe provisoire *</label>
          <div class="ligne">
            <InputText id="utilisateur-mot-de-passe" v-model="formulaire.password" />
            <Button
              type="button"
              label="Générer"
              severity="secondary"
              outlined
              @click="formulaire.password = genererMotDePasse()"
            />
          </div>
          <small class="aide-champ">L'utilisateur devra le changer à sa première connexion.</small>
        </div>
      </form>
      <template #footer>
        <Button label="Annuler" severity="secondary" outlined @click="fenetreOuverte = false" />
        <Button
          type="submit"
          form="formulaire-utilisateur"
          label="Enregistrer"
          :loading="enregistrementEnCours"
        />
      </template>
    </Dialog>

    <!-- Mot de passe provisoire à transmettre (création ou réinitialisation) -->
    <Dialog
      :visible="!!motDePasseAffiche"
      modal
      :header="motDePasseAffiche?.titre"
      :style="{ width: '28rem' }"
      :breakpoints="{ '768px': '95vw' }"
      @update:visible="motDePasseAffiche = null"
    >
      <div v-if="motDePasseAffiche" class="formulaire">
        <p>
          Mot de passe provisoire de <strong>{{ motDePasseAffiche.email }}</strong
          >, à lui transmettre (il devra le changer à sa première connexion) :
        </p>
        <p id="mot-de-passe-provisoire" class="mot-de-passe">{{ motDePasseAffiche.motDePasse }}</p>
        <p class="aide-champ">Copiez-le maintenant : il ne sera plus affiché.</p>
      </div>
      <template #footer>
        <Button label="Copier" severity="secondary" outlined @click="copierMotDePasse" />
        <Button label="Fermer" @click="motDePasseAffiche = null" />
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
.outils {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
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
.mot-de-passe {
  font-family: monospace;
  font-size: 1.4rem;
  letter-spacing: 0.1em;
  text-align: center;
  user-select: all;
}
</style>
