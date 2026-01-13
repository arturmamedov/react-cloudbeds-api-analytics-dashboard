import React from 'react';
import { Calendar } from 'lucide-react';
import HostelCard from './HostelCard';

const LatestWeekSummary = ({ weeklyData, showTaxBreakdown = false }) => {
    if (!weeklyData || weeklyData.length === 0) return null;

    const latestWeek = weeklyData[weeklyData.length - 1];

    return (
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Calendar className="text-green-600" />
                Latest Week: {latestWeek?.week}
            </h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {Object.entries(latestWeek?.hostels || {}).map(([hostel, data]) => (
                    <HostelCard
                        key={hostel}
                        hostel={hostel}
                        data={data}
                        showTaxBreakdown={showTaxBreakdown}
                    />
                ))}
            </div>
        </div>
    );
};

export default LatestWeekSummary;
