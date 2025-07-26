# Supabase Integration Guide

## Overview

The Coach Portal now uses Supabase as the backend database, providing a modern, scalable solution with real-time capabilities.

## URL Parameters

The Coach Dashboard supports URL parameters to dynamically load data for different coaches and seasons:

### Parameters:
- `coach`: Coach's email address (default: balajisankaran@gmail.com)
- `season`: Season number (default: 13)

### Examples:
```
http://localhost:3000?coach=balajisankaran@gmail.com&season=13
http://localhost:3000?coach=another.coach@example.com&season=14
http://localhost:3000?coach=balajisankaran@gmail.com
```

## Supabase Setup

### 1. Environment Variables
Create a `.env` file in the root directory:
```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Schema
The application expects a `rhwb_coach_input` table in your Supabase database with the following structure:

```sql
CREATE TABLE rhwb_coach_input (
  email_id TEXT PRIMARY KEY,
  meso TEXT,
  coach TEXT,
  coach_email TEXT,
  season_phase TEXT,
  race_distance TEXT,
  planned_strength_trains INTEGER,
  completed_strength_trains INTEGER,
  planned_distance INTEGER,
  completed_distance INTEGER,
  st_score DECIMAL,
  mileage_score DECIMAL,
  meso_score DECIMAL,
  meso_score_override DECIMAL,
  meso_qual_score TEXT,
  season TEXT,
  planned_cross_trains INTEGER,
  completed_cross_trains INTEGER,
  planned_walks INTEGER,
  completed_walks INTEGER,
  planned_walk_distance INTEGER,
  completed_walk_distance INTEGER,
  planned_long_runs INTEGER,
  completed_long_runs INTEGER,
  planned_lr_distance INTEGER,
  completed_lr_distance INTEGER
);
```

## Database Column Mapping

The application maps the following Supabase table columns to component fields:

### Core Fields:
- `email_id` → `id` (athlete identifier)
- `runner_name` → `name` (athlete name)
- `planned_strength_trains` → `strengthPlanned` (planned strength sessions)
- `completed_strength_trains` → `strengthCompleted` (completed strength sessions)
- `planned_distance` → `mileagePlanned` (planned running distance)
- `completed_distance` → `mileageCompleted` (completed running distance)
- `meso_score` → `metricScore` (performance score)
- `meso_score_override` → `overrideScore` (manual override score)
- `meso_qual_score` → `qualitativeScore` (coach notes)

### Additional Fields:
- `race_distance` → `raceDistance` (5K, 10K, Half Marathon, Marathon)
- `meso` → `meso` (Meso 1, Meso 2, Meso 3, Meso 4)
- `season` → `season` (Season number)
- `coach` → `coach` (Coach name)
- `coach_email` → `coachEmail` (Coach email)
- `season_phase` → `seasonPhase` (Base, Build, Peak, etc.)

## Supabase Queries

### Fetch Coach Data
```javascript
const { data, error } = await supabase
  .from('rhwb_coach_input')
  .select('*')
  .eq('coach_email', coachEmail)
  .eq('season', `Season ${season}`);
```

### Update Athlete Data
```javascript
const { data, error } = await supabase
  .from('rhwb_coach_input')
  .update({
    meso_score_override: overrideScore,
    meso_qual_score: qualitativeScore
  })
  .eq('email_id', emailId)
  .select();
```

## Features

### Real-time Capabilities
- Supabase provides real-time subscriptions for live updates
- Can be implemented for live athlete data updates
- Automatic conflict resolution

### Security
- Row Level Security (RLS) policies for data protection
- Built-in authentication system
- Secure API endpoints

### Performance
- Optimized queries with Supabase query builder
- Connection pooling
- Automatic caching

## Implementation Notes

1. **Supabase Client**: Uses `@supabase/supabase-js` for database operations
2. **Error Handling**: Comprehensive error handling for database operations
3. **Loading States**: Shows loading indicators during data fetching
4. **Real-time Updates**: Local state updates when editing athlete data
5. **URL Parameters**: Automatically loads data based on URL parameters

## Row Level Security (RLS)

For production, implement RLS policies:

```sql
-- Enable RLS
ALTER TABLE rhwb_coach_input ENABLE ROW LEVEL SECURITY;

-- Policy for coaches to view their athletes
CREATE POLICY "Coaches can view their athletes" ON rhwb_coach_input
  FOR SELECT USING (coach_email = auth.jwt() ->> 'email');

-- Policy for coaches to update their athletes
CREATE POLICY "Coaches can update their athletes" ON rhwb_coach_input
  FOR UPDATE USING (coach_email = auth.jwt() ->> 'email');
```

## Next Steps

1. **Authentication**: Implement Supabase Auth for secure access
2. **Real-time Subscriptions**: Add live updates for athlete data
3. **File Storage**: Use Supabase Storage for athlete photos
4. **Edge Functions**: Add serverless functions for complex operations
5. **Analytics**: Implement Supabase Analytics for usage tracking

## Troubleshooting

### Common Issues:
1. **Missing environment variables**: Check `.env` file
2. **CORS errors**: Verify Supabase project settings
3. **RLS blocking queries**: Check RLS policies
4. **Table not found**: Ensure table exists in Supabase

### Debug Mode:
Check browser console for detailed Supabase logs and error messages. 