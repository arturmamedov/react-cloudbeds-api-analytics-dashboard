# Revenue Enrichment & Tax Breakdown Feature - Implementation Plan

## 🎯 Goal
Add background revenue enrichment with detailed tax breakdown for CloudBeds API-fetched data.

## 📊 Problem Statement

### Current State (After CloudBeds API Integration)
- `getReservations` (plural) endpoint returns only `balance` field
- `balance` = €0 for paid bookings (outstanding amount owed)
- **Revenue is incorrectly showing €0 for all paid reservations**

### Reality
- `getReservations` (plural): ❌ NO `total`, NO `balanceDetailed`
- `getReservation` (singular): ✅ HAS `total`, `balanceDetailed.subTotal`, `balanceDetailed.taxesFees`

### Solution: Two-Phase Hybrid Approach
1. **Keep current fast load** (uses `balance` - broken but fast)
2. **Add manual enrichment** (fetches individual details - slow but accurate)

---

## 🔄 User Flow

### Phase 1: Fast Load (Current - Stays Unchanged)
```
User fetches week → getReservations → Shows €0 revenue (WRONG) → Fast (2-3s)
```

### Phase 2: Manual Enrichment (NEW Feature)
```
1. User sees "Enrich Revenue Data" button (inside APIFetchPanel)
2. Clicks button
3. Progress shows: "Enriching 23/100 bookings (4min 20s)"
4. Cancel button available
5. Data updates incrementally
6. When complete: "Show Tax Breakdown" toggle appears
7. Toggle ON: €52.73 + (€6.37 taxes)
```

---

## 📋 Implementation Steps

### **Step 0: Branch Setup** ✅ DONE
```bash
git checkout main
git pull origin main
git checkout -b feat/revenue-enrichment-tax-breakdown
```

---

### **Step 1: Add Enrichment API Function**
**File:** `src/utils/cloudbedsApi.js`

**New Export:**
```javascript
/**
 * Enrich single booking with detailed revenue breakdown
 *
 * Makes individual getReservation API call to fetch:
 * - total: Grand total with taxes
 * - netPrice: Revenue without taxes (subTotal)
 * - taxes: Tax amount (taxesFees)
 *
 * @param {string} propertyID - CloudBeds property ID
 * @param {string} reservationID - Reservation ID to enrich
 * @returns {Promise<{total, netPrice, taxes}>} Revenue breakdown
 * @throws {Error} If API call fails
 */
export const enrichBookingRevenue = async (propertyID, reservationID) => {
  const API_KEY = import.meta.env.VITE_CLOUDBEDS_API_KEY;
  const BASE_URL = import.meta.env.VITE_CLOUDBEDS_API_BASE_URL || 'https://api.cloudbeds.com/api/v1.3';
  const TIMEOUT = parseInt(import.meta.env.VITE_CLOUDBEDS_API_TIMEOUT) || 10000;

  if (!API_KEY) {
    throw new Error('CloudBeds API key not configured in .env');
  }

  try {
    const url = `${BASE_URL}/getReservation?propertyID=${propertyID}&reservationID=${reservationID}`;

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

    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error('Invalid API response structure');
    }

    const reservation = result.data;

    // Extract revenue breakdown
    const total = parseFloat(reservation.total) || 0;
    const netPrice = parseFloat(reservation.balanceDetailed?.subTotal) || null;
    const taxes = parseFloat(reservation.balanceDetailed?.taxesFees) || null;

    return { total, netPrice, taxes };

  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${TIMEOUT}ms`);
    }
    throw error;
  }
};
```

**Commit:** `feat(api): Add enrichBookingRevenue function for detailed revenue breakdown`

---

### **Step 2: Add Enrichment State**
**File:** `src/components/HostelAnalytics.jsx`

**New State Variables:**
```javascript
// Revenue enrichment state (after line ~48)
const [isEnriching, setIsEnriching] = useState(false);
const [enrichmentProgress, setEnrichmentProgress] = useState(null);
const [enrichmentCancelled, setEnrichmentCancelled] = useState(false);

