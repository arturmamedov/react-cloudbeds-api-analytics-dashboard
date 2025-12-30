import React from 'react';
import { calculatePeriod, formatPeriodRange } from '../../utils/dateUtils';

const WeekSelector = ({ selectedWeekStart, setSelectedWeekStart }) => {
    return (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Week (optional - will auto-detect if not specified)
            </label>
            <input
                type="date"
                value={selectedWeekStart}
                onChange={(e) => setSelectedWeekStart(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {selectedWeekStart && (
                <p className="text-sm text-gray-600 mt-2">
                    Week: {formatPeriodRange(...Object.values(calculatePeriod(new Date(selectedWeekStart))))}
                </p>
            )}
        </div>
    );
};

export default WeekSelector;
