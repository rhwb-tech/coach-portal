-- Database function to execute the cumulative scores query
-- Add this to your Supabase database

CREATE OR REPLACE FUNCTION get_cumulative_scores(
  season_name text,
  coach_filter text
)
RETURNS TABLE (
  coach_email_id text,
  runner_name text,
  cumulative_score numeric
) AS $$
BEGIN
  RETURN QUERY
  select 
    b.email_id as coach_email_id, 
    initcap(a.full_name) as runner_name, 
    a.cumulative_score
  from rhwb_meso_scores a 
  inner join rhwb_coaches b on a.coach = b.coach
  where a.season = season_name 
    and a.coach like coach_filter 
    and a.category = 'Personal' 
  order by a.cumulative_score desc;
END;
$$ LANGUAGE plpgsql;