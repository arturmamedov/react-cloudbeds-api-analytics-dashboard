import React from 'react';
import { FolderOpen, Copy, FileText, Download } from 'lucide-react';
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
    apiFetchProgress      // PHASE 4: Progress tracking state
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
                        ? 'bg-teal text-white'
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
                    apiFetchProgress={apiFetchProgress}  {/* PHASE 4: Progress tracking */}
                />
            )}

            {isUploading && (
                <div className="mt-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Processing data...</p>
                </div>
            )}
        </div>
    );
};

export default DataInputPanel;
