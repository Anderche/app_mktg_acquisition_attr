.PHONY: install etl etl-bigquery api web dev test test-api test-web lint docker clean

SOURCE ?= synthetic
API_PORT ?= 8000

install:
	uv sync --all-extras
	cd web && pnpm install

# Build data/analytics.duckdb. SOURCE=synthetic (default) needs no credentials;
# SOURCE=bigquery reads the GA4 public sample (needs GOOGLE_APPLICATION_CREDENTIALS).
etl:
	uv run python -m etl.run --source $(SOURCE)

etl-bigquery:
	$(MAKE) etl SOURCE=bigquery

api:
	uv run uvicorn api.main:app --reload --port $(API_PORT)

web:
	cd web && API_PROXY_TARGET=http://localhost:$(API_PORT) pnpm dev

dev:
	$(MAKE) -j2 api web

test: test-api test-web

test-api:
	uv run pytest -q

test-web:
	cd web && pnpm test

lint:
	uv run ruff check etl api tests
	cd web && pnpm lint

docker:
	docker compose up --build

clean:
	rm -f data/*.duckdb data/*.parquet data/*.tmp
