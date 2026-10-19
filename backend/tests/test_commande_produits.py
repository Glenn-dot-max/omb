from unittest import mock
from unittest.mock import patch, MagicMock

def test_get_produits_by_commande_success(client, auth_headers):
    """Un USER peut récupérer les produits de SA commande"""
    carnet_commande_response = MagicMock()
    carnet_commande_response.data = [{"id": "commande-1"}]

    commande_produits_response = MagicMock()
    commande_produits_response.data = [
        {"id": 1, "commande_id": "commande-1", "produit_id": "produit-1", "quantite": 2, "unite": "kg"}
    ]

    def table_side_effect(table_name):
        mock_table = MagicMock()
        if table_name == "carnet_commande":
            mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = carnet_commande_response
        elif table_name == "commande_produits":
            mock_table.select.return_value.eq.return_value.execute.return_value = commande_produits_response
        return mock_table

    with patch("routes.commande_produits.supabase") as mock_db:
        mock_db.table.side_effect = table_side_effect
        response = client.get("/commande-produits/commande/commande-1", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == commande_produits_response.data


def test_get_produits_by_commande_not_found(client, auth_headers):
    """404 si la commande n'existe pas ou n'appartient pas à la franchise de l'utilisateur"""
    carnet_commande_response = MagicMock()
    carnet_commande_response.data = []

    def table_side_effect(table_name):
        mock_table = MagicMock()
        if table_name == "carnet_commande":
            mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = carnet_commande_response
        return mock_table

    with patch("routes.commande_produits.supabase") as mock_db:
        mock_db.table.side_effect = table_side_effect
        response = client.get("/commande-produits/commande/commande-inexistante", headers=auth_headers)

    assert response.status_code == 404

def test_delete_commande_produit_success(client, auth_headers):
    """Un USER peut supprimer un commande_produit de SA commande"""
    existing_response = MagicMock()
    existing_response.data = [{"commande_id": "commande-1"}]

    carnet_commande_response = MagicMock()
    carnet_commande_response.data = [{"id": "commande-1"}]

    delete_response = MagicMock()
    delete_response.data = [{"id": 1}]

    def table_side_effect(table_name):
        mock_table = MagicMock()
        if table_name == "commande_produits":
            mock_table.select.return_value.eq.return_value.execute.return_value = existing_response
            mock_table.delete.return_value.eq.return_value.execute.return_value = delete_response
        elif table_name == "carnet_commande":
            mock_table.select.return_value.eq.return_value.execute.return_value = carnet_commande_response
        return mock_table

    with patch("routes.commande_produits.supabase") as mock_db:
        mock_db.table.side_effect = table_side_effect
        response = client.delete("/commande-produits/1", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == {"message": "Commande-Produit deleted successfully"}
    