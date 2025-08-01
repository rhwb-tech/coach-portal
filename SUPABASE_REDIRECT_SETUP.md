# Supabase Redirect URL Configuration

## Issue
The magic link authentication is redirecting to `pulse.rhwb.org` instead of your coach portal app. This is because the Supabase project is configured with the wrong redirect URL.

## Solution

### Step 1: Update Supabase Dashboard Configuration

1. **Go to your Supabase Dashboard**
   - Navigate to your coach portal project
   - Go to **Authentication** → **Settings**

2. **Update Site URL**
   - Find the **Site URL** field
   - Change it from `pulse.rhwb.org` to your coach portal URL:
     - **Development**: `http://localhost:3000`
     - **Production**: Your deployed coach portal URL (e.g., `https://your-coach-portal.vercel.app`)

3. **Update Redirect URLs**
   - In the **Redirect URLs** section, add:
     - `http://localhost:3000/auth/callback`
     - `https://your-coach-portal.vercel.app/auth/callback`
   - Remove any URLs pointing to `pulse.rhwb.org`

### Step 2: Verify Email Templates (Optional)

1. **Go to Authentication** → **Email Templates**
2. **Edit the Magic Link template** if needed
3. **Test the magic link** to ensure it redirects correctly

### Step 3: Test the Fix

1. **Try signing in** with an authorized email
2. **Check the magic link** in your email
3. **Verify it redirects** to your coach portal app

## Current Code Configuration

The app is correctly configured to use dynamic redirect URLs:

```javascript
// In AuthContext.js
const { error } = await supabase.auth.signInWithOtp({
  email: email.toLowerCase(),
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
    shouldCreateUser: false
  }
});
```

This means:
- **Development**: `http://localhost:3000/auth/callback`
- **Production**: `https://your-domain.com/auth/callback`

## Troubleshooting

### If the issue persists:

1. **Check Supabase Project**: Ensure you're using the correct Supabase project for the coach portal
2. **Clear Browser Cache**: Clear cache and try again
3. **Check Environment Variables**: Ensure `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` are correct
4. **Verify Email**: Check that the magic link in the email points to the correct domain

### Common Issues:

- **Wrong Supabase Project**: Using the Pulse app's Supabase project instead of coach portal's
- **Cached Configuration**: Supabase dashboard might be showing cached settings
- **Environment Variables**: Incorrect Supabase credentials in `.env` file

## Expected Behavior

After fixing the configuration:
1. User enters email → Magic link sent
2. User clicks link → Redirects to `your-coach-portal-domain.com/auth/callback`
3. AuthCallback processes → Redirects to `/` (main dashboard)
4. User sees the coach portal dashboard 