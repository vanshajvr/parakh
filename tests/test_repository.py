from contextlib import contextmanager

import psycopg
import pytest

from api.repository import Repository


class FlakyPool:
    """Fails the first `failures` queries the way a connection Neon has closed does."""

    def __init__(self, failures: int):
        self.failures = failures
        self.queries = 0

    @contextmanager
    def connection(self):
        pool = self

        class Conn:
            def execute(self, sql, params):
                pool.queries += 1
                if pool.failures > 0:
                    pool.failures -= 1
                    raise psycopg.OperationalError("server closed the connection unexpectedly")
                return self

            def fetchall(self):
                return [{"ok": True}]

        yield Conn()


def repo_with(pool: FlakyPool) -> Repository:
    repo = Repository.__new__(Repository)
    repo.pool, repo._cache = pool, {}
    return repo


def test_query_retries_once_on_a_dead_connection():
    pool = FlakyPool(failures=1)
    assert repo_with(pool)._all("SELECT 1") == [{"ok": True}]
    assert pool.queries == 2


def test_a_real_outage_still_fails():
    with pytest.raises(psycopg.OperationalError):
        repo_with(FlakyPool(failures=2))._all("SELECT 1")
