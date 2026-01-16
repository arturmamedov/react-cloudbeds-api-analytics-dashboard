// Utility: Format currency (DRY)
export const formatCurrency = (amount) => `€${amount.toFixed(2)}`;

// Parse price from string (€17,00 → 17.00)
export const parsePrice = (priceStr) => {
    if (!priceStr) return 0;
    const cleanPrice = priceStr.toString().replace(/[€,]/g, '').replace(',', '.');
    return parseFloat(cleanPrice) || 0;
};

/**
 * Format revenue with optional tax breakdown display
 *
 * This function is used throughout the dashboard to display revenue values
 * consistently, with support for showing tax breakdown when enriched data
 * is available and the user has enabled the toggle.
 *
 * @param {number} totalAmount - Total revenue amount (with taxes)
 * @param {number|null} netPrice - Net price (subtotal without taxes)
 * @param {number|null} taxes - Tax amount
 * @param {boolean} showTaxBreakdown - Whether to show tax breakdown
 * @returns {string} Formatted revenue string
 *
 * @example
 * // Without tax breakdown or no enriched data
 * formatRevenue(59.65, null, null, false) // => "€59.65"
 * formatRevenue(59.65, 52.73, 6.92, false) // => "€59.65"
 *
 * // With tax breakdown enabled and enriched data
 * formatRevenue(59.65, 52.73, 6.92, true) // => "€52.73 + (€6.92 taxes)"
 *
 * // With tax breakdown but no enriched data (fallback)
 * formatRevenue(59.65, null, null, true) // => "€59.65"
 */
export const formatRevenue = (totalAmount, netPrice = null, taxes = null, showTaxBreakdown = false) => {
    // If tax breakdown is disabled or enriched data not available, show total only
    if (!showTaxBreakdown || netPrice == null || taxes == null) {
        return formatCurrency(totalAmount || 0);
    }

    // Show breakdown: "€52.73 + (€6.92 taxes)"
    return `${formatCurrency(netPrice)} + (${formatCurrency(taxes)} taxes)`;
};
