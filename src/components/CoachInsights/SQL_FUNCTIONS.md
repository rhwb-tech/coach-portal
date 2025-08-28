# Coach Insights Database Functions

This file contains the SQL functions needed for the Coach Insights dashboard.

## 1. Get Coaches by Season Function

Create this function in your Supabase database to support the coach dropdown:

```sql
-- Function to get coaches by season for the dropdown
CREATE OR REPLACE FUNCTION get_coaches_by_season(season_param integer)
RETURNS TABLE(
  season integer,
  coach text,
  coach_email_id text
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT 
    a.season,
    a.coach,
    b.email_id as coach_email_id
  FROM postgres.public.coach_metrics a
  JOIN rhwb_coaches b ON a.coach = b.coach
  WHERE a.season = season_param
  ORDER BY a.season, a.coach;
END;
$$ LANGUAGE plpgsql;
```

## 2. Alternative: Create a View (Simpler Option)

If you prefer using a view instead of a function:

```sql
-- Create a view for coach metrics with email
CREATE OR REPLACE VIEW coach_metrics_with_email AS
SELECT DISTINCT 
  a.season,
  a.coach,
  b.email_id as coach_email_id
FROM postgres.public.coach_metrics a
JOIN rhwb_coaches b ON a.coach = b.coach
ORDER BY a.season, a.coach;
```

Then in the React component, you can use:

```javascript
const { data, error } = await supabase
  .from('coach_metrics_with_email')
  .select('season, coach, coach_email_id')
  .eq('season', selectedSeason)
  .order('coach', { ascending: true });
```

## 3. Raw Query Usage (If above options don't work)

If neither functions nor views work in your setup, you can use the raw SQL query provided:

```sql
select distinct season, a.coach, b.email_id as coach_email_id 
from postgres.public.coach_metrics a, rhwb_coaches b 
where a.coach = b.coach 
  and season = [SEASON_ID]
order by 1, 2
```

Note: You'll need to handle parameterization manually with this approach.

## Implementation in React

Once you have the database function or view set up, uncomment the production query in:
`/src/components/CoachInsights/CoachInsights.js` around line 87-108

Choose one of these approaches based on your database setup:

### Option 1: Using Database Function
```javascript
const { data, error } = await supabase
  .rpc('get_coaches_by_season', { 
    season_param: selectedSeason 
  });
```

### Option 2: Using View
```javascript
const { data, error } = await supabase
  .from('coach_metrics_with_email')
  .select('season, coach, coach_email_id')
  .eq('season', selectedSeason)
  .order('coach', { ascending: true });
```