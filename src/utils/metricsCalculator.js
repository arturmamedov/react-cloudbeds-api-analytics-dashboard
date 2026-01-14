// Utility: Calculate metric change (DRY)
export const calculateMetricChange = (current, previous) => {
    if (previous === 0 || previous === undefined) {
        return { change: current, percentage: current > 0 ? 100 : 0, isNew: true };
    }
    const change = current - previous;
    const percentage = Math.round((change / previous) * 100);
    return { change, percentage, isNew: false };
};

// Calculate hostel metrics (DRY helper)
export const calculateHostelMetrics = (bookings) => {
    const cancelled = bookings.filter(b => b.status?.toLowerCase().includes('cancel'));
    const valid = bookings.filter(b => !b.status?.toLowerCase().includes('cancel'));

    // Calculate Nest Pass (7+ nights) and Monthly (28+ nights)
    const nestPass = valid.filter(b => (b.nights || 0) >= 7);
    const monthly = nestPass.filter(b => (b.nights || 0) >= 28);

    // Calculate total revenue
    // Use b.total if enriched (includes taxes), otherwise fallback to b.price
    const totalRevenue = valid.reduce((sum, b) => sum + (b.total || b.price || 0), 0);
    const totalNights = valid.reduce((sum, b) => sum + (b.nights || 1), 0);
    const adr = totalNights > 0 ? totalRevenue / totalNights : 0;

    const avgLeadTime = valid
        .filter(b => b.leadTime !== null)
        .reduce((sum, b, _, arr) => sum + b.leadTime / arr.length, 0);

    // Calculate enriched revenue metrics (netRevenue and totalTaxes)
    // These are only available for bookings that have been enriched via API
    const enrichedBookings = valid.filter(b => b.netPrice != null && b.taxes != null);
    const netRevenue = enrichedBookings.reduce((sum, b) => sum + (b.netPrice || 0), 0);
    const totalTaxes = enrichedBookings.reduce((sum, b) => sum + (b.taxes || 0), 0);

    return {
        count: bookings.length,
        cancelled: cancelled.length,
        valid: valid.length,
        revenue: totalRevenue,
        adr: adr,
        nestPass: nestPass.length,  // NEW
        monthly: monthly.length,     // NEW
        avgLeadTime: Math.round(avgLeadTime),
        netRevenue: netRevenue,      // NEW: Enriched data
        totalTaxes: totalTaxes,      // NEW: Enriched data
        bookings: bookings
    };
};

// Calculate progressive week-over-week changes
export const calculateProgressiveMetricChanges = (weeklyData, weekIndex, hostel, metricKey) => {
    if (weekIndex === 0) return { change: 0, percentage: 0, isNew: true };

    const currentValue = weeklyData[weekIndex].hostels[hostel]?.[metricKey] || 0;
    const previousValue = weeklyData[weekIndex - 1].hostels[hostel]?.[metricKey] || 0;

    return calculateMetricChange(currentValue, previousValue);
};
