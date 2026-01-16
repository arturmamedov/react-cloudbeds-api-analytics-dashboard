# Database Integration Guide

## Overview

This guide shows how to integrate the Supabase database layer into `HostelAnalytics.jsx` and other components. The integration follows the project's principle of "incremental improvements, not rewrites" - we'll add database functionality without breaking existing code.

## Integration Strategy

### Phase 1: Add Database Save (Non-Breaking)
- Keep existing in-memory state (`weeklyData`)
- Add "Save to Database" button
- Save data after processing (API fetch, Excel upload, paste)
- Dashboard continues to work from state (no changes to display logic)

### Phase 2: Add Database Load (Optional)
- Add "Load from Database" button
- Load historical data from database
- Merge with in-memory state
- Dashboard displays combined data

### Phase 3: Optimize with Pre-calculated Reports (Future)
- Load `weekly_reports` for fast rendering
- Option to recalculate from raw `reservations`
- Real-time updates via Supabase subscriptions

## Step 1: Install Dependencies

```bash
npm install @supabase/supabase-js
```

## Step 2: Add Database State to HostelAnalytics.jsx

Add new state variables to track database operations:

```javascript
// Add to existing state variables in HostelAnalytics.jsx
const [isSupabaseEnabled, setIsSupabaseEnabled] = useState(false);
const [isSavingToDB, setIsSavingToDB] = useState(false);
const [isLoadingFromDB, setIsLoadingFromDB] = useState(false);
const [dbStatus, setDbStatus] = useState(null); // { type: 'success' | 'error', message: string }
```

## Step 3: Check Supabase Configuration on Mount

```javascript
import { isSupabaseConfigured, testConnection } from './config/supabaseClient';
import { seedHostelsFromConfig } from './utils/dbUtils';

// Add useEffect to check Supabase config
useEffect(() => {
  const checkSupabase = async () => {
    if (isSupabaseConfigured()) {
      const result = await testConnection();
      if (result.success) {
        setIsSupabaseEnabled(true);

        // Seed hostels from config (only runs once)
        await seedHostelsFromConfig();

        setDbStatus({ type: 'success', message: 'Database connected' });
      } else {
        setDbStatus({ type: 'error', message: `Database error: ${result.message}` });
      }
    }
  };

  checkSupabase();
}, []);
```

## Step 4: Add Database Save Functions

Add these functions to `HostelAnalytics.jsx`:

```javascript
import {
  saveReservations,
  saveWeeklyReport,
  createDataImport
} from './utils/dbUtils';

/**
 * Save current weeklyData to database
 * Saves both raw reservations and pre-calculated weekly reports
 */
const saveToDatabase = async () => {
  if (!isSupabaseEnabled) {
    alert('Database is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env');
    return;
  }

  setIsSavingToDB(true);
  setDbStatus({ type: 'info', message: 'Saving to database...' });

  try {
    let totalReservationsSaved = 0;
    let totalReportsSaved = 0;

    // Save reservations and weekly reports for each week and hostel
    for (const week of weeklyData) {
      for (const [hostelSlug, metrics] of Object.entries(week.hostels)) {
        // 1. Save raw reservations
        if (metrics.bookings && metrics.bookings.length > 0) {
          const result = await saveReservations(
            metrics.bookings,
            hostelSlug.toLowerCase(),
            'api' // or 'excel', 'paste' depending on source
          );

          if (result.success) {
            totalReservationsSaved += result.stats.saved;
          } else {
            console.error(`Failed to save reservations for ${hostelSlug}:`, result.error);
          }
        }

        // 2. Save weekly report (pre-calculated metrics)
        const reportResult = await saveWeeklyReport({
          hostelSlug: hostelSlug.toLowerCase(),
          weekStart: week.date.toISOString().split('T')[0],
          weekEnd: new Date(week.date.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          weekLabel: week.week,
          metrics: metrics,
          wowChanges: {}, // Calculate if needed
        });

        if (reportResult.success) {
          totalReportsSaved++;
        }
      }
    }

    // 3. Create data import record (audit trail)
    await createDataImport({
      importType: 'manual', // or 'api', 'excel', 'paste'
      importSource: 'HostelAnalytics Dashboard',
      dateFrom: weeklyData[0]?.date,
      dateTo: weeklyData[weeklyData.length - 1]?.date,
      reservationsCount: totalReservationsSaved,
      hostelsAffected: Object.keys(weeklyData[0]?.hostels || {}),
      status: 'completed',
    });

    setDbStatus({
      type: 'success',
      message: `Saved ${totalReservationsSaved} reservations and ${totalReportsSaved} weekly reports`,
    });
  } catch (error) {
    console.error('Error saving to database:', error);
    setDbStatus({ type: 'error', message: `Save failed: ${error.message}` });
  } finally {
    setIsSavingToDB(false);
  }
};
```

## Step 5: Add Database Load Functions

