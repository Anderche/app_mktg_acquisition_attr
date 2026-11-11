# One image: the React dashboard is built here and served by the FastAPI app,
# so the whole product runs as a single service on one origin (no CORS).

# --- 1. frontend build -----------------------------------------------------------
FROM node:22-alpine AS web
RUN corepack enable
WORKDIR /web
COPY web/package.json web/pnpm-lock.yaml web/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY web/ ./
# Same-origin API: leave VITE_API_URL empty so the app calls /api/*.
RUN pnpm build

# --- 2. API + batch ETL ----------------------------------------------------------
FROM python:3.13-slim

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
COPY docker/start.sh ./start.sh
COPY --from=web /web/dist ./static

RUN useradd --create-home app && mkdir -p /app/data && chown app /app/data
USER app

ENV PATH="/app/.venv/bin:$PATH" \
    DUCKDB_PATH=/app/data/analytics.duckdb \
    STATIC_DIR=/app/static \
    ETL_SOURCE=synthetic \
    PORT=8000

EXPOSE 8000
CMD ["sh", "/app/start.sh"]
