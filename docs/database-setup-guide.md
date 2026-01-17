# Database Setup Guide

## Overview

This guide walks you through setting up the Supabase PostgreSQL database for the Nests Hostels Analytics Dashboard.

## Prerequisites

- A Supabase account (free tier is sufficient to start)
- Node.js and npm installed
- Access to this project's codebase

## Step-by-Step Setup

### 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/log in
2. Click "New Project"
3. Fill in project details:
   - **Name**: `nests-hostels-analytics` (or your preferred name)
   - **Database Password**: Generate a strong password (save it securely!)
   - **Region**: Choose closest to your users (Europe for Spain)
   - **Pricing Plan**: Free tier is fine to start
4. Click "Create new project"
5. Wait 2-3 minutes for project to be provisioned

### 2. Run Database Migration

Once your project is ready:

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the migration file: `supabase/migrations/001_initial_schema.sql`
4. Copy the entire contents and paste into the SQL Editor
5. Click **"Run"** (or press `Cmd/Ctrl + Enter`)
6. You should see "Success. No rows returned" (this is expected)

**What this migration does:**
- Creates 4 tables: `hostels`, `reservations`, `weekly_reports`, `data_imports`
- Creates indexes for fast queries
- Creates database functions and triggers (auto-calculate fields, update timestamps)
- Sets up Row Level Security (RLS) policies
- Seeds initial hostel data from your `hostelConfig`
- Creates helpful views (`reservations_with_hostel`, `weekly_reports_with_hostel`)

### 3. Verify Tables Were Created

1. Go to **Table Editor** (left sidebar)
2. You should see 4 tables:
   - `hostels` (should have 4 rows: Flamingo, Puerto, Arena, Sitges)
   - `reservations` (empty for now)
   - `weekly_reports` (empty for now)
   - `data_imports` (empty for now)

### 4. Get Your API Keys

1. In Supabase dashboard, go to **Settings** (gear icon, bottom left)
2. Click **API** in the settings menu
3. You'll see two important values:

   **Project URL** (looks like):
   ```
   https://abcdefghijklmno.supabase.co
   ```

   **anon/public key** (looks like):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZi...
   ```

4. Copy both values (you'll need them in the next step)

### 5. Configure Environment Variables

1. In your project root, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your Supabase credentials:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. Replace `your-project.supabase.co` with your actual Project URL
4. Replace `your-anon-key-here` with your actual anon key

**Important**: Never commit your `.env` file to git! It's already in `.gitignore`.

### 6. Install Supabase Client

Install the Supabase JavaScript client library:

```bash
npm install @supabase/supabase-js
```

### 7. Test Connection

Start your development server:

```bash
npm run dev
```

Open the browser console and run:

```javascript
import { testConnection } from './src/config/supabaseClient';
testConnection().then(result => console.log(result));
```

You should see:
```
{ success: true, message: 'Connected to Supabase successfully' }
```

If you see an error, check:
- Your `.env` file has correct values
- You restarted the dev server after adding `.env`
- The migration ran successfully
- Your network can reach Supabase

## Usage

### Saving Data to Database

Once integrated with `HostelAnalytics.jsx`, the app will:

1. **On API Fetch**: Save reservations directly to database
2. **On Excel Upload**: Parse and save to database
3. **On Paste**: Parse and save to database
4. **On Revenue Enrichment**: Update reservation revenue fields

### Loading Data from Database

The app will:

1. **Load Weekly Reports**: Fast dashboard rendering from pre-calculated metrics
2. **Load Reservations**: Query specific weeks/hostels as needed
3. **Recalculate on Demand**: Option to recalculate weekly reports from raw reservations

## Database Structure

### Key Tables

#### `hostels`
- Master list of your properties
- Pre-seeded with Flamingo, Puerto, Arena, Sitges
- Add new hostels via `upsertHostel()` function

#### `reservations`
- Individual bookings
- Hybrid model: structured columns + JSONB for flexibility
- Auto-calculates: `lead_time`, `is_nest_pass`, `is_monthly`, `is_cancelled`
- Stores complete CloudBeds API response in `raw_data` field

#### `weekly_reports`
- Pre-calculated weekly metrics
- Fast dashboard loading (no real-time aggregations needed)
- Stores week-over-week changes
- Recalculate when new data is added

#### `data_imports`
- Audit trail of all data uploads
- Track what was imported, when, and from where

### Database Functions

The migration creates helpful functions you can use:

#### `get_or_create_hostel(cloudbeds_id, name, slug)`
```sql
SELECT get_or_create_hostel('6733', 'Flamingo', 'flamingo');
```

#### `upsert_reservation(...)`
```sql
-- Insert or update reservation
-- (See migration file for full signature)
```

## Querying Examples

### Get all reservations for a week
```javascript
import { getReservationsByWeek } from './src/utils/dbUtils';

