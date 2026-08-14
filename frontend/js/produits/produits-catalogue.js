// js/produits/produits-catalogue.js
// Gestion des catégories et des types (affichage, ajout, modification, suppression)

// ============================================
// GESTION DES CATÉGORIES
// ============================================

// Afficher la section catégories avec restrictions selon le rôle
function initCategoriesSection() {
  const currentUser = getUser();
  const categoriesSection = document.getElementById("categories-types-section");
  const addCategoryContainer = document.getElementById(
    "add-category-container",
  );
  const btnCategories = document.getElementById("toggle-categories");
  const btnTypes = document.getElementById("toggle-types");

  if (isCatalogAdminRole(currentUser)) {
    categoriesSection.style.display = "block";

    // Boutons mode gestion
    if (btnCategories) btnCategories.textContent = "📂 Gérer les catégories";
    if (btnTypes) btnTypes.textContent = "🏷️ Gérer les types";

    if (addCategoryContainer) addCategoryContainer.style.display = "block";

    loadCategoriesManagement();
  } else if (currentUser) {
    categoriesSection.style.display = "block";

    if (btnCategories)
      btnCategories.textContent = "📂 Consulter les catégories";
    if (btnTypes) btnTypes.textContent = "🏷️ Consulter les types";

    if (addCategoryContainer) addCategoryContainer.style.display = "none";

    loadCategoriesManagement();
  } else {
    categoriesSection.style.display = "none";
  }
}

// Charger les catégories pour la gestion
async function loadCategoriesManagement() {
  try {
    const data = await getCategories();
    AppState.allCategories = data;
    allCategories = AppState.allCategories;
    displayCategoriesManagement();
  } catch (error) {
    console.error("Erreur chargement catégories:", error);
  }
}

// Afficher les catégories dans la section de gestion
function displayCategoriesManagement() {
  const list = document.getElementById("categories-list");

  if (!list) return;

  if (AppState.allCategories.length === 0) {
    list.innerHTML = `
      <div style="
        text-align: center;
        padding: 3rem 2rem;
        color: #999;
        font-size: 1rem;
      ">
        <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
        <div>Aucune catégorie disponible</div>
      </div>
    `;
    return;
  }

  const currentUser = getUser();
  const isTechAdmin = isCatalogAdminRole(currentUser);

  list.innerHTML = AppState.allCategories
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (cat) => `
        <div class="category-item" style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-bottom: 0.75rem;
          background: white;
          border: 1px solid #e8e8e8;
          border-radius: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        "
        onmouseover="this.style.boxShadow='0 4px 12px rgba(212, 134, 45, 0.15)'; this.style.borderColor='#d4862d';"
        onmouseout="this.style.boxShadow='0 1px 3px rgba(0, 0, 0, 0.05)'; this.style.borderColor='#e8e8e8';">
          
          <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
            <div style="
              width: 40px;
              height: 40px;
              background: linear-gradient(135deg, #f4a460 0%, #d4862d 100%);
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.2rem;
              box-shadow: 0 2px 4px rgba(212, 134, 45, 0.3);
            ">
              🏷️
            </div>

            <div style="flex: 1;">
              <div style="
                font-weight: 600;
                color: #2c3e50;
                font-size: 1rem;
                margin-bottom: 0.25rem;
              ">
                ${cat.name}
              </div>
              <div style="
                font-size: 0.75rem;
                color: #95a5a6;
                font-family: 'Courier New', monospace;
              ">
                ID: ${cat.id}
              </div>
            </div>
          </div>

          ${
            isTechAdmin
              ? `
            <div style="display: flex; gap: 0.5rem;">
              <button
                onclick="openEditCategoryModal(${cat.id})"
                class="action-btn edit-btn"
                style="
                  padding: 0.5rem 1rem;
                  background: white;
                  color: #2ecc71;
                  border: 2px solid #2ecc71;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 0.875rem;
                  font-weight: 600;
                  transition: all 0.2s ease;
                  display: flex;
                  align-items: center;
                  gap: 0.4rem;
                "
                onmouseover="this.style.background='#2ecc71'; this.style.color='white';"
                onmouseout="this.style.background='white'; this.style.color='#2ecc71';"
              >
                <span>✏️</span>
                <span>Modifier</span>
              </button>

              <button
                onclick="deleteCategoryFromManagement(${cat.id}, '${cat.name.replace(/'/g, "\\'")}')"
                class="action-btn delete-btn"
                style="
                  padding: 0.5rem 1rem;
                  background: white;
                  color: #e74c3c;
                  border: 2px solid #e74c3c;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 0.875rem;
                  font-weight: 600;
                  transition: all 0.2s ease;
                  display: flex;
                  align-items: center;
                  gap: 0.4rem;
                "
                onmouseover="this.style.background='#e74c3c'; this.style.color='white';"
                onmouseout="this.style.background='white'; this.style.color='#e74c3c';"
              >
                <span>🗑️</span>
                <span>Supprimer</span>
              </button>
            </div>
          `
              : ""
          }
        </div>
      `,
    )
    .join("");
}

