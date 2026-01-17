-- Nests Hostels Analytics Database Schema
-- Supabase Migration: Initial Schema
-- Created: 2026-01-16

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable JSONB operations
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. hostels
-- Master table for hostel properties
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hostels (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cloudbeds_id      TEXT UNIQUE NOT NULL,        -- CloudBeds property ID (e.g., "6733")
  name              TEXT NOT NULL,                -- Hostel name (e.g., "Flamingo")
  slug              TEXT UNIQUE NOT NULL,         -- URL-friendly name (e.g., "flamingo")
  active            BOOLEAN DEFAULT true,         -- Is hostel currently active?
  metadata          JSONB DEFAULT '{}',           -- Custom fields (address, timezone, etc.)
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for hostels
CREATE INDEX IF NOT EXISTS idx_hostels_cloudbeds_id ON hostels(cloudbeds_id);
CREATE INDEX IF NOT EXISTS idx_hostels_slug ON hostels(slug);
CREATE INDEX IF NOT EXISTS idx_hostels_active ON hostels(active);

-- ----------------------------------------------------------------------------
-- 2. reservations
-- Individual booking records with structured + JSONB hybrid approach
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservations (
  -- Identity
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cloudbeds_reservation_id  TEXT UNIQUE NOT NULL,    -- CloudBeds reservation ID
  hostel_id                 UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,

  -- Key Dates (structured for queries/aggregations)
  booking_date              DATE NOT NULL,            -- When reservation was made
  checkin_date              DATE NOT NULL,            -- Arrival date
  checkout_date             DATE,                     -- Departure date

  -- Booking Details (structured for analytics)
  source                    TEXT,                     -- e.g., "Sitio web"
  status                    TEXT,                     -- e.g., "confirmed", "cancelled"
  nights                    INTEGER,                  -- Length of stay
  guests                    INTEGER,                  -- Number of guests

  -- Revenue (structured for aggregations)
  total_price               DECIMAL(10,2),            -- Total booking amount (from enrichment)
  net_price                 DECIMAL(10,2),            -- Price before taxes (subTotal)
  taxes                     DECIMAL(10,2),            -- Tax amount (taxesFees)
  currency                  TEXT DEFAULT 'EUR',

  -- Calculated Fields (auto-populated by trigger)
  lead_time                 INTEGER,                  -- Days between booking and checkin
  is_nest_pass              BOOLEAN,                  -- 7+ nights
  is_monthly                BOOLEAN,                  -- 28+ nights
  is_cancelled              BOOLEAN,                  -- Derived from status

  -- Flexible Data (JSONB for everything else)
  raw_data                  JSONB DEFAULT '{}',       -- Complete CloudBeds API response
  enrichment_data           JSONB DEFAULT '{}',       -- Data from singular getReservation() call
  custom_fields             JSONB DEFAULT '{}',       -- Future extensions

  -- Data Source Tracking
  data_source               TEXT,                     -- 'api', 'excel', 'paste'
  imported_at               TIMESTAMPTZ DEFAULT NOW(),
  enriched_at               TIMESTAMPTZ,              -- When revenue was enriched

  -- Timestamps
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for reservations (critical for performance)
CREATE INDEX IF NOT EXISTS idx_reservations_cloudbeds_id ON reservations(cloudbeds_reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservations_hostel_id ON reservations(hostel_id);
CREATE INDEX IF NOT EXISTS idx_reservations_booking_date ON reservations(booking_date);
CREATE INDEX IF NOT EXISTS idx_reservations_checkin_date ON reservations(checkin_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_source ON reservations(source);
CREATE INDEX IF NOT EXISTS idx_reservations_is_cancelled ON reservations(is_cancelled);
CREATE INDEX IF NOT EXISTS idx_reservations_is_nest_pass ON reservations(is_nest_pass);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_reservations_hostel_booking_date ON reservations(hostel_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_reservations_hostel_checkin_date ON reservations(hostel_id, checkin_date);

-- JSONB indexes for flexible queries
CREATE INDEX IF NOT EXISTS idx_reservations_raw_data ON reservations USING GIN (raw_data);
CREATE INDEX IF NOT EXISTS idx_reservations_enrichment_data ON reservations USING GIN (enrichment_data);

-- ----------------------------------------------------------------------------
-- 3. weekly_reports
-- Pre-calculated weekly metrics for fast dashboard rendering (denormalized)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weekly_reports (
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
);

-- Indexes for weekly_reports
CREATE INDEX IF NOT EXISTS idx_weekly_reports_hostel_id ON weekly_reports(hostel_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_week_start ON weekly_reports(week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_week_range ON weekly_reports(week_start, week_end);

-- Composite index for common queries
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_reports_hostel_week ON weekly_reports(hostel_id, week_start);

-- ----------------------------------------------------------------------------
-- 4. data_imports
-- Track data upload history (for audit trail and re-processing)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_imports (
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

  -- Raw Import Data (for re-processing if needed)
  raw_file_data     JSONB,                         -- Excel/paste data for re-processing

  -- Timestamps
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for data_imports
CREATE INDEX IF NOT EXISTS idx_data_imports_created_at ON data_imports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_imports_import_type ON data_imports(import_type);
CREATE INDEX IF NOT EXISTS idx_data_imports_status ON data_imports(status);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Auto-update updated_at timestamp
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ----------------------------------------------------------------------------
-- Auto-calculate derived fields on reservations
-- Calculate: lead_time, is_nest_pass, is_monthly, is_cancelled
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_reservation_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate lead time (days between booking and checkin)
  IF NEW.booking_date IS NOT NULL AND NEW.checkin_date IS NOT NULL THEN
    NEW.lead_time = NEW.checkin_date - NEW.booking_date;
  END IF;

  -- Calculate is_nest_pass (7+ nights)
  IF NEW.nights IS NOT NULL THEN
    NEW.is_nest_pass = (NEW.nights >= 7);
  ELSE
    NEW.is_nest_pass = false;
  END IF;

  -- Calculate is_monthly (28+ nights)
  IF NEW.nights IS NOT NULL THEN
    NEW.is_monthly = (NEW.nights >= 28);
  ELSE
    NEW.is_monthly = false;
  END IF;

  -- Calculate is_cancelled (status contains "cancel")
  IF NEW.status IS NOT NULL THEN
    NEW.is_cancelled = (NEW.status ILIKE '%cancel%');
  ELSE
    NEW.is_cancelled = false;
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Auto-update updated_at triggers
-- ----------------------------------------------------------------------------
CREATE TRIGGER update_hostels_updated_at
  BEFORE UPDATE ON hostels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_reports_updated_at
  BEFORE UPDATE ON weekly_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Auto-calculate reservation fields trigger
-- ----------------------------------------------------------------------------
CREATE TRIGGER calculate_reservation_fields_trigger
  BEFORE INSERT OR UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION calculate_reservation_fields();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_imports ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS Policies for hostels
-- ----------------------------------------------------------------------------
CREATE POLICY "Allow authenticated users to read hostels"
  ON hostels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert hostels"
  ON hostels FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update hostels"
  ON hostels FOR UPDATE
  TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- RLS Policies for reservations
-- ----------------------------------------------------------------------------
CREATE POLICY "Allow authenticated users to read reservations"
  ON reservations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert reservations"
  ON reservations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update reservations"
  ON reservations FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete reservations"
  ON reservations FOR DELETE
  TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- RLS Policies for weekly_reports
-- ----------------------------------------------------------------------------
CREATE POLICY "Allow authenticated users to read weekly_reports"
  ON weekly_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert weekly_reports"
  ON weekly_reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update weekly_reports"
  ON weekly_reports FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete weekly_reports"
  ON weekly_reports FOR DELETE
  TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- RLS Policies for data_imports
-- ----------------------------------------------------------------------------
CREATE POLICY "Allow authenticated users to read data_imports"
  ON data_imports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert data_imports"
  ON data_imports FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert existing hostels from hostelConfig
INSERT INTO hostels (cloudbeds_id, name, slug, active) VALUES
  ('6733', 'Flamingo', 'flamingo', true),
  ('316328', 'Puerto', 'puerto', true),
  ('315588', 'Arena', 'arena', true),
  ('316438', 'Duque', 'duque', true),
  ('316428', 'Las Palmas', 'las-palmas', true),
  ('316437', 'Aguere', 'aguere', true),
  ('316440', 'Medano', 'medano', true),
  ('316443', 'Los Amigos', 'los-amigos', true),
  ('316442', 'Cisne', 'cisne', true),
  ('316441', 'Ashavana', 'ashavana', true),
  ('316439', 'Las Eras', 'las-eras', true)
ON CONFLICT (cloudbeds_id) DO NOTHING;

-- ============================================================================
-- HELPFUL VIEWS (OPTIONAL)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: reservations_with_hostel
-- Join reservations with hostel names for easier queries
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW reservations_with_hostel AS
SELECT
  r.*,
  h.name as hostel_name,
  h.slug as hostel_slug,
  h.cloudbeds_id as hostel_cloudbeds_id
FROM reservations r
JOIN hostels h ON r.hostel_id = h.id;

-- ----------------------------------------------------------------------------
-- View: weekly_reports_with_hostel
-- Join weekly reports with hostel names
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW weekly_reports_with_hostel AS
SELECT
  wr.*,
  h.name as hostel_name,
  h.slug as hostel_slug,
  h.cloudbeds_id as hostel_cloudbeds_id
FROM weekly_reports wr
JOIN hostels h ON wr.hostel_id = h.id;

-- ============================================================================
-- UTILITY FUNCTIONS FOR APPLICATION
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: get_or_create_hostel
-- Get hostel by cloudbeds_id, create if not exists
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_or_create_hostel(
  p_cloudbeds_id TEXT,
  p_name TEXT,
  p_slug TEXT
)
RETURNS UUID AS $$
DECLARE
  v_hostel_id UUID;
BEGIN
  -- Try to find existing hostel
  SELECT id INTO v_hostel_id
  FROM hostels
  WHERE cloudbeds_id = p_cloudbeds_id;

  -- If not found, create new hostel
  IF v_hostel_id IS NULL THEN
    INSERT INTO hostels (cloudbeds_id, name, slug, active)
    VALUES (p_cloudbeds_id, p_name, p_slug, true)
    RETURNING id INTO v_hostel_id;
  END IF;

  RETURN v_hostel_id;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Function: upsert_reservation
-- Insert or update reservation (based on cloudbeds_reservation_id)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION upsert_reservation(
  p_cloudbeds_reservation_id TEXT,
  p_hostel_id UUID,
  p_booking_date DATE,
  p_checkin_date DATE,
  p_checkout_date DATE,
  p_source TEXT,
  p_status TEXT,
  p_nights INTEGER,
  p_guests INTEGER,
  p_total_price DECIMAL,
  p_net_price DECIMAL,
  p_taxes DECIMAL,
  p_currency TEXT,
  p_raw_data JSONB,
  p_enrichment_data JSONB,
  p_data_source TEXT
)
RETURNS UUID AS $$
DECLARE
  v_reservation_id UUID;
BEGIN
  -- Insert or update reservation
  INSERT INTO reservations (
    cloudbeds_reservation_id,
    hostel_id,
    booking_date,
    checkin_date,
    checkout_date,
    source,
    status,
    nights,
    guests,
    total_price,
    net_price,
    taxes,
    currency,
    raw_data,
    enrichment_data,
    data_source,
    imported_at
  )
  VALUES (
    p_cloudbeds_reservation_id,
    p_hostel_id,
    p_booking_date,
    p_checkin_date,
    p_checkout_date,
    p_source,
    p_status,
    p_nights,
    p_guests,
    p_total_price,
    p_net_price,
    p_taxes,
    p_currency,
    p_raw_data,
    p_enrichment_data,
    p_data_source,
    NOW()
  )
  ON CONFLICT (cloudbeds_reservation_id) DO UPDATE SET
    hostel_id = EXCLUDED.hostel_id,
    booking_date = EXCLUDED.booking_date,
    checkin_date = EXCLUDED.checkin_date,
    checkout_date = EXCLUDED.checkout_date,
    source = EXCLUDED.source,
    status = EXCLUDED.status,
    nights = EXCLUDED.nights,
    guests = EXCLUDED.guests,
    total_price = COALESCE(EXCLUDED.total_price, reservations.total_price),
    net_price = COALESCE(EXCLUDED.net_price, reservations.net_price),
    taxes = COALESCE(EXCLUDED.taxes, reservations.taxes),
    currency = EXCLUDED.currency,
    raw_data = EXCLUDED.raw_data,
    enrichment_data = COALESCE(EXCLUDED.enrichment_data, reservations.enrichment_data),
    data_source = EXCLUDED.data_source,
    updated_at = NOW()
  RETURNING id INTO v_reservation_id;

  RETURN v_reservation_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS (DOCUMENTATION)
-- ============================================================================

COMMENT ON TABLE hostels IS 'Master table for hostel properties';
COMMENT ON TABLE reservations IS 'Individual booking records with structured + JSONB hybrid approach';
COMMENT ON TABLE weekly_reports IS 'Pre-calculated weekly metrics for fast dashboard rendering';
COMMENT ON TABLE data_imports IS 'Audit trail for data uploads';

COMMENT ON COLUMN reservations.raw_data IS 'Complete CloudBeds API response (50+ fields stored as JSONB)';
COMMENT ON COLUMN reservations.enrichment_data IS 'Data from singular getReservation() API call (revenue enrichment)';
COMMENT ON COLUMN reservations.is_nest_pass IS 'Auto-calculated: true if nights >= 7';
COMMENT ON COLUMN reservations.is_monthly IS 'Auto-calculated: true if nights >= 28';
COMMENT ON COLUMN reservations.is_cancelled IS 'Auto-calculated: true if status contains "cancel"';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