```javascript
import {
  getReservationsByDateRange,
  getAllWeeklyReports,
  transformDBReservationToApp,
  transformDBWeeklyReportToApp
} from './utils/dbUtils';

/**
 * Load data from database and merge with existing weeklyData
 */
const loadFromDatabase = async (startDate, endDate) => {
  if (!isSupabaseEnabled) {
    alert('Database is not configured');
    return;
  }

  setIsLoadingFromDB(true);
  setDbStatus({ type: 'info', message: 'Loading from database...' });

  try {
    // Option 1: Load pre-calculated weekly reports (fast)
    const reportsResult = await getAllWeeklyReports();

    if (reportsResult.success && reportsResult.data.length > 0) {
      // Transform DB reports to app format
      const loadedWeeklyData = reportsResult.data.map(transformDBWeeklyReportToApp);

      // Merge with existing weeklyData (or replace)
      setWeeklyData(loadedWeeklyData);

      setDbStatus({
        type: 'success',
        message: `Loaded ${reportsResult.data.length} weekly reports`,
      });
    } else {
      // Option 2: Load raw reservations and recalculate (slower but more flexible)
      const reservationsResult = await getReservationsByDateRange(startDate, endDate);

      if (reservationsResult.success && reservationsResult.data.length > 0) {
        // Transform DB reservations to app format
        const loadedReservations = reservationsResult.data.map(transformDBReservationToApp);

        // Group by week and hostel (reuse existing logic)
        // This would call your existing data processing functions
        // For now, just show count
        setDbStatus({
          type: 'success',
          message: `Loaded ${reservationsResult.data.length} reservations from database`,
        });
      } else {
        setDbStatus({ type: 'info', message: 'No data found in database' });
      }
    }
  } catch (error) {
    console.error('Error loading from database:', error);
    setDbStatus({ type: 'error', message: `Load failed: ${error.message}` });
  } finally {
    setIsLoadingFromDB(false);
  }
};
```

## Step 6: Auto-Save After Data Processing

Modify existing data processing functions to auto-save:

### After API Fetch

```javascript
// In handleAPIFetch() or similar function
const handleAPIFetch = async (propertyId, startDate, endDate) => {
  setIsFetching(true);

  try {
    // Existing API fetch logic...
    const bookings = await fetchBookingsFromAPI(propertyId, startDate, endDate);

    // Existing state update...
    // processAndSetWeeklyData(bookings);

    // NEW: Auto-save to database
    if (isSupabaseEnabled) {
      const hostelSlug = getHostelSlugById(propertyId); // Helper to get slug from ID
      await saveReservations(bookings, hostelSlug, 'api');
    }
  } catch (error) {
    console.error('API fetch error:', error);
  } finally {
    setIsFetching(false);
  }
};
```

### After Excel Upload

```javascript
// In processFiles() function
const processFiles = async (files) => {
  setIsUploading(true);

  try {
    // Existing Excel processing logic...
    const parsedData = await parseExcelFiles(files);

    // Existing state update...
    // processAndSetWeeklyData(parsedData);

    // NEW: Auto-save to database
    if (isSupabaseEnabled) {
      for (const [hostelSlug, bookings] of Object.entries(parsedData)) {
        await saveReservations(bookings, hostelSlug, 'excel');
      }
    }
  } catch (error) {
    console.error('Excel processing error:', error);
  } finally {
    setIsUploading(false);
  }
};
```

### After Revenue Enrichment

```javascript
import { updateReservationRevenue } from './utils/dbUtils';

// In enrichBookingRevenue() or after enrichment completes
const handleEnrichmentComplete = async (enrichedBookings) => {
  // Update database with enriched revenue
  if (isSupabaseEnabled) {
    for (const booking of enrichedBookings) {
      await updateReservationRevenue(booking.reservationID, {
        total: booking.total,
        netPrice: booking.netPrice,
        taxes: booking.taxes,
      });
    }
  }
};
```

## Step 7: Add UI Components

Add database control buttons to your UI:

```jsx
{/* Add to DataInputPanel or main component */}
{isSupabaseEnabled && (
  <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 space-y-3">
    <h3 className="font-semibold text-teal-900 flex items-center gap-2">
      <Database className="w-5 h-5" />
      Database Operations
    </h3>

    {/* Status Message */}
    {dbStatus && (
      <div
        className={`text-sm px-3 py-2 rounded ${
          dbStatus.type === 'success'
            ? 'bg-green-100 text-green-800'
            : dbStatus.type === 'error'
            ? 'bg-red-100 text-red-800'
            : 'bg-blue-100 text-blue-800'
        }`}
      >
        {dbStatus.message}
      </div>
    )}

    {/* Buttons */}
    <div className="flex gap-2">
      <button
        onClick={saveToDatabase}
        disabled={isSavingToDB || weeklyData.length === 0}
        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSavingToDB ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save to Database
          </>
        )}
      </button>

      <button
        onClick={() => loadFromDatabase(new Date('2024-01-01'), new Date())}
        disabled={isLoadingFromDB}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoadingFromDB ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Load from Database
          </>
        )}
      </button>
    </div>
  </div>
)}
```

## Step 8: Add Icons Import

Make sure you have the necessary Lucide icons imported:

```javascript
import { Database, Save, Download, Loader } from 'lucide-react';
```

