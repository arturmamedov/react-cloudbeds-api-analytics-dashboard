/**
 * APIFetchPanel Component
 *
 * UI component for fetching hostel booking data from CloudBeds API.
 * Provides two modes: Single Hostel (quick fetch) and All Hostels (bulk fetch).
 *
 * Features:
 * - Week selection (reuses existing WeekSelector component)
 * - Fetch mode toggle (Single vs All)
 * - Hostel dropdown (for single mode)
 * - Real-time progress display with timing
 * - Cancel functionality for long operations
 * - Warning modal before overwriting existing data
 *
 * Data Flow:
 * User selects week + hostel(s) → Click "Fetch" → Parent callback triggered →
 * HostelAnalytics fetches from API → Data updates → Dashboard re-renders
 *
 * @component
 * @author Artur Mamedov & Claude
 * @since 2026-01-12
 */

import React, { useState, useCallback } from 'react';
import { Loader, Download, AlertCircle } from 'lucide-react';
import WeekSelector from './WeekSelector';
import { hostelConfig } from '../../config/hostelConfig';

/**
 * APIFetchPanel Component
 *
 * @param {object} props
 * @param {Date} props.selectedWeekStart - Currently selected week start date
 * @param {Function} props.setSelectedWeekStart - Callback to update week
 * @param {Function} props.onFetchStart - Called when fetch begins
 * @param {boolean} props.isUploading - Global loading state from parent
 * @param {object} props.apiFetchProgress - PHASE 4: Progress tracking state
 */
