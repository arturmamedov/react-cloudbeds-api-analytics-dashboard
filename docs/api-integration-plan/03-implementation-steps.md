# CloudBeds API Integration - Implementation Steps

## 📋 Implementation Phases

This document provides **step-by-step instructions** for implementing CloudBeds API integration. Each phase is designed to be **incremental, testable, and reversible**.

---

## 🎯 Phase 1: API Core & Environment Setup

**Goal**: Set up API credentials and build core fetching logic (no UI yet)

**Duration**: 2-3 hours

**Files Created**: 2 (`.env`, `cloudbedsApi.js`)

### Step 1.1: Create Environment Configuration

**Action**: Create `.env` file in project root

```bash
# Navigate to project root
cd /home/user/react-booking-analytics-dashboard

# Create .env file
touch .env
```

**Content**:
```bash
# CloudBeds API Configuration
VITE_CLOUDBEDS_API_KEY=your_api_key_here
VITE_CLOUDBEDS_CLIENT_SECRET=your_client_secret_here

# API Base URL (v1.3)
VITE_CLOUDBEDS_API_BASE_URL=https://api.cloudbeds.com/api/v1.3

# Optional: Timeout in milliseconds
VITE_CLOUDBEDS_API_TIMEOUT=10000
```

**Replace placeholders** with real credentials from CloudBeds Connect.

### Step 1.2: Verify .gitignore

**Action**: Ensure `.env` is ignored by git

```bash
# Check if .env is in .gitignore
grep "\.env" .gitignore

# If not found, add it
echo ".env" >> .gitignore
```

**Test**:
```bash
git status  # .env should NOT appear in untracked files
```

### Step 1.3: Create API Utility File

**Action**: Create `src/utils/cloudbedsApi.js`

**Implementation Order**:

1. **Add imports and constants**:
```javascript
// src/utils/cloudbedsApi.js

/**
 * CloudBeds API Integration Utility
 *
 * Provides functions to fetch reservation data from CloudBeds API v1.3
 * and transform it to the internal booking format used by the dashboard.
 *
 * Authentication: Bearer token (from .env)
 * Endpoint: GET /getReservations
 * Filters: Only "Website/Booking Engine" source
 */

// API configuration from environment variables
const API_KEY = import.meta.env.VITE_CLOUDBEDS_API_KEY;
const BASE_URL = import.meta.env.VITE_CLOUDBEDS_API_BASE_URL || 'https://api.cloudbeds.com/api/v1.3';
const TIMEOUT = parseInt(import.meta.env.VITE_CLOUDBEDS_API_TIMEOUT) || 10000;
```

2. **Add helper functions** (internal, not exported):

```javascript
/**
 * Format date string to CloudBeds API datetime format
 * @param {string} date - "YYYY-MM-DD"
 * @param {boolean} isEndDate - If true, adds "23:59:59", else "00:00:00"
 * @returns {string} "YYYY-MM-DD HH:MM:SS"
 */
const formatDateTimeForAPI = (date, isEndDate = false) => {
  const time = isEndDate ? '23:59:59' : '00:00:00';
  return `${date} ${time}`;
};

/**
 * Calculate nights between two dates
 * @param {string} startDate - "YYYY-MM-DD"
 * @param {string} endDate - "YYYY-MM-DD"
 * @returns {number} Number of nights
 */
const calculateNights = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);  // Ensure non-negative
};

/**
 * Calculate lead time (days between booking and check-in)
 * @param {string} bookingDateTime - "YYYY-MM-DD HH:MM:SS"
 * @param {string} checkinDate - "YYYY-MM-DD"
 * @returns {number} Lead time in days (can be negative for same-day bookings)
 */
const calculateLeadTime = (bookingDateTime, checkinDate) => {
  const bookingDate = new Date(bookingDateTime.split(' ')[0]);  // Extract date only
  const checkin = new Date(checkinDate);
  const diffTime = checkin - bookingDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Transform CloudBeds reservation object to internal booking format
 * @param {object} cbReservation - CloudBeds reservation object
 * @returns {object|null} Booking object in internal format, or null if invalid
 */
const transformReservation = (cbReservation) => {
  try {
    // Extract date from "YYYY-MM-DD HH:MM:SS" format
    const bookingDate = cbReservation.dateCreated.split(' ')[0];

    // Calculate nights and lead time
    const nights = calculateNights(cbReservation.startDate, cbReservation.endDate);
    const leadTime = calculateLeadTime(cbReservation.dateCreated, cbReservation.startDate);

    return {
      reservation: cbReservation.reservationID,
      bookingDate: bookingDate,
      checkin: cbReservation.startDate,
      checkout: cbReservation.endDate,
      nights: nights,
      price: parseFloat(cbReservation.balance) || 0,  // Handle null/undefined/string
      status: cbReservation.status,
      source: cbReservation.sourceName,
      leadTime: leadTime
    };
  } catch (error) {
    console.error('Error transforming reservation:', cbReservation, error);
    return null;  // Skip malformed reservations
  }
};
```

