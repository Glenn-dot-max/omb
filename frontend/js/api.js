// js/api.js
// This module handles API requests for the application.
// API_URL est défini dans config.js
// Les fonctions apiGet/apiPost/apiPatch/apiDelete sont définies dans auth.js

// ===========================================
// FONCTIONS API - PRODUITS
// ===========================================

async function getProduits() {
  try {
    return await apiGet("/produits/");
  } catch (error) {
    console.error("Error fetching produits:", error);
    return [];
  }
}

async function createProduit(produit) {
  try {
    return await apiPost("/produits/", produit);
  } catch (error) {
    console.error("Error creating produit:", error);
    throw error;
  }
}

async function deleteProduit(produitId) {
  try {
    await apiDelete(`/produits/${produitId}`); // ✅ Sans slash
  } catch (error) {
    console.error("Error deleting produit:", error);
    throw error;
  }
}

async function updateProduit(produitId, produit) {
  try {
    return await apiPatch(`/produits/${produitId}`, produit); // ✅ Sans slash
  } catch (error) {
    console.error("Erreur API updateProduit:", error);
    throw error;
  }
}

// ===========================================
// FORMULES
// ===========================================

async function getFormules() {
  try {
    return await apiGet("/formules/");
  } catch (error) {
    console.error("Error fetching formules:", error);
    return [];
  }
}

async function createFormule(formule) {
  try {
    return await apiPost("/formules/", formule);
  } catch (error) {
    console.error("Erreur API createFormule:", error);
    throw error;
  }
}

async function deleteFormule(formuleId) {
  try {
    await apiDelete(`/formules/${formuleId}`); // ✅ Sans slash
  } catch (error) {
    console.error("Erreur API deleteFormule:", error);
    throw error;
  }
}

async function updateFormule(formuleId, formule) {
  try {
    const response = await fetchWithAuth(`${API_URL}/formules/${formuleId}`, {
      // ✅ Sans slash
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formule),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Erreur mise à jour formule");
    }

    return await response.json();
  } catch (error) {
    console.error("Erreur API updateFormule:", error);
    throw error;
  }
}

// ===========================================
// COMMANDES
// ===========================================

async function getCommandes() {
  try {
    return await apiGet("/commandes/");
  } catch (error) {
    console.error("Erreur API getCommandes:", error);
    return [];
  }
}

async function createCommande(commande) {
  try {
    return await apiPost("/commandes/", commande);
  } catch (error) {
    console.error("Erreur API createCommande:", error);
    throw error;
  }
}

async function deleteCommande(commandeId) {
  try {
    await apiDelete(`/commandes/${commandeId}`); // ✅ Sans slash
  } catch (error) {
    console.error("Erreur API deleteCommande:", error);
    throw error;
  }
}

async function updateCommande(commandeId, commande) {
  try {
    const response = await fetchWithAuth(`${API_URL}/commandes/${commandeId}`, {
      // ✅ Sans slash
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(commande),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Erreur mise à jour commande");
    }

    return await response.json();
  } catch (error) {
    console.error("Erreur API updateCommande:", error);
    throw error;
  }
}

// ===========================================
// COMMANDES - FORMULES
// ===========================================

async function createCommandeFormule(data) {
  try {
    return await apiPost("/commande-formules/", data);
  } catch (error) {
    console.error("Erreur API createCommandeFormule:", error);
    throw error;
  }
}

async function getCommandeFormules(commandeId) {
  try {
    return await apiGet(`/commande-formules/commande/${commandeId}`); // ✅ Sans slash
  } catch (error) {
    console.error("Erreur API getCommandeFormules:", error);
    return [];
  }
}

async function deleteCommandeFormule(commandeFormuleId) {
  try {
    await apiDelete(`/commande-formules/${commandeFormuleId}`); // ✅ Sans slash
  } catch (error) {
    console.error("Erreur API deleteCommandeFormule:", error);
    throw error;
  }
}

async function getCommandeFormuleExclusions(commandeFormuleId) {
  try {
    const data = await apiGet(
      `/commande-formules/${commandeFormuleId}/exclusions`,
    ); // ✅ Sans slash
    console.log(
      `📥 Exclusions récupérées pour formule ${commandeFormuleId}:`,
      data,
    );
    return data;
  } catch (error) {
    console.error("Erreur API getCommandeFormuleExclusions:", error);
    return [];
  }
}

// ===========================================
// COMMANDES - PRODUITS
// ===========================================

async function createCommandeProduit(data) {
  try {
    return await apiPost("/commande-produits/", data);
  } catch (error) {
    console.error("Erreur API createCommandeProduit:", error);
    throw error;
  }
}

async function getCommandeProduits(commandeId) {
  try {
    return await apiGet(`/commande-produits/commande/${commandeId}`); // ✅ Sans slash
  } catch (error) {
    console.error("Erreur API getCommandeProduits:", error);
    return [];
  }
}

async function deleteCommandeProduit(commandeProduitId) {
  try {
    await apiDelete(`/commande-produits/${commandeProduitId}`); // ✅ Sans slash
  } catch (error) {
    console.error("Erreur API deleteCommandeProduit:", error);
    throw error;
  }
}

// ===========================================
// FORMULE - PRODUITS
// ===========================================

async function getFormuleProduits(formuleId) {
  try {
    return await apiGet(`/formule-produits/formule/${formuleId}`); // ✅ Sans slash
  } catch (error) {
    console.error("Erreur API getFormuleProduits:", error);
    return [];
  }
}

async function createFormuleProduit(formuleProduit) {
  try {
    return await apiPost("/formule-produits/", formuleProduit);
  } catch (error) {
    console.error("Erreur API createFormuleProduit:", error);
    throw error;
  }
}

async function deleteFormuleProduit(formuleProduitId) {
  try {
    await apiDelete(`/formule-produits/${formuleProduitId}`); // ✅ Sans slash
  } catch (error) {
    console.error("Erreur API deleteFormuleProduit:", error);
    throw error;
  }
}

// ===========================================
// CATÉGORIES
// ===========================================

async function getCategories() {
  try {
    return await apiGet("/categories/");
  } catch (error) {
    console.error("Erreur API getCategories:", error);
    return [];
  }
}

// ===========================================
// TYPES
// ===========================================

async function getTypes() {
  try {
    return await apiGet("/types/");
  } catch (error) {
    console.error("Erreur API getTypes:", error);
    return [];
  }
}

// ===========================================
// UNITÉS
// ===========================================

async function getUnite() {
  try {
    return await apiGet("/unite/");
  } catch (error) {
    console.error("Erreur API getUnites:", error);
    return [];
  }
}

// ===========================================
// COMMANDES ARCHIVÉES
// ===========================================

async function getArchivedCommandes() {
  try {
    return await apiGet("/commandes/archived");
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des commandes archivées:",
      error,
    );
    throw error;
  }
}

async function archiveCommande(commandeId) {
  try {
    return await apiPatch(`/commandes/${commandeId}/archive`, {}); // ✅ Correct (route spéciale)
  } catch (error) {
    console.error("Erreur lors de l'archivage de la commande:", error);
    throw error;
  }
}

async function autoArchiveCommandes() {
  try {
    return await apiPost("/commandes/auto-archive", {});
  } catch (error) {
    console.error(
      "Erreur lors de l'archivage automatique des commandes:",
      error,
    );
    throw error;
  }
}
