/**
 * CloudBeds API Integration Utility
 *
 * This module provides functions to fetch reservation data from CloudBeds API v1.3
 * and transform it to the internal booking format used by the dashboard.
 *
 * Authentication: Bearer token (from .env)
 * Endpoint: GET /getReservations
 * Filtering: Only "Website/Booking Engine" source (direct bookings)
 *
 * Data Flow:
 * 1. Make HTTP request to CloudBeds API with property ID and date range
 * 2. Receive reservation data in CloudBeds JSON format
 * 3. Transform each reservation to internal booking format
 * 4. Filter for direct bookings only (source contains "website")
 * 5. Return array of transformed bookings
 *
 * @module cloudbedsApi
 * @requires fetch (native browser API)
 * @author Artur Mamedov & Claude
 * @since 2026-01-12
 */

// ============================================================
// CONFIGURATION
// ============================================================

// API configuration from environment variables
// These are set in .env file and loaded by Vite at build time
const API_KEY = import.meta.env.VITE_CLOUDBEDS_API_KEY;
const BASE_URL = import.meta.env.VITE_CLOUDBEDS_API_BASE_URL || 'https://api.cloudbeds.com/api/v1.3';
const TIMEOUT = parseInt(import.meta.env.VITE_CLOUDBEDS_API_TIMEOUT) || 10000; // Default 10 seconds

// ============================================================
// HELPER FUNCTIONS (Internal Use Only)
// ============================================================

/**
 * Format date string to CloudBeds API datetime format
 *
 * CloudBeds API requires datetime in "YYYY-MM-DD HH:MM:SS" format for resultsFrom/resultsTo parameters.
 * We add "00:00:00" for start dates (include entire day from midnight) and "23:59:59" for end dates
 * (include entire day until last second).
 *
 * @private
 * @param {string} date - Date in "YYYY-MM-DD" format
 * @param {boolean} isEndDate - If true, adds "23:59:59", else adds "00:00:00"
 * @returns {string} Formatted datetime string "YYYY-MM-DD HH:MM:SS"
 *
 * @example
 * formatDateTimeForAPI("2026-01-05", false) // Returns: "2026-01-05 00:00:00"
 * formatDateTimeForAPI("2026-01-11", true)  // Returns: "2026-01-11 23:59:59"
 */
const formatDateTimeForAPI = (date, isEndDate = false) => {
  const time = isEndDate ? '23:59:59' : '00:00:00';
  return `${date} ${time}`;
};

/**
 * Calculate number of nights between two dates
 *
 * Nights are calculated as the difference in days between check-out and check-in dates.
 * This is important for Nest Pass (7+ nights) and Monthly (28+ nights) calculations.
 *
 * @private
 * @param {string} startDate - Check-in date in "YYYY-MM-DD" format
 * @param {string} endDate - Check-out date in "YYYY-MM-DD" format
 * @returns {number} Number of nights (always non-negative, 0 for same-day bookings)
 *
 * @example
 * calculateNights("2026-01-10", "2026-01-11")  // Returns: 1 (one night)
 * calculateNights("2026-01-10", "2026-01-17")  // Returns: 7 (Nest Pass!)
 * calculateNights("2026-01-10", "2026-02-10")  // Returns: 31 (Monthly!)
 * calculateNights("2026-01-10", "2026-01-10")  // Returns: 0 (same-day)
 */
const calculateNights = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end - start; // Difference in milliseconds
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert to days
  return Math.max(0, diffDays); // Ensure non-negative (handle edge cases)
};

/**
 * Calculate lead time (days between booking creation and check-in)
 *
 * Lead time indicates how far in advance a booking was made. This metric is useful
 * for understanding booking patterns and optimizing pricing strategies.
 *
 * Note: Can be negative for same-day bookings (booked and checked-in on same day).
 * Note: Can be very large for far-future bookings (e.g., 200+ days).
 *
 * @private
 * @param {string} bookingDateTime - Booking creation date in "YYYY-MM-DD HH:MM:SS" format
 * @param {string} checkinDate - Check-in date in "YYYY-MM-DD" format
 * @returns {number} Lead time in days (can be 0 or negative for same-day bookings)
 *
 * @example
 * calculateLeadTime("2026-01-05 10:00:00", "2026-01-11")  // Returns: 6 (booked 6 days ahead)
 * calculateLeadTime("2026-01-11 13:09:20", "2026-01-11")  // Returns: 0 (same-day booking)
 * calculateLeadTime("2026-01-08 10:14:27", "2026-08-28")  // Returns: 232 (far-future booking)
 */
