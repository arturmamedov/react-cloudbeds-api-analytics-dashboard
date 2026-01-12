# CloudBeds API Integration - File Changes Specification

## 📁 Files Overview

### Summary
- **3 New Files** (API utility, UI component, environment config)
- **2 Modified Files** (Input panel, main orchestrator)
- **1 Updated File** (.gitignore - verify only)
- **2 Documentation Files** (README.md, CLAUDE.md)

**Total Files**: 8

---

## ✨ New Files

### 1. `.env` (Root Directory)

**Purpose**: Store CloudBeds API credentials securely

**Location**: `/home/user/react-booking-analytics-dashboard/.env`

**Content**:
```bash
# CloudBeds API Configuration
# IMPORTANT: Never commit this file to version control!
# Get your API key from: https://hotels.cloudbeds.com/connect/

VITE_CLOUDBEDS_API_KEY=your_client_id_here
VITE_CLOUDBEDS_CLIENT_SECRET=your_client_secret_here

# API Base URL (CloudBeds v1.3)
VITE_CLOUDBEDS_API_BASE_URL=https://api.cloudbeds.com/api/v1.3

# Optional: API timeout in milliseconds (default: 10000)
VITE_CLOUDBEDS_API_TIMEOUT=10000
```

**Notes**:
- User will replace placeholders with real credentials
- Vite automatically exposes `VITE_*` variables to client code
- Never log these values in console (even in dev mode)

**Security**:
- ✅ Added to `.gitignore`
- ✅ Not committed to repository
- ⚠️ Visible in browser network tab (acceptable for internal tool)

---

### 2. `src/utils/cloudbedsApi.js`

**Purpose**: CloudBeds API integration utility functions

**Location**: `/home/user/react-booking-analytics-dashboard/src/utils/cloudbedsApi.js`

**Estimated Size**: ~200 lines

**Exports**:

```javascript
/**
 * Fetch reservations from CloudBeds API for a specific property and date range
 *
 * @param {string} propertyID - CloudBeds property ID (e.g., "6733" for Flamingo)
 * @param {string} startDate - Start date in "YYYY-MM-DD" format
 * @param {string} endDate - End date in "YYYY-MM-DD" format
 * @returns {Promise<Array>} Array of transformed booking objects
 * @throws {Error} Network errors, auth errors, API errors, malformed responses
 *
 * @example
 * const bookings = await fetchReservationsFromCloudBeds("6733", "2026-01-05", "2026-01-11");
 * // Returns: [{ reservation, bookingDate, checkin, checkout, nights, price, status, source, leadTime }, ...]
 */
export const fetchReservationsFromCloudBeds = async (propertyID, startDate, endDate) => {
  // Implementation details below
};
```

**Internal Functions** (not exported):

```javascript
/**
 * Format date string to CloudBeds API datetime format
 * @param {string} date - "YYYY-MM-DD"
 * @param {boolean} isEndDate - If true, adds "23:59:59", else "00:00:00"
 * @returns {string} "YYYY-MM-DD HH:MM:SS"
 */
const formatDateTimeForAPI = (date, isEndDate = false) => {
  // "2026-01-05" → "2026-01-05 00:00:00"
  // "2026-01-11" → "2026-01-11 23:59:59" (if isEndDate=true)
};

/**
 * Transform CloudBeds reservation object to internal booking format
 * @param {object} cbReservation - CloudBeds reservation object
 * @returns {object} Booking object in internal format
 */
const transformReservation = (cbReservation) => {
  // Maps CloudBeds fields → our format
  // Calculates nights and leadTime
  // Handles edge cases (missing fields, invalid dates)
};

/**
 * Calculate nights between two dates
 * @param {string} startDate - "YYYY-MM-DD"
 * @param {string} endDate - "YYYY-MM-DD"
 * @returns {number} Number of nights
 */
const calculateNights = (startDate, endDate) => {
  // endDate - startDate in days
  // Returns 0 for same-day bookings
};

/**
 * Calculate lead time (days between booking and check-in)
 * @param {string} bookingDateTime - "YYYY-MM-DD HH:MM:SS"
 * @param {string} checkinDate - "YYYY-MM-DD"
 * @returns {number} Lead time in days
 */
const calculateLeadTime = (bookingDateTime, checkinDate) => {
  // checkinDate - bookingDate (date only, ignore time)
  // Can be negative for same-day bookings
};
```

**Implementation Logic**:

```javascript
export const fetchReservationsFromCloudBeds = async (propertyID, startDate, endDate) => {
  // 1. Validate environment variables
  const API_KEY = import.meta.env.VITE_CLOUDBEDS_API_KEY;
  const BASE_URL = import.meta.env.VITE_CLOUDBEDS_API_BASE_URL || 'https://api.cloudbeds.com/api/v1.3';

  if (!API_KEY) {
    throw new Error('CloudBeds API key not found. Please check your .env file.');
  }

  // 2. Format dates for API
  const resultsFrom = formatDateTimeForAPI(startDate, false);  // "2026-01-05 00:00:00"
  const resultsTo = formatDateTimeForAPI(endDate, true);       // "2026-01-11 23:59:59"

  // 3. Build API URL
  const url = `${BASE_URL}/getReservations?propertyID=${propertyID}&resultsFrom=${encodeURIComponent(resultsFrom)}&resultsTo=${encodeURIComponent(resultsTo)}`;

  // 4. Make HTTP request with timeout
  const timeout = import.meta.env.VITE_CLOUDBEDS_API_TIMEOUT || 10000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

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
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your .env file.');
      }
      throw new Error(`CloudBeds API error: ${response.status} ${response.statusText}`);
    }

    // 6. Parse JSON response
    const data = await response.json();

    // 7. Validate response structure
    if (!data || !data.success) {
      throw new Error('Invalid response from CloudBeds API.');
    }

    // 8. Handle empty results (not an error)
    if (!data.data || data.data.length === 0) {
      return [];  // No reservations found
    }

    // 9. Transform each reservation
    const bookings = data.data
      .map(transformReservation)
      .filter(booking => booking !== null);  // Remove invalid bookings

    // 10. Filter for direct bookings (Website source)
    const directBookings = bookings.filter(b =>
      b.source && b.source.toLowerCase().includes('website')
    );

    return directBookings;

  } catch (error) {
    // Handle specific error types
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. CloudBeds API is taking too long to respond.');
    }
    if (error instanceof TypeError) {
      throw new Error('Network error. Please check your internet connection.');
    }
    throw error;  // Re-throw other errors
  }
};

const transformReservation = (cbReservation) => {
  try {
    // Extract date from "YYYY-MM-DD HH:MM:SS" format
    const bookingDate = cbReservation.dateCreated.split(' ')[0];  // "2026-01-11 13:09:20" → "2026-01-11"

    // Calculate nights
    const nights = calculateNights(cbReservation.startDate, cbReservation.endDate);

    // Calculate lead time
    const leadTime = calculateLeadTime(cbReservation.dateCreated, cbReservation.startDate);

    return {
      reservation: cbReservation.reservationID,
      bookingDate: bookingDate,
      checkin: cbReservation.startDate,
      checkout: cbReservation.endDate,
      nights: nights,
      price: parseFloat(cbReservation.balance) || 0,  // Handle null/undefined
      status: cbReservation.status,
      source: cbReservation.sourceName,
      leadTime: leadTime
    };
  } catch (error) {
    console.error('Error transforming reservation:', cbReservation, error);
    return null;  // Skip malformed reservations
  }
};

const formatDateTimeForAPI = (date, isEndDate = false) => {
  const time = isEndDate ? '23:59:59' : '00:00:00';
  return `${date} ${time}`;
};

const calculateNights = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);  // Ensure non-negative
};

const calculateLeadTime = (bookingDateTime, checkinDate) => {
  const bookingDate = new Date(bookingDateTime.split(' ')[0]);  // Extract date only
  const checkin = new Date(checkinDate);
  const diffTime = checkin - bookingDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;  // Can be negative for same-day bookings
};
```

