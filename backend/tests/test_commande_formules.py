from unittest.mock import MagicMock, patch

def test_get_formules_by_commande_success(client, auth_headers):
    """Un USER récupère les formules de SA commande, AVEC leur exclusions (P5a-3)"""
    carnet_commande_response = MagicMock()
    carnet_commande_response.data = [{"id": "commande-1"}]

    # Réponse de Supabase avec la jointure : les exclusions sont imbriquées dans chaque formule
    commande_formules_response = MagicMock()
    commande_formules_response.data = [
        {"id": 1, "commande_id": "commande-1", "formule_id": "formule-1",
         "quantite_recommandee": 4, "quantite_finale": 4,
         "commande_formule_exclusions": [{"produit_id": "p-9"}, {"produit_id": "p-7"}]},
        {"id": 2, "commande_id": "commande-1", "formule_id": "formule-2",
         "quantite_recommandee": 2, "quantite_finale": 2,
         "commande_formule_exclusions": []},
    ]

    tables = {}
    def table_side_effect(table_name):
        mock_table = MagicMock()
        if table_name == "carnet_commande":
            mock_table.select.return_value.eq.return_value.execute.return_value = carnet_commande_response
        elif table_name == "commande_formules":
            mock_table.select.return_value.eq.return_value.execute.return_value = commande_formules_response
        tables[table_name] = mock_table
        return mock_table

    with patch("routes.commande_formules.supabase") as mock_db:
        mock_db.table.side_effect = table_side_effect
        response = client.get("/commande-formules/commande/commande-1", headers=auth_headers)

    assert response.status_code == 200

    # Une seule requête, qui demande les exclusions avec les formules (jointure)
    tables["commande_formules"].select.assert_called_once_with("*, commande_formule_exclusions(produit_id)")

    # Les exclusions arrievnt sous la forme attendue par le frontend : une simple liste d'ids
    formules = response.json()
    assert formules[0]["produits_exclus"] == ["p-9", "p-7"]
    assert formules[1]["produits_exclus"] == []
    assert "commande_formule_exclusions" not in formules[0]

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

