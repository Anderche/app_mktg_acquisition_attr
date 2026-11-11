#!/bin/sh
# Container entrypoint: build the database if needed, then serve API + frontend.
set -eu

# Platforms like Railway only take text variables, so a service-account key can
# be pasted into GOOGLE_CREDENTIALS_JSON and is written to a private file here.
if [ -n "${GOOGLE_CREDENTIALS_JSON:-}" ] && [ -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]; then
  key_file="$(mktemp)"
  printf '%s' "$GOOGLE_CREDENTIALS_JSON" > "$key_file"
  chmod 600 "$key_file"
  export GOOGLE_APPLICATION_CREDENTIALS="$key_file"
fi

# Build on first boot (or every boot with ETL_REFRESH_ON_START=1). A failed ETL
# leaves any previous database in place; the API answers 503 if there is none.
if [ "${ETL_REFRESH_ON_START:-0}" = "1" ] || [ ! -f "$DUCKDB_PATH" ]; then
  python -m etl.run --source "${ETL_SOURCE:-synthetic}" --output "$DUCKDB_PATH" \
    || echo "ETL failed; starting the server with the existing database, if any." >&2
fi

exec uvicorn api.main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips='*'
