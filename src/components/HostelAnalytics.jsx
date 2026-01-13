import React, { useState, useCallback } from 'react';
import { BarChart3, Table, Brain, Receipt } from 'lucide-react';
import * as XLSX from 'xlsx';

// Utility imports
import {
    calculatePeriod,
    formatPeriodRange,
    parseExcelDate,
    detectWeekFromBookings,
    validateWeekMatch,
    parsePrice,
    calculateHostelMetrics,
    detectHostelFromData,
    parsePastedData,
    sortWeeklyData,
    fetchReservationsFromCloudBeds,  // CloudBeds API utility
    enrichBookingRevenue             // NEW: Revenue enrichment utility
} from '../utils';

// Config imports
import { hostelConfig } from '../config/hostelConfig';

// Component imports
import WarningBanner from './DataInput/WarningBanner';
import DataInputPanel from './DataInput/DataInputPanel';
import LatestWeekSummary from './Dashboard/LatestWeekSummary';
import PerformanceTable from './Dashboard/PerformanceTable';
import AIAnalysisPanel from './Analysis/AIAnalysisPanel';
import ExcelStyleView from './Dashboard/ExcelStyleView';

const HostelAnalytics = () => {
    // State management
    const [weeklyData, setWeeklyData] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisReport, setAnalysisReport] = useState('');
    const [showCharts, setShowCharts] = useState(false);
    const [chartType, setChartType] = useState('line');
    const [pasteData, setPasteData] = useState('');
    const [selectedHostel, setSelectedHostel] = useState('');
    const [inputMethod, setInputMethod] = useState('file');
    const [selectedWeekStart, setSelectedWeekStart] = useState('');
    const [warnings, setWarnings] = useState([]);
    const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' or 'excel'

    // API fetch progress tracking (Phase 4: Progress UI Enhancement)
    // Structure: { mode, current, total, startTime, hostels: [{ name, status, bookingCount, elapsedTime, error }, ...] }
    const [apiFetchProgress, setApiFetchProgress] = useState(null);

    // Revenue enrichment state (Phase 6: Revenue Enrichment)
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
    //     { name: 'Flamingo', reservationID: '123', status: 'loading'|'success'|'error', error: null }
    //   ]
    // }

    // Tax breakdown toggle state (Phase 6: Tax Breakdown Display)
    // When true, shows revenue as "€52.73 + (€6.92 taxes)" format
    // When false, shows only total revenue "€59.65"
    const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

    // Process pasted data
    const processPastedData = () => {
        if (!pasteData.trim()) {
            alert('Please paste data');
            return;
        }

        setIsUploading(true);
        setWarnings([]);

        try {
            const detectedHostel = detectHostelFromData(pasteData) || selectedHostel;

            if (!detectedHostel) {
                alert('Could not detect hostel. Please select one from the dropdown.');
                setIsUploading(false);
                return;
            }

            const reservations = parsePastedData(pasteData);

            if (reservations.length === 0) {
                alert('No valid reservations found in the pasted data');
                setIsUploading(false);
                return;
            }

            // Determine week (user selection or auto-detect)
            let weekRange = '';
            if (selectedWeekStart) {
                const period = calculatePeriod(new Date(selectedWeekStart));
                weekRange = formatPeriodRange(period.start, period.end);
            } else {
                weekRange = detectWeekFromBookings(reservations);
            }

            if (!weekRange) {
                alert('Could not determine week. Please select a week date.');
                setIsUploading(false);
                return;
            }

            // Validate week match
            const weekWarnings = validateWeekMatch(reservations, weekRange);
            setWarnings(weekWarnings);

            // Calculate metrics
            const metrics = calculateHostelMetrics(reservations);

            // Add new week data
            const newWeekData = {
                week: weekRange,
                date: selectedWeekStart ? new Date(selectedWeekStart) : new Date(),
                hostels: { [detectedHostel]: metrics }
            };

            setWeeklyData(prev => {
                // Check if week already exists and merge data
                const existingWeekIndex = prev.findIndex(w => w.week === weekRange);
                if (existingWeekIndex >= 0) {
                    const updated = [...prev];
                    updated[existingWeekIndex].hostels[detectedHostel] = metrics;
                    return sortWeeklyData(updated);
                } else {
                    return sortWeeklyData([...prev, newWeekData]);
                }
            });

            setPasteData('');
            setSelectedHostel('');
            setSelectedWeekStart('');

        } catch (error) {
            console.error('Error processing pasted data:', error);
            alert(`Error processing data: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    /**
     * Handle CloudBeds API fetch
     * Fetches reservation data from CloudBeds API for selected hostel(s) and week.
     * Supports two modes: 'single' (one hostel) and 'all' (all 11 hostels).
     *
     * @param {object} params - Fetch parameters
     * @param {string} params.mode - 'single' or 'all'
     * @param {string} params.hostelName - Hostel name (for single mode)
     * @param {Date} params.weekStart - Week start date
     * @param {boolean} params.confirmed - PHASE 5: If true, skip duplicate check
     */
    const handleAPIFetchStart = useCallback(async ({ mode, hostelName, weekStart, confirmed = false }) => {
        console.log('[HostelAnalytics] 🚀 API Fetch Started', { mode, hostelName, weekStart, confirmed });

        // Convert string date to Date object if needed (weekStart can be string or Date)
        const weekStartDate = weekStart instanceof Date ? weekStart : new Date(weekStart);
        console.log('[HostelAnalytics] 📅 Week start date:', weekStartDate);

        // ============================================================
        // PHASE 5: DUPLICATE DETECTION (Skip if confirmed=true)
        // ============================================================

        if (!confirmed) {
            // Calculate week range to check for duplicates
            const period = calculatePeriod(weekStartDate);
            const weekRange = formatPeriodRange(period.start, period.end);

            // Check if this week already has data
            const existingWeek = weeklyData.find(w => w.week === weekRange);

            if (existingWeek) {
                console.log('[HostelAnalytics] ⚠️  Week already exists in data:', weekRange);
                console.log('[HostelAnalytics] 📊 Existing hostels:', Object.keys(existingWeek.hostels));

                // Return confirmation request to parent
                return {
                    requiresConfirmation: true,
                    existingWeek: existingWeek,
                    weekRange: weekRange,
                    params: { mode, hostelName, weekStart }
                };
            }

            console.log('[HostelAnalytics] ✅ No existing data for week:', weekRange);
        } else {
            console.log('[HostelAnalytics] ✅ Confirmed by user - proceeding with fetch');
        }

        // ============================================================
        // PROCEED WITH FETCH
        // ============================================================

        setIsUploading(true);
        setWarnings([]);

        try {

            // ============================================================
            // SINGLE HOSTEL MODE
            // ============================================================
            if (mode === 'single') {
                console.log(`[HostelAnalytics] 📱 Single hostel mode: ${hostelName}`);

                // Get property ID from config
                const propertyID = hostelConfig[hostelName].id;
                console.log(`[HostelAnalytics] 🏨 Property ID: ${propertyID}`);

                // Calculate week date range (Mon-Sun)
                const period = calculatePeriod(weekStartDate);
                const weekRange = formatPeriodRange(period.start, period.end);
                console.log(`[HostelAnalytics] 📅 Week range: ${weekRange}`);

                // Format dates for API (YYYY-MM-DD)
                const startDate = formatDateForAPI(period.start);
                const endDate = formatDateForAPI(period.end);
                console.log(`[HostelAnalytics] 📆 API dates: ${startDate} to ${endDate}`);

                // Fetch from CloudBeds API
                console.log(`[HostelAnalytics] 🌐 Fetching from CloudBeds API...`);
                const bookings = await fetchReservationsFromCloudBeds(propertyID, startDate, endDate);
                console.log(`[HostelAnalytics] ✅ Fetched ${bookings.length} direct bookings for ${hostelName}`);

                // Calculate metrics (reuse existing function! DRY principle)
                console.log(`[HostelAnalytics] 🧮 Calculating metrics...`);
                const metrics = calculateHostelMetrics(bookings);
                console.log(`[HostelAnalytics] 📊 Metrics:`, metrics);

                // Create week data structure
                const newWeekData = {
                    week: weekRange,
                    date: weekStartDate,
                    hostels: {
                        [hostelName]: metrics
                    }
                };

                // Update state with smart merge
                console.log(`[HostelAnalytics] 💾 Updating weekly data...`);
                setWeeklyData(prev => {
                    // Check if week already exists and merge data
                    const existingWeekIndex = prev.findIndex(w => w.week === weekRange);
                    if (existingWeekIndex >= 0) {
                        console.log(`[HostelAnalytics] 🔄 Week exists - merging ${hostelName} data`);
                        const updated = [...prev];
                        updated[existingWeekIndex].hostels[hostelName] = metrics;
                        return sortWeeklyData(updated);
                    } else {
                        console.log(`[HostelAnalytics] ➕ New week - adding data`);
                        return sortWeeklyData([...prev, newWeekData]);
                    }
                });

                console.log(`[HostelAnalytics] ✨ Success! ${hostelName} data updated`);
                alert(`✅ Successfully fetched ${metrics.count} bookings for ${hostelName}\n\n` +
                    `Revenue: €${metrics.revenue.toFixed(2)}\n` +
                    `Valid Bookings: ${metrics.valid}\n` +
                    `Nest Pass (7+ nights): ${metrics.nestPass}\n` +
                    `Monthly (28+ nights): ${metrics.monthly}`);
            }

            // ============================================================
            // ALL HOSTELS MODE (Phase 3 - Multi-Hostel Fetching!)
            // ============================================================
            else if (mode === 'all') {
                console.log('[HostelAnalytics] 🏨🏨🏨 All hostels mode: Fetching 11 properties!');

                // Calculate week date range
                const period = calculatePeriod(weekStartDate);
                const weekRange = formatPeriodRange(period.start, period.end);
                console.log(`[HostelAnalytics] 📅 Week range: ${weekRange}`);

                // Format dates for API
                const startDate = formatDateForAPI(period.start);
                const endDate = formatDateForAPI(period.end);
                console.log(`[HostelAnalytics] 📆 API dates: ${startDate} to ${endDate}`);

                // Get all hostel names from config
                const hostelList = Object.keys(hostelConfig);
                console.log(`[HostelAnalytics] 📋 Hostels to fetch: ${hostelList.join(', ')}`);

                // PHASE 4: Initialize progress tracking
                const progressStartTime = Date.now();
                setApiFetchProgress({
                    mode: 'all',
                    current: 0,
                    total: hostelList.length,
                    startTime: progressStartTime,
                    hostels: hostelList.map(name => ({
                        name,
                        status: 'pending',
                        bookingCount: 0,
                        elapsedTime: 0,
                        error: null
                    }))
                });
                console.log(`[HostelAnalytics] 📊 Progress tracking initialized for ${hostelList.length} hostels`);

                const results = {};
                let successCount = 0;
                let errorCount = 0;
                const errors = [];

                // Loop through all 11 hostels
                console.log(`[HostelAnalytics] 🔄 Starting sequential fetch for ${hostelList.length} hostels...`);

                for (let i = 0; i < hostelList.length; i++) {
                    const hostelName = hostelList[i];
                    const hostelStartTime = Date.now();

                    console.log(`[HostelAnalytics] [${i + 1}/${hostelList.length}] 🏨 Fetching ${hostelName}...`);

                    // PHASE 4: Update progress - mark hostel as 'loading'
                    setApiFetchProgress(prev => prev ? {
                        ...prev,
                        current: i + 1,
                        hostels: prev.hostels.map(h =>
                            h.name === hostelName ? { ...h, status: 'loading' } : h
                        )
                    } : null);

                    try {
                        // Get property ID
                        const propertyID = hostelConfig[hostelName].id;
                        console.log(`[HostelAnalytics] [${i + 1}/${hostelList.length}] 🆔 Property ID: ${propertyID}`);

                        // Fetch from CloudBeds API
                        const bookings = await fetchReservationsFromCloudBeds(propertyID, startDate, endDate);
                        const elapsedTime = Date.now() - hostelStartTime;

                        console.log(`[HostelAnalytics] [${i + 1}/${hostelList.length}] ✅ ${hostelName}: ${bookings.length} bookings (${(elapsedTime / 1000).toFixed(1)}s)`);

                        // Calculate metrics
                        const metrics = calculateHostelMetrics(bookings);

                        // Store result
                        results[hostelName] = metrics;
                        successCount++;

                        // PHASE 4: Update progress - mark hostel as 'success'
                        setApiFetchProgress(prev => prev ? {
                            ...prev,
                            hostels: prev.hostels.map(h =>
                                h.name === hostelName
                                    ? { ...h, status: 'success', bookingCount: metrics.count, elapsedTime }
                                    : h
                            )
                        } : null);

                        // Small delay to avoid potential rate limiting (500ms)
                        if (i < hostelList.length - 1) { // Don't delay after last hostel
                            console.log(`[HostelAnalytics] [${i + 1}/${hostelList.length}] ⏱️  Waiting 500ms before next fetch...`);
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }

                    } catch (error) {
                        const elapsedTime = Date.now() - hostelStartTime;
                        console.error(`[HostelAnalytics] [${i + 1}/${hostelList.length}] ❌ ${hostelName} failed:`, error.message, `(${(elapsedTime / 1000).toFixed(1)}s)`);

                        errorCount++;
                        errors.push({
                            hostelName,
                            error: error.message
                        });

                        // PHASE 4: Update progress - mark hostel as 'error'
                        setApiFetchProgress(prev => prev ? {
                            ...prev,
                            hostels: prev.hostels.map(h =>
                                h.name === hostelName
                                    ? { ...h, status: 'error', error: error.message, elapsedTime }
                                    : h
                            )
                        } : null);

                        // CONTINUE to next hostel (don't stop on error!)
                        console.log(`[HostelAnalytics] [${i + 1}/${hostelList.length}] ⏩ Continuing to next hostel...`);
                    }
                }

                // Update state with all successful results
                if (successCount > 0) {
                    console.log(`[HostelAnalytics] 💾 Updating weekly data with ${successCount} hostels...`);

                    setWeeklyData(prev => {
                        // Check if week already exists and merge data
                        const existingWeekIndex = prev.findIndex(w => w.week === weekRange);
                        if (existingWeekIndex >= 0) {
                            console.log(`[HostelAnalytics] 🔄 Week exists - merging ${successCount} hostels`);
                            const updated = [...prev];
                            // Merge new hostel data with existing
                            updated[existingWeekIndex].hostels = {
                                ...updated[existingWeekIndex].hostels,
                                ...results
                            };
                            return sortWeeklyData(updated);
                        } else {
                            console.log(`[HostelAnalytics] ➕ New week - adding ${successCount} hostels`);
                            return sortWeeklyData([...prev, {
                                week: weekRange,
                                date: weekStartDate,
                                hostels: results
                            }]);
                        }
                    });

                    console.log(`[HostelAnalytics] ✨ Data updated successfully!`);
                }

                // Show summary
                console.log(`[HostelAnalytics] 📊 Fetch Summary:`, {
                    total: hostelList.length,
                    successful: successCount,
                    failed: errorCount
                });

                if (errorCount === 0) {
                    console.log(`[HostelAnalytics] 🎉 All ${hostelList.length} hostels fetched successfully!`);
                    const totalBookings = Object.values(results).reduce((sum, h) => sum + h.count, 0);
                    alert(`✅ Success! All ${hostelList.length} hostels fetched!\n\n` +
                        `Total Bookings: ${totalBookings}\n` +
                        `Week: ${weekRange}`);
                } else {
                    console.warn(`[HostelAnalytics] ⚠️  Completed with ${errorCount} error(s)`);
                    const errorList = errors.map(e => `- ${e.hostelName}: ${e.error}`).join('\n');
                    alert(`⚠️  Fetched ${successCount}/${hostelList.length} hostels successfully\n\n` +
                        `${errorCount} hostel(s) failed:\n${errorList}\n\n` +
                        `Check console for details.`);
                }

                // PHASE 4: Clear progress after 2 seconds (give user time to see final state)
                console.log('[HostelAnalytics] 🧹 Scheduling progress clear in 2s...');
                setTimeout(() => {
                    setApiFetchProgress(null);
                    console.log('[HostelAnalytics] ✨ Progress cleared');
                }, 2000);
            }

        } catch (error) {
            console.error('[HostelAnalytics] ❌ API fetch error:', error);

            // PHASE 4: Clear progress on error
            setApiFetchProgress(null);

            alert(`❌ Error fetching from CloudBeds:\n\n${error.message}\n\nPlease check:\n` +
                `- Your .env file has valid API credentials\n` +
                `- You restarted the dev server after adding .env\n` +
                `- Your internet connection is working`);
        } finally {
            setIsUploading(false);
            console.log('[HostelAnalytics] 🏁 API Fetch Complete');
        }
    }, [weeklyData]);  // PHASE 5: Added weeklyData dependency for duplicate detection

    /**
     * Check if data has bookings that can be enriched
     *
     * Returns true if any booking has reservationID but no total field.
     * This indicates API-fetched data that hasn't been enriched yet.
     *
     * Used to show/hide the "Enrich Revenue Data" button.
     *
     * @returns {boolean} True if enrichment is available
     */
    const canEnrichRevenue = useCallback(() => {
        return weeklyData.some(week =>
            Object.values(week.hostels).some(hostelData =>
                hostelData.bookings?.some(b =>
                    b.reservation && b.total == null
                )
            )
        );
    }, [weeklyData]);

    /**
     * Check if we have enriched revenue data (with tax breakdown)
     *
     * Returns true if any booking has netPrice and taxes fields populated,
     * which means enrichment has been completed for at least some bookings.
     *
     * Used to show/hide the "Show Tax Breakdown" toggle.
     *
     * @returns {boolean} True if enriched data is available
     */
    const hasEnrichedData = useCallback(() => {
        return weeklyData.some(week =>
            Object.values(week.hostels).some(hostelData =>
                hostelData.bookings?.some(b =>
                    b.netPrice != null && b.taxes != null
                )
            )
        );
    }, [weeklyData]);

    /**
     * Enrich API-fetched bookings with detailed revenue breakdown
     *
     * This function performs background enrichment of booking data by making
     * individual API calls to getReservation endpoint for each booking.
     *
     * **Process:**
     * 1. Collect all bookings with reservationID (from API fetch)
     * 2. Initialize progress tracking
     * 3. Loop through each booking sequentially
     * 4. Call enrichBookingRevenue() for detailed revenue
     * 5. Update booking with: { total, netPrice, taxes }
     * 6. Show real-time progress
     * 7. Respect 10-second rate limit between calls
     * 8. Allow user cancellation
     *
     * **Rate Limiting:**
     * - 10 seconds between calls (VITE_CLOUDBEDS_API_TIMEOUT)
     * - For 100 bookings: ~17 minutes total
     *
     * **User Experience:**
     * - Shows progress: "Enriching 23/100 bookings (4min 20s)"
     * - Updates data incrementally (see changes in real-time)
     * - Cancel button available
     */
    const enrichWithRevenueDetails = useCallback(async () => {
        console.log('[HostelAnalytics] 🔄 Starting revenue enrichment...');

        setIsEnriching(true);
        setEnrichmentCancelled(false);

        // ============================================================
        // STEP 1: Collect all bookings that need enrichment
        // ============================================================

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
            alert('No bookings to enrich.\n\nMake sure you have fetched data from CloudBeds API first.');
            setIsEnriching(false);
            return;
        }

        console.log(`[HostelAnalytics] 📊 Found ${totalBookings} bookings to enrich`);

        // ============================================================
        // STEP 2: Initialize progress tracking
        // ============================================================

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

        // Get rate limit from .env (default 10 seconds)
        const rateLimitMs = parseInt(import.meta.env.VITE_CLOUDBEDS_API_TIMEOUT) || 10000;
        console.log(`[HostelAnalytics] ⏱️  Rate limit: ${rateLimitMs}ms between calls`);

        // ============================================================
        // STEP 3: Enrich each booking sequentially
        // ============================================================

        for (let i = 0; i < allBookings.length; i++) {
            // Check if user cancelled
            if (enrichmentCancelled) {
                console.log('[HostelAnalytics] ⏹️  Enrichment cancelled by user');
                break;
            }

            const booking = allBookings[i];
            const bookingStartTime = Date.now();

            // Update progress - mark as loading
            setEnrichmentProgress(prev => prev ? {
                ...prev,
                current: i + 1,
                hostels: prev.hostels.map((h, idx) =>
                    idx === i ? { ...h, status: 'loading' } : h
                )
            } : null);

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
                setEnrichmentProgress(prev => prev ? {
                    ...prev,
                    hostels: prev.hostels.map((h, idx) =>
                        idx === i ? { ...h, status: 'success' } : h
                    )
                } : null);

                // Rate limiting: Wait before next call (except for last booking)
                if (i < allBookings.length - 1 && !enrichmentCancelled) {
                    console.log(`[HostelAnalytics] ⏱️  Waiting ${rateLimitMs}ms...`);
                    await new Promise(resolve => setTimeout(resolve, rateLimitMs));
                }

            } catch (error) {
                console.error(`[HostelAnalytics] ❌ Failed to enrich ${booking.reservation}:`, error);

                // Update progress - mark as error
                setEnrichmentProgress(prev => prev ? {
                    ...prev,
                    hostels: prev.hostels.map((h, idx) =>
                        idx === i ? { ...h, status: 'error', error: error.message } : h
                    )
                } : null);
            }
        }

        // ============================================================
        // STEP 4: Complete enrichment
        // ============================================================

        const successCount = enrichmentProgress?.hostels.filter(h => h.status === 'success').length || 0;

        setIsEnriching(false);

        console.log(`[HostelAnalytics] 🏁 Enrichment complete: ${successCount}/${totalBookings} successful`);

        if (successCount > 0) {
            alert(`✅ Revenue enrichment complete!\n\n${successCount}/${totalBookings} bookings enriched successfully.`);
        } else {
            alert(`❌ Enrichment failed.\n\nNo bookings were enriched successfully. Check console for errors.`);
        }

        // Clear progress after 3 seconds
        setTimeout(() => setEnrichmentProgress(null), 3000);

    }, [weeklyData, enrichmentCancelled, enrichmentProgress]);

    /**
     * Cancel ongoing enrichment process
     *
     * Sets cancellation flag which will be checked before next API call.
     * Current API call will complete, but no new calls will be made.
     */
    const cancelEnrichment = useCallback(() => {
        console.log('[HostelAnalytics] ⏹️  Cancelling enrichment...');
        setEnrichmentCancelled(true);
    }, []);

    /**
     * Helper: Format Date object to "YYYY-MM-DD" for API
     * @param {Date} date - Date object
     * @returns {string} Formatted date string
     */
    const formatDateForAPI = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Process uploaded files (now supports folders)
    const processFiles = async (files) => {
        setIsUploading(true);
        setWarnings([]);
        const fileArray = Array.from(files);
        const weekReservations = {};

        try {
            // Filter for Excel files
            const excelFiles = fileArray.filter(file =>
                file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
            );

            if (excelFiles.length === 0) {
                alert('No Excel files found');
                setIsUploading(false);
                return;
            }

            for (const file of excelFiles) {
                const hostelName = file.name.replace('.xlsx', '').replace('.xls', '');

                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data);
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                // Skip header row and process reservations
                const reservations = jsonData.slice(1).filter(row => row.length > 0);

                // Filter for direct bookings
                const directBookings = reservations.filter(row => {
                    const source = row[33];
                    return source && source.includes('Sitio web');
                });

                const bookings = directBookings.map(row => ({
                    bookingDate: row[32],
                    arrivalDate: row[23],
                    status: row[35],
                    nights: parseInt(row[25]),
                    price: parseFloat(row[27]) || 0,
                    leadTime: (() => {
                        const bookDate = parseExcelDate(row[32]);
                        const arrDate = parseExcelDate(row[23]);
                        if (bookDate && arrDate) {
                            return Math.floor((arrDate - bookDate) / (1000 * 60 * 60 * 24));
                        }
                        return null;
                    })()
                }));

                weekReservations[hostelName] = calculateHostelMetrics(bookings);
            }

            // Determine week (user selection or auto-detect)
            let weekRange = '';
            if (selectedWeekStart) {
                const period = calculatePeriod(new Date(selectedWeekStart));
                weekRange = formatPeriodRange(period.start, period.end);
            } else {
                // Auto-detect from first file's data
                const allBookingDates = Object.values(weekReservations)
                    .flatMap(h => h.bookings.map(b => parseExcelDate(b.bookingDate)))
                    .filter(d => d)
                    .sort((a, b) => a - b);

                if (allBookingDates.length > 0) {
                    const period = calculatePeriod(allBookingDates[0]);
                    weekRange = formatPeriodRange(period.start, period.end);
                }
            }

            if (!weekRange) {
                alert('Could not determine week. Please select a week date.');
                setIsUploading(false);
                return;
            }

            const newWeekData = {
                week: weekRange,
                date: selectedWeekStart ? new Date(selectedWeekStart) : new Date(),
                hostels: weekReservations
            };

            setWeeklyData(prev => {
                // Check if week already exists and merge
                const existingWeekIndex = prev.findIndex(w => w.week === weekRange);
                if (existingWeekIndex >= 0) {
                    const updated = [...prev];
                    updated[existingWeekIndex].hostels = { ...updated[existingWeekIndex].hostels, ...weekReservations };
                    return sortWeeklyData(updated);
                } else {
                    return sortWeeklyData([...prev, newWeekData]);
                }
            });

            setSelectedWeekStart('');

        } catch (error) {
            console.error('Error processing files:', error);
            alert(`Error processing files: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    // Process file system entries (folders and files)
    const processEntry = async (entry) => {
        if (entry.isFile) {
            return new Promise((resolve) => {
                entry.file(resolve);
            });
        } else if (entry.isDirectory) {
            const reader = entry.createReader();
            const entries = await new Promise((resolve) => {
                reader.readEntries(resolve);
            });

            const files = [];
            for (const childEntry of entries) {
                const childFiles = await processEntry(childEntry);
                if (Array.isArray(childFiles)) {
                    files.push(...childFiles);
                } else {
                    files.push(childFiles);
                }
            }
            return files;
        }
        return [];
    };

    // Handle file drop (including folders)
    const handleDrop = useCallback(async (e) => {
        e.preventDefault();
        const items = e.dataTransfer.items;

        // Process drag & drop items (supports folders)
        if (items) {
            const promises = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind === 'file') {
                    const entry = item.webkitGetAsEntry();
                    if (entry) {
                        promises.push(processEntry(entry));
                    }
                }
            }

            const allFiles = await Promise.all(promises);
            const flatFiles = allFiles.flat().filter(file =>
                file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
            );

            if (flatFiles.length > 0) {
                processFiles(flatFiles);
            } else {
                alert('No Excel files found in the dropped items');
            }
        } else {
            // Fallback for simple file drag & drop
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                processFiles(files);
            }
        }
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
    }, []);

    // Handle file/folder input
    const handleFileInput = (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            processFiles(files);
        }
    };

    // Get AI analysis
    const getAIAnalysis = async () => {
        if (weeklyData.length === 0) return;

        setIsAnalyzing(true);

        try {
            const prompt = `Analyze this hostel reservation data and provide insights on performance trends and reasons for changes:

${JSON.stringify(weeklyData, null, 2)}

Please provide:
1. Key performance insights
2. Trends by hostel
3. Possible reasons for week-over-week changes
4. Recommendations for improvement
5. Notable patterns in booking behavior and ADR

Format your response in a clear, actionable report.`;

            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1000,
                    messages: [{ role: "user", content: prompt }]
                })
            });

            const data = await response.json();
            const analysis = data.content[0].text;
            setAnalysisReport(analysis);

        } catch (error) {
            console.error('Error getting AI analysis:', error);
            setAnalysisReport('Sorry, there was an error generating the analysis. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Get all unique hostels
    const getAllHostels = () => {
        const hostelSet = new Set();
        weeklyData.forEach(week => {
            Object.keys(week.hostels).forEach(hostel => hostelSet.add(hostel));
        });
        return Array.from(hostelSet).sort();
    };

    // Prepare chart data
    const prepareChartData = () => {
        const allHostels = getAllHostels();

        return weeklyData.map(week => {
            const dataPoint = { week: week.week };
            allHostels.forEach(hostel => {
                dataPoint[hostel] = week.hostels[hostel]?.count || 0;
            });
            return dataPoint;
        });
    };

    const allHostels = getAllHostels();
    const chartData = prepareChartData();
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#14B8A6'];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
                        <BarChart3 className="text-blue-600" />
                        Hostel Analytics Dashboard
                    </h1>
                    <p className="text-gray-600 text-lg">Track weekly direct bookings and analyze performance trends</p>
                </div>

                {/* View Mode Toggle - Only show when data is loaded */}
                {weeklyData.length > 0 && (
                    <div className="flex flex-col items-center gap-4 mb-6">
                        {/* View Mode Buttons */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => setViewMode('dashboard')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold font-heading transition-colors ${viewMode === 'dashboard'
                                    ? 'bg-nests-teal text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                <BarChart3 className="w-5 h-5" />
                                Dashboard View
                            </button>
                            <button
                                onClick={() => setViewMode('excel')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold font-heading transition-colors ${viewMode === 'excel'
                                    ? 'bg-nests-teal text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                <Table className="w-5 h-5" />
                                Excel View
                            </button>
                        </div>

                        {/* Tax Breakdown Toggle - Only show when enriched data is available */}
                        {hasEnrichedData() && (
                            <button
                                onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${showTaxBreakdown
                                    ? 'bg-nests-green text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                <Receipt className="w-4 h-4" />
                                {showTaxBreakdown ? 'Hide Tax Breakdown' : 'Show Tax Breakdown'}
                            </button>
                        )}
                    </div>
                )}

                {/* Warnings */}
                <WarningBanner warnings={warnings} />

                {/* Data Input Panel */}
                <DataInputPanel
                    inputMethod={inputMethod}
                    setInputMethod={setInputMethod}
                    selectedWeekStart={selectedWeekStart}
                    setSelectedWeekStart={setSelectedWeekStart}
                    handleDrop={handleDrop}
                    handleDragOver={handleDragOver}
                    handleFileInput={handleFileInput}
                    selectedHostel={selectedHostel}
                    setSelectedHostel={setSelectedHostel}
                    pasteData={pasteData}
                    setPasteData={setPasteData}
                    processPastedData={processPastedData}
                    isUploading={isUploading}
                    onAPIFetchStart={handleAPIFetchStart}
                    apiFetchProgress={apiFetchProgress}
                    // Revenue enrichment props
                    canEnrichRevenue={canEnrichRevenue()}
                    isEnriching={isEnriching}
                    enrichmentProgress={enrichmentProgress}
                    onEnrichStart={enrichWithRevenueDetails}
                    onEnrichCancel={cancelEnrichment}
                />

                {/* Conditional View Rendering - Dashboard or Excel */}
                {viewMode === 'dashboard' ? (
                    <>
                        {/* Current Week Summary - Responsive Grid */}
                        <LatestWeekSummary
                            weeklyData={weeklyData}
                            showTaxBreakdown={showTaxBreakdown}
                        />

                        {/* Weekly Comparison Table */}
                        <PerformanceTable
                            weeklyData={weeklyData}
                            allHostels={allHostels}
                            showCharts={showCharts}
                            setShowCharts={setShowCharts}
                            chartData={chartData}
                            colors={colors}
                            chartType={chartType}
                            setChartType={setChartType}
                            getAIAnalysis={getAIAnalysis}
                            isAnalyzing={isAnalyzing}
                            showTaxBreakdown={showTaxBreakdown}
                        />

                        {/* AI Analysis */}
                        <AIAnalysisPanel analysisReport={analysisReport} />
                    </>
                ) : (
                    <>
                        {/* Excel-Style View */}
                        <ExcelStyleView
                            weeklyData={weeklyData}
                            showTaxBreakdown={showTaxBreakdown}
                        />

                        {/* AI Analysis Button for Excel view */}
                        <div className="flex justify-center mb-6">
                            <button
                                onClick={getAIAnalysis}
                                disabled={isAnalyzing}
                                className="bg-nests-dark-teal text-white px-6 py-3 rounded-lg font-semibold font-heading hover:bg-nests-teal transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                <Brain className="w-5 h-5" />
                                {isAnalyzing ? 'Analyzing...' : 'Generate AI Analysis'}
                            </button>
                        </div>

                        {/* AI Analysis Panel */}
                        <AIAnalysisPanel analysisReport={analysisReport} />
                    </>
                )}

                {weeklyData.length === 0 && (
                    <div className="text-center py-12">
                        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-600 mb-2">No data yet</h3>
                        <p className="text-gray-500">Upload files/folders or paste data to start analyzing</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HostelAnalytics;