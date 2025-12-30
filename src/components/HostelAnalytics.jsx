import React, { useState, useCallback } from 'react';
import { Upload, BarChart3, Brain, FileText, Copy, ChevronDown, ChevronUp, LineChart, FolderOpen, DollarSign, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { hostelConfig } from '../config/hostelConfig';
import { calculatePeriod, formatPeriodRange, parseExcelDate, calculateLeadTime, detectWeekFromBookings, validateWeekMatch } from '../utils/dateUtils';
import { formatCurrency, parsePrice } from '../utils/formatters';
import { calculateMetricChange, calculateHostelMetrics, calculateProgressiveMetricChanges } from '../utils/metricsCalculator';
import { detectHostelFromData, parsePastedData, sortWeeklyData } from '../utils/dataParser';
import MetricChange from './Dashboard/MetricChange';
import WarningBanner from './DataInput/WarningBanner';
import WeekSelector from './DataInput/WeekSelector';
import HostelCard from './Dashboard/HostelCard';
import LatestWeekSummary from './Dashboard/LatestWeekSummary';
import ReservationChart from './Charts/ReservationChart';
import AIAnalysisPanel from './Analysis/AIAnalysisPanel';

const HostelAnalytics = () => {
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

                {/* Input Method Toggle */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <button
                            onClick={() => setInputMethod('file')}
                            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${inputMethod === 'file'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            <FolderOpen className="w-4 h-4 inline mr-2" />
                            Upload Files/Folders
                        </button>
                        <button
                            onClick={() => setInputMethod('paste')}
                            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${inputMethod === 'paste'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            <Copy className="w-4 h-4 inline mr-2" />
                            Copy & Paste
                        </button>
                    </div>

                    {/* Week Selection */}
                    <WeekSelector
                        selectedWeekStart={selectedWeekStart}
                        setSelectedWeekStart={setSelectedWeekStart}
                    />

                    {/* File Upload Section */}
                    {inputMethod === 'file' && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <FolderOpen className="text-blue-600" />
                                Upload Weekly Data
                            </h2>

                            <div
                                className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer bg-blue-50"
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onClick={() => document.getElementById('fileInput').click()}
                            >
                                <div className="flex flex-col items-center gap-4">
                                    <FileText className="w-16 h-16 text-blue-500" />
                                    <div>
                                        <p className="text-xl font-semibold text-gray-700 mb-2">
                                            Drop Excel files or folders here
                                        </p>
                                        <p className="text-gray-500 mb-4">
                                            Upload individual Excel files or entire folders with multiple hostel data
                                        </p>
                                        <div className="bg-blue-100 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mb-4">
                                            <p>✅ Single files: Flamingo.xlsx, Puerto.xlsx, etc.</p>
                                            <p>✅ Folders: Upload entire week folder with all Excel files</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                                            Select Files
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                document.getElementById('folderInput').click();
                                            }}
                                            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                                        >
                                            Select Folder
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <input
                                type="file"
                                id="fileInput"
                                multiple
                                accept=".xlsx,.xls"
                                onChange={handleFileInput}
                                className="hidden"
                            />

                            <input
                                type="file"
                                id="folderInput"
                                webkitdirectory="true"
                                multiple
                                onChange={handleFileInput}
                                className="hidden"
                            />
                        </div>
                    )}

                    {/* Copy-Paste Section */}
                    {inputMethod === 'paste' && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Copy className="text-blue-600" />
                                Copy & Paste Data
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select Hostel (optional - auto-detection available)
                                    </label>
                                    <select
                                        value={selectedHostel}
                                        onChange={(e) => setSelectedHostel(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Auto-detect from data</option>
                                        {Object.entries(hostelConfig).map(([name, config]) => (
                                            <option key={name} value={name}>{name} (ID: {config.id})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Paste CloudBeds Table Data (HTML or Text)
                                    </label>
                                    <textarea
                                        value={pasteData}
                                        onChange={(e) => setPasteData(e.target.value)}
                                        placeholder="Paste your CloudBeds reservation table here (either HTML or tab-separated text)..."
                                        className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                                    />
                                </div>

                                <button
                                    onClick={processPastedData}
                                    disabled={!pasteData.trim() || isUploading}
                                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {isUploading ? 'Processing...' : 'Process Data'}
                                </button>
                            </div>
                        </div>
                    )}

                    {isUploading && (
                        <div className="mt-4 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-gray-600 mt-2">Processing data...</p>
                        </div>
                    )}
                </div>

                {/* Current Week Summary - Responsive Grid */}
                <LatestWeekSummary weeklyData={weeklyData} />

                {/* Weekly Comparison Table */}
                {weeklyData.length > 0 && (
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
                )}

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