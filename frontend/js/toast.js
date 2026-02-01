/**
 * Affiche une notification toast à l'utilisateur.
 * @param {string} message - Le message à afficher dans la notification.
 * @param {string} type - Le type de notification ('success', 'error', 'info').
 * @param {number} duration - La durée d'affichage de la notification en millisecondes.
 */

function showToast(message, type = "success", duration = 3000) {
  // Créer l'élément toast
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  // Ajouter au DOM
  document.body.appendChild(toast);

  // Animation d'entrée
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  // Retirer le toast après la durée spécifiée
  setTimeout(() => {
    toast.classList.remove("show");

    // supprimer du DOM après la transition
    setTimeout(() => {
      toast.remove();
    }, 300); // Durée de la transition CSS
  }, duration);
}
