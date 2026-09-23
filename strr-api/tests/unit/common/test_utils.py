"""Unit tests for strr_api.common.utils."""
from strr_api.common.utils import normalize_to_list


def test_normalize_to_list():
    assert normalize_to_list(None) == []
    assert normalize_to_list(False) == []
    assert normalize_to_list(True) == []
    assert normalize_to_list({}) == []
    assert normalize_to_list("") == []
    assert normalize_to_list("   ") == []
    assert normalize_to_list("a@b.com") == ["a@b.com"]
    assert normalize_to_list("a@b.com, c@d.com") == ["a@b.com", "c@d.com"]
    assert normalize_to_list(["a@b.com", "c@d.com"]) == ["a@b.com", "c@d.com"]
    assert normalize_to_list(("a@b.com", "c@d.com")) == ["a@b.com", "c@d.com"]
    assert normalize_to_list([1001, 1002]) == ["1001", "1002"]
    assert normalize_to_list(1989809) == ["1989809"]
