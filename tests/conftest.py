from pathlib import Path

import duckdb
import pytest

from etl.extract import generate_synthetic
from etl.load import write_database
from etl.run import build_tables


@pytest.fixture(scope="session")
def sessions():
    return generate_synthetic(n_users=4_000, seed=7)


@pytest.fixture(scope="session")
def built(sessions):
    return build_tables(sessions)


@pytest.fixture(scope="session")
def db_path(built, tmp_path_factory) -> Path:
    tables, stats = built
    path = tmp_path_factory.mktemp("data") / "analytics.duckdb"
    meta = {
        "source": "synthetic",
        "dataset": "test",
        "generated_at": "2026-01-01T00:00:00+00:00",
        "start_date": "2020-11-01",
        "end_date": "2021-01-31",
        "lookback_days": 30,
        "stats": stats,
        "limitations": ["test limitation"],
    }
    write_database(tables, meta, path)
    return path


@pytest.fixture(scope="session")
def con(db_path):
    c = duckdb.connect(str(db_path), read_only=True)
    yield c
    c.close()


@pytest.fixture(scope="session")
def client(db_path):
    from fastapi.testclient import TestClient

    from api import db as db_module
    from api.main import app

    db_module.db.path = db_path
    db_module.db.close()
    with TestClient(app) as c:
        yield c
