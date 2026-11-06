from datetime import date

import pytest

from api.main import previous_period
from api.schemas import (
    AttributionResponse,
    CampaignRow,
    ChannelRow,
    KpiResponse,
    MetaResponse,
    RemovalEffectRow,
    SankeyResponse,
)


def test_meta(client):
    r = client.get("/api/meta")
    assert r.status_code == 200
    meta = MetaResponse.model_validate(r.json())
    assert meta.start_date == date(2020, 11, 1)
    assert "desktop" in meta.devices
    assert meta.limitations


def test_kpis_full_period_has_no_previous(client):
    body = KpiResponse.model_validate(client.get("/api/kpis").json())
    assert body.previous is None
    assert len(body.daily) == 92
    assert sum(d.sessions for d in body.daily) == body.current.sessions
    assert body.current.conversion_rate == pytest.approx(
        body.current.conversions / body.current.sessions
    )


def test_kpis_month_compares_to_previous_month(client):
    body = KpiResponse.model_validate(
        client.get("/api/kpis", params={"start": "2020-12-01", "end": "2020-12-31"}).json()
    )
    assert body.previous is not None
    assert (body.previous_start, body.previous_end) == (date(2020, 11, 1), date(2020, 11, 30))


@pytest.mark.parametrize(
    ("start", "end", "expected"),
    [
        (date(2020, 12, 1), date(2020, 12, 31), (date(2020, 11, 1), date(2020, 11, 30))),
        (date(2021, 1, 1), date(2021, 1, 31), (date(2020, 12, 1), date(2020, 12, 31))),
        (date(2020, 12, 1), date(2021, 1, 31), (date(2020, 10, 1), date(2020, 11, 30))),
        (date(2020, 12, 10), date(2020, 12, 19), (date(2020, 11, 30), date(2020, 12, 9))),
    ],
)
def test_previous_period(start, end, expected):
    assert previous_period(start, end) == expected


def test_filters_narrow_results(client):
    all_rows = client.get("/api/channels").json()
    mobile = client.get("/api/channels", params={"device": "mobile"}).json()
    total = sum(r["sessions"] for r in all_rows)
    mobile_total = sum(r["sessions"] for r in mobile)
    assert 0 < mobile_total < total
    for row in mobile:
        ChannelRow.model_validate(row)
    assert sum(r["revenue_share"] for r in mobile) == pytest.approx(1.0)


def test_channels_by_device_add_up(client):
    total = sum(r["conversions"] for r in client.get("/api/channels").json())
    by_device = sum(
        sum(r["conversions"] for r in client.get("/api/channels", params={"device": d}).json())
        for d in client.get("/api/meta").json()["devices"]
    )
    assert by_device == total


def test_invalid_date_range(client):
    r = client.get("/api/kpis", params={"start": "2021-01-10", "end": "2021-01-01"})
    assert r.status_code == 422


def test_attribution_shape(client):
    body = AttributionResponse.model_validate(client.get("/api/attribution").json())
    assert body.conversions and body.revenue
    totals = {
        m: sum(getattr(r, m) for r in body.conversions)
        for m in ("last_click", "first_click", "linear", "markov")
    }
    assert max(totals.values()) - min(totals.values()) < 1e-6 * max(totals.values())


def test_removal_effects(client):
    rows = [RemovalEffectRow.model_validate(r) for r in client.get("/api/removal-effects").json()]
    assert rows == sorted(rows, key=lambda r: r.removal_effect, reverse=True)
    assert sum(r.share for r in rows) == pytest.approx(1.0)


def test_sankey(client):
    body = SankeyResponse.model_validate(
        client.get("/api/sankey", params={"steps": 4, "top": 10}).json()
    )
    assert len(body.paths) <= 10
    names = {n.name for n in body.nodes}
    assert "Purchase" in names
    for link in body.links:
        assert link.source in names and link.target in names
    into_purchase = sum(lk.value for lk in body.links if lk.target == "Purchase")
    assert into_purchase == sum(p.conversions for p in body.paths)
    assert all(len(p.path.split(" > ")) <= 4 for p in body.paths)


def test_sankey_rejects_bad_params(client):
    assert client.get("/api/sankey", params={"top": 0}).status_code == 422
    assert client.get("/api/sankey", params={"steps": 9}).status_code == 422


def test_campaigns_sorted_and_limited(client):
    rows = [
        CampaignRow.model_validate(r)
        for r in client.get("/api/campaigns", params={"sort": "conversions", "limit": 5}).json()
    ]
    assert len(rows) <= 5
    assert [r.conversions for r in rows] == sorted((r.conversions for r in rows), reverse=True)


def test_campaigns_reject_unknown_sort(client):
    assert client.get("/api/campaigns", params={"sort": "1; DROP TABLE x"}).status_code == 422


def test_missing_database_returns_503(tmp_path):
    from fastapi.testclient import TestClient

    import api.main as main_module
    from api.db import Database
    from api.main import app

    original = main_module.db
    main_module.db = Database(tmp_path / "missing.duckdb")
    try:
        r = TestClient(app).get("/api/channels")
        assert r.status_code == 503
        assert "make etl" in r.json()["detail"]
    finally:
        main_module.db = original
