import React, { useMemo } from 'react';
import { Table } from 'lucide-react';
import { hostelConfig } from '../../config/hostelConfig';
import { formatCurrency } from '../../utils/formatters';
import NestedHostelTable from './NestedHostelTable';

/**
 * ExcelStyleView Component
 *
 * Displays weekly analytics data in an Excel-style row-based table format.
 * Each week is a row, with hostel data shown in a nested table within the "CONVERSIONES POR HOSTAL" column.
 *
 * Features:
 * - Weeks as rows (instead of columns like dashboard view)
 * - Sticky first column (PERIODO) for easy navigation
 * - Placeholder columns for future data integration (Google Analytics, funnel metrics, manual entries)
 * - Calculated EUR column from booking revenue
 * - Nested hostel table showing per-hostel metrics
 * - Horizontal scroll for many columns
 * - Nests brand styling (teal, green, yellow colors)
 *
 * @param {Array} weeklyData - Array of week objects containing hostel booking data
 */
const ExcelStyleView = ({ weeklyData }) => {
    // Transform weeklyData from column format (weeks as columns) to row format (weeks as rows)
    const rowData = useMemo(() => {
        return weeklyData.map(week => {
            // Get hostels in hostelConfig order for consistent display
            const orderedHostels = Object.keys(hostelConfig).map(hostelName => ({
                name: hostelName,
                data: week.hostels[hostelName] || {
                    count: 0,
                    revenue: 0,
                    nestPass: 0,
                    cancelled: 0,
                    valid: 0
                }
            }));

            // Calculate week totals across all hostels
            const totals = {
                count: orderedHostels.reduce((sum, h) => sum + h.data.count, 0),
                revenue: orderedHostels.reduce((sum, h) => sum + h.data.revenue, 0),
                nestPass: orderedHostels.reduce((sum, h) => sum + (h.data.nestPass || 0), 0)
            };

            return {
                period: week.week,
                hostels: orderedHostels,
                totals
            };
        });
    }, [weeklyData]);

    // Empty state when no data uploaded
    if (weeklyData.length === 0) {
        return (
            <div className="text-center py-12">
                <Table className="w-16 h-16 text-nests-teal mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2 font-heading">
                    No data yet
                </h3>
                <p className="text-gray-500 font-body">
                    Upload files or paste data to see Excel-style view
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
            {/* Header */}
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 font-heading">
                <Table className="text-nests-teal" />
                Excel-Style Weekly View
            </h2>

            {/* Horizontal scroll container for wide table */}
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm font-body">
                    <thead>
                        <tr className="bg-nests-gradient text-white">
                            {/* Sticky period column */}
                            <th className="border border-gray-300 px-4 py-2 text-left sticky left-0 bg-nests-dark-teal z-10 font-heading min-w-[140px]">
                                PERIODO
                            </th>

                            {/* Placeholder columns - Google Analytics metrics */}
                            <th className="border border-gray-300 px-4 py-2 font-heading min-w-[100px]">
                                USUARIOS
                            </th>
                            <th className="border border-gray-300 px-4 py-2 font-heading min-w-[100px]">
                                SESIONES
                            </th>
                            <th className="border border-gray-300 px-4 py-2 font-heading min-w-[120px]">
                                CONVERSIONS
                            </th>
                            <th className="border border-gray-300 px-4 py-2 font-heading min-w-[100px]">
                                CONV RT
                            </th>
                            <th className="border border-gray-300 px-4 py-2 font-heading min-w-[120px]">
                                BOUNCE RATE
                            </th>
                            <th className="border border-gray-300 px-4 py-2 font-heading min-w-[100px]">
                                AVG Time
                            </th>

                            {/* EUR - Calculated from booking data */}
                            <th className="border border-gray-300 px-4 py-2 bg-nests-green text-white font-heading min-w-[120px]">
                                EUR
                            </th>

                            {/* Placeholder - Traffic source */}
                            <th className="border border-gray-300 px-4 py-2 font-heading min-w-[140px]">
                                TOP TRAFICO
                            </th>

                            {/* Placeholder - Funnel metrics */}
                            <th className="border border-gray-300 px-4 py-2 font-heading min-w-[140px]">
                                BOOKING ENGINE
                            </th>
                            <th className="border border-gray-300 px-4 py-2 font-heading min-w-[140px]">
                                ADD TO CART
                            </th>
                            <th className="border border-gray-300 px-4 py-2 font-heading min-w-[120px]">
                                CHECK-OUT
                            </th>
                            <th className="border border-gray-300 px-4 py-2 font-heading min-w-[120px]">
                                PURCHASE
                            </th>

                            {/* Hostel data - nested table (calculated from booking data) */}
                            <th className="border border-gray-300 px-4 py-2 bg-nests-teal text-white font-heading min-w-[400px]">
                                CONVERSIONES POR HOSTAL
                            </th>

                            {/* Placeholder - Manual entry fields */}
                            <th className="border border-gray-300 px-4 py-2 font-heading min-w-[140px]">
                                PICOS/CAÍDAS
                            </th>
                            <th className="border border-gray-300 px-4 py-2 font-heading min-w-[140px]">
                                TOP 3 países
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rowData.map((row, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                {/* Period - sticky column with line break for date range */}
                                <td className="border border-gray-300 px-4 py-2 font-semibold sticky left-0 bg-white z-10 whitespace-pre-line">
                                    {row.period.replace(' - ', '\n')}
                                </td>

                                {/* Placeholder columns - Google Analytics (empty for now) */}
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>

                                {/* EUR - Calculated total revenue with green highlight */}
                                <td className="border border-gray-300 px-4 py-2 text-right font-semibold bg-nests-green/10 text-nests-green">
                                    {formatCurrency(row.totals.revenue)}
                                </td>

                                {/* Placeholder columns - Traffic, Funnel, Manual (empty for now) */}
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>

                                {/* Hostel conversions - nested table with teal highlight */}
                                <td className="border border-gray-300 px-2 py-2 bg-nests-teal/10">
                                    <NestedHostelTable
                                        hostels={row.hostels}
                                        totals={row.totals}
                                    />
                                </td>

                                {/* Placeholder columns - Manual entry fields (empty for now) */}
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Legend explaining placeholder columns */}
            <div className="mt-4 text-xs text-gray-500 border-t border-gray-200 pt-4 font-body">
                <p>
                    <span className="font-semibold">Note:</span> Gray columns with "-" are placeholders for future data integration
                    (Google Analytics, funnel metrics, manual entries). <span className="text-nests-green font-semibold">EUR</span> and{' '}
                    <span className="text-nests-teal font-semibold">CONVERSIONES POR HOSTAL</span> show calculated data from uploaded bookings.
                </p>
            </div>
        </div>
    );
};

export default ExcelStyleView;
