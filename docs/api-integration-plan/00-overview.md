# CloudBeds API Integration - Project Overview

## 📋 Project Summary

**Objective**: Add CloudBeds API as a third data input method to the React Hostel Analytics Dashboard, enabling direct fetching of reservation data without manual Excel uploads or copy-paste.

**Current Version**: React Analytics Dashboard v2.0 (with Excel View and Nests Brand)

**Target Completion**: Incremental rollout across 6 phases

**Risk Level**: LOW - Non-breaking additive feature

---

## 🎯 Goals

### Primary Goals
1. ✅ **Add CloudBeds API integration** as third input method (alongside Excel and Copy/Paste)
2. ✅ **Support single-hostel fetching** for quick checks and error recovery
3. ✅ **Support multi-hostel fetching** for full dashboard updates (11 properties)
4. ✅ **Reuse existing data processing logic** (`calculateHostelMetrics`)
5. ✅ **Maintain code simplicity** - No over-engineering, no new dependencies

### Secondary Goals
1. ✅ **Programmer-style progress UI** - Show fetch progress with timing and status
2. ✅ **Smart data merging** - Update only fetched hostels, preserve others
3. ✅ **Error resilience** - Continue fetching on failures, allow retry
4. ✅ **User confirmation** - Warn when overwriting existing week data

### Non-Goals (Out of Scope)
- ❌ OAuth token refresh logic (API key is long-lived)
- ❌ Pagination handling (fetching all results in single call)
- ❌ Multi-week batch fetching (one week at a time)
- ❌ Real-time data synchronization
- ❌ Caching layer or offline mode
- ❌ Background fetch scheduling

---

## 🏗️ Technical Approach

### Architecture Decision
**Additive Integration** - Add new functionality WITHOUT modifying existing Excel/Paste logic.

```
Current Flow:
Excel/Paste → Parse → Transform → calculateHostelMetrics() → Dashboard

New Flow:
API → Fetch → Transform → calculateHostelMetrics() → Dashboard
           ↑
    (Same transformation format, same metrics function)
```

### Key Design Principles
1. **Reuse over Rebuild** - Use existing utilities and components
2. **Low Coupling** - API component is independent, can be removed without breaking app
3. **Progressive Enhancement** - Excel/Paste continue working if API fails
4. **Clear Separation** - API logic in separate utility, not mixed with UI
5. **Defensive Coding** - Handle all error cases gracefully

---

## 📊 Scope Definition

### In Scope
- [x] CloudBeds API v1.3 integration
- [x] Bearer token authentication (from `.env`)
- [x] Single-hostel fetch mode
- [x] Multi-hostel fetch mode (11 sequential API calls)
- [x] Progress tracking with timing
- [x] Cancel functionality during fetch
- [x] Error handling (network, auth, empty results, malformed JSON)
- [x] Smart data merge (update fetched hostels, preserve others)
- [x] Week data overwrite warning
- [x] Retry failed hostels individually
- [x] Source filtering (`sourceName` contains "website")
- [x] Date/time format handling (CloudBeds timestamp → date)
- [x] Nights calculation (check-out - check-in)
- [x] Lead time calculation (check-in - booking date)

### Out of Scope (Future Enhancements)
- [ ] Multiple week batch fetching
- [ ] API response caching
- [ ] Rate limit handling (not needed per docs)
- [ ] Pagination (API returns all results)
- [ ] Real-time updates via webhooks
- [ ] `getReservationDetails` endpoint for accurate pricing (balance=0 issue)
- [ ] Filtering by other sources (Booking.com, Hostelworld, etc.)
- [ ] Custom date range (non-week periods)

---

## 👥 Stakeholders

**Primary Users**: Nests Hostels operations team (11 properties across Spain)

**Use Cases**:
1. **Weekly Performance Review**: Fetch last week's data for all hostels → Analyze dashboard
2. **Real-time Check**: Fetch single hostel's current week → Quick metric check
3. **Data Recovery**: Excel upload failed → Use API to fetch same week
4. **Error Retry**: API fetch failed for 1-2 hostels → Retry only failed ones
5. **Data Update**: Week data exists but needs refresh → Confirm and replace

---

## ✅ Success Criteria

