// Utility: Format currency (DRY)
export const formatCurrency = (amount) => `€${amount.toFixed(2)}`;

// Parse price from string (€17,00 → 17.00)
export const parsePrice = (priceStr) => {
    if (!priceStr) return 0;
    const cleanPrice = priceStr.toString().replace(/[€,]/g, '').replace(',', '.');
    return parseFloat(cleanPrice) || 0;
};
