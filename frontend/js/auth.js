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
  options.headers = {
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
  const response = await fetchWithAuth(`${API_URL}${endpoint}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Erreur API");
  }

  return response.json();
}

// ==============================================
// AFFICHER INFO USER
// ==============================================

function displayUserInfo() {
  const user = getUser();
  if (!user) return;

  // Créer ou mettre à jour l'affichage de l'utilisateur
  let userInfoDiv = document.getElementById("user-info");
  if (!userInfoDiv) {
    userInfoDiv = document.createElement("div");
    userInfoDiv.id = "user-info";
    userInfoDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 15px;
    `;
    document.body.appendChild(userInfoDiv);
  }

  userInfoDiv.innerHTML = `
    <div>
      <div style="font-weight: 600; color: #2c3e50;">${user.email}</div>
      <div style="font-size: 12px; color: #7f8c8d;">${user.franchise_nom}</div>
    </div>
    <button
        onclick="logout()"
        style="
          background: #e74c3c;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
        "
      >
        Déconnexion
      </button>
  `;
}
