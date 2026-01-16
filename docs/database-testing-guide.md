# Database Integration Testing Guide

## Overview

This guide provides step-by-step testing instructions for the new Supabase database integration. Follow these tests to verify that all database functionality works correctly.

## Prerequisites

Before testing, ensure you have:

✅ Created a Supabase project
✅ Run the migration (001_initial_schema.sql)
✅ Added Supabase credentials to .env
✅ Installed dependencies (npm install)
✅ Started the dev server (npm run dev)

---

## Test Suite

### **Test 1: Database Connection & Initialization**

**Purpose**: Verify Supabase connection and hostel seeding

**Steps**:
1. Open the app in browser
2. Open browser console (F12)
3. Look for these console messages:
   ```
   [HostelAnalytics] 🔌 Checking Supabase connection...
   [HostelAnalytics] ✅ Supabase connected successfully
   [HostelAnalytics] 🌱 Seeding hostels from config...
   [HostelAnalytics] ✅ Hostels seeded: 11 hostels
   ```
4. Check UI for green status badge: "Database connected • 11 hostels ready"

**Expected Results**:
- ✅ Console shows successful connection
- ✅ Green status indicator visible
- ✅ No errors in console

**Troubleshooting**:
- ❌ If connection fails: Check .env credentials, restart dev server
- ❌ If seeding fails: Check migration ran successfully in Supabase dashboard

---

### **Test 2: API Fetch with Auto-Save**

**Purpose**: Verify data is automatically saved to database after API fetch

**Steps**:
1. Click "CloudBeds API" tab
2. Select a week date
3. Click "Fetch All Hostels" (or select single hostel)
4. Wait for fetch to complete
5. Watch console for database save messages:
   ```
   [HostelAnalytics] 💾 Saving API-fetched data to database...
   [HostelAnalytics] 💾 Saving X bookings for Flamingo...
   [HostelAnalytics] ✅ Saved X bookings for Flamingo
   [HostelAnalytics] ✅ Database save complete
   ```
6. Check Supabase dashboard → Table Editor → `reservations` table
7. Verify bookings appear in the table

**Expected Results**:
- ✅ Dashboard displays fetched data immediately
- ✅ Console shows background DB save
- ✅ Reservations visible in Supabase (with data_source = 'api')
- ✅ Status shows "Saved X bookings to database"
- ✅ data_imports table has audit record

**Troubleshooting**:
- ❌ If save fails: Check console for errors, verify hostel slug matches
- ❌ If duplicates: Upsert should prevent duplicates (check cloudbeds_reservation_id)

---

### **Test 3: Excel Upload with Auto-Save**

**Purpose**: Verify Excel upload saves to database

**Steps**:
1. Click "Upload Files/Folders" tab
2. Select week date
3. Upload Excel file(s) for one or more hostels
4. Wait for processing
5. Watch console for save messages
6. Check Supabase → `reservations` table
7. Verify data_source = 'excel'

**Expected Results**:
- ✅ Data displays in dashboard
- ✅ Console shows DB save
- ✅ Reservations in database with source = 'excel'
- ✅ No duplicates if re-uploading same file

---

### **Test 4: Paste Data with Auto-Save**

**Purpose**: Verify paste functionality saves to database

**Steps**:
1. Click "Copy & Paste" tab
2. Select hostel and week
3. Paste CloudBeds data
4. Click "Process Data"
5. Watch console for save messages
6. Check database for new reservations

**Expected Results**:
- ✅ Data displays correctly
- ✅ Background save completes
- ✅ Reservations in database with source = 'paste'

---

### **Test 5: Revenue Enrichment with DB Update**

**Purpose**: Verify enrichment updates database

**Steps**:
1. Fetch data from API (creates bookings without revenue)
2. Click "Enrich Revenue Data" button
3. Watch enrichment progress
4. Monitor console for DB update messages:
   ```
   [HostelAnalytics] ⚠️  Failed to update DB for...
   ```
   (Should NOT see this if DB is working)
5. After enrichment completes, check database
6. Verify `total_price`, `net_price`, `taxes` fields are populated
7. Verify `enriched_at` timestamp is set

**Expected Results**:
- ✅ Each booking update saves to DB immediately
- ✅ Database revenue fields populated
- ✅ enriched_at timestamp set
- ✅ Dashboard shows updated revenue with tax breakdown

---

### **Test 6: Load from Database (Persistence)**

**Purpose**: Verify data persists and can be reloaded

**Steps**:
1. Fetch or upload some data
2. Wait for auto-save to complete
3. **Refresh the browser page** (F5 or Cmd+R)
4. App loads with empty state
5. Scroll to "Database Operations" section
6. Click "Load Last 3 Months from Database"
7. Watch loading indicator
8. Wait for data to populate

**Expected Results**:
- ✅ Loading indicator shows "Loading from database..."
- ✅ Console shows: "Loaded X reservations from database"
- ✅ Dashboard populates with historical data
- ✅ All weeks, hostels, and metrics display correctly
- ✅ Status shows "Loaded X bookings from database"

