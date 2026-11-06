"""Data and model tests against the built DuckDB file."""

import pytest

from etl.config import MODELS


def test_row_counts(con, sessions):
    assert con.execute("SELECT count(*) FROM fact_sessions").fetchone()[0] == len(sessions)
    assert con.execute("SELECT count(*) FROM fact_paths").fetchone()[0] > 0


def _count(con, where: str) -> int:
    return con.execute(f"SELECT count(*) FROM fact_sessions WHERE {where}").fetchone()[0]


def test_no_null_session_ids(con):
    assert _count(con, "session_id IS NULL") == 0


def test_revenue_totals_match_source(con, sessions):
    db_total = con.execute("SELECT sum(revenue) FROM fact_sessions").fetchone()[0]
    assert db_total == pytest.approx(sessions["revenue"].sum(), rel=0.005)


def test_every_session_has_a_channel(con):
    assert _count(con, "channel IS NULL") == 0


@pytest.mark.parametrize("model", MODELS)
def test_attributed_conversions_sum_to_total(con, model):
    total = con.execute("SELECT count(*) FROM fact_paths").fetchone()[0]
    attributed = con.execute(
        "SELECT sum(conversions) FROM agg_attribution WHERE model = ?", [model]
    ).fetchone()[0]
    assert attributed == pytest.approx(total, rel=1e-6)


@pytest.mark.parametrize("model", MODELS)
def test_attributed_revenue_sums_to_total(con, model):
    total = con.execute("SELECT sum(revenue) FROM fact_paths").fetchone()[0]
    attributed = con.execute(
        "SELECT sum(revenue) FROM agg_attribution WHERE model = ?", [model]
    ).fetchone()[0]
    assert attributed == pytest.approx(total, rel=1e-6)


def test_removal_effect_shares_sum_to_one(con):
    s = con.execute("SELECT sum(removal_effect_share) FROM agg_removal_effects").fetchone()[0]
    assert s == pytest.approx(1.0)


def test_failed_load_keeps_previous_file(db_path, tmp_path):
    import shutil

    import duckdb
    import pandas as pd

    from etl.load import write_database

    target = tmp_path / "analytics.duckdb"
    shutil.copy(db_path, target)
    before = target.read_bytes()
    broken = {"fact_sessions": pd.DataFrame({"x": [1]}), "bad name!": pd.DataFrame({"x": [1]})}
    with pytest.raises(duckdb.Error):
        write_database(broken, {}, target)
    assert target.read_bytes() == before
