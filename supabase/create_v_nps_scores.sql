-- v_nps_scores: Aggregated NPS scores per coach, season, program, and runner status
-- NPS = (% Promoters [9-10]) - (% Detractors [0-6]), range -100 to +100
--
-- Sources:
--   Seasons 13 & 14 → rhwbsurvey (wide format, scores stored as text)
--   Season  15+     → nps_survey_responses via v_survey_results (normalized, scores as integer)
--
-- Season 15 note: runner_status derived from runners_profile.member_since
-- (member_since = season → 'New', else → 'Return').

CREATE OR REPLACE VIEW v_nps_scores AS
WITH

-- -----------------------------------------------
-- Seasons 13 & 14 from rhwbsurvey (wide format)
-- -----------------------------------------------
raw_13_14 AS (
  -- Pro
  SELECT
    season, season_phase,
    'Pro' AS program,
    pro_runners_who_is_your_coach AS coach,
    CASE
      WHEN are_you_a_new_or_return_runner_to_rhwb ILIKE '%new%'    THEN 'New'
      WHEN are_you_a_new_or_return_runner_to_rhwb ILIKE '%return%' THEN 'Return'
    END AS runner_status,
    NULLIF(TRIM(your_coach_on_a_scale_from_0_to_10_rate_the_quality_and_timelin), '')::numeric AS feedback_quality,
    NULLIF(TRIM(your_coach_on_a_scale_from_0_to_10_rate_the_overall_communicati), '')::numeric AS communication,
    NULLIF(TRIM(pro_your_coach_on_a_scale_from_0_to_10_rate_the_relationship_wi), '')::numeric AS relationship,
    NULLIF(TRIM(pro_your_coach_on_a_scale_from_0_to_10_how_likely_are_you_to_re), '')::numeric AS recommendation,
    NULLIF(TRIM(overall_rhwb_on_a_scale_from_0_to_10_rate_the_effectiveness_of_), '')::numeric AS rhwb_effectiveness,
    NULLIF(TRIM(overall_rhwb_on_a_scale_from_0_to_10_rate_the_depth_and_clarity), '')::numeric AS rhwb_knowledge_depth,
    NULLIF(TRIM(overall_rhwb_finally_on_a_scale_from_0_to_10_how_likely_are_you), '')::numeric AS rhwb_recommendation
  FROM rhwbsurvey
  WHERE what_program_you_are_in_now = 'Pro (With Dedicated Coach)'
    AND pro_runners_who_is_your_coach IS NOT NULL
    AND season IS NOT NULL
    AND are_you_a_new_or_return_runner_to_rhwb IS NOT NULL

  UNION ALL

  -- Masters
  SELECT
    season, season_phase,
    'Masters' AS program,
    masters_program_who_is_your_coach AS coach,
    CASE
      WHEN are_you_a_new_or_return_runner_to_rhwb ILIKE '%new%'    THEN 'New'
      WHEN are_you_a_new_or_return_runner_to_rhwb ILIKE '%return%' THEN 'Return'
    END AS runner_status,
    NULL::numeric AS feedback_quality,
    NULL::numeric AS communication,
    NULLIF(TRIM(masters_your_coach_on_a_scale_from_0_to_10_rate_the_relationshi), '')::numeric AS relationship,
    NULLIF(TRIM(masters_overall_program_on_a_scale_from_0_to_10_how_likely_are_), '')::numeric AS recommendation,
    NULLIF(TRIM(overall_rhwb_on_a_scale_from_0_to_10_rate_the_effectiveness_of_), '')::numeric AS rhwb_effectiveness,
    NULLIF(TRIM(overall_rhwb_on_a_scale_from_0_to_10_rate_the_depth_and_clarity), '')::numeric AS rhwb_knowledge_depth,
    NULLIF(TRIM(overall_rhwb_finally_on_a_scale_from_0_to_10_how_likely_are_you), '')::numeric AS rhwb_recommendation
  FROM rhwbsurvey
  WHERE what_program_you_are_in_now = 'Masters (Senior Citizens walking program)'
    AND masters_program_who_is_your_coach IS NOT NULL
    AND season IS NOT NULL
    AND are_you_a_new_or_return_runner_to_rhwb IS NOT NULL

  UNION ALL

  -- Walk
  SELECT
    season, season_phase,
    'Walk' AS program,
    walkers_program_who_is_your_coach AS coach,
    CASE
      WHEN are_you_a_new_or_return_runner_to_rhwb ILIKE '%new%'    THEN 'New'
      WHEN are_you_a_new_or_return_runner_to_rhwb ILIKE '%return%' THEN 'Return'
    END AS runner_status,
    NULL::numeric AS feedback_quality,
    NULL::numeric AS communication,
    NULLIF(TRIM(walkers_your_coach_on_a_scale_from_0_to_10_rate_the_relationshi), '')::numeric AS relationship,
    NULLIF(TRIM(walkers_overall_program_on_a_scale_from_0_to_10_how_likely_are_), '')::numeric AS recommendation,
    NULLIF(TRIM(overall_rhwb_on_a_scale_from_0_to_10_rate_the_effectiveness_of_), '')::numeric AS rhwb_effectiveness,
    NULLIF(TRIM(overall_rhwb_on_a_scale_from_0_to_10_rate_the_depth_and_clarity), '')::numeric AS rhwb_knowledge_depth,
    NULLIF(TRIM(overall_rhwb_finally_on_a_scale_from_0_to_10_how_likely_are_you), '')::numeric AS rhwb_recommendation
  FROM rhwbsurvey
  WHERE what_program_you_are_in_now = 'Walking Program'
    AND walkers_program_who_is_your_coach IS NOT NULL
    AND season IS NOT NULL
    AND are_you_a_new_or_return_runner_to_rhwb IS NOT NULL
),