**Dependencies**:
- Native `fetch` API (no external libraries)
- `import.meta.env` (Vite environment variables)

**Error Handling**:
- ✅ Missing API key → Clear error message
- ✅ Network errors → Descriptive message
- ✅ Timeout → Abort and throw error
- ✅ 401 Unauthorized → Auth error message
- ✅ 500 Server Error → API error message
- ✅ Empty response → Return empty array (not error)
- ✅ Malformed data → Skip invalid bookings, log to console

---

### 3. `src/components/DataInput/APIFetchPanel.jsx`

**Purpose**: UI component for CloudBeds API data fetching

**Location**: `/home/user/react-booking-analytics-dashboard/src/components/DataInput/APIFetchPanel.jsx`

**Estimated Size**: ~350 lines

**Props Interface**:
```javascript
{
  selectedWeekStart: Date,              // Currently selected week start date
  setSelectedWeekStart: Function,       // Callback to update week
  onAPIFetchStart: Function,            // Called when fetch begins
  onAPIFetchComplete: Function,         // Called when fetch completes successfully
  onAPIFetchError: Function,            // Called when fetch fails
  weeklyData: Array,                    // Existing weekly data (for duplicate check)
  isUploading: boolean                  // Global loading state
}
```

**Component Structure**:

```jsx
import React, { useState, useCallback } from 'react';
import { Loader, AlertCircle, CheckCircle, XCircle, Download } from 'lucide-react';
import WeekSelector from './WeekSelector';
import { hostelConfig } from '../../config/hostelConfig';

const APIFetchPanel = ({
  selectedWeekStart,
  setSelectedWeekStart,
  onAPIFetchStart,
  onAPIFetchComplete,
  onAPIFetchError,
  weeklyData,
  isUploading
}) => {
  // ============ STATE ============
  const [fetchMode, setFetchMode] = useState('all');  // 'all' | 'single'
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [progress, setProgress] = useState(null);
  const [isCancelled, setIsCancelled] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [existingWeekData, setExistingWeekData] = useState(null);

  // ============ COMPUTED VALUES ============
  const isLoading = progress !== null;
  const hostelList = Object.keys(hostelConfig);

  // ============ HANDLERS ============

  const handleFetchClick = useCallback(() => {
    // Check if week data already exists
    const existingWeek = weeklyData.find(w => isSameWeek(w.date, selectedWeekStart));

    if (existingWeek) {
      setExistingWeekData(existingWeek);
      setShowWarning(true);
      return;
    }

    // No existing data - proceed with fetch
    startFetch();
  }, [selectedWeekStart, weeklyData, fetchMode, selectedHostel]);

  const handleConfirmOverwrite = () => {
    setShowWarning(false);
    startFetch();
  };

  const startFetch = async () => {
    if (fetchMode === 'single') {
      await fetchSingleHostel(selectedHostel);
    } else {
      await fetchAllHostels();
    }
  };

  const fetchSingleHostel = async (hostelName) => {
    // Initialize progress
    setProgress({
      mode: 'single',
      current: 0,
      total: 1,
      hostels: [{
        name: hostelName,
        status: 'loading',
        bookingCount: 0,
        elapsedTime: 0,
        error: null
      }],
      startTime: Date.now()
    });

    // Call parent callback
    onAPIFetchStart({ mode: 'single', hostel: hostelName });

    // Fetch will be handled in parent component
    // This component only manages UI state
  };

  const fetchAllHostels = async () => {
    // Initialize progress for all hostels
    setProgress({
      mode: 'all',
      current: 0,
      total: hostelList.length,
      hostels: hostelList.map(name => ({
        name,
        status: 'pending',
        bookingCount: 0,
        elapsedTime: 0,
        error: null
      })),
      startTime: Date.now()
    });

    // Call parent callback
    onAPIFetchStart({ mode: 'all', hostels: hostelList });
  };

  const handleCancel = () => {
    setIsCancelled(true);
    // Parent component will detect this and stop fetching
  };

  // ============ RENDER ============

  return (
    <div className="space-y-4">
      {/* Week Selector */}
      <WeekSelector
        selectedWeekStart={selectedWeekStart}
        setSelectedWeekStart={setSelectedWeekStart}
      />

      {/* Fetch Mode Toggle */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Fetch Mode</label>
        <div className="flex gap-2">
          <button
            onClick={() => setFetchMode('all')}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 rounded ${
              fetchMode === 'all'
                ? 'bg-teal text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Hostels (11)
          </button>
          <button
            onClick={() => setFetchMode('single')}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 rounded ${
              fetchMode === 'single'
                ? 'bg-teal text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Single Hostel
          </button>
        </div>
      </div>

      {/* Hostel Dropdown (Single Mode Only) */}
      {fetchMode === 'single' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Hostel</label>
          <select
            value={selectedHostel || ''}
            onChange={(e) => setSelectedHostel(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2 border rounded"
          >
            <option value="">Choose a hostel...</option>
            {hostelList.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Fetch Button */}
      <button
        onClick={handleFetchClick}
        disabled={isLoading || !selectedWeekStart || (fetchMode === 'single' && !selectedHostel)}
        className="w-full bg-teal hover:bg-teal-dark text-white px-6 py-3 rounded flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
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

      {/* Progress Display */}
      {isLoading && (
        <ProgressDisplay
          progress={progress}
          onCancel={handleCancel}
        />
      )}

      {/* Warning Modal */}
      {showWarning && (
        <WarningModal
          weekData={existingWeekData}
          onCancel={() => setShowWarning(false)}
          onConfirm={handleConfirmOverwrite}
        />
      )}
    </div>
  );
};

// ============ SUB-COMPONENTS ============

const ProgressDisplay = ({ progress, onCancel }) => {
  const percentage = (progress.current / progress.total) * 100;
  const elapsedSeconds = Math.floor((Date.now() - progress.startTime) / 1000);
  const successCount = progress.hostels.filter(h => h.status === 'success').length;
  const errorCount = progress.hostels.filter(h => h.status === 'error').length;

  return (
    <div className="border-2 border-teal rounded-lg p-4 bg-gray-50 space-y-3">
      {/* Header */}
      <div className="text-sm font-mono text-gray-700">
        🔧 FETCHING DATA FROM CLOUDBEDS API...
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className="bg-teal h-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="text-xs text-gray-600 font-mono">
          {progress.current}/{progress.total} ({percentage.toFixed(0)}%) • {elapsedSeconds}s elapsed
        </div>
      </div>

      {/* Hostel Status List */}
      <div className="max-h-64 overflow-y-auto space-y-1 font-mono text-sm">
        {progress.hostels.map((hostel, index) => (
          <HostelStatusRow key={hostel.name} hostel={hostel} index={index} />
        ))}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-gray-700">
          ⚡ {successCount} successful, {errorCount} failed
        </div>
        <button
          onClick={onCancel}
          className="text-red hover:text-red-dark flex items-center gap-1"
        >
          <XCircle className="w-4 h-4" />
          Cancel Fetch
        </button>
      </div>
    </div>
  );
};

const HostelStatusRow = ({ hostel, index }) => {
  const statusIcons = {
    pending: '⏸',
    loading: '⏳',
    success: '✓',
    error: '✗'
  };

  const statusColors = {
    pending: 'text-gray-400',
    loading: 'text-blue-600',
    success: 'text-green-600',
    error: 'text-red-600'
  };

  return (
    <div className={`flex items-center justify-between ${statusColors[hostel.status]}`}>
      <div className="flex items-center gap-2 flex-1">
        <span>{statusIcons[hostel.status]}</span>
        <span className="w-32">{hostel.name}</span>
      </div>
      <div className="flex items-center gap-4 text-xs">
        {hostel.status === 'success' && (
          <>
            <span>{hostel.bookingCount} bookings</span>
            <span>{(hostel.elapsedTime / 1000).toFixed(1)}s</span>
          </>
        )}
        {hostel.status === 'error' && (
          <span className="text-red-600">{hostel.error}</span>
        )}
        {hostel.status === 'loading' && (
          <span>Fetching...</span>
        )}
        {hostel.status === 'pending' && (
          <span>Queued</span>
        )}
      </div>
    </div>
  );
};

const WarningModal = ({ weekData, onCancel, onConfirm }) => {
  const hostelCount = Object.keys(weekData.hostels).length;
  const totalBookings = Object.values(weekData.hostels).reduce((sum, h) => sum + h.count, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
        <div className="flex items-center gap-2 text-yellow">
          <AlertCircle className="w-6 h-6" />
          <h3 className="text-lg font-semibold">Week Data Already Exists</h3>
        </div>

        <div className="text-sm text-gray-700 space-y-2">
          <p><strong>Week:</strong> {weekData.week}</p>
          <p><strong>Existing data:</strong></p>
          <ul className="list-disc list-inside pl-4">
            <li>{hostelCount} hostels loaded</li>
            <li>{totalBookings} total bookings</li>
          </ul>
          <p className="text-yellow-dark mt-3">
            ⚠️ Fetching new data will update the hostels you fetch. Other hostels will remain unchanged (smart merge).
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-teal text-white rounded hover:bg-teal-dark"
          >
            Continue & Merge
          </button>
        </div>
      </div>
    </div>
  );
};

export default APIFetchPanel;
```

**Styling**:
- Uses existing Tailwind classes
- Matches Nests brand colors (teal, green, red)
- Programmer-style monospace font for progress
- Responsive design (mobile-friendly)

**Dependencies**:
- React hooks (`useState`, `useCallback`)
- Lucide React icons
- WeekSelector component (reused)
- hostelConfig (imported)

---

## 🔧 Modified Files

### 4. `src/components/DataInput/DataInputPanel.jsx`

**Purpose**: Add CloudBeds API as third input method

**Location**: `/home/user/react-booking-analytics-dashboard/src/components/DataInput/DataInputPanel.jsx`

**Changes Required**:

1. **Import new component**:
```javascript
import APIFetchPanel from './APIFetchPanel';
```

2. **Add 'api' to inputMethod state options**:
```javascript
// Existing: 'file' | 'paste'
// New: 'file' | 'paste' | 'api'
```

3. **Add third button**:
```jsx
{/* Existing buttons */}
<button onClick={() => setInputMethod('file')} ...>
  Upload Files/Folders
</button>
<button onClick={() => setInputMethod('paste')} ...>
  Copy & Paste
</button>

{/* NEW: API button */}
<button
  onClick={() => setInputMethod('api')}
  className={`px-6 py-3 rounded transition ${
    inputMethod === 'api'
      ? 'bg-teal text-white'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`}
>
  <Download className="w-5 h-5" />
  CloudBeds API
</button>
```

4. **Add conditional rendering**:
```jsx
{/* Existing */}
{inputMethod === 'file' && <FileUploadSection />}
{inputMethod === 'paste' && <PasteSection />}

{/* NEW */}
{inputMethod === 'api' && (
  <APIFetchPanel
    selectedWeekStart={selectedWeekStart}
    setSelectedWeekStart={setSelectedWeekStart}
    onAPIFetchStart={onAPIFetchStart}
    onAPIFetchComplete={onAPIFetchComplete}
    onAPIFetchError={onAPIFetchError}
    weeklyData={weeklyData}
    isUploading={isUploading}
  />
)}
```

5. **Pass new props from parent** (HostelAnalytics):
```javascript
// Props needed by DataInputPanel
{
  onAPIFetchStart,      // Callback when fetch starts
  onAPIFetchComplete,   // Callback when fetch succeeds
  onAPIFetchError,      // Callback when fetch fails
  weeklyData            // For duplicate week detection
}
```

**Estimated Changes**: ~15 lines added

---

### 5. `src/components/HostelAnalytics.jsx`

**Purpose**: Add API data processing logic

**Location**: `/home/user/react-booking-analytics-dashboard/src/components/HostelAnalytics.jsx`

**Changes Required**:

1. **Import API utility**:
```javascript
import { fetchReservationsFromCloudBeds } from '../utils/cloudbedsApi';
import { hostelConfig } from '../config/hostelConfig';
```

2. **Add state for API progress** (optional, could be in APIFetchPanel):
```javascript
const [apiFetchProgress, setApiFetchProgress] = useState(null);
```

3. **Add API fetch handlers**:

```javascript
/**
 * Handle single hostel API fetch
 */
const handleAPIFetchSingle = useCallback(async (hostelName, weekStart) => {
  setIsUploading(true);

  try {
    const propertyID = hostelConfig[hostelName].id;
    const { startDate, endDate } = getWeekDateRange(weekStart);

    // Fetch from API
    const bookings = await fetchReservationsFromCloudBeds(
      propertyID,
      startDate,
      endDate
    );

    // Calculate metrics (reuse existing function)
    const metrics = calculateHostelMetrics(bookings);

    // Smart merge into weeklyData
    smartMergeHostelData(weekStart, hostelName, metrics);

    setIsUploading(false);
  } catch (error) {
    console.error('API fetch error:', error);
    setIsUploading(false);
    throw error;  // Re-throw for parent component to show error
  }
}, [weeklyData]);

/**
 * Handle multi-hostel API fetch (all 11 properties)
 */
const handleAPIFetchAll = useCallback(async (weekStart, onProgress, checkCancelled) => {
  setIsUploading(true);

  const hostelList = Object.keys(hostelConfig);
  const results = [];
  const errors = [];

  for (let i = 0; i < hostelList.length; i++) {
    // Check if user cancelled
    if (checkCancelled()) {
      console.log('Fetch cancelled by user');
      break;
    }

    const hostelName = hostelList[i];
    const startTime = Date.now();

    try {
      // Update progress callback
      onProgress({
        current: i + 1,
        total: hostelList.length,
        hostelName,
        status: 'loading'
      });

      // Fetch from API
      const propertyID = hostelConfig[hostelName].id;
      const { startDate, endDate } = getWeekDateRange(weekStart);

      const bookings = await fetchReservationsFromCloudBeds(
        propertyID,
        startDate,
        endDate
      );

      const metrics = calculateHostelMetrics(bookings);
      const elapsedTime = Date.now() - startTime;

      results.push({ hostelName, metrics });

      // Update progress callback
      onProgress({
        current: i + 1,
        total: hostelList.length,
        hostelName,
        status: 'success',
        bookingCount: metrics.count,
        elapsedTime
      });

      // Optional: Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`Error fetching ${hostelName}:`, error);
      errors.push({ hostelName, error: error.message });

      // Update progress callback
      onProgress({
        current: i + 1,
        total: hostelList.length,
        hostelName,
        status: 'error',
        error: error.message
      });

      // Continue to next hostel (don't stop on error)
    }
  }

  // Smart merge all successful results
  if (results.length > 0) {
    results.forEach(({ hostelName, metrics }) => {
      smartMergeHostelData(weekStart, hostelName, metrics);
    });
  }

  setIsUploading(false);

  return {
    successCount: results.length,
    errorCount: errors.length,
    errors
  };
}, [weeklyData]);

/**
 * Smart merge: Update only fetched hostels, preserve others
 */
const smartMergeHostelData = (weekStart, hostelName, metrics) => {
  setWeeklyData(prev => {
    // Find existing week
    const weekIndex = prev.findIndex(w =>
      isSameWeek(w.date, weekStart)
    );

    // Week doesn't exist - create new entry
    if (weekIndex === -1) {
      const newWeek = {
        week: formatWeekRange(weekStart),
        date: weekStart,
        hostels: {
          [hostelName]: metrics
        }
      };
      return [...prev, newWeek].sort((a, b) => a.date - b.date);
    }

    // Week exists - update hostel data
    const updated = [...prev];
    updated[weekIndex] = {
      ...updated[weekIndex],
      hostels: {
        ...updated[weekIndex].hostels,
        [hostelName]: metrics  // Add or update this hostel
      }
    };

    return updated;
  });
};

/**
 * Helper: Get week date range (Mon-Sun)
 */
const getWeekDateRange = (weekStart) => {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);  // Sunday

  return {
    startDate: formatDateForAPI(start),  // "2026-01-05"
    endDate: formatDateForAPI(end)       // "2026-01-11"
  };
};

const formatDateForAPI = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```

4. **Pass callbacks to DataInputPanel**:
```jsx
<DataInputPanel
  {/* existing props */}
  onAPIFetchStart={handleAPIFetchStart}      // NEW
  onAPIFetchComplete={handleAPIFetchComplete}  // NEW
  onAPIFetchError={handleAPIFetchError}      // NEW
  weeklyData={weeklyData}                    // NEW
/>
```

**Estimated Changes**: ~150 lines added

---

## ✅ Updated Files

### 6. `.gitignore`

**Purpose**: Ensure `.env` is not committed to git

**Location**: `/home/user/react-booking-analytics-dashboard/.gitignore`

**Changes Required**:
- Verify `.env` is already listed
- If not, add it:

```bash
# Environment variables
.env
.env.local
.env.development
.env.production
```

**Estimated Changes**: 0-4 lines (likely already there)

---

## 📚 Documentation Files

### 7. `README.md`

**Purpose**: Add user-facing API usage documentation

**Location**: `/home/user/react-booking-analytics-dashboard/README.md`

**Changes Required**:

Add new section after "Data Input Methods":

```markdown
### CloudBeds API Integration

**Setup**:
1. Obtain CloudBeds API key from [CloudBeds Connect](https://hotels.cloudbeds.com/connect/)
2. Create `.env` file in project root:
   ```bash
   VITE_CLOUDBEDS_API_KEY=your_api_key_here
   VITE_CLOUDBEDS_API_BASE_URL=https://api.cloudbeds.com/api/v1.3
   ```
3. Restart dev server (`npm run dev`)

**Usage**:
1. Click "CloudBeds API" tab
2. Select week using date picker
3. Choose fetch mode:
   - **All Hostels**: Fetches all 11 properties (30-40 seconds)
   - **Single Hostel**: Quick fetch for one property
4. Click "Fetch from CloudBeds"
5. Wait for progress to complete
6. Data appears in dashboard automatically

**Troubleshooting**:
- **"Invalid API key"**: Check `.env` file and restart server
- **"Network error"**: Check internet connection
- **"Request timeout"**: CloudBeds API is slow, try again
- **Balance field is 0**: Known issue - checked-out bookings show $0 balance (using `getReservationDetails` in future)

**Notes**:
- Only fetches direct bookings (source = "Website/Booking Engine")
- Filters out OTA bookings (Booking.com, Hostelworld, etc.)
- Smart merge: Updates only fetched hostels, preserves others
- Cancel anytime during multi-hostel fetch
```

**Estimated Changes**: ~30 lines added

---

### 8. `CLAUDE.md`

**Purpose**: Update development guide with API integration details

**Location**: `/home/user/react-booking-analytics-dashboard/CLAUDE.md`

**Changes Required**:

1. **Update "Project Overview"** section:
```markdown
### Core Purpose
Transform CloudBeds reservation exports into actionable insights for hostel operators through:
- Multi-format data ingestion (Excel files, copy-paste, **CloudBeds API**)  ← UPDATED
...
```

2. **Add new section after "Data Processing Pipeline"**:

```markdown
## 🔌 CloudBeds API Integration

### API Configuration

**Endpoint**: `https://api.cloudbeds.com/api/v1.3/getReservations`

**Authentication**: Bearer token (stored in `.env`)

**Environment Variables**:
```bash
VITE_CLOUDBEDS_API_KEY=your_api_key
VITE_CLOUDBEDS_API_BASE_URL=https://api.cloudbeds.com/api/v1.3
VITE_CLOUDBEDS_API_TIMEOUT=10000
```

### API Data Flow

```
User selects week + hostel(s)
    ↓
APIFetchPanel.jsx triggers fetch
    ↓
cloudbedsApi.js makes HTTP request
    ↓
Transform CloudBeds JSON → Unified booking format
    ↓
Filter for sourceName.includes('website')
    ↓
calculateHostelMetrics() ← REUSED FUNCTION
    ↓
Smart merge into weeklyData
    ↓
Dashboard renders
```

### API Response Transformation

**CloudBeds Field Mapping**:
```javascript
reservationID  → reservation
dateCreated    → bookingDate (extract date from "YYYY-MM-DD HH:MM:SS")
startDate      → checkin
endDate        → checkout
balance        → price (⚠️ Note: 0 for checked-out bookings)
status         → status ("confirmed", "checked_in", "checked_out", "canceled")
sourceName     → source
[calculated]   → nights (endDate - startDate)
[calculated]   → leadTime (startDate - dateCreated, in days)
```

### Known Issues

1. **Balance Field**: CloudBeds `balance` field is $0 for checked-out bookings
   - **Impact**: Revenue underreported for past dates
   - **Workaround**: Use Excel export for historical analysis
   - **Future Fix**: Implement `getReservationDetails` endpoint call

2. **Rate Limiting**: Not documented by CloudBeds
   - **Mitigation**: 500ms delay between multi-hostel fetches
   - **Monitor**: Check console for 429 errors

### Error Handling

See `docs/api-integration-plan/05-error-scenarios.md` for full matrix.

**Common Errors**:
- `Invalid API key` → Check `.env` and restart dev server
- `Network error` → Check internet connection
- `Request timeout` → CloudBeds API slow, retry
- Empty response → No bookings in date range (not an error)
```

3. **Update "Key Files Reference"** section:

```markdown
### Data Input Components
- `src/components/DataInput/DataInputPanel.jsx` - Complete data input section (file + paste + **API**)  ← UPDATED
- `src/components/DataInput/APIFetchPanel.jsx` - CloudBeds API fetch UI  ← NEW
- `src/components/DataInput/WeekSelector.jsx` - Week date selection
- `src/components/DataInput/WarningBanner.jsx` - Warning display component

### Utilities
- `src/utils/index.js` - Centralized utility exports
- `src/utils/cloudbedsApi.js` - CloudBeds API integration  ← NEW
- `src/utils/dateUtils.js` - Date calculations and week detection
- `src/utils/formatters.js` - Currency and price formatting
- `src/utils/metricsCalculator.js` - Core business logic (ADR, metrics)
- `src/utils/dataParser.js` - Data parsing and transformation
```

4. **Update "Recent Updates"** section:

```markdown
### CloudBeds API Integration (NEW)
- **Added**: Direct API fetching from CloudBeds (v1.3 endpoint)
- **Features**: Single hostel and multi-hostel (all 11) fetch modes
- **UI**: Programmer-style progress display with timing and status
- **Smart Merge**: Updates only fetched hostels, preserves others
- **Error Handling**: Continue on error, allow retry for failed hostels
- **Authentication**: Bearer token stored in `.env` file
- **Source Filtering**: Only direct bookings (`sourceName` contains "website")
- **Components Created**:
  - `APIFetchPanel.jsx` - UI for API fetching
  - `cloudbedsApi.js` - API utility functions
```

**Estimated Changes**: ~100 lines added

---

## 📊 File Change Summary

| File | Type | Lines | Complexity | Risk |
|------|------|-------|------------|------|
| `.env` | New | 10 | Low | Low |
| `src/utils/cloudbedsApi.js` | New | 200 | Medium | Medium |
| `src/components/DataInput/APIFetchPanel.jsx` | New | 350 | High | Low |
| `src/components/DataInput/DataInputPanel.jsx` | Modified | +15 | Low | Low |
| `src/components/HostelAnalytics.jsx` | Modified | +150 | Medium | Medium |
| `.gitignore` | Updated | +4 | Low | None |
| `README.md` | Documentation | +30 | Low | None |
| `CLAUDE.md` | Documentation | +100 | Low | None |

**Total New Code**: ~600 lines
**Total Modified Code**: ~165 lines
**Total Documentation**: ~130 lines

---

**Document Status**: Draft
**Last Updated**: 2026-01-12
**Dependencies**: Requires `00-overview.md` and `01-architecture.md` review
**Next Document**: `03-implementation-steps.md`