**This is the key test for Option A architecture!**

---

### **Test 7: Multi-Hostel Data**

**Purpose**: Verify database handles multiple hostels correctly

**Steps**:
1. Fetch data for all 11 hostels (use "Fetch All Hostels")
2. Wait for completion
3. Verify all hostels saved:
   ```sql
   -- In Supabase SQL Editor:
   SELECT hostel_slug, COUNT(*) as booking_count
   FROM reservations_with_hostel
   GROUP BY hostel_slug
   ORDER BY hostel_slug;
   ```
4. Check that each hostel has its bookings

**Expected Results**:
- ✅ All hostels in database
- ✅ Each hostel has correct booking count
- ✅ No cross-contamination (bookings in correct hostel)

---

### **Test 8: Data Import Audit Trail**

**Purpose**: Verify audit trail is working

**Steps**:
1. Perform several imports (API, Excel, paste)
2. Go to Supabase → Table Editor → `data_imports`
3. Check for records of each import

**Expected Results**:
- ✅ Each import has a record
- ✅ Records show: import_type, reservations_count, hostels_affected
- ✅ Timestamps are correct

---

### **Test 9: Error Handling**

**Purpose**: Verify graceful error handling

**Steps**:
1. Stop Supabase (or change .env credentials to invalid)
2. Restart dev server
3. App should show: "Database not configured" or "Connection failed"
4. Try fetching data
5. App should work in memory-only mode
6. Restore Supabase config
7. Restart dev server
8. Verify connection restored

**Expected Results**:
- ✅ App doesn't crash without database
- ✅ Clear error messages
- ✅ Memory-only mode works
- ✅ Reconnects when config restored

---

### **Test 10: Database Status Indicator**

**Purpose**: Verify status updates correctly

**Steps**:
1. Watch status indicator during operations
2. Should update through these states:
   - Initial: "Database connected • 11 hostels ready"
   - After save: "Saved X bookings to database"
   - After load: "Loaded X bookings from database"
   - On error: "Failed to..." (red badge)

**Expected Results**:
- ✅ Status updates in real-time
- ✅ Color coding correct (green=success, red=error, blue=info)
- ✅ Messages are clear and helpful

---

## Edge Cases to Test

### Edge Case 1: Duplicate Prevention

**Test**: Upload same data twice (same reservationID)

**Expected**: Upsert prevents duplicates, count stays same

---

### Edge Case 2: Partial Enrichment

**Test**: Cancel enrichment midway

**Expected**:
- Enriched bookings saved to DB
- Unenriched bookings remain in DB without revenue
- No errors

---

### Edge Case 3: Large Dataset

**Test**: Load 500+ bookings

**Expected**:
- All save successfully
- Performance acceptable (< 5 seconds)
- UI remains responsive

---

### Edge Case 4: Network Interruption

**Test**: Disable network during save

**Expected**:
- Console shows error
- State is still updated (user sees data)
- Can retry save later

---

## Performance Benchmarks

### Expected Performance

| Operation | Target Time | Acceptable Range |
|-----------|-------------|------------------|
| Connection check | < 1s | 0.5s - 2s |
| Save 100 bookings | < 2s | 1s - 5s |
| Load 100 bookings | < 2s | 1s - 5s |
| Enrichment (per booking) | ~100ms | 50ms - 200ms |
| Page refresh → Load | < 3s | 2s - 5s |

---

## Common Issues & Solutions

### Issue 1: "Database connection failed"

**Solution**:
- Check .env has correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Restart dev server after adding .env
- Verify Supabase project is not paused

---

### Issue 2: "Hostel not found"

**Solution**:
- Run migration again to seed hostels
- Or manually run:
  ```sql
  SELECT * FROM hostels;
  ```
- Should show 11 hostels

---

### Issue 3: Slow database operations

**Solution**:
- Check network latency to Supabase
- Verify indexes exist (see migration)
- Consider upgrading Supabase plan if on free tier with high usage

---

### Issue 4: Data not loading after refresh

**Solution**:
- Click "Load Last 3 Months from Database" button
- Or: Data may be older than 3 months (adjust date range)
- Check console for errors

---

## Success Criteria

After completing all tests, you should have:

✅ Database connection working
✅ Auto-save working for all 3 data sources (API, Excel, paste)
✅ Revenue enrichment updating database
✅ Load from database working (persistence)
✅ Multi-hostel support confirmed
✅ Audit trail populated
✅ Error handling graceful
✅ UI status indicator accurate
✅ No duplicate bookings
✅ Performance acceptable

---

## Reporting Issues

If you encounter issues:

1. Check console for error messages
2. Check Supabase dashboard for data
3. Verify migration ran completely
4. Check .env configuration
5. Report issue with:
   - Steps to reproduce
   - Console error messages
   - Supabase table state
   - Browser and OS info

---

**Last Updated**: January 16, 2026
**Phase**: 5 - Testing & Edge Cases
**Status**: Ready for testing
