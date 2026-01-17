-- ============================================================================
-- FIX: Update RLS Policies to Allow Anonymous (anon) Users
-- ============================================================================
-- This app is a single-user dashboard, so anon access is safe
-- Run this in Supabase SQL Editor to fix the RLS policy errors

-- ============================================================================
-- DROP EXISTING POLICIES (authenticated only)
-- ============================================================================

-- Hostels policies
DROP POLICY IF EXISTS "Allow authenticated users to read hostels" ON hostels;
DROP POLICY IF EXISTS "Allow authenticated users to insert hostels" ON hostels;
DROP POLICY IF EXISTS "Allow authenticated users to update hostels" ON hostels;

-- Reservations policies
DROP POLICY IF EXISTS "Allow authenticated users to read reservations" ON reservations;
DROP POLICY IF EXISTS "Allow authenticated users to insert reservations" ON reservations;
DROP POLICY IF EXISTS "Allow authenticated users to update reservations" ON reservations;
DROP POLICY IF EXISTS "Allow authenticated users to delete reservations" ON reservations;

-- Weekly reports policies
DROP POLICY IF EXISTS "Allow authenticated users to read weekly_reports" ON weekly_reports;
DROP POLICY IF EXISTS "Allow authenticated users to insert weekly_reports" ON weekly_reports;
DROP POLICY IF EXISTS "Allow authenticated users to update weekly_reports" ON weekly_reports;
DROP POLICY IF EXISTS "Allow authenticated users to delete weekly_reports" ON weekly_reports;

-- Data imports policies
DROP POLICY IF EXISTS "Allow authenticated users to read data_imports" ON data_imports;
DROP POLICY IF EXISTS "Allow authenticated users to insert data_imports" ON data_imports;

-- ============================================================================
-- CREATE NEW POLICIES (allow anon users)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Hostels: Allow anon users to read, insert, update
-- ----------------------------------------------------------------------------
CREATE POLICY "Allow anon users to read hostels"
  ON hostels FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon users to insert hostels"
  ON hostels FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anon users to update hostels"
  ON hostels FOR UPDATE
  TO anon, authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- Reservations: Allow anon users full access
-- ----------------------------------------------------------------------------
CREATE POLICY "Allow anon users to read reservations"
  ON reservations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon users to insert reservations"
  ON reservations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anon users to update reservations"
  ON reservations FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon users to delete reservations"
  ON reservations FOR DELETE
  TO anon, authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- Weekly Reports: Allow anon users full access
-- ----------------------------------------------------------------------------
CREATE POLICY "Allow anon users to read weekly_reports"
  ON weekly_reports FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon users to insert weekly_reports"
  ON weekly_reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anon users to update weekly_reports"
  ON weekly_reports FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon users to delete weekly_reports"
  ON weekly_reports FOR DELETE
  TO anon, authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- Data Imports: Allow anon users to read and insert
-- ----------------------------------------------------------------------------
CREATE POLICY "Allow anon users to read data_imports"
  ON data_imports FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon users to insert data_imports"
  ON data_imports FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check that policies are updated
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN ('hostels', 'reservations', 'weekly_reports', 'data_imports')
ORDER BY tablename, policyname;
