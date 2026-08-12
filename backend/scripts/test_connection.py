from database import get_supabase_client

# Fichier de test pour vérifier la connexion à Supabase et récupérer des données

# Récupère le client Supabase
supabase = get_supabase_client()

try:
    response = supabase.table("produits").select("*").execute()

    print ("Données récupérées avec succès :")
    print(f"Nombre de lignes : {len(response.data)}")
    print("Données :", response.data)

except Exception as e:
    print("Erreur lors de la récupération des données :", str(e))
  