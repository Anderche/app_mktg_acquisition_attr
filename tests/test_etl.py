from datetime import datetime, timedelta

import pandas as pd
import pytest

from etl.channels import channel_for
from etl.paths import build_journeys, transition_matrix


@pytest.mark.parametrize(
    ("source", "medium", "expected"),
    [
        ("google", "organic", "Organic Search"),
        ("google", "cpc", "Paid Search"),
        ("bing", "PPC", "Paid Search"),
        ("youtube.com", "referral", "Referral"),
        ("newsletter", "email", "Email"),
        ("(direct)", "(none)", "Direct"),
        ("(direct)", "(not set)", "Direct"),
        ("<Other>", "<Other>", "Other / Unknown"),
        ("(data deleted)", "(data deleted)", "Other / Unknown"),
        ("google", "(data deleted)", "Other / Unknown"),
        ("facebook.com", "social", "Other / Unknown"),
    ],
)
def test_channel_rules(source, medium, expected):
    assert channel_for(source, medium) == expected


def _sessions(rows):
    t0 = datetime(2020, 11, 1)
    return pd.DataFrame(
        [
            {
                "user_pseudo_id": u,
                "session_id": i,
                "session_start": t0 + timedelta(days=d),
                "channel": ch,
                "converted": conv,
                "revenue": rev,
                "device": "desktop",
                "country": "United States",
            }
            for i, (u, d, ch, conv, rev) in enumerate(rows)
        ]
    )


def test_paths_split_at_each_purchase_and_keep_null_tail():
    j = build_journeys(_sessions([
        ("u1", 0, "Organic Search", False, 0),
        ("u1", 1, "Direct", True, 50),
        ("u1", 2, "Email", True, 30),
        ("u1", 3, "Referral", False, 0),
    ]))
    assert j.conversions["path"].tolist() == ["Organic Search > Direct", "Email"]
    paths = j.paths.set_index("path")
    assert paths.loc["Referral", "total_null"] == 1
    assert paths.loc["Organic Search > Direct", "total_conversion_value"] == 50


def test_lookback_drops_old_touchpoints():
    j = build_journeys(_sessions([
        ("u1", 0, "Paid Search", False, 0),
        ("u1", 40, "Referral", False, 0),
        ("u1", 45, "Direct", True, 20),
    ]))
    assert j.conversions["path"].tolist() == ["Referral > Direct"]


def test_journeys_cover_every_converting_session(built, sessions):
    tables, _ = built
    assert len(tables["fact_paths"]) == int(sessions["converted"].sum())
    assert tables["fact_paths"]["revenue"].sum() == pytest.approx(sessions["revenue"].sum())


def test_transition_rows_sum_to_one(built):
    tables, _ = built
    sums = tables["agg_transitions"].groupby("channel_from")["transition_probability"].sum()
    assert sums.round(9).eq(1).all()
    assert {"(conversion)", "(null)"} <= set(tables["agg_transitions"]["channel_to"])
    assert "(start)" in set(tables["agg_transitions"]["channel_from"])


def test_transition_matrix_counts():
    paths = pd.DataFrame({
        "path": ["A > B", "A"],
        "total_conversions": [2, 0],
        "total_null": [0, 2],
    })
    tm = transition_matrix(paths).set_index(["channel_from", "channel_to"])
    tm = tm["transition_probability"]
    assert tm[("(start)", "A")] == 1.0
    assert tm[("A", "B")] == 0.5
    assert tm[("A", "(null)")] == 0.5
    assert tm[("B", "(conversion)")] == 1.0
