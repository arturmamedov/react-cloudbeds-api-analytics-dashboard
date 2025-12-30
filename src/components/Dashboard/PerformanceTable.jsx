import React from 'react';
import { TrendingUp, Brain, LineChart, ChevronUp, ChevronDown, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { calculateMetricChange, calculateProgressiveMetricChanges } from '../../utils/metricsCalculator';
import MetricChange from './MetricChange';
import ReservationChart from '../Charts/ReservationChart';

const PerformanceTable = ({
    weeklyData,
    allHostels,
    showCharts,
    setShowCharts,
    chartData,
    colors,
    chartType,
    setChartType,
    getAIAnalysis,
    isAnalyzing
}) => {
    if (!weeklyData || weeklyData.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <TrendingUp className="text-purple-600" />
                    Weekly Performance Comparison
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCharts(!showCharts)}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                        <LineChart className="w-4 h-4" />
                        {showCharts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        Charts
                    </button>
                    <button
                        onClick={getAIAnalysis}
                        disabled={isAnalyzing}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <Brain className="w-4 h-4" />
                        {isAnalyzing ? 'Analyzing...' : 'AI Analysis'}
                    </button>
                </div>
            </div>

            {/* Charts */}
            <ReservationChart
                chartData={chartData}
                allHostels={allHostels}
                colors={colors}
                chartType={chartType}
                setChartType={setChartType}
                showCharts={showCharts}
            />

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b-2 border-gray-200">
                            <th className="text-left py-4 px-2 sm:px-4 font-bold text-gray-800">Hostel / Metric</th>
                            {weeklyData.map(week => (
                                <th key={week.week} className="text-center py-4 px-2 sm:px-4 font-bold text-gray-800 min-w-32">
                                    <div className="text-sm">{week.week}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {allHostels.map(hostel => (
                            <React.Fragment key={hostel}>
                                {/* Bookings */}
                                <tr className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-4 px-2 sm:px-4 font-semibold text-gray-700">{hostel}</td>
                                    {weeklyData.map((week, weekIndex) => {
                                        const data = week.hostels[hostel];
                                        const count = data?.count || 0;
                                        const cancelled = data?.cancelled || 0;
                                        const changes = calculateProgressiveMetricChanges(weeklyData, weekIndex, hostel, 'count');

                                        return (
                                            <td key={week.week} className="py-4 px-2 sm:px-4 text-center">
                                                <div className="text-xl font-bold text-gray-800">{count}</div>
                                                {cancelled > 0 && <div className="text-xs text-red-600">({cancelled} cancelled)</div>}
                                                <MetricChange changes={changes} />
                                            </td>
                                        );
                                    })}
                                </tr>

                                {/* Revenue */}
                                <tr className="border-b border-gray-50 hover:bg-gray-50 bg-green-50">
                                    <td className="py-2 px-2 sm:px-4 pl-8 text-sm text-gray-600 flex items-center gap-1">
                                        <DollarSign className="w-3 h-3" />
                                        Revenue
                                    </td>
                                    {weeklyData.map((week, weekIndex) => {
                                        const revenue = week.hostels[hostel]?.revenue || 0;
                                        const changes = calculateProgressiveMetricChanges(weeklyData, weekIndex, hostel, 'revenue');

                                        return (
                                            <td key={week.week} className="py-2 px-2 sm:px-4 text-center">
                                                <div className="text-lg font-semibold text-green-700">{formatCurrency(revenue)}</div>
                                                <MetricChange changes={changes} isCurrency={true} />
                                            </td>
                                        );
                                    })}
                                </tr>

                                {/* ADR */}
                                <tr className="border-b border-gray-200 hover:bg-gray-50 bg-blue-50">
                                    <td className="py-2 px-2 sm:px-4 pl-8 text-sm text-gray-600">ADR</td>
                                    {weeklyData.map((week) => {
                                        const adr = week.hostels[hostel]?.adr || 0;

                                        return (
                                            <td key={week.week} className="py-2 px-2 sm:px-4 text-center">
                                                <div className="text-md font-medium text-blue-700">{formatCurrency(adr)}</div>
                                            </td>
                                        );
                                    })}
                                </tr>

                                {/* Nest Pass Row */}
                                <tr className="border-b border-gray-200 hover:bg-gray-50 bg-purple-50">
                                    <td className="py-2 px-2 sm:px-4 pl-8 text-sm text-gray-600">Nest Pass</td>
                                    {weeklyData.map((week, weekIndex) => {
                                        const nestPass = week.hostels[hostel]?.nestPass || 0;
                                        const monthly = week.hostels[hostel]?.monthly || 0;
                                        const valid = week.hostels[hostel]?.valid || 1;
                                        const percentage = valid > 0 ? Math.round((nestPass / valid) * 100) : 0;
                                        const changes = calculateProgressiveMetricChanges(weeklyData, weekIndex, hostel, 'nestPass');

                                        return (
                                            <td key={week.week} className="py-2 px-2 sm:px-4 text-center">
                                                <div className="text-md font-medium text-purple-700">
                                                    {nestPass} ({percentage}%)
                                                    {monthly > 0 && <span className="text-xs"> | {monthly} Monthly</span>}
                                                </div>
                                                <MetricChange changes={changes} />
                                            </td>
                                        );
                                    })}
                                </tr>
                            </React.Fragment>
                        ))}

                        {/* Totals */}
                        <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold">
                            <td className="py-4 px-2 sm:px-4 font-bold text-gray-800">TOTAL BOOKINGS</td>
                            {weeklyData.map((week, weekIndex) => {
                                const total = Object.values(week.hostels).reduce((sum, h) => sum + h.count, 0);
                                const cancelled = Object.values(week.hostels).reduce((sum, h) => sum + (h.cancelled || 0), 0);

                                const prevTotal = weekIndex > 0
                                    ? Object.values(weeklyData[weekIndex - 1].hostels).reduce((sum, h) => sum + h.count, 0)
                                    : 0;
                                const changes = calculateMetricChange(total, prevTotal);

                                return (
                                    <td key={week.week} className="py-4 px-2 sm:px-4 text-center">
                                        <div className="text-xl font-bold text-gray-800">{total}</div>
                                        {cancelled > 0 && <div className="text-xs text-red-600">({cancelled} cancelled)</div>}
                                        {weekIndex > 0 && <MetricChange changes={changes} />}
                                    </td>
                                );
                            })}
                        </tr>

                        <tr className="bg-green-100 font-bold">
                            <td className="py-4 px-2 sm:px-4 font-bold text-gray-800 flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                TOTAL REVENUE
                            </td>
                            {weeklyData.map((week, weekIndex) => {
                                const total = Object.values(week.hostels).reduce((sum, h) => sum + (h.revenue || 0), 0);

                                const prevTotal = weekIndex > 0
                                    ? Object.values(weeklyData[weekIndex - 1].hostels).reduce((sum, h) => sum + (h.revenue || 0), 0)
                                    : 0;
                                const changes = calculateMetricChange(total, prevTotal);

                                return (
                                    <td key={week.week} className="py-4 px-2 sm:px-4 text-center">
                                        <div className="text-xl font-bold text-green-700">{formatCurrency(total)}</div>
                                        {weekIndex > 0 && <MetricChange changes={changes} isCurrency={true} />}
                                    </td>
                                );
                            })}
                        </tr>

                        <tr className="bg-purple-100 font-bold">
                            <td className="py-4 px-2 sm:px-4 font-bold text-gray-800">
                                TOTAL NEST PASS
                            </td>
                            {weeklyData.map((week, weekIndex) => {
                                const totalNestPass = Object.values(week.hostels).reduce((sum, h) => sum + (h.nestPass || 0), 0);
                                const totalMonthly = Object.values(week.hostels).reduce((sum, h) => sum + (h.monthly || 0), 0);
                                const totalValid = Object.values(week.hostels).reduce((sum, h) => sum + (h.valid || 0), 0);
                                const percentage = totalValid > 0 ? ((totalNestPass / totalValid) * 100).toFixed(1) : 0;

                                const prevNestPass = weekIndex > 0
                                    ? Object.values(weeklyData[weekIndex - 1].hostels).reduce((sum, h) => sum + (h.nestPass || 0), 0)
                                    : 0;
                                const changes = calculateMetricChange(totalNestPass, prevNestPass);

                                return (
                                    <td key={week.week} className="py-4 px-2 sm:px-4 text-center">
                                        <div className="text-xl font-bold text-purple-700">
                                            {totalNestPass} ({percentage}%)
                                            {totalMonthly > 0 && <div className="text-sm">({totalMonthly} Monthly)</div>}
                                        </div>
                                        {weekIndex > 0 && <MetricChange changes={changes} />}
                                    </td>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PerformanceTable;
