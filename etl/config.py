from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
DUCKDB_PATH = DATA_DIR / "analytics.duckdb"
SQL_DIR = Path(__file__).resolve().parent / "sql"

GA4_TABLE = "bigquery-public-data.ga4_obfuscated_sample_ecommerce.events_*"
START_DATE = date(2020, 11, 1)
END_DATE = date(2021, 1, 31)

LOOKBACK_DAYS = 30
PATH_SEP = " > "

MODELS = ("last_click", "first_click", "linear", "markov")
