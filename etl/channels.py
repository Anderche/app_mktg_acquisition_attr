"""Step 2 — map source/medium pairs to a default channel group."""

from __future__ import annotations

import pandas as pd

OBFUSCATED = ("<Other>", "(data deleted)")
PAID_MEDIUMS = {"cpc", "ppc", "paid"}
DIRECT_MEDIUMS = {"(none)", "(not set)"}
# The store's own domains. A "referral" from one of these is a self-referral
# (checkout redirects, cross-subdomain hops), not an acquisition source.
OWN_DOMAINS = ("googlemerchandisestore.com",)

CHANNEL_ORDER = [
    "Organic Search",
    "Paid Search",
    "Direct",
    "Referral",
    "Email",
    "Other / Unknown",
]


def is_self_referral(source: str) -> bool:
    host = source.strip().lower()
    return any(host == d or host.endswith("." + d) for d in OWN_DOMAINS)


def channel_for(source: str | None, medium: str | None) -> str:
    source = (source or "").strip()
    medium = (medium or "").strip().lower()
    if any(tag in value for tag in OBFUSCATED for value in (source, medium)):
        return "Other / Unknown"
    if medium == "organic":
        return "Organic Search"
    if medium in PAID_MEDIUMS:
        return "Paid Search"
    if medium == "referral":
        # Treated like GA4's "unwanted referrals": no external source, so Direct.
        return "Direct" if is_self_referral(source) else "Referral"
    if medium == "email":
        return "Email"
    if source == "(direct)" and medium in DIRECT_MEDIUMS:
        return "Direct"
    return "Other / Unknown"


def add_channels(sessions: pd.DataFrame) -> pd.DataFrame:
    """Return a copy with `source_medium` and `channel` columns.

    Classifies each distinct source/medium pair once rather than every row.
    """
    out = sessions.copy()
    pairs = out[["source", "medium"]].drop_duplicates()
    pairs["channel"] = [
        channel_for(s, m) for s, m in zip(pairs["source"], pairs["medium"], strict=True)
    ]
    out = out.merge(pairs, on=["source", "medium"], how="left")
    out["source_medium"] = out["source"] + " / " + out["medium"]
    return out
