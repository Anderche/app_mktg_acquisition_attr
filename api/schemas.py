from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class KpiValues(BaseModel):
    users: int
    sessions: int
    conversions: int
    revenue: float
    conversion_rate: float
    aov: float


class DailyPoint(BaseModel):
    date: date
    users: int
    sessions: int
    conversions: int
    revenue: float
    conversion_rate: float
    aov: float


class KpiResponse(BaseModel):
    current: KpiValues
    # None when the previous period falls before the data coverage window.
    previous: KpiValues | None
    previous_start: date
    previous_end: date
    daily: list[DailyPoint]


class ChannelRow(BaseModel):
    channel: str
    users: int
    sessions: int
    conversions: int
    revenue: float
    conversion_rate: float
    revenue_share: float


class AttributionRow(BaseModel):
    channel: str
    last_click: float
    first_click: float
    linear: float
    markov: float


class AttributionResponse(BaseModel):
    conversions: list[AttributionRow]
    revenue: list[AttributionRow]


class RemovalEffectRow(BaseModel):
    channel: str
    removal_effect: float
    share: float


class SankeyNode(BaseModel):
    name: str
    channel: str
    step: int | None


class SankeyLink(BaseModel):
    source: str
    target: str
    value: int
    share: float


class SankeyPath(BaseModel):
    path: str
    conversions: int
    share: float
    revenue: float


class SankeyResponse(BaseModel):
    nodes: list[SankeyNode]
    links: list[SankeyLink]
    paths: list[SankeyPath]
    total_conversions: int


class CampaignRow(BaseModel):
    campaign: str
    source_medium: str
    channel: str
    sessions: int
    conversions: int
    conversion_rate: float
    revenue: float
    revenue_per_session: float


class MetaResponse(BaseModel):
    source: str
    dataset: str
    generated_at: str
    start_date: date
    end_date: date
    lookback_days: int
    stats: dict[str, int]
    limitations: list[str]
    devices: list[str]
    countries: list[str]
    channels: list[str]
