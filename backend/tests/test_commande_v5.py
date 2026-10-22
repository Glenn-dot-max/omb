# backend/tests/test_commande_v5.py
from datetime import date, timedelta
from unittest.mock import patch
import pytest
from pydantic import ValidationError
from models import CommandeComplete, CommandeModification
from tests.test_commande_complete_route import fake_db, TOUS_LIENS_FORMULES, TOUS_LIENS_PRODUITS

# ===========================================
# TESTS - Mariages (adultes / enfants), repas du personnel (V5.1)
# ===========================================

FORMULE_A = "c9ffddc5-70cf-4cf0-b4c3-960679a94de6"

def commande(**champs):
    """Une commande valide (demain, 10 couverts, une formule), modifiée par `champs`"""
    return {
        "nom_client": "Martin",
        "nombre_couverts": 10,
        "delivery_date": (date.today() + timedelta(days=1)).isoformat(),
        "delivery_hour": "10:00",
        "formules": [{"formule_id": FORMULE_A, "quantite_finale": 10}],
        **champs,
    }

MARIAGE = {"type_prestation": "mariage", "nombre_couverts": 60, "nb_adultes": 50, "nb_enfants": 10, "taux_enfant": 80}

# ---------- Modèle ----------

def test_ancienne_commande_sans_nouveaux_champs_acceptee():
    """L'ancien frontend n'envoie aucun nouveau champ : la commande reste valide"""
    c = CommandeComplete(**commande())
    assert (c.nb_adultes, c.nb_enfants, c.taux_enfant) == (None, None, None)
    assert c.repas_personnel is False
    assert c.nb_repas_personnel is None

def test_mariage_avec_adultes_et_enfants_accepte():
    c = CommandeComplete(**commande(**MARIAGE))
    assert (c.nb_adultes, c.nb_enfants, c.taux_enfant) == (50, 10, 80)

@pytest.mark.parametrize("champs", [
    {"nb_adultes": 50},                                              # pas un mariage
    {"nb_enfants": 10},                                              # pas un mariage
    {"taux_enfant": 80},                                             # pas un mariage
    {**MARIAGE, "nombre_couverts": 55},                              # 50 + 10 ≠ 55
    {**MARIAGE, "taux_enfant": 120},                                 # plus de 100 %
    {**MARIAGE, "nb_enfants": -1, "nombre_couverts": 49},            # négatif
    {"repas_personnel": True},                                       # repas sans nombre
    {"repas_personnel": True, "nb_repas_personnel": 0},              # repas : au moins 1
    {"nb_repas_personnel": 3},                                       # nombre sans repas
])
def test_commande_incoherente_refusee(champs):
    with pytest.raises(ValidationError):
        CommandeComplete(**commande(**champs))

def test_repas_du_personnel_accepte():
    c = CommandeComplete(**commande(avec_service=True, repas_personnel=True, nb_repas_personnel=4))
    assert (c.repas_personnel, c.nb_repas_personnel) == (True, 4)

def test_modification_seulement_des_enfants_acceptee():
    """En modification, les champs non envoyés ne sont pas vérifiés ensemble (la base a les autres)"""
    m = CommandeModification(nb_enfants=12)
    assert m.nb_enfants == 12

@pytest.mark.parametrize("champs", [
    {"type_prestation": "brunch", "nb_adultes": 50},
    {"type_prestation": "mariage", "nombre_couverts": 55, "nb_adultes": 50, "nb_enfants": 10},
    {"taux_enfant": 101},
    {"repas_personnel": True, "nb_repas_personnel": 0},
])
def test_modification_incoherente_refusee(champs):
    with pytest.raises(ValidationError):
        CommandeModification(**champs)

# ---------- Route : les nouveaux champs sont bien enregistrés ----------

def test_creation_enregistre_adultes_enfants_et_repas(client, auth_headers):
    table, tables = fake_db(TOUS_LIENS_FORMULES, TOUS_LIENS_PRODUITS)
    with patch("routes.commandes.supabase") as mock_db:
        mock_db.table.side_effect = table
        response = client.post(
            "/commandes/complete",
            headers=auth_headers,
            json=commande(**MARIAGE, avec_service=True, repas_personnel=True, nb_repas_personnel=4),
        )

    assert response.status_code == 200
    ligne = tables["carnet_commande"].insert.call_args[0][0]
    assert (ligne["nb_adultes"], ligne["nb_enfants"], ligne["taux_enfant"]) == (50, 10, 80)
    assert (ligne["repas_personnel"], ligne["nb_repas_personnel"]) == (True, 4)

def test_modification_qui_quitte_le_mariage_efface_adultes_et_enfants(client, auth_headers):
    """Passer d'un mariage à un autre type, ou retirer les repas du personnel :
    les anciennes valeurs sont effacées en base (sinon elles resteraient, car seuls
    les champs envoyés sont mis à jour)"""
    from tests.test_commande_modification import fake_db as fake_db_modif, COMMANDE
    table, tables = fake_db_modif()
    with patch("routes.commandes.supabase") as mock_db:
        mock_db.table.side_effect = table
        response = client.put(
            f"/commandes/{COMMANDE}/complete",
            headers=auth_headers,
            json={"type_prestation": "brunch", "repas_personnel": False},
        )

    assert response.status_code == 200
    champs = tables["carnet_commande"].update.call_args[0][0]
    assert champs == {
        "type_prestation": "brunch",
        "nb_adultes": None,
        "nb_enfants": None,
        "taux_enfant": None,
        "repas_personnel": False,
        "nb_repas_personnel": None,
    }

def test_modification_d_un_mariage_garde_adultes_et_enfants(client, auth_headers):
    from tests.test_commande_modification import fake_db as fake_db_modif, COMMANDE
    table, tables = fake_db_modif()
    with patch("routes.commandes.supabase") as mock_db:
        mock_db.table.side_effect = table
        response = client.put(
            f"/commandes/{COMMANDE}/complete",
            headers=auth_headers,
            json={"type_prestation": "mariage", "nb_enfants": 12},
        )

    assert response.status_code == 200
    assert tables["carnet_commande"].update.call_args[0][0] == {"type_prestation": "mariage", "nb_enfants": 12}
