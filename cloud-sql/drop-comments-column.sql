-- Deferred cleanup: Run AFTER verifying Cloud SQL migration is complete
-- and the coach-portal frontend is reading comments from Cloud SQL.
--
-- WARNING: This is destructive and irreversible. Verify the following first:
--   1. migrate-action-comments.py ran successfully
--   2. coach-portal frontend reads comments from Cloud SQL (not Supabase)
--   3. SmallCouncil displays comments correctly from Cloud SQL
--   4. New transfer/defer requests write comments to Cloud SQL

ALTER TABLE rhwb_action_requests DROP COLUMN comments;
