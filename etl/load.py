"""Step 5 — write all tables to DuckDB atomically.

The new database is built next to the live one and swapped in with
os.replace, so a failed run leaves the last good file untouched.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import duckdb
import pandas as pd


def write_database(tables: dict[str, pd.DataFrame], meta: dict, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_suffix(".duckdb.tmp")
    tmp.unlink(missing_ok=True)

    con = duckdb.connect(str(tmp))
    try:
        for name, df in tables.items():
            con.register("_df", df)
            con.execute(f"CREATE TABLE {name} AS SELECT * FROM _df")
            con.unregister("_df")
        con.execute("CREATE INDEX idx_sessions_date ON fact_sessions (session_date)")
        con.execute("CREATE TABLE etl_meta (key VARCHAR PRIMARY KEY, value VARCHAR)")
        con.executemany(
            "INSERT INTO etl_meta VALUES (?, ?)",
            [(k, v if isinstance(v, str) else json.dumps(v)) for k, v in meta.items()],
        )
        con.execute("CHECKPOINT")
    finally:
        con.close()
    os.replace(tmp, target)
