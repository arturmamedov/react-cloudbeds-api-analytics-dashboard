import React, { useState, useCallback } from 'react';
import { BarChart3, Table, Brain } from 'lucide-react';
import * as XLSX from 'xlsx';

// Utility imports
import {
    calculatePeriod,
    formatPeriodRange,
    parseExcelDate,
    detectWeekFromBookings,
    validateWeekMatch,
    parsePrice,
    calculateHostelMetrics,
    detectHostelFromData,
    parsePastedData,
    sortWeeklyData
} from '../utils';

// Component imports
import WarningBanner from './DataInput/WarningBanner';
import DataInputPanel from './DataInput/DataInputPanel';
import LatestWeekSummary from './Dashboard/LatestWeekSummary';
import PerformanceTable from './Dashboard/PerformanceTable';
import AIAnalysisPanel from './Analysis/AIAnalysisPanel';
import ExcelStyleView from './Dashboard/ExcelStyleView';

const HostelAnalytics = () => {
    // State management
    const [weeklyData, setWeeklyData] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisReport, setAnalysisReport] = useState('');
    const [showCharts, setShowCharts] = useState(false);
    const [chartType, setChartType] = useState('line');
    const [pasteData, setPasteData] = useState('');
    const [selectedHostel, setSelectedHostel] = useState('');
    const [inputMethod, setInputMethod] = useState('file');
    const [selectedWeekStart, setSelectedWeekStart] = useState('');
    const [warnings, setWarnings] = useState([]);
    const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' or 'excel'

    // Process pasted data
    const processPastedData = () => {
        if (!pasteData.trim()) {
            alert('Please paste data');
            return;
        }

        setIsUploading(true);
        setWarnings([]);

        try {
            const detectedHostel = detectHostelFromData(pasteData) || selectedHostel;

            if (!detectedHostel) {
                alert('Could not detect hostel. Please select one from the dropdown.');
                setIsUploading(false);
                return;
            }

            const reservations = parsePastedData(pasteData);

            if (reservations.length === 0) {
                alert('No valid reservations found in the pasted data');
                setIsUploading(false);
                return;
            }

            // Determine week (user selection or auto-detect)
            let weekRange = '';
            if (selectedWeekStart) {
                const period = calculatePeriod(new Date(selectedWeekStart));
                weekRange = formatPeriodRange(period.start, period.end);
            } else {
                weekRange = detectWeekFromBookings(reservations);
            }

            if (!weekRange) {
                alert('Could not determine week. Please select a week date.');
                setIsUploading(false);
                return;
            }

            // Validate week match
            const weekWarnings = validateWeekMatch(reservations, weekRange);
            setWarnings(weekWarnings);

            // Calculate metrics
            const metrics = calculateHostelMetrics(reservations);

            // Add new week data
            const newWeekData = {
                week: weekRange,
                date: selectedWeekStart ? new Date(selectedWeekStart) : new Date(),
                hostels: { [detectedHostel]: metrics }
            };

            setWeeklyData(prev => {
                // Check if week already exists and merge data
                const existingWeekIndex = prev.findIndex(w => w.week === weekRange);
                if (existingWeekIndex >= 0) {
                    const updated = [...prev];
                    updated[existingWeekIndex].hostels[detectedHostel] = metrics;
                    return sortWeeklyData(updated);
                } else {
                    return sortWeeklyData([...prev, newWeekData]);
                }
            });

            setPasteData('');
            setSelectedHostel('');
            setSelectedWeekStart('');

        } catch (error) {
            console.error('Error processing pasted data:', error);
            alert(`Error processing data: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    // Process uploaded files (now supports folders)
    const processFiles = async (files) => {
        setIsUploading(true);
        setWarnings([]);
        const fileArray = Array.from(files);
        const weekReservations = {};

        try {
            // Filter for Excel files
            const excelFiles = fileArray.filter(file =>
                file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
            );

            if (excelFiles.length === 0) {
                alert('No Excel files found');
                setIsUploading(false);
                return;
            }

            for (const file of excelFiles) {
                const hostelName = file.name.replace('.xlsx', '').replace('.xls', '');

                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data);
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                // Skip header row and process reservations
                const reservations = jsonData.slice(1).filter(row => row.length > 0);

                // Filter for direct bookings
                const directBookings = reservations.filter(row => {
                    const source = row[33];
                    return source && source.includes('Sitio web');
                });

                const bookings = directBookings.map(row => ({
                    bookingDate: row[32],
                    arrivalDate: row[23],
                    status: row[35],
                    nights: row[25],
                    price: parseFloat(row[27]) || 0,
                    leadTime: (() => {
                        const bookDate = parseExcelDate(row[32]);
                        const arrDate = parseExcelDate(row[23]);
                        if (bookDate && arrDate) {
                            return Math.floor((arrDate - bookDate) / (1000 * 60 * 60 * 24));
                        }
                        return null;
                    })()
                }));

                weekReservations[hostelName] = calculateHostelMetrics(bookings);
            }

            // Determine week (user selection or auto-detect)
            let weekRange = '';
            if (selectedWeekStart) {
                const period = calculatePeriod(new Date(selectedWeekStart));
                weekRange = formatPeriodRange(period.start, period.end);
            } else {
                // Auto-detect from first file's data
                const allBookingDates = Object.values(weekReservations)
                    .flatMap(h => h.bookings.map(b => parseExcelDate(b.bookingDate)))
                    .filter(d => d)
                    .sort((a, b) => a - b);

                if (allBookingDates.length > 0) {
                    const period = calculatePeriod(allBookingDates[0]);
                    weekRange = formatPeriodRange(period.start, period.end);
                }
            }

            if (!weekRange) {
                alert('Could not determine week. Please select a week date.');
                setIsUploading(false);
                return;
            }

            const newWeekData = {
                week: weekRange,
                date: selectedWeekStart ? new Date(selectedWeekStart) : new Date(),
                hostels: weekReservations
            };

            setWeeklyData(prev => {
                // Check if week already exists and merge
                const existingWeekIndex = prev.findIndex(w => w.week === weekRange);
                if (existingWeekIndex >= 0) {
                    const updated = [...prev];
                    updated[existingWeekIndex].hostels = { ...updated[existingWeekIndex].hostels, ...weekReservations };
                    return sortWeeklyData(updated);
                } else {
                    return sortWeeklyData([...prev, newWeekData]);
                }
            });

            setSelectedWeekStart('');

        } catch (error) {
            console.error('Error processing files:', error);
            alert(`Error processing files: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    // Process file system entries (folders and files)
    const processEntry = async (entry) => {
        if (entry.isFile) {
            return new Promise((resolve) => {
                entry.file(resolve);
            });
        } else if (entry.isDirectory) {
            const reader = entry.createReader();
            const entries = await new Promise((resolve) => {
                reader.readEntries(resolve);
            });

            const files = [];
            for (const childEntry of entries) {
                const childFiles = await processEntry(childEntry);
                if (Array.isArray(childFiles)) {
                    files.push(...childFiles);
                } else {
                    files.push(childFiles);
                }
            }
            return files;
        }
        return [];
    };

    // Handle file drop (including folders)
    const handleDrop = useCallback(async (e) => {
        e.preventDefault();
        const items = e.dataTransfer.items;

        // Process drag & drop items (supports folders)
        if (items) {
            const promises = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind === 'file') {
                    const entry = item.webkitGetAsEntry();
                    if (entry) {
                        promises.push(processEntry(entry));
                    }
                }
            }

            const allFiles = await Promise.all(promises);
            const flatFiles = allFiles.flat().filter(file =>
                file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
            );

            if (flatFiles.length > 0) {
                processFiles(flatFiles);
            } else {
                alert('No Excel files found in the dropped items');
            }
        } else {
            // Fallback for simple file drag & drop
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                processFiles(files);
            }
        }
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
    }, []);

    // Handle file/folder input
    const handleFileInput = (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            processFiles(files);
        }
    };

    // Get AI analysis
    const getAIAnalysis = async () => {
        if (weeklyData.length === 0) return;

        setIsAnalyzing(true);

        try {
            const prompt = `Analyze this hostel reservation data and provide insights on performance trends and reasons for changes:

${JSON.stringify(weeklyData, null, 2)}

Please provide:
1. Key performance insights
2. Trends by hostel
3. Possible reasons for week-over-week changes
4. Recommendations for improvement
5. Notable patterns in booking behavior and ADR

Format your response in a clear, actionable report.`;

            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1000,
                    messages: [{ role: "user", content: prompt }]
                })
            });

            const data = await response.json();
            const analysis = data.content[0].text;
            setAnalysisReport(analysis);

        } catch (error) {
            console.error('Error getting AI analysis:', error);
            setAnalysisReport('Sorry, there was an error generating the analysis. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Get all unique hostels
    const getAllHostels = () => {
        const hostelSet = new Set();
        weeklyData.forEach(week => {
            Object.keys(week.hostels).forEach(hostel => hostelSet.add(hostel));
        });
        return Array.from(hostelSet).sort();
    };

    // Prepare chart data
    const prepareChartData = () => {
        const allHostels = getAllHostels();

        return weeklyData.map(week => {
            const dataPoint = { week: week.week };
            allHostels.forEach(hostel => {
                dataPoint[hostel] = week.hostels[hostel]?.count || 0;
            });
            return dataPoint;
        });
    };

    const allHostels = getAllHostels();
    const chartData = prepareChartData();
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#14B8A6'];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
                        <BarChart3 className="text-blue-600" />
                        Hostel Analytics Dashboard
                    </h1>
                    <p className="text-gray-600 text-lg">Track weekly direct bookings and analyze performance trends</p>
                </div>

                {/* Warnings */}
                <WarningBanner warnings={warnings} />

                {/* Data Input Panel */}
                <DataInputPanel
                    inputMethod={inputMethod}
                    setInputMethod={setInputMethod}
                    selectedWeekStart={selectedWeekStart}
                    setSelectedWeekStart={setSelectedWeekStart}
                    handleDrop={handleDrop}
                    handleDragOver={handleDragOver}
                    handleFileInput={handleFileInput}
                    selectedHostel={selectedHostel}
                    setSelectedHostel={setSelectedHostel}
                    pasteData={pasteData}
                    setPasteData={setPasteData}
                    processPastedData={processPastedData}
                    isUploading={isUploading}
                />

                {/* Current Week Summary - Responsive Grid */}
                <LatestWeekSummary weeklyData={weeklyData} />

                {/* Weekly Comparison Table */}
                <PerformanceTable
                    weeklyData={weeklyData}
                    allHostels={allHostels}
                    showCharts={showCharts}
                    setShowCharts={setShowCharts}
                    chartData={chartData}
                    colors={colors}
                    chartType={chartType}
                    setChartType={setChartType}
                    getAIAnalysis={getAIAnalysis}
                    isAnalyzing={isAnalyzing}
                />

                {/* AI Analysis */}
                <AIAnalysisPanel analysisReport={analysisReport} />

                {weeklyData.length === 0 && (
                    <div className="text-center py-12">
                        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-600 mb-2">No data yet</h3>
                        <p className="text-gray-500">Upload files/folders or paste data to start analyzing</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HostelAnalytics;