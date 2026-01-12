# CloudBeds API Integration - Error Scenarios Matrix

## 🚨 Error Handling Strategy

This document catalogs all possible error scenarios, their causes, impacts, and handling strategies for the CloudBeds API integration.

---

## 📊 Error Severity Levels

| Level | Description | User Impact | Required Action |
|-------|-------------|-------------|-----------------|
| 🔴 **Critical** | Blocks all functionality | Cannot use API feature at all | Immediate fix required |
| 🟠 **High** | Partial functionality loss | Some hostels/weeks unusable | Fix soon, workaround available |
| 🟡 **Medium** | Degraded experience | Feature works but with issues | Fix eventually |
| 🟢 **Low** | Minor inconvenience | Cosmetic or edge case | Optional fix |

---

## 🔴 Critical Errors

### Error C.1: Missing API Key

**Trigger**: `.env` file missing or `VITE_CLOUDBEDS_API_KEY` not set

**Detection Point**: `cloudbedsApi.js` → `fetchReservationsFromCloudBeds()` → Line 1

**Error Message**:
```
"CloudBeds API key not found. Please check your .env file and restart the dev server."
```

**User Experience**:
- ❌ Fetch button clicked
- ❌ Immediate error alert
- ❌ No API call made
- ✅ Button re-enabled

**Cause**:
- User didn't create `.env` file
- User misspelled environment variable name
- User forgot to restart dev server after creating `.env`

**Resolution**:
1. Create `.env` file in project root
2. Add `VITE_CLOUDBEDS_API_KEY=your_key_here`
3. Restart dev server: `npm run dev`
4. Retry fetch

**Prevention**:
- Add setup instructions to README
- Add `.env.example` file to repository
- Add startup check that logs warning if API key missing

**Code**:
```javascript
const API_KEY = import.meta.env.VITE_CLOUDBEDS_API_KEY;
if (!API_KEY) {
  throw new Error('CloudBeds API key not found. Please check your .env file and restart the dev server.');
}
```

---

### Error C.2: Invalid/Expired API Key (401 Unauthorized)

**Trigger**: CloudBeds API returns 401 or 403 status code

**Detection Point**: `cloudbedsApi.js` → API response handling

**Error Message**:
```
"Invalid API key. Please check your .env file."
```

**User Experience**:
- ❌ Fetch initiated
- ⏳ Loading state shows (1-2 seconds)
- ❌ Error alert appears
- ✅ Button re-enabled

**Cause**:
- API key typo in `.env`
- API key expired (unlikely with long-lived keys)
- API key revoked in CloudBeds dashboard
- Wrong API key type (e.g., using client secret as API key)

**Resolution**:
1. Verify API key in CloudBeds Connect dashboard
2. Copy-paste key carefully (no extra spaces)
3. Update `.env` file
4. Restart dev server
5. Retry fetch

**Prevention**:
- Add API key validation on app startup (test call)
- Add "Test Connection" button in UI (future enhancement)

**Code**:
```javascript
if (response.status === 401 || response.status === 403) {
  throw new Error('Invalid API key. Please check your .env file.');
}
```

---

### Error C.3: CloudBeds API Server Error (500/503)

**Trigger**: CloudBeds API returns 500, 502, 503, 504 status codes

**Detection Point**: `cloudbedsApi.js` → API response handling

**Error Message**:
```
"CloudBeds API error: 500 Internal Server Error"
```

**User Experience**:
- ❌ Fetch initiated
- ⏳ Loading state (variable duration)
- ❌ Error alert appears
- ✅ Button re-enabled
- ✅ Can retry

**Cause**:
- CloudBeds server temporarily down
- CloudBeds API maintenance
- CloudBeds infrastructure issue
- Overload on CloudBeds side

**Resolution**:
1. Wait 5-10 minutes
2. Retry fetch
3. If persists, check CloudBeds status page
4. Use Excel upload workaround
5. Contact CloudBeds support if extended outage

**Prevention**:
- Add retry logic with exponential backoff (future)
- Add status page check (future)
- Document workaround in error message

**Code**:
```javascript
if (!response.ok) {
  throw new Error(`CloudBeds API error: ${response.status} ${response.statusText}`);
}
```

---

## 🟠 High Priority Errors

### Error H.1: Network Error (No Internet Connection)

**Trigger**: No network connection or DNS resolution failure

**Detection Point**: `fetch()` throws `TypeError`

**Error Message**:
```
"Network error. Please check your internet connection."
```

**User Experience**:
- ❌ Fetch initiated
- ⏳ Loading state (few seconds)
- ❌ Error alert appears
- ✅ Button re-enabled

**Cause**:
- Internet disconnected
- Firewall blocking CloudBeds API
- Proxy issues
- DNS resolution failure

**Resolution**:
1. Check internet connection
2. Try accessing CloudBeds website in browser
3. Check firewall/proxy settings
4. Retry fetch

**Workaround**:
- Use Excel upload or copy-paste methods

**Code**:
```javascript
catch (error) {
  if (error instanceof TypeError) {
    throw new Error('Network error. Please check your internet connection.');
  }
}
```

---

### Error H.2: Request Timeout

**Trigger**: API request takes longer than configured timeout (default: 10 seconds)

**Detection Point**: `fetch()` aborted by timeout controller

**Error Message**:
```
"Request timeout. CloudBeds API is taking too long to respond. Try again."
```

**User Experience**:
- ❌ Fetch initiated
- ⏳ Loading state for 10 seconds
- ❌ Error alert appears
- ✅ Button re-enabled

**Cause**:
- CloudBeds API slow response
- Network congestion
- Large data set taking time to process
- API rate limiting (unlikely)

**Resolution**:
1. Wait a moment and retry
2. Try during off-peak hours
3. Check CloudBeds status
4. If persistent, increase timeout in `.env`:
   ```
   VITE_CLOUDBEDS_API_TIMEOUT=30000
   ```

**Prevention**:
- Make timeout configurable
- Add retry with exponential backoff

**Code**:
```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

fetch(url, { signal: controller.signal })
  .then(...)
  .catch(error => {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. CloudBeds API is taking too long to respond. Try again.');
    }
  });
```

---

### Error H.3: Invalid Property ID (404 Not Found)

**Trigger**: Property ID doesn't exist in CloudBeds account

**Detection Point**: API returns 404 or empty/invalid response

**Error Message**:
```
"Property ID 999999 not found. Check hostelConfig.js."
```

**User Experience**:
- ❌ Fetch initiated (specific hostel)
- ⏳ Loading state (1-2 seconds)
- ❌ Error alert or console error
- ✅ If multi-fetch: continues to next hostel
- ✅ If single-fetch: button re-enabled

**Cause**:
- Typo in `hostelConfig.js` property ID
- Property ID changed in CloudBeds
- New hostel added to config but ID incorrect

**Resolution**:
1. Open `src/config/hostelConfig.js`
2. Verify property ID for failing hostel
3. Check CloudBeds dashboard for correct ID
4. Update config
5. Restart dev server (Vite may hot-reload)
6. Retry fetch

**Prevention**:
- Document how to find property IDs
- Add validation step during setup

**Code**:
```javascript
if (response.status === 404) {
  throw new Error(`Property ID ${propertyID} not found. Check hostelConfig.js.`);
}
```

---

## 🟡 Medium Priority Errors

### Error M.1: Malformed API Response

**Trigger**: CloudBeds API returns unexpected JSON structure

**Detection Point**: Response parsing or data transformation

**Error Message**:
```
"Invalid response from CloudBeds API. API may have changed."
```

**User Experience**:
- ❌ Fetch initiated
- ⏳ Loading state (variable)
- ❌ Error alert appears
- ✅ Partial data may be preserved (if multi-fetch)

**Cause**:
- CloudBeds API version changed
- CloudBeds added/removed fields
- Response structure different from expected
- Corrupted response

**Resolution**:
1. Check console logs for actual response structure
2. Check CloudBeds API documentation for changes
3. Update `cloudbedsApi.js` transformation logic
4. Report issue to CloudBeds if API changed without notice

**Temporary Workaround**:
- Use Excel upload method

**Code**:
```javascript
if (!data || !data.success) {
  throw new Error('Invalid response from CloudBeds API. API may have changed.');
}
```

---

### Error M.2: Missing Required Fields in Reservation

**Trigger**: Individual reservation object missing expected fields

**Detection Point**: `transformReservation()` function

**Error Message**:
- Console error: "Error transforming reservation: [object]"
- User sees: Booking skipped, count reduced

**User Experience**:
- ✅ Fetch completes
- ⚠️ Console warning logged
- ✅ Invalid bookings skipped
- ✅ Valid bookings processed normally

**Cause**:
- Incomplete reservation data in CloudBeds
- Draft reservations
- Data migration issues
- CloudBeds API bug

**Resolution**:
1. Check console logs for affected reservation IDs
2. Verify reservation in CloudBeds dashboard
3. If widespread, contact CloudBeds support
4. Update transformation logic to handle missing fields gracefully

**Impact**:
- Minor: Most bookings still processed
- Count might be slightly lower than expected

**Code**:
```javascript
const transformReservation = (cbReservation) => {
  try {
    // Transformation logic
    return booking;
  } catch (error) {
    console.error('Error transforming reservation:', cbReservation, error);
    return null;  // Skip this booking
  }
};

// Filter out null bookings
const bookings = data.data
  .map(transformReservation)
  .filter(booking => booking !== null);
```

---

### Error M.3: Zero Direct Bookings Found

**Trigger**: API returns bookings, but none match "website" source filter

**Detection Point**: After filtering in `fetchReservationsFromCloudBeds()`

**Error Message**:
- Not an error, informational
- Console log: "[CloudBeds API] Filtered to 0 direct bookings"
- Alert: "Flamingo: 0 bookings fetched"

**User Experience**:
- ✅ Fetch completes successfully
- ℹ️ Dashboard shows hostel with count=0
- ℹ️ User informed that no direct bookings in date range

**Cause**:
- Week had only OTA bookings (Booking.com, Hostelworld, etc.)
- No direct website bookings during that period
- Seasonal variation (low direct booking periods)

**Resolution**:
- Not an error - expected behavior
- User can fetch different date range
- User can use Excel upload to see all bookings (including OTAs)

**Prevention**:
- Add filter toggle to show all bookings vs direct only (future)

---

### Error M.4: Date Range Contains No Reservations

**Trigger**: CloudBeds API returns empty data array

**Detection Point**: After API response received

**Error Message**:
- Console log: "[CloudBeds API] No reservations found in date range"
- Returns empty array (not an error)

**User Experience**:
- ✅ Fetch completes successfully
- ℹ️ Dashboard shows hostel with count=0
- ℹ️ All metrics = 0

**Cause**:
- Property was closed during that period
- New property (no historical data)
- Future date range (no bookings yet)
- Incorrect date range selected

**Resolution**:
- Not an error - expected for some scenarios
- User can select different date range
- Verify property was operational during selected dates

---

## 🟢 Low Priority Errors

### Error L.1: Cancelled During Multi-Hostel Fetch

**Trigger**: User clicks "Cancel" button during fetch

**Detection Point**: Fetch loop checks `isCancelled` state

**Error Message**:
- Alert: "Fetch cancelled. 6/11 hostels loaded."

**User Experience**:
- ✅ Fetch stops immediately
- ✅ Already-fetched hostels preserved
- ✅ Dashboard updates with partial data
- ✅ Button re-enabled

**Cause**:
- User intentionally cancelled (not an error)
- May cancel if taking too long
- May cancel if realized wrong week selected

**Resolution**:
- None needed - intended functionality

**Code**:
```javascript
for (let i = 0; i < hostelList.length; i++) {
  if (checkCancelled()) {
    console.log('Fetch cancelled by user');
    break;
  }
  // Fetch logic...
}
```

---

### Error L.2: Date Calculation Edge Cases

**Trigger**: Unusual date scenarios

**Examples**:
- Same-day booking and check-in (lead time = 0)
- Check-in before booking date (negative lead time - shouldn't happen)
- Same-day check-in and check-out (nights = 0)

**Error Message**:
- No error thrown
- Values calculated as-is (0 or negative allowed)

**User Experience**:
- ✅ Bookings processed normally
- ⚠️ Unusual values displayed (0 nights, 0 lead time)

**Cause**:
- Walk-in bookings (booked and checked in same day)
- CloudBeds data entry issues
- Date/time boundary cases

**Resolution**:
- Current code handles gracefully
- Future: Add validation if needed

**Code**:
```javascript
const calculateNights = (startDate, endDate) => {
  const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  return Math.max(0, nights);  // Ensure non-negative
};

const calculateLeadTime = (bookingDate, checkinDate) => {
  const leadTime = Math.floor((checkinDate - bookingDate) / (1000 * 60 * 60 * 24));
  return leadTime;  // Can be 0 or negative (handle in display layer)
};
```

---

### Error L.3: Progress UI Rendering Lag

**Trigger**: Rapid state updates during multi-hostel fetch

**Detection Point**: React state updates

**Error Message**:
- No error message
- UI may appear slightly laggy

**User Experience**:
- ⚠️ Progress bar updates might skip frames
- ⚠️ Hostel status updates might batch (not real-time)
- ✅ Overall functionality works

**Cause**:
- React batching state updates
- Too many renders in short time
- Browser rendering performance

**Resolution**:
- Current implementation acceptable
- Future: Debounce progress updates
- Future: Use `useTransition` hook

---

## 🔄 Error Recovery Strategies

### Strategy 1: Retry Failed Hostels (Future Enhancement)

**Scenario**: Multi-hostel fetch has 2 failures

**UI**:
```
⚠️ 9/11 hostels fetched successfully
❌ Failed: Arena (Network error), Duque (Timeout)

[Retry Failed Only] [Retry All]
```

**Implementation**:
```javascript
const retryFailedHostels = () => {
  const failed = apiFetchProgress.hostels.filter(h => h.status === 'error');
  // Re-fetch only failed hostels
};
```

---

### Strategy 2: Exponential Backoff for Retries (Future Enhancement)

**Scenario**: Transient network errors

**Implementation**:
```javascript
async function fetchWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2 ** i * 1000));  // 1s, 2s, 4s
    }
  }
}
```

---

### Strategy 3: Offline Queue (Future Enhancement)

**Scenario**: Network error during fetch

**Behavior**:
- Queue failed requests
- Retry automatically when network restored
- Show "Queued: 3 pending fetches" indicator

---

## 📋 Error Logging & Debugging

### Console Logging Levels

**Production**:
- ✅ Log errors: `console.error('API fetch error:', error)`
- ✅ Log warnings: `console.warn('Empty response')`
- ❌ Remove debug logs: `console.log('Fetching...')`

**Development**:
- ✅ All levels: `console.log()`, `console.warn()`, `console.error()`
- ✅ Network details: Request URLs, timings
- ✅ Data transformation: Before/after samples

### Error Information to Log

For debugging, always log:
1. **Error message**: User-friendly description
2. **Error context**: Which hostel, date range, operation
3. **Stack trace**: For unexpected errors
4. **Request details**: URL, parameters (sanitize API key!)
5. **Response details**: Status code, body (if available)

**Example**:
```javascript
catch (error) {
  console.error('CloudBeds API Error', {
    hostel: hostelName,
    propertyID: propertyID,
    dateRange: `${startDate} - ${endDate}`,
    error: error.message,
    stack: error.stack
  });
  throw error;
}
```

---

## 🎯 Error Handling Best Practices

### 1. Fail Gracefully
- ✅ Never crash the entire app
- ✅ Show helpful error messages
- ✅ Provide recovery options (retry, cancel)

### 2. Preserve Data
- ✅ Keep successfully fetched data even if later fetches fail
- ✅ Don't clear dashboard on error
- ✅ Allow partial success in multi-fetch

### 3. User Communication
- ✅ Clear, non-technical error messages
- ✅ Suggest next steps ("Check .env file")
- ✅ Differentiate user errors from system errors

### 4. Logging
- ✅ Log all errors to console (developers need details)
- ✅ Include context (which operation failed)
- ❌ Never log sensitive data (API keys, tokens)

### 5. Retry Logic
- ✅ Allow manual retry for transient errors
- ✅ Don't retry auth errors (won't succeed)
- ✅ Add delay before retry (avoid hammering API)

---

## 🧪 Error Testing Checklist

During QA, force each error scenario and verify:

- [ ] **C.1 Missing API Key**: Error message clear, no crash
- [ ] **C.2 Invalid API Key**: Error message helpful, button re-enabled
- [ ] **C.3 Server Error**: Retry works after waiting
- [ ] **H.1 Network Error**: Recovers when internet restored
- [ ] **H.2 Timeout**: Error shows after configured timeout
- [ ] **H.3 Invalid Property ID**: Multi-fetch continues to next hostel
- [ ] **M.1 Malformed Response**: Doesn't crash app
- [ ] **M.2 Missing Fields**: Invalid bookings skipped gracefully
- [ ] **M.3 Zero Direct Bookings**: Shows count=0, no error
- [ ] **M.4 Empty Date Range**: Shows count=0, no error
- [ ] **L.1 User Cancellation**: Partial data preserved
- [ ] **L.2 Date Edge Cases**: Handled without crash
- [ ] **L.3 UI Lag**: Acceptable performance

---

**Document Status**: Complete
**Last Updated**: 2026-01-12
**Coverage**: All identified error scenarios
**Next Review**: After Phase 6 implementation
