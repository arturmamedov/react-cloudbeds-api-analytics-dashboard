/**
 * Database Utilities
 *
 * Provides clean, simple functions to interact with Supabase database.
 * All functions follow the pattern: try/catch with descriptive error messages.
 *
 * Functions are organized by entity:
 * - Hostels: getHostels, getHostelBySlug, createHostel, updateHostel
 * - Reservations: saveReservation, saveReservations, getReservationsByWeek, updateReservationRevenue
 * - Weekly Reports: saveWeeklyReport, getWeeklyReports, getWeeklyReportsByDateRange
 * - Data Imports: createDataImport, getRecentImports
 */

import { supabase } from '../config/supabaseClient';
import { hostelConfig } from '../config/hostelConfig';

// ============================================================================
// HOSTELS
// ============================================================================

/**
 * Get all active hostels from database
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getHostels = async () => {
  try {
    const { data, error } = await supabase
      .from('hostels')
      .select('*')
      .eq('active', true)
      .order('name');

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching hostels:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get hostel by CloudBeds ID
 * @param {string} cloudbedsId - CloudBeds property ID (e.g., "6733")
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const getHostelByCloudbedsId = async (cloudbedsId) => {
  try {
    const { data, error } = await supabase
      .from('hostels')
      .select('*')
      .eq('cloudbeds_id', cloudbedsId)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching hostel:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get hostel by slug
 * @param {string} slug - Hostel slug (e.g., "flamingo")
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const getHostelBySlug = async (slug) => {
  try {
    const { data, error } = await supabase
      .from('hostels')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching hostel:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create or update hostel (upsert by cloudbeds_id)
 * @param {Object} hostelData - Hostel data
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const upsertHostel = async (hostelData) => {
  try {
    const { data, error } = await supabase
      .from('hostels')
      .upsert(
        {
          cloudbeds_id: hostelData.cloudbedsId,
          name: hostelData.name,
          slug: hostelData.slug || hostelData.name.toLowerCase(),
          active: hostelData.active !== undefined ? hostelData.active : true,
          metadata: hostelData.metadata || {},
        },
        { onConflict: 'cloudbeds_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error upserting hostel:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Seed hostels from hostelConfig
 * Ensures all hostels from config exist in database
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const seedHostelsFromConfig = async () => {
  try {
    const hostelPromises = Object.entries(hostelConfig).map(([slug, config]) =>
      upsertHostel({
        cloudbedsId: config.id,
        name: config.name,
        slug: slug.toLowerCase(),
        active: true,
      })
    );

    const results = await Promise.all(hostelPromises);
    const errors = results.filter((r) => !r.success);

    if (errors.length > 0) {
      throw new Error(`Failed to seed ${errors.length} hostels`);
    }

    const data = results.map((r) => r.data);
    return { success: true, data };
  } catch (error) {
    console.error('Error seeding hostels:', error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// RESERVATIONS
// ============================================================================

/**
 * Save a single reservation to database (upsert)
 * @param {Object} reservation - Reservation data from CloudBeds API or Excel
 * @param {string} hostelSlug - Hostel slug (e.g., "flamingo")
 * @param {string} dataSource - 'api', 'excel', or 'paste'
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const saveReservation = async (reservation, hostelSlug, dataSource = 'api') => {
  try {
    // Get hostel ID from slug
    const hostelResult = await getHostelBySlug(hostelSlug);
    if (!hostelResult.success) {
      throw new Error(`Hostel not found: ${hostelSlug}`);
    }

    const hostelId = hostelResult.data.id;

    // Prepare reservation data
    const reservationData = {
      cloudbeds_reservation_id: reservation.reservationID || reservation.id,
      hostel_id: hostelId,
      booking_date: reservation.created || reservation.bookingDate,
      checkin_date: reservation.startDate || reservation.checkinDate,
      checkout_date: reservation.endDate || reservation.checkoutDate,
      source: reservation.source,
      status: reservation.status,
      nights: reservation.nights || calculateNights(reservation),
      guests: reservation.adults || reservation.guests || 1,
      total_price: reservation.total || reservation.price || null,
      net_price: reservation.netPrice || reservation.subTotal || null,
      taxes: reservation.taxes || reservation.taxesFees || null,
      currency: reservation.currency || 'EUR',
      raw_data: reservation, // Store complete API response
      enrichment_data: {},
      data_source: dataSource,
    };

    // If enrichment data exists, add it
    if (reservation.enrichmentData) {
      reservationData.enrichment_data = reservation.enrichmentData;
      reservationData.enriched_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('reservations')
      .upsert(reservationData, { onConflict: 'cloudbeds_reservation_id' })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error saving reservation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Save multiple reservations in batch (more efficient)
 * @param {Array} reservations - Array of reservation objects
 * @param {string} hostelSlug - Hostel slug
 * @param {string} dataSource - 'api', 'excel', or 'paste'
 * @returns {Promise<{success: boolean, data?: Array, error?: string, stats?: Object}>}
 */
