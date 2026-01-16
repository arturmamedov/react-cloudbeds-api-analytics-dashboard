# Supabase Database Schema

## Overview

This document describes the PostgreSQL database schema for the Nests Hostels Analytics Dashboard, hosted on Supabase.

## Design Philosophy

**Hybrid Model: Structured + JSONB**
- Structured columns for frequently queried fields (dates, revenue, status, hostel_id)
- JSONB columns for flexible data (raw booking details, CloudBeds API responses)
- Denormalized weekly reports for fast dashboard rendering
- Follows project principle: "Simplicity over complexity"

## Tables

### 1. `hostels`
Master table for hostel properties.

```sql
hostels (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cloudbeds_id      TEXT UNIQUE NOT NULL,        -- e.g., "6733" (Flamingo)
  name              TEXT NOT NULL,                -- e.g., "Flamingo"
  slug              TEXT UNIQUE NOT NULL,         -- e.g., "flamingo"
  active            BOOLEAN DEFAULT true,
  metadata          JSONB DEFAULT '{}',           -- Custom fields (address, timezone, etc.)
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
)
```

**Purpose**: Store hostel configuration
**Indexes**:
- Primary key on `id`
- Unique index on `cloudbeds_id`
- Unique index on `slug`

---

### 2. `reservations`
Individual booking records with structured + JSONB hybrid approach.

```sql
reservations (
  -- Identity
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cloudbeds_reservation_id TEXT UNIQUE NOT NULL,    -- CloudBeds reservation ID
  hostel_id             UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,

  -- Key Dates (structured for queries/aggregations)
  booking_date          DATE NOT NULL,              -- When reservation was made
  checkin_date          DATE NOT NULL,              -- Arrival date
  checkout_date         DATE,                       -- Departure date

  -- Booking Details (structured for analytics)
  source                TEXT,                       -- e.g., "Sitio web"
  status                TEXT,                       -- e.g., "confirmed", "cancelled"
  nights                INTEGER,                    -- Length of stay
  guests                INTEGER,                    -- Number of guests

  -- Revenue (structured for aggregations)
  total_price           DECIMAL(10,2),              -- Total booking amount (from enrichment)
  net_price             DECIMAL(10,2),              -- Price before taxes (subTotal)
  taxes                 DECIMAL(10,2),              -- Tax amount (taxesFees)
  currency              TEXT DEFAULT 'EUR',

  -- Calculated Fields
  lead_time             INTEGER,                    -- Days between booking and checkin
  is_nest_pass          BOOLEAN,                    -- 7+ nights
  is_monthly            BOOLEAN,                    -- 28+ nights
  is_cancelled          BOOLEAN,                    -- Derived from status

  -- Flexible Data (JSONB for everything else)
  raw_data              JSONB DEFAULT '{}',         -- Complete CloudBeds API response
  enrichment_data       JSONB DEFAULT '{}',         -- Data from singular getReservation() call
  custom_fields         JSONB DEFAULT '{}',         -- Future extensions

  -- Data Source Tracking
  data_source           TEXT,                       -- 'api', 'excel', 'paste'
  imported_at           TIMESTAMPTZ DEFAULT NOW(),
  enriched_at           TIMESTAMPTZ,                -- When revenue was enriched

  -- Timestamps
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
)
```

**Purpose**: Store all booking data with queryable structure + flexible JSONB
**Indexes**:
- Primary key on `id`
- Unique index on `cloudbeds_reservation_id`
- Index on `hostel_id` (foreign key)
- Index on `booking_date` (for weekly grouping)
- Index on `checkin_date` (for date range queries)
- Index on `status` (for filtering cancelled bookings)
- Index on `source` (for "Sitio web" filtering)
- Composite index on `(hostel_id, booking_date)` (for weekly hostel reports)

**Why JSONB for raw_data?**
- CloudBeds API returns 50+ fields per booking
- Most fields are rarely queried (guest names, room types, etc.)
- Storing in JSONB avoids 50+ columns and schema migrations
- You can always promote JSONB fields to columns later if needed

---

### 3. `weekly_reports`
Pre-calculated weekly metrics for fast dashboard rendering (denormalized).

