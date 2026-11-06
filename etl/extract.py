"""Step 1 — session extraction.

`extract_bigquery` runs etl/sql/sessions.sql against the GA4 public sample.
`generate_synthetic` builds a session table with the same columns and GA4-like
values (obfuscated sources, holiday seasonality, multi-session journeys) so the
whole app runs without GCP credentials.
"""

from __future__ import annotations

import os
from datetime import date, datetime, timedelta

import numpy as np
import pandas as pd

from etl.config import END_DATE, SQL_DIR, START_DATE

SESSION_COLUMNS = [
    "user_pseudo_id",
    "session_id",
    "session_start",
    "device",
    "country",
    "source",
    "medium",
    "campaign",
    "converted",
    "revenue",
]


def extract_bigquery(start: date = START_DATE, end: date = END_DATE) -> pd.DataFrame:
    from google.cloud import bigquery

    client = bigquery.Client(project=os.environ.get("GCP_PROJECT"))
    sql = (SQL_DIR / "sessions.sql").read_text()
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("start_suffix", "STRING", start.strftime("%Y%m%d")),
            bigquery.ScalarQueryParameter("end_suffix", "STRING", end.strftime("%Y%m%d")),
        ]
    )
    df = client.query(sql, job_config=job_config).to_dataframe()
    df["session_start"] = pd.to_datetime(df["session_start"], utc=True).dt.tz_localize(None)
    df["revenue"] = df["revenue"].fillna(0.0).astype(float)
    df["converted"] = df["converted"].astype(bool)
    df["device"] = df["device"].fillna("(not set)")
    df["country"] = df["country"].fillna("(not set)")
    return df[SESSION_COLUMNS]


# --- synthetic generator -----------------------------------------------------

DEVICES = (["desktop", "mobile", "tablet"], [0.57, 0.40, 0.03])
DEVICE_CVR = {"desktop": 1.0, "mobile": 0.62, "tablet": 0.8}

COUNTRIES = (
    [
        "United States", "India", "Canada", "United Kingdom", "France", "Spain",
        "Germany", "Taiwan", "Japan", "China", "Singapore", "Italy",
    ],
    [0.44, 0.09, 0.075, 0.045, 0.035, 0.03, 0.03, 0.025, 0.02, 0.02, 0.015, 0.015],
)

CHANNELS = ["Organic Search", "Direct", "Paid Search", "Referral", "Email", "Other / Unknown"]
FIRST_TOUCH_MIX = [0.36, 0.20, 0.13, 0.15, 0.03, 0.13]
RETURN_TOUCH_MIX = [0.22, 0.38, 0.09, 0.10, 0.12, 0.09]

# Per-session purchase propensity by the session's own channel.
CHANNEL_CVR = {
    "Organic Search": 0.010,
    "Direct": 0.024,
    "Paid Search": 0.020,
    "Referral": 0.014,
    "Email": 0.034,
    "Other / Unknown": 0.011,
}
# How much a touch on this channel lifts purchase propensity in later sessions.
# Upper-funnel channels assist more than they close, which is what makes
# last-click and Markov disagree.
ASSIST_LIFT = {
    "Organic Search": 0.55,
    "Direct": 0.05,
    "Paid Search": 0.35,
    "Referral": 0.45,
    "Email": 0.15,
    "Other / Unknown": 0.20,
}

SOURCE_MEDIUM = {
    "Organic Search": ([("google", "organic"), ("bing", "organic"), ("yahoo", "organic")],
                       [0.92, 0.06, 0.02]),
    "Direct": ([("(direct)", "(none)")], [1.0]),
    "Paid Search": ([("google", "cpc")], [1.0]),
    "Referral": ([("shop.googlemerchandisestore.com", "referral"),
                  ("analytics.google.com", "referral"),
                  ("support.google.com", "referral"),
                  ("youtube.com", "referral")],
                 [0.55, 0.2, 0.15, 0.1]),
    "Email": ([("newsletter", "email"), ("mail.google.com", "email")], [0.8, 0.2]),
    "Other / Unknown": ([("<Other>", "<Other>"), ("(data deleted)", "(data deleted)")],
                        [0.7, 0.3]),
}

PAID_CAMPAIGNS = (
    ["Brand_Search_US", "Holiday_Gifts_2020", "Black_Friday_2020", "Apparel_Generic",
     "Drinkware_Promo", "Remarketing_Search", "New_Year_Sale_2021"],
    [0.24, 0.2, 0.14, 0.14, 0.1, 0.1, 0.08],
)
EMAIL_CAMPAIGNS = (
    ["Holiday_Newsletter_Dec", "Cyber_Monday_Email", "Welcome_Series", "Year_End_Clearance"],
    [0.35, 0.25, 0.25, 0.15],
)
# Campaign-level conversion and basket multipliers so the leaderboard has spread.
CAMPAIGN_CVR = {
    "Brand_Search_US": 1.6, "Holiday_Gifts_2020": 1.15, "Black_Friday_2020": 1.35,
    "Apparel_Generic": 0.55, "Drinkware_Promo": 0.8, "Remarketing_Search": 1.4,
    "New_Year_Sale_2021": 0.7, "Holiday_Newsletter_Dec": 1.2, "Cyber_Monday_Email": 1.5,
    "Welcome_Series": 0.7, "Year_End_Clearance": 0.9,
}
CAMPAIGN_AOV = {"Black_Friday_2020": 1.25, "Holiday_Gifts_2020": 1.15, "Apparel_Generic": 0.85,
                "Year_End_Clearance": 0.8, "Brand_Search_US": 1.1}