const weekStart = new Date('2024-12-16');
const weekEnd = new Date('2024-12-22');

const result = await getReservationsByWeek(weekStart, weekEnd);
console.log(result.data); // Array of reservations
```

### Save reservations after API fetch
```javascript
import { saveReservations } from './src/utils/dbUtils';

// After fetching from CloudBeds API
const result = await saveReservations(bookings, 'flamingo', 'api');
console.log(`Saved ${result.stats.saved} reservations`);
```

### Get weekly reports for dashboard
```javascript
import { getAllWeeklyReports } from './src/utils/dbUtils';

const result = await getAllWeeklyReports();
console.log(result.data); // Array of weekly reports
```

## Row Level Security (RLS)

The database has RLS enabled for security. Current policies:

- **Authenticated users** can read/write all tables
- **Anonymous users** have no access

### To allow public read access (if needed):
```sql
-- Run in Supabase SQL Editor
CREATE POLICY "Allow public to read hostels"
  ON hostels FOR SELECT
  TO anon
  USING (true);
```

### To restrict access by user:
```sql
-- Example: Only allow users to see their own hostel's data
CREATE POLICY "Users see own hostel data"
  ON reservations FOR SELECT
  TO authenticated
  USING (
    hostel_id IN (
      SELECT hostel_id FROM user_hostel_access
      WHERE user_id = auth.uid()
    )
  );
```

## Authentication (Optional)

If you want to add user authentication:

### 1. Enable Email Auth in Supabase
1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates (or use defaults)

### 2. Add Supabase Auth to Your App
```javascript
import { supabase } from './src/config/supabaseClient';

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword123'
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword123'
});

// Sign out
await supabase.auth.signOut();

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

### 3. Protect Routes
```javascript
import { useEffect, useState } from 'react';
import { supabase } from './src/config/supabaseClient';

function ProtectedComponent() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!user) {
    return <div>Please sign in to access this page</div>;
  }

  return <div>Protected content for {user.email}</div>;
}
```

## Maintenance

### Backing Up Data

Supabase automatically backs up your database, but you can also export manually:

1. Go to **Database** → **Backups** in Supabase dashboard
2. Click **"Download backup"** for any point in time

### Monitoring

1. Go to **Reports** in Supabase dashboard
2. Monitor:
   - Database size
   - API requests
   - Active connections
   - Query performance

### Upgrading to Paid Plan

Free tier limits:
- **500 MB** database space
- **50 MB** file storage
- **2 GB** bandwidth
- **50,000** monthly active users

If you exceed these, upgrade to Pro plan ($25/month):
- **8 GB** database (expandable)
- **100 GB** file storage
- **250 GB** bandwidth
- **100,000** monthly active users

## Troubleshooting

### "relation does not exist" Error
- Migration didn't run successfully
- Re-run the migration SQL in SQL Editor

### "Invalid API key" Error
- Check `.env` file has correct `VITE_SUPABASE_ANON_KEY`
- Make sure you restarted dev server after adding `.env`

### "Row Level Security Policy Violation"
- Your RLS policies are blocking the operation
- Check policies in **Authentication** → **Policies**
- Make sure you're authenticated if required

### Slow Queries
- Check indexes in **Database** → **Tables** → [table] → **Indexes**
- Monitor slow queries in **Reports** → **Query Performance**
- Consider adding custom indexes for your specific queries

### Connection Timeout
- Check your network connection
- Verify Supabase project is running (not paused)
- Free tier projects pause after 1 week of inactivity (reactivate in dashboard)

## Next Steps

1. ✅ Database is set up and ready
2. ✅ Environment variables configured
3. ⏭️ Integrate with `HostelAnalytics.jsx` (see `docs/database-integration-guide.md`)
4. ⏭️ Test with real data (upload Excel file or fetch from API)
5. ⏭️ Deploy to production (see `docs/deployment-guide.md`)

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**Last Updated**: January 16, 2026
**Maintained By**: Claude AI + Artur Mamedov