const APIFetchPanel = ({
  selectedWeekStart,
  setSelectedWeekStart,
  onFetchStart,
  isUploading,
  apiFetchProgress  // PHASE 4: Real-time progress tracking
}) => {
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================

  // Fetch mode: 'all' (fetch all 11 hostels) or 'single' (fetch one hostel)
  const [fetchMode, setFetchMode] = useState('all');

  // Selected hostel name (only used in 'single' mode)
  const [selectedHostel, setSelectedHostel] = useState(null);

  console.log('[APIFetchPanel] Component rendered', {
    fetchMode,
    selectedHostel,
    selectedWeekStart,
    isUploading
  });

  // ============================================================
  // COMPUTED VALUES
  // ============================================================

  // Get list of all hostel names from config
  const hostelList = Object.keys(hostelConfig);
  console.log('[APIFetchPanel] Available hostels:', hostelList.length, hostelList);

  // Check if fetch button should be enabled
  const canFetch = selectedWeekStart &&
                   !isUploading &&
                   (fetchMode === 'all' || (fetchMode === 'single' && selectedHostel));

  console.log('[APIFetchPanel] Can fetch?', canFetch, {
    hasWeek: !!selectedWeekStart,
    notLoading: !isUploading,
    modeCheck: fetchMode === 'all' ? 'all mode (ok)' : `single mode (hostel: ${selectedHostel || 'none'})`
  });

  // ============================================================
  // EVENT HANDLERS
  // ============================================================

  /**
   * Handle fetch button click
   * Calls parent callback with fetch parameters
   */
  const handleFetch = useCallback(() => {
    console.log('[APIFetchPanel] 🚀 Fetch button clicked');
    console.log('[APIFetchPanel] Fetch params:', {
      mode: fetchMode,
      hostelName: fetchMode === 'single' ? selectedHostel : 'all (11 hostels)',
      weekStart: selectedWeekStart
    });

    // Call parent callback with fetch parameters
    onFetchStart({
      mode: fetchMode,              // 'all' or 'single'
      hostelName: fetchMode === 'single' ? selectedHostel : null,
      weekStart: selectedWeekStart
    });
  }, [fetchMode, selectedHostel, selectedWeekStart, onFetchStart]);

  /**
   * Handle fetch mode toggle
   * When switching to 'all' mode, clear selected hostel
   */
  const handleModeChange = useCallback((newMode) => {
    console.log('[APIFetchPanel] 🔄 Fetch mode changed:', fetchMode, '→', newMode);
    setFetchMode(newMode);

    // Clear selected hostel when switching to 'all' mode
    if (newMode === 'all') {
      setSelectedHostel(null);
      console.log('[APIFetchPanel] Cleared selected hostel (all mode)');
    }
  }, [fetchMode]);

  /**
   * Handle hostel selection change
   */
  const handleHostelChange = useCallback((e) => {
    const hostel = e.target.value;
    console.log('[APIFetchPanel] 🏨 Hostel selected:', hostel || 'none');
    setSelectedHostel(hostel || null);
  }, []);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-4 p-4 border-2 border-teal rounded-lg bg-white">
      {console.log('[APIFetchPanel] Rendering UI...')}

      {/* ============================================================ */}
      {/* HEADER */}
      {/* ============================================================ */}

      <div className="flex items-center gap-2 mb-2">
        <Download className="w-5 h-5 text-teal" />
        <h3 className="text-lg font-semibold text-gray-800">Fetch from CloudBeds API</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Fetch reservation data directly from CloudBeds for the selected week.
        Only direct bookings (source: "Website/Booking Engine") will be included.
      </p>

      {/* ============================================================ */}
      {/* WEEK SELECTOR */}
      {/* ============================================================ */}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          📅 Select Week
        </label>
        <WeekSelector
          selectedWeekStart={selectedWeekStart}
          setSelectedWeekStart={setSelectedWeekStart}
        />
        {selectedWeekStart && (
          <p className="text-xs text-gray-500 mt-1">
            Selected: {new Date(selectedWeekStart).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })} - {new Date(new Date(selectedWeekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </p>
        )}
      </div>

      {/* ============================================================ */}
      {/* FETCH MODE TOGGLE */}
      {/* ============================================================ */}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          🏨 Fetch Mode
        </label>
        <div className="grid grid-cols-2 gap-2">
          {/* All Hostels Button */}
          <button
            onClick={() => handleModeChange('all')}
            disabled={isUploading}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${
              fetchMode === 'all'
                ? 'bg-teal text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="text-sm">All Hostels</div>
            <div className="text-xs opacity-75">(11 properties)</div>
          </button>

          {/* Single Hostel Button */}
          <button
            onClick={() => handleModeChange('single')}
            disabled={isUploading}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${
              fetchMode === 'single'
                ? 'bg-teal text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="text-sm">Single Hostel</div>
            <div className="text-xs opacity-75">(choose one)</div>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* HOSTEL DROPDOWN (Single Mode Only) */}
      {/* ============================================================ */}

      {fetchMode === 'single' && (
        <div>
          <label htmlFor="hostel-select" className="block text-sm font-medium text-gray-700 mb-2">
            🏨 Select Hostel
          </label>
          <select
            id="hostel-select"
            value={selectedHostel || ''}
            onChange={handleHostelChange}
            disabled={isUploading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Choose a hostel...</option>
            {hostelList.map(name => (
              <option key={name} value={name}>
                {name} (ID: {hostelConfig[name].id})
              </option>
            ))}
          </select>
          {!selectedHostel && (
            <p className="text-xs text-gray-500 mt-1">
              Select a hostel to fetch data for
            </p>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* INFO BOX */}
      {/* ============================================================ */}

      {fetchMode === 'all' && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Fetching all 11 hostels</p>
              <p>This will take approximately 25-35 seconds. Progress will be shown in real-time.</p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* FETCH BUTTON */}
      {/* ============================================================ */}

      <button
        onClick={handleFetch}
        disabled={!canFetch}
        className={`w-full px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
          canFetch
            ? 'bg-teal hover:bg-teal-dark text-white shadow-md hover:shadow-lg'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {isUploading ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            <span>Fetching from CloudBeds...</span>
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            <span>
              {fetchMode === 'all'
                ? 'Fetch All Hostels'
                : selectedHostel
                ? `Fetch ${selectedHostel}`
                : 'Select Hostel to Fetch'}
            </span>
          </>
        )}
      </button>

      {/* Button helper text */}
      {!selectedWeekStart && (
        <p className="text-xs text-center text-gray-500">
          Select a week above to enable fetching
        </p>
      )}
      {fetchMode === 'single' && selectedWeekStart && !selectedHostel && (
        <p className="text-xs text-center text-gray-500">
          Select a hostel to enable fetching
        </p>
      )}

      {/* ============================================================ */}
      {/* LOADING STATE INFO */}
      {/* ============================================================ */}

      {isUploading && !apiFetchProgress && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-sm text-gray-600 text-center">
            {fetchMode === 'all'
              ? 'Fetching data from CloudBeds for all hostels...'
              : `Fetching data from CloudBeds for ${selectedHostel}...`}
          </p>
          <p className="text-xs text-gray-500 text-center mt-1">
            Please wait, this may take a few seconds.
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/* PHASE 4: REAL-TIME PROGRESS DISPLAY */}
      {/* ============================================================ */}

      {isUploading && apiFetchProgress && (
        <div className="border-2 border-teal rounded-lg p-4 bg-gray-50 space-y-3">
          {/* Header */}
          <div className="text-sm font-mono text-gray-700 font-semibold">
            🔧 FETCHING DATA FROM CLOUDBEDS API...
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal to-green h-full transition-all duration-300"
                style={{ width: `${(apiFetchProgress.current / apiFetchProgress.total) * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-600 font-mono">
              {apiFetchProgress.current}/{apiFetchProgress.total} (
              {Math.round((apiFetchProgress.current / apiFetchProgress.total) * 100)}%)
              • {Math.floor((Date.now() - apiFetchProgress.startTime) / 1000)}s elapsed
            </div>
          </div>

          {/* Hostel Status List */}
          <div className="max-h-64 overflow-y-auto space-y-1 font-mono text-xs">
            {apiFetchProgress.hostels.map((hostel) => (
              <div
                key={hostel.name}
                className={`flex items-center justify-between p-2 rounded ${
                  hostel.status === 'success' ? 'bg-green-50' :
                  hostel.status === 'error' ? 'bg-red-50' :
                  hostel.status === 'loading' ? 'bg-blue-50' :
                  'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {hostel.status === 'success' && <span className="text-green-600">✓</span>}
                  {hostel.status === 'error' && <span className="text-red-600">✗</span>}
                  {hostel.status === 'loading' && <span className="text-blue-600">⏳</span>}
                  {hostel.status === 'pending' && <span className="text-gray-400">⏸</span>}
                  <span className="w-28 font-medium">{hostel.name}</span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  {hostel.status === 'success' && (
                    <>
                      <span className="text-gray-600">{hostel.bookingCount} bookings</span>
                      <span className="text-gray-500">{(hostel.elapsedTime / 1000).toFixed(1)}s</span>
                    </>
                  )}
                  {hostel.status === 'error' && (
                    <span className="text-red-600">{hostel.error}</span>
                  )}
                  {hostel.status === 'loading' && (
                    <span className="text-blue-600 animate-pulse">Fetching...</span>
                  )}
                  {hostel.status === 'pending' && (
                    <span className="text-gray-400">Queued</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between text-sm pt-2 border-t">
            <div className="text-gray-700 font-mono">
              ⚡ {apiFetchProgress.hostels.filter(h => h.status === 'success').length} successful,{' '}
              {apiFetchProgress.hostels.filter(h => h.status === 'error').length} failed
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default APIFetchPanel;