const calculateLeadTime = (bookingDateTime, checkinDate) => {
  // Extract date part only from "YYYY-MM-DD HH:MM:SS" (ignore time for consistency)
  const bookingDate = new Date(bookingDateTime.split(' ')[0]);
  const checkin = new Date(checkinDate);
  const diffTime = checkin - bookingDate; // Difference in milliseconds
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // Convert to days (floor for consistency)
  return diffDays; // Can be 0 or negative for same-day bookings
};

/**
 * Transform CloudBeds reservation object to internal booking format
 *
 * CloudBeds API returns reservations in their own JSON structure. This function
 * maps CloudBeds fields to our internal booking format that matches the structure
 * used by Excel uploads and copy-paste methods. This ensures all data sources
 * feed into the same calculateHostelMetrics() function (DRY principle!).
 *
 * Field Mapping:
 * - reservationID       → reservation
 * - dateCreated         → bookingDate (extract date from datetime)
 * - startDate           → checkin
 * - endDate             → checkout
 * - balance             → price (⚠️ Note: may be 0 for checked-out bookings)
 * - status              → status
 * - sourceName          → source
 * - [calculated]        → nights (endDate - startDate)
 * - [calculated]        → leadTime (startDate - dateCreated in days)
 *
 * Error Handling:
 * Returns null for malformed reservations (missing required fields, invalid dates, etc.)
 * This allows the parent function to skip invalid bookings without crashing.
 *
 * @private
 * @param {object} cbReservation - CloudBeds reservation object from API response
 * @returns {object|null} Booking object in internal format, or null if transformation fails
 *
 * @example
 * const cbRes = {
 *   reservationID: "3954551056305",
 *   dateCreated: "2026-01-11 13:09:20",
 *   startDate: "2026-01-11",
 *   endDate: "2026-01-12",
 *   balance: 321.33,
 *   status: "confirmed",
 *   sourceName: "Website/Booking Engine"
 * };
 * transformReservation(cbRes);
 * // Returns: { reservation: "3954551056305", bookingDate: "2026-01-11",
 * //            checkin: "2026-01-11", checkout: "2026-01-12", nights: 1,
 * //            price: 321.33, status: "confirmed", source: "Website/Booking Engine",
 * //            leadTime: 0 }
 */
const transformReservation = (cbReservation) => {
  try {
    // Extract date from "YYYY-MM-DD HH:MM:SS" format (dateCreated has timestamp)
    const bookingDate = cbReservation.dateCreated.split(' ')[0]; // "2026-01-11 13:09:20" → "2026-01-11"

    // Calculate nights between check-in and check-out
    const nights = calculateNights(cbReservation.startDate, cbReservation.endDate);

    // Calculate lead time (days between booking and check-in)
    const leadTime = calculateLeadTime(cbReservation.dateCreated, cbReservation.startDate);

    // Return transformed booking object (matches format from Excel/Paste parsers)
    return {
      reservation: cbReservation.reservationID,
      bookingDate: bookingDate,
      checkin: cbReservation.startDate,
      checkout: cbReservation.endDate,
      nights: nights,
      price: parseFloat(cbReservation.balance) || 0, // Handle null/undefined/string, default to 0
      status: cbReservation.status,
      source: cbReservation.sourceName,
      leadTime: leadTime
    };
  } catch (error) {
    // Log error for debugging but don't crash - return null to skip this booking
    console.error('[CloudBeds API] Error transforming reservation:', {
      reservationID: cbReservation?.reservationID || 'unknown',
      error: error.message,
      data: cbReservation
    });
    return null; // Skip malformed reservation
  }
};

// ============================================================
// MAIN EXPORT FUNCTION
// ============================================================

/**
 * Fetch reservations from CloudBeds API for a specific property and date range
 *
 * This is the main function used by the UI to fetch booking data from CloudBeds.
 * It handles authentication, API communication, data transformation, and filtering.
 *
 * Process:
 * 1. Validate API key is configured
 * 2. Format dates to CloudBeds API datetime format
 * 3. Build API URL with query parameters
 * 4. Make HTTP GET request with Bearer token authentication
 * 5. Handle HTTP errors (401 auth, 404 not found, 500 server error, timeout)
 * 6. Parse JSON response
 * 7. Transform each reservation to internal booking format
 * 8. Filter for direct bookings only (source contains "website")
 * 9. Return array of transformed, filtered bookings
 *
 * Authentication:
 * Uses Bearer token from VITE_CLOUDBEDS_API_KEY environment variable.
 * Token must be set in .env file and server must be restarted after changes.
 *
 * Filtering:
 * Only returns bookings where sourceName contains "website" (case-insensitive).
 * This filters out OTA bookings (Booking.com, Hostelworld, etc.) to match
 * the Excel export behavior which only includes "Sitio web" (Website) source.
 *
 * Error Handling:
 * Throws descriptive errors for:
 * - Missing API key
 * - Network errors
 * - Authentication failures (401/403)
 * - Not found errors (404)
 * - Server errors (500)
 * - Timeout errors
 * - Malformed responses
 *
 * Empty Results:
 * Returns empty array [] (not an error) if no reservations found in date range.
 *
 * @export
 * @async
 * @param {string} propertyID - CloudBeds property ID (e.g., "6733" for Flamingo)
 * @param {string} startDate - Start date in "YYYY-MM-DD" format
 * @param {string} endDate - End date in "YYYY-MM-DD" format
 * @returns {Promise<Array>} Promise resolving to array of transformed booking objects (direct bookings only)
 * @throws {Error} Network errors, auth errors, API errors, timeout, malformed responses
 *
 * @example
 * // Fetch all direct bookings for Flamingo in week of Jan 5-11, 2026
 * const bookings = await fetchReservationsFromCloudBeds("6733", "2026-01-05", "2026-01-11");
 * console.log(`Fetched ${bookings.length} direct bookings`);
 * // bookings = [{ reservation, bookingDate, checkin, checkout, nights, price, status, source, leadTime }, ...]
 *
 * @example
 * // Handle errors
 * try {
 *   const bookings = await fetchReservationsFromCloudBeds("6733", "2026-01-05", "2026-01-11");
 *   // Process bookings...
 * } catch (error) {
 *   console.error('Failed to fetch:', error.message);
 *   alert(`Error: ${error.message}`);
 * }
 */
export const fetchReservationsFromCloudBeds = async (propertyID, startDate, endDate) => {
  // ============================================================
  // STEP 1: Validate API Key
  // ============================================================

  if (!API_KEY) {
    console.error('[CloudBeds API] ❌ API key not found in environment variables');
    throw new Error('CloudBeds API key not found. Please check your .env file and restart the dev server.');
  }

  // ============================================================
  // STEP 2: Format Dates for API
  // ============================================================

  // CloudBeds API requires "YYYY-MM-DD HH:MM:SS" format for resultsFrom/resultsTo
  const resultsFrom = formatDateTimeForAPI(startDate, false); // "2026-01-05 00:00:00"
  const resultsTo = formatDateTimeForAPI(endDate, true);      // "2026-01-11 23:59:59"

  console.log(`[CloudBeds API] 🔍 Fetching reservations for property ${propertyID}`);
  console.log(`[CloudBeds API] 📅 Date range: ${startDate} to ${endDate}`);
  console.log(`[CloudBeds API] 🕐 API datetime range: ${resultsFrom} to ${resultsTo}`);

  // ============================================================
  // STEP 3: Build API URL
  // ============================================================

  // Build URL with query parameters (properly encoded for URLs)
  const url = `${BASE_URL}/getReservations?propertyID=${propertyID}&resultsFrom=${encodeURIComponent(resultsFrom)}&resultsTo=${encodeURIComponent(resultsTo)}`;

  console.log(`[CloudBeds API] 🌐 API endpoint: ${BASE_URL}/getReservations`);
  console.log(`[CloudBeds API] 📡 Making HTTP GET request...`);

  // ============================================================
  // STEP 4: Make HTTP Request with Timeout
  // ============================================================

  try {
    // Create AbortController for timeout functionality
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    // Make HTTP GET request with Bearer token authentication
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      signal: controller.signal // Enable abort on timeout
    });

    clearTimeout(timeoutId); // Clear timeout if request completes

    console.log(`[CloudBeds API] ✅ HTTP ${response.status} ${response.statusText}`);

    // ============================================================
    // STEP 5: Handle HTTP Errors
    // ============================================================

    if (!response.ok) {
      // Authentication errors (401 Unauthorized, 403 Forbidden)
      if (response.status === 401 || response.status === 403) {
        console.error('[CloudBeds API] ❌ Authentication failed - Invalid API key');
        throw new Error('Invalid API key. Please check your .env file.');
      }

      // Not found errors (404 - invalid property ID)
      if (response.status === 404) {
        console.error(`[CloudBeds API] ❌ Property ID ${propertyID} not found`);
        throw new Error(`Property ID ${propertyID} not found. Check hostelConfig.js.`);
      }

      // Server errors (500+)
      console.error(`[CloudBeds API] ❌ CloudBeds API error: ${response.status} ${response.statusText}`);
      throw new Error(`CloudBeds API error: ${response.status} ${response.statusText}`);
    }

    // ============================================================
    // STEP 6: Parse JSON Response
    // ============================================================

    const data = await response.json();

    console.log(`[CloudBeds API] 📦 Received response:`, {
      success: data.success,
      count: data.count,
      total: data.total
    });

    // ============================================================
    // STEP 7: Validate Response Structure
    // ============================================================

    if (!data || !data.success) {
      console.error('[CloudBeds API] ❌ Invalid response structure:', data);
      throw new Error('Invalid response from CloudBeds API. API may have changed.');
    }

    // ============================================================
    // STEP 8: Handle Empty Results (Not an Error!)
    // ============================================================

    if (!data.data || data.data.length === 0) {
      console.log('[CloudBeds API] ℹ️  No reservations found in date range');
      return []; // Return empty array (not an error condition)
    }

    console.log(`[CloudBeds API] 🔄 Transforming ${data.data.length} reservations...`);

    // ============================================================
    // STEP 9: Transform Each Reservation
    // ============================================================

    const bookings = data.data
      .map(transformReservation)             // Transform CloudBeds format → internal format
      .filter(booking => booking !== null);  // Remove invalid bookings (where transformation failed)

    console.log(`[CloudBeds API] ✅ Transformed ${bookings.length} valid bookings`);

    // ============================================================
    // STEP 10: Filter for Direct Bookings (Website Source)
    // ============================================================

    // Filter for bookings where source contains "website" (case-insensitive)
    // This matches the Excel export behavior which only includes "Sitio web" source
    const directBookings = bookings.filter(b =>
      b.source && b.source.toLowerCase().includes('website')
    );

    console.log(`[CloudBeds API] 🎯 Filtered to ${directBookings.length} direct bookings (source contains "website")`);

    // Log sample of sources found (helpful for debugging filter issues)
    const uniqueSources = [...new Set(bookings.map(b => b.source))];
    console.log(`[CloudBeds API] 📊 Sources found in response:`, uniqueSources);

    console.log(`[CloudBeds API] ✨ Successfully fetched ${directBookings.length} direct bookings for property ${propertyID}`);

    return directBookings;

  } catch (error) {
    // ============================================================
    // ERROR HANDLING
    // ============================================================

    // Timeout error (AbortController.abort() was called)
    if (error.name === 'AbortError') {
      console.error('[CloudBeds API] ⏱️  Request timeout after', TIMEOUT, 'ms');
      throw new Error('Request timeout. CloudBeds API is taking too long to respond. Try again.');
    }

    // Network error (no internet, DNS failure, etc.)
    if (error instanceof TypeError) {
      console.error('[CloudBeds API] 🌐 Network error:', error.message);
      throw new Error('Network error. Please check your internet connection.');
    }

    // Re-throw other errors (auth, API, validation errors already handled above)
    console.error('[CloudBeds API] ❌ Unexpected error:', error);
    throw error;
  }
};

// ============================================================
// REVENUE ENRICHMENT FUNCTION
// ============================================================

