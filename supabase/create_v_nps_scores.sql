-- v_nps_scores: Aggregated NPS scores per coach, season, program, and runner status
-- NPS = (% Promoters [9-10]) - (% Detractors [0-6]), range -100 to +100
-- Rows per coach: one per runner_status (New / Return) plus one aggregated "All" row

CREATE OR REPLACE VIEW v_nps_scores AS
WITH base AS (
  SELECT
    sr.season,
    rs.season_phase,
    sr.program,
    r.full_name                                    AS coach,
    sr.are_you_a_new_or_return_runner_to_rhwb      AS runner_status,

    -- NPS helper: 1 = promoter, -1 = detractor, 0 = passive
    sr.feedback_quality,
    sr.communication,
    sr.relationship,
    sr.recommendation,
    sr.rhwb_effectiveness,
    sr.rhwb_knowledge_depth,
    sr.rhwb_recommendation

  FROM v_survey_results sr
  JOIN v_rhwb_roles r ON LOWER(r.email_id) = LOWER(sr.coach_email)
  LEFT JOIN rhwb_seasons rs
    ON rs.season = CAST(SPLIT_PART(sr.season, ' ', 2) AS INTEGER)
  WHERE sr.coach_email IS NOT NULL
    AND sr.season    IS NOT NULL
    AND sr.program   IS NOT NULL
    AND sr.are_you_a_new_or_return_runner_to_rhwb IS NOT NULL
),

nps_by_status AS (
  SELECT
    season,
    season_phase,
    program,
    coach,
    runner_status,

    ROUND(
      (SUM(CASE WHEN feedback_quality    >= 9 THEN 1 WHEN feedback_quality    <= 6 THEN -1 ELSE 0 END)::numeric
       / NULLIF(COUNT(feedback_quality),    0)) * 100
    ) AS feedback_nps,

    ROUND(
      (SUM(CASE WHEN communication       >= 9 THEN 1 WHEN communication       <= 6 THEN -1 ELSE 0 END)::numeric
       / NULLIF(COUNT(communication),       0)) * 100
    ) AS comms_nps,

    ROUND(
      (SUM(CASE WHEN relationship        >= 9 THEN 1 WHEN relationship        <= 6 THEN -1 ELSE 0 END)::numeric
       / NULLIF(COUNT(relationship),        0)) * 100
    ) AS rel_nps,

    ROUND(
      (SUM(CASE WHEN recommendation      >= 9 THEN 1 WHEN recommendation      <= 6 THEN -1 ELSE 0 END)::numeric
       / NULLIF(COUNT(recommendation),      0)) * 100
    ) AS reco_nps,

    ROUND(
      (SUM(CASE WHEN rhwb_effectiveness  >= 9 THEN 1 WHEN rhwb_effectiveness  <= 6 THEN -1 ELSE 0 END)::numeric
       / NULLIF(COUNT(rhwb_effectiveness),  0)) * 100
    ) AS rhwb_comms_nps,

    ROUND(
      (SUM(CASE WHEN rhwb_knowledge_depth >= 9 THEN 1 WHEN rhwb_knowledge_depth <= 6 THEN -1 ELSE 0 END)::numeric
       / NULLIF(COUNT(rhwb_knowledge_depth), 0)) * 100
    ) AS rhwb_knowledge_nps,

    ROUND(
      (SUM(CASE WHEN rhwb_recommendation >= 9 THEN 1 WHEN rhwb_recommendation <= 6 THEN -1 ELSE 0 END)::numeric
       / NULLIF(COUNT(rhwb_recommendation), 0)) * 100
    ) AS rhwb_reco_nps,

    COUNT(*) AS total_responses

  FROM base
  GROUP BY season, season_phase, program, coach, runner_status
)

-- Individual New / Return rows
SELECT * FROM nps_by_status

UNION ALL

-- Aggregated "All" row per coach / season / program
SELECT
  season,
  season_phase,
  program,
  coach,
  'All'                              AS runner_status,

  ROUND(
    (SUM(CASE WHEN feedback_nps    IS NOT NULL THEN feedback_nps    ELSE 0 END)
     / NULLIF(COUNT(feedback_nps),    0))
  )                                  AS feedback_nps,

  ROUND(
    (SUM(CASE WHEN comms_nps       IS NOT NULL THEN comms_nps       ELSE 0 END)
     / NULLIF(COUNT(comms_nps),       0))
  )                                  AS comms_nps,

  ROUND(
    (SUM(CASE WHEN rel_nps         IS NOT NULL THEN rel_nps         ELSE 0 END)
     / NULLIF(COUNT(rel_nps),         0))
  )                                  AS rel_nps,

  ROUND(
    (SUM(CASE WHEN reco_nps        IS NOT NULL THEN reco_nps        ELSE 0 END)
     / NULLIF(COUNT(reco_nps),        0))
  )                                  AS reco_nps,

  ROUND(
    (SUM(CASE WHEN rhwb_comms_nps  IS NOT NULL THEN rhwb_comms_nps  ELSE 0 END)
     / NULLIF(COUNT(rhwb_comms_nps),  0))
  )                                  AS rhwb_comms_nps,

  ROUND(
    (SUM(CASE WHEN rhwb_knowledge_nps IS NOT NULL THEN rhwb_knowledge_nps ELSE 0 END)
     / NULLIF(COUNT(rhwb_knowledge_nps), 0))
  )                                  AS rhwb_knowledge_nps,

  ROUND(
    (SUM(CASE WHEN rhwb_reco_nps   IS NOT NULL THEN rhwb_reco_nps   ELSE 0 END)
     / NULLIF(COUNT(rhwb_reco_nps),   0))
  )                                  AS rhwb_reco_nps,

  SUM(total_responses)               AS total_responses

FROM nps_by_status
GROUP BY season, season_phase, program, coach;

-- Grant read access
GRANT SELECT ON v_nps_scores TO authenticated;
GRANT SELECT ON v_nps_scores TO anon;
