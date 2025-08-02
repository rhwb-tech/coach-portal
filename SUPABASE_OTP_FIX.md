# Fixing "Signups not allowed for OTP" Error

## **Problem**
Users are seeing the error message "signups not allowed for OTP" when trying to authenticate with magic links.

## **Root Cause**
This error occurs when Supabase is configured to **disable email signups** but the app is trying to use **OTP (magic link) authentication**. The `shouldCreateUser: true` setting requires Supabase to allow user creation.

## **Solution**

### **Step 1: Fix Supabase Configuration**

1. **Go to Supabase Dashboard**
   - Navigate to your coach portal project
   - Go to **Authentication** → **Settings**

2. **Enable Email Signup for OTP**
   - Set **"Enable email signup"** to **ON**
   - Set **"Enable email confirmations"** to **OFF** (optional)
   - This allows Supabase to create user accounts for OTP authentication

3. **Enable Magic Link**
   - Set **"Enable magic link"** to **ON**
   - This allows OTP authentication to work properly

4. **Update Site URL**
   - Set **Site URL** to your coach portal URL
   - Example: `https://your-coach-portal.vercel.app`

5. **Update Redirect URLs**
   - Add: `https://your-coach-portal.vercel.app/auth/callback`
   - Add: `http://localhost:3000/auth/callback` (for development)
   - Remove any URLs pointing to other domains

### **Step 2: Verify User Authorization**

Ensure the user's email is in the authorized users table:

1. **Check `rhwb_coaches` table**
   ```sql
   SELECT * FROM rhwb_coaches WHERE email_id = 'user@example.com';
   ```

2. **Check `rhwb_admin` table**
   ```sql
   SELECT * FROM rhwb_admin WHERE email_id = 'user@example.com';
   ```

3. **Check `v_rhwb_roles` view**
   ```sql
   SELECT * FROM v_rhwb_roles WHERE email_id = 'user@example.com';
   ```

### **Step 3: Test the Fix**

1. **Clear browser cache** and try again
2. **Use development override** for testing: `?email=coach@rhwb.org`
3. **Check browser console** for detailed error messages

## **Alternative Solutions**

### **Option A: Enable Signup but Restrict Access**
If you want to keep signup enabled:

1. **Enable email signup** in Supabase
2. **Set up Row Level Security (RLS)** to restrict access
3. **Update the app** to handle both signup and OTP flows

### **Option B: Use Email/Password Authentication**
If magic links are problematic:

1. **Enable email/password auth** in Supabase
2. **Update the app** to use traditional login
3. **Implement password reset** functionality

## **Current App Configuration**

The app is configured for **Magic Link authentication only**:

```javascript
// In AuthContext.js
const { error } = await supabase.auth.signInWithOtp({
  email: email.toLowerCase(),
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
    shouldCreateUser: true  // This allows user creation for OTP
  }
});
```

## **Error Handling**

The app now includes specific error handling for this issue:

```javascript
if (error.message.includes('signups not allowed')) {
  return { 
    success: false, 
    error: 'Email signup is disabled. Please contact your administrator to enable magic link authentication or add your email to the authorized users list.' 
  };
}
```

## **Debugging**

To debug this issue:

1. **Check browser console** for detailed error messages
2. **Verify Supabase configuration** matches the requirements above
3. **Test with authorized email** or development override
4. **Check network tab** for failed requests

## **Support**

If the issue persists:
1. Check Supabase project settings
2. Verify user authorization in database
3. Test with development override
4. Contact technical support with console logs 