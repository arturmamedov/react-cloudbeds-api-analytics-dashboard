# Tax Breakdown Feature - REVISED Implementation Plan

## 🎯 Goal
Add optional tax breakdown display for API-fetched data using hybrid approach:
- **Fast**: Initial load with `getReservations` (total only)
- **Slow**: Background enrichment with `getReservation` (tax details)

## 📊 Strategy

### **Reality Check**
- `getReservations` (plural): Has `total`, NO `balanceDetailed` ❌
- `getReservation` (singular): Has `balanceDetailed` with tax breakdown ✅
- **Problem**: 100 bookings = 100 API calls = SLOW + rate limits

### **Solution: Two-Phase Approach**

#### **Phase 1: Fast Initial Load** (Already working)
```
getReservations → Use 'total' field → Dashboard shows immediately
```
- Display: `€65.10` (includes taxes, no breakdown)
- Speed: 2-3 seconds per property
- **This maintains current fast performance**

#### **Phase 2: Background Enrichment** (New feature)
```
User clicks "Enrich Tax Details" → getReservation for each booking → Update incrementally
```
- Display: `€58.18 + (€6.92 taxes)`
- Speed: ~500ms per booking + rate limit delays
- Progress: "Enriching... 45/100 bookings (23s elapsed)"

---

## 📝 Revised Implementation Steps

### **Step 0: Setup New Branch**
```bash
git checkout main
git pull origin main
git checkout -b feat/tax-breakdown-enrichment
```

---

### **PART A: Fix Current Revenue Field (Priority 1)**

### **Step 1: Fix CloudBeds API to use `total` field**
**File:** `src/utils/cloudbedsApi.js`

**Current (WRONG):**
```javascript
price: parseFloat(cbReservation.balance) || 0  // ❌ Balance = what's owed (0 if paid)
```

**Fixed:**
```javascript
price: parseFloat(cbReservation.total) || 0,  // ✅ Total with taxes
netPrice: null,  // Not available yet
taxes: null      // Not available yet
```

**Commit:** `fix(api): Use 'total' field instead of 'balance' for revenue`

**Testing:** Revenue should now show correctly for paid bookings

---

### **PART B: Tax Enrichment Feature (Optional)**

### **Step 2: Add Enrichment API Function**
**File:** `src/utils/cloudbedsApi.js`

**New Function:**
```javascript
/**
 * Enrich booking with detailed tax breakdown
 * Makes individual getReservation call for one booking
 *
 * @param {string} propertyID - CloudBeds property ID
 * @param {string} reservationID - Reservation ID
 * @returns {Promise<{netPrice, taxes}>} Tax breakdown
 */
export const enrichBookingWithTaxes = async (propertyID, reservationID) => {
  const API_KEY = import.meta.env.VITE_CLOUDBEDS_API_KEY;
  const BASE_URL = import.meta.env.VITE_CLOUDBEDS_API_BASE_URL;

  if (!API_KEY) throw new Error('CloudBeds API key not found');

  try {
    const url = `${BASE_URL}/getReservation?propertyID=${propertyID}&reservationID=${reservationID}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.ok) throw new Error(`API error: ${response.statusText}`);

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error('Invalid API response');
    }

    const reservation = result.data;

    // Extract tax breakdown
    return {
      netPrice: parseFloat(reservation.balanceDetailed?.subTotal) || null,
      taxes: parseFloat(reservation.balanceDetailed?.taxesFees) || null
    };

  } catch (error) {
    console.error(`Failed to enrich reservation ${reservationID}:`, error);
    return { netPrice: null, taxes: null };
  }
};
```

**Commit:** `feat(api): Add booking enrichment function for tax details`

---

### **Step 3: Add Enrichment State**
**File:** `src/components/HostelAnalytics.jsx`

**New State:**
```javascript
// Tax enrichment state
const [isEnriching, setIsEnriching] = useState(false);
const [enrichmentProgress, setEnrichmentProgress] = useState(null);
// Structure: { total, current, startTime, status: 'running'|'completed'|'cancelled' }
```

**Commit:** `feat(state): Add tax enrichment progress tracking`

---

### **Step 4: Create Enrichment Function**
**File:** `src/components/HostelAnalytics.jsx`

**New Function:**
```javascript
/**
 * Enrich current data with tax details
 * Makes individual API calls for each booking to get tax breakdown
 */
const enrichWithTaxDetails = useCallback(async () => {
  console.log('[HostelAnalytics] 🔄 Starting tax enrichment...');

  setIsEnriching(true);

  // Collect all bookings from all weeks/hostels
  const allBookings = [];
  weeklyData.forEach(week => {
    Object.entries(week.hostels).forEach(([hostelName, hostelData]) => {
      const hostelID = hostelConfig[hostelName]?.id;
      if (hostelID && hostelData.bookings) {
        hostelData.bookings.forEach(booking => {
          allBookings.push({
            ...booking,
            hostelName,
            hostelID,
            weekRange: week.week
          });
        });
      }
    });
  });

  const totalBookings = allBookings.length;
  console.log(`[HostelAnalytics] 📊 Enriching ${totalBookings} bookings...`);

  // Initialize progress
  setEnrichmentProgress({
    total: totalBookings,
    current: 0,
    startTime: Date.now(),
    status: 'running'
  });

  // Enrich each booking
  for (let i = 0; i < allBookings.length; i++) {
    const booking = allBookings[i];

    try {
      // Update progress
      setEnrichmentProgress(prev => ({
        ...prev,
        current: i + 1
      }));

      // Fetch tax details
      const taxData = await enrichBookingWithTaxes(booking.hostelID, booking.reservation);

      // Update booking in state
      if (taxData.netPrice != null) {
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
                      netPrice: taxData.netPrice,
                      taxes: taxData.taxes
                    };
                  })
                }
              }
            };
          });
        });
      }

      // Rate limiting: Wait 500ms between calls
      if (i < allBookings.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

    } catch (error) {
      console.error(`[HostelAnalytics] ❌ Failed to enrich ${booking.reservation}:`, error);
    }
  }

  // Complete
  setEnrichmentProgress(prev => ({ ...prev, status: 'completed' }));
  setIsEnriching(false);

  console.log('[HostelAnalytics] ✅ Tax enrichment complete!');
  alert(`✅ Tax enrichment complete!\n\nEnriched ${totalBookings} bookings with tax details.`);

}, [weeklyData]);
```

**Commit:** `feat(enrichment): Add tax enrichment function with progress tracking`

---

### **Step 5: Update Metrics Calculator**
**File:** `src/utils/metricsCalculator.js`

**Changes:**
- Calculate `netRevenue` and `totalTaxes` from bookings
- Add `hasTaxData` flag

**Commit:** `feat(metrics): Calculate net revenue and taxes from enriched data`

---

### **Step 6: Create Enrichment UI**
**File:** Create `src/components/TaxEnrichmentButton.jsx`

**Component:**
```jsx
const TaxEnrichmentButton = ({
  weeklyData,
  isEnriching,
  enrichmentProgress,
  onEnrich
}) => {
  // Only show if we have API data without tax details
  const hasAPIData = weeklyData.some(week =>
    Object.values(week.hostels).some(h => h.bookings?.length > 0)
  );

  const hasTaxData = weeklyData.some(week =>
    Object.values(week.hostels).some(h =>
      h.bookings?.some(b => b.netPrice != null)
    )
  );

  if (!hasAPIData || hasTaxData) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onEnrich}
        disabled={isEnriching}
        className="px-4 py-2 bg-nests-teal text-white rounded-lg hover:bg-nests-teal-dark disabled:opacity-50"
      >
        {isEnriching ? 'Enriching...' : 'Enrich with Tax Details'}
      </button>

      {enrichmentProgress && enrichmentProgress.status === 'running' && (
        <div className="text-sm text-gray-600 font-mono">
          {enrichmentProgress.current}/{enrichmentProgress.total}
          ({Math.round((enrichmentProgress.current / enrichmentProgress.total) * 100)}%)
          • {Math.floor((Date.now() - enrichmentProgress.startTime) / 1000)}s
        </div>
      )}
    </div>
  );
};
```

**Commit:** `feat(ui): Create tax enrichment button with progress`

---

### **Step 7: Add to Navbar**
**File:** `src/components/HostelAnalytics.jsx`

**In render, add to header:**
```jsx
<TaxEnrichmentButton
  weeklyData={weeklyData}
  isEnriching={isEnriching}
  enrichmentProgress={enrichmentProgress}
  onEnrich={enrichWithTaxDetails}
