# Supabase Email Authentication Setup

## Overview

The Coach Portal now uses Supabase's built-in email authentication system, providing a secure and scalable authentication solution with features like:

- Email/password authentication
- Password reset functionality
- User profile management
- Session management
- Row Level Security (RLS) integration

## Authentication Flow

### 1. **Sign Up Process**
```
User fills signup form → Supabase creates user → Email verification (optional) → User can sign in
```

### 2. **Sign In Process**
```
User enters credentials → Supabase validates → Session created → User redirected to dashboard
```

### 3. **Password Reset Process**
```
User requests reset → Supabase sends email → User clicks link → User sets new password
```

## Components

### **AuthContext** (`src/contexts/AuthContext.js`)
- Manages authentication state
- Provides auth methods (signIn, signUp, signOut, etc.)
- Handles session persistence
- Listens for auth state changes

### **AuthWrapper** (`src/components/AuthWrapper.js`)
- Main authentication container
- Routes between login, signup, and reset views
- Shows loading states
- Protects app routes

### **AuthLogin** (`src/components/AuthLogin.js`)
- Email/password sign in form
- Password visibility toggle
- Error handling
- Links to signup and password reset

### **AuthSignUp** (`src/components/AuthSignUp.js`)
- User registration form
- Password confirmation
- User metadata collection
- Form validation

### **AuthResetPassword** (`src/components/AuthResetPassword.js`)
- Password reset request form
- Success confirmation screen
- Email instructions

## Supabase Configuration

### 1. **Enable Email Auth in Supabase**

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Settings**
3. Enable **Email Auth** provider
4. Configure email templates (optional)

### 2. **Email Templates** (Optional)

Customize email templates in Supabase:

1. Go to **Authentication** → **Email Templates**
2. Customize:
   - **Confirm signup** (if email confirmation is enabled)
   - **Reset password**
   - **Magic link** (if using magic links)

### 3. **Row Level Security (RLS)**

Enable RLS for secure data access:

```sql
-- Enable RLS on tables
ALTER TABLE rhwb_coach_input ENABLE ROW LEVEL SECURITY;
ALTER TABLE runners_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE runner_season_info ENABLE ROW LEVEL SECURITY;

-- Policy for coaches to view their athletes
CREATE POLICY "Coaches can view their athletes" ON rhwb_coach_input
  FOR SELECT USING (coach_email = auth.jwt() ->> 'email');

-- Policy for coaches to update their athletes
CREATE POLICY "Coaches can update their athletes" ON rhwb_coach_input
  FOR UPDATE USING (coach_email = auth.jwt() ->> 'email');

-- Policy for coaches to view runner profiles
CREATE POLICY "Coaches can view runner profiles" ON runners_profile
  FOR SELECT USING (true); -- Adjust based on your data model

-- Policy for coaches to view season info
CREATE POLICY "Coaches can view season info" ON runner_season_info
  FOR SELECT USING (coach = auth.jwt() ->> 'email');
```

## Environment Variables

Ensure your `.env` file has the correct Supabase credentials:

```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## User Management

### **User Metadata**
When users sign up, additional metadata is stored:

```javascript
const metadata = {
  first_name: formData.firstName,
  last_name: formData.lastName,
  full_name: `${formData.firstName} ${formData.lastName}`,
};
```

### **Accessing User Data**
```javascript
const { user } = useAuth();
console.log(user.email);        // User's email
console.log(user.user_metadata); // Custom metadata
```

## Security Features

### **1. Session Management**
- Automatic session persistence
- Session expiration handling
- Secure token storage

### **2. Password Security**
- Minimum 6 characters required
- Password confirmation validation
- Secure password reset flow

### **3. Error Handling**
- Comprehensive error messages
- Form validation
- Network error handling

### **4. UI/UX Features**
- Loading states
- Password visibility toggle
- Responsive design
- Accessibility support

## Migration from JWT System

### **Changes Made:**

1. **Removed JWT parsing** - No more manual JWT validation
2. **Removed URL token handling** - No more `?token=` parameters
3. **Removed localStorage token storage** - Supabase handles this
4. **Updated authentication flow** - Now uses Supabase Auth
5. **Added proper sign out** - Users can sign out from the app

### **Backward Compatibility:**

The system maintains backward compatibility by:
- Using `user.email` as the coach email
- Preserving existing data access patterns
- Maintaining the same UI/UX

## Testing the Authentication

### **1. Sign Up Test**
1. Navigate to the app
2. Click "Sign up"
3. Fill in the form
4. Submit and verify account creation

### **2. Sign In Test**
1. Use existing credentials
2. Sign in successfully
3. Verify dashboard access

### **3. Password Reset Test**
1. Click "Forgot your password?"
2. Enter email address
3. Check email for reset link
4. Set new password

### **4. Sign Out Test**
1. Click help menu (desktop) or hamburger menu (mobile)
2. Click "Sign Out"
3. Verify redirect to login screen

## Troubleshooting

### **Common Issues:**

1. **"Invalid login credentials"**
   - Check email/password
   - Verify user exists in Supabase
   - Check if email confirmation is required

2. **"Email not confirmed"**
   - Check spam folder
   - Resend confirmation email
   - Disable email confirmation in Supabase settings

3. **"RLS policy violation"**
   - Check RLS policies
   - Verify user email matches coach_email
   - Check table permissions

4. **"Environment variables missing"**
   - Verify `.env` file exists
   - Check variable names
   - Restart development server

### **Debug Mode:**

Enable debug logging in the browser console:
```javascript
// Check auth state
console.log('User:', user);
console.log('Session:', session);
console.log('Loading:', isLoading);
```

## Next Steps

### **1. Email Confirmation**
- Enable email confirmation in Supabase
- Customize email templates
- Test confirmation flow

### **2. Social Auth**
- Add Google OAuth
- Add GitHub OAuth
- Configure social providers

### **3. Advanced Features**
- Multi-factor authentication
- Magic link authentication
- Custom user roles
- Audit logging

### **4. Production Deployment**
- Set up custom domain
- Configure email provider
- Enable security features
- Set up monitoring

## Security Best Practices

1. **Never expose service role key** - Only use anon key in client
2. **Enable RLS** - Always use Row Level Security
3. **Validate user input** - Sanitize all form data
4. **Use HTTPS** - Always in production
5. **Regular security audits** - Monitor for vulnerabilities
6. **Keep dependencies updated** - Regular npm updates

## Support

For authentication issues:
1. Check Supabase dashboard logs
2. Verify environment variables
3. Test with Supabase CLI
4. Review browser console errors
5. Check network tab for failed requests 