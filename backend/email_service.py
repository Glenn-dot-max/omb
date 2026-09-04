# backend/email_service.py

import logging
import resend
from config import RESEND_API_KEY, RESEND_FROM_EMAIL

logger = logging.getLogger(__name__)

resend.api_key = RESEND_API_KEY

def send_password_reset_email(to_email:str, reset_link: str) -> bool:
  """
  Envoie l'email de réinitialisation de mot de passe.
  Retourne True si l'envoi a réussi, False sinon (ne lève jamais d'exception
  pour éviter de révéler des informations à l'appelant).
  """
  try:
      resend.Emails.send({
         "from": f"Oh My Brunch <{RESEND_FROM_EMAIL}>",
         "to": [to_email],
         "subject": "Réinitialisation de votre mot de passe - Oh My Brunch",
         "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #3d2517;">Réinitialisation de mot de passe</h2>
            <p>Vous avez demandé la réinitialisation de votre mot de passe Oh My Brunch.</p>
            <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.
               Ce lien est valable <strong>1 heure</strong>.</p>
            <p style="margin: 30px 0;">
                <a href="{reset_link}"
                  style="background: #f5c05c; color: #3d2517; padding: 14px 28px;
                      text-decoration: none; border-radius: 8px; font-weight: bold;
                      display: inline-block";>
                  Réinitialiser mon mot de passe
                </a>
            </p>
            <p style="color: #999; font-size: 13px;">
              Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email :
              votre mot de passe actuel reste inchangé.
            </p>
        </div>
        """,
      })
      return True
  except Exception as e:
      logger.error(f"Erreur envoi email reset password à {to_email}: {e}", exc_info=True)
      return False
  