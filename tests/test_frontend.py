"""Single-service deploys: the API also serves the built React app."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.main import mount_frontend


@pytest.fixture
def site(tmp_path):
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<!doctype html><title>Touchline</title>")
    (tmp_path / "assets" / "index-abc123.js").write_text("console.log('app')")
    (tmp_path / "robots.txt").write_text("User-agent: *")
    (tmp_path.parent / "secret.txt").write_text("outside")

    app = FastAPI()

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    assert mount_frontend(app, tmp_path)
    return TestClient(app)


def test_root_serves_index_without_caching(site):
    r = site.get("/")
    assert r.status_code == 200
    assert "<title>Touchline</title>" in r.text
    assert r.headers["cache-control"] == "no-cache"


def test_hashed_assets_are_cached_for_a_year(site):
    r = site.get("/assets/index-abc123.js")
    assert r.status_code == 200
    assert "immutable" in r.headers["cache-control"]


def test_unknown_paths_fall_back_to_index(site):
    assert "Touchline" in site.get("/journeys/anything").text


def test_top_level_files_are_served(site):
    assert site.get("/robots.txt").text == "User-agent: *"


def test_api_routes_win_and_unknown_api_paths_404(site):
    assert site.get("/api/health").json() == {"status": "ok"}
    assert site.get("/api/does-not-exist").status_code == 404


def test_no_files_outside_the_static_dir(site):
    r = site.get("/..%2Fsecret.txt")
    assert "outside" not in r.text


def test_mount_is_skipped_without_a_build(tmp_path):
    assert mount_frontend(FastAPI(), tmp_path) is False
