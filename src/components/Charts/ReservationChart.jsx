import React from 'react';
import { LineChart as RechartsLineChart, BarChart as RechartsBarChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ReservationChart = ({ chartData, allHostels, colors, chartType, setChartType, showCharts }) => {
    if (!showCharts || chartData.length === 0) return null;

    return (
        <div className="mb-8 p-6 bg-gray-50 rounded-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <h3 className="text-lg font-semibold text-gray-800">Reservation Trends</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setChartType('line')}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${chartType === 'line' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        Line Chart
                    </button>
                    <button
                        onClick={() => setChartType('bar')}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${chartType === 'bar' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        Bar Chart
                    </button>
                </div>
            </div>

            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'line' ? (
                        <RechartsLineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {allHostels.map((hostel, index) => (
                                <Line
                                    key={hostel}
                                    type="monotone"
                                    dataKey={hostel}
                                    stroke={colors[index % colors.length]}
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                />
                            ))}
                        </RechartsLineChart>
                    ) : (
                        <RechartsBarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {allHostels.map((hostel, index) => (
                                <Bar
                                    key={hostel}
                                    dataKey={hostel}
                                    fill={colors[index % colors.length]}
                                />
                            ))}
                        </RechartsBarChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ReservationChart;
