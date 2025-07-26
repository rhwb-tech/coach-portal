# Supabase Setup Guide

## Installation

1. Install the Supabase client:
```bash
npm install @supabase/supabase-js
```

## Environment Variables

Create a `.env` file in the root directory with your Supabase credentials:

```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Getting Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the "Project URL" and "anon public" key
4. Add them to your `.env` file

## Database Schema

The application expects the following table in your Supabase database:

### rhwb_coach_input
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

## Row Level Security (RLS)

For production, you should set up Row Level Security policies. Here's an example:

```sql
-- Enable RLS
ALTER TABLE rhwb_coach_input ENABLE ROW LEVEL SECURITY;

-- Policy to allow coaches to view their own athletes
CREATE POLICY "Coaches can view their athletes" ON rhwb_coach_input
  FOR SELECT USING (coach_email = auth.jwt() ->> 'email');

-- Policy to allow coaches to update their athletes
CREATE POLICY "Coaches can update their athletes" ON rhwb_coach_input
  FOR UPDATE USING (coach_email = auth.jwt() ->> 'email');
```

## Testing the Connection

1. Start the application: `npm start`
2. Check the browser console for connection messages
3. The application will log successful Supabase connections

## Features

- **Real-time data**: Supabase provides real-time subscriptions
- **Authentication**: Built-in auth system (can be added later)
- **Row Level Security**: Secure data access
- **Auto-generated APIs**: No need to write custom APIs

## Troubleshooting

### Common Issues:
1. **Missing environment variables**: Check your `.env` file
2. **CORS errors**: Ensure your Supabase project allows your domain
3. **RLS blocking queries**: Check your RLS policies
4. **Table not found**: Verify table exists in your Supabase database

### Debug Mode:
Check the browser console for detailed Supabase logs.

## Security Notes

1. Never commit `.env` files to version control
2. Use Row Level Security for production
3. The anon key is safe to use in client-side code
4. Consider implementing authentication for production use

## Next Steps

1. Set up authentication (optional)
2. Add real-time subscriptions for live updates
3. Implement file storage for athlete photos
4. Add email notifications 