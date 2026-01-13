# Tax Breakdown Feature - Implementation Plan

## 🎯 Goal
Add optional tax breakdown display for API-fetched data, showing net revenue + taxes separately.

## 📊 Current vs Desired Behavior

### Current Display:
- Revenue: **€65.10** (total with taxes)
- ADR: **€32.55** (total/nights)

### With Tax Toggle ENABLED:
- Revenue: **€58.18 + (€6.92 taxes)**
- ADR: **€29.09 + (€3.46 taxes)**

## 🔧 Implementation Strategy

### **Option A: Store at Booking Level** ✅ SELECTED
**Why?**
- Future-proof for filtering/analytics
- Can detect if data has tax breakdown
- Minimal storage overhead

**Booking Object Structure:**
```javascript
{
  reservation: "5162593544737",
  bookingDate: "2026-01-09",
  checkin: "2026-01-09",
  checkout: "2026-01-10",
  nights: 1,
  price: 65.10,           // grandTotal (with taxes)
  netPrice: 58.18,        // subTotal (without taxes) - NEW
  taxes: 6.92,            // taxesFees - NEW
  status: "checked_out",
  source: "Walk-In",
  leadTime: 0
}
```

### **Option A: Global Toggle in Navbar** ✅ SELECTED
**Why?**
- Single source of truth
- Consistent across all views
- Easy to implement

**Behavior:**
- Toggle appears ONLY when `weeklyData` contains at least one API-fetched booking with tax data
- When no API data exists → toggle hidden
- State managed in `HostelAnalytics.jsx`, passed down to all components

### **Option A: Replace Amounts Completely** ✅ SELECTED
**Display Logic:**
```javascript
// showTaxBreakdown = false (default)
€65.10

// showTaxBreakdown = true
€58.18 + (€6.92 taxes)
```

---

## 📝 Step-by-Step Implementation

### **Step 0: Setup New Branch**
```bash
git checkout main
git pull origin main
git checkout -b feat/tax-breakdown-display
```

### **Step 1: Update CloudBeds API Data Transformation**
**File:** `src/utils/cloudbedsApi.js`

**Changes:**
- Change `price` field to use `balanceDetailed.grandTotal` instead of `balance`
- Add `netPrice: balanceDetailed.subTotal`
- Add `taxes: balanceDetailed.taxesFees`
- Add fallback for old data without `balanceDetailed`

**Commit:** `feat(api): Extract tax breakdown from CloudBeds API response`

---

### **Step 2: Update Metrics Calculator**
**File:** `src/utils/metricsCalculator.js`

**Changes:**
- Calculate `netRevenue` (sum of netPrice)
- Calculate `totalTaxes` (sum of taxes)
- Return in metrics object:
  ```javascript
  {
    revenue: totalRevenue,      // With taxes (existing)
    netRevenue: netRevenue,     // Without taxes (NEW)
    taxes: totalTaxes,          // Total taxes (NEW)
    hasTaxData: bookings.some(b => b.taxes != null)  // Detection flag (NEW)
  }
  ```

**Commit:** `feat(metrics): Add net revenue and tax calculation support`

---

### **Step 3: Add Global State in HostelAnalytics**
**File:** `src/components/HostelAnalytics.jsx`

**Changes:**
- Add state: `const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);`
- Add computed value: `const hasTaxData = weeklyData.some(week => /* check if any hostel has hasTaxData */)`
- Pass `showTaxBreakdown` and `hasTaxData` to navbar component

**Commit:** `feat(ui): Add global tax breakdown toggle state`

---

### **Step 4: Create Toggle Component in Navbar**
**File:** Create `src/components/TaxToggle.jsx`

**Component:**
```jsx
const TaxToggle = ({ showTaxBreakdown, setShowTaxBreakdown, hasTaxData }) => {
  if (!hasTaxData) return null;  // Hide if no tax data

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={showTaxBreakdown}
          onChange={(e) => setShowTaxBreakdown(e.target.checked)}
          className="..."
        />
        <span>Show Tax Breakdown</span>
      </label>
    </div>
  );
};
```

**Commit:** `feat(ui): Create tax breakdown toggle component`

---

### **Step 5: Add Toggle to Navbar**
**File:** `src/components/HostelAnalytics.jsx` (render section)

**Changes:**
- Add `<TaxToggle>` component to header/navbar area
- Style to match existing navbar

**Commit:** `feat(ui): Add tax toggle to navbar`

---

### **Step 6: Create Revenue Display Formatter**
**File:** `src/utils/formatters.js`

**New Function:**
```javascript
/**
 * Format revenue with optional tax breakdown
 * @param {number} total - Total revenue (with taxes)
 * @param {number} net - Net revenue (without taxes)
 * @param {number} taxes - Tax amount
 * @param {boolean} showBreakdown - Whether to show breakdown
 * @returns {string} Formatted string
 */
export const formatRevenue = (total, net, taxes, showBreakdown) => {
  if (!showBreakdown || net == null || taxes == null) {
    return `€${total.toFixed(2)}`;
  }
  return `€${net.toFixed(2)} + (€${taxes.toFixed(2)} taxes)`;
};
```

**Commit:** `feat(formatters): Add revenue formatter with tax breakdown support`

---

### **Step 7: Update HostelCard Component**
**File:** `src/components/Dashboard/HostelCard.jsx`

**Changes:**
- Accept `showTaxBreakdown` prop
- Replace `formatCurrency(revenue)` with `formatRevenue(revenue, netRevenue, taxes, showTaxBreakdown)`
- Update ADR display similarly

**Commit:** `feat(ui): Update HostelCard to support tax breakdown display`

---

### **Step 8: Update PerformanceTable Component**
**File:** `src/components/Dashboard/PerformanceTable.jsx`

**Changes:**
- Accept `showTaxBreakdown` prop
- Update revenue cells to use `formatRevenue()`
- Update ADR cells to use `formatRevenue()` for ADR breakdown

**Commit:** `feat(ui): Update PerformanceTable to support tax breakdown display`

---

### **Step 9: Update ExcelStyleView Component**
**File:** `src/components/Dashboard/ExcelStyleView.jsx`

**Changes:**
- Accept `showTaxBreakdown` prop
- Update EUR column to use `formatRevenue()`

**Commit:** `feat(ui): Update ExcelStyleView to support tax breakdown display`

---

### **Step 10: Update LatestWeekSummary Component**
**File:** `src/components/Dashboard/LatestWeekSummary.jsx`

**Changes:**
- Accept `showTaxBreakdown` prop
- Update revenue display in cards

**Commit:** `feat(ui): Update LatestWeekSummary to support tax breakdown display`

---

### **Step 11: Update ReservationChart Component**
**File:** `src/components/Charts/ReservationChart.jsx`

**Changes:**
- Accept `showTaxBreakdown` prop
- Update tooltip formatter to show breakdown when enabled
- Chart data can remain as-is (shows total), tooltip adds detail

**Commit:** `feat(ui): Update chart tooltips to show tax breakdown`

---

### **Step 12: Update AI Analysis Prompt** (Optional)
**File:** `src/components/HostelAnalytics.jsx` (getAIAnalysis function)

**Changes:**
- Include tax breakdown in AI prompt when available
- AI can analyze net revenue vs taxes

**Commit:** `feat(ai): Include tax breakdown in AI analysis`

---

### **Step 13: Testing & Documentation**
**Changes:**
- Test with API data (has taxes)
- Test with Excel/paste data (no taxes) → toggle should be hidden
- Test mixed data (some API, some Excel) → toggle visible
- Update README with new feature

**Commit:** `docs: Add tax breakdown feature documentation`

---

### **Step 14: Final Commit & Push**
```bash
git push -u origin feat/tax-breakdown-display
```

---

## 🎯 Key Design Decisions

### **Q: What if mixing API data (has taxes) with Excel data (no taxes)?**
**A:** Toggle becomes visible (has some tax data). Excel bookings show as "€X.XX" (no breakdown), API bookings show "€X.XX + (€Y.YY taxes)"

### **Q: What about ADR calculation with taxes?**
**A:**
- ADR with taxes: `grandTotal / nights`
- ADR without taxes: `subTotal / nights`
- Display based on toggle state

### **Q: Should old Excel data be compatible?**
**A:** Yes! `netPrice` and `taxes` are optional fields. If missing, display falls back to total only.

### **Q: Performance impact?**
**A:** Minimal - just additional fields in booking objects and conditional rendering.

---

## ✅ Success Criteria

- [ ] API fetches now store `grandTotal`, `netPrice`, `taxes`
- [ ] Toggle appears ONLY when API data with taxes exists
- [ ] Toggle OFF: Shows total with taxes (€65.10)
- [ ] Toggle ON: Shows net + taxes (€58.18 + (€6.92 taxes))
- [ ] Works in all views: cards, tables, Excel view, charts
- [ ] Excel/paste data without taxes still works (no toggle)
- [ ] Mixed data (API + Excel) handled gracefully
- [ ] Documentation updated

---

## 📦 Files to Modify

**New Files (1):**
- `src/components/TaxToggle.jsx`

**Modified Files (9):**
1. `src/utils/cloudbedsApi.js`
2. `src/utils/metricsCalculator.js`
3. `src/utils/formatters.js`
4. `src/components/HostelAnalytics.jsx`
5. `src/components/Dashboard/HostelCard.jsx`
6. `src/components/Dashboard/PerformanceTable.jsx`
7. `src/components/Dashboard/ExcelStyleView.jsx`
8. `src/components/Dashboard/LatestWeekSummary.jsx`
9. `src/components/Charts/ReservationChart.jsx`

**Documentation:**
- `README.md`

---

## ⏱️ Estimated Time
- Steps 1-3: Core data structure (30 min)
- Steps 4-5: UI toggle (15 min)
- Step 6: Formatter (10 min)
- Steps 7-11: Update all views (60 min)
- Steps 12-14: Testing & docs (30 min)

**Total: ~2.5 hours**

---

**Ready to proceed?** Let me know if you want any changes to this plan!
