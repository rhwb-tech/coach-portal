-- v_survey_response_rate: Survey response rate per coach per season
-- Columns: season, coach, runners_count, respondents, response_rate_percent, avg_response_rate_for_season
--
-- Sources:
--   Runner counts Season 15  → runner_season_info (season = 'Season 15')
--   Runner counts other seasons → rhwb_coach_input
--   Respondents 13/14 → rhwbsurvey (coach stored as full name in program-specific columns)
--   Respondents 15    → nps_survey_responses (coach stored as email)

CREATE OR REPLACE VIEW v_survey_response_rate AS
WITH

-- Season 15 runner counts from runner_season_info
coach_runners_s15 AS (
  SELECT
    rsi.season,
    r.full_name AS coach,
    r.email_id  AS coach_email,
    COUNT(DISTINCT rsi.email_id) AS runners_count
  FROM runner_season_info rsi
  JOIN v_rhwb_roles r ON LOWER(r.full_name) = LOWER(rsi.coach)
  WHERE rsi.season = 'Season 15'
  GROUP BY rsi.season, r.full_name, r.email_id
),

-- Other seasons: runner counts from rhwb_coach_input
coach_runners_other AS (
  SELECT
    ci.season,
    r.full_name AS coach,
    r.email_id  AS coach_email,
    COUNT(DISTINCT ci.email_id) AS runners_count
  FROM rhwb_coach_input ci
  JOIN v_rhwb_roles r ON LOWER(r.email_id) = LOWER(ci.coach_email)
  WHERE ci.season IS NOT NULL AND ci.season != 'Season 15'
  GROUP BY ci.season, r.full_name, r.email_id
),

coach_runners AS (
  SELECT * FROM coach_runners_s15
  UNION ALL
  SELECT * FROM coach_runners_other
),

-- Respondents for Seasons 13 & 14: coach name stored in survey row
respondents_13_14 AS (
  SELECT season, pro_runners_who_is_your_coach AS coach, COUNT(*) AS cnt
  FROM rhwbsurvey
  WHERE pro_runners_who_is_your_coach IS NOT NULL AND season IS NOT NULL
  GROUP BY season, pro_runners_who_is_your_coach

  UNION ALL

  SELECT season, masters_program_who_is_your_coach AS coach, COUNT(*) AS cnt
  FROM rhwbsurvey
  WHERE masters_program_who_is_your_coach IS NOT NULL AND season IS NOT NULL
  GROUP BY season, masters_program_who_is_your_coach

  UNION ALL

  SELECT season, walkers_program_who_is_your_coach AS coach, COUNT(*) AS cnt
  FROM rhwbsurvey
  WHERE walkers_program_who_is_your_coach IS NOT NULL AND season IS NOT NULL
  GROUP BY season, walkers_program_who_is_your_coach
),

respondents_13_14_agg AS (
  SELECT season, coach, SUM(cnt) AS respondents
  FROM respondents_13_14
  GROUP BY season, coach
),

-- Respondents for Season 15: coach identified by email
-- Filter to Pro/Masters only to match v_nps_scores which excludes program='NA' and Walk
respondents_15 AS (
  SELECT
    n.season,
    COALESCE(r.full_name, r.email_id) AS coach,
    COUNT(*) AS respondents
  FROM nps_survey_responses n
  JOIN v_rhwb_roles r ON LOWER(r.email_id) = LOWER(n.coach_email)
  WHERE n.season IS NOT NULL AND n.coach_email IS NOT NULL
    AND n.program IN ('Pro', 'Masters')
  GROUP BY n.season, COALESCE(r.full_name, r.email_id)
),

all_respondents AS (
  SELECT * FROM respondents_13_14_agg
  UNION ALL
  SELECT * FROM respondents_15
),

-- Join assigned runner counts with survey respondent counts
combined AS (
  SELECT
    cr.season,
    cr.coach,
    cr.runners_count,
    COALESCE(ar.respondents, 0) AS respondents
  FROM coach_runners cr
  LEFT JOIN all_respondents ar ON ar.season = cr.season AND ar.coach = cr.coach
),

with_rate AS (
  SELECT
    season,
    coach,
    runners_count,
    respondents,
    ROUND((respondents::numeric / NULLIF(runners_count, 0)) * 100) AS response_rate_percent
  FROM combined
)

SELECT
  w.season,
  w.coach,
  w.runners_count,
  w.respondents,
  w.response_rate_percent,
  ROUND(AVG(w.response_rate_percent) OVER (PARTITION BY w.season)) AS avg_response_rate_for_season
FROM with_rate w;

GRANT SELECT ON v_survey_response_rate TO authenticated;
GRANT SELECT ON v_survey_response_rate TO anon;
