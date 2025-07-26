# JWT Authentication for Coach Portal

## Overview

The Coach Portal now supports JWT token authentication, similar to the rhwb-pulse-v2 project. This allows secure access to coach data using encrypted tokens instead of plain URL parameters.

## How It Works

### 1. Token Structure
The JWT token should contain the following payload:
```json
{
  "email": "coach@example.com",
  "name": "Coach Name",
  "exp": 1735689600
}
```

### 2. URL Format
Access the portal using either:

**With JWT Token:**
```
http://localhost:3000/?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**With Fallback Coach Parameter:**
```
http://localhost:3000/?coach=coach@example.com&season=13
```

### 3. Authentication Flow

1. **Token Priority**: The app first checks for a `token` URL parameter
2. **Storage**: If token is valid, it's stored in localStorage for future sessions
3. **URL Cleanup**: Token parameter is removed from URL after successful authentication
4. **Fallback**: If no token, falls back to the `coach` URL parameter
5. **Default**: If neither exists, uses default email `balajisankaran@gmail.com`

### 4. Token Validation

The app validates:
- ✅ JWT format (3 parts: header.payload.signature)
- ✅ Required fields (email, exp)
- ✅ Token expiration (with 5-minute buffer)
- ✅ Token storage and retrieval

### 5. Security Features

- **Automatic Expiration**: Tokens are checked every minute
- **Secure Storage**: Tokens stored in localStorage
- **URL Cleanup**: Token parameters removed from URL after authentication
- **Fallback Support**: Maintains backward compatibility with URL parameters

## Usage Examples

### Generate a JWT Token
```javascript
// Example JWT payload
const payload = {
  email: "coach@example.com",
  name: "John Coach",
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours from now
};

// Sign with your secret (server-side)
const token = jwt.sign(payload, 'your-secret-key');
```

### Access URLs
```
# With JWT token
http://localhost:3000/?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# With fallback parameters
http://localhost:3000/?coach=coach@example.com&season=14

# Default access
http://localhost:3000/
```

## Implementation Details

### Files Modified
- `src/contexts/AuthContext.js` - JWT authentication logic
- `src/index.js` - Added AuthProvider wrapper
- `src/components/CoachDashboard.js` - Updated to use JWT authentication

### Key Features
- **Backward Compatible**: Still supports `coach` URL parameter
- **Automatic Token Management**: Handles storage and cleanup
- **Error Handling**: Graceful fallbacks and error messages
- **Loading States**: Proper loading indicators during authentication

## Environment Variables (Optional)

You can configure the authentication behavior with environment variables:

```env
REACT_APP_TOKEN_STORAGE_KEY=coach_portal_auth_token
REACT_APP_JWT_SECRET=your-secret-key
REACT_APP_TOKEN_EXPIRY_BUFFER=300
```

## Benefits

1. **Security**: Encrypted tokens instead of plain email addresses
2. **Flexibility**: Support for additional user data (name, roles, etc.)
3. **Expiration**: Automatic token expiration handling
4. **Compatibility**: Maintains existing URL parameter support
5. **User Experience**: Seamless authentication flow

## Migration

Existing URLs with `coach` parameters will continue to work. The JWT token system is an enhancement that provides better security and flexibility. 