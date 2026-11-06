"""Batch entry point: `python -m etl.run --source synthetic|bigquery`."""

from __future__ import annotations

import argparse
import logging
import time
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd

from etl import config
from etl.attribution import run_models
from etl.channels import add_channels
from etl.extract import extract_bigquery, generate_synthetic
from etl.load import write_database
from etl.paths import build_journeys, transition_matrix

log = logging.getLogger("etl")

LIMITATIONS = {
    "bigquery": [
        "Some source, medium and campaign values are obfuscated in the public sample "
        "('<Other>', '(data deleted)') and are grouped into 'Other / Unknown'.",
        "The sample has no ad-spend data, so ROAS and CAC are not shown.",
        "user_pseudo_id is cookie-based, so a journey across devices appears as "
        "separate users.",
        "Attribution models are fitted on the full period; date, device and country "
        "filters do not change them.",
    ],
}
LIMITATIONS["synthetic"] = [
    "This build uses synthetic sessions generated to match the GA4 sample's schema and "
    "value conventions. Run `make etl SOURCE=bigquery` to load the real dataset.",
    *LIMITATIONS["bigquery"],
]


def build_tables(sessions: pd.DataFrame) -> tuple[dict[str, pd.DataFrame], dict]:
    sessions = add_channels(sessions)
    sessions["session_date"] = pd.to_datetime(sessions["session_start"]).dt.date
    journeys = build_journeys(sessions)
    attribution = run_models(journeys.paths)

    fact_sessions = sessions[[
        "user_pseudo_id", "session_id", "session_start", "session_date", "device",
        "country", "source", "medium", "source_medium", "campaign", "channel",
        "converted", "revenue",
    ]]
    fact_paths = journeys.conversions[[
        "conversion_id", "conversion_ts", "conversion_date", "device", "country",
        "path", "path_length", "revenue",
    ]]
    tables = {
        "fact_sessions": fact_sessions,
        "fact_paths": fact_paths,
        "agg_paths": journeys.paths,
        "agg_attribution": attribution.by_channel,
        "agg_removal_effects": attribution.removal_effects,
        "agg_transitions": transition_matrix(journeys.paths),
    }
    stats = {
        "sessions": len(fact_sessions),
        "users": int(fact_sessions["user_pseudo_id"].nunique()),
        "conversions": len(fact_paths),
        "distinct_paths": len(journeys.paths),
    }
    return tables, stats


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", choices=["synthetic", "bigquery"], default="synthetic")
    parser.add_argument("--output", type=Path, default=config.DUCKDB_PATH)
    parser.add_argument("--users", type=int, default=60_000,
                        help="synthetic only: number of users to generate")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    t0 = time.perf_counter()
    if args.source == "bigquery":
        log.info("Extracting sessions from %s", config.GA4_TABLE)
        sessions = extract_bigquery()
    else:
        log.info("Generating synthetic sessions for %d users", args.users)
        sessions = generate_synthetic(n_users=args.users)
    log.info("Sessions: %d", len(sessions))

    tables, stats = build_tables(sessions)
    meta = {
        "source": args.source,
        "dataset": config.GA4_TABLE,
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "start_date": config.START_DATE.isoformat(),
        "end_date": config.END_DATE.isoformat(),
        "lookback_days": config.LOOKBACK_DAYS,
        "stats": stats,
        "limitations": LIMITATIONS[args.source],
    }
    write_database(tables, meta, args.output)
    log.info("Wrote %s (%s) in %.1fs", args.output, stats, time.perf_counter() - t0)


if __name__ == "__main__":
    main()
