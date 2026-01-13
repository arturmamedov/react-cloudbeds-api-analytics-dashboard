# CloudBeds API Integration - Architecture Design

## 🏗️ System Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────────────────┐  │
│  │  Excel   │  │   Copy   │  │    CloudBeds API   ← NEW!   │  │
│  │  Upload  │  │  & Paste │  │  ┌─────────┐  ┌──────────┐  │  │
│  └────┬─────┘  └────┬─────┘  │  │ Single  │  │   All    │  │  │
│       │             │         │  │ Hostel  │  │ Hostels  │  │  │
│       │             │         │  └────┬────┘  └────┬─────┘  │  │
│       │             │         └───────┼────────────┼────────┘  │
└───────┼─────────────┼─────────────────┼────────────┼───────────┘
        │             │                 │            │
        ▼             ▼                 ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA PROCESSING LAYER                        │
│  ┌─────────┐  ┌──────────┐  ┌────────────────────────────┐    │
│  │ Excel   │  │  Paste   │  │  CloudBeds API Utility     │    │
│  │ Parser  │  │  Parser  │  │  ┌──────────────────────┐  │    │
│  │ (XLSX)  │  │  (HTML)  │  │  │ fetchReservations()  │  │    │
│  └────┬────┘  └────┬─────┘  │  │ - Auth with Bearer   │  │    │
│       │            │         │  │ - Format dates       │  │    │
│       │            │         │  │ - Transform JSON     │  │    │
│       │            │         │  │ - Filter by source   │  │    │
│       │            │         │  │ - Calculate nights   │  │    │
│       └────────────┴─────────┼─►│ - Calculate leadTime │  │    │
│                              │  └──────────┬───────────┘  │    │
│                              └─────────────┼──────────────┘    │
└────────────────────────────────────────────┼───────────────────┘
                                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   UNIFIED BOOKING FORMAT                        │
│  {                                                              │
│    reservation: string,      // "3954551056305"                │
│    bookingDate: string,      // "2026-01-11"                   │
│    checkin: string,          // "2026-01-11"                   │
│    checkout: string,         // "2026-01-12"                   │
│    nights: number,           // 1                              │
│    price: number,            // 321.33                         │
│    status: string,           // "confirmed"                    │
│    source: string,           // "Website/Booking Engine"       │
│    leadTime: number          // 0                              │
│  }                                                              │
└────────────────────────────────┬────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   METRICS CALCULATION                           │
│  ┌───────────────────────────────────────────────────────┐     │
│  │  calculateHostelMetrics(bookings)  ← REUSED FUNCTION  │     │
│  │  - count, cancelled, valid                            │     │
│  │  - revenue, adr                                       │     │
│  │  - nestPass (7+ nights), monthly (28+ nights)        │     │
│  │  - avgLeadTime                                        │     │
│  └─────────────────────────┬─────────────────────────────┘     │
└────────────────────────────┼───────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STATE MANAGEMENT                           │
│  ┌───────────────────────────────────────────────────────┐     │
│  │  weeklyData: [                                        │     │
│  │    {                                                  │     │
│  │      week: "06 Jan 2026 - 12 Jan 2026",             │     │
│  │      date: Date,                                     │     │
│  │      hostels: {                                      │     │
│  │        "Flamingo": { count, revenue, adr, ... },    │     │
│  │        "Puerto": { count, revenue, adr, ... },      │     │
│  │        ...                                           │     │
│  │      }                                               │     │
│  │    }                                                 │     │
│  │  ]                                                   │     │
│  └─────────────────────────┬─────────────────────────────┘     │
└────────────────────────────┼───────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DASHBOARD DISPLAY                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Latest Week  │  │ Performance  │  │ Excel Style  │         │
│  │   Summary    │  │    Table     │  │     View     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐                           │
│  │    Charts    │  │ AI Analysis  │                           │
│  └──────────────┘  └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Integration Points

### 1. CloudBeds API Endpoint

**Base URL**: `https://api.cloudbeds.com/api/v1.3`

**Endpoint**: `GET /getReservations`

**Authentication**:
```http
Authorization: Bearer YOUR_API_KEY
```

**Query Parameters**:
```javascript
{
  propertyID: "6733",                    // Required - Hostel property ID
  resultsFrom: "2026-01-05 00:00:00",   // Required - Start datetime
  resultsTo: "2026-01-11 23:59:59"      // Required - End datetime
}
```

**Response Structure**:
```json
{
  "success": true,
  "data": [
    {
      "reservationID": "3954551056305",
      "dateCreated": "2026-01-11 13:09:20",
      "startDate": "2026-01-11",
      "endDate": "2026-01-12",
      "status": "confirmed",
      "sourceName": "Website/Booking Engine",
      "balance": 321.33,
      "adults": "1",
      "children": "0",
      "guestName": "John Doe"
    }
  ],
  "count": 15,
  "total": 15
}
```

---

## 📦 Component Architecture

### New Components

#### 1. `src/utils/cloudbedsApi.js`
**Purpose**: CloudBeds API integration utility

**Exports**:
```javascript
// Main fetch function
export const fetchReservationsFromCloudBeds = async (
  propertyID,    // "6733"
  startDate,     // "2026-01-05"
  endDate        // "2026-01-11"
) => {
  // Returns: Array of transformed booking objects
  // Throws: Error with descriptive message
}

// Helper function (internal)
const transformReservation = (cbReservation) => {
  // Transforms CloudBeds JSON → Unified booking format
}

// Date formatter (internal)
const formatDateTimeForAPI = (dateString) => {
  // "2026-01-05" → "2026-01-05 00:00:00"
}
```

**Dependencies**:
- Native `fetch` API (no external libs)
- `import.meta.env` for API key

**Error Handling**:
- Network errors → Throw with "Network error" message
- 401 Unauthorized → Throw with "Invalid API key" message
- 404/500 errors → Throw with "CloudBeds API error" message
- Empty response → Return empty array (not an error)
- Malformed JSON → Throw with "Invalid response format" message

#### 2. `src/components/DataInput/APIFetchPanel.jsx`
**Purpose**: UI for API-based data fetching

**Props**:
```javascript
{
  selectedWeekStart: Date,           // Currently selected week
  setSelectedWeekStart: Function,    // Week selector callback
  isUploading: boolean,              // Loading state from parent
  onAPIFetchStart: Function,         // Called when fetch begins
  onAPIFetchComplete: Function,      // Called when fetch completes
  onAPIFetchError: Function          // Called on error
}
```

**State**:
```javascript
{
  fetchMode: 'all' | 'single',       // All hostels or single
  selectedHostel: string | null,     // Selected hostel name
  isLoading: boolean,                // Fetch in progress
  progress: {
    current: number,                 // Current hostel index (1-11)
    total: number,                   // Total hostels (11)
    hostels: [
      {
        name: "Flamingo",
        status: 'pending' | 'loading' | 'success' | 'error',
        bookingCount: number,
        elapsedTime: number,         // Milliseconds
        error: string | null
      }
    ]
  },
  isCancelled: boolean,              // User cancelled fetch
  showWarning: boolean,              // Week data exists warning
  existingWeekData: object | null    // Existing week data for warning
}
```

**UI Sections**:
1. Week selector (reuse `<WeekSelector>`)
2. Fetch mode toggle (All / Single)
3. Hostel dropdown (if single mode)
4. Fetch button
5. Progress display (programmer-style)
6. Warning modal (when overwriting data)

---

## 🔄 Data Flow Details

### Single Hostel Fetch Flow

```
User Action: Select "Single Hostel" → Choose "Flamingo" → Click "Fetch"
    ↓
APIFetchPanel.jsx: onFetchSingleHostel()
    ↓
Check if week data exists → Show warning if yes → Wait for confirmation
    ↓
HostelAnalytics.jsx: processAPIData(mode='single', hostel='Flamingo')
    ↓
cloudbedsApi.js: fetchReservationsFromCloudBeds("6733", "2026-01-05", "2026-01-11")
    ↓
HTTP GET → CloudBeds API
    ↓
Response: { success: true, data: [...] }
    ↓
Transform each reservation:
  - reservationID → reservation
  - dateCreated → bookingDate (extract date only)
  - startDate → checkin
  - endDate → checkout
  - balance → price
  - status → status
  - sourceName → source
  - Calculate nights: endDate - startDate
  - Calculate leadTime: startDate - dateCreated (in days)
    ↓
Filter: Keep only bookings where sourceName.toLowerCase().includes('website')
    ↓
metricsCalculator.js: calculateHostelMetrics(filteredBookings)
    ↓
Returns: { count, cancelled, valid, revenue, adr, nestPass, monthly, avgLeadTime, bookings }
    ↓
Smart Merge: Update only "Flamingo" in weeklyData, keep other hostels unchanged
    ↓
State Update: setWeeklyData(newWeeklyData)
    ↓
Dashboard auto-renders with new data
```

### Multi-Hostel Fetch Flow

```
User Action: Select "All Hostels" → Click "Fetch from CloudBeds"
    ↓
APIFetchPanel.jsx: onFetchAllHostels()
    ↓
Check if week data exists → Show warning if yes → Wait for confirmation
    ↓
HostelAnalytics.jsx: processAPIData(mode='all', hostels=hostelConfig)
    ↓
Loop through 11 hostels:
  For i = 0; i < 11; i++ {
    ↓
    Update progress: current = i+1, status = 'loading'
    ↓
    cloudbedsApi.js: fetchReservationsFromCloudBeds(hostelConfig[i].id, ...)
    ↓
    HTTP GET → CloudBeds API
    ↓
    Success?
      ✓ Transform + Filter + Calculate metrics
      ✓ Add to results array
      ✓ Update progress: status = 'success', bookingCount = N
    ✗ Error?
      ✗ Log error
      ✗ Update progress: status = 'error', error = message
      ✗ Continue to next hostel (don't stop)
    ↓
    Check if user clicked "Cancel"?
      → Break loop if cancelled
    ↓
  }
    ↓
Smart Merge: Update all successfully fetched hostels in weeklyData
    ↓
State Update: setWeeklyData(newWeeklyData)
    ↓
Show completion message:
  - All succeeded: "✓ All 11 hostels fetched successfully"
  - Some failed: "⚠ 9/11 hostels fetched. 2 failed - click to retry"
  - Cancelled: "Fetch cancelled. 6/11 hostels loaded."
```

---

## 🧩 Component Hierarchy

```
HostelAnalytics.jsx (Main orchestrator)
│
├── DataInputPanel.jsx (Input method selector)
│   ├── inputMethod === 'file'
│   │   └── <FileUploadSection /> (Existing)
│   │
│   ├── inputMethod === 'paste'
│   │   └── <PasteSection /> (Existing)
│   │
│   └── inputMethod === 'api'  ← NEW!
│       └── APIFetchPanel.jsx
│           ├── <WeekSelector /> (Reused)
│           ├── <FetchModeToggle />  ← New
│           ├── <HostelDropdown />  ← New (if single mode)
│           ├── <FetchButton />  ← New
│           ├── <ProgressDisplay />  ← New
│           └── <WarningModal />  ← New
│
├── Dashboard Components (Unchanged)
│   ├── <LatestWeekSummary />
│   ├── <PerformanceTable />
│   ├── <ExcelStyleView />
│   └── ...
│
└── Analysis Components (Unchanged)
    ├── <ReservationChart />
    └── <AIAnalysisPanel />
```

---

## 🔐 Security Considerations

### API Key Storage

**File**: `.env` (root directory)
```bash
VITE_CLOUDBEDS_API_KEY=your_long_lived_api_key_here
```

**Access in Code**:
```javascript
const API_KEY = import.meta.env.VITE_CLOUDBEDS_API_KEY;
```

**Security Measures**:
1. ✅ `.env` added to `.gitignore` (never commit)
2. ✅ API key validated on first use (throw error if missing)
3. ✅ No logging of API key in console (even in dev mode)
4. ⚠️ Client-side API calls expose key in network tab (acceptable for internal tool)

**Future Enhancement** (out of scope):
- Move API calls to backend proxy to hide API key
- Implement token refresh mechanism
- Add IP whitelisting in CloudBeds dashboard

### Data Privacy

**Guest Data Handling**:
- ✅ Guest names fetched but only used for internal analytics
- ✅ No PII stored in localStorage or external services
- ✅ Data only persists in React state (cleared on page refresh)
- ✅ No data sent to third parties (except Claude AI for analysis - optional)

---

## 🎨 State Management Strategy

### Main State (`HostelAnalytics.jsx`)

**Existing State** (unchanged):
```javascript
const [weeklyData, setWeeklyData] = useState([]);
const [selectedWeekStart, setSelectedWeekStart] = useState(null);
const [isUploading, setIsUploading] = useState(false);
const [viewMode, setViewMode] = useState('dashboard');
```

**New State** (for API fetching):
```javascript
const [apiFetchProgress, setApiFetchProgress] = useState(null);
// Structure:
// {
//   mode: 'single' | 'all',
//   current: 3,
//   total: 11,
//   hostels: [...],
//   isCancelled: false,
//   startTime: Date
// }
```

### Component State (`APIFetchPanel.jsx`)

**Local State**:
```javascript
const [fetchMode, setFetchMode] = useState('all');
const [selectedHostel, setSelectedHostel] = useState(null);
const [showWarning, setShowWarning] = useState(false);
const [existingWeekData, setExistingWeekData] = useState(null);
```

**Derived State**:
```javascript
const isLoading = apiFetchProgress !== null;
const progressPercentage = (apiFetchProgress?.current / apiFetchProgress?.total) * 100;
const successfulHostels = apiFetchProgress?.hostels.filter(h => h.status === 'success').length;
```

---

## 📐 Smart Merge Algorithm

### Objective
Update only fetched hostels in `weeklyData`, preserve unfetched hostels.

### Algorithm

```javascript
function smartMergeWeekData(
  existingWeeklyData,  // Current state
  fetchedData,         // New API data: [{ hostelName, metrics }, ...]
  weekStart            // Week identifier
) {
  // 1. Find the week in existing data
  const weekIndex = existingWeeklyData.findIndex(w =>
    isSameWeek(w.date, weekStart)
  );

  // 2. If week doesn't exist, create new entry
  if (weekIndex === -1) {
    return [
      ...existingWeeklyData,
      {
        week: formatWeekRange(weekStart),
        date: weekStart,
        hostels: {
          ...Object.fromEntries(
            fetchedData.map(d => [d.hostelName, d.metrics])
          )
        }
      }
    ].sort((a, b) => a.date - b.date);  // Keep chronological order
  }

  // 3. Week exists - merge hostel data
  const updatedWeeklyData = [...existingWeeklyData];
  const weekData = { ...updatedWeeklyData[weekIndex] };

  fetchedData.forEach(({ hostelName, metrics }) => {
    weekData.hostels[hostelName] = metrics;  // Update or add hostel
  });

  updatedWeeklyData[weekIndex] = weekData;
  return updatedWeeklyData;
}
```

### Example Scenario

**Before Fetch**:
```javascript
weeklyData = [
  {
    week: "06 Jan 2026 - 12 Jan 2026",
    hostels: {
      "Flamingo": { count: 45, revenue: 3200, ... },  // From Excel
      "Puerto": { count: 32, revenue: 2800, ... },    // From Excel
      "Arena": { count: 28, revenue: 2100, ... }      // From Excel
    }
  }
]
```

**Action**: Fetch "Puerto" and "Duque" from API

**After Smart Merge**:
```javascript
weeklyData = [
  {
    week: "06 Jan 2026 - 12 Jan 2026",
    hostels: {
      "Flamingo": { count: 45, revenue: 3200, ... },  // ← Preserved (from Excel)
      "Puerto": { count: 34, revenue: 2900, ... },    // ← Updated (from API)
      "Arena": { count: 28, revenue: 2100, ... },     // ← Preserved (from Excel)
      "Duque": { count: 19, revenue: 1600, ... }      // ← Added (from API)
    }
  }
]
```

---

## 🚦 Error States & Handling

### Error Types

1. **Network Error**
   - Cause: No internet, CloudBeds API down
   - Message: "Network error. Please check your connection and try again."
   - Action: Allow retry

2. **Authentication Error (401)**
   - Cause: Invalid API key
   - Message: "Invalid API key. Please check your .env file."
   - Action: No retry (fix API key first)

3. **CloudBeds API Error (500)**
   - Cause: Server error on CloudBeds side
   - Message: "CloudBeds API error. Please try again later."
   - Action: Allow retry

4. **Timeout Error**
   - Cause: Request takes > 10 seconds
   - Message: "Request timeout. CloudBeds API is slow. Try again?"
   - Action: Allow retry

5. **Empty Response**
   - Cause: No reservations in date range
   - Message: "No reservations found for [Hostel] in selected week."
   - Action: Not an error - show info message

6. **Malformed Response**
   - Cause: CloudBeds API changed response format
   - Message: "Invalid response from CloudBeds. API may have changed."
   - Action: Log to console, allow retry

### Error Recovery Strategy

```
Error occurs during multi-hostel fetch (e.g., hostel #5 of 11 fails)
    ↓
Log error to console with details
    ↓
Update progress: hostel status = 'error', error message = "..."
    ↓
Continue to next hostel (don't stop the loop)
    ↓
After all 11 attempts:
    ↓
Show summary:
  - "9/11 hostels fetched successfully"
  - "2 failed: Arena (Network error), Duque (Timeout)"
  - [Retry Failed Only] button
```

---

## 🧪 Testing Strategy

### Unit Testing (Manual Console Tests)

**Phase 1: API Utility**
```javascript
// Test 1: Successful fetch
const data = await fetchReservationsFromCloudBeds("6733", "2026-01-05", "2026-01-11");
console.log('Bookings:', data.length);

// Test 2: Invalid property ID
try {
  await fetchReservationsFromCloudBeds("999999", "2026-01-05", "2026-01-11");
} catch (error) {
  console.log('Error:', error.message);  // Expected: CloudBeds API error
}

// Test 3: Empty date range
const empty = await fetchReservationsFromCloudBeds("6733", "2025-01-01", "2025-01-02");
console.log('Empty result:', empty);  // Expected: []
```

### Integration Testing (UI)

**Phase 2: Single Hostel**
1. Select week → Select Flamingo → Fetch → Verify dashboard shows data
2. Fetch same week again → Verify warning modal appears
3. Cancel fetch during loading → Verify state resets

**Phase 3: Multi-Hostel**
1. Select week → Fetch all hostels → Verify progress updates in real-time
2. Disconnect internet mid-fetch → Verify errors show, successful hostels preserved
3. Click cancel after 3 hostels → Verify loop stops, 3 hostels loaded

### Comparison Testing

**Verify data accuracy**:
1. Export Excel report from CloudBeds for week "06 Jan - 12 Jan"
2. Fetch same week via API
3. Compare metrics:
   - Total bookings match
   - Revenue matches (consider balance=0 issue)
   - ADR matches
   - Nest Pass counts match

---

## 📈 Performance Considerations

### API Call Performance

**Expected Timing** (per hostel):
- Network latency: ~500ms
- CloudBeds API processing: ~1-2s
- Data transformation: ~50ms
- **Total**: ~2-3 seconds per hostel

**Multi-Hostel Timing**:
- Sequential (11 hostels): ~22-33 seconds
- With 500ms delay between calls: ~27-38 seconds

**Optimization Options** (future):
- Parallel API calls (5 concurrent) → ~8-12 seconds
- Caching responses → instant for repeated fetches
- Backend proxy with batch endpoint → ~3-5 seconds

### UI Performance

**State Updates**:
- Update progress every API call (11 times max) → No performance issue
- Avoid re-rendering entire dashboard during fetch (use memo on child components)

**Memory Usage**:
- 15 bookings × 11 hostels = ~165 objects
- Each object ~500 bytes
- Total: ~82KB in memory → No issue

---

## 🔮 Future Extensibility

### Planned Enhancements (Out of Scope)

1. **Batch Fetching**
   ```javascript
   // Fetch multiple weeks at once
   fetchMultipleWeeks(['2026-01-05', '2026-01-12', '2026-01-19']);
   ```

2. **Accurate Pricing**
   ```javascript
   // Use getReservationDetails for balance=0 bookings
   const details = await getReservationDetails(reservationID);
   const actualPrice = details.grandTotal;
   ```

3. **Source Filtering UI**
   ```javascript
   // Allow filtering by multiple sources
   <SourceFilter options={['Website', 'Booking.com', 'Walk-In']} />
   ```

4. **Scheduled Fetching**
   ```javascript
   // Auto-fetch every Monday at 9am
   const schedule = { frequency: 'weekly', dayOfWeek: 1, hour: 9 };
   ```

5. **Data Export**
   ```javascript
   // Export API-fetched data to Excel
   exportToExcel(weeklyData, 'nests-analytics-2026-01-12.xlsx');
   ```

---

**Document Status**: Draft
**Last Updated**: 2026-01-12
**Dependencies**: Requires `00-overview.md` review
**Next Document**: `02-file-changes.md`
