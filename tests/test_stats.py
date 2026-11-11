"""Basic statistics on /api/kpis (01 · Overview) and /api/attribution (03)."""

import statistics
from datetime import date

import pytest

from api.main import DAILY_METRICS, daily_stats, month_over_month, year_ago
from api.schemas import AttributionResponse, DailyPoint, KpiResponse
from etl.config import MODELS


@pytest.mark.parametrize(
    ("start", "end", "expected"),
    [
        # Full period: the last complete month (Jan) against Dec.
        (date(2020, 11, 1), date(2021, 1, 31),
         ((date(2021, 1, 1), date(2021, 1, 31)), (date(2020, 12, 1), date(2020, 12, 31)))),
        # A range ending mid-month uses the last month that is complete.
        (date(2020, 11, 1), date(2021, 1, 15),
         ((date(2020, 12, 1), date(2020, 12, 31)), (date(2020, 11, 1), date(2020, 11, 30)))),
        # November's previous month is before the data starts.
        (date(2020, 11, 1), date(2020, 11, 30), None),
        # No complete month inside the range.
        (date(2020, 12, 10), date(2021, 1, 20), None),
    ],
)
def test_month_over_month_windows(start, end, expected):
    assert month_over_month(start, end) == expected


def test_year_ago_handles_leap_day():
    assert year_ago(date(2024, 2, 29)) == date(2023, 2, 28)
    assert year_ago(date(2021, 1, 31)) == date(2020, 1, 31)


def _day(d, sessions, conversions, revenue):
    return DailyPoint(
        date=d, users=sessions, sessions=sessions, conversions=conversions, revenue=revenue,
        conversion_rate=conversions / sessions if sessions else 0,
        aov=revenue / conversions if conversions else 0,
    )


def test_daily_stats_match_statistics_module():
    daily = [
        _day(date(2020, 11, 1), 100, 2, 100.0),
        _day(date(2020, 11, 2), 200, 0, 0.0),
        _day(date(2020, 11, 3), 300, 4, 300.0),
    ]
    s = daily_stats(daily)
    assert s["sessions"].mean == 200
    assert s["sessions"].std == pytest.approx(statistics.stdev([100, 200, 300]))
    assert s["sessions"].cv == pytest.approx(100 / 200)
    # AOV skips the day without orders instead of counting it as $0.
    assert s["aov"].days == 2
    assert s["aov"].mean == pytest.approx(statistics.fmean([50, 75]))


def test_daily_stats_single_day_has_no_spread():
    s = daily_stats([_day(date(2020, 11, 1), 100, 1, 10.0)])
    assert s["sessions"].std == 0 and s["sessions"].cv == 0


def test_kpis_carry_stats_mom_and_yoy_note(client):
    body = KpiResponse.model_validate(client.get("/api/kpis").json())
    assert set(body.stats) == set(DAILY_METRICS)
    sessions = [p.sessions for p in body.daily]
    assert body.stats["sessions"].std == pytest.approx(statistics.stdev(sessions))
    assert body.mom is not None and body.mom.label == "Jan 2021 vs Dec 2020"
    jan = KpiResponse.model_validate(
        client.get("/api/kpis", params={"start": "2021-01-01", "end": "2021-01-31"}).json()
    )
    assert body.mom.current == jan.current
    assert body.yoy is None and "13+ months" in body.yoy_note


def test_mom_respects_dimension_filters(client):
    all_devices = KpiResponse.model_validate(client.get("/api/kpis").json())
    mobile = KpiResponse.model_validate(client.get("/api/kpis", params={"device": "mobile"}).json())
    assert mobile.mom.current.sessions < all_devices.mom.current.sessions


def test_attribution_model_spread(client):
    body = AttributionResponse.model_validate(client.get("/api/attribution").json())
    for row in body.conversions + body.revenue:
        credit = [getattr(row, m) for m in MODELS]
        assert row.model_std == pytest.approx(statistics.pstdev(credit))
        assert row.model_cv == pytest.approx(row.model_std / statistics.fmean(credit))
