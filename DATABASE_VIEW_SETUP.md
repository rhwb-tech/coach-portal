# Database View Setup for RHWB Connect

## Overview

This document explains how to set up a database view similar to the `v_pulse_roles` view used in the Pulse app for better error handling and cleaner authentication logic.

## Recommended View Setup

### Option 1: Create a Combined Roles View (Recommended)

Create a view that combines both `rhwb_coaches` and `rhwb_admin` tables:

```sql
-- Create a view that combines coaches and admins
CREATE OR REPLACE VIEW v_rhwb_roles AS
SELECT 
  email_id,
  'coach' as role,
  coach as full_name,
  created_at
FROM rhwb_coaches
UNION ALL
SELECT 
  email_id,
  'admin' as role,
  email_id as full_name, -- Use email as name for admins
  created_at
FROM rhwb_admin;

-- Grant access to the view
GRANT SELECT ON v_rhwb_roles TO authenticated;
```

### Option 2: Use the Current Dual-Table Approach

The current implementation checks both tables separately, which provides the same functionality but with more complex error handling.

## Error Handling Patterns

### Current Implementation (Dual Tables)

```javascript
// Check both tables in parallel
const coachesQuery = supabase.from('rhwb_coaches').select('email_id, coach').eq('email_id', email).single();
const adminQuery = supabase.from('rhwb_admin').select('email_id').eq('email_id', email).single();

// Handle each result separately
if (coachesResult.data) {
  return { isValid: true, role: 'coach', fullName: coachesResult.data.coach };
} else if (adminResult.data) {
  return { isValid: true, role: 'admin', fullName: email };
} else {
  return { isValid: false, error: 'Not authorized' };
}
```

### View-Based Approach (Like Pulse App)

```javascript
// Single query to the view
const { data, error } = await supabase
  .from('v_rhwb_roles')
  .select('email_id, role, full_name')
  .eq('email_id', email.toLowerCase())
  .single();

if (error && error.code === 'PGRST116') {
  return { isValid: false, error: 'Not authorized' };
}

if (data) {
  return { isValid: true, role: data.role, fullName: data.full_name };
}
```

## Benefits of View-Based Approach

1. **Cleaner Error Handling**: Single query means fewer error conditions to handle
2. **Better Performance**: One query instead of two parallel queries
3. **Consistent with Pulse App**: Same pattern as the existing Pulse application
4. **Easier Maintenance**: Single source of truth for role validation

## Migration Steps

1. **Create the View**: Run the SQL to create `v_rhwb_roles`
2. **Update AuthContext**: Modify `validateEmailAccess` to use the view
3. **Test**: Verify both coaches and admins can authenticate
4. **Deploy**: Update the production database

## Current Status

The app now uses the view-based approach with improved error handling:

- ✅ Uses `v_rhwb_roles` view (combines `rhwb_coaches` and `rhwb_admin` tables)
- ✅ Handles PGRST116 errors gracefully (no rows found)
- ✅ Provides clear error messages for unauthorized users
- ✅ Logs database errors for debugging without exposing them to users
- ✅ Falls back to email-based role determination on connection issues
- ✅ Consistent with Pulse app pattern using `v_pulse_roles`

## Implementation Complete

The view-based approach has been successfully implemented, providing:
- Cleaner error handling (single query)
- Better performance (one query instead of two)
- Consistency with the Pulse app
- Simpler maintenance 