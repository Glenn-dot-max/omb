// ==============================================
// STOCKAGE DU TOKEN
// ==============================================

function saveToken(token) {
  localStorage.setItem("omb_token", token);
}

function getToken() {
  return localStorage.getItem("omb_token");
}

function removeToken() {
  localStorage.removeItem("omb_token");
  localStorage.removeItem("omb_user");
}

function saveUser(user) {
  localStorage.setItem("omb_user", JSON.stringify(user));
}

function getUser() {
  const user = localStorage.getItem("omb_user");
  return user ? JSON.parse(user) : null;
}

// ==============================================
// VÉRIFICATION TOKEN
// ==============================================

function isAuthenticated() {
  const token = getToken();
  if (!token) return false;

  // Vérifier si le token n'est pas expiré
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp * 1000;
    return Date.now() < exp;
  } catch (e) {
    return false;
  }
}

function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = "/pages/login.html";
    return false;
  }
  return true;
}

// ==============================================
// LOGIN
// ==============================================

async function login(email, password) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, message: error.detail || "Erreur de connexion" };
    }

    const data = await response.json();

    // Sauvegarder le token et les infos utilisateur
    saveToken(data.access_token);
    saveUser(data.user);

    return {
      success: true,
      user: data.user,
    };
  } catch (error) {
    console.error("Erreur de connexion:", error);
    return { success: false, message: "Impossible de se connecter au serveur" };
  }
}

// ==============================================
// LOGOUT
// ==============================================

function logout() {
  removeToken();
  window.location.href = "/pages/login.html";
}

// ==============================================
// FETCH AVEC AUTH
// ==============================================

async function fetchWithAuth(url, options = {}) {
  const token = getToken();

  if (!token) {
    window.location.href = "/pages/login.html";
    throw new Error("Non authentifié");
  }

  // Ajouter le header Authorization
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Si 401, token expiré ou invalide
  if (response.status === 401) {
    removeToken();
    window.location.href = "/pages/login.html";
    throw new Error("Session expirée");
  }

  return response;
}

// ==============================================
// HELPERS API
// ==============================================

async function apiGet(endpoint) {
  const response = await fetchWithAuth(`${API_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`Erreur API: ${response.statusText}`);
  }
  return response.json();
}

async function apiPost(endpoint, data) {
  const response = await fetchWithAuth(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Erreur API");
  }

  return response.json();
}

async function apiPatch(endpoint, data) {
  const response = await fetchWithAuth(`${API_URL}${endpoint}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Erreur API");
  }

  return response.json();
}

async function apiDelete(endpoint) {
  console.log("🗑️ DELETE REQUEST:", endpoint);

  const response = await fetchWithAuth(`${API_URL}${endpoint}`, {
    method: "DELETE",
  });

  console.log("📡 DELETE Response status:", response.status);

  if (!response.ok) {
    let error;
    try {
      error = await response.json();
    } catch (e) {
      error = { detail: "Erreur de suppression" };
    }
    console.error("❌ DELETE Error:", error);
    throw new Error(error.detail || "Erreur API");
  }

  // Lire la réponse
  const text = await response.text();
  console.log("✅ DELETE Response text:", text);

  // Si vide, considérer comme succès
  if (!text) {
    return { success: true, message: "Suppression réussie" };
  }

  return JSON.parse(text);
}

// ==============================================
// AFFICHER MENU BURGER USER
// ==============================================

function displayUserInfo() {
  const user = getUser();
  if (!user) return;

  // Vérifier si déjà créé
  let burgerBtn = document.getElementById("burger-btn");
  if (burgerBtn) return;

  // Créer bouton burger
  burgerBtn = document.createElement("button");
  burgerBtn.id = "burger-btn";
  burgerBtn.innerHTML = `
    <div class="burger-icon">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;

  // Créer menu déroulant
  const burgerMenu = document.createElement("div");
  burgerMenu.id = "burger-menu";
  burgerMenu.className = "burger-menu";
  burgerMenu.innerHTML = `
    <div class="user-section">
      <div class="user-email">${user.email}</div>
      <div class="user-franchise">${user.franchise_nom}</div>
    </div>
    <div class="menu-divider"></div>
    <button onclick="logout()" class="logout-btn">
      🚪 Déconnexion
    </button>
  `;

  // Ajouter au DOM
  document.body.appendChild(burgerBtn);
  document.body.appendChild(burgerMenu);

  // Toggle menu
  burgerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    burgerMenu.classList.toggle("active");
    burgerBtn.classList.toggle("active");
  });

  // Fermer en cliquant dehors
  document.addEventListener("click", (e) => {
    if (!burgerMenu.contains(e.target) && !burgerBtn.contains(e.target)) {
      burgerMenu.classList.remove("active");
      burgerBtn.classList.remove("active");
    }
  });
}
