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

def test_create_commande_produit_success(client, auth_headers):
    """Un USER peut ajouter un produit actif de sa franchise à sa commande"""
    carnet_commande_response = MagicMock()
    carnet_commande_response.data = [{"id": "commande-1"}]

    franchise_produit_response = MagicMock()
    franchise_produit_response.data = [{"produit_id": "22222222-2222-2222-2222-222222222222"}]

    insert_response = MagicMock()
    insert_response.data = [{
        "id": 1,
        "commande_id": "11111111-1111-1111-1111-111111111111",
        "produit_id": "22222222-2222-2222-2222-222222222222",
        "quantite": 3,
        "unite": "kg",
    }]

    def table_side_effect(table_name):
        mock_table = MagicMock()
        if table_name == "carnet_commande":
            mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = carnet_commande_response
        elif table_name == "franchise_produit":
            mock_table.select.return_value.eq.return_value.execute.return_value = franchise_produit_response
        elif table_name == "commande_produits":
            mock_table.insert.return_value.execute.return_value = insert_response
        return mock_table

    with patch("routes.commande_produits.supabase") as mock_db:
        mock_db.table.side_effect = table_side_effect
        response = client.post(
            "/commande-produits/",
            headers=auth_headers,
            json={
                "commande_id": "11111111-1111-1111-1111-111111111111",
                "produit_id": "22222222-2222-2222-2222-222222222222",
                "quantite": 3,
                "unite": "kg",
            },
        )
    assert response.status_code == 200
    assert response.json() == insert_response.data[0]

def test_update_commande_produit_success(client, auth_headers):
    """Un USER peut modifier un commande_produit de SA commande"""
    existing_response = MagicMock()
    existing_response.data = [{"commande_id": "commande-1"}]

    carnet_commande_response = MagicMock()
    carnet_commande_response.data = [{"id": "commande-1"}]

    update_response = MagicMock()
    update_response.data = [{"id": 1, "commande_id": "commande-1", "produit_id": "produit-1", "quantite": 5, "unite": "kg"}]

    def table_side_effect(table_name):
        mock_table = MagicMock()
        if table_name == "commande_produits":
            mock_table.select.return_value.eq.return_value.execute.return_value = existing_response
            mock_table.update.return_value.eq.return_value.execute.return_value = update_response
        elif table_name == "carnet_commande":
            mock_table.select.return_value.eq.return_value.execute.return_value = carnet_commande_response
        return mock_table

    with patch("routes.commande_produits.supabase") as mock_db:
        mock_db.table.side_effect = table_side_effect
        response = client.put(
            "/commande-produits/1",
            headers=auth_headers,
            json={
                "quantite": 5,
                "unite": "kg",
            },
        )
    assert response.status_code == 200
    assert response.json() == update_response.data[0]


def test_update_commande_produit_not_found(client, auth_headers):
    """404 si le commande_produit n'existe pas"""
    existing_response = MagicMock()
    existing_response.data = []

    def table_side_effect(table_name):
        mock_table = MagicMock()
        if table_name == "commande_produits":
            mock_table.select.return_value.eq.return_value.execute.return_value = existing_response
        return mock_table

    with patch("routes.commande_produits.supabase") as mock_db:
        mock_db.table.side_effect = table_side_effect
        response = client.put("/commande-produits/999", headers=auth_headers, json={"quantite": 5})

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
    