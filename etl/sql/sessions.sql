-- One row per session with its traffic source and outcome.
-- @start_suffix / @end_suffix are YYYYMMDD strings bound as query parameters.
WITH events AS (
  SELECT
    user_pseudo_id,
    (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS session_id,
    TIMESTAMP_MICROS(event_timestamp) AS ts,
    event_name,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'source')   AS source,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'medium')   AS medium,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'campaign') AS campaign,
    device.category AS device,
    geo.country     AS country,
    ecommerce.purchase_revenue_in_usd AS revenue
  FROM `bigquery-public-data.ga4_obfuscated_sample_ecommerce.events_*`
  WHERE _TABLE_SUFFIX BETWEEN @start_suffix AND @end_suffix
)
SELECT
  user_pseudo_id, session_id,
  MIN(ts) AS session_start,
  ANY_VALUE(device) AS device, ANY_VALUE(country) AS country,
  COALESCE(MAX(source), '(direct)')  AS source,
  COALESCE(MAX(medium), '(none)')    AS medium,
  COALESCE(MAX(campaign), '(not set)') AS campaign,
  COUNTIF(event_name = 'purchase') > 0 AS converted,
  SUM(IF(event_name = 'purchase', revenue, 0)) AS revenue
FROM events
WHERE session_id IS NOT NULL
GROUP BY user_pseudo_id, session_id;
