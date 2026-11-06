"""Step 3 — turn ordered sessions into customer journeys.

Each purchase closes a journey, so a user who buys twice contributes two
converting paths. Touchpoints older than the lookback window (relative to the
journey's last session) are dropped. Sessions after a user's last purchase form
one non-converting ("null") path.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta

import pandas as pd

from etl.config import LOOKBACK_DAYS, PATH_SEP


@dataclass
class Journeys:
    # One row per conversion: id, timestamp, device, country, channels, revenue.
    conversions: pd.DataFrame
    # path, total_conversions, total_conversion_value, total_null
    paths: pd.DataFrame


def _within_lookback(touches: list[tuple], window: timedelta) -> list[str]:
    end = touches[-1][0]
    return [channel for ts, channel in touches if end - ts <= window]


def build_journeys(sessions: pd.DataFrame, lookback_days: int = LOOKBACK_DAYS) -> Journeys:
    window = timedelta(days=lookback_days)
    ordered = sessions.sort_values(["user_pseudo_id", "session_start", "session_id"])

    conversions: list[dict] = []
    null_paths: list[str] = []
    current_user = None
    touches: list[tuple] = []

    def flush_null():
        if touches:
            null_paths.append(PATH_SEP.join(_within_lookback(touches, window)))

    cols = ["user_pseudo_id", "session_start", "channel", "converted", "revenue",
            "device", "country", "session_id"]
    for user, ts, channel, converted, revenue, device, country, session_id in ordered[
        cols
    ].itertuples(index=False, name=None):
        if user != current_user:
            flush_null()
            current_user, touches = user, []
        touches.append((ts, channel))
        if converted:
            channels = _within_lookback(touches, window)
            conversions.append({
                "conversion_id": f"{user}:{session_id}",
                "user_pseudo_id": user,
                "conversion_ts": ts,
                "device": device,
                "country": country,
                "path": PATH_SEP.join(channels),
                "path_length": len(channels),
                "revenue": float(revenue),
            })
            touches = []
    flush_null()

    conv_df = pd.DataFrame(conversions, columns=[
        "conversion_id", "user_pseudo_id", "conversion_ts", "device", "country",
        "path", "path_length", "revenue",
    ])
    if not conv_df.empty:
        conv_df["conversion_date"] = pd.to_datetime(conv_df["conversion_ts"]).dt.date
    else:
        conv_df["conversion_date"] = pd.Series(dtype="object")

    converting = conv_df.groupby("path", as_index=False).agg(
        total_conversions=("conversion_id", "size"),
        total_conversion_value=("revenue", "sum"),
    )
    nulls = (
        pd.Series(null_paths, name="path").value_counts().rename("total_null").reset_index()
    )
    paths = converting.merge(nulls, on="path", how="outer").fillna(
        {"total_conversions": 0, "total_conversion_value": 0.0, "total_null": 0}
    )
    paths = paths.astype({"total_conversions": int, "total_null": int})
    return Journeys(conversions=conv_df, paths=paths.sort_values("path", ignore_index=True))


def transition_matrix(paths: pd.DataFrame) -> pd.DataFrame:
    """Empirical first-order transitions, weighted by path counts.

    States include (start), (conversion) and (null), matching the Markov model.
    """
    counts: dict[tuple[str, str], float] = {}
    for path, conv, null in paths[["path", "total_conversions", "total_null"]].itertuples(
        index=False, name=None
    ):
        steps = path.split(PATH_SEP)
        for outcome, weight in (("(conversion)", conv), ("(null)", null)):
            if weight <= 0:
                continue
            chain = ["(start)", *steps, outcome]
            for a, b in zip(chain, chain[1:], strict=False):
                counts[(a, b)] = counts.get((a, b), 0.0) + weight
    tm = pd.DataFrame(
        [(a, b, w) for (a, b), w in counts.items()],
        columns=["channel_from", "channel_to", "weight"],
    )
    tm["transition_probability"] = tm["weight"] / tm.groupby("channel_from")["weight"].transform(
        "sum"
    )
    return tm.drop(columns="weight").sort_values(["channel_from", "channel_to"],
                                                ignore_index=True)