/>
```

**Commit:** `feat(ui): Add tax enrichment to navbar`

---

### **Step 8: Add Tax Toggle (When Tax Data Exists)**
**File:** Create `src/components/TaxToggle.jsx`

**Component:**
```jsx
const TaxToggle = ({ showTaxBreakdown, setShowTaxBreakdown, hasTaxData }) => {
  if (!hasTaxData) return null;

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={showTaxBreakdown}
        onChange={(e) => setShowTaxBreakdown(e.target.checked)}
        className="w-4 h-4 text-nests-teal"
      />
      <span className="text-sm text-gray-700">Show Tax Breakdown</span>
    </label>
  );
};
```

**Commit:** `feat(ui): Create tax breakdown toggle`

---

### **Step 9: Create Revenue Formatter**
**File:** `src/utils/formatters.js`

**Already described in original plan**

**Commit:** `feat(formatters): Add revenue formatter with tax breakdown`

---

### **Steps 10-14: Update All Views**
Same as original plan - update all components to use `formatRevenue()`

---

## ⚡ User Experience Flow

### **Scenario 1: First Time User**
1. Fetch week data → Shows `€65.10` (fast)
2. See "Enrich with Tax Details" button in navbar
3. Click → Progress shows "Enriching... 45/100 (23s)"
4. When complete → Toggle "Show Tax Breakdown" appears
5. Enable toggle → Shows `€58.18 + (€6.92 taxes)`

### **Scenario 2: Already Enriched**
1. Data has tax details → Button hidden
2. Toggle visible immediately
3. Can switch between views instantly

### **Scenario 3: Mixed Data**
1. Some weeks enriched, some not
2. Button shows if ANY week needs enrichment
3. Only enriches bookings without tax data

---

## 📊 Performance Analysis

### **Example: 100 bookings per week**
- **Phase 1 (Fast Load)**: 2-3 seconds ✅
- **Phase 2 (Enrichment)**:
  - 100 calls × 500ms = 50 seconds
  - Plus 500ms rate limit delays = ~100 seconds total
  - **User sees progress**: "Enriching... 45/100 (45s)"

### **Optimization Options**
1. **Batch mode**: Enrich in groups of 10 (slower but safer)
2. **Cancel button**: Allow user to stop enrichment
3. **Cache results**: Store in localStorage to avoid re-enrichment
4. **Smart refresh**: Only enrich new bookings when updating week

---

## ✅ Success Criteria

- [ ] Step 1: Revenue shows correctly with `total` field
- [ ] Enrichment button appears when API data present
- [ ] Progress shows during enrichment
- [ ] Data updates incrementally (see changes in real-time)
- [ ] Toggle appears after enrichment complete
- [ ] Tax breakdown displays in all views
- [ ] Fast initial load maintained (2-3 seconds)
- [ ] No rate limit errors (500ms delays working)

---

## 🚀 Deployment Priority

**Priority 1 (Critical Fix):**
- Step 1: Fix revenue field (`total` instead of `balance`)
- **Deploy immediately** - this fixes broken revenue display

**Priority 2 (Enhancement):**
- Steps 2-14: Tax enrichment feature
- **Deploy when ready** - optional feature, doesn't break anything

---

**Questions before proceeding?**
