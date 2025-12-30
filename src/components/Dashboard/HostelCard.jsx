import React from 'react';
import { formatCurrency } from '../../utils/formatters';

const HostelCard = ({ hostel, data }) => {
    return (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 sm:p-6 border border-green-200">
            <h3 className="font-bold text-lg text-gray-800 mb-2 truncate">{hostel}</h3>
            <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">{data.count}</div>
            <div className="text-xs sm:text-sm text-gray-600 mb-3">Total reservations</div>

            {data.cancelled > 0 && (
                <div className="text-xs text-red-600 mb-2">
                    {data.cancelled} cancelled
                </div>
            )}

            {/* Nest Pass Display */}
            {data.nestPass > 0 && (
                <div className="text-xs text-blue-600 mb-2">
                    {data.nestPass} Nest Pass ({Math.round((data.nestPass / data.valid) * 100)}%)
                    {data.monthly > 0 && ` | ${data.monthly} Monthly`}
                </div>
            )}

            <div className="space-y-1 text-xs text-gray-500 border-t border-green-200 pt-2">
                <div className="flex justify-between">
                    <span>Revenue:</span>
                    <span className="font-semibold text-green-700">{formatCurrency(data.revenue)}</span>
                </div>
                <div className="flex justify-between">
                    <span>ADR:</span>
                    <span className="font-semibold">{formatCurrency(data.adr)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Lead time:</span>
                    <span className="font-semibold">{data.avgLeadTime || 0} days</span>
                </div>
            </div>
        </div>
    );
};

export default HostelCard;
