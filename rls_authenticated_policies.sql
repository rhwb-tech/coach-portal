-- RLS Policies for All Tables
-- Part 1: Tables requiring INSERT/UPDATE/DELETE by authenticated users only
-- Part 2: Tables requiring SELECT access for all public users
-- Created: 2025-09-01

-- =============================================================================
-- PART 1: TABLES REQUIRING AUTHENTICATED ACCESS FOR WRITE OPERATIONS
-- =============================================================================

-- Enable RLS on tables requiring authenticated access for writes
ALTER TABLE rhwb_coach_input ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE runners_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhwb_action_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE runner_season_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhwb_helpdesk_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhwb_activities_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to ensure clean slate)
DROP POLICY IF EXISTS "authenticated_select_rhwb_coach_input" ON rhwb_coach_input;
DROP POLICY IF EXISTS "authenticated_update_rhwb_coach_input" ON rhwb_coach_input;
DROP POLICY IF EXISTS "authenticated_insert_pulse_interactions" ON pulse_interactions;
DROP POLICY IF EXISTS "authenticated_select_pulse_interactions" ON pulse_interactions;
DROP POLICY IF EXISTS "authenticated_all_profile_notes" ON profile_notes;
DROP POLICY IF EXISTS "authenticated_update_runners_profile" ON runners_profile;
DROP POLICY IF EXISTS "authenticated_select_runners_profile" ON runners_profile;
DROP POLICY IF EXISTS "authenticated_all_rhwb_action_requests" ON rhwb_action_requests;
DROP POLICY IF EXISTS "authenticated_all_runner_season_info" ON runner_season_info;
DROP POLICY IF EXISTS "authenticated_insert_rhwb_helpdesk_requests" ON rhwb_helpdesk_requests;
DROP POLICY IF EXISTS "authenticated_select_rhwb_helpdesk_requests" ON rhwb_helpdesk_requests;
DROP POLICY IF EXISTS "authenticated_all_rhwb_activities_comments" ON rhwb_activities_comments;

-- 1. RHWB_COACH_INPUT - Coach performance data updates
-- Allows SELECT and UPDATE for authenticated users
CREATE POLICY "authenticated_select_rhwb_coach_input" ON rhwb_coach_input
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "authenticated_update_rhwb_coach_input" ON rhwb_coach_input
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. PULSE_INTERACTIONS - Navigation/interaction logging
-- Allows INSERT and SELECT for authenticated users
CREATE POLICY "authenticated_insert_pulse_interactions" ON pulse_interactions
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated_select_pulse_interactions" ON pulse_interactions
    FOR SELECT TO authenticated
    USING (true);

-- 3. PROFILE_NOTES - Coach notes for runners
-- Allows all operations for authenticated users
CREATE POLICY "authenticated_all_profile_notes" ON profile_notes
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. RUNNERS_PROFILE - Runner profile updates
-- Allows SELECT and UPDATE for authenticated users
CREATE POLICY "authenticated_select_runners_profile" ON runners_profile
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "authenticated_update_runners_profile" ON runners_profile
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. RHWB_ACTION_REQUESTS - Transfer/defer requests
-- Allows all operations for authenticated users
CREATE POLICY "authenticated_all_rhwb_action_requests" ON rhwb_action_requests
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6. RUNNER_SEASON_INFO - Season information updates
-- Allows all operations for authenticated users (includes UPSERT functionality)
CREATE POLICY "authenticated_all_runner_season_info" ON runner_season_info
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 7. RHWB_HELPDESK_REQUESTS - Support ticket creation
-- Allows INSERT and SELECT for authenticated users
CREATE POLICY "authenticated_insert_rhwb_helpdesk_requests" ON rhwb_helpdesk_requests
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated_select_rhwb_helpdesk_requests" ON rhwb_helpdesk_requests
    FOR SELECT TO authenticated
    USING (true);

-- 8. RHWB_ACTIVITIES_COMMENTS - Comment categorization (admin/script use)
-- Allows all operations for authenticated users (typically admin/script access)
CREATE POLICY "authenticated_all_rhwb_activities_comments" ON rhwb_activities_comments
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Grant necessary permissions to authenticated role
GRANT SELECT, INSERT, UPDATE ON rhwb_coach_input TO authenticated;
GRANT SELECT, INSERT ON pulse_interactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profile_notes TO authenticated;
GRANT SELECT, UPDATE ON runners_profile TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rhwb_action_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON runner_season_info TO authenticated;
GRANT SELECT, INSERT ON rhwb_helpdesk_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rhwb_activities_comments TO authenticated;

-- Optional: Add more restrictive policies based on user context
-- Example: Restrict coaches to only see/modify their own data
-- Uncomment and modify these if you want more granular access control

/*
-- Example: Restrict rhwb_coach_input to coach's own data
DROP POLICY IF EXISTS "authenticated_select_rhwb_coach_input" ON rhwb_coach_input;
CREATE POLICY "coach_own_data_rhwb_coach_input" ON rhwb_coach_input
    FOR SELECT TO authenticated
    USING (coach_email = auth.email());

CREATE POLICY "coach_update_own_data_rhwb_coach_input" ON rhwb_coach_input
    FOR UPDATE TO authenticated
    USING (coach_email = auth.email())
    WITH CHECK (coach_email = auth.email());

-- Example: Restrict profile_notes to notes created by the authenticated user
DROP POLICY IF EXISTS "authenticated_all_profile_notes" ON profile_notes;
CREATE POLICY "coach_own_notes_profile_notes" ON profile_notes
    FOR ALL TO authenticated
    USING (coach_email = auth.email())
    WITH CHECK (coach_email = auth.email());
*/

