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
        nestPass: nestPass.length,  // NEW
        monthly: monthly.length,     // NEW
        avgLeadTime: Math.round(avgLeadTime),
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
