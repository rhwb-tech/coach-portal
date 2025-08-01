# Magic Link Authentication Setup

## Overview

The Coach Portal now uses Magic Link authentication, similar to the Pulse app, providing a secure and passwordless authentication experience. Users receive a secure link via email to sign in without needing to remember passwords.

## How Magic Link Authentication Works

### **1. User Flow:**
```
User enters email → System validates email → Magic link sent → User clicks link → Authenticated
```

### **2. Security Features:**
- **Email Validation**: Only authorized emails from `rhwb_coaches` or `rhwb_admin` tables can sign in
- **One-time Use**: Magic links can only be used once
- **Time-limited**: Links expire after a set time
- **No Passwords**: Eliminates password-related security risks

## Components

### **AuthContext** (`src/contexts/AuthContext.js`)
- **Magic Link Login**: `login(email, rememberMe)` sends magic link
- **Email Validation**: Validates against `v_rhwb_roles` view (combines `rhwb_coaches` and `rhwb_admin`)
- **Session Management**: Handles authentication state
- **Remember Me**: Stores email preference in localStorage

### **AuthMagicLink** (`src/components/AuthMagicLink.js`)
- **Login Form**: Email input with validation
- **Magic Link Sent**: Success state after email sent
- **Remember Me**: Checkbox for persistent login
- **Error Handling**: Displays validation errors

### **AuthCallback** (`src/components/AuthCallback.js`)
- **Magic Link Handler**: Processes authentication redirect
- **Loading State**: Shows while processing
- **Error Handling**: Displays authentication errors
- **Redirect**: Sends user back to main app

### **AuthWrapper** (`src/components/AuthWrapper.js`)
- **Route Protection**: Wraps main app components
- **Authentication Check**: Shows login or app based on auth state
- **Loading States**: Handles initialization

## Supabase Configuration

### **1. Enable Magic Link Auth**

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Settings**
3. Enable **Email Auth** provider
4. Configure **Magic Link** settings:
   - Set redirect URL: `https://yourapp.com/auth/callback`
   - Customize email templates (optional)

### **2. Email Templates** (Optional)

Customize the magic link email in Supabase:

1. Go to **Authentication** → **Email Templates**
2. Edit **Magic Link** template:
   ```
   Subject: Sign in to RHWB Connect
   Body: Click the link below to sign in to RHWB Connect:
   [Sign In Link]
   ```

### **3. Database Setup**

Ensure your `rhwb_coaches` and `rhwb_admin` tables exist, and create the `v_rhwb_roles` view:

```sql
-- Coaches table
CREATE TABLE rhwb_coaches (
  email_id TEXT PRIMARY KEY,
  coach TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Admin table
CREATE TABLE rhwb_admin (
  email_id TEXT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create the roles view (combines both tables)
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
  email_id as full_name,
  created_at
FROM rhwb_admin;

-- Grant access to the view
GRANT SELECT ON v_rhwb_roles TO authenticated;

-- Insert some test coaches
INSERT INTO rhwb_coaches (email_id, coach) VALUES
('coach1@example.com', 'John Coach'),
('coach2@example.com', 'Jane Trainer');

-- Insert some test admins
INSERT INTO rhwb_admin (email_id) VALUES
('admin1@example.com'),
('admin2@example.com');
```

## Environment Variables

Ensure your `.env` file has the correct Supabase credentials:

```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Authentication Flow

### **1. Initial Load**
```
App loads → AuthContext initializes → Check for existing session → Show login or app
```

### **2. Magic Link Request**
```
User enters email → Validate against v_rhwb_roles view → Send magic link → Show success message
```

### **3. Magic Link Authentication**
```
User clicks link → Redirect to /auth/callback → Process authentication → Redirect to app
```

### **4. Session Management**
```
User authenticated → Session stored → App shows dashboard → User can sign out
```

## Features

### **✅ Security Features:**
1. **Email Validation**: Only authorized coaches can sign in
2. **One-time Links**: Magic links expire after use
3. **Session Management**: Secure session handling
4. **Remember Me**: Optional persistent login

### **✅ User Experience:**
1. **Passwordless**: No passwords to remember
2. **Simple Flow**: Just enter email and click link
3. **Error Handling**: Clear error messages
4. **Loading States**: Visual feedback during processes

### **✅ Developer Features:**
1. **Override Mode**: Test with `?email=test@example.com`
2. **Debug Logging**: Console logs for troubleshooting
3. **Fallback Logic**: Graceful handling of database issues
4. **TypeScript Ready**: Easy to convert to TypeScript

## Testing the Magic Link System

### **1. Test Email Validation**
```javascript
// Test with authorized email
const result = await login('coach1@example.com', false);
console.log(result.success); // Should be true

// Test with unauthorized email
const result = await login('unauthorized@example.com', false);
console.log(result.success); // Should be false
```

### **2. Test Magic Link Flow**
1. Enter authorized email
2. Check email for magic link
3. Click link in email
4. Verify redirect to app

### **3. Test Override Mode**
```
https://yourapp.com?email=coach1@example.com
```

### **4. Test Remember Me**
1. Check "Remember me" box
2. Sign in
3. Refresh page
4. Verify email is pre-filled

## Troubleshooting

### **Common Issues:**

1. **"Email not authorized"**
   - Check if email exists in `v_rhwb_roles` view
   - Verify database connection
   - Check Supabase configuration

2. **"Magic link not received"**
   - Check spam folder
   - Verify email address
   - Check Supabase email settings

3. **"Callback error"**
   - Verify redirect URL in Supabase
   - Check network connectivity
   - Review browser console errors

4. **"Database timeout"**
   - Check Supabase connection
   - Verify table permissions
   - Review RLS policies

### **Debug Mode:**

Enable debug logging:
```javascript
// Check auth state
console.log('User:', user);
console.log('Session:', session);
console.log('Loading:', isLoading);
console.log('Email Sent:', isEmailSent);
```

## Migration from Email/Password

### **Changes Made:**

1. **Removed Password Fields**: No more password inputs
2. **Added Magic Link Flow**: Email → Link → Authenticate
3. **Updated Validation**: Now validates against `rhwb_coaches` table
4. **Simplified UI**: Single email input form
5. **Added Remember Me**: Persistent login option

### **Backward Compatibility:**

- Uses same `user.email` for coach identification
- Maintains existing data access patterns
- Preserves UI/UX consistency
- No breaking changes to existing functionality

## Security Best Practices

1. **Database Validation**: Always validate emails against authorized list
2. **Session Management**: Proper session handling and cleanup
3. **Error Handling**: Don't expose sensitive information in errors
4. **Rate Limiting**: Implement rate limiting for magic link requests
5. **HTTPS Only**: Always use HTTPS in production
6. **Regular Audits**: Monitor for unauthorized access attempts

## Production Deployment

### **1. Supabase Configuration**
- Set up custom domain
- Configure email provider
- Enable security features
- Set up monitoring

### **2. Email Templates**
- Customize magic link email
- Add branding and styling
- Include security notices
- Test email delivery

### **3. Monitoring**
- Set up error tracking
- Monitor authentication attempts
- Track successful logins
- Alert on suspicious activity

## Next Steps

### **1. Enhanced Security**
- Add rate limiting
- Implement IP blocking
- Add audit logging
- Set up alerts

### **2. User Experience**
- Add email templates
- Implement progressive web app
- Add offline support
- Improve loading states

### **3. Advanced Features**
- Multi-factor authentication
- Social login options
- Custom user roles
- Advanced permissions

## Support

For Magic Link authentication issues:
1. Check Supabase dashboard logs
2. Verify email templates
3. Test with authorized emails
4. Review browser console
5. Check network tab for failed requests 