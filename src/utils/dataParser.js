import { parseExcelDate, calculateLeadTime } from './dateUtils';
import { parsePrice } from './formatters';
import { hostelConfig } from '../config/hostelConfig';

// Detect hostel from data
export const detectHostelFromData = (data) => {
    // Try to find hostel ID in URLs first
    for (const [hostelName, config] of Object.entries(hostelConfig)) {
        if (data.includes(config.id)) return hostelName;
    }

    // Try to find hostel name in data
    for (const hostelName of Object.keys(hostelConfig)) {
        if (data.toLowerCase().includes(hostelName.toLowerCase())) return hostelName;
    }

    return null;
};

// Parse pasted data (both HTML and text)
export const parsePastedData = (data) => {
    const reservations = [];

    try {
        // Try to parse as HTML first
        if (data.includes('<table') || data.includes('<tr')) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(data, 'text/html');
            const rows = doc.querySelectorAll('tr');

            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 10) {
                    const reservation = cells[1]?.textContent?.trim();
                    const bookingDate = cells[4]?.textContent?.trim();
                    const checkin = cells[6]?.textContent?.trim();
                    const checkout = cells[7]?.textContent?.trim();
                    const nights = cells[8]?.textContent?.trim();
                    const price = cells[9]?.textContent?.trim();
                    const status = cells[10]?.textContent?.trim();
                    const source = cells[11]?.textContent?.trim();

                    if (reservation && bookingDate && source?.includes('Sitio web')) {
                        reservations.push({
                            reservation, bookingDate, checkin, checkout,
                            nights: parseInt(nights) || 1,
                            price: parsePrice(price),
                            status, source,
                            leadTime: calculateLeadTime(bookingDate, checkin)
                        });
                    }
                }
            });
        } else {
            // Parse as plain text
            const lines = data.split('\n').filter(line => line.trim());

            lines.forEach(line => {
                const cells = line.split('\t');
                if (cells.length >= 10) {
                    const reservation = cells[1]?.trim();
                    const bookingDate = cells[4]?.trim();
                    const checkin = cells[6]?.trim();
                    const checkout = cells[7]?.trim();
                    const nights = cells[8]?.trim();
                    const price = cells[9]?.trim();
                    const status = cells[10]?.trim();
                    const source = cells[11]?.trim();

                    if (reservation && bookingDate && source?.includes('Sitio web')) {
                        reservations.push({
                            reservation, bookingDate, checkin, checkout,
                            nights: parseInt(nights) || 1,
                            price: parsePrice(price),
                            status, source,
                            leadTime: calculateLeadTime(bookingDate, checkin)
                        });
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error parsing pasted data:', error);
    }

    return reservations;
};

// Sort weekly data chronologically (oldest to newest)
export const sortWeeklyData = (data) => {
    return [...data].sort((a, b) => a.date - b.date);
};