3. **Add main export function**:

```javascript
/**
 * Fetch reservations from CloudBeds API for a specific property and date range
 *
 * @param {string} propertyID - CloudBeds property ID (e.g., "6733" for Flamingo)
 * @param {string} startDate - Start date in "YYYY-MM-DD" format
 * @param {string} endDate - End date in "YYYY-MM-DD" format
 * @returns {Promise<Array>} Array of transformed booking objects (direct bookings only)
 * @throws {Error} Network errors, auth errors, API errors, timeout
 *
 * @example
 * const bookings = await fetchReservationsFromCloudBeds("6733", "2026-01-05", "2026-01-11");
 * // Returns: [{ reservation, bookingDate, checkin, checkout, nights, price, status, source, leadTime }, ...]
 */
export const fetchReservationsFromCloudBeds = async (propertyID, startDate, endDate) => {
  // 1. Validate API key
  if (!API_KEY) {
    throw new Error('CloudBeds API key not found. Please check your .env file and restart the dev server.');
  }

  // 2. Format dates for API (add timestamps)
  const resultsFrom = formatDateTimeForAPI(startDate, false);  // "2026-01-05 00:00:00"
  const resultsTo = formatDateTimeForAPI(endDate, true);       // "2026-01-11 23:59:59"

  // 3. Build API URL with query parameters
  const url = `${BASE_URL}/getReservations?propertyID=${propertyID}&resultsFrom=${encodeURIComponent(resultsFrom)}&resultsTo=${encodeURIComponent(resultsTo)}`;

  console.log(`[CloudBeds API] Fetching property ${propertyID} from ${startDate} to ${endDate}`);

  // 4. Make HTTP request with timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // 5. Handle HTTP errors
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid API key. Please check your .env file.');
      }
      if (response.status === 404) {
        throw new Error(`Property ID ${propertyID} not found. Check hostelConfig.js.`);
      }
      throw new Error(`CloudBeds API error: ${response.status} ${response.statusText}`);
    }

    // 6. Parse JSON response
    const data = await response.json();

    console.log(`[CloudBeds API] Received ${data.count} reservations`);

    // 7. Validate response structure
    if (!data || !data.success) {
      throw new Error('Invalid response from CloudBeds API. API may have changed.');
    }

    // 8. Handle empty results (not an error)
    if (!data.data || data.data.length === 0) {
      console.log('[CloudBeds API] No reservations found in date range');
      return [];
    }

    // 9. Transform each reservation
    const bookings = data.data
      .map(transformReservation)
      .filter(booking => booking !== null);  // Remove invalid bookings

    console.log(`[CloudBeds API] Transformed ${bookings.length} valid bookings`);

    // 10. Filter for direct bookings (Website source)
    const directBookings = bookings.filter(b =>
      b.source && b.source.toLowerCase().includes('website')
    );

    console.log(`[CloudBeds API] Filtered to ${directBookings.length} direct bookings`);

    return directBookings;

  } catch (error) {
    // Handle specific error types
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. CloudBeds API is taking too long to respond. Try again.');
    }
    if (error instanceof TypeError) {
      throw new Error('Network error. Please check your internet connection.');
    }
    // Re-throw other errors
    throw error;
  }
};
```

### Step 1.4: Test API Utility in Console

**Action**: Test `fetchReservationsFromCloudBeds()` directly in browser console

**Start dev server**:
```bash
npm run dev
```

**Open browser console** (Chrome DevTools: F12 → Console tab)

**Test 1: Successful fetch**:
```javascript
// Import the function (if you have a way to access it in console)
// Or add temporary test code in HostelAnalytics.jsx:

import { fetchReservationsFromCloudBeds } from './utils/cloudbedsApi';

// Add this in useEffect for testing:
useEffect(() => {
  const testAPI = async () => {
    try {
      const bookings = await fetchReservationsFromCloudBeds("6733", "2026-01-05", "2026-01-11");
      console.log('✅ API Test Success:', bookings);
      console.log(`Found ${bookings.length} direct bookings`);
    } catch (error) {
      console.error('❌ API Test Failed:', error.message);
    }
  };

  // Uncomment to test:
  // testAPI();
}, []);
```

**Expected Output**:
```
[CloudBeds API] Fetching property 6733 from 2026-01-05 to 2026-01-11
[CloudBeds API] Received 15 reservations
[CloudBeds API] Transformed 15 valid bookings
[CloudBeds API] Filtered to 3 direct bookings
✅ API Test Success: (3) [{...}, {...}, {...}]
```

**Test 2: Invalid API key** (temporarily break API key):
```javascript
// In .env, change API key to "invalid"
// Restart server
// Run test again

// Expected: ❌ API Test Failed: Invalid API key. Please check your .env file.
```

**Test 3: Empty date range**:
```javascript
const bookings = await fetchReservationsFromCloudBeds("6733", "2020-01-01", "2020-01-02");
console.log('Empty result:', bookings);  // Expected: []
```

### Step 1.5: Commit Phase 1

**Action**: Commit changes

```bash
git add .env.example  # Create example file without real credentials
git add .gitignore
git add src/utils/cloudbedsApi.js
git commit -m "feat(api): add CloudBeds API utility with Bearer auth

- Create cloudbedsApi.js with fetchReservationsFromCloudBeds()
- Transform CloudBeds JSON to internal booking format
- Filter for direct bookings (sourceName contains 'website')
- Calculate nights and lead time
- Handle errors: network, auth, timeout, empty response
- Add comprehensive logging for debugging

Tested with property 6733 (Flamingo) - working correctly"
```

---

## 🎨 Phase 2: Single Hostel UI

**Goal**: Create UI component for fetching single hostel data

**Duration**: 2 hours

**Files Created**: 1 (`APIFetchPanel.jsx`)

**Files Modified**: 2 (`DataInputPanel.jsx`, `HostelAnalytics.jsx`)

### Step 2.1: Create Basic APIFetchPanel Component

**Action**: Create `src/components/DataInput/APIFetchPanel.jsx`

**Start with minimal implementation**:

```javascript
import React, { useState, useCallback } from 'react';
import { Loader, Download } from 'lucide-react';
import WeekSelector from './WeekSelector';
import { hostelConfig } from '../../config/hostelConfig';

const APIFetchPanel = ({
  selectedWeekStart,
  setSelectedWeekStart,
  onFetchStart,
  isUploading
}) => {
  const [selectedHostel, setSelectedHostel] = useState(null);
  const hostelList = Object.keys(hostelConfig);

  const handleFetch = () => {
    if (!selectedHostel || !selectedWeekStart) return;

    onFetchStart({
      mode: 'single',
      hostelName: selectedHostel,
      weekStart: selectedWeekStart
    });
  };

  return (
    <div className="space-y-4 p-4 border-2 border-teal rounded-lg">
      {/* Week Selector */}
      <div>
        <label className="block text-sm font-medium mb-2">Select Week</label>
        <WeekSelector
          selectedWeekStart={selectedWeekStart}
          setSelectedWeekStart={setSelectedWeekStart}
        />
      </div>

      {/* Hostel Dropdown */}
      <div>
        <label className="block text-sm font-medium mb-2">Select Hostel</label>
        <select
          value={selectedHostel || ''}
          onChange={(e) => setSelectedHostel(e.target.value)}
          disabled={isUploading}
          className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-teal"
        >
          <option value="">Choose a hostel...</option>
          {hostelList.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* Fetch Button */}
      <button
        onClick={handleFetch}
        disabled={isUploading || !selectedWeekStart || !selectedHostel}
        className="w-full bg-teal hover:bg-teal-dark text-white px-6 py-3 rounded flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            Fetching from CloudBeds...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Fetch from CloudBeds
          </>
        )}
      </button>
    </div>
  );
};

export default APIFetchPanel;
```

### Step 2.2: Add API Panel to DataInputPanel

**Action**: Modify `src/components/DataInput/DataInputPanel.jsx`

**Changes**:

1. Import new component:
```javascript
import APIFetchPanel from './APIFetchPanel';
```

2. Add API button to input method selector:
```jsx
{/* Existing buttons... */}

{/* NEW: API Button */}
<button
  onClick={() => setInputMethod('api')}
  className={`flex items-center gap-2 px-6 py-3 rounded transition ${
    inputMethod === 'api'
      ? 'bg-teal text-white'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`}
>
  <Download className="w-5 h-5" />
  CloudBeds API
</button>
```

3. Add conditional rendering:
```jsx
{/* Existing sections... */}

{/* NEW: API Panel */}
{inputMethod === 'api' && (
  <APIFetchPanel
    selectedWeekStart={selectedWeekStart}
    setSelectedWeekStart={setSelectedWeekStart}
    onFetchStart={onAPIFetchStart}
    isUploading={isUploading}
  />
)}
```

### Step 2.3: Add API Handlers to HostelAnalytics

**Action**: Modify `src/components/HostelAnalytics.jsx`

**Add imports**:
```javascript
import { fetchReservationsFromCloudBeds } from '../utils/cloudbedsApi';
import { hostelConfig } from '../config/hostelConfig';
import { calculateHostelMetrics } from '../utils/metricsCalculator';
```

**Add handler function**:
```javascript
/**
 * Handle API fetch (single hostel mode)
 */
const handleAPIFetchStart = useCallback(async ({ mode, hostelName, weekStart }) => {
  if (mode !== 'single') return;  // Phase 2: Only single mode

  setIsUploading(true);

  try {
    console.log(`Fetching ${hostelName} for week starting ${weekStart}`);

    // Get property ID from config
    const propertyID = hostelConfig[hostelName].id;

    // Calculate week date range (Mon-Sun)
    const startDate = formatDateForAPI(weekStart);
    const endDate = formatDateForAPI(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000));  // +6 days

    // Fetch from CloudBeds API
    const bookings = await fetchReservationsFromCloudBeds(propertyID, startDate, endDate);

    console.log(`Fetched ${bookings.length} bookings for ${hostelName}`);

    // Calculate metrics (reuse existing function!)
    const metrics = calculateHostelMetrics(bookings);

    console.log('Calculated metrics:', metrics);

    // Create week data structure
    const weekData = {
      week: formatWeekRange(weekStart),
      date: weekStart,
      hostels: {
        [hostelName]: metrics
      }
    };

    // Update state (simple add for now, smart merge in Phase 5)
    setWeeklyData(prev => {
      // Remove existing week if present
      const filtered = prev.filter(w => w.week !== weekData.week);
      return [...filtered, weekData].sort((a, b) => a.date - b.date);
    });

    setIsUploading(false);
    alert(`✅ Successfully fetched ${metrics.count} bookings for ${hostelName}`);

  } catch (error) {
    console.error('API fetch error:', error);
    setIsUploading(false);
    alert(`❌ Error: ${error.message}`);
  }
}, [weeklyData]);

// Helper: Format Date object to "YYYY-MM-DD"
const formatDateForAPI = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```

**Pass handler to DataInputPanel**:
```jsx
<DataInputPanel
  {/* existing props */}
  onAPIFetchStart={handleAPIFetchStart}  // NEW
/>
```

### Step 2.4: Test Single Hostel Fetch

**Manual Testing**:

1. Start dev server: `npm run dev`
2. Open app in browser
3. Click "CloudBeds API" tab
4. Select week (e.g., "06 Jan 2026 - 12 Jan 2026")
5. Select hostel (e.g., "Flamingo")
6. Click "Fetch from CloudBeds"
7. Wait for loading spinner
8. Verify:
   - ✅ Success alert appears
   - ✅ Dashboard shows Flamingo data
   - ✅ Metrics are correct (count, revenue, ADR, etc.)
   - ✅ Console logs show API calls

**Test Edge Cases**:
- Empty date range → Should return 0 bookings
- Invalid week → Should handle gracefully
- Disabled button when no hostel selected

### Step 2.5: Commit Phase 2

```bash
git add src/components/DataInput/APIFetchPanel.jsx
git add src/components/DataInput/DataInputPanel.jsx
git add src/components/HostelAnalytics.jsx
git commit -m "feat(api): add single hostel fetch UI

- Create APIFetchPanel component with week selector and hostel dropdown
- Add CloudBeds API tab to DataInputPanel
- Implement handleAPIFetchStart in HostelAnalytics
- Reuse existing calculateHostelMetrics() function
- Display fetched data in dashboard

Tested with Flamingo (property 6733) - working correctly"
```

---

## 🔄 Phase 3: Multi-Hostel Fetching

**Goal**: Add "Fetch All Hostels" mode with sequential API calls

**Duration**: 2-3 hours

**Files Modified**: 2 (`APIFetchPanel.jsx`, `HostelAnalytics.jsx`)

### Step 3.1: Add Fetch Mode Toggle to APIFetchPanel

**Action**: Modify `APIFetchPanel.jsx`

**Add state**:
```javascript
const [fetchMode, setFetchMode] = useState('all');  // 'all' | 'single'
```

**Add toggle UI** (before hostel dropdown):
```jsx
<div className="space-y-2">
  <label className="block text-sm font-medium">Fetch Mode</label>
  <div className="grid grid-cols-2 gap-2">
    <button
      onClick={() => setFetchMode('all')}
      disabled={isUploading}
      className={`px-4 py-2 rounded transition ${
        fetchMode === 'all'
          ? 'bg-teal text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      All Hostels (11)
    </button>
    <button
      onClick={() => setFetchMode('single')}
      disabled={isUploading}
      className={`px-4 py-2 rounded transition ${
        fetchMode === 'single'
          ? 'bg-teal text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      Single Hostel
    </button>
  </div>
</div>
```

**Conditional hostel dropdown** (only show in single mode):
```jsx
{fetchMode === 'single' && (
  <div>
    <label className="block text-sm font-medium mb-2">Select Hostel</label>
    {/* dropdown code */}
  </div>
)}
```

**Update handleFetch**:
```javascript
const handleFetch = () => {
  onFetchStart({
    mode: fetchMode,  // 'all' or 'single'
    hostelName: fetchMode === 'single' ? selectedHostel : null,
    weekStart: selectedWeekStart
  });
};
```

### Step 3.2: Implement Multi-Hostel Handler in HostelAnalytics

**Action**: Modify `HostelAnalytics.jsx`

**Update handleAPIFetchStart** to support both modes:

```javascript
const handleAPIFetchStart = useCallback(async ({ mode, hostelName, weekStart }) => {
  setIsUploading(true);

  try {
    if (mode === 'single') {
      await fetchSingleHostel(hostelName, weekStart);
    } else if (mode === 'all') {
      await fetchAllHostels(weekStart);
    }

    setIsUploading(false);

  } catch (error) {
    console.error('API fetch error:', error);
    setIsUploading(false);
    alert(`❌ Error: ${error.message}`);
  }
}, []);

// Extract single hostel logic
const fetchSingleHostel = async (hostelName, weekStart) => {
  const propertyID = hostelConfig[hostelName].id;
  const { startDate, endDate } = getWeekDateRange(weekStart);

  const bookings = await fetchReservationsFromCloudBeds(propertyID, startDate, endDate);
  const metrics = calculateHostelMetrics(bookings);

  updateWeekData(weekStart, { [hostelName]: metrics });

  alert(`✅ ${hostelName}: ${metrics.count} bookings fetched`);
};

// NEW: Multi-hostel fetch logic
const fetchAllHostels = async (weekStart) => {
  const hostelList = Object.keys(hostelConfig);
  const results = {};
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < hostelList.length; i++) {
    const hostelName = hostelList[i];

    try {
      console.log(`[${i + 1}/11] Fetching ${hostelName}...`);

      const propertyID = hostelConfig[hostelName].id;
      const { startDate, endDate } = getWeekDateRange(weekStart);

      const bookings = await fetchReservationsFromCloudBeds(propertyID, startDate, endDate);
      const metrics = calculateHostelMetrics(bookings);

      results[hostelName] = metrics;
      successCount++;

      console.log(`✅ ${hostelName}: ${metrics.count} bookings`);

      // Small delay to avoid potential rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`❌ ${hostelName} failed:`, error.message);
      errorCount++;
      // Continue to next hostel (don't stop)
    }
  }

  // Update all successful hostels
  if (successCount > 0) {
    updateWeekData(weekStart, results);
  }

  // Show summary
  if (errorCount === 0) {
    alert(`✅ All 11 hostels fetched successfully!`);
  } else {
    alert(`⚠️ ${successCount}/11 hostels fetched. ${errorCount} failed - check console.`);
  }
};

// Helper: Get week date range (Mon-Sun)
const getWeekDateRange = (weekStart) => {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);  // Sunday

  return {
    startDate: formatDateForAPI(start),
    endDate: formatDateForAPI(end)
  };
};

// Helper: Update week data (simple version for now)
const updateWeekData = (weekStart, hostelsData) => {
  setWeeklyData(prev => {
    // Find existing week
    const existingIndex = prev.findIndex(w => isSameWeek(w.date, weekStart));

    if (existingIndex === -1) {
      // New week - create entry
      return [...prev, {
        week: formatWeekRange(weekStart),
        date: weekStart,
        hostels: hostelsData
      }].sort((a, b) => a.date - b.date);
    }

    // Update existing week
    const updated = [...prev];
    updated[existingIndex] = {
      ...updated[existingIndex],
      hostels: hostelsData
    };
    return updated;
  });
};

// Helper: Check if two dates are in the same week
const isSameWeek = (date1, date2) => {
  return formatWeekRange(date1) === formatWeekRange(date2);
};
```

### Step 3.3: Test Multi-Hostel Fetch

**Manual Testing**:

1. Select week
2. Choose "All Hostels (11)"
3. Click "Fetch from CloudBeds"
4. Monitor console logs:
   ```
   [1/11] Fetching Flamingo...
   ✅ Flamingo: 45 bookings
   [2/11] Fetching Puerto...
   ✅ Puerto: 32 bookings
   ...
   [11/11] Fetching Las Eras...
   ✅ Las Eras: 18 bookings
   ```
5. Wait ~25-35 seconds for completion
6. Verify all 11 hostels appear in dashboard

**Test Error Scenario**:
1. Temporarily break one hostel's property ID (e.g., change Flamingo to "99999")
2. Run fetch all
3. Verify:
   - ✅ Error logged for Flamingo
   - ✅ Other 10 hostels still fetch successfully
   - ✅ Summary shows "10/11 hostels fetched"

### Step 3.4: Commit Phase 3

```bash
git add src/components/DataInput/APIFetchPanel.jsx
git add src/components/HostelAnalytics.jsx
git commit -m "feat(api): add multi-hostel fetch mode

- Add fetch mode toggle (All Hostels / Single Hostel)
- Implement fetchAllHostels() with sequential API calls
- Continue fetching on error (don't stop entire process)
- Add 500ms delay between calls to avoid rate limiting
- Show success/error summary after completion

Tested with all 11 hostels - working correctly in ~30 seconds"
```

---

**(Continued in next section...)**

## 📊 Phase 4: Progress UI Enhancement

**Goal**: Add real-time progress display with timing and retry

**Duration**: 1-2 hours

**Files Modified**: 2 (`APIFetchPanel.jsx`, `HostelAnalytics.jsx`)

### Step 4.1: Add Progress State

**Action**: Add progress tracking state in `HostelAnalytics.jsx`

```javascript
const [apiFetchProgress, setApiFetchProgress] = useState(null);
// Structure:
// {
//   mode: 'all' | 'single',
//   current: 3,
//   total: 11,
//   startTime: Date.now(),
//   hostels: [
//     { name: 'Flamingo', status: 'success', bookingCount: 45, elapsedTime: 2500, error: null },
//     { name: 'Puerto', status: 'loading', bookingCount: 0, elapsedTime: 0, error: null },
//     ...
//   ]
// }
```

### Step 4.2: Update fetchAllHostels with Progress Callbacks

**Action**: Modify `fetchAllHostels()` to report progress

```javascript
const fetchAllHostels = async (weekStart) => {
  const hostelList = Object.keys(hostelConfig);

  // Initialize progress
  setApiFetchProgress({
    mode: 'all',
    current: 0,
    total: hostelList.length,
    startTime: Date.now(),
    hostels: hostelList.map(name => ({
      name,
      status: 'pending',
      bookingCount: 0,
      elapsedTime: 0,
      error: null
    }))
  });

  const results = {};

  for (let i = 0; i < hostelList.length; i++) {
    const hostelName = hostelList[i];
    const hostelStartTime = Date.now();

    // Update status to 'loading'
    setApiFetchProgress(prev => ({
      ...prev,
      current: i + 1,
      hostels: prev.hostels.map(h =>
        h.name === hostelName ? { ...h, status: 'loading' } : h
      )
    }));

    try {
      const propertyID = hostelConfig[hostelName].id;
      const { startDate, endDate } = getWeekDateRange(weekStart);

      const bookings = await fetchReservationsFromCloudBeds(propertyID, startDate, endDate);
      const metrics = calculateHostelMetrics(bookings);
      const elapsedTime = Date.now() - hostelStartTime;

      results[hostelName] = metrics;

      // Update status to 'success'
      setApiFetchProgress(prev => ({
        ...prev,
        hostels: prev.hostels.map(h =>
          h.name === hostelName
            ? { ...h, status: 'success', bookingCount: metrics.count, elapsedTime }
            : h
        )
      }));

      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      // Update status to 'error'
      setApiFetchProgress(prev => ({
        ...prev,
        hostels: prev.hostels.map(h =>
          h.name === hostelName
            ? { ...h, status: 'error', error: error.message }
            : h
        )
      }));
    }
  }

  // Update data
  if (Object.keys(results).length > 0) {
    updateWeekData(weekStart, results);
  }

  // Clear progress after 2 seconds
  setTimeout(() => setApiFetchProgress(null), 2000);
};
```

### Step 4.3: Add ProgressDisplay Component

**Action**: Add programmer-style progress UI to `APIFetchPanel.jsx`

```jsx
{isLoading && apiFetchProgress && (
  <div className="border-2 border-teal rounded-lg p-4 bg-gray-50 space-y-3">
    {/* Header */}
    <div className="text-sm font-mono text-gray-700 font-semibold">
      🔧 FETCHING DATA FROM CLOUDBEDS API...
    </div>

    {/* Progress Bar */}
    <div className="space-y-1">
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className="bg-gradient-to-r from-teal to-green h-full transition-all duration-300"
          style={{ width: `${(apiFetchProgress.current / apiFetchProgress.total) * 100}%` }}
        />
      </div>
      <div className="text-xs text-gray-600 font-mono">
        {apiFetchProgress.current}/{apiFetchProgress.total} (
        {Math.round((apiFetchProgress.current / apiFetchProgress.total) * 100)}%)
        • {Math.floor((Date.now() - apiFetchProgress.startTime) / 1000)}s elapsed
      </div>
    </div>

    {/* Hostel Status List */}
    <div className="max-h-64 overflow-y-auto space-y-1 font-mono text-xs">
      {apiFetchProgress.hostels.map((hostel) => (
        <div
          key={hostel.name}
          className={`flex items-center justify-between p-2 rounded ${
            hostel.status === 'success' ? 'bg-green-50' :
            hostel.status === 'error' ? 'bg-red-50' :
            hostel.status === 'loading' ? 'bg-blue-50' :
            'bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            {hostel.status === 'success' && <span className="text-green-600">✓</span>}
            {hostel.status === 'error' && <span className="text-red-600">✗</span>}
            {hostel.status === 'loading' && <span className="text-blue-600">⏳</span>}
            {hostel.status === 'pending' && <span className="text-gray-400">⏸</span>}
            <span className="w-28 font-medium">{hostel.name}</span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {hostel.status === 'success' && (
              <>
                <span className="text-gray-600">{hostel.bookingCount} bookings</span>
                <span className="text-gray-500">{(hostel.elapsedTime / 1000).toFixed(1)}s</span>
              </>
            )}
            {hostel.status === 'error' && (
              <span className="text-red-600">{hostel.error}</span>
            )}
            {hostel.status === 'loading' && (
              <span className="text-blue-600 animate-pulse">Fetching...</span>
            )}
            {hostel.status === 'pending' && (
              <span className="text-gray-400">Queued</span>
            )}
          </div>
        </div>
      ))}
    </div>

    {/* Summary */}
    <div className="flex items-center justify-between text-sm pt-2 border-t">
      <div className="text-gray-700 font-mono">
        ⚡ {apiFetchProgress.hostels.filter(h => h.status === 'success').length} successful,{' '}
        {apiFetchProgress.hostels.filter(h => h.status === 'error').length} failed
      </div>
    </div>
  </div>
)}
```

### Step 4.4: Test Progress UI

**Manual Testing**:
1. Start multi-hostel fetch
2. Watch real-time progress:
   - ✅ Progress bar fills smoothly
   - ✅ Elapsed time increments
   - ✅ Each hostel status updates (pending → loading → success/error)
   - ✅ Booking counts appear
   - ✅ Timing shows per hostel

### Step 4.5: Commit Phase 4

```bash
git add src/components/DataInput/APIFetchPanel.jsx
git add src/components/HostelAnalytics.jsx
git commit -m "feat(api): add real-time progress display

- Add apiFetchProgress state with status tracking
- Update fetchAllHostels to report progress per hostel
- Create programmer-style progress UI with:
  - Animated progress bar
  - Per-hostel status (pending/loading/success/error)
  - Booking counts and timing
  - Success/error summary
- Matches Nests brand design (teal/green colors)

Tested with all 11 hostels - smooth progress updates"
```

---

## ⚡ Phase 5: Data Merge Logic & Warning

**Goal**: Smart merge functionality and duplicate data warning

**Duration**: 1 hour

**Files Modified**: 2 (`APIFetchPanel.jsx`, `HostelAnalytics.jsx`)

### Step 5.1: Add Duplicate Detection

**Action**: Update `handleAPIFetchStart` in `HostelAnalytics.jsx`

```javascript
const handleAPIFetchStart = useCallback(async ({ mode, hostelName, weekStart }) => {
  // Check if week already has data
  const existingWeek = weeklyData.find(w => isSameWeek(w.date, weekStart));

  if (existingWeek) {
    // Show warning in APIFetchPanel (pass callback)
    return {
      requiresConfirmation: true,
      existingWeekData: existingWeek
    };
  }

  // No existing data - proceed
  await proceedWithFetch({ mode, hostelName, weekStart });
}, [weeklyData]);
```

### Step 5.2: Add Warning Modal

**Action**: Add warning modal to `APIFetchPanel.jsx`

```jsx
const [showWarning, setShowWarning] = useState(false);
const [existingWeekData, setExistingWeekData] = useState(null);
const [pendingFetch, setPendingFetch] = useState(null);

const handleFetch = async () => {
  const fetchParams = {
    mode: fetchMode,
    hostelName: fetchMode === 'single' ? selectedHostel : null,
    weekStart: selectedWeekStart
  };

  const result = await onFetchStart(fetchParams);

  if (result?.requiresConfirmation) {
    setExistingWeekData(result.existingWeekData);
    setPendingFetch(fetchParams);
    setShowWarning(true);
  }
};

const handleConfirmOverwrite = () => {
  setShowWarning(false);
  onFetchConfirmed(pendingFetch);  // Call confirmed fetch
  setPendingFetch(null);
};

// Warning Modal Component
{showWarning && existingWeekData && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4 shadow-xl">
      <div className="flex items-center gap-2 text-yellow">
        <AlertCircle className="w-6 h-6" />
        <h3 className="text-lg font-semibold">Week Data Already Exists</h3>
      </div>

      <div className="text-sm text-gray-700 space-y-2">
        <p><strong>Week:</strong> {existingWeekData.week}</p>
        <p><strong>Existing data contains:</strong></p>
        <ul className="list-disc list-inside pl-4">
          <li>{Object.keys(existingWeekData.hostels).length} hostels loaded</li>
          <li>
            {Object.values(existingWeekData.hostels).reduce((sum, h) => sum + h.count, 0)} total bookings
          </li>
        </ul>

        <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow rounded">
          <p className="text-sm text-gray-700">
            <strong>Smart Merge:</strong> Fetching new data will update only the hostels you fetch.
            Other hostels in this week will remain unchanged.
          </p>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => {
            setShowWarning(false);
            setPendingFetch(null);
          }}
          className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirmOverwrite}
          className="flex-1 px-4 py-2 bg-teal text-white rounded hover:bg-teal-dark transition"
        >
          Continue & Merge
        </button>
      </div>
    </div>
  </div>
)}
```

### Step 5.3: Implement Smart Merge Logic

**Action**: Update `updateWeekData` in `HostelAnalytics.jsx`

```javascript
const updateWeekData = (weekStart, newHostelsData) => {
  setWeeklyData(prev => {
    const weekIndex = prev.findIndex(w => isSameWeek(w.date, weekStart));

    if (weekIndex === -1) {
      // New week - create entry
      return [...prev, {
        week: formatWeekRange(weekStart),
        date: weekStart,
        hostels: newHostelsData
      }].sort((a, b) => a.date - b.date);
    }

    // Week exists - SMART MERGE
    const updated = [...prev];
    updated[weekIndex] = {
      ...updated[weekIndex],
      hostels: {
        ...updated[weekIndex].hostels,  // Keep existing hostels
        ...newHostelsData                // Add/update fetched hostels
      }
    };

    return updated;
  });
};
```

### Step 5.4: Test Smart Merge

**Test Scenario**:

1. Fetch Flamingo + Puerto via API for week "06 Jan"
2. Dashboard shows 2 hostels
3. Manually upload Excel file with Arena data for same week
4. Fetch Duque via API (single mode)
5. Click fetch → Warning appears
6. Confirm → Verify dashboard now shows:
   - ✅ Flamingo (from API, step 1)
   - ✅ Puerto (from API, step 1)
   - ✅ Arena (from Excel, step 3)
   - ✅ Duque (from API, step 5) ← Updated
7. Other hostels remain unchanged

### Step 5.5: Commit Phase 5

```bash
git add src/components/DataInput/APIFetchPanel.jsx
git add src/components/HostelAnalytics.jsx
git commit -m "feat(api): add smart merge and duplicate warning

- Detect existing week data before fetch
- Show warning modal with existing data summary
- Implement smart merge: update only fetched hostels, preserve others
- Add user confirmation flow (Cancel / Continue & Merge)
- Explain smart merge behavior in modal

Tested with mixed Excel + API data - working correctly"
```

---

## ✅ Phase 6: Testing, Documentation & Polish

**Goal**: Comprehensive testing, update documentation, clean up

**Duration**: 1-2 hours

**Files Modified**: Documentation files

### Step 6.1: Full Integration Testing

**Test Matrix**:

| Scenario | Expected Result | Status |
|----------|----------------|--------|
| Single hostel fetch (valid data) | ✅ Data appears in dashboard | |
| Multi-hostel fetch (all 11) | ✅ All hostels load in ~30s | |
| Empty date range | ✅ Shows "0 bookings" | |
| Invalid API key | ❌ Error: "Invalid API key" | |
| Network disconnected | ❌ Error: "Network error" | |
| Timeout (slow API) | ❌ Error: "Request timeout" | |
| Fetch same week twice | ⚠️ Warning modal appears | |
| Confirm overwrite | ✅ Data updates, smart merge works | |
| Cancel overwrite | ✅ No changes, modal closes | |
| One hostel fails (multi-fetch) | ⚠️ Continues, shows 10/11 success | |
| Excel + API mixed data | ✅ Both data sources visible | |

### Step 6.2: Update README.md

**Action**: Add API usage section (see `02-file-changes.md` for content)

### Step 6.3: Update CLAUDE.md

**Action**: Add API integration details (see `02-file-changes.md` for content)

### Step 6.4: Clean Up Console Logs

**Action**: Remove or comment temporary debug logs

```javascript
// Remove these:
console.log('Testing API...');
console.log('Fetched data:', data);

// Keep these (useful for production debugging):
console.log(`[CloudBeds API] Fetching property ${propertyID}`);
console.error('API fetch error:', error);
```

### Step 6.5: Final Commit

```bash
git add README.md
git add CLAUDE.md
git add src/utils/cloudbedsApi.js
git add src/components/HostelAnalytics.jsx
git commit -m "docs: update documentation for CloudBeds API integration

- Add API usage section to README.md
- Update CLAUDE.md with API architecture details
- Clean up console logs (keep essential debugging)
- Document known issues (balance field)

Integration complete and tested with all 11 hostels"
```

---

## 🎉 Implementation Complete!

**Final Checklist**:

- [x] Phase 1: API Core (cloudbedsApi.js, .env)
- [x] Phase 2: Single Hostel UI (APIFetchPanel basic)
- [x] Phase 3: Multi-Hostel Fetching (sequential loop)
- [x] Phase 4: Progress UI (real-time updates)
- [x] Phase 5: Smart Merge & Warning (duplicate handling)
- [x] Phase 6: Testing & Documentation (README, CLAUDE.md)

**Total Commits**: 6 (one per phase)

**Total Lines Added**: ~800 lines

**Total Time**: 9-13 hours

---

**Document Status**: Complete
**Last Updated**: 2026-01-12
**Ready for**: Implementation
**Next Step**: Begin Phase 1 (after plan approval)
