// js/api.js
// This module handles API requests for the application.

const API_URL = "http://127.0.0.1:8000";

// ===========================================
// FONCTIONS API - PRODUITS
// ===========================================

async function getProduits() {
  try {
    const response = await fetch(`${API_URL}/produits/`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching produits:", error);
    return [];
  }
}

async function createProduit(produit) {
  try {
    const response = await fetch(`${API_URL}/produits/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(produit),
    });
    if (!response.ok) {
      // Récupérer le message d'erreur du serveur
      const errorData = await response.json();
      throw new Error(
        errorData.detail || `HTTP error! status: ${response.status}`,
      );
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating produit:", error);
    throw error;
  }
}

async function deleteProduit(produitId) {
  try {
    const response = await fetch(`${API_URL}/produits/${produitId}/`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error deleting produit:", error);
    throw error;
  }
}

async function updateProduit(produitId, produit) {
  try {
    const response = await fetch(`${API_URL}/produits/${produitId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(produit),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erreur API updateProduit:", error);
    throw error;
  }
}

// ===========================================
// EXPORTATION DES FORMULES
// ===========================================

async function getFormules() {
  try {
    const response = await fetch(`${API_URL}/formules/`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching formules:", error);
    return [];
  }
}

async function createFormule(formule) {
  try {
    const response = await fetch(`${API_URL}/formules/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formule),
    });
    if (!response.ok) throw new Error("Erreur création formule");
    return await response.json();
  } catch (error) {
    console.error("Erreur API createFormule:", error);
    throw error;
  }
}

async function deleteFormule(formuleId) {
  try {
    const response = await fetch(`${API_URL}/formules/${formuleId}/`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Erreur suppression formule");
  } catch (error) {
    console.error("Erreur API deleteFormule:", error);
    throw error;
  }
}

async function updateFormule(formuleId, formule) {
  try {
    const response = await fetch(`${API_URL}/formules/${formuleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formule),
    });
    if (!response.ok) throw new Error("Erreur mise à jour formule");
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
    const response = await fetch(`${API_URL}/commandes/`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Erreur API getCommandes:", error);
    return [];
  }
}

async function createCommande(commande) {
  try {
    const response = await fetch(`${API_URL}/commandes/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(commande),
    });
    if (!response.ok) throw new Error("Erreur création commande");
    return await response.json();
  } catch (error) {
    console.error("Erreur API createCommande:", error);
    throw error;
  }
}

async function deleteCommande(commandeId) {
  try {
    const response = await fetch(`${API_URL}/commandes/${commandeId}/`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Erreur suppression commande");
  } catch (error) {
    console.error("Erreur API deleteCommande:", error);
    throw error;
  }
}

// ===========================================
// FORMULE - PRODUITS
// ===========================================

async function getFormuleProduits(formuleId) {
  try {
    const response = await fetch(
      `${API_URL}/formule-produits/formule/${formuleId}/`,
    );
    if (!response.ok) throw new Error("Erreur récupération produits formule");
    return await response.json();
  } catch (error) {
    console.error("Erreur API getFormuleProduits:", error);
    return [];
  }
}

async function createFormuleProduit(formuleProduit) {
  try {
    const response = await fetch(`${API_URL}/formule-produits/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formuleProduit),
    });
    if (!response.ok) throw new Error("Erreur création formule-produit");
    return await response.json();
  } catch (error) {
    console.error("Erreur API createFormuleProduit:", error);
    throw error;
  }
}

async function deleteFormuleProduit(formuleProduitId) {
  try {
    const response = await fetch(
      `${API_URL}/formule-produits/${formuleProduitId}/`,
      {
        method: "DELETE",
      },
    );
    if (!response.ok) throw new Error("Erreur suppression formule-produit");
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
    const response = await fetch(`${API_URL}/categories/`);
    if (!response.ok) throw new Error("Erreur récupération catégories");
    return await response.json();
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
    const response = await fetch(`${API_URL}/types/`);
    if (!response.ok) throw new Error("Erreur récupération types");
    return await response.json();
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
    const response = await fetch(`${API_URL}/unite/`);
    if (!response.ok) throw new Error("Erreur récupération unités");
    return await response.json();
  } catch (error) {
    console.error("Erreur API getUnites:", error);
    return [];
  }
}
