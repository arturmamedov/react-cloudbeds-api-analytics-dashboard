// Extensible date period configuration
export const dateConfig = {
    type: 'week', // Can be changed to 'month', 'custom', etc.
    weekStartDay: 1, // Monday = 1, Sunday = 0
    weekLength: 7 // Days in a week
};

// Helper function to parse Excel dates
export const parseExcelDate = (value) => {
    if (!value) return null;
    if (typeof value === 'number') {
        return new Date((value - 25569) * 86400 * 1000);
    }
    if (typeof value === 'string') {
        const parts = value.split('/');
        if (parts.length === 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
    }
    return null;
};

// Calculate week boundaries from any date (extensible for future periods)
export const calculatePeriod = (date, config = dateConfig) => {
    const targetDate = new Date(date);

    if (config.type === 'week') {
        // Find Monday of the week containing this date
        const dayOfWeek = targetDate.getDay();
        const diff = dayOfWeek === 0 ? -6 : config.weekStartDay - dayOfWeek; // Handle Sunday

        const weekStart = new Date(targetDate);
        weekStart.setDate(targetDate.getDate() + diff);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + config.weekLength - 1);
        weekEnd.setHours(23, 59, 59, 999);

        return { start: weekStart, end: weekEnd };
    }

    // Future: Add month, custom period calculations here
    return { start: targetDate, end: targetDate };
};

// Format period range for display (extensible)
export const formatPeriodRange = (start, end, config = dateConfig) => {
    const formatDate = (date) => {
        const day = date.getDate();
        const month = date.toLocaleDateString('en', { month: 'short' });
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    };

    if (config.type === 'week') {
        return `${formatDate(start)} - ${formatDate(end)}`;
    }

    // Future: Add other period formats here
    return formatDate(start);
};

// Calculate lead time
export const calculateLeadTime = (bookingDate, checkinDate) => {
    const bookDate = parseExcelDate(bookingDate);
    const checkinDateParsed = parseExcelDate(checkinDate);

    if (bookDate && checkinDateParsed) {
        return Math.floor((checkinDateParsed - bookDate) / (1000 * 60 * 60 * 24));
    }
    return null;
};

// Auto-detect week from booking dates
export const detectWeekFromBookings = (bookings) => {
    const bookingDates = bookings
        .map(b => parseExcelDate(b.bookingDate))
        .filter(d => d)
        .sort((a, b) => a - b);

    if (bookingDates.length === 0) return null;

    // Use the earliest booking date to determine the week
    const period = calculatePeriod(bookingDates[0]);
    return formatPeriodRange(period.start, period.end);
};

// Validate if bookings match selected week
export const validateWeekMatch = (bookings, expectedWeek) => {
    const detectedWeek = detectWeekFromBookings(bookings);
    const newWarnings = [];

    if (detectedWeek && expectedWeek && detectedWeek !== expectedWeek) {
        newWarnings.push(`⚠️ Data appears to be from ${detectedWeek} but you selected ${expectedWeek}`);
    }

    return newWarnings;
};
