from unittest.mock import MagicMock, patch

def test_get_formules_by_commande_success(client, auth_headers):
    """Un USER peut récipérer les formules de SA commande"""
    carnet_commande_response = MagicMock()
    carnet_commande_response.data = [{"id": "commande-1"}]

    commande_formules_response = MagicMock()
    commande_formules_response.data = [
        {"id": 1, "commande_id": "commande-1", "formule_id": "formule-1",
         "quantite_recommandee": 4, "quantite_finale": 4, "produits_exclus": []}
    ]

    def table_side_effect(table_name):
        mock_table = MagicMock()
        if table_name == "carnet_commande":
            mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = carnet_commande_response
        elif table_name == "commande_formules":
            mock_table.select.return_value.eq.return_value.execute.return_value = commande_formules_response
        return mock_table

    with patch("routes.commande_formules.supabase") as mock_db:
        mock_db.table.side_effect = table_side_effect
        response = client.get("/commande-formules/commande/commande-1", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == commande_formules_response.data

def test_create_commande_formule_success(client, auth_headers):
    """Un USER peut ajouter une formule active de sa franchise à sa commande, avec des exclusions"""
    carnet_commande_response = MagicMock()
    carnet_commande_response.data = [{"id": "commande-1"}]

    franchise_formule_response = MagicMock()
    franchise_formule_response.data = [{"id": "lien-1"}]

    insert_response = MagicMock()
    insert_response.data = [{
        "id": 42,
        "commande_id": "1111111-1111-1111-1111-111111111111",
        "formule_id": "22222222-2222-2222-2222-222222222222",
        "quantite_recommandee": 5,
        "quantite_finale": 5,
    }]

    def table_side_effect(table_name):
        mock_table = MagicMock()
        if table_name == "carnet_commande":
            mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = carnet_commande_response
        elif table_name == "franchise_formule":
            mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = franchise_formule_response
        elif table_name == "commande_formules":
            mock_table.insert.return_value.execute.return_value = insert_response
        return mock_table

    with patch("routes.commande_formules.supabase") as mock_db:
        mock_db.table.side_effect = table_side_effect
        response = client.post(
            "/commande-formules/",
            headers=auth_headers,
            json={
                "commande_id": "11111111-1111-1111-1111-111111111111",
                "formule_id": "22222222-2222-2222-2222-222222222222",
                "quantite_recommandee": 5,
                "quantite_finale": 5,
                "produits_exclus": ["produit-exclu-1"],
            },
        )

    assert response.status_code == 200
    assert response.json() == insert_response.data[0]

def test_delete_commande_formule_success(client, auth_headers):
    existing_response = MagicMock()
    existing_response.data = [{"commande_id": "commande-1"}]

    carnet_commande_response = MagicMock()
    carnet_commande_response.data = [{"id": "commande-1"}]

    delete_response = MagicMock()
    delete_response.data = [{"id": 1}]

    def table_side_effect(table_name):
        mock_table = MagicMock()
        if table_name == "commande_formules":
            mock_table.select.return_value.eq.return_value.execute.return_value = existing_response
            mock_table.delete.return_value.eq.return_value.execute.return_value = delete_response
        elif table_name == "carnet_commande":
            mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = carnet_commande_response
        return mock_table

    with patch("routes.commande_formules.supabase") as mock_db:
        mock_db.table.side_effect = table_side_effect
        response = client.delete("/commande-formules/1", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == {"message": "Commande-Formule deleted successfully"}


def test_get_formule_exclusions_success(client, auth_headers):
    existing_response = MagicMock()
    existing_response.data = [{"commande_id": "commande-1"}]

    carnet_commande_response = MagicMock()
    carnet_commande_response.data = [{"id": "commande-1"}]

    exclusions_response = MagicMock()
    exclusions_response.data = [{"produit_id": "produit-1"}, {"produit_id": "produit-2"}]

    def table_side_effect(table_name):
        mock_table = MagicMock()
        if table_name == "commande_formules":
            mock_table.select.return_value.eq.return_value.execute.return_value = existing_response
        elif table_name == "carnet_commande":
            mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = carnet_commande_response
        elif table_name == "commande_formule_exclusions":
            mock_table.select.return_value.eq.return_value.execute.return_value = exclusions_response
        return mock_table

    with patch("routes.commande_formules.supabase") as mock_db:
        mock_db.table.side_effect = table_side_effect
        response = client.get("/commande-formules/1/exclusions", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == ["produit-1", "produit-2"]


def test_update_commande_formule_exclusions_clears_exclusions(client, auth_headers):
    """Sans quantite_finale ni produits_exclus, on vide juste les exclusions existantes"""
    existing_response = MagicMock()
    existing_response.data = [{"commande_id": "commande-1"}]

    carnet_commande_response = MagicMock()
    carnet_commande_response.data = [{"id": "commande-1"}]

    def table_side_effect(table_name):
        mock_table = MagicMock()
        if table_name == "commande_formules":
            mock_table.select.return_value.eq.return_value.execute.return_value = existing_response
        elif table_name == "carnet_commande":
            mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = carnet_commande_response
        elif table_name == "commande_formule_exclusions":
            mock_table.delete.return_value.eq.return_value.execute.return_value = MagicMock()
        return mock_table

    with patch("routes.commande_formules.supabase") as mock_db:
        mock_db.table.side_effect = table_side_effect
        response = client.patch("/commande-formules/1", headers=auth_headers, json={"produits_exclus": []})

    assert response.status_code == 200
    assert response.json() == {
        "message": "Exclusions mises à jour avec succès",
        "produits_exclus": [],
        "quantite_finale": None,
    }
