"""FastAPI app serving pre-built DuckDB tables to the dashboard."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.db import db
from api.schemas import (
    AttributionResponse,
    AttributionRow,
    CampaignRow,
    ChannelRow,
    DailyPoint,
    KpiResponse,
    KpiValues,
    MetaResponse,
    RemovalEffectRow,
    SankeyLink,
    SankeyNode,
    SankeyPath,
    SankeyResponse,
)
from etl.channels import CHANNEL_ORDER
from etl.config import END_DATE, MODELS, PATH_SEP, START_DATE

app = FastAPI(
    title="Acquisition & Attribution API",
    version="1.0.0",
    description="Channel KPIs and multi-touch attribution on the GA4 ecommerce sample.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.environ.get(
        "CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()],
    allow_methods=["GET"],
    allow_headers=["*"],
)

ALL = "all"


@app.exception_handler(FileNotFoundError)
def missing_database(_: Request, exc: FileNotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={"detail": f"Analytics database not found ({exc.filename}). Run `make etl`."},
    )


@dataclass
class Filters:
    start: date
    end: date
    device: str
    country: str

    def where(self, date_col: str) -> tuple[str, list]:
        clauses = [f"{date_col} BETWEEN ? AND ?"]
        params: list = [self.start, self.end]
        if self.device != ALL:
            clauses.append("device = ?")
            params.append(self.device)
        if self.country != ALL:
            clauses.append("country = ?")
            params.append(self.country)
        return " AND ".join(clauses), params


def filters(
    start: Annotated[date, Query()] = START_DATE,
    end: Annotated[date, Query()] = END_DATE,
    device: Annotated[str, Query(max_length=64)] = ALL,
    country: Annotated[str, Query(max_length=64)] = ALL,
) -> Filters:
    if start > end:
        raise HTTPException(status_code=422, detail="start must be on or before end")
    return Filters(start, end, device, country)


FilterDep = Annotated[Filters, Depends(filters)]


def _channel_sort_key(channel: str) -> int:
    return CHANNEL_ORDER.index(channel) if channel in CHANNEL_ORDER else len(CHANNEL_ORDER)


def _ratio(num: float, den: float) -> float:
    return float(num) / float(den) if den else 0.0


# --- endpoints ----------------------------------------------------------------


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/meta", response_model=MetaResponse)
def meta() -> MetaResponse:
    cur = db.cursor()
    raw = dict(cur.execute("SELECT key, value FROM etl_meta").fetchall())

    def distinct(col: str) -> list[str]:
        rows = cur.execute(
            f"SELECT {col} FROM fact_sessions GROUP BY 1 ORDER BY count(*) DESC"
        ).fetchall()
        return [r[0] for r in rows]

    return MetaResponse(
        source=raw["source"],
        dataset=raw["dataset"],
        generated_at=raw["generated_at"],
        start_date=raw["start_date"],
        end_date=raw["end_date"],
        lookback_days=int(raw["lookback_days"]),
        stats=json.loads(raw["stats"]),
        limitations=json.loads(raw["limitations"]),
        devices=distinct("device"),
        countries=distinct("country"),
        channels=sorted(distinct("channel"), key=_channel_sort_key),
    )


def _kpis(cur, f: Filters) -> KpiValues:
    where, params = f.where("session_date")
    users, sessions, conversions, revenue = cur.execute(
        f"""SELECT count(DISTINCT user_pseudo_id), count(*),
                   count(*) FILTER (WHERE converted), coalesce(sum(revenue), 0)
            FROM fact_sessions WHERE {where}""",
        params,
    ).fetchone()
    return KpiValues(
        users=users, sessions=sessions, conversions=conversions, revenue=revenue,
        conversion_rate=_ratio(conversions, sessions), aov=_ratio(revenue, conversions),
    )


def previous_period(start: date, end: date) -> tuple[date, date]:
    """The comparison window: the preceding whole months when the range is whole
    calendar months (Dec -> Nov), otherwise the same number of days just before."""
    prev_end = start - timedelta(days=1)
    if start.day == 1 and (end + timedelta(days=1)).day == 1:
        months = (end.year - start.year) * 12 + end.month - start.month + 1
        year, month0 = divmod(start.year * 12 + start.month - 1 - months, 12)
        return date(year, month0 + 1, 1), prev_end
    return prev_end - (end - start), prev_end


@app.get("/api/kpis", response_model=KpiResponse)
def kpis(f: FilterDep) -> KpiResponse:
    cur = db.cursor()
    current = _kpis(cur, f)

    prev_start, prev_end = previous_period(f.start, f.end)
    previous = None
    if prev_start >= START_DATE:
        previous = _kpis(cur, Filters(prev_start, prev_end, f.device, f.country))

    where, params = f.where("s.session_date")
    rows = cur.execute(
        f"""WITH days AS (
                SELECT CAST(d AS DATE) AS date FROM range(?::DATE, ?::DATE + 1, INTERVAL 1 DAY) t(d)
            ), agg AS (
                SELECT s.session_date AS date, count(DISTINCT user_pseudo_id) AS users,
                       count(*) AS sessions, count(*) FILTER (WHERE converted) AS conversions,
                       coalesce(sum(revenue), 0) AS revenue
                FROM fact_sessions s WHERE {where} GROUP BY 1
            )
            SELECT days.date, coalesce(users, 0), coalesce(sessions, 0),
                   coalesce(conversions, 0), coalesce(revenue, 0)
            FROM days LEFT JOIN agg USING (date) ORDER BY days.date""",
        [f.start, f.end, *params],
    ).fetchall()
    daily = [
        DailyPoint(
            date=d, users=u, sessions=s, conversions=c, revenue=r,
            conversion_rate=_ratio(c, s), aov=_ratio(r, c),
        )
        for d, u, s, c, r in rows
    ]
    return KpiResponse(
        current=current, previous=previous, previous_start=prev_start,
        previous_end=prev_end, daily=daily,
    )


@app.get("/api/channels", response_model=list[ChannelRow])
def channels(f: FilterDep) -> list[ChannelRow]:
    where, params = f.where("session_date")
    rows = db.cursor().execute(
        f"""SELECT channel, count(DISTINCT user_pseudo_id), count(*),
                   count(*) FILTER (WHERE converted), coalesce(sum(revenue), 0)
            FROM fact_sessions WHERE {where} GROUP BY channel""",
        params,
    ).fetchall()
    total_revenue = sum(r[4] for r in rows)
    out = [
        ChannelRow(
            channel=ch, users=u, sessions=s, conversions=c, revenue=r,
            conversion_rate=_ratio(c, s), revenue_share=_ratio(r, total_revenue),
        )
        for ch, u, s, c, r in rows
    ]
    return sorted(out, key=lambda row: row.revenue, reverse=True)


@app.get("/api/attribution", response_model=AttributionResponse)
def attribution() -> AttributionResponse:
    rows = db.cursor().execute(
        "SELECT channel, model, conversions, revenue FROM agg_attribution"
    ).fetchall()
    pivot: dict[str, dict[str, dict[str, float]]] = {"conversions": {}, "revenue": {}}
    for channel, model, conv, rev in rows:
        pivot["conversions"].setdefault(channel, {})[model] = conv
        pivot["revenue"].setdefault(channel, {})[model] = rev

    def rows_for(metric: str) -> list[AttributionRow]:
        return [
            AttributionRow(channel=ch, **{m: vals.get(m, 0.0) for m in MODELS})
            for ch, vals in sorted(pivot[metric].items(), key=lambda kv: _channel_sort_key(kv[0]))
        ]

    return AttributionResponse(conversions=rows_for("conversions"), revenue=rows_for("revenue"))


@app.get("/api/removal-effects", response_model=list[RemovalEffectRow])
def removal_effects() -> list[RemovalEffectRow]:
    rows = db.cursor().execute(
        """SELECT channel, removal_effect, removal_effect_share
           FROM agg_removal_effects ORDER BY removal_effect DESC"""
    ).fetchall()
    return [RemovalEffectRow(channel=c, removal_effect=r, share=s) for c, r, s in rows]


@app.get("/api/sankey", response_model=SankeyResponse)
def sankey(
    f: FilterDep,
    steps: Annotated[int, Query(ge=2, le=6)] = 4,
    top: Annotated[int, Query(ge=1, le=100)] = 20,
) -> SankeyResponse:
    """Top converting journeys, each cut to its last `steps` touchpoints."""
    where, params = f.where("conversion_date")
    cur = db.cursor()
    total = cur.execute(f"SELECT count(*) FROM fact_paths WHERE {where}", params).fetchone()[0]
    rows = cur.execute(
        f"""SELECT array_to_string(list_slice(string_split(path, ?), -?, -1), ?) AS p,
                   count(*) AS n, sum(revenue) AS rev
            FROM fact_paths WHERE {where}
            GROUP BY p ORDER BY n DESC, p LIMIT ?""",
        [PATH_SEP, steps, PATH_SEP, *params, top],
    ).fetchall()

    nodes: dict[str, SankeyNode] = {}
    links: dict[tuple[str, str], int] = {}
    for path, n, _ in rows:
        chain = []
        for i, channel in enumerate(path.split(PATH_SEP), start=1):
            name = f"{channel} · {i}"
            nodes.setdefault(name, SankeyNode(name=name, channel=channel, step=i))
            chain.append(name)
        chain.append("Purchase")
        for a, b in zip(chain, chain[1:], strict=False):
            links[(a, b)] = links.get((a, b), 0) + n
    if rows:
        nodes["Purchase"] = SankeyNode(name="Purchase", channel="Purchase", step=None)

    ordered_nodes = sorted(
        nodes.values(),
        key=lambda nd: (nd.step or 99, _channel_sort_key(nd.channel)),
    )
    return SankeyResponse(
        nodes=ordered_nodes,
        links=[
            SankeyLink(source=a, target=b, value=v, share=_ratio(v, total))
            for (a, b), v in links.items()
        ],
        paths=[
            SankeyPath(path=p, conversions=n, share=_ratio(n, total), revenue=rev)
            for p, n, rev in rows
        ],
        total_conversions=total,
    )


CampaignSort = Literal[
    "revenue", "conversions", "sessions", "conversion_rate", "revenue_per_session"
]


@app.get("/api/campaigns", response_model=list[CampaignRow])
def campaigns(
    f: FilterDep,
    sort: CampaignSort = "revenue",
    limit: Annotated[int, Query(ge=1, le=500)] = 25,
) -> list[CampaignRow]:
    where, params = f.where("session_date")
    # `sort` is constrained to the Literal above, so interpolating it is safe.
    rows = db.cursor().execute(
        f"""SELECT campaign, source_medium, channel, sessions, conversions,
                   conversions / sessions AS conversion_rate, revenue,
                   revenue / sessions AS revenue_per_session
            FROM (
                SELECT campaign, source_medium, any_value(channel) AS channel,
                       count(*) AS sessions, count(*) FILTER (WHERE converted) AS conversions,
                       coalesce(sum(revenue), 0) AS revenue
                FROM fact_sessions WHERE {where}
                GROUP BY campaign, source_medium
            )
            ORDER BY {sort} DESC, sessions DESC LIMIT ?""",
        [*params, limit],
    ).fetchall()
    return [
        CampaignRow(
            campaign=c, source_medium=sm, channel=ch, sessions=s, conversions=cv,
            conversion_rate=cr, revenue=r, revenue_per_session=rps,
        )
        for c, sm, ch, s, cv, cr, r, rps in rows
    ]
