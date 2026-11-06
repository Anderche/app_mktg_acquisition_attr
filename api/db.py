"""Read-only DuckDB access that picks up a freshly swapped-in ETL file."""

from __future__ import annotations

import os
import threading
from pathlib import Path

import duckdb

from etl.config import DUCKDB_PATH


class Database:
    def __init__(self, path: Path):
        self.path = path
        self._lock = threading.Lock()
        self._con: duckdb.DuckDBPyConnection | None = None
        self._mtime: float | None = None

    def cursor(self) -> duckdb.DuckDBPyConnection:
        """A per-request cursor; reconnects when the ETL has replaced the file."""
        mtime = self.path.stat().st_mtime
        with self._lock:
            if self._con is None or mtime != self._mtime:
                if self._con is not None:
                    self._con.close()
                self._con = duckdb.connect(str(self.path), read_only=True)
                self._mtime = mtime
            return self._con.cursor()

    def close(self) -> None:
        with self._lock:
            if self._con is not None:
                self._con.close()
                self._con = None


db = Database(Path(os.environ.get("DUCKDB_PATH", DUCKDB_PATH)))
