import pytest

from ledger.db import database_url

SECRET = "npg_supersecret"


@pytest.mark.parametrize("url", [
    f"ppostgresql://user:{SECRET}@host/db",
    f"postgresql://user:{SECRET}@host/db?sslmode=require channel",
])
def test_bad_url_error_never_contains_the_password(monkeypatch, url):
    monkeypatch.setenv("DATABASE_URL", url)
    with pytest.raises(RuntimeError) as err:
        database_url()
    assert SECRET not in str(err.value)
    assert err.value.__cause__ is None


def test_valid_url_passes(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"postgresql://user:{SECRET}@host.neon.tech/db?sslmode=require")
    assert database_url().startswith("postgresql://")
