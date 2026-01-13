import React from 'react';
import { formatCurrency, formatRevenue } from '../../utils/formatters';

/**
 * NestedHostelTable Component
 *
 * Displays hostel booking data in a compact nested table format.
 * Used within the Excel-style view to show per-hostel metrics for each week.
 *
 * @param {Array} hostels - Array of hostel objects with name and data
 * @param {Object} totals - Total counts across all hostels (count, revenue, nestPass)
 * @param {boolean} showTaxBreakdown - Whether to show tax breakdown in revenue display
 */
const NestedHostelTable = ({ hostels, totals, showTaxBreakdown = false }) => {
    return (
        <div className="overflow-hidden">
            <table className="min-w-full text-xs border-collapse font-body">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-2 py-1 text-left font-heading min-w-[100px]">
                            Hostel
                        </th>
                        <th className="border border-gray-300 px-2 py-1 text-center font-heading min-w-[60px]">
                            Count
                        </th>
                        <th className="border border-gray-300 px-2 py-1 text-right font-heading min-w-[100px]">
                            Revenue
                        </th>
                        <th className="border border-gray-300 px-2 py-1 text-center font-heading min-w-[80px]">
                            Nest Pass
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {hostels.map(({ name, data }) => (
                        <tr key={name} className="hover:bg-gray-50 transition-colors">
                            <td className="border border-gray-300 px-2 py-1 font-medium">
                                {name}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-center">
                                {data.count !== undefined ? data.count : 0}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-right">
                                {data.count > 0 && data.revenue
                                    ? formatRevenue(data.revenue, data.netRevenue, data.totalTaxes, showTaxBreakdown)
                                    : '-'}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-center">
                                {data.count > 0 && data.nestPass ? data.nestPass : '-'}
                            </td>
                        </tr>
                    ))}

                    {/* TOTAL Row - highlighted with yellow background */}
                    <tr className="bg-nests-yellow/20 font-bold">
                        <td className="border border-gray-300 px-2 py-1">
                            TOTAL
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-center">
                            {totals.count}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right">
                            {formatRevenue(
                                totals.revenue,
                                totals.netRevenue > 0 ? totals.netRevenue : null,
                                totals.totalTaxes > 0 ? totals.totalTaxes : null,
                                showTaxBreakdown
                            )}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-center">
                            {totals.nestPass}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

export default NestedHostelTable;