// Structure of enrichmentProgress:
// {
//   mode: 'enrichment',
//   current: 23,
//   total: 100,
//   startTime: Date.now(),
//   hostels: [
//     {
//       name: 'Flamingo',
//       reservationID: '123',
//       status: 'loading'|'success'|'error',
//       error: null
//     }
//   ]
// }
```

**Commit:** `feat(state): Add revenue enrichment state tracking`

---

### **Step 3: Create Enrichment Function**
**File:** `src/components/HostelAnalytics.jsx`

**New Function:**
```javascript
/**
 * Enrich API-fetched bookings with detailed revenue breakdown
 *
 * Process:
 * 1. Collect all bookings that have reservationID (from API fetch)
 * 2. Call enrichBookingRevenue for each booking
 * 3. Update booking objects with: { total, netPrice, taxes }
 * 4. Show real-time progress
 * 5. Allow cancellation
 *
 * Rate Limiting: 100ms between calls (CloudBeds allows 10 requests/second)
 */
const enrichWithRevenueDetails = useCallback(async () => {
  console.log('[HostelAnalytics] 🔄 Starting revenue enrichment...');

  setIsEnriching(true);
  setEnrichmentCancelled(false);

  // Collect all bookings with reservationIDs (from API)
  const allBookings = [];
  weeklyData.forEach(week => {
    Object.entries(week.hostels).forEach(([hostelName, hostelData]) => {
      const hostelID = hostelConfig[hostelName]?.id;
      if (hostelID && hostelData.bookings) {
        hostelData.bookings.forEach(booking => {
          // Only enrich if has reservationID and not already enriched
          if (booking.reservation && booking.total == null) {
            allBookings.push({
              ...booking,
              hostelName,
              hostelID,
              weekRange: week.week
            });
          }
        });
      }
    });
  });

  const totalBookings = allBookings.length;

  if (totalBookings === 0) {
    alert('No bookings to enrich. Make sure you have fetched data from CloudBeds API first.');
    setIsEnriching(false);
    return;
  }

  console.log(`[HostelAnalytics] 📊 Found ${totalBookings} bookings to enrich`);

  // Initialize progress
  setEnrichmentProgress({
    mode: 'enrichment',
    current: 0,
    total: totalBookings,
    startTime: Date.now(),
    hostels: allBookings.map(b => ({
      name: b.hostelName,
      reservationID: b.reservation,
      status: 'pending',
      error: null
    }))
  });

  // Get rate limit delay from .env (default 100ms = 10 requests/second)
  const rateLimitMs = parseInt(import.meta.env.VITE_CLOUDBEDS_API_DELAY_MS) || 100;

  // Enrich each booking
  for (let i = 0; i < allBookings.length; i++) {
    // Check if cancelled
    if (enrichmentCancelled) {
      console.log('[HostelAnalytics] ⏹️  Enrichment cancelled by user');
      break;
    }

    const booking = allBookings[i];
    const bookingStartTime = Date.now();

    // Update progress - mark as loading
    setEnrichmentProgress(prev => ({
      ...prev,
      current: i + 1,
      hostels: prev.hostels.map((h, idx) =>
        idx === i ? { ...h, status: 'loading' } : h
      )
    }));

    try {
      console.log(`[HostelAnalytics] [${i + 1}/${totalBookings}] Enriching ${booking.hostelName} - ${booking.reservation}`);

      // Fetch detailed revenue
      const { total, netPrice, taxes } = await enrichBookingRevenue(booking.hostelID, booking.reservation);

      const elapsed = Date.now() - bookingStartTime;
      console.log(`[HostelAnalytics] ✅ Success: €${total} (${(elapsed / 1000).toFixed(1)}s)`);

      // Update booking in state
      setWeeklyData(prev => {
        return prev.map(week => {
          if (week.week !== booking.weekRange) return week;

          return {
            ...week,
            hostels: {
              ...week.hostels,
              [booking.hostelName]: {
                ...week.hostels[booking.hostelName],
                bookings: week.hostels[booking.hostelName].bookings.map(b => {
                  if (b.reservation !== booking.reservation) return b;
                  return {
                    ...b,
                    total: total,
                    netPrice: netPrice,
                    taxes: taxes
                  };
                })
              }
            }
          };
        });
      });

      // Update progress - mark as success
      setEnrichmentProgress(prev => ({
        ...prev,
        hostels: prev.hostels.map((h, idx) =>
          idx === i ? { ...h, status: 'success' } : h
        )
      }));

      // Rate limiting: Wait before next call
      if (i < allBookings.length - 1 && !enrichmentCancelled) {
        console.log(`[HostelAnalytics] ⏱️  Waiting ${rateLimitMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, rateLimitMs));
      }

    } catch (error) {
      console.error(`[HostelAnalytics] ❌ Failed to enrich ${booking.reservation}:`, error);

      // Update progress - mark as error
      setEnrichmentProgress(prev => ({
        ...prev,
        hostels: prev.hostels.map((h, idx) =>
          idx === i ? { ...h, status: 'error', error: error.message } : h
        )
      }));
    }
  }

  // Complete
  const successCount = allBookings.filter((b, i) =>
    enrichmentProgress?.hostels[i]?.status === 'success'
  ).length;

  setIsEnriching(false);

  console.log(`[HostelAnalytics] 🏁 Enrichment complete: ${successCount}/${totalBookings} successful`);

  alert(`✅ Revenue enrichment complete!\n\n${successCount}/${totalBookings} bookings enriched successfully.`);

}, [weeklyData, enrichmentCancelled]);
```

**Cancel Function:**
```javascript
/**
 * Cancel ongoing enrichment process
 */
const cancelEnrichment = useCallback(() => {
  console.log('[HostelAnalytics] ⏹️  Cancelling enrichment...');
  setEnrichmentCancelled(true);
}, []);
```

**Commit:** `feat(enrichment): Add enrichWithRevenueDetails function with cancellation support`

---

### **Step 4: Detect if Enrichment is Needed**
**File:** `src/components/HostelAnalytics.jsx`

**Helper Function:**
```javascript
/**
 * Check if data has bookings that can be enriched
 * Returns true if any booking has reservationID but no total
 */
const canEnrichRevenue = useMemo(() => {
  return weeklyData.some(week =>
    Object.values(week.hostels).some(hostelData =>
      hostelData.bookings?.some(b =>
        b.reservation && b.total == null
      )
    )
  );
}, [weeklyData]);
```

**Commit:** `feat(enrichment): Add canEnrichRevenue detection helper`

---

### **Step 5: Pass Enrichment Props to APIFetchPanel**
**File:** `src/components/HostelAnalytics.jsx`

**Update APIFetchPanel props (around line 728):**
```javascript
<APIFetchPanel
  selectedWeekStart={selectedWeekStart}
  setSelectedWeekStart={setSelectedWeekStart}
  onFetchStart={handleAPIFetchStart}
  isUploading={isUploading}
  apiFetchProgress={apiFetchProgress}
  // NEW: Enrichment props
  canEnrichRevenue={canEnrichRevenue}
  isEnriching={isEnriching}
  enrichmentProgress={enrichmentProgress}
  onEnrichStart={enrichWithRevenueDetails}
  onEnrichCancel={cancelEnrichment}
/>
```

**Commit:** `feat(enrichment): Pass enrichment props to APIFetchPanel`

---

### **Step 6: Update APIFetchPanel Component**
**File:** `src/components/DataInput/APIFetchPanel.jsx`

**Update Props:**
```javascript
const APIFetchPanel = ({
  selectedWeekStart,
  setSelectedWeekStart,
  onFetchStart,
  isUploading,
  apiFetchProgress,  // Fetch progress
  // NEW: Enrichment props
  canEnrichRevenue,
  isEnriching,
  enrichmentProgress,
  onEnrichStart,
  onEnrichCancel
}) => {
```

**Add Enrich Button (after fetch button, around line 293):**
```jsx
{/* ============================================================ */}
{/* REVENUE ENRICHMENT BUTTON */}
{/* ============================================================ */}

{canEnrichRevenue && !isUploading && (
  <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
    <div className="flex items-center gap-2 mb-2">
      <AlertCircle className="w-5 h-5 text-yellow-600" />
      <h4 className="font-semibold text-gray-800">Revenue Data Missing</h4>
    </div>
    <p className="text-sm text-gray-700 mb-3">
      The fast fetch retrieved booking IDs but not revenue details.
      Click below to fetch complete revenue breakdown (total + taxes).
    </p>
    <p className="text-xs text-gray-600 mb-3">
      ⚠️ This takes time: ~100ms per booking. 100 bookings = ~10 seconds.
    </p>
    <button
      onClick={onEnrichStart}
      disabled={isEnriching}
      className={`w-full px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 ${
        isEnriching
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-yellow-500 hover:bg-yellow-600 text-white'
      }`}
    >
      {isEnriching ? (
        <>
          <Loader className="w-4 h-4 animate-spin" />
          <span>Enriching Revenue Data...</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          <span>Enrich Revenue Data</span>
        </>
      )}
    </button>
  </div>
)}
```

**Add Enrichment Progress Display (reuse/modify existing progress, around line 398):**
```jsx
{/* ============================================================ */}
{/* ENRICHMENT PROGRESS DISPLAY (Reuses fetch progress styling) */}
{/* ============================================================ */}

{isEnriching && enrichmentProgress && (
  <div className="border-2 border-yellow-500 rounded-lg p-4 bg-yellow-50 space-y-3 mt-4">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="text-sm font-mono text-gray-700 font-semibold">
        💰 ENRICHING REVENUE DATA...
      </div>
      {/* Cancel Button */}
      <button
        onClick={onEnrichCancel}
        className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition"
      >
        Cancel
      </button>
    </div>

    {/* Progress Bar */}
    <div className="space-y-1">
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-full transition-all duration-300"
          style={{ width: `${(enrichmentProgress.current / enrichmentProgress.total) * 100}%` }}
        />
      </div>
      <div className="text-xs text-gray-600 font-mono">
        {enrichmentProgress.current}/{enrichmentProgress.total} (
        {Math.round((enrichmentProgress.current / enrichmentProgress.total) * 100)}%)
        • {Math.floor((Date.now() - enrichmentProgress.startTime) / 1000)}s elapsed
      </div>
    </div>

    {/* Booking Status List (Scrollable) */}
    <div className="max-h-48 overflow-y-auto space-y-1 font-mono text-xs">
      {enrichmentProgress.hostels.map((item, idx) => (
        <div
          key={idx}
          className={`flex items-center justify-between p-2 rounded ${
            item.status === 'success' ? 'bg-green-50' :
            item.status === 'error' ? 'bg-red-50' :
            item.status === 'loading' ? 'bg-blue-50' :
            'bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            {item.status === 'success' && <span className="text-green-600">✓</span>}
            {item.status === 'error' && <span className="text-red-600">✗</span>}
            {item.status === 'loading' && <span className="text-blue-600">⏳</span>}
            {item.status === 'pending' && <span className="text-gray-400">⏸</span>}
            <span className="font-medium">{item.name}</span>
          </div>
          <div className="text-xs">
            {item.status === 'loading' && <span className="text-blue-600 animate-pulse">Fetching...</span>}
            {item.status === 'error' && <span className="text-red-600">{item.error}</span>}
          </div>
        </div>
      ))}
    </div>

    {/* Summary */}
    <div className="flex items-center justify-between text-sm pt-2 border-t">
      <div className="text-gray-700 font-mono">
        ⚡ {enrichmentProgress.hostels.filter(h => h.status === 'success').length} successful,{' '}
        {enrichmentProgress.hostels.filter(h => h.status === 'error').length} failed
      </div>
    </div>
  </div>
)}
```

**Commit:** `feat(ui): Add enrichment button and progress display to APIFetchPanel`

---

### **Step 7: Update Metrics Calculator**
**File:** `src/utils/metricsCalculator.js`

**Update calculateHostelMetrics:**
```javascript
export const calculateHostelMetrics = (bookings) => {
    const cancelled = bookings.filter(b => b.status?.toLowerCase().includes('cancel'));
    const valid = bookings.filter(b => !b.status?.toLowerCase().includes('cancel'));

    // Nest Pass calculations
    const nestPass = valid.filter(b => (b.nights || 0) >= 7);
    const monthly = nestPass.filter(b => (b.nights || 0) >= 28);

    // Revenue calculations
    // Use 'total' if available (enriched), otherwise 'price' (original), fallback to 'balance'
    const totalRevenue = valid.reduce((sum, b) => sum + (b.total || b.price || b.balance || 0), 0);
    const netRevenue = valid.reduce((sum, b) => sum + (b.netPrice || 0), 0);
    const totalTaxes = valid.reduce((sum, b) => sum + (b.taxes || 0), 0);

    const totalNights = valid.reduce((sum, b) => sum + (b.nights || 1), 0);
    const adr = totalNights > 0 ? totalRevenue / totalNights : 0;
    const netAdr = totalNights > 0 ? netRevenue / totalNights : 0;

    const avgLeadTime = valid
        .filter(b => b.leadTime !== null)
        .reduce((sum, b, _, arr) => sum + b.leadTime / arr.length, 0);

    // Check if any booking has tax data
    const hasTaxData = valid.some(b => b.netPrice != null && b.taxes != null);

    return {
        count: bookings.length,
        cancelled: cancelled.length,
        valid: valid.length,
        revenue: totalRevenue,         // Total with taxes
        netRevenue: netRevenue,         // Total without taxes (NEW)
        taxes: totalTaxes,              // Total taxes (NEW)
        adr: adr,                       // ADR with taxes
        netAdr: netAdr,                 // ADR without taxes (NEW)
        nestPass: nestPass.length,
        monthly: monthly.length,
        avgLeadTime: Math.round(avgLeadTime),
        bookings: bookings,
        hasTaxData: hasTaxData          // Flag if enriched (NEW)
    };
};
```

**Commit:** `feat(metrics): Add net revenue and tax calculation support`

---

### **Step 8: Add Tax Breakdown Toggle State**
**File:** `src/components/HostelAnalytics.jsx`

**New State:**
```javascript
// Tax breakdown display toggle (after enrichmentProgress state)
const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

// Check if any hostel has tax data
const hasTaxData = useMemo(() => {
  return weeklyData.some(week =>
    Object.values(week.hostels).some(h => h.hasTaxData)
  );
}, [weeklyData]);
```

**Commit:** `feat(state): Add tax breakdown toggle state`

---

### **Step 9: Create Tax Toggle Component**
**File:** Create `src/components/TaxToggle.jsx`

```javascript
/**
 * TaxToggle Component
 *
 * Checkbox toggle to show/hide tax breakdown in revenue displays.
 * Only visible when enriched data with tax details exists.
 *
 * @param {boolean} showTaxBreakdown - Current toggle state
 * @param {Function} setShowTaxBreakdown - Toggle state setter
 * @param {boolean} hasTaxData - Whether any data has tax breakdown
 */
import React from 'react';

const TaxToggle = ({ showTaxBreakdown, setShowTaxBreakdown, hasTaxData }) => {
  // Only show if enriched data exists
  if (!hasTaxData) return null;

  return (
    <label className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-white rounded-lg border-2 border-nests-teal shadow-sm hover:shadow-md transition">
      <input
        type="checkbox"
        checked={showTaxBreakdown}
        onChange={(e) => setShowTaxBreakdown(e.target.checked)}
        className="w-4 h-4 text-nests-teal focus:ring-nests-teal cursor-pointer"
      />
      <span className="text-sm font-medium text-gray-700">
        Show Tax Breakdown
      </span>
    </label>
  );
};

export default TaxToggle;
```

**Commit:** `feat(ui): Create TaxToggle component`

---

### **Step 10: Add Tax Toggle to Header**
**File:** `src/components/HostelAnalytics.jsx`

**Import:**
```javascript
import TaxToggle from './TaxToggle';
```

**Add to render (in header, around line 695):**
```jsx
{/* Header with View Toggle and Tax Toggle */}
<div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
  {/* View Mode Toggle */}
  <div className="flex gap-2">
    {/* ... existing Dashboard/Excel buttons ... */}
  </div>

  {/* Tax Breakdown Toggle */}
  <TaxToggle
    showTaxBreakdown={showTaxBreakdown}
    setShowTaxBreakdown={setShowTaxBreakdown}
    hasTaxData={hasTaxData}
  />
</div>
```

**Commit:** `feat(ui): Add TaxToggle to navbar`

---

### **Step 11: Create Revenue Formatter**
**File:** `src/utils/formatters.js`

**Add New Formatter:**
```javascript
/**
 * Format revenue with optional tax breakdown
 *
 * When showBreakdown is true and tax data available:
 * - Displays: €52.73 + (€6.37 taxes)
 *
 * When showBreakdown is false or no tax data:
 * - Displays: €59.10
 *
 * @param {number} total - Total revenue (with taxes)
 * @param {number|null} netPrice - Revenue without taxes
 * @param {number|null} taxes - Tax amount
 * @param {boolean} showBreakdown - Whether to show breakdown
 * @returns {string} Formatted revenue string
 */
export const formatRevenue = (total, netPrice, taxes, showBreakdown) => {
  // If breakdown requested and data available
  if (showBreakdown && netPrice != null && taxes != null) {
    return `€${netPrice.toFixed(2)} + (€${taxes.toFixed(2)} taxes)`;
  }

  // Default: show total only
  return `€${total.toFixed(2)}`;
};

/**
 * Format ADR with optional tax breakdown
 * Same as formatRevenue but for ADR values
 */
export const formatADR = formatRevenue;  // Reuse same logic
```

**Commit:** `feat(formatters): Add formatRevenue with tax breakdown support`

---

### **Step 12: Update Components to Use formatRevenue**
This step involves updating multiple components. I'll create one commit per component:

**12.1: HostelCard**
**12.2: PerformanceTable**
**12.3: ExcelStyleView**
**12.4: LatestWeekSummary**

Each commit message: `feat(ui): Add tax breakdown support to [ComponentName]`

---

### **Step 13: Update Documentation**
**Files:** `README.md`, `CLAUDE.md`

**Commit:** `docs: Add revenue enrichment and tax breakdown documentation`

---

### **Step 14: Testing & Final Push**
- Test enrichment flow
- Test cancellation
- Test tax breakdown toggle
- Push to remote

**Commit:** `chore: Final testing and cleanup`

---

## ✅ Success Criteria

- [ ] Enrichment button appears only when API data present
- [ ] Enrichment shows real-time progress
- [ ] Cancel button stops enrichment mid-process
- [ ] Data updates incrementally during enrichment
- [ ] Tax toggle appears after enrichment completes
- [ ] Toggle changes all revenue displays across all views
- [ ] 100ms rate limit delay respected (10 requests/second)
- [ ] Works with mixed data (enriched + non-enriched)
- [ ] DRY: Progress UI reused from APIFetchPanel
- [ ] SOLID: Separate concerns (API, state, UI, formatters)
- [ ] Well-commented code

---

## 📦 Files Modified/Created

**New Files (1):**
- `src/components/TaxToggle.jsx`

**Modified Files (6):**
- `src/utils/cloudbedsApi.js` - Add enrichBookingRevenue
- `src/components/HostelAnalytics.jsx` - Enrichment logic
- `src/components/DataInput/APIFetchPanel.jsx` - Enrichment UI
- `src/utils/metricsCalculator.js` - Net revenue calculations
- `src/utils/formatters.js` - formatRevenue helper
- Components (HostelCard, PerformanceTable, etc.) - Use formatRevenue

**Documentation:**
- `README.md`
- `CLAUDE.md`

---

**Ready to implement!** 🚀