// Ajouter une catégorie (tous les utilisateurs)
document
  .getElementById("add-category-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("category-name").value.trim();

    if (!name) {
      alert("⚠️ Le nom de la catégorie est requis");
      return;
    }

    try {
      await createCategory({ name });
      alert("✅ Catégorie ajoutée avec succès !");
      document.getElementById("category-name").value = "";

      await loadCategoriesManagement();
      await loadCategories();
      await loadProduits();
    } catch (error) {
      console.error("Erreur:", error);

      if (error.message && error.message.includes("403")) {
        alert(
          "❌ Vous n'avez pas les permissions nécessaires pour effectuer cette action.",
        );
      } else {
        alert(
          `❌ ${error.message || "Erreur lors de l'ajout de la catégorie"}`,
        );
      }
    }
  });

// Modifier une catégorie (TECH_ADMIN uniquement)
function openEditCategoryModal(categoryId) {
  const category = allCategories.find((c) => c.id === categoryId);
  if (!category) return;

  const newName = prompt(
    `Modifier la catégorie "${category.name}":\n\nNouveau nom:`,
    category.name,
  );

  if (newName && newName.trim() !== "" && newName.trim() !== category.name) {
    updateCategoryFromManagement(categoryId, newName.trim());
  }
}

async function updateCategoryFromManagement(categoryId, newName) {
  try {
    await updateCategory(categoryId, { name: newName });
    alert("✅ Catégorie modifiée avec succès !");

    await loadCategoriesManagement();
    await loadCategories();
    await loadProduits();
  } catch (error) {
    console.error("Erreur:", error);
    alert(
      `❌ ${error.message || "Erreur lors de la modification de la catégorie"}`,
    );
  }
}

// Supprimer une catégorie (TECH_ADMIN uniquement)
async function deleteCategoryFromManagement(categoryId, categoryName) {
  if (
    !confirm(
      `⚠️ Êtes-vous sûr de vouloir supprimer la catégorie "${categoryName}" ?\n\nCette action est irréversible.\n\n⚠️ La suppression échouera si des produits utilisent encore cette catégorie.`,
    )
  ) {
    return;
  }

  try {
    await deleteCategoryById(categoryId);
    alert("✅ Catégorie supprimée avec succès !");

    await loadCategoriesManagement();
    await loadCategories();
    await loadProduits();
  } catch (error) {
    console.error("Erreur:", error);
    if (error.message && error.message.includes("403")) {
      alert(
        "❌ Vous n'avez pas les permissions nécessaires pour effectuer cette action.",
      );
    } else {
      alert(
        `❌ Impossible de supprimer cette catégorie\n\nDes produits utilisent probablement encore cette catégorie.`,
      );
    }
  }
}

// ===========================================
// GESTION DES TYPES
// ===========================================

// Afficher la section types avec restrictions selon le rôle
function initTypesSection() {
  const currentUser = getUser();
  const addTypeContainer = document.getElementById("add-type-container");

  if (isCatalogAdminRole(currentUser)) {
    if (addTypeContainer) {
      addTypeContainer.style.display = "block";
    }
    loadTypesManagement();
  } else if (currentUser) {
    if (addTypeContainer) {
      addTypeContainer.style.display = "none";
    }
    loadTypesManagement();
  }
}

// Charger les types pour la gestion
async function loadTypesManagement() {
  try {
    const data = await getTypes();
    AppState.allTypes = data;
    allTypes = AppState.allTypes;
    displayTypesManagement();
  } catch (error) {
    console.error("Erreur chargement types:", error);
  }
}

function displayTypesManagement() {
  const list = document.getElementById("types-list");

  if (!list) return;

  if (allTypes.length === 0) {
    list.innerHTML = `
      <div style="
        text-align: center;
        padding: 3rem 2rem;
        color: #999;
        font-size: 1rem;
      ">
        <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
        <div>Aucun type disponible</div>
      </div>
    `;
    return;
  }

  const currentUser = getUser();
  const isTechAdmin = isCatalogAdminRole(currentUser);

  list.innerHTML = allTypes
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (type) => `
        <div class="type-item" style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-bottom: 0.75rem;
          background: white;
          border: 1px solid #e8e8e8;
          border-radius: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        "
        onmouseover="this.style.boxShadow='0 4px 12px rgba(212, 134, 45, 0.15)'; this.style.borderColor='#d4862d';"
        onmouseout="this.style.boxShadow='0 1px 3px rgba(0, 0, 0, 0.05)'; this.style.borderColor='#e8e8e8';">
          
          <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
            <div style="
              width: 40px;
              height: 40px;
              background: linear-gradient(135deg, #f4a460 0%, #d4862d 100%);
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.2rem;
              box-shadow: 0 2px 4px rgba(212, 134, 45, 0.3);
            ">
              🗂️
            </div>

            <div style="flex: 1;">
              <div style="
                font-weight: 600;
                color: #2c3e50;
                font-size: 1rem;
                margin-bottom: 0.25rem;
              ">
                ${type.name}
              </div>
              <div style="
                font-size: 0.75rem;
                color: #95a5a6;
                font-family: 'Courier New', monospace;
              ">
                ID: ${type.id}
              </div>
            </div>
          </div>

          ${
            isTechAdmin
              ? `
            <div style="display: flex; gap: 0.5rem;">
              <button
                onclick="openEditTypeModal(${type.id})"
                class="action-btn edit-btn"
                style="
                  padding: 0.5rem 1rem;
                  background: white;
                  color: #2ecc71;
                  border: 2px solid #2ecc71;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 0.875rem;
                  font-weight: 600;
                  transition: all 0.2s ease;
                  display: flex;
                  align-items: center;
                  gap: 0.4rem;
                "
                onmouseover="this.style.background='#2ecc71'; this.style.color='white';"
                onmouseout="this.style.background='white'; this.style.color='#2ecc71';"
              >
                <span>✏️</span>
                <span>Modifier</span>
              </button>

              <button
                onclick="deleteTypeFromManagement(${type.id}, '${type.name.replace(/'/g, "\\'")}')"
                class="action-btn delete-btn"
                style="
                  padding: 0.5rem 1rem;
                  background: white;
                  color: #e74c3c;
                  border: 2px solid #e74c3c;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 0.875rem;
                  font-weight: 600;
                  transition: all 0.2s ease;
                  display: flex;
                  align-items: center;
                  gap: 0.4rem;
                "
                onmouseover="this.style.background='#e74c3c'; this.style.color='white';"
                onmouseout="this.style.background='white'; this.style.color='#e74c3c';"
              >
                <span>🗑️</span>
                <span>Supprimer</span>
              </button>
            </div>
          `
              : ""
          }
        </div>
      `,
    )
    .join("");
}

// Ajouter un type (TECH_ADMIN uniquement)
document
  .getElementById("add-type-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("type-name").value.trim();

    if (!name) {
      alert("⚠️ Le nom du type est requis");
      return;
    }

    try {
      await createType({ name });
      alert("✅ Type ajouté avec succès !");
      document.getElementById("type-name").value = "";

      await loadTypesManagement();
      await loadTypes();
      await loadProduits();
    } catch (error) {
      console.error("Erreur:", error);

      if (error.message && error.message.includes("403")) {
        alert(
          "❌ Vous n'avez pas les permissions nécessaires pour effectuer cette action.",
        );
      } else {
        alert(`❌ ${error.message || "Erreur lors de l'ajout du type"}`);
      }
    }
  });

// Modifier un type (TECH_ADMIN uniquement)
function openEditTypeModal(typeId) {
  const type = allTypes.find((t) => t.id === typeId);
  if (!type) return;

  const newName = prompt(
    `Modifier le type "${type.name}":\n\nNouveau nom:`,
    type.name,
  );

  if (newName && newName.trim() !== "" && newName.trim() !== type.name) {
    updateTypeFromManagement(typeId, newName.trim());
  }
}

async function updateTypeFromManagement(typeId, newName) {
  try {
    await updateType(typeId, { name: newName });
    alert("✅ Type modifié avec succès !");

    await loadTypesManagement();
    await loadTypes();
    await loadProduits();
  } catch (error) {
    console.error("Erreur:", error);
    alert(`❌ ${error.message || "Erreur lors de la modification du type"}`);
  }
}

// Supprimer un type (TECH_ADMIN uniquement)
async function deleteTypeFromManagement(typeId, typeName) {
  if (
    !confirm(
      `⚠️ Êtes-vous sûr de vouloir supprimer le type "${typeName}" ?\n\nCette action est irréversible.\n\n⚠️ La suppression échouera si des produits utilisent encore ce type.`,
    )
  ) {
    return;
  }

  try {
    await deleteTypeById(typeId);
    alert("✅ Type supprimé avec succès !");

    await loadTypesManagement();
    await loadTypes();
    await loadProduits();
  } catch (error) {
    console.error("Erreur:", error);
    if (error.message && error.message.includes("403")) {
      alert(
        "❌ Vous n'avez pas les permissions nécessaires pour effectuer cette action.",
      );
    } else {
      alert(
        `❌ Impossible de supprimer ce type\n\nDes produits utilisent probablement encore ce type.`,
      );
    }
  }
}

// Initialiser au chargement
window.addEventListener("DOMContentLoaded", () => {
  initCategoriesSection();
  initTypesSection();
});