-- =============================================================================
-- PART 2: TABLES REQUIRING SELECT ACCESS FOR ALL PUBLIC USERS
-- =============================================================================

-- Enable RLS on tables requiring public read access
ALTER TABLE rhwb_seasons ENABLE ROW LEVEL SECURITY;
ALTER view v_rhwb_roles ENABLE ROW LEVEL SECURITY;
ALTER table runners_household ENABLE ROW LEVEL SECURITY;
ALTER view v_fs_teams ENABLE ROW LEVEL SECURITY;
ALTER view v_fs_survey ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhwb_coaches ENABLE ROW LEVEL SECURITY;
ALTER view v_rhwb_meso_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE mv_coach_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_rlb ENABLE ROW LEVEL SECURITY;
ALTER view v_comment_categories ENABLE ROW LEVEL SECURITY;
ALTER view v_pulse_interactions ENABLE ROW LEVEL SECURITY;
ALTER view v_survey_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for public read tables (if they exist)
DROP POLICY IF EXISTS "public_select_rhwb_seasons" ON rhwb_seasons;
DROP POLICY IF EXISTS "public_select_v_rhwb_roles" ON v_rhwb_roles;
DROP POLICY IF EXISTS "public_select_runners_household" ON runners_household;
DROP POLICY IF EXISTS "public_select_v_fs_teams" ON v_fs_teams;
DROP POLICY IF EXISTS "public_select_v_fs_survey" ON v_fs_survey;
DROP POLICY IF EXISTS "public_select_rhwb_coaches" ON rhwb_coaches;
DROP POLICY IF EXISTS "public_select_v_rhwb_meso_scores" ON v_rhwb_meso_scores;
DROP POLICY IF EXISTS "public_select_mv_coach_metrics" ON mv_coach_metrics;
DROP POLICY IF EXISTS "public_select_coach_rlb" ON coach_rlb;
DROP POLICY IF EXISTS "public_select_v_comment_categories" ON v_comment_categories;
DROP POLICY IF EXISTS "public_select_v_pulse_interactions" ON v_pulse_interactions;
DROP POLICY IF EXISTS "public_select_v_survey_results" ON v_survey_results;

-- RHWB_SEASONS - Season information (read-only reference data)
CREATE POLICY "public_select_rhwb_seasons" ON rhwb_seasons
    FOR SELECT TO public
    USING (true);

-- V_RHWB_ROLES - User roles and permissions view (authentication lookup)
CREATE POLICY "public_select_v_rhwb_roles" ON v_rhwb_roles
    FOR SELECT TO public
    USING (true);

-- RUNNERS_HOUSEHOLD - Family member relationships (read-only)
CREATE POLICY "public_select_runners_household" ON runners_household
    FOR SELECT TO public
    USING (true);

-- V_FS_TEAMS - FinalSurge team data (read-only)
CREATE POLICY "public_select_v_fs_teams" ON v_fs_teams
    FOR SELECT TO public
    USING (true);

-- V_FS_SURVEY - Survey responses view (read-only)
CREATE POLICY "public_select_v_fs_survey" ON v_fs_survey
    FOR SELECT TO public
    USING (true);

-- RHWB_COACHES - Coach information (read-only reference)
CREATE POLICY "public_select_rhwb_coaches" ON rhwb_coaches
    FOR SELECT TO public
    USING (true);

-- V_RHWB_MESO_SCORES - Mesocycle scores view (read-only analytics)
CREATE POLICY "public_select_v_rhwb_meso_scores" ON v_rhwb_meso_scores
    FOR SELECT TO public
    USING (true);

-- COACH_METRICS - Coach performance metrics (read-only analytics)
CREATE POLICY "public_select_mv_coach_metrics" ON mv_coach_metrics
    FOR SELECT TO public
    USING (true);

-- COACH_RLB - Coach workload data (read-only analytics)
CREATE POLICY "public_select_coach_rlb" ON coach_rlb
    FOR SELECT TO public
    USING (true);

-- V_COMMENT_CATEGORIES - Comment categories view (read-only analytics)
CREATE POLICY "public_select_v_comment_categories" ON v_comment_categories
    FOR SELECT TO public
    USING (true);

-- V_PULSE_INTERACTIONS - Interaction analytics view (read-only)
CREATE POLICY "public_select_v_pulse_interactions" ON v_pulse_interactions
    FOR SELECT TO public
    USING (true);

-- V_SURVEY_RESULTS - Survey results view (read-only analytics)
CREATE POLICY "public_select_v_survey_results" ON v_survey_results
    FOR SELECT TO public
    USING (true);

-- Grant SELECT permissions to public role for read-only tables
GRANT SELECT ON rhwb_seasons TO public;
GRANT SELECT ON v_rhwb_roles TO public;
GRANT SELECT ON runners_household TO public;
GRANT SELECT ON v_fs_teams TO public;
GRANT SELECT ON v_fs_survey TO public;
GRANT SELECT ON rhwb_coaches TO public;
GRANT SELECT ON v_rhwb_meso_scores TO public;
GRANT SELECT ON mv_coach_metrics TO public;
GRANT SELECT ON coach_rlb TO public;
GRANT SELECT ON v_comment_categories TO public;
GRANT SELECT ON v_pulse_interactions TO public;
GRANT SELECT ON v_survey_results TO public;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Test authenticated table access
-- SELECT * FROM rhwb_coach_input LIMIT 1;
-- SELECT * FROM profile_notes LIMIT 1;
-- SELECT * FROM pulse_interactions LIMIT 1;

-- Test public table access
-- SELECT * FROM rhwb_seasons LIMIT 1;
-- SELECT * FROM v_rhwb_roles LIMIT 1;
-- SELECT * FROM runners_household LIMIT 1;