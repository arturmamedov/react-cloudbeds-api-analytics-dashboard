# CloudBeds API Integration - Implementation Request

## 🎯 Project Context

I'm working on a **React Hostel Analytics Dashboard** for Nests Hostels (Spanish hostel chain). The app currently processes CloudBeds booking data through **Excel file uploads** or **copy-paste**, and I need to add **CloudBeds API** as a third input method.

**Current Tech Stack**:
- React 18 + Vite
- Tailwind CSS
- Functional components with hooks
- No external state management (local state only)

**Development Philosophy** (CRITICAL - READ CAREFULLY):
- ✅ **Simplicity over complexity** - Choose simpler solutions
- ✅ **Pragmatic over theoretical** - Real functionality trumps "best practices"
- ✅ **Low coupling** - Components should be independent and reusable
- ✅ **Proper encapsulation** - Components manage their own concerns
- ✅ **Incremental improvements** - No rewrites, only additions
- ✅ **Well-commented code** - Explain WHY, not just WHAT
- ✅ **DRY principles** - Reuse existing utilities and logic
- ❌ **NO over-engineering** - Avoid unnecessary abstractions
- ❌ **NO custom hooks** unless reused 3+ times
- ❌ **NO major architectural changes**

## 📁 Current Project Structure

```
src/
├── components/
│   ├── HostelAnalytics.jsx           # Main orchestrator (900+ lines)
│   ├── Dashboard/
│   │   ├── HostelCard.jsx
│   │   ├── LatestWeekSummary.jsx
│   │   ├── PerformanceTable.jsx
│   │   ├── MetricChange.jsx
│   │   ├── ExcelStyleView.jsx
│   │   └── NestedHostelTable.jsx
│   ├── DataInput/
│   │   ├── DataInputPanel.jsx        # Input method orchestrator
│   │   ├── WeekSelector.jsx          # Date selection component
│   │   └── WarningBanner.jsx
│   ├── Charts/
│   │   └── ReservationChart.jsx
│   └── Analysis/
│       └── AIAnalysisPanel.jsx
├── utils/
│   ├── index.js                      # Centralized exports
│   ├── dateUtils.js                  # Date calculations
│   ├── formatters.js                 # Currency formatting
│   ├── metricsCalculator.js          # Business logic (calculateHostelMetrics)
│   └── dataParser.js                 # Data transformation
├── config/
│   └── hostelConfig.js               # Hostel CloudBeds IDs
├── index.css                         # Tailwind + custom styles
└── main.jsx
```

## 🎨 Current Data Flow

```
User Input (Excel/Paste) 
    ↓
Parse data (parsePastedData or processFiles)
    ↓
Transform to booking format:
{
  reservation: string,
  bookingDate: string,
  checkin: string,
  checkout: string,
  nights: number,
  price: number,
  status: string,
  source: string,
  leadTime: number
}
    ↓
Filter for direct bookings (source includes "Sitio web")
    ↓
calculateHostelMetrics(bookings) - REUSABLE FUNCTION
    ↓
Returns: { count, cancelled, valid, revenue, adr, nestPass, monthly, avgLeadTime, bookings }
    ↓
Update weeklyData state
    ↓
Dashboard auto-updates
```

## 🔧 What Needs to Be Implemented

### Goal
Add **CloudBeds API** as a third data input method alongside Excel and Copy-Paste, **WITHOUT touching existing functionality**.

### Requirements

**1. API Integration**:
- Endpoint: `https://api.cloudbeds.com/api/v1.2/getReservations`
- Authentication: Bearer token (stored in `.env`)
- Parameters needed:
  - `propertyID` (from hostelConfig.js)
  - `reservationCreatedFrom` (date range start, format: `yyyy-mm-dd`)
  - `reservationCreatedTo` (date range end, format: `yyyy-mm-dd`)

**2. Data Requirements**:
- ONE API key for ALL hostels (11 properties)
- Property IDs are already in `hostelConfig.js` (correct for API use)
- Fetch ALL reservations, then filter client-side for "Sitio web" source
- Transform CloudBeds JSON → existing booking format
- Reuse existing `calculateHostelMetrics()` function

**3. User Workflow**:
- User selects "CloudBeds API" tab (third option)
- User selects ONE hostel from dropdown
- User selects week (reuse existing WeekSelector)
- User clicks "Fetch from CloudBeds" button
- Loading indicator shows during API call
- On success: Data processes through existing logic
- On error: Show error message, allow retry

**4. Error Handling**:
- Network errors → Display message
- Invalid API key → Display message
- No reservations found → Display message
- Malformed response → Display message
- Don't fall back to other methods, just show error

**5. Testing Approach**:
- Test with ONE hostel first (Flamingo, ID: 6733)
- Verify data matches Excel export
- Then expand to other hostels

## 📊 Existing Key Code References

### hostelConfig.js
```javascript
export const hostelConfig = {
    'Flamingo': { id: '6733', name: 'Flamingo' },
    'Puerto': { id: '316328', name: 'Puerto' },
    'Arena': { id: '315588', name: 'Arena' },
    'Duque': { id: '316438', name: 'Duque' },
    'Las Palmas': { id: '316428', name: 'Las Palmas' },
    'Aguere': { id: '316437', name: 'Aguere' },
    'Medano': { id: '316440', name: 'Medano' },
    'Los Amigos': { id: '316443', name: 'Los Amigos' },
    'Cisne': { id: '316442', name: 'Cisne' },
    'Ashavana': { id: '316441', name: 'Ashavana' },
    'Las Eras': { id: '316439', name: 'Las Eras' },
};
```

### calculateHostelMetrics() - MUST REUSE THIS
```javascript
// Location: src/utils/metricsCalculator.js
export const calculateHostelMetrics = (bookings) => {
    const cancelled = bookings.filter(b => b.status?.toLowerCase().includes('cancel'));
    const valid = bookings.filter(b => !b.status?.toLowerCase().includes('cancel'));

    const nestPass = valid.filter(b => (b.nights || 0) >= 7);
    const monthly = nestPass.filter(b => (b.nights || 0) >= 28);

    const totalRevenue = valid.reduce((sum, b) => sum + (b.price || 0), 0);
    const totalNights = valid.reduce((sum, b) => sum + (b.nights || 1), 0);
    const adr = totalNights > 0 ? totalRevenue / totalNights : 0;

    const avgLeadTime = valid
        .filter(b => b.leadTime !== null)
        .reduce((sum, b, _, arr) => sum + b.leadTime / arr.length, 0);

    return {
        count: bookings.length,
        cancelled: cancelled.length,
        valid: valid.length,
        revenue: totalRevenue,
        adr: adr,
        nestPass: nestPass.length,
        monthly: monthly.length,
        avgLeadTime: Math.round(avgLeadTime),
        bookings: bookings
    };
};
```

### Current Input Methods in DataInputPanel.jsx
```javascript
// Two buttons for input method selection
<button onClick={() => setInputMethod('file')} ...>
  Upload Files/Folders
</button>
<button onClick={() => setInputMethod('paste')} ...>
  Copy & Paste
</button>

// Then conditional rendering:
{inputMethod === 'file' && <FileUploadSection />}
{inputMethod === 'paste' && <PasteSection />}
```

## 📝 Implementation Requirements

### Files to CREATE (3 new files):

**1. `src/utils/cloudbedsApi.js`**
- Export function: `fetchReservationsFromCloudBeds(propertyID, startDate, endDate)`
- Make HTTP GET request to CloudBeds API
- Include Bearer token from environment variable
- Transform CloudBeds JSON response → booking format
- Handle all error cases (network, auth, empty, malformed)
- Add detailed comments explaining API response structure

**2. `src/components/DataInput/APIFetchPanel.jsx`**
- Show hostel dropdown (from hostelConfig)
- Show week selector (reuse WeekSelector component)
- "Fetch from CloudBeds" button
- Loading state (spinner + disabled button)
- Error/success messages
- Call parent callback with fetched data
- Follow existing component patterns (HostelCard, WeekSelector style)

**3. `.env`** (root directory)
```
VITE_CLOUDBEDS_API_KEY=your_key_here
VITE_CLOUDBEDS_API_BASE_URL=https://api.cloudbeds.com/api/v1.2
```

### Files to MODIFY (2 files):

**4. `src/components/DataInput/DataInputPanel.jsx`**
- Add third button: "CloudBeds API"
- Add conditional: `{inputMethod === 'api' && <APIFetchPanel ... />}`
- Pass props: selectedWeekStart, setSelectedWeekStart, isUploading, onAPIFetch callback
- Match existing button styling and layout

**5. `src/components/HostelAnalytics.jsx`**
- Add function: `processAPIData(bookings, hostelName, weekRange)`
- This function should:
  - Filter bookings for "Sitio web" source
  - Call `calculateHostelMetrics(bookings)`
  - Create weekData object (same structure as processFiles)
  - Update state with `setWeeklyData`
- Handle API-specific errors
- Add detailed comments

### File to UPDATE (if needed):

**6. `.gitignore`**
- Ensure `.env` is listed (probably already there)

## 🔍 CloudBeds API Specifications

### Endpoint
```
GET https://api.cloudbeds.com/api/v1.2/getReservations
```

### Headers
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/x-www-form-urlencoded
```

### Query Parameters
```
propertyID: string (e.g., "6733" for Flamingo)
reservationCreatedFrom: string (yyyy-mm-dd format)
reservationCreatedTo: string (yyyy-mm-dd format)
```

### Expected Response Structure
```json
{
  "success": true,
  "data": [
    {
      "reservationID": "ABC123",
      "propertyID": "6733",
      "dateCreated": "2024-12-17T10:30:00",
      "startDate": "2024-12-20",
      "endDate": "2024-12-22",
      "guestName": "John Doe",
      "balance": 150.00,
      "status": "confirmed",
      "source": "Website",
      "sourceName": "Sitio web o motor de reservas"
      // ... other fields
    }
  ]
}
```

### Mapping CloudBeds → Your Format
```javascript
CloudBeds Field          → Your Booking Format
─────────────────────────────────────────────
reservationID            → reservation
dateCreated              → bookingDate (parse date)
startDate                → checkin
endDate                  → checkout
balance (or totalAmount) → price
status                   → status
source/sourceName        → source
                         → nights (calculate: endDate - startDate)
                         → leadTime (calculate: startDate - dateCreated)
```

## 🎨 UI/UX Requirements

### Styling
- Use existing Tailwind classes and patterns
- Match DataInputPanel styling (file/paste sections)
- Use existing color scheme:
  - Nests Teal: `#53CED1`
  - Nests Green: `#53D195`
  - Error Red: `#D15653`
  - Loading Blue: standard blue
- Follow responsive design (mobile-first)

### Loading States
```javascript
// During fetch:
- Disable button
- Show spinner icon
- Text: "Fetching from CloudBeds..."

// Success:
- Show success message (green)
- Clear form
- Data appears in dashboard

// Error:
- Show error message (red)
- Re-enable button
- Allow retry
```

## 📋 Step-by-Step Implementation Plan

**IMPORTANT**: Before writing any code, create a planning folder with implementation guide.

### Step 0: Create Planning Documentation

Create folder: `docs/api-integration-plan/`

Create these files:
1. `00-overview.md` - Project summary and goals
2. `01-architecture.md` - Data flow diagrams and integration points
3. `02-file-changes.md` - Detailed list of files to create/modify
4. `03-implementation-steps.md` - Step-by-step coding sequence
5. `04-testing-checklist.md` - Testing scenarios and validation
6. `05-error-scenarios.md` - Error handling matrix
7. `06-rollback-plan.md` - How to revert if needed

### Step 1: Environment Setup
- Create `.env` file (with placeholder API key)
- Verify in `.gitignore`
- Test environment variable loading

### Step 2: API Utility
- Create `cloudbedsApi.js`
- Implement `fetchReservationsFromCloudBeds()`
- Add data transformation function
- Add comprehensive error handling
- Add detailed comments explaining CloudBeds API quirks

### Step 3: UI Component
- Create `APIFetchPanel.jsx`
- Build UI (hostel dropdown, week display, button)
- Add loading/error states
- Test with mock data first

### Step 4: Integration
- Modify `DataInputPanel.jsx` (add API button/section)
- Modify `HostelAnalytics.jsx` (add processAPIData function)
- Connect APIFetchPanel to HostelAnalytics callback
- Test data flow without API first

### Step 5: End-to-End Testing
- Test with Flamingo (ID: 6733)
- Verify data matches Excel export
- Test all error scenarios
- Test with different date ranges
- Clean up console logs

### Step 6: Documentation
- Update README.md (add API section)
- Add inline comments
- Document any CloudBeds API quirks discovered
- Create troubleshooting guide

## ⚠️ Critical Constraints

1. **DO NOT modify existing Excel/Paste functionality**
2. **DO NOT change existing utility functions**
3. **DO NOT add new dependencies** (use fetch API, already available)
4. **DO NOT create custom hooks**
5. **DO NOT change HostelAnalytics state structure**
6. **DO reuse calculateHostelMetrics() function**
7. **DO follow existing code patterns and conventions**
8. **DO add comprehensive comments**

## ✅ Success Criteria

- [ ] API fetches data for single hostel
- [ ] Data transforms correctly to booking format
- [ ] Filters for "Sitio web" source work
- [ ] calculateHostelMetrics() processes API data
- [ ] Dashboard updates with API data
- [ ] Excel and Paste methods still work unchanged
- [ ] Error handling works for all scenarios
- [ ] Code is well-commented
- [ ] No console errors
- [ ] Mobile responsive

## 🚀 Deliverables

1. **Planning documents** in `docs/api-integration-plan/`
2. **3 new files** (cloudbedsApi.js, APIFetchPanel.jsx, .env)
3. **2 modified files** (DataInputPanel.jsx, HostelAnalytics.jsx)
4. **Testing results** documented
5. **Comments** explaining key decisions
6. **README update** with API usage instructions

## 📞 Questions to Ask Me Before Coding

If anything is unclear or you need decisions:
1. Exact CloudBeds API response structure (if you need sample JSON)
2. Specific error message wording preferences
3. UI layout details for APIFetchPanel
4. Date format handling edge cases
5. Any additional fields needed from CloudBeds API

---

**START BY CREATING THE PLANNING DOCUMENTS FIRST**, then proceed with implementation step-by-step. Ask for confirmation before moving to the next major step.

Let's build this incrementally, following the pragmatic philosophy! 🚀