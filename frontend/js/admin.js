// ==============================================
// VÉRIFICATION AUTHENTIFICATION
// ==============================================

// Vérifier que l'utilisateur est connecté et TECH_ADMIN
if (!requireAuth()) {
  // Redirige vers login si non connecté
}

const currentUser = getUser();

// Vérifier le rôle TECH_ADMIN
if (currentUser.role !== "TECH_ADMIN") {
  alert(
    "❌ Accès refusé : Vous devez être administrateur pour accéder à cette page.",
  );
  window.location.href = "/pages/produits.html";
}

// Afficher le menu burger
displayUserInfo();

// ==============================================
// VARIABLES GLOBALES
// ==============================================

let franchises = [];
let users = [];
let currentFranchiseId = null; // Pour l'édition
let currentUserId = null; // Pour l'édition

// ==============================================
// INITIALISATION
// ==============================================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🔧 Admin page loaded");

  // Charger les données
  await loadFranchises();
  await loadUsers();

  await loadFranchisesForPermissions();

  // Gestion des onglets
  setupTabs();

  // Gestion des boutons "Nouvelle franchise/utilisateur"
  setupButtons();

  // Gestion des formulaires
  setupForms();
});

// ==============================================
// GESTION DES ONGLETS
// ==============================================

function setupTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.dataset.tab;

      // Désactiver tous les onglets
      tabButtons.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      // Activer l'onglet cliqué
      btn.classList.add("active");
      document.getElementById(`${tabName}-tab`).classList.add("active");
    });
  });
}

// ==============================================
// BOUTONS PRINCIPAUX
// ==============================================

function setupButtons() {
  document.getElementById("btn-new-franchise").addEventListener("click", () => {
    openFranchiseModal();
  });

  document.getElementById("btn-new-user").addEventListener("click", () => {
    openUserModal();
  });
}

// ==============================================
// FORMULAIRES
// ==============================================

function setupForms() {
  // Formulaire franchise
  document
    .getElementById("franchise-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      await saveFranchise();
    });

  // Formulaire utilisateur
  document.getElementById("user-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveUser();
  });
}

// ==============================================
// CHARGER LES FRANCHISES
// ==============================================

async function loadFranchises() {
  try {
    console.log("📡 Chargement des franchises...");
    const data = await apiGet("/admin/franchises");
    franchises = data;

    console.log(`✅ ${franchises.length} franchises chargées`);

    // Afficher dans le tableau
    displayFranchises();

    // Remplir les selects
    populateFranchiseSelects();
  } catch (error) {
    console.error("❌ Erreur chargement franchises:", error);
    alert("Erreur lors du chargement des franchises");
  }
}

function displayFranchises() {
  const tbody = document.getElementById("franchises-tbody");

  if (franchises.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty">Aucune franchise</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = franchises
    .map(
      (f) => `
    <tr>
      <td>${f.nom}</td>
      <td>${f.city || "-"}</td>
      <td>${f.email || "-"}</td>
      <td>${f.phone || "-"}</td>
      <td>
        <span class="badge ${f.active ? "badge-success" : "badge-inactive"}">
          ${f.active ? "✅ Active" : "❌ Inactive"}
        </span>
      </td>
      <td class="actions">
        <button class="btn-icon" onclick="editFranchise('${f.id}')" title="Modifier">
          ✏️
        </button>
        <button class="btn-icon" onclick="toggleFranchise('${f.id}', ${f.active})" title="${
          f.active ? "Désactiver" : "Activer"
        }">
          ${f.active ? "❌" : "✅"}
        </button>
      </td>
    </tr>
  `,
    )
    .join("");
}

// Remplir les selects de franchise (pour créer un utilisateur)
function populateFranchiseSelects() {
  const selects = [
    document.getElementById("filter-franchise"),
    document.getElementById("user-franchise"),
  ];

  selects.forEach((select) => {
    // Garder la première option
    const firstOption = select.querySelector("option");

    // Vider et remettre la première option
    select.innerHTML = firstOption.outerHTML;

    // Ajouter les franchises actives
    franchises
      .filter((f) => f.active)
      .forEach((f) => {
        const option = document.createElement("option");
        option.value = f.id;
        option.textContent = f.nom;
        select.appendChild(option);
      });
  });

  // Filtre par franchise (pour l'onglet utilisateurs)
  document
    .getElementById("filter-franchise")
    .addEventListener("change", (e) => {
      displayUsers(e.target.value);
    });
}

// ==============================================
// CHARGER LES UTILISATEURS
// ==============================================

async function loadUsers() {
  try {
    console.log("📡 Chargement des utilisateurs...");
    const data = await apiGet("/admin/users");
    users = data;

    console.log(`✅ ${users.length} utilisateurs chargés`);

    // Afficher dans le tableau
    displayUsers();
  } catch (error) {
    console.error("❌ Erreur chargement utilisateurs:", error);
    alert("Erreur lors du chargement des utilisateurs");
  }
}

function displayUsers(franchiseFilter = "") {
  const tbody = document.getElementById("users-tbody");

  // Filtrer par franchise si nécessaire
  let filteredUsers = users;
  if (franchiseFilter) {
    filteredUsers = users.filter((u) => u.franchise_id === franchiseFilter);
  }

  if (filteredUsers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty">Aucun utilisateur</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredUsers
    .map(
      (u) => `
    <tr>
      <td>${u.email}</td>
      <td>${u.full_name || "-"}</td>
      <td>${u.franchises?.nom || "-"}</td>
      <td>
        <span class="badge ${u.role === "TECH_ADMIN" ? "badge-admin" : "badge-user"}">
          ${u.role === "TECH_ADMIN" ? "🔧 Admin" : "👤 User"}
        </span>
      </td>
      <td>
        <span class="badge ${u.active ? "badge-success" : "badge-inactive"}">
          ${u.active ? "✅ Actif" : "❌ Inactif"}
        </span>
      </td>
      <td class="actions">
        <button class="btn-icon" onclick="editUser('${u.id}')" title="Modifier">
          ✏️
        </button>
        <button class="btn-icon" onclick="resetPassword('${u.id}')" title="Réinitialiser MDP">
          🔄
        </button>
        <button class="btn-icon" onclick="toggleUser('${u.id}', ${u.active})" title="${
          u.active ? "Désactiver" : "Activer"
        }">
          ${u.active ? "❌" : "✅"}
        </button>
      </td>
    </tr>
  `,
    )
    .join("");
}

// ==============================================
// MODAL FRANCHISE
// ==============================================

function openFranchiseModal(franchiseId = null) {
  const modal = document.getElementById("franchise-modal");
  const title = document.getElementById("franchise-modal-title");
  const form = document.getElementById("franchise-form");

  // Reset form
  form.reset();
  currentFranchiseId = franchiseId;

  if (franchiseId) {
    // MODE ÉDITION
    title.textContent = "✏️ Modifier la franchise";
    const franchise = franchises.find((f) => f.id === franchiseId);

    document.getElementById("franchise-id").value = franchise.id;
    document.getElementById("franchise-nom").value = franchise.nom;
    document.getElementById("franchise-city").value = franchise.city || "";
    document.getElementById("franchise-address").value =
      franchise.address || "";
    document.getElementById("franchise-phone").value = franchise.phone || "";
    document.getElementById("franchise-email").value = franchise.email || "";
  } else {
    // MODE CRÉATION
    title.textContent = "➕ Nouvelle Franchise";
  }

  modal.classList.add("active");
}

function closeFranchiseModal() {
  document.getElementById("franchise-modal").classList.remove("active");
  currentFranchiseId = null;
}

async function saveFranchise() {
  const data = {
    nom: document.getElementById("franchise-nom").value.trim(),
    city: document.getElementById("franchise-city").value.trim() || null,
    address: document.getElementById("franchise-address").value.trim() || null,
    phone: document.getElementById("franchise-phone").value.trim() || null,
    email: document.getElementById("franchise-email").value.trim() || null,
  };

  try {
    if (currentFranchiseId) {
      // MODIFICATION
      console.log("📝 Modification franchise:", currentFranchiseId);
      await fetchWithAuth(`${API_URL}/admin/franchises/${currentFranchiseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      alert("✅ Franchise modifiée avec succès !");
    } else {
      // CRÉATION
      console.log("➕ Création franchise");
      await apiPost("/admin/franchises", data);
      alert("✅ Franchise créée avec succès !");
    }

    closeFranchiseModal();
    await loadFranchises();
  } catch (error) {
    console.error("❌ Erreur sauvegarde franchise:", error);
    alert("Erreur : " + error.message);
  }
}

function editFranchise(id) {
  openFranchiseModal(id);
}

async function toggleFranchise(id, currentStatus) {
  const action = currentStatus ? "désactiver" : "activer";
  if (!confirm(`Voulez-vous vraiment ${action} cette franchise ?`)) return;

  try {
    if (currentStatus) {
      // DÉSACTIVER
      await apiDelete(`/admin/franchises/${id}`);
      alert("✅ Franchise désactivée");
    } else {
      // RÉACTIVER
      await fetchWithAuth(`${API_URL}/admin/franchises/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      alert("✅ Franchise réactivée");
    }

    await loadFranchises();
  } catch (error) {
    console.error("❌ Erreur toggle franchise:", error);
    alert("Erreur : " + error.message);
  }
}

// ==============================================
// MODAL UTILISATEUR
// ==============================================

function openUserModal(userId = null) {
  const modal = document.getElementById("user-modal");
  const title = document.getElementById("user-modal-title");
  const form = document.getElementById("user-form");
  const passwordGroup = document.getElementById("password-group");

  // Reset form
  form.reset();
  currentUserId = userId;

  if (userId) {
    // MODE ÉDITION
    title.textContent = "✏️ Modifier l'utilisateur";
    const user = users.find((u) => u.id === userId);

    document.getElementById("user-id").value = user.id;
    document.getElementById("user-email").value = user.email;
    document.getElementById("user-fullname").value = user.full_name || "";
    document.getElementById("user-franchise").value = user.franchise_id;

    // Cacher le champ mot de passe en mode édition
    passwordGroup.style.display = "none";
    document.getElementById("user-password").required = false;
  } else {
    // MODE CRÉATION
    title.textContent = "➕ Nouvel Utilisateur";
    passwordGroup.style.display = "block";
    document.getElementById("user-password").required = true;

    // Générer un mot de passe par défaut
    generatePassword();
  }

  modal.classList.add("active");
}

function closeUserModal() {
  document.getElementById("user-modal").classList.remove("active");
  currentUserId = null;
}

async function saveUser() {
  const data = {
    email: document.getElementById("user-email").value.trim(),
    full_name: document.getElementById("user-fullname").value.trim(),
    franchise_id: document.getElementById("user-franchise").value,
  };

  // Ajouter le mot de passe seulement en mode création
  if (!currentUserId) {
    data.password = document.getElementById("user-password").value;
  }

  try {
    if (currentUserId) {
      // MODIFICATION
      console.log("📝 Modification utilisateur:", currentUserId);
      await fetchWithAuth(`${API_URL}/admin/users/${currentUserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      alert("✅ Utilisateur modifié avec succès !");
    } else {
      // CRÉATION
      console.log("➕ Création utilisateur");
      await apiPost("/admin/users", data);
      alert("✅ Utilisateur créé avec succès !");
    }

    closeUserModal();
    await loadUsers();
  } catch (error) {
    console.error("❌ Erreur sauvegarde utilisateur:", error);
    alert("Erreur : " + error.message);
  }
}

function editUser(id) {
  openUserModal(id);
}

async function resetPassword(id) {
  const user = users.find((u) => u.id === id);
  const newPassword = prompt(
    `Nouveau mot de passe pour ${user.email} :\n\n(Laissez vide pour générer automatiquement)`,
  );

  if (newPassword === null) return; // Annulé

  const password = newPassword.trim() || generateRandomPassword();

  try {
    await apiPost(`/admin/users/${id}/reset-password`, {
      new_password: password,
    });

    alert(
      `✅ Mot de passe réinitialisé !\n\nNouveau mot de passe : ${password}\n\n(Copiez-le maintenant)`,
    );
  } catch (error) {
    console.error("❌ Erreur reset password:", error);
    alert("Erreur : " + error.message);
  }
}

async function toggleUser(id, currentStatus) {
  const action = currentStatus ? "désactiver" : "activer";
  if (!confirm(`Voulez-vous vraiment ${action} cet utilisateur ?`)) return;

  try {
    if (currentStatus) {
      // DÉSACTIVER
      await apiDelete(`/admin/users/${id}`);
      alert("✅ Utilisateur désactivé");
    } else {
      // RÉACTIVER
      await fetchWithAuth(`${API_URL}/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      alert("✅ Utilisateur réactivé");
    }

    await loadUsers();
  } catch (error) {
    console.error("❌ Erreur toggle user:", error);
    alert("Erreur : " + error.message);
  }
}

// ==============================================
// GÉNÉRATEUR DE MOT DE PASSE
// ==============================================

function generatePassword() {
  const password = generateRandomPassword();
  document.getElementById("user-password").value = password;
}

function generateRandomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ============================================
// GESTION DES PERMISSIONS
// ============================================

// Charger les franchises pour la gestion des permissions
async function loadFranchisesForPermissions() {
  try {
    const franchises = await apiGet("/admin/franchises");
    const select = document.getElementById("select-franchise-permissions");

    // Vider le select
    select.innerHTML =
      '<option value="">-- Sélectionnez une franchise --</option>';

    franchises.forEach((franchise) => {
      const option = document.createElement("option");
      option.value = franchise.id;
      option.textContent = franchise.nom;
      select.appendChild(option);
    });

    // Event listener pour charger les permissions
    select.addEventListener("change", (e) => {
      if (e.target.value) {
        loadFranchisePermissions(e.target.value);
      } else {
        document.getElementById("permissions-container").style.display = "none";
        document.getElementById("no-franchise-selected").style.display =
          "block";
      }
    });
  } catch (error) {
    console.error("Erreur chargement franchises pour permissions:", error);
    alert("Erreur lors du chargement des franchises");
  }
}

// Charger les permissions d'une franchise
async function loadFranchisePermissions(franchiseId) {
  try {
    const data = await apiGet(`/admin/permissions/franchise/${franchiseId}`);

    // Afficher le container
    document.getElementById("permissions-container").style.display = "block";
    document.getElementById("no-franchise-selected").style.display = "none";

    // Afficher le nom de la franchise
    document.getElementById("selected-franchise-name").textContent =
      data.franchise.nom;

    // Afficher les permissions
    const container = document.getElementById("permissions-list");
    container.innerHTML = data.permissions
      .map(
        (perm) => `
      <div style="
        padding: 1.25rem;
        background: white;
        border: 2px solid ${perm.enabled ? "#4CAF50" : "#e0e0e0"};
        border-radius: 10px;
        transition: all 0.3s;
        box-shadow: ${perm.enabled ? "0 4px 12px rgba(76, 175, 80, 0.2)" : "0 2px 4px rgba(0,0,0,0.05)"};
      ">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
              <span style="font-size: 1.5rem;">${perm.icon}</span>
              <div>
                <div style="font-weight: 600; color: #3e2723; font-size: 1.05rem;">
                  ${perm.name}
                </div>
                <div style="font-size: 0.85rem; color: #666; margin-top: 0.25rem;">
                  ${perm.description}
                </div>
              </div>
            </div>
            ${
              perm.enabled && perm.updated_at
                ? `
              <div style="font-size: 0.75rem; color: #999; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #f0f0f0;">
                📅 Dernière modification : ${new Date(
                  perm.updated_at,
                ).toLocaleDateString("fr-FR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            `
                : ""
            }
          </div>
          <label style="
            display: flex;
            align-items: center;
            gap: 0.75rem;
            cursor: pointer;
            padding: 0.75rem 1.25rem;
            background: ${perm.enabled ? "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)" : "linear-gradient(135deg, #ccc 0%, #999 100%)"};
            color: white;
            border-radius: 25px;
            font-weight: 600;
            transition: all 0.3s;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            min-width: 140px;
            justify-content: center;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            <input 
              type="checkbox" 
              ${perm.enabled ? "checked" : ""}
              onchange="togglePermission('${franchiseId}', '${perm.key}', this.checked)"
              style="display: none;"
            />
            <span style="font-size: 1rem;">${perm.enabled ? "✅ Activée" : "❌ Désactivée"}</span>
          </label>
        </div>
      </div>
    `,
      )
      .join("");
  } catch (error) {
    console.error("Erreur chargement permissions:", error);
    alert(
      `Erreur : ${error.message || "Impossible de charger les permissions"}`,
    );
  }
}

// Activer/Désactiver une permission
async function togglePermission(franchiseId, permissionKey, enabled) {
  try {
    await apiPost(`/admin/permissions/franchise/${franchiseId}`, {
      permission_key: permissionKey,
      enabled: enabled,
    });

    // Feedback visuel
    const toastMsg = enabled
      ? "✅ Permission activée"
      : "❌ Permission désactivée";
    showToast(toastMsg, enabled ? "success" : "info");

    // Recharger les permissions pour mettre à jour l'interface
    loadFranchisePermissions(franchiseId);
  } catch (error) {
    console.error("Erreur modification permission:", error);
    alert(
      `❌ Erreur : ${error.message || "Impossible de modifier la permission"}`,
    );

    // Recharger pour remettre l'état correct
    loadFranchisePermissions(franchiseId);
  }
}

// Fonction toast pour feedback utilisateur (optionnelle)
function showToast(message, type = "info") {
  // Si tu veux un système de notifications élégant
  const toast = document.createElement("div");
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${type === "success" ? "#4CAF50" : type === "error" ? "#f44336" : "#2196F3"};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    animation: slideIn 0.3s ease;
    font-weight: 600;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}