-- -----------------------------------------------
-- Season 15+ from v_survey_results (normalized)
-- runner_status derived from runners_profile.member_since:
--   member_since = current season → 'New', else → 'Return'
-- -----------------------------------------------
raw_15 AS (
  SELECT
    sr.season,
    NULL::text AS season_phase,
    sr.program,
    COALESCE(r.full_name, r.email_id) AS coach,
    CASE WHEN rp.member_since = sr.season THEN 'New' ELSE 'Return' END AS runner_status,
    sr.feedback_quality::numeric,
    sr.communication::numeric,
    sr.relationship::numeric,
    sr.recommendation::numeric,
    sr.rhwb_effectiveness::numeric,
    sr.rhwb_knowledge_depth::numeric,
    sr.rhwb_recommendation::numeric
  FROM v_survey_results sr
  JOIN v_rhwb_roles r ON LOWER(r.email_id) = LOWER(sr.coach_email)
  LEFT JOIN runners_profile rp ON LOWER(rp.email_id) = LOWER(sr.email_id)
  WHERE sr.coach_email IS NOT NULL
    AND sr.season IS NOT NULL
    AND sr.program IN ('Pro', 'Masters')
),

base AS (
  SELECT * FROM raw_13_14
  UNION ALL
  SELECT * FROM raw_15
),

