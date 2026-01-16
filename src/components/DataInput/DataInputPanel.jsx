import React, { useState } from 'react';
import { FolderOpen, Copy, FileText, Download, Database, CheckCircle, AlertCircle, Info, Loader, Upload as UploadIcon } from 'lucide-react';
import { hostelConfig } from '../../config/hostelConfig';
import WeekSelector from './WeekSelector';
import APIFetchPanel from './APIFetchPanel';

const DataInputPanel = ({
    inputMethod,
    setInputMethod,
    selectedWeekStart,
    setSelectedWeekStart,
    handleDrop,
    handleDragOver,
    handleFileInput,
    selectedHostel,
    setSelectedHostel,
    pasteData,
    setPasteData,
    processPastedData,
    isUploading,
    onAPIFetchStart,      // NEW: Callback for API fetch
    apiFetchProgress,     // PHASE 4: Progress tracking state
    // Revenue enrichment props
    canEnrichRevenue,
    isEnriching,
    enrichmentProgress,
    onEnrichStart,
    onEnrichCancel,
    // Database props (Phase 4)
    isSupabaseEnabled,
    dbStatus,
    isSavingToDB,
    isLoadingFromDB,
    onLoadFromDB,
    weeklyData
}) => {
    return (
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
                {/* NEW: CloudBeds API Button */}
                <button
                    onClick={() => setInputMethod('api')}
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${inputMethod === 'api'
                        ? 'bg-nests-teal text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    <Download className="w-4 h-4 inline mr-2" />
                    CloudBeds API
                </button>
            </div>

            {/* Week Selection - Hidden for API mode (has its own selector) */}
            {inputMethod !== 'api' && (
                <WeekSelector
                    selectedWeekStart={selectedWeekStart}
                    setSelectedWeekStart={setSelectedWeekStart}
                />
            )}

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

            {/* NEW: CloudBeds API Section */}
            {inputMethod === 'api' && (
                <APIFetchPanel
                    selectedWeekStart={selectedWeekStart}
                    setSelectedWeekStart={setSelectedWeekStart}
                    onFetchStart={onAPIFetchStart}
                    isUploading={isUploading}
                    apiFetchProgress={apiFetchProgress}
                    // Revenue enrichment props
                    canEnrichRevenue={canEnrichRevenue}
                    isEnriching={isEnriching}
                    enrichmentProgress={enrichmentProgress}
                    onEnrichStart={onEnrichStart}
                    onEnrichCancel={onEnrichCancel}
                />
            )}

            {isUploading && (
                <div className="mt-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Processing data...</p>
                </div>
            )}

            {/* ========================================================================
                PHASE 4: DATABASE OPERATIONS PANEL
                ======================================================================== */}
            {/* Database Status & Operations - Always visible if Supabase is enabled */}
            {isSupabaseEnabled && (
                <div className="mt-6 border-t border-gray-200 pt-6">
                    <div className="bg-gradient-to-r from-nests-teal/10 to-nests-green/10 rounded-xl p-5 border border-nests-teal/20">
                        <div className="flex items-center gap-2 mb-4">
                            <Database className="w-5 h-5 text-nests-teal" />
                            <h3 className="font-bold text-gray-800 text-lg">Database Operations</h3>
                        </div>

                        {/* Database Status Indicator (Step 4.1) */}
                        {dbStatus && (
                            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-4 ${
                                dbStatus.type === 'success'
                                    ? 'bg-green-50 border border-green-200 text-green-800'
                                    : dbStatus.type === 'error'
                                    ? 'bg-red-50 border border-red-200 text-red-800'
                                    : 'bg-blue-50 border border-blue-200 text-blue-800'
                            }`}>
                                {dbStatus.type === 'success' && <CheckCircle className="w-4 h-4" />}
                                {dbStatus.type === 'error' && <AlertCircle className="w-4 h-4" />}
                                {dbStatus.type === 'info' && <Info className="w-4 h-4" />}
                                <span className="text-sm font-medium">{dbStatus.message}</span>
                            </div>
                        )}

                        {/* Manual Database Operations (Step 4.3) */}
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600 mb-3">
                                Data is automatically saved to the database. Use the button below to load historical data:
                            </p>

                            {/* Load from Database Button */}
                            <button
                                onClick={() => {
                                    // Load last 3 months of data
                                    const endDate = new Date();
                                    const startDate = new Date();
                                    startDate.setMonth(startDate.getMonth() - 3);
                                    onLoadFromDB(startDate, endDate);
                                }}
                                disabled={isLoadingFromDB || isSavingToDB}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-nests-teal text-white rounded-lg font-semibold hover:bg-nests-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoadingFromDB ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        Loading from database...
                                    </>
                                ) : (
                                    <>
                                        <Database className="w-4 h-4" />
                                        Load Last 3 Months from Database
                                    </>
                                )}
                            </button>

                            {/* Current Data Info */}
                            {weeklyData && weeklyData.length > 0 && (
                                <div className="text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-200">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Info className="w-4 h-4 text-nests-teal" />
                                        <span className="font-semibold">Currently Viewing:</span>
                                    </div>
                                    <ul className="ml-6 space-y-1">
                                        <li>• {weeklyData.length} week{weeklyData.length !== 1 ? 's' : ''} of data</li>
                                        <li>• {Object.keys(weeklyData[0]?.hostels || {}).length} hostel{Object.keys(weeklyData[0]?.hostels || {}).length !== 1 ? 's' : ''}</li>
                                        <li>• Auto-saved to database ✓</li>
                                    </ul>
                                </div>
                            )}

                            {/* Loading State (Step 4.2) */}
                            {(isLoadingFromDB || isSavingToDB) && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-200">
                                    <Loader className="w-4 h-4 animate-spin text-nests-teal" />
                                    <span>
                                        {isLoadingFromDB && 'Loading data from database...'}
                                        {isSavingToDB && 'Saving data to database...'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataInputPanel;