```sql
weekly_reports (
  -- Identity
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id         UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,

  -- Week Period
  week_start        DATE NOT NULL,                 -- Monday of the week
  week_end          DATE NOT NULL,                 -- Sunday of the week
  week_label        TEXT NOT NULL,                 -- e.g., "16 Dec 2024 - 22 Dec 2024"

  -- Pre-calculated Metrics (from calculateHostelMetrics)
  total_count       INTEGER DEFAULT 0,             -- All bookings (including cancelled)
  cancelled_count   INTEGER DEFAULT 0,             -- Cancelled bookings
  valid_count       INTEGER DEFAULT 0,             -- Non-cancelled bookings

  total_revenue     DECIMAL(10,2) DEFAULT 0,       -- Sum of valid booking prices
  net_revenue       DECIMAL(10,2) DEFAULT 0,       -- Revenue before taxes
  total_taxes       DECIMAL(10,2) DEFAULT 0,       -- Total tax amount
  adr               DECIMAL(10,2) DEFAULT 0,       -- Average Daily Rate

  nest_pass_count   INTEGER DEFAULT 0,             -- 7+ night bookings
  nest_pass_pct     DECIMAL(5,2) DEFAULT 0,        -- Percentage of valid bookings
  monthly_count     INTEGER DEFAULT 0,             -- 28+ night bookings
  monthly_pct       DECIMAL(5,2) DEFAULT 0,        -- Percentage of valid bookings

  avg_lead_time     DECIMAL(6,2) DEFAULT 0,        -- Average days between booking and checkin

  -- Week-over-Week Changes (for MetricChange component)
  wow_changes       JSONB DEFAULT '{}',            -- {revenue: {change: 100, percentage: 10}, ...}

  -- Full Metrics Snapshot
  metrics_snapshot  JSONB DEFAULT '{}',            -- Complete calculateHostelMetrics() output

  -- Timestamps
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(hostel_id, week_start)
)
```

**Purpose**: Pre-calculated weekly aggregations for fast dashboard loading
**Indexes**:
- Primary key on `id`
- Unique composite index on `(hostel_id, week_start)`
- Index on `week_start` (for date range filtering)

**Why denormalize weekly_reports?**
- Dashboard loads instantly (no real-time aggregations)
- Week-over-week comparisons pre-calculated
- Still recalculates from `reservations` table when user adds new data
- Follows pattern: "Calculate once, display many times"

---

### 4. `data_imports`
Track data upload history (for audit trail and re-processing).

```sql
data_imports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Import Details
  import_type       TEXT NOT NULL,                 -- 'api', 'excel', 'paste'
  import_source     TEXT,                          -- Filename, API endpoint, etc.

  -- Date Range
  date_from         DATE,
  date_to           DATE,

  -- Stats
  reservations_count INTEGER DEFAULT 0,            -- Number of reservations imported
  hostels_affected  TEXT[],                        -- Array of hostel slugs

  -- Status
  status            TEXT DEFAULT 'completed',      -- 'processing', 'completed', 'failed'
  error_message     TEXT,

  -- Raw Import Data
  raw_file_data     JSONB,                         -- Excel/paste data for re-processing

  -- Timestamps
  created_at        TIMESTAMPTZ DEFAULT NOW()
)
```

**Purpose**: Audit trail for data imports
**Indexes**:
- Primary key on `id`
- Index on `created_at` (for recent imports)

---

## Relationships

```
hostels (1) ──── (many) reservations
hostels (1) ──── (many) weekly_reports
```

---

## Database Functions & Triggers

### Auto-update `updated_at` timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables
CREATE TRIGGER update_hostels_updated_at BEFORE UPDATE ON hostels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_reports_updated_at BEFORE UPDATE ON weekly_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Auto-calculate derived fields on reservations

```sql
CREATE OR REPLACE FUNCTION calculate_reservation_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate lead time
  IF NEW.booking_date IS NOT NULL AND NEW.checkin_date IS NOT NULL THEN
    NEW.lead_time = NEW.checkin_date - NEW.booking_date;
  END IF;

  -- Calculate is_nest_pass (7+ nights)
  NEW.is_nest_pass = (NEW.nights >= 7);

  -- Calculate is_monthly (28+ nights)
  NEW.is_monthly = (NEW.nights >= 28);

  -- Calculate is_cancelled
  NEW.is_cancelled = (NEW.status ILIKE '%cancel%');

  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_reservation_fields_trigger
  BEFORE INSERT OR UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION calculate_reservation_fields();
```

---

## Data Flow

### Current Workflow (Frontend-only)
```
User Upload → Parse Data → Calculate Metrics → Render Dashboard
```

### New Workflow (with Database)
```
User Upload → Parse Data → Save to DB → Calculate & Cache Weekly Reports → Render Dashboard
                                  ↓
                          (reservations table)
                                  ↓
                        (weekly_reports table - pre-calculated)
```

### API Fetch + Enrichment Workflow
```
1. Fetch bookings (getReservations) → Save to reservations (raw_data)
2. User clicks "Enrich Revenue" → Fetch singular getReservation() → Update reservations (enrichment_data, total_price, net_price, taxes)
3. Recalculate weekly_reports → Update dashboard
```

---

## Query Examples

### Get all reservations for a week (for dashboard)
```sql
SELECT r.*, h.name as hostel_name
FROM reservations r
JOIN hostels h ON r.hostel_id = h.id
WHERE r.booking_date >= '2024-12-16'
  AND r.booking_date <= '2024-12-22'
  AND r.source = 'Sitio web'
ORDER BY r.booking_date;
```

### Get weekly report (fast dashboard load)
```sql
SELECT wr.*, h.name as hostel_name
FROM weekly_reports wr
JOIN hostels h ON wr.hostel_id = h.id
WHERE wr.week_start >= '2024-12-01'
ORDER BY wr.week_start DESC, h.name;
```

### Week-over-week comparison
```sql
WITH current_week AS (
  SELECT * FROM weekly_reports WHERE week_start = '2024-12-16'
),
previous_week AS (
  SELECT * FROM weekly_reports WHERE week_start = '2024-12-09'
)
SELECT
  c.hostel_id,
  c.total_revenue as current_revenue,
  p.total_revenue as previous_revenue,
  c.total_revenue - p.total_revenue as revenue_change,
  ROUND(((c.total_revenue - p.total_revenue) / NULLIF(p.total_revenue, 0) * 100), 2) as revenue_change_pct
FROM current_week c
LEFT JOIN previous_week p ON c.hostel_id = p.hostel_id;
```

### Nest Pass analytics
```sql
SELECT
  h.name,
  COUNT(*) FILTER (WHERE r.is_nest_pass) as nest_pass_count,
  COUNT(*) as total_bookings,
  ROUND(COUNT(*) FILTER (WHERE r.is_nest_pass)::DECIMAL / COUNT(*) * 100, 2) as nest_pass_pct
FROM reservations r
JOIN hostels h ON r.hostel_id = h.id
WHERE r.booking_date >= '2024-01-01'
  AND r.is_cancelled = false
GROUP BY h.name;
```

---

## Scalability Considerations

### Current Scale
- **4 hostels** (Flamingo, Puerto, Arena, etc.)
- **~100-500 bookings/week** (estimated)
- **~52 weeks/year** = 2,600-26,000 bookings/year
- **5 years of data** = 13,000-130,000 rows (easily handled by PostgreSQL)

### Future Scale
- **10+ hostels** = 65,000-650,000 rows (5 years)
- **PostgreSQL** handles millions of rows efficiently
- **Indexes** ensure fast queries even at scale
- **weekly_reports** keeps dashboard fast (pre-calculated aggregations)

### If needed in future
- **Partitioning**: Partition `reservations` by booking_date (year or quarter)
- **Archiving**: Move old data to `reservations_archive` table
- **Caching**: Add Redis for frequently accessed weekly_reports
- **Read Replicas**: Supabase supports read replicas for high-traffic scenarios

---

## Migration Strategy

### Phase 1: Database Setup
1. Create Supabase project
2. Run migration SQL (creates tables, indexes, functions)
3. Seed `hostels` table with current hostelConfig

### Phase 2: Backend Integration
1. Add Supabase client to React app
2. Create database utility functions (dbUtils.js)
3. Update HostelAnalytics.jsx to save/load from DB

### Phase 3: Data Migration
1. Keep existing Excel/paste functionality
2. Add "Save to Database" button
3. Gradually migrate historical data

### Phase 4: Dashboard Optimization
1. Load weekly_reports for fast rendering
2. Add "Recalculate" button to refresh from reservations
3. Enable real-time updates (Supabase subscriptions)

---

## Security & Row-Level Security (RLS)

### Recommended RLS Policies

```sql
-- Enable RLS on all tables
ALTER TABLE hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_imports ENABLE ROW LEVEL SECURITY;

-- Example: Allow authenticated users to read all data
CREATE POLICY "Allow authenticated users to read hostels"
  ON hostels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read reservations"
  ON reservations FOR SELECT
  TO authenticated
  USING (true);

-- Example: Allow authenticated users to insert/update reservations
CREATE POLICY "Allow authenticated users to insert reservations"
  ON reservations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update reservations"
  ON reservations FOR UPDATE
  TO authenticated
  USING (true);
```

**Note**: Adjust RLS policies based on your authentication setup (Supabase Auth, service role keys, etc.)

---

## Environment Variables

Add to `.env`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Server-side only
```

---

## Next Steps

1. **Review this schema** - Does it meet your needs?
2. **Create Supabase project** - Sign up at https://supabase.com
3. **Run migration** - Execute SQL to create tables
4. **Integrate frontend** - Add Supabase client and database utilities
5. **Test with real data** - Upload a week's worth of bookings

---

**Last Updated**: January 16, 2026
**Maintained By**: Claude AI + Artur Mamedov
**Database**: Supabase (PostgreSQL 15)