## Step 9: Testing

### Test Database Save
1. Fetch data from API or upload Excel file
2. Click "Save to Database"
3. Check Supabase dashboard → Table Editor → `reservations` and `weekly_reports`
4. Verify data was saved correctly

### Test Database Load
1. Click "Load from Database"
2. Verify weeklyData state is populated
3. Check dashboard displays loaded data correctly

### Test Auto-Save
1. Fetch new data from API
2. Check database automatically saved without clicking button
3. Verify no duplicate reservations (upsert should work)

## Step 10: Optional Enhancements

### Add Automatic Background Sync

```javascript
// Auto-save whenever weeklyData changes (debounced)
useEffect(() => {
  if (!isSupabaseEnabled || weeklyData.length === 0) return;

  const timeoutId = setTimeout(() => {
    saveToDatabase();
  }, 2000); // Debounce: save 2 seconds after last change

  return () => clearTimeout(timeoutId);
}, [weeklyData, isSupabaseEnabled]);
```

### Add Real-time Subscriptions (Multi-user Support)

```javascript
import { supabase } from './config/supabaseClient';

// Subscribe to real-time changes
useEffect(() => {
  if (!isSupabaseEnabled) return;

  const subscription = supabase
    .channel('reservations-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reservations' },
      (payload) => {
        console.log('Database changed:', payload);
        // Reload data or update state
        loadFromDatabase(/* ... */);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [isSupabaseEnabled]);
```

### Add Loading States to Dashboard

```jsx
{isLoadingFromDB && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 flex items-center gap-3">
      <Loader className="w-6 h-6 animate-spin text-teal-600" />
      <span className="text-lg">Loading data from database...</span>
    </div>
  </div>
)}
```

## Migration Path

### Current State (No Database)
```
User Input → Parse → Calculate Metrics → State → Render
```

### Phase 1 (Database Save Only)
```
User Input → Parse → Calculate Metrics → State → Render
                                           ↓
                                      Save to DB
```

### Phase 2 (Database Save + Load)
```
User Input → Parse → Calculate Metrics → State → Render
    ↓                                      ↓
Load from DB ──────────────────────────> Save to DB
```

### Phase 3 (Database-First)
```
User Input → Parse → Save to DB
                         ↓
              Load Weekly Reports → State → Render
```

## Troubleshooting

### "Database is not configured" Error
- Check `.env` file has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart dev server after adding environment variables

### "Hostel not found" Error
- Run `seedHostelsFromConfig()` to ensure hostels exist in database
- Check hostel slug matches config (lowercase)

### Duplicate Reservations
- `saveReservations()` uses upsert, should not create duplicates
- Check `cloudbeds_reservation_id` is unique
- Verify constraint in database: `UNIQUE(cloudbeds_reservation_id)`

### Slow Performance
- Use `weekly_reports` table for dashboard (pre-calculated)
- Only load `reservations` when needed (detailed view, recalculation)
- Add indexes for frequently queried fields

## Next Steps

1. ✅ Database layer is ready
2. ✅ Integration functions are created
3. ⏭️ Add database state to HostelAnalytics.jsx
4. ⏭️ Add UI buttons for save/load
5. ⏭️ Test with real data
6. ⏭️ Deploy to production

## Example: Complete Integration in HostelAnalytics.jsx

Here's a minimal example showing the key changes:

```javascript
import { useState, useEffect } from 'react';
import { isSupabaseConfigured, testConnection } from './config/supabaseClient';
import { saveReservations, getAllWeeklyReports, seedHostelsFromConfig } from './utils/dbUtils';

function HostelAnalytics() {
  // Existing state
  const [weeklyData, setWeeklyData] = useState([]);

  // NEW: Database state
  const [isSupabaseEnabled, setIsSupabaseEnabled] = useState(false);
  const [isSavingToDB, setIsSavingToDB] = useState(false);
  const [dbStatus, setDbStatus] = useState(null);

  // NEW: Check Supabase on mount
  useEffect(() => {
    const checkSupabase = async () => {
      if (isSupabaseConfigured()) {
        const result = await testConnection();
        if (result.success) {
          setIsSupabaseEnabled(true);
          await seedHostelsFromConfig();
          setDbStatus({ type: 'success', message: 'Database connected' });
        }
      }
    };
    checkSupabase();
  }, []);

  // NEW: Save to database function
  const saveToDatabase = async () => {
    setIsSavingToDB(true);
    try {
      // Save logic here (see Step 4 above)
      setDbStatus({ type: 'success', message: 'Data saved successfully' });
    } catch (error) {
      setDbStatus({ type: 'error', message: error.message });
    } finally {
      setIsSavingToDB(false);
    }
  };

  return (
    <div>
      {/* Existing UI */}

      {/* NEW: Database controls */}
      {isSupabaseEnabled && (
        <button onClick={saveToDatabase} disabled={isSavingToDB}>
          Save to Database
        </button>
      )}
    </div>
  );
}
```

---

**Last Updated**: January 16, 2026
**Maintained By**: Claude AI + Artur Mamedov
