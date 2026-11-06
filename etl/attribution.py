"""Step 4 — heuristic and Markov-chain attribution via ChannelAttribution."""

from __future__ import annotations

import contextlib
import io
import os
import tempfile
from dataclasses import dataclass

import pandas as pd

# ChannelAttribution imports matplotlib at load time; keep its cache out of $HOME
# so the batch job also runs in read-only containers.
os.environ.setdefault("MPLCONFIGDIR", os.path.join(tempfile.gettempdir(), "mplconfig"))

from ChannelAttribution import heuristic_models, markov_model  # noqa: E402

HEURISTIC_COLUMNS = {
    "last_click": ("last_touch_conversions", "last_touch_value"),
    "first_click": ("first_touch_conversions", "first_touch_value"),
    "linear": ("linear_touch_conversions", "linear_touch_value"),
}


@dataclass
class AttributionResult:
    # channel, model, conversions, revenue (long format)
    by_channel: pd.DataFrame
    # channel, removal_effect, removal_effect_share
    removal_effects: pd.DataFrame


def run_models(paths: pd.DataFrame, seed: int = 0) -> AttributionResult:
    """Run last/first/linear touch and a first-order Markov model.

    Only converting paths feed the heuristic models; the Markov model also uses
    the null counts to learn drop-off probabilities.
    """
    converting = paths[paths["total_conversions"] > 0]
    # The library prints a licence banner on every call.
    with contextlib.redirect_stdout(io.StringIO()):
        h = heuristic_models(
            converting, "path", "total_conversions", var_value="total_conversion_value"
        )
        m = markov_model(
            paths, "path", "total_conversions",
            var_value="total_conversion_value", var_null="total_null",
            order=1, out_more=True, seed=seed, verbose=0,
        )

    frames = []
    for model, (conv_col, value_col) in HEURISTIC_COLUMNS.items():
        frames.append(pd.DataFrame({
            "channel": h["channel_name"],
            "model": model,
            "conversions": h[conv_col].astype(float),
            "revenue": h[value_col].astype(float),
        }))
    result = m["result"]
    frames.append(pd.DataFrame({
        "channel": result["channel_name"],
        "model": "markov",
        "conversions": result["total_conversions"].astype(float),
        "revenue": result["total_conversion_value"].astype(float),
    }))
    by_channel = pd.concat(frames, ignore_index=True)

    re = m["removal_effects"].rename(columns={
        "channel_name": "channel",
        "removal_effects_conversion": "removal_effect",
    })[["channel", "removal_effect"]]
    re["removal_effect_share"] = re["removal_effect"] / re["removal_effect"].sum()
    return AttributionResult(by_channel=by_channel, removal_effects=re)