nps_by_status AS (
  SELECT
    season, season_phase, program, coach, runner_status,
    ROUND((SUM(CASE WHEN feedback_quality     >= 9 THEN 1 WHEN feedback_quality     <= 6 THEN -1 ELSE 0 END)::numeric / NULLIF(COUNT(feedback_quality),     0)) * 100) AS feedback_nps,
    ROUND((SUM(CASE WHEN communication        >= 9 THEN 1 WHEN communication        <= 6 THEN -1 ELSE 0 END)::numeric / NULLIF(COUNT(communication),        0)) * 100) AS comms_nps,
    ROUND((SUM(CASE WHEN relationship         >= 9 THEN 1 WHEN relationship         <= 6 THEN -1 ELSE 0 END)::numeric / NULLIF(COUNT(relationship),         0)) * 100) AS rel_nps,
    ROUND((SUM(CASE WHEN recommendation       >= 9 THEN 1 WHEN recommendation       <= 6 THEN -1 ELSE 0 END)::numeric / NULLIF(COUNT(recommendation),       0)) * 100) AS reco_nps,
    ROUND((SUM(CASE WHEN rhwb_effectiveness   >= 9 THEN 1 WHEN rhwb_effectiveness   <= 6 THEN -1 ELSE 0 END)::numeric / NULLIF(COUNT(rhwb_effectiveness),   0)) * 100) AS rhwb_comms_nps,
    ROUND((SUM(CASE WHEN rhwb_knowledge_depth >= 9 THEN 1 WHEN rhwb_knowledge_depth <= 6 THEN -1 ELSE 0 END)::numeric / NULLIF(COUNT(rhwb_knowledge_depth), 0)) * 100) AS rhwb_knowledge_nps,
    ROUND((SUM(CASE WHEN rhwb_recommendation  >= 9 THEN 1 WHEN rhwb_recommendation  <= 6 THEN -1 ELSE 0 END)::numeric / NULLIF(COUNT(rhwb_recommendation),  0)) * 100) AS rhwb_reco_nps,
    COUNT(*) AS total_responses
  FROM base
  WHERE runner_status IS NOT NULL AND coach IS NOT NULL
  GROUP BY season, season_phase, program, coach, runner_status
)

-- 'All' row: NPS computed directly from individual responses (not averaged from New/Return)
nps_all AS (
  SELECT
    season, season_phase, program, coach,
    'All' AS runner_status,
    ROUND((SUM(CASE WHEN feedback_quality     >= 9 THEN 1 WHEN feedback_quality     <= 6 THEN -1 ELSE 0 END)::numeric / NULLIF(COUNT(feedback_quality),     0)) * 100) AS feedback_nps,
    ROUND((SUM(CASE WHEN communication        >= 9 THEN 1 WHEN communication        <= 6 THEN -1 ELSE 0 END)::numeric / NULLIF(COUNT(communication),        0)) * 100) AS comms_nps,
    ROUND((SUM(CASE WHEN relationship         >= 9 THEN 1 WHEN relationship         <= 6 THEN -1 ELSE 0 END)::numeric / NULLIF(COUNT(relationship),         0)) * 100) AS rel_nps,
    ROUND((SUM(CASE WHEN recommendation       >= 9 THEN 1 WHEN recommendation       <= 6 THEN -1 ELSE 0 END)::numeric / NULLIF(COUNT(recommendation),       0)) * 100) AS reco_nps,
    ROUND((SUM(CASE WHEN rhwb_effectiveness   >= 9 THEN 1 WHEN rhwb_effectiveness   <= 6 THEN -1 ELSE 0 END)::numeric / NULLIF(COUNT(rhwb_effectiveness),   0)) * 100) AS rhwb_comms_nps,
    ROUND((SUM(CASE WHEN rhwb_knowledge_depth >= 9 THEN 1 WHEN rhwb_knowledge_depth <= 6 THEN -1 ELSE 0 END)::numeric / NULLIF(COUNT(rhwb_knowledge_depth), 0)) * 100) AS rhwb_knowledge_nps,
    ROUND((SUM(CASE WHEN rhwb_recommendation  >= 9 THEN 1 WHEN rhwb_recommendation  <= 6 THEN -1 ELSE 0 END)::numeric / NULLIF(COUNT(rhwb_recommendation),  0)) * 100) AS rhwb_reco_nps,
    COUNT(*) AS total_responses
  FROM base
  WHERE runner_status IS NOT NULL AND coach IS NOT NULL
  GROUP BY season, season_phase, program, coach
)

-- New / Return rows + overall 'All' row computed from raw responses
SELECT * FROM nps_by_status
UNION ALL
SELECT * FROM nps_all;

-- Grant read access
GRANT SELECT ON v_nps_scores TO authenticated;
GRANT SELECT ON v_nps_scores TO anon;
