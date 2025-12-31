# Claude Code Implementation Prompt: Excel-Style Table View

## 🎯 Project Context

You are working on the **Nests Hostels Analytics Dashboard**, a React application that analyzes CloudBeds booking data. The current dashboard displays weekly data in a **column-based layout** (weeks as columns, hostels as rows). 

The client now wants to test a **NEW row-based layout** (weeks as rows, hostel data grouped horizontally) that matches their Excel tracking spreadsheet, while keeping the existing dashboard unchanged.

### 🎨 Visual Transformation: Generic → Nests Brand

**OLD Generic Colors** → **NEW Nests Brand Colors**
- ~~Blue (`bg-blue-600`)~~ → **Teal gradient** (`bg-nests-gradient`, `#53CED1 → #0D6F82`)
- ~~Green (`bg-green-600`)~~ → **Nests Green** (`bg-nests-green`, `#53D195`)
- ~~Yellow (`bg-yellow-100`)~~ → **Nests Yellow** (`bg-nests-yellow/20`, `#E5B853`)
- ~~Generic sans-serif~~ → **Poppins** (headings) + **Montserrat** (body)
- ~~Box shadows~~ → **Clean borders** (no shadows)

## 📋 Requirements Summary

### **IMPORTANT: Brand Styling Setup Required FIRST**

Before implementing the Excel view, you **MUST** update the following files with Nests brand design system:

1. **`tailwind.config.js`** - Add Nests brand colors and fonts
2. **`src/index.css`** - Import Google Fonts (Poppins & Montserrat)

See the **🎨 Styling Guidelines** section below for exact configurations.

### Core Objective
Add a **NEW table view component** that displays weekly analytics data in an Excel-style row-based format, with a toggle to switch between the current dashboard and the new view.

### Key Principles
- **DO NOT modify** existing dashboard components
- **Keep current functionality** completely intact
- **Add new component** as separate view
- **Use existing `weeklyData` state** (no data processing changes)
- **Follow project philosophy**: Simplicity over complexity, pragmatic solutions
- **Maintain code quality**: Well-commented, DRY principles, proper encapsulation

## 🎨 Target Layout (from HTML Reference)

### Table Structure
```
| PERIODO | [GA Placeholders...] | EUR | [Funnel Placeholders...] | CONVERSIONES POR HOSTAL | PICOS/CAÍDAS | TOP 3 países |
|---------|----------------------|-----|--------------------------|-------------------------|--------------|--------------|
| Week 1  | [empty]              | €6k | [empty]                  | [Nested Hostel Table]   | [empty]      | [empty]      |
| Week 2  | [empty]              | €12k| [empty]                  | [Nested Hostel Table]   | [empty]      | [empty]      |
```

### Nested Hostel Table (CONVERSIONES POR HOSTAL column)
```
| Hostel      | Count | Revenue      | Nest Pass |
|-------------|-------|--------------|-----------|
| Duque       | 15    | 2.125,00 €   | 3         |
| Las Palmas  | 4     | 532,00 €     | 2         |
| ...         | ...   | ...          | ...       |
| TOTAL       | 70    | 6.058,00 €   | 14        |
```

## 📊 Data Transformation

### Current State Structure
```javascript
weeklyData = [
  {
    week: "15 Dec 2024 - 21 Dec 2024",
    date: Date,
    hostels: {
      "Flamingo": { count: 15, revenue: 2125, nestPass: 3, ... },
      "Puerto": { count: 4, revenue: 532, nestPass: 2, ... },
      // ... other hostels
    }
  },
  // ... more weeks
]
```

### Required Transformation
Transform `weeklyData` into row format where:
- Each week = one row
- Hostel data grouped in nested structure
- Calculate totals per week
- Order hostels by `hostelConfig` order

### Helper Function Example
```javascript
const transformToRowFormat = (weeklyData) => {
  return weeklyData.map(week => {
    // Get hostels in hostelConfig order
    const orderedHostels = Object.keys(hostelConfig).map(hostelName => ({
      name: hostelName,
      data: week.hostels[hostelName] || { count: 0, revenue: 0, nestPass: 0 }
    }));

    // Calculate week totals
    const totals = {
      count: orderedHostels.reduce((sum, h) => sum + h.data.count, 0),
      revenue: orderedHostels.reduce((sum, h) => sum + h.data.revenue, 0),
      nestPass: orderedHostels.reduce((sum, h) => sum + (h.data.nestPass || 0), 0)
    };

    return {
      period: week.week,
      hostels: orderedHostels,
      totals,
      // Placeholder fields (empty for now)
      gaMetrics: { users: null, sessions: null, conversions: null, convRate: null, bounceRate: null, avgTime: null },
      topTraffic: null,
      funnel: { bookingEngine: null, addToCart: null, checkout: null, purchase: null },
      picos: null,
      topCountries: []
    };
  });
};
```

## 🏗️ Component Structure

### New Components to Create

1. **`src/components/Dashboard/ExcelStyleView.jsx`** (Main container)
   - Renders the new table view
   - Manages row data transformation
   - Handles responsive horizontal scroll

2. **`src/components/Dashboard/NestedHostelTable.jsx`** (Reusable nested table)
   - Displays hostel data in nested format
   - Shows: Hostel name, Count, Revenue, Nest Pass
   - Includes TOTAL row at bottom

### Modified Components

**`src/components/HostelAnalytics.jsx`**
- Add state: `const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' or 'excel'`
- Add toggle button/tabs above current content
- Conditionally render based on `viewMode`:
  ```javascript
  {viewMode === 'dashboard' ? (
    <>
      <LatestWeekSummary />
      <PerformanceTable />
      {/* ... existing components */}
    </>
  ) : (
    <ExcelStyleView weeklyData={weeklyData} />
  )}
  ```

## 📝 Detailed Implementation Steps

### Step 1: Create NestedHostelTable Component

**File**: `src/components/Dashboard/NestedHostelTable.jsx`

```javascript
import React from 'react';
import { formatCurrency } from '../../utils/formatters';

const NestedHostelTable = ({ hostels, totals }) => {
    return (
        <div className="overflow-hidden">
            <table className="min-w-full text-xs border-collapse font-body">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-2 py-1 text-left font-heading">Hostel</th>
                        <th className="border border-gray-300 px-2 py-1 text-center font-heading">Count</th>
                        <th className="border border-gray-300 px-2 py-1 text-right font-heading">Revenue</th>
                        <th className="border border-gray-300 px-2 py-1 text-center font-heading">Nest Pass</th>
                    </tr>
                </thead>
                <tbody>
                    {hostels.map(({ name, data }) => (
                        <tr key={name} className="hover:bg-gray-50 transition-colors">
                            <td className="border border-gray-300 px-2 py-1">{name}</td>
                            <td className="border border-gray-300 px-2 py-1 text-center">
                                {data.count !== undefined ? data.count : 0}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-right">
                                {data.count > 0 && data.revenue ? formatCurrency(data.revenue) : '-'}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-center">
                                {data.count > 0 && data.nestPass ? data.nestPass : '-'}
                            </td>
                        </tr>
                    ))}
                    {/* TOTAL Row */}
                    <tr className="bg-nests-yellow/20 font-bold">
                        <td className="border border-gray-300 px-2 py-1">TOTAL</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">
                            {totals.count}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right">
                            {formatCurrency(totals.revenue)}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-center">
                            {totals.nestPass}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

export default NestedHostelTable;
```

### Step 2: Create ExcelStyleView Component

**File**: `src/components/Dashboard/ExcelStyleView.jsx`

```javascript
import React, { useMemo } from 'react';
import { Table } from 'lucide-react';
import { hostelConfig } from '../../config/hostelConfig';
import { formatCurrency } from '../../utils/formatters';
import NestedHostelTable from './NestedHostelTable';

const ExcelStyleView = ({ weeklyData }) => {
    // Transform data to row format
    const rowData = useMemo(() => {
        return weeklyData.map(week => {
            // Get hostels in hostelConfig order
            const orderedHostels = Object.keys(hostelConfig).map(hostelName => ({
                name: hostelName,
                data: week.hostels[hostelName] || { count: 0, revenue: 0, nestPass: 0, cancelled: 0, valid: 0 }
            }));

            // Calculate week totals
            const totals = {
                count: orderedHostels.reduce((sum, h) => sum + h.data.count, 0),
                revenue: orderedHostels.reduce((sum, h) => sum + h.data.revenue, 0),
                nestPass: orderedHostels.reduce((sum, h) => sum + (h.data.nestPass || 0), 0)
            };

            return {
                period: week.week,
                hostels: orderedHostels,
                totals
            };
        });
    }, [weeklyData]);

    if (weeklyData.length === 0) {
        return (
            <div className="text-center py-12">
                <Table className="w-16 h-16 text-nests-teal mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2 font-heading">No data yet</h3>
                <p className="text-gray-500 font-body">Upload files or paste data to see Excel-style view</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 font-heading">
                <Table className="text-nests-teal" />
                Excel-Style Weekly View
            </h2>

            {/* Horizontal scroll container */}
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm font-body">
                    <thead>
                        <tr className="bg-nests-gradient text-white">
                            <th className="border border-gray-300 px-4 py-2 text-left sticky left-0 bg-nests-dark-teal z-10 font-heading">
                                PERIODO
                            </th>
                            {/* Placeholder columns - Google Analytics */}
                            <th className="border border-gray-300 px-4 py-2 font-heading">USUARIOS</th>
                            <th className="border border-gray-300 px-4 py-2 font-heading">SESIONES</th>
                            <th className="border border-gray-300 px-4 py-2 font-heading">CONVERSIONS</th>
                            <th className="border border-gray-300 px-4 py-2 font-heading">CONV RT</th>
                            <th className="border border-gray-300 px-4 py-2 font-heading">BOUNCE RATE</th>
                            <th className="border border-gray-300 px-4 py-2 font-heading">AVG Time</th>
                            {/* EUR - Calculated from data */}
                            <th className="border border-gray-300 px-4 py-2 bg-nests-green text-white font-heading">EUR</th>
                            {/* Placeholder - Traffic */}
                            <th className="border border-gray-300 px-4 py-2 font-heading">TOP TRAFICO</th>
                            {/* Placeholder - Funnel */}
                            <th className="border border-gray-300 px-4 py-2 font-heading">BOOKING ENGINE</th>
                            <th className="border border-gray-300 px-4 py-2 font-heading">ADD TO CART</th>
                            <th className="border border-gray-300 px-4 py-2 font-heading">CHECK-OUT</th>
                            <th className="border border-gray-300 px-4 py-2 font-heading">PURCHASE</th>
                            {/* Hostel data - nested table */}
                            <th className="border border-gray-300 px-4 py-2 bg-nests-teal text-white font-heading">
                                CONVERSIONES POR HOSTAL
                            </th>
                            {/* Placeholder - Manual fields */}
                            <th className="border border-gray-300 px-4 py-2 font-heading">PICOS/CAÍDAS</th>
                            <th className="border border-gray-300 px-4 py-2 font-heading">TOP 3 países</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rowData.map((row, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                {/* Period - sticky */}
                                <td className="border border-gray-300 px-4 py-2 font-semibold sticky left-0 bg-white z-10 whitespace-pre-line">
                                    {row.period.replace(' - ', '\n')}
                                </td>
                                
                                {/* Placeholder columns - empty for now */}
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                                
                                {/* EUR - Calculated total revenue */}
                                <td className="border border-gray-300 px-4 py-2 text-right font-semibold bg-nests-green/10 text-nests-green">
                                    {formatCurrency(row.totals.revenue)}
                                </td>
                                
                                {/* Placeholder - Traffic, Funnel, Manual */}
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                                
                                {/* Hostel conversions - nested table */}
                                <td className="border border-gray-300 px-2 py-2 bg-nests-teal/10">
                                    <NestedHostelTable 
                                        hostels={row.hostels} 
                                        totals={row.totals} 
                                    />
                                </td>
                                
                                {/* Placeholder - Manual fields */}
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                                <td className="border border-gray-300 px-4 py-2 text-center bg-gray-50">-</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Legend for placeholders */}
            <div className="mt-4 text-xs text-gray-500 border-t border-gray-200 pt-4">
                <p>
                    <span className="font-semibold">Note:</span> Gray columns with "-" are placeholders for future data integration 
                    (Google Analytics, funnel metrics, manual entries). EUR and CONVERSIONES POR HOSTAL show calculated data from uploaded bookings.
                </p>
            </div>
        </div>
    );
};

export default ExcelStyleView;
```

### Step 3: Add View Toggle to HostelAnalytics

**File**: `src/components/HostelAnalytics.jsx`

**Add imports:**
```javascript
import { BarChart3, Table, Brain } from 'lucide-react'; // Add Table and Brain icons
import ExcelStyleView from './Dashboard/ExcelStyleView';
```

**Add state variable (after existing state declarations):**
```javascript
const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' or 'excel'
```

**Add toggle buttons (after header, before WarningBanner):**
```javascript
{/* View Mode Toggle */}
{weeklyData.length > 0 && (
    <div className="flex justify-center gap-4 mb-6">
        <button
            onClick={() => setViewMode('dashboard')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold font-heading transition-colors ${
                viewMode === 'dashboard'
                    ? 'bg-nests-teal text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
        >
            <BarChart3 className="w-5 h-5" />
            Dashboard View
        </button>
        <button
            onClick={() => setViewMode('excel')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold font-heading transition-colors ${
                viewMode === 'excel'
                    ? 'bg-nests-teal text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
        >
            <Table className="w-5 h-5" />
            Excel View
        </button>
    </div>
)}
```

**Wrap existing dashboard components with conditional rendering:**
```javascript
{/* Conditional View Rendering */}
{viewMode === 'dashboard' ? (
    <>
        {/* Current Week Summary */}
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
    </>
) : (
    <>
        {/* Excel-Style View */}
        <ExcelStyleView weeklyData={weeklyData} />
        
        {/* AI Analysis still available in Excel view */}
        <div className="flex justify-center mb-6">
            <button
                onClick={getAIAnalysis}
                disabled={isAnalyzing}
                className="bg-nests-dark-teal text-white px-6 py-3 rounded-lg font-semibold font-heading hover:bg-nests-teal transition-colors flex items-center gap-2 disabled:opacity-50"
            >
                <Brain className="w-5 h-5" />
                {isAnalyzing ? 'Analyzing...' : 'Generate AI Analysis'}
            </button>
        </div>
        <AIAnalysisPanel analysisReport={analysisReport} />
    </>
)}
```

## 🎨 Styling Guidelines - Nests Brand Design System

### Brand Colors (Tailwind Configuration)

**IMPORTANT**: Before implementing, update `tailwind.config.js` with Nests brand colors:

```javascript
// tailwind.config.js
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Nests Primary Colors
                'nests-teal': '#53CED1',        // Main brand color
                'nests-dark-teal': '#0D6F82',   // Secondary/emphasis
                
                // Nests Accent Colors
                'nests-green': '#53D195',       // Success states
                'nests-red': '#D15653',         // Errors/warnings
                'nests-yellow': '#E5B853',      // Warnings
                'nests-orange': '#E37C25',      // Special highlights
                'nests-lime': '#CED153',        // Additional accent
                
                // Keep existing grays
                // ... existing gray scale
            },
            fontFamily: {
                'heading': ['Poppins', 'system-ui', 'sans-serif'],
                'body': ['Montserrat', 'system-ui', 'sans-serif'],
            },
            backgroundImage: {
                'nests-gradient': 'linear-gradient(to right, #53CED1, #0D6F82)',
                'nests-gradient-reverse': 'linear-gradient(to right, #0D6F82, #53CED1)',
                'nests-gradient-orange': 'linear-gradient(135deg, #53CED1, #E37C25)',
            },
        },
    },
    plugins: [],
}
```

**And update `index.css` with Google Fonts:**

```css
/* Add to src/index.css at the top */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Montserrat:wght@400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
    * {
        @apply box-border;
    }

    body {
        @apply bg-gray-100 text-gray-900 font-body;
        font-feature-settings: "rlig" 1, "calt" 1;
    }
    
    h1, h2, h3, h4, h5, h6 {
        @apply font-heading;
    }
}
```

### Excel View Color Scheme

**Apply Nests brand colors to the Excel-style table:**

- **Header row**: Teal gradient background (`bg-nests-gradient text-white`)
- **EUR column**: Success green highlight (`bg-nests-green text-white` header, `bg-nests-green/10` cells)
- **Hostel data column**: Teal highlight (`bg-nests-teal text-white` header, `bg-nests-teal/10` cells)
- **Placeholder columns**: Light gray background (`bg-gray-50`)
- **Sticky period column**: White background with subtle border
- **Nested table TOTAL row**: Yellow highlight (`bg-nests-yellow/20`)
- **Status indicators**: Use nests-green (success), nests-red (errors), nests-yellow (warnings)

### Design Principles (Nests Brand)

1. **No box-shadows** - Use borders instead for separation
2. **No border-left accent bars** - Clean, minimal design
3. **Gradient backgrounds** - Use for headers and call-to-action areas
4. **Rounded corners** - Consistent `rounded-lg` for cards/buttons
5. **Subtle transparency** - Use `/10`, `/20` opacity for background highlights

### Color Usage Philosophy

- **Primary Teal (#53CED1)**: Main buttons, links, active states, primary headers
- **Dark Teal (#0D6F82)**: Secondary buttons, subheadings, hover states
- **Success Green (#53D195)**: Successful operations, positive metrics, completion states
- **Danger Red (#D15653)**: Errors, delete actions, critical warnings, cancelled bookings
- **Warning Yellow (#E5B853)**: Caution messages, pending states, warnings
- **Orange (#E37C25)**: Special features, highlights (use sparingly)

### Button Styles (Updated for Brand)

```jsx
// Primary button - Teal
className="bg-nests-teal hover:bg-nests-dark-teal text-white px-4 py-2 rounded-lg font-semibold transition-colors"

// Secondary button - Dark Teal
className="bg-nests-dark-teal hover:bg-nests-teal text-white px-4 py-2 rounded-lg font-semibold transition-colors"

// Danger button - Red
className="bg-nests-red hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"

// Success button - Green
className="bg-nests-green hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
```

### Status Badges/Pills

```jsx
// Success/Active
className="bg-nests-green/20 text-nests-green px-3 py-1 rounded-full text-sm font-medium"

// Error/Failed
className="bg-nests-red/20 text-nests-red px-3 py-1 rounded-full text-sm font-medium"

// Warning/Pending
className="bg-nests-yellow/20 text-nests-yellow px-3 py-1 rounded-full text-sm font-medium"

// Info
className="bg-nests-teal/20 text-nests-teal px-3 py-1 rounded-full text-sm font-medium"
```

### Responsive Design
- Use `overflow-x-auto` on table container
- Sticky left column (PERIODO) with `sticky left-0 z-10`
- Minimum width ensures all columns visible
- Horizontal scroll for narrow screens
- Clean borders instead of shadows for table separation

### Typography (Brand-Aligned)
- **Headings**: Poppins font (`font-heading`), bold
- **Body text**: Montserrat font (`font-body`)
- **Table headers**: Bold, uppercase in Poppins
- **Period column**: Semibold, line breaks for date range
- **EUR column**: Right-aligned, semibold in Montserrat
- **Placeholder cells**: Center-aligned, "-" character

---

## ⚙️ CONFIGURATION FILES - UPDATE THESE FIRST!

### Step 0: Update Tailwind Config and CSS (Required Before Components)

**File 1: `tailwind.config.js`** - Replace the entire file with:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Nests Primary Colors
                'nests-teal': '#53CED1',        // Main brand color
                'nests-dark-teal': '#0D6F82',   // Secondary/emphasis
                
                // Nests Accent Colors
                'nests-green': '#53D195',       // Success states
                'nests-red': '#D15653',         // Errors/warnings
                'nests-yellow': '#E5B853',      // Warnings
                'nests-orange': '#E37C25',      // Special highlights
                'nests-lime': '#CED153',        // Additional accent
            },
            fontFamily: {
                'heading': ['Poppins', 'system-ui', 'sans-serif'],
                'body': ['Montserrat', 'system-ui', 'sans-serif'],
            },
            backgroundImage: {
                'nests-gradient': 'linear-gradient(to right, #53CED1, #0D6F82)',
                'nests-gradient-reverse': 'linear-gradient(to right, #0D6F82, #53CED1)',
                'nests-gradient-orange': 'linear-gradient(135deg, #53CED1, #E37C25)',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                }
            }
        },
    },
    plugins: [],
}
```

**File 2: `src/index.css`** - Add Google Fonts import at the very top:

```css
/* Nests Brand Fonts - MUST BE FIRST */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Montserrat:wght@400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
    * {
        @apply box-border;
    }

    body {
        @apply bg-gray-100 text-gray-900 font-body;
        font-feature-settings: "rlig" 1, "calt" 1;
    }
    
    h1, h2, h3, h4, h5, h6 {
        @apply font-heading;
    }
}

/* Keep existing @layer components styles below... */
```

**After updating these files, restart the dev server for changes to take effect.**

---

## ✅ Testing Checklist

### Configuration
- [ ] **tailwind.config.js updated** with Nests brand colors
- [ ] **src/index.css updated** with Google Fonts import
- [ ] Dev server restarted after config changes
- [ ] Poppins font loading correctly (check headings)
- [ ] Montserrat font loading correctly (check body text)

### Functionality
- [ ] Toggle between Dashboard and Excel view works correctly
- [ ] Excel view displays all weeks from `weeklyData`
- [ ] Hostels appear in `hostelConfig` order
- [ ] Nested hostel table shows: name, count, revenue, nest pass
- [ ] TOTAL row calculates correctly (sum of all hostels)
- [ ] EUR column shows correct total revenue per week
- [ ] Placeholder columns display "-" character
- [ ] Empty state shows when no data available
- [ ] AI Analysis works in both views

### UI/UX
- [ ] **Brand colors applied correctly**:
  - Header row uses nests-teal gradient
  - EUR column uses nests-green
  - Hostel column uses nests-teal
  - Toggle buttons use nests-teal when active
  - TOTAL row uses nests-yellow/20 background
- [ ] **Fonts display correctly**:
  - Headings use Poppins
  - Body text uses Montserrat
  - No fallback fonts showing
- [ ] **No box-shadows** (clean, minimal design)
- [ ] Horizontal scroll works smoothly
- [ ] Period column stays sticky on scroll
- [ ] Hover states work on table rows
- [ ] Color coding is consistent
- [ ] Legend/note explains placeholder columns
- [ ] Toggle buttons have active state indication
- [ ] Table is readable on mobile (horizontal scroll)
- [ ] Nested table formatting is clean

### Data Integrity
- [ ] No data processing logic changed
- [ ] Existing dashboard view unchanged
- [ ] Calculations match existing PerformanceTable
- [ ] Hostel order follows `hostelConfig`
- [ ] Zero values display correctly (0 vs "-")

### Code Quality
- [ ] Components follow existing patterns
- [ ] Proper imports and exports
- [ ] Comments explain complex logic
- [ ] DRY principles maintained
- [ ] No console errors
- [ ] Proper React keys in lists

## 🚀 Optional Improvements (If Time Permits)

### Enhancement Ideas
1. **Export to Excel**: Add button to export Excel view as .xlsx file
2. **Column Visibility Toggle**: Let users show/hide placeholder columns
3. **Sortable Columns**: Click headers to sort weeks
4. **Collapsible Nested Tables**: Expand/collapse hostel details
5. **Print-Friendly CSS**: Optimize for printing
6. **Week-to-Week Comparison**: Show delta arrows in cells

### Future Database Integration Prep
- Add comment placeholders for where database fields will populate
- Keep data structure flexible for adding properties
- Consider adding a `manualData` object in `weeklyData` state for future manual entries

## 📚 Reference Files

### Key Files to Modify
- `src/components/HostelAnalytics.jsx` - Add toggle and conditional rendering
- Create: `src/components/Dashboard/ExcelStyleView.jsx`
- Create: `src/components/Dashboard/NestedHostelTable.jsx`

### Utility Files (No Changes Needed)
- `src/utils/formatters.js` - Use existing `formatCurrency`
- `src/config/hostelConfig.js` - Use existing hostel order

### Reference HTML
- `table.html` - Exact structure to match

## 🎯 Success Criteria

The implementation is successful when:
1. ✅ **Brand styling configured** - Nests colors and fonts applied
2. ✅ User can toggle between Dashboard and Excel views
3. ✅ Excel view matches the HTML/screenshot structure
4. ✅ All existing functionality remains unchanged
5. ✅ Hostel data (count, revenue, nest pass) displays correctly
6. ✅ Placeholder columns are clearly marked
7. ✅ Table is responsive with horizontal scroll
8. ✅ Code follows project conventions and philosophy
9. ✅ **Visual design** uses Nests teal, green, yellow, and brand fonts
10. ✅ **No box-shadows** - clean, minimal aesthetic

## 💡 Important Notes

- **START HERE** - Update `tailwind.config.js` and `src/index.css` BEFORE writing components
- **VERIFY FONTS** - Check Google Fonts load correctly after CSS changes
- **RESTART DEV SERVER** - Required after Tailwind config changes
- **DO NOT** change any data processing logic in `metricsCalculator.js`
- **DO NOT** modify existing dashboard components
- **KEEP** all current functionality intact
- **USE** existing utility functions (`formatCurrency`, `hostelConfig`)
- **FOLLOW** project philosophy: simplicity, pragmatism, low coupling
- **ADD** comprehensive comments explaining the new components
- **APPLY** Nests brand colors (teal, green, yellow) throughout
- **NO BOX-SHADOWS** - Use clean borders instead

## 📞 Questions or Issues?

If you encounter any ambiguity or issues:
1. Check existing components for patterns
2. Refer to CLAUDE.md for development guidelines
3. Follow the "simplicity over complexity" principle
4. Ask before making architectural changes

---

**Good luck!** 🚀 Remember: Keep it simple, well-commented, and maintain the existing codebase integrity.