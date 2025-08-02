# Authentication Troubleshooting Guide

## Issue: "Signups not allowed for OTP"

### **Problem Description**
Users are getting an error "signups not allowed for OTP" when trying to authenticate.

### **Root Cause**
The Coach Portal uses **Magic Link authentication only** (no signup required). The error occurs when:
1. Users try to access a signup flow that doesn't exist
2. Supabase is configured to allow signups but the app doesn't support them
3. Unused signup components were causing confusion

### **Solution**

#### **1. Supabase Configuration**
Ensure your Supabase project is configured correctly:

1. **Go to Supabase Dashboard** → **Authentication** → **Settings**
2. **Enable Email Signup** (required for Magic Link):
   - Set "Enable email signup" to **ON**
   - Set "Enable email confirmations" to **OFF** (optional)
3. **Enable Magic Link**:
   - Set "Enable magic link" to **ON**
4. **Update Site URL**:
   - Set to your coach portal URL (e.g., `https://your-domain.com`)
5. **Update Redirect URLs**:
   - Add: `https://your-domain.com/auth/callback`
   - Add: `http://localhost:3000/auth/callback` (for development)

#### **2. User Access**
Only authorized emails can access the portal:
- Emails must be in the `rhwb_coaches` table
- Emails must be in the `rhwb_admin` table
- The system validates against the `v_rhwb_roles` view

#### **3. Authentication Flow**
The correct authentication flow is:
1. User enters email address
2. System validates email against authorized users
3. Magic link is sent to email
4. User clicks link to authenticate
5. User is redirected to the portal

### **Testing**

#### **For Development:**
1. Use the email override: `?email=coach@rhwb.org`
2. This bypasses magic link for testing

#### **For Production:**
1. Enter an authorized email address
2. Check email for magic link
3. Click the link to authenticate

### **Common Issues**

#### **"Email not authorized"**
- The email is not in the `rhwb_coaches` or `rhwb_admin` tables
- Contact admin to add the email to the authorized list

#### **"Magic link not working"**
- Check Supabase redirect URL configuration
- Ensure the link hasn't expired
- Try requesting a new magic link

#### **"Signups not allowed"**
- This error should not occur with the current setup
- The app only supports Magic Link authentication
- No signup functionality is available or needed

### **Support**
If issues persist:
1. Check Supabase project configuration
2. Verify email is in authorized users table
3. Test with email override for development
4. Contact technical support with specific error messages 