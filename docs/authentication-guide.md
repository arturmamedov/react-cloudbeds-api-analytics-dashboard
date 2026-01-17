# Supabase Authentication Implementation Guide

## Overview

This guide shows how to add real user authentication to the Nests Hostels Analytics Dashboard using Supabase Auth. This will replace the current anonymous access with secure, user-based authentication.

---

## 🎯 Why Add Authentication?

**Current State (Anonymous Access)**:
- ✅ Simple, works immediately
- ❌ Anyone with the anon key can access
- ❌ No user-specific data
- ❌ No access control

**With Authentication**:
- ✅ Secure user login (email/password or OAuth)
- ✅ User-specific data (each user sees their own data)
- ✅ Access control (only authorized users)
- ✅ Production-ready security

---

## 📋 Implementation Options

### **Option 1: Email/Password (Recommended for Internal Use)**
**Best for**: Internal team members, hostel operators
- Simple setup (5-10 minutes)
- Email verification optional
- Password reset built-in
- No external dependencies

### **Option 2: OAuth (Google, GitHub, etc.)**
**Best for**: Multi-organization access, public-facing
- More complex setup (15-20 minutes)
- Users log in with existing accounts
- No password management needed
- Requires OAuth app setup

### **Option 3: Magic Links (Passwordless)**
**Best for**: Non-technical users
- Email-based login (no passwords)
- Very simple UX
- Requires email configuration

---

## 🚀 Implementation Plan

I'll show **Option 1 (Email/Password)** as it's the simplest and most common.

---

## Step 1: Enable Email Auth in Supabase (2 minutes)

**In Supabase Dashboard:**

1. Go to **Authentication** → **Providers** (left sidebar)
2. Find **Email** provider
3. Toggle **"Enable Email provider"** to ON
4. **Optional**: Disable "Confirm email" if you want users to access immediately without email verification
   - For internal team: **Disable** (simpler)
   - For production: **Enable** (more secure)
5. Click **"Save"**

---

## Step 2: Update RLS Policies (5 minutes)

Run this SQL to restrict access to authenticated users only:

**File**: `supabase/migrations/003_add_authentication.sql`

\`\`\`sql
-- ============================================================================
-- Authentication Setup: Restrict access to authenticated users only
-- ============================================================================

-- ============================================================================
-- DROP EXISTING POLICIES (anon access)
-- ============================================================================

-- Hostels
DROP POLICY IF EXISTS "Allow anon users to read hostels" ON hostels;
DROP POLICY IF EXISTS "Allow anon users to insert hostels" ON hostels;
DROP POLICY IF EXISTS "Allow anon users to update hostels" ON hostels;

-- Reservations
DROP POLICY IF EXISTS "Allow anon users to read reservations" ON reservations;
DROP POLICY IF EXISTS "Allow anon users to insert reservations" ON reservations;
DROP POLICY IF EXISTS "Allow anon users to update reservations" ON reservations;
DROP POLICY IF EXISTS "Allow anon users to delete reservations" ON reservations;

-- Weekly Reports
DROP POLICY IF EXISTS "Allow anon users to read weekly_reports" ON weekly_reports;
DROP POLICY IF EXISTS "Allow anon users to insert weekly_reports" ON weekly_reports;
DROP POLICY IF EXISTS "Allow anon users to update weekly_reports" ON weekly_reports;
DROP POLICY IF EXISTS "Allow anon users to delete weekly_reports" ON weekly_reports;

-- Data Imports
DROP POLICY IF EXISTS "Allow anon users to read data_imports" ON data_imports;
DROP POLICY IF EXISTS "Allow anon users to insert data_imports" ON data_imports;

-- ============================================================================
-- CREATE AUTHENTICATED-ONLY POLICIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Hostels: All authenticated users can read/modify
-- ----------------------------------------------------------------------------
CREATE POLICY "Authenticated users can read hostels"
  ON hostels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert hostels"
  ON hostels FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update hostels"
  ON hostels FOR UPDATE
  TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- Reservations: All authenticated users can read/modify
-- ----------------------------------------------------------------------------
CREATE POLICY "Authenticated users can read reservations"
  ON reservations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert reservations"
  ON reservations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update reservations"
  ON reservations FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete reservations"
  ON reservations FOR DELETE
  TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- Weekly Reports: All authenticated users can read/modify
-- ----------------------------------------------------------------------------
CREATE POLICY "Authenticated users can read weekly_reports"
  ON weekly_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert weekly_reports"
  ON weekly_reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update weekly_reports"
  ON weekly_reports FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete weekly_reports"
  ON weekly_reports FOR DELETE
  TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- Data Imports: All authenticated users can read/insert
-- ----------------------------------------------------------------------------
CREATE POLICY "Authenticated users can read data_imports"
  ON data_imports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert data_imports"
  ON data_imports FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- OPTIONAL: Add user_id column for user-specific data isolation
-- ============================================================================
-- Uncomment these if you want each user to only see their own data

-- ALTER TABLE reservations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
-- ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
-- ALTER TABLE data_imports ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- CREATE INDEX idx_reservations_user_id ON reservations(user_id);
-- CREATE INDEX idx_weekly_reports_user_id ON weekly_reports(user_id);
-- CREATE INDEX idx_data_imports_user_id ON data_imports(user_id);

-- Then update policies to filter by user:
-- Example for reservations:
-- DROP POLICY "Authenticated users can read reservations" ON reservations;
-- CREATE POLICY "Users can read own reservations"
--   ON reservations FOR SELECT
--   TO authenticated
--   USING (user_id = auth.uid());
\`\`\`

**Run this in Supabase SQL Editor**

---

## Step 3: Create Authentication Context (10 minutes)

**File**: `src/contexts/AuthContext.jsx`

\`\`\`javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sign up
  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  // Sign in
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  // Sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  // Reset password
  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    return { data, error };
  };

  // Update password
  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
\`\`\`

---

## Step 4: Create Login Component (15 minutes)

**File**: `src/components/Auth/Login.jsx`

\`\`\`javascript
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, Mail, Loader, AlertCircle } from 'lucide-react';

const Login = () => {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (isLogin) {
      // Sign in
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      }
    } else {
      // Sign up
      const { error } = await signUp(email, password);
      if (error) {
        setError(error.message);
      } else {
        setMessage('Account created! Check your email to verify (if required).');
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-nests-teal to-nests-green flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Nests Hostels Analytics
          </h1>
          <p className="text-gray-600">
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Success Message */}
        {message && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
            {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nests-teal focus:border-nests-teal"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nests-teal focus:border-nests-teal"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-nests-teal text-white py-3 px-6 rounded-lg font-semibold hover:bg-nests-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                {isLogin ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              <>{isLogin ? 'Sign In' : 'Sign Up'}</>
            )}
          </button>
        </form>

        {/* Toggle between login/signup */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setMessage('');
            }}
            className="text-nests-teal hover:underline text-sm"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
\`\`\`

---

## Step 5: Protect App with Auth (10 minutes)

**Update**: `src/App.jsx` (or wherever your main component is)

\`\`\`javascript
import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Auth/Login';
import HostelAnalytics from './components/HostelAnalytics';
import { Loader } from 'lucide-react';

// Protected component wrapper
const ProtectedApp = () => {
  const { user, loading, signOut } = useAuth();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-nests-teal mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!user) {
    return <Login />;
  }

  // Authenticated - show app
  return (
    <div>
      {/* Optional: Add user info and logout button */}
      <div className="bg-gray-100 border-b border-gray-200 px-6 py-3 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Logged in as: <span className="font-semibold">{user.email}</span>
        </div>
        <button
          onClick={signOut}
          className="text-sm text-red-600 hover:text-red-800 font-medium"
        >
          Sign Out
        </button>
      </div>

      {/* Main app */}
      <HostelAnalytics />
    </div>
  );
};

// Main App with Auth Provider
function App() {
  return (
    <AuthProvider>
      <ProtectedApp />
    </AuthProvider>
  );
}

export default App;
\`\`\`

---

## Step 6: Update Supabase Client (Optional Enhancement)

If you want better error handling and automatic token refresh:

**Update**: `src/config/supabaseClient.js`

\`\`\`javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // Keep user logged in across page refreshes
    autoRefreshToken: true,       // Automatically refresh auth token
    detectSessionInUrl: true,     // Detect session in URL (for email verification)
    storage: window.localStorage, // Use localStorage for session persistence
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'nests-hostels-analytics',
    },
  },
});

export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};

export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('hostels')
      .select('count')
      .limit(1);

    if (error) throw error;
    return { success: true, message: 'Connected to Supabase successfully' };
  } catch (error) {
    console.error('Supabase connection error:', error);
    return { success: false, message: error.message };
  }
};
\`\`\`

---

## Step 7: Create First User (2 minutes)

Two options:

### **Option A: Via App UI**
1. Start dev server: `npm run dev`
2. You'll see login screen
3. Click "Don't have an account? Sign up"
4. Enter email and password
5. Click "Sign Up"
6. Done! (Check email if verification is enabled)

### **Option B: Via Supabase Dashboard**
1. Go to **Authentication** → **Users**
2. Click **"Add user"**
3. Enter email and password
4. Click **"Create user"**
5. User can now log in

---

## 🎨 Optional: Add User Profile & Settings

**Create**: `src/components/Auth/UserMenu.jsx`

\`\`\`javascript
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, LogOut, Key, ChevronDown } from 'lucide-react';

const UserMenu = () => {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 bg-nests-teal rounded-full flex items-center justify-center text-white font-semibold">
          {user.email[0].toUpperCase()}
        </div>
        <span className="text-sm font-medium text-gray-700">{user.email}</span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-xs text-gray-500">Signed in as</p>
            <p className="text-sm font-semibold text-gray-800">{user.email}</p>
          </div>

          <button
            onClick={() => {
              /* TODO: Add profile page */
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700"
          >
            <User className="w-4 h-4" />
            Profile Settings
          </button>

          <button
            onClick={() => {
              /* TODO: Add change password */
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700"
          >
            <Key className="w-4 h-4" />
            Change Password
          </button>

          <div className="border-t border-gray-200 mt-2 pt-2">
            <button
              onClick={() => {
                signOut();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-sm text-red-600 font-medium"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
\`\`\`

---

## 🔐 Security Best Practices

### ✅ **Do's**

1. **Enable Email Verification** (production)
   - Supabase → Authentication → Email Templates → Confirm signup

2. **Set Strong Password Requirements**
   - Minimum 8 characters (Supabase default: 6)
   - Add password strength indicator in UI

3. **Add Rate Limiting**
   - Supabase has built-in rate limiting
   - Configure in Authentication → Rate Limits

4. **Use HTTPS** (production)
   - Required for secure authentication
   - Vercel/Netlify handle this automatically

5. **Store Tokens Securely**
   - Supabase handles this automatically
   - Uses httpOnly cookies when possible

### ❌ **Don'ts**

1. **Never commit `.env` file**
   - Already in `.gitignore`
   - Keep credentials secret

2. **Don't share anon key publicly**
   - It's "public" but should only be in your deployed app
   - RLS policies protect your data

3. **Don't use weak passwords**
   - Minimum 8+ characters
   - Use password manager

---

## 🧪 Testing Authentication

### Test Checklist

- [ ] Sign up with new email
- [ ] Sign in with correct password
- [ ] Sign in with wrong password (should show error)
- [ ] Sign out (should show login screen)
- [ ] Refresh page while logged in (should stay logged in)
- [ ] Try to access dashboard without login (should redirect to login)
- [ ] Database operations work (fetch, save, load)

---

## 🔄 Migration Path

### Current (Anonymous Access)
```
App starts → Database access → Dashboard
```

### With Authentication
```
App starts → Check if logged in
              ├─ Yes → Dashboard
              └─ No → Login screen → Dashboard after login
```

---

## 📊 Summary

**Files to Create**:
1. `supabase/migrations/003_add_authentication.sql` - RLS policies
2. `src/contexts/AuthContext.jsx` - Auth state management
3. `src/components/Auth/Login.jsx` - Login/signup UI

**Files to Update**:
1. `src/App.jsx` - Wrap with AuthProvider, add ProtectedApp
2. `src/config/supabaseClient.js` - Better auth config (optional)

**Time Required**: ~30-40 minutes total

**Complexity**: ⭐⭐⭐ (Medium - follows patterns)

---

## 🎯 Benefits

✅ **Secure**: Only authenticated users access data
✅ **Simple**: Email/password (familiar to users)
✅ **Scalable**: Add OAuth, magic links later
✅ **Built-in**: Password reset, email verification
✅ **Production-ready**: Supabase handles tokens, refresh, sessions

---

## 🚀 When to Implement?

**Implement Now If:**
- Multiple people will use the dashboard
- You're deploying to production
- Data should be private per user

**Wait If:**
- Only you use it locally
- Testing/development phase
- Want to keep things simple

---

**Last Updated**: January 17, 2026
**Complexity**: Medium (30-40 minutes)
**Status**: Ready to implement when needed
