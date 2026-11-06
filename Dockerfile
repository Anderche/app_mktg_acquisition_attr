# API + batch ETL image.
FROM python:3.13-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    MPLCONFIGDIR=/tmp/mplconfig

# ChannelAttribution ships as an sdist and compiles a C++ extension.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.10.0 /uv /bin/uv

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --extra bigquery

COPY etl ./etl
COPY api ./api

RUN useradd --create-home app && mkdir -p /app/data && chown app /app/data
USER app

ENV PATH="/app/.venv/bin:$PATH" \
    DUCKDB_PATH=/app/data/analytics.duckdb \
    ETL_SOURCE=synthetic \
    PORT=8000

EXPOSE 8000

# Build the database on first start if no volume provides one, then serve.
CMD ["sh", "-c", "[ -f \"$DUCKDB_PATH\" ] || python -m etl.run --source \"$ETL_SOURCE\" --output \"$DUCKDB_PATH\"; exec uvicorn api.main:app --host 0.0.0.0 --port \"$PORT\""]