def _seasonality(day: date) -> float:
    """Relative traffic weight: holiday ramp, BFCM spike, post-Christmas dip."""
    w = 1.0
    if date(2020, 11, 20) <= day <= date(2020, 12, 18):
        w = 1.45
    if date(2020, 11, 27) <= day <= date(2020, 11, 30):
        w = 2.1
    if date(2020, 12, 24) <= day <= date(2020, 12, 31):
        w = 0.7
    if day.weekday() >= 5:
        w *= 0.85
    return w


def _cvr_season(day: date) -> float:
    if date(2020, 11, 27) <= day <= date(2020, 11, 30):
        return 1.6
    if date(2020, 12, 1) <= day <= date(2020, 12, 15):
        return 1.25
    if day >= date(2020, 12, 22):
        return 0.75
    return 1.0


def generate_synthetic(n_users: int = 60_000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    days = [START_DATE + timedelta(d) for d in range((END_DATE - START_DATE).days + 1)]
    day_w = np.array([_seasonality(d) for d in days])
    day_p = day_w / day_w.sum()
    window_end = datetime.combine(END_DATE, datetime.max.time())

    devices = rng.choice(DEVICES[0], size=n_users, p=DEVICES[1])
    country_p = np.array(COUNTRIES[1])
    country_names = COUNTRIES[0] + ["(other)"]
    country_p = np.append(country_p, 1 - country_p.sum())
    countries = rng.choice(country_names, size=n_users, p=country_p)
    first_day_idx = rng.choice(len(days), size=n_users, p=day_p)
    n_sessions = np.minimum(rng.geometric(0.55, size=n_users), 12)

    rows: list[tuple] = []
    for u in range(n_users):
        start = datetime.combine(days[first_day_idx[u]], datetime.min.time())
        ts = start + timedelta(seconds=int(rng.integers(0, 86_400)))
        user_id = f"{rng.integers(10**9, 10**10)}.{int(ts.timestamp())}"
        device, country = devices[u], countries[u]
        intent = 1.0
        prev_channel = None

        for k in range(int(n_sessions[u])):
            if k > 0:
                # Returning visits cluster within a couple of weeks of the last one.
                ts += timedelta(hours=float(rng.exponential(24 * 6)) + 0.5)
                if ts > window_end:
                    break
            mix = FIRST_TOUCH_MIX if k == 0 else RETURN_TOUCH_MIX
            channel = CHANNELS[rng.choice(len(CHANNELS), p=mix)]
            if prev_channel == "Email" and rng.random() < 0.3:
                channel = "Direct"
            pairs, pair_p = SOURCE_MEDIUM[channel]
            source, medium = pairs[rng.choice(len(pairs), p=pair_p)]

            if channel == "Paid Search":
                campaign = rng.choice(PAID_CAMPAIGNS[0], p=PAID_CAMPAIGNS[1])
            elif channel == "Email":
                campaign = rng.choice(EMAIL_CAMPAIGNS[0], p=EMAIL_CAMPAIGNS[1])
            elif channel == "Organic Search":
                campaign = "(organic)"
            elif channel == "Referral":
                campaign = "(referral)"
            elif channel == "Direct":
                campaign = "(direct)"
            else:
                campaign = source
            campaign = str(campaign)
            campaign_mult = CAMPAIGN_CVR.get(campaign, 1.0)
            aov_mult = CAMPAIGN_AOV.get(campaign, 1.0)

            p = (
                CHANNEL_CVR[channel]
                * campaign_mult
                * DEVICE_CVR[device]
                * _cvr_season(ts.date())
                * intent
                * (1 + 0.25 * min(k, 4))
            )
            converted = bool(rng.random() < min(p, 0.6))
            revenue = 0.0
            if converted:
                revenue = round(float(rng.lognormal(mean=4.05, sigma=0.65)) * aov_mult, 2)
                intent = 0.6
            else:
                intent = min(intent + ASSIST_LIFT[channel], 4.0)

            rows.append((
                user_id, int(ts.timestamp()), ts, device, country, source, medium,
                campaign, converted, revenue,
            ))
            prev_channel = channel

    df = pd.DataFrame(rows, columns=SESSION_COLUMNS)
    return df.sort_values(["user_pseudo_id", "session_start"], ignore_index=True)