### Functional Requirements
- [x] User can fetch reservation data for any hostel via CloudBeds API
- [x] User can select week and fetch all 11 hostels in one action
- [x] Fetched data displays correctly in existing dashboard views
- [x] Data matches Excel export metrics (bookings, revenue, ADR, Nest Pass, etc.)
- [x] Errors show helpful messages, allow retry
- [x] User can cancel long-running multi-hostel fetch
- [x] Existing Excel/Paste functionality remains unchanged

### Non-Functional Requirements
- [x] API calls complete within 5 seconds per hostel (target: 3s average)
- [x] Progress UI updates in real-time (no frozen states)
- [x] Mobile responsive design maintained
- [x] Code is well-commented and follows project philosophy
- [x] No new npm dependencies added
- [x] Works in Chrome, Firefox, Safari, Edge

### Quality Criteria
- [x] Zero breaking changes to existing features
- [x] All error scenarios handled gracefully
- [x] Code passes existing lint rules (if any)
- [x] Git commits are incremental and reversible
- [x] Documentation updated (README, CLAUDE.md)

---

## 📅 Timeline & Phases

### Phase 1: API Core (2-3 hours)
- Create `.env` file
- Build `cloudbedsApi.js` utility
- Test with console logs (no UI)
- Validate data transformation

### Phase 2: Single Hostel UI (2 hours)
- Create `APIFetchPanel.jsx` component
- Add week selector and hostel dropdown
- Wire up to main component
- Test single-hostel flow

### Phase 3: Multi-Hostel Fetching (2-3 hours)
- Implement sequential fetch loop
- Add progress tracking
- Handle cancel functionality
- Error handling (continue on failure)

### Phase 4: Progress UI Enhancement (1-2 hours)
- Build programmer-style progress display
- Add timing (elapsed/remaining)
- Show booking counts in real-time
- Implement retry for failed hostels

### Phase 5: Data Merge Logic (1 hour)
- Detect existing week data
- Show warning modal
- Handle smart merge (update only fetched hostels)
- Add user confirmation

### Phase 6: Testing & Documentation (1-2 hours)
- Test all 11 hostels
- Test error scenarios
- Mobile responsive testing
- Update README.md and CLAUDE.md
- Clean up console logs

**Total Estimated Time**: 9-13 hours

---

## 🚨 Risks & Mitigations

### Risk 1: API Rate Limiting
**Likelihood**: Low
**Impact**: Medium
**Mitigation**: CloudBeds docs don't mention rate limits. Add 500ms delay between hostel fetches if issues arise.

### Risk 2: Balance Field Always Zero
**Likelihood**: Medium
**Impact**: High
**Mitigation**: Document known issue. Future enhancement: Use `getReservationDetails` endpoint for accurate pricing.

### Risk 3: Network Timeouts
**Likelihood**: Low
**Impact**: Low
**Mitigation**: Implement 10-second timeout per request. Allow retry for failed hostels.

### Risk 4: API Key Expiration
**Likelihood**: Low (long-lived key)
**Impact**: High
**Mitigation**: Clear error message with instructions to update `.env` file.

### Risk 5: CloudBeds API Version Changes
**Likelihood**: Low
**Impact**: Medium
**Mitigation**: Pin to v1.3. Add version check in API utility. Monitor CloudBeds changelog.

---

## 📚 References

**CloudBeds API Documentation**:
- Main Docs: https://developers.cloudbeds.com/reference/tech-specs
- getReservations v1.3: https://developers.cloudbeds.com/reference/get_getreservations-2
- Postman Collection: https://www.postman.com/science-observer-40835002/cloudbeds/request/1fkvwjw/getreservations

**Project Documentation**:
- `CLAUDE.md` - Development philosophy and guidelines
- `README.md` - User-facing documentation
- `documentation.md` - Setup and configuration guide

**Related Files**:
- `src/config/hostelConfig.js` - Hostel property IDs (used for API calls)
- `src/utils/metricsCalculator.js` - Reusable `calculateHostelMetrics()` function
- `src/components/DataInput/DataInputPanel.jsx` - Input method orchestrator

---

## 🎯 Next Steps

1. ✅ Review this overview document
2. ⏳ Review architecture plan (`01-architecture.md`)
3. ⏳ Review file changes list (`02-file-changes.md`)
4. ⏳ Review implementation steps (`03-implementation-steps.md`)
5. ⏳ Get approval to proceed with Phase 1 (API Core)

---

**Document Status**: Draft
**Last Updated**: 2026-01-12
**Author**: Claude Code (AI Assistant)
**Reviewed By**: Artur Mamedov (pending)
