"""Tests for AccountService (user_context + model side effects mocked)."""

from unittest.mock import MagicMock, patch

from strr_api.services.account_service import AccountService


@patch("strr_api.services.account_service.AccountRoles.get_account_roles")
@patch("strr_api.services.account_service.User.get_or_create_user_by_jwt")
def test_list_account_roles_returns_query(mock_user, mock_list, authed_g):
    mock_list.return_value = [{"role": "admin"}]
    out = AccountService.list_account_roles(42)
    assert out == [{"role": "admin"}]
    mock_user.assert_called_once()
    mock_list.assert_called_once_with(42)


@patch("strr_api.services.account_service.AccountRoles")
@patch("strr_api.services.account_service.User.get_or_create_user_by_jwt")
def test_create_account_roles_saves_each_role(mock_user, mock_ar_cls, authed_g):
    created = []

    def _new_role():
        m = MagicMock()
        created.append(m)
        return m

    mock_ar_cls.side_effect = _new_role

    last = AccountService.create_account_roles(9, ["a", "b"])

    assert mock_user.called
    assert len(created) == 2
    for inst in created:
        inst.save.assert_called_once()
    assert last is created[-1]
