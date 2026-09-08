import pytest
from unittest.mock import MagicMock
from fastapi import HTTPException
from utils import get_or_404, verify_commande_ownership

def test_get_or_404_found():
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": "produit-1", "name": "Croissant"}
    ]

    result = get_or_404(mock_supabase, "produits", "produit-1")

    assert result == {"id": "produit-1", "name": "Croissant"}

def test_get_or_404_not_found():
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    with pytest.raises(HTTPException) as exc_info:
        get_or_404(mock_supabase, "produits", "produit-inexistant", detail="Produit introuvable")
        
    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Produit introuvable"

def test_verify_commande_ownership_tech_admin_bypasses_franchise_filter():
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"id": "commande-1"}]

    result = verify_commande_ownership(mock_supabase, "commande-1", {"role": "TECH_ADMIN"})

    assert result == {"id": "commande-1"}
    mock_supabase.table.return_value.select.return_value.eq.assert_called_once_with("id", "commande-1")

def test_verify_commande_ownership_user_success():
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [{"id": "commande-1"}]

    result = verify_commande_ownership(
        mock_supabase, "commande-1", {"role": "USER", "franchise_id": "franchise-abc"}
    )

    assert result == {"id": "commande-1"}

def test_verify_commande_ownership_not_found_raises_404():
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []

    with pytest.raises(HTTPException) as exc_info:
        verify_commande_ownership(
            mock_supabase, "commande-x", {"role": "USER", "franchise_id": "franchise-abc"}
        )

    assert exc_info.value.status_code == 404

def test_fetch_all_paginated_aggregates_multiple_pages():
    """Doit enchaîner les pages tant qu'une page pleine revient, et s'arrêter sur une page partielle."""
    from utils import fetch_all_paginated

    page1 = MagicMock()
    page1.data = [{"id": i} for i in range(3)]

    page2 = MagicMock()
    page2.data = [{"id": 100}]

    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.range.return_value.execute.side_effect = [page1, page2]

    result = fetch_all_paginated(mock_supabase, "produits", "id", filters={"active": True}, page_size=3)

    assert result == [{"id": 0}, {"id": 1}, {"id": 2}, {"id": 100}]

def test_fetch_all_paginated_stops_on_empty_page():
    """Une page vide arrête immédiatement la boucle"""
    from utils import fetch_all_paginated

    empty_page = MagicMock()
    empty_page.data = []

    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.range.return_value.execute.return_value = empty_page

    result = fetch_all_paginated(mock_supabase, "produits", "id")

    assert result == []