export const saveReservations = async (reservations, hostelSlug, dataSource = 'api') => {
  try {
    // Get hostel ID from slug
    const hostelResult = await getHostelBySlug(hostelSlug);
    if (!hostelResult.success) {
      throw new Error(`Hostel not found: ${hostelSlug}`);
    }

    const hostelId = hostelResult.data.id;

    // Prepare all reservations
    const reservationsData = reservations.map((reservation) => ({
      cloudbeds_reservation_id: reservation.reservationID || reservation.id,
      hostel_id: hostelId,
      booking_date: reservation.created || reservation.bookingDate,
      checkin_date: reservation.startDate || reservation.checkinDate,
      checkout_date: reservation.endDate || reservation.checkoutDate,
      source: reservation.source,
      status: reservation.status,
      nights: reservation.nights || calculateNights(reservation),
      guests: reservation.adults || reservation.guests || 1,
      total_price: reservation.total || reservation.price || null,
      net_price: reservation.netPrice || reservation.subTotal || null,
      taxes: reservation.taxes || reservation.taxesFees || null,
      currency: reservation.currency || 'EUR',
      raw_data: reservation,
      enrichment_data: reservation.enrichmentData || {},
      data_source: dataSource,
    }));

    // Batch upsert (Supabase handles this efficiently)
    const { data, error } = await supabase
      .from('reservations')
      .upsert(reservationsData, { onConflict: 'cloudbeds_reservation_id' })
      .select();

    if (error) throw error;

    return {
      success: true,
      data,
      stats: {
        total: reservations.length,
        saved: data.length,
      },
    };
  } catch (error) {
    console.error('Error saving reservations:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get reservations for a specific week
 * @param {Date} weekStart - Start of week (Monday)
 * @param {Date} weekEnd - End of week (Sunday)
 * @param {string} hostelSlug - Optional: filter by hostel
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getReservationsByWeek = async (weekStart, weekEnd, hostelSlug = null) => {
  try {
    let query = supabase
      .from('reservations_with_hostel')
      .select('*')
      .gte('booking_date', weekStart.toISOString().split('T')[0])
      .lte('booking_date', weekEnd.toISOString().split('T')[0])
      .order('booking_date');

    // Filter by hostel if specified
    if (hostelSlug) {
      query = query.eq('hostel_slug', hostelSlug);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get reservations by date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Object} filters - Optional filters {hostelSlug, source, status}
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getReservationsByDateRange = async (startDate, endDate, filters = {}) => {
  try {
    let query = supabase
      .from('reservations_with_hostel')
      .select('*')
      .gte('booking_date', startDate.toISOString().split('T')[0])
      .lte('booking_date', endDate.toISOString().split('T')[0])
      .order('booking_date');

    // Apply filters
    if (filters.hostelSlug) {
      query = query.eq('hostel_slug', filters.hostelSlug);
    }
    if (filters.source) {
      query = query.eq('source', filters.source);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update reservation with enriched revenue data
 * @param {string} cloudbedsReservationId - CloudBeds reservation ID
 * @param {Object} enrichmentData - Revenue data from getReservation() API call
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const updateReservationRevenue = async (cloudbedsReservationId, enrichmentData) => {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .update({
        total_price: enrichmentData.total,
        net_price: enrichmentData.netPrice || enrichmentData.subTotal,
        taxes: enrichmentData.taxes || enrichmentData.taxesFees,
        enrichment_data: enrichmentData,
        enriched_at: new Date().toISOString(),
      })
      .eq('cloudbeds_reservation_id', cloudbedsReservationId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating reservation revenue:', error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// WEEKLY REPORTS
// ============================================================================

/**
 * Save weekly report (pre-calculated metrics)
 * @param {Object} reportData - Weekly report data
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const saveWeeklyReport = async (reportData) => {
  try {
    // Get hostel ID from slug
    const hostelResult = await getHostelBySlug(reportData.hostelSlug);
    if (!hostelResult.success) {
      throw new Error(`Hostel not found: ${reportData.hostelSlug}`);
    }

    const hostelId = hostelResult.data.id;

    const weeklyReportData = {
      hostel_id: hostelId,
      week_start: reportData.weekStart,
      week_end: reportData.weekEnd,
      week_label: reportData.weekLabel,
      total_count: reportData.metrics.count,
      cancelled_count: reportData.metrics.cancelled.length,
      valid_count: reportData.metrics.valid.length,
      total_revenue: reportData.metrics.revenue,
      net_revenue: reportData.metrics.netRevenue || 0,
      total_taxes: reportData.metrics.totalTaxes || 0,
      adr: reportData.metrics.adr,
      nest_pass_count: reportData.metrics.nestPass.length,
      nest_pass_pct: reportData.metrics.nestPassPct || 0,
      monthly_count: reportData.metrics.monthly.length,
      monthly_pct: reportData.metrics.monthlyPct || 0,
      avg_lead_time: reportData.metrics.avgLeadTime,
      wow_changes: reportData.wowChanges || {},
      metrics_snapshot: reportData.metrics,
    };

    const { data, error } = await supabase
      .from('weekly_reports')
      .upsert(weeklyReportData, { onConflict: 'hostel_id,week_start' })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error saving weekly report:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Save multiple weekly reports in batch
 * @param {Array} reports - Array of weekly report objects
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const saveWeeklyReports = async (reports) => {
  try {
    const reportPromises = reports.map((report) => saveWeeklyReport(report));
    const results = await Promise.all(reportPromises);

    const errors = results.filter((r) => !r.success);
    if (errors.length > 0) {
      throw new Error(`Failed to save ${errors.length} reports`);
    }

    const data = results.map((r) => r.data);
    return { success: true, data };
  } catch (error) {
    console.error('Error saving weekly reports:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get weekly reports by date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} hostelSlug - Optional: filter by hostel
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getWeeklyReportsByDateRange = async (startDate, endDate, hostelSlug = null) => {
  try {
    let query = supabase
      .from('weekly_reports_with_hostel')
      .select('*')
      .gte('week_start', startDate.toISOString().split('T')[0])
      .lte('week_start', endDate.toISOString().split('T')[0])
      .order('week_start');

    if (hostelSlug) {
      query = query.eq('hostel_slug', hostelSlug);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching weekly reports:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all weekly reports (for dashboard)
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getAllWeeklyReports = async () => {
  try {
    const { data, error } = await supabase
      .from('weekly_reports_with_hostel')
      .select('*')
      .order('week_start', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching weekly reports:', error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// DATA IMPORTS
// ============================================================================

/**
 * Create data import record (for audit trail)
 * @param {Object} importData - Import metadata
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const createDataImport = async (importData) => {
  try {
    const { data, error } = await supabase
      .from('data_imports')
      .insert({
        import_type: importData.importType,
        import_source: importData.importSource,
        date_from: importData.dateFrom,
        date_to: importData.dateTo,
        reservations_count: importData.reservationsCount,
        hostels_affected: importData.hostelsAffected,
        status: importData.status || 'completed',
        error_message: importData.errorMessage || null,
        raw_file_data: importData.rawFileData || null,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating data import:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get recent data imports
 * @param {number} limit - Number of recent imports to fetch
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getRecentImports = async (limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('data_imports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching recent imports:', error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate nights from checkin/checkout dates
 * @param {Object} reservation - Reservation object with startDate and endDate
 * @returns {number} Number of nights
 */
const calculateNights = (reservation) => {
  if (!reservation.startDate || !reservation.endDate) return 0;

  const checkin = new Date(reservation.startDate);
  const checkout = new Date(reservation.endDate);
  const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));

  return nights > 0 ? nights : 0;
};

/**
 * Transform DB reservation to app format
 * Converts database reservation back to the format used by the app
 * @param {Object} dbReservation - Reservation from database
 * @returns {Object} App-formatted reservation
 */
export const transformDBReservationToApp = (dbReservation) => {
  return {
    id: dbReservation.cloudbeds_reservation_id,
    reservationID: dbReservation.cloudbeds_reservation_id,
    created: dbReservation.booking_date,
    bookingDate: dbReservation.booking_date,
    startDate: dbReservation.checkin_date,
    checkinDate: dbReservation.checkin_date,
    endDate: dbReservation.checkout_date,
    checkoutDate: dbReservation.checkout_date,
    source: dbReservation.source,
    status: dbReservation.status,
    nights: dbReservation.nights,
    guests: dbReservation.guests,
    adults: dbReservation.guests,
    price: dbReservation.total_price,
    total: dbReservation.total_price,
    netPrice: dbReservation.net_price,
    subTotal: dbReservation.net_price,
    taxes: dbReservation.taxes,
    taxesFees: dbReservation.taxes,
    currency: dbReservation.currency,
    leadTime: dbReservation.lead_time,
    isNestPass: dbReservation.is_nest_pass,
    isMonthly: dbReservation.is_monthly,
    // Include raw data if needed
    ...dbReservation.raw_data,
    // Mark as enriched if enrichment data exists
    isEnriched: !!dbReservation.enriched_at,
    enrichedAt: dbReservation.enriched_at,
  };
};

/**
 * Transform DB weekly report to app format
 * @param {Object} dbReport - Weekly report from database
 * @returns {Object} App-formatted weekly report
 */
export const transformDBWeeklyReportToApp = (dbReport) => {
  return {
    week: dbReport.week_label,
    date: new Date(dbReport.week_start),
    weekStart: dbReport.week_start,
    weekEnd: dbReport.week_end,
    hostels: {
      [dbReport.hostel_slug]: {
        count: dbReport.total_count,
        cancelled: [], // Not stored, would need to fetch if needed
        valid: [],     // Not stored, would need to fetch if needed
        revenue: dbReport.total_revenue,
        netRevenue: dbReport.net_revenue,
        totalTaxes: dbReport.total_taxes,
        adr: dbReport.adr,
        nestPass: [], // Not stored, count available
        nestPassCount: dbReport.nest_pass_count,
        nestPassPct: dbReport.nest_pass_pct,
        monthly: [], // Not stored, count available
        monthlyCount: dbReport.monthly_count,
        monthlyPct: dbReport.monthly_pct,
        avgLeadTime: dbReport.avg_lead_time,
        bookings: [], // Not stored, would need to fetch if needed
      },
    },
    wowChanges: dbReport.wow_changes,
    metricsSnapshot: dbReport.metrics_snapshot,
  };
};