/**
 * Enrich single booking with detailed revenue breakdown
 *
 * This function makes an individual API call to fetch complete revenue details
 * for a single reservation. The bulk getReservations endpoint does NOT include
 * revenue fields (only has `balance` which shows 0 for paid bookings).
 *
 * **When to use:**
 * - After bulk fetch with getReservations (fast but no revenue)
 * - User manually triggers "Enrich Revenue Data" button
 * - Shows real-time progress during enrichment
 *
 * **API Endpoint:** GET /getReservation (singular)
 *
 * **Returns:**
 * - `total`: Grand total with taxes (what guest pays)
 * - `netPrice`: Revenue without taxes (subTotal from balanceDetailed)
 * - `taxes`: Tax amount (taxesFees from balanceDetailed)
 *
 * **Rate Limiting:**
 * - Respects VITE_CLOUDBEDS_API_TIMEOUT from .env (default 10 seconds)
 * - Caller should add delays between calls (10s recommended)
 *
 * @param {string} propertyID - CloudBeds property ID (e.g., "6733")
 * @param {string} reservationID - Reservation ID to enrich
 * @returns {Promise<{total: number, netPrice: number|null, taxes: number|null}>}
 * @throws {Error} If API call fails or credentials missing
 *
 * @example
 * // Enrich a single booking
 * const revenue = await enrichBookingRevenue('6733', '9326721060388');
 * // Returns: { total: 59.1, netPrice: 52.73, taxes: 6.37 }
 *
 * @example
 * // With error handling
 * try {
 *   const revenue = await enrichBookingRevenue(propertyID, reservationID);
 *   console.log(`Total: €${revenue.total}, Net: €${revenue.netPrice}, Taxes: €${revenue.taxes}`);
 * } catch (error) {
 *   console.error('Failed to enrich:', error.message);
 * }
 */
export const enrichBookingRevenue = async (propertyID, reservationID) => {
  console.log(`[CloudBeds API] 💰 Enriching booking ${reservationID} for property ${propertyID}...`);

  // ============================================================
  // STEP 1: Validate API Key
  // ============================================================

  if (!API_KEY) {
    console.error('[CloudBeds API] ❌ API key not configured');
    throw new Error('CloudBeds API key not found in .env. Please add VITE_CLOUDBEDS_API_KEY.');
  }

  // ============================================================
  // STEP 2: Build API Request
  // ============================================================

  const url = `${BASE_URL}/getReservation?propertyID=${propertyID}&reservationID=${reservationID}`;
  console.log(`[CloudBeds API] 🔗 GET ${url}`);

  // Setup timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    // ============================================================
    // STEP 3: Make HTTP Request
    // ============================================================

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // ============================================================
    // STEP 4: Handle HTTP Errors
    // ============================================================

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API key. Check VITE_CLOUDBEDS_API_KEY in .env');
      }
      if (response.status === 404) {
        throw new Error(`Reservation ${reservationID} not found`);
      }
      throw new Error(`API error ${response.status}: ${response.statusText}`);
    }

    // ============================================================
    // STEP 5: Parse JSON Response
    // ============================================================

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error('Invalid API response structure');
    }

    const reservation = result.data;

    // ============================================================
    // STEP 6: Extract Revenue Breakdown
    // ============================================================

    // total: Grand total with taxes (what guest pays)
    const total = parseFloat(reservation.total) || 0;

    // netPrice: Revenue without taxes (from balanceDetailed.subTotal)
    const netPrice = parseFloat(reservation.balanceDetailed?.subTotal) || null;

    // taxes: Tax amount (from balanceDetailed.taxesFees)
    const taxes = parseFloat(reservation.balanceDetailed?.taxesFees) || null;

    console.log(`[CloudBeds API] ✅ Enriched: €${total} (net: €${netPrice}, taxes: €${taxes})`);

    return { total, netPrice, taxes };

  } catch (error) {
    // ============================================================
    // ERROR HANDLING
    // ============================================================

    if (error.name === 'AbortError') {
      console.error(`[CloudBeds API] ⏱️  Enrichment timeout after ${TIMEOUT}ms`);
      throw new Error(`Request timeout after ${TIMEOUT}ms`);
    }

    if (error instanceof TypeError) {
      console.error('[CloudBeds API] 🌐 Network error during enrichment');
      throw new Error('Network error. Check internet connection.');
    }

    console.error(`[CloudBeds API] ❌ Enrichment failed:`, error);
    throw error;
  }
};

// ============================================================
// MODULE EXPORTS
// ============================================================

// Default export for convenience
export default fetchReservationsFromCloudBeds;

// Named export for enrichment
export { enrichBookingRevenue };

// ============================================================
// END OF FILE
// ============================================================
