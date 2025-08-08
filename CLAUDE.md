# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm start` (runs on http://localhost:3000)
- **Build for production**: `npm run build`
- **Run tests**: `npm test`
- **Eject from Create React App**: `npm run eject` (one-way operation)

## Architecture Overview

This is a **React-based Coach Portal** for RHWB (running coaches) to manage athlete performance metrics and training data.

### Core Technology Stack
- **React 18** with functional components and hooks
- **React Router DOM** for navigation (BrowserRouter setup)
- **Tailwind CSS** for styling with custom color palette
- **Supabase** for backend database and authentication
- **Create React App** as the build tool

### Authentication System
- **Magic Link Authentication Only** - no signup flow exists
- Users must be pre-authorized in the `v_rhwb_roles` view (combines `rhwb_coaches` and `rhwb_admin` tables)
- **AuthContext** (`src/contexts/AuthContext.js`) manages all auth state and validation
- **Email override for development**: `?email=coach@example.com` bypasses auth
- Auth flow: email validation → magic link → callback → dashboard

### Database Integration
- **Supabase client** configured in `src/services/supabaseClient.js`
- Primary data source: `rhwb_coach_input` table
- Season-based data filtering (defaults to current season from `rhwb_seasons` table)
- **coachService.js** handles all database operations with error handling and fallbacks

### Component Architecture
```
App.js (Router setup)
├── AuthWrapper (protects routes)
├── CoachDashboard (main interface)
├── AuthCallback (handles magic link returns)
└── Various athlete components (RunnerProfile, etc.)
```

### Data Flow
1. **Authentication**: AuthWrapper checks user authorization
2. **Data Fetching**: CoachDashboard calls `fetchCoachData()` from coachService
3. **Filtering**: Distance and mesocycle filters applied at database level
4. **Updates**: Athlete score overrides and notes saved via `updateAthleteData()`

### Key Features
- **Athlete Metrics Tracking**: Strength training, mileage, completion rates
- **Score System**: 0-5 scale with color-coded performance indicators
- **Coach Overrides**: Manual score adjustments with qualitative notes
- **Multi-mesocycle Support**: Training cycle filtering
- **Race Distance Filtering**: 5K, 10K, Half Marathon, Marathon

### Environment Configuration
Requires `.env` file with:
```
REACT_APP_SUPABASE_URL=your_project_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
```

### Deployment
- **Netlify** configuration in `netlify.toml`
- **Vercel** configuration in `vercel.json`
- Both configured for SPA routing and static asset caching

### Important Implementation Notes
- All database queries include proper error handling and fallbacks
- Authentication includes timeout protection for slow database connections
- Mock data fallback exists when database is unavailable
- The system gracefully handles missing environment variables
- Email validation includes both database lookup and email-pattern fallback

### Database Schema Dependencies
- `rhwb_coach_input`: Main athlete data table
- `rhwb_seasons`: Season management
- `v_rhwb_roles`: Combined view for user authorization (coach + admin tables)

### Testing Approach
- Email override parameter for development testing
- Fallback mock data when database unavailable
- Environment variable validation with helpful error messages