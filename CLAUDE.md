# CLAUDE.md - AI Development Guide

This document provides guidance for AI assistants (like Claude) working on this codebase. It outlines architecture decisions, code patterns, and development conventions to maintain consistency and code quality.

## 📋 Project Overview

**React Hostel Analytics Dashboard** - A single-page React application for analyzing CloudBeds hostel booking data with week-over-week performance tracking, ADR calculations, and AI-powered insights.

### Core Purpose
Transform CloudBeds reservation exports into actionable insights for hostel operators through:
- Multi-format data ingestion (Excel files, copy-paste)
- Automatic week detection and data grouping
- Progressive metric calculations (bookings, revenue, ADR, lead time, Nest Pass, Monthly)
- Visual trend analysis with charts
- AI-powered performance analysis

### Tech Stack
- **React 18** - Functional components with hooks
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Charts and visualizations
- **SheetJS (XLSX)** - Excel file processing
- **Lucide React** - Icon library
- **Claude API** - AI-powered analysis

## 🎨 Development Philosophy

**CRITICAL PRINCIPLE: Simplicity Over Complexity**

This project is built for **Nests Hostels**, a Spanish hostel chain, with a focus on practical, maintainable code that solves real business problems.

### Core Principles

1. **Simplicity Over Complexity**
   - Choose the simpler solution that works
   - Favor clarity over cleverness
   - Write code that operators can understand
   - Avoid unnecessary abstractions

2. **Pragmatic Over Theoretical**
   - Real functionality trumps "best practices"
   - Focus on what works for Nests Hostels
   - Avoid dogmatic adherence to patterns
   - Choose practical solutions over ideal ones

3. **Low Coupling**
   - Components should be independent and reusable
   - Minimize dependencies between components
   - Each component should stand alone when possible
   - Avoid tight coupling to specific implementations

4. **Proper Encapsulation**
   - Components manage their own concerns
   - Keep internal logic private to the component
   - Clear interfaces between components
   - Don't expose implementation details

5. **Incremental Improvements, Not Rewrites**
   - Suggest small, targeted enhancements
   - Never propose complete architectural changes
   - Build on existing patterns

6. **Functional Components with Hooks**
   - Use `useState`, `useEffect`, `useCallback`
   - Avoid class components entirely
   - Keep hooks simple and focused

### What to AVOID

❌ **Complex State Management**
- No Redux, Zustand, or MobX unless clearly needed
- Local state is sufficient for this application
- Keep state management simple

❌ **Custom Hooks (Unless Reused 3+ Times)**
- Don't extract logic into hooks prematurely
- Only create custom hooks when pattern repeats 3+ times
- Inline logic is often clearer

❌ **Unnecessary Dependencies**
- Don't add libraries for simple problems
- Use existing utilities first
- Every dependency is a maintenance burden

❌ **Over-Engineering**
- Don't create abstractions prematurely
- Work within existing component structure
- Respect the pragmatic, component-based design

### What to FOCUS ON

✅ **Performance Improvements**
- Use `React.memo` for expensive list items
- Apply `useMemo` for heavy calculations
- Optimize only when needed (measure first)

✅ **Accessibility Enhancements**
- Semantic HTML elements
- ARIA labels for interactive elements
- Keyboard navigation support

✅ **Small, Targeted Fixes**
- One bug, one commit
- Clear, specific changes
- Easy to review and test

✅ **React Best Practices**
- Proper `key` props in lists
- Correct dependency arrays
- Avoid inline object/function creation in renders

## 💬 Communication Guidelines

**CRITICAL: How AI Assistants Should Interact**

### Always Ask Before Coding
- **Confirm requirements first**: Understand what's needed before suggesting code
- **Clarify ambiguity**: If requirements are unclear, ask questions
- **Present options**: When multiple approaches exist, explain trade-offs
- **Get approval**: Wait for confirmation before implementing significant changes

### Explain Technical Trade-offs
```
❌ BAD: "Here's the solution using Redux for state management."

✅ GOOD: "We could manage this with Redux (overkill for this app) or
         keep using local state (simpler, fits current pattern).
         Given the project's philosophy, I'd recommend local state.
         Should I proceed with that approach?"
```

### Provide Practical Examples
- Include clear, commented code examples
- Show both good and bad patterns (with ✅ and ❌)
- Use real examples from the codebase when possible
- Explain why one approach is better for this specific project

### Avoid "Best Practices" Claims
```
❌ BAD: "Best practice dictates we should use Redux here."
❌ BAD: "The right way is to extract this into a custom hook."
❌ BAD: "Industry standard is to use TypeScript for this."

✅ GOOD: "For this component-based design, keeping state local in the
         main orchestrator is simpler and aligns with the project's pragmatic approach."

✅ GOOD: "We could extract this into a custom hook, but since it's
         only used once, inline logic is clearer per the project
         guidelines (3+ reuse rule)."

✅ GOOD: "TypeScript could add type safety, but would increase
         complexity. Given the 'simplicity over complexity' principle,
         the current JavaScript approach works well."
```

### When Proposing Changes
1. **Explain the problem** - What issue are we solving?
2. **Present options** - What are the possible approaches?
3. **Recommend solution** - Which fits project philosophy best?
4. **Show trade-offs** - What are we gaining/losing?
5. **Ask for approval** - Wait for confirmation before coding

### Example Interaction
```
User: "The charts are loading slowly."

❌ BAD Response:
"I'll refactor this to use React.memo and useMemo everywhere."

✅ GOOD Response:
"I notice the chart rendering might be slow. Before optimizing,
let me ask:

1. How many data points are typically displayed?
2. Is this slow on all devices or just certain ones?
3. Have you tested with React DevTools Profiler?

Based on your answers, we could:
- Option A: Add React.memo to chart components (targeted, simple)
- Option B: Refactor data processing (more complex but might help)
- Option C: Measure first with profiler (best practice: measure before optimizing)

I'd recommend Option C first - let's see where the actual bottleneck
is before making changes. Should I add profiling instructions?"
```

## 🏗️ Architecture Patterns

### Component Structure
- **Component-Based Design**: Modular components organized by feature area
- **Main Orchestrator**: `HostelAnalytics.jsx` manages state and coordinates child components
- **Feature-Organized Components**: Grouped into Dashboard, DataInput, Charts, and Analysis
- **Utility Modules**: Centralized business logic in utils (dateUtils, metricsCalculator, etc.)
- **React Hooks**: Extensive use of `useState` and `useCallback` for state management
- **No External State Management**: All state is local to the main component (no Redux/Context)

### Data Flow
```
User Input → Data Parsing → Metrics Calculation → State Update → UI Render
     ↓
[Excel/Paste] → [parsePastedData/processFiles] → [calculateHostelMetrics] → [setWeeklyData] → [Charts/Tables]
```

### Key State Variables
```javascript
weeklyData: [{
  week: "16 Dec 2024 - 22 Dec 2024",
  date: Date,
  hostels: {
    "Flamingo": {
      count, cancelled, valid, revenue, adr,
      nestPass, monthly, avgLeadTime, bookings
    }
  }
}]
```

## 🎯 Code Conventions

### Comments
**CRITICAL**: This codebase values **well-commented code**. Always maintain detailed comments:

```javascript
// ✅ GOOD: Explain purpose and implementation details
// Calculate week boundaries from any date (extensible for future periods)
const calculatePeriod = (date, config = dateConfig) => {
    const targetDate = new Date(date);

    if (config.type === 'week') {
        // Find Monday of the week containing this date
        const dayOfWeek = targetDate.getDay();
        const diff = dayOfWeek === 0 ? -6 : config.weekStartDay - dayOfWeek; // Handle Sunday
        ...
    }

    // Future: Add month, custom period calculations here
    return { start: targetDate, end: targetDate };
};

// ❌ BAD: Missing explanatory comments
const calculatePeriod = (date, config = dateConfig) => {
    const targetDate = new Date(date);
    if (config.type === 'week') {
        const dayOfWeek = targetDate.getDay();
        const diff = dayOfWeek === 0 ? -6 : config.weekStartDay - dayOfWeek;
        ...
    }
    return { start: targetDate, end: targetDate };
};
```

### Comment Types to Include
1. **Function Purpose**: High-level description of what the function does
2. **Implementation Details**: Explain complex logic or algorithms
3. **Future Extensions**: Mark places designed for future enhancements
4. **Data Processing Steps**: Document each stage of data transformation
5. **JSX Sections**: Label major UI sections with HTML comments

### Naming Conventions
- **Functions**: Descriptive camelCase (`calculateHostelMetrics`, `detectWeekFromBookings`)
- **State Variables**: Clear, semantic names (`weeklyData`, `isUploading`, `pasteData`)
- **Utilities**: Prefix with purpose (`formatCurrency`, `parseExcelDate`, `calculateMetricChange`)
- **Components**: PascalCase (`HostelAnalytics`, `MetricChange`)

### DRY Principles Applied
The codebase follows DRY (Don't Repeat Yourself) with reusable utilities:

```javascript
// Centralized currency formatting
const formatCurrency = (amount) => `€${amount.toFixed(2)}`;

// Reusable metric change calculation
const calculateMetricChange = (current, previous) => {
    if (previous === 0 || previous === undefined) {
        return { change: current, percentage: current > 0 ? 100 : 0, isNew: true };
    }
    const change = current - previous;
    const percentage = Math.round((change / previous) * 100);
    return { change, percentage, isNew: false };
};

// Unified hostel metrics calculation
const calculateHostelMetrics = (bookings) => {
    const cancelled = bookings.filter(b => b.status?.toLowerCase().includes('cancel'));
    const valid = bookings.filter(b => !b.status?.toLowerCase().includes('cancel'));

    // Calculate Nest Pass (7+ nights) and Monthly (28+ nights)
    const nestPass = valid.filter(b => (b.nights || 0) >= 7);
    const monthly = nestPass.filter(b => (b.nights || 0) >= 28);

    const totalRevenue = valid.reduce((sum, b) => sum + (b.price || 0), 0);
    const totalNights = valid.reduce((sum, b) => sum + (b.nights || 1), 0);
    const adr = totalNights > 0 ? totalRevenue / totalNights : 0;

    const avgLeadTime = valid
        .filter(b => b.leadTime !== null)
        .reduce((sum, b, _, arr) => sum + b.leadTime / arr.length, 0);

    return {
      count, cancelled, valid, revenue, adr,
      nestPass, monthly, avgLeadTime, bookings
    };
};
```

## 📊 Data Processing Pipeline

### 1. Data Ingestion
**Two methods supported:**

#### Excel File Upload
```javascript
processFiles(files) →
  Parse .xlsx with XLSX library →
  Extract row[33] (source) and row[35] (status) →
  Filter for "Sitio web" bookings →
  calculateHostelMetrics()
```

#### Copy-Paste from CloudBeds
```javascript
parsePastedData(data) →
  Detect HTML vs plain text →
  Parse table structure →
  Extract booking fields →
  Filter for "Sitio web" →
  calculateHostelMetrics()
```

### 2. Week Detection
```javascript
// Auto-detect or use user-selected week
selectedWeekStart ?
  calculatePeriod(selectedWeekStart) :
  detectWeekFromBookings(reservations)
```

### 3. Metrics Calculation
All metrics calculated in `calculateHostelMetrics()`:
- **count**: Total bookings (including cancelled)
- **cancelled**: Number of cancelled bookings
- **valid**: Non-cancelled bookings
- **revenue**: Sum of valid booking prices
- **adr**: Average Daily Rate (revenue ÷ nights)
- **nestPass**: Bookings with 7+ nights (long-term stays)
- **monthly**: Bookings with 28+ nights (monthly stays)
- **avgLeadTime**: Average days between booking and check-in

### 4. Progressive Comparisons
Week-over-week changes calculated in real-time:
```javascript
const calculateProgressiveMetricChanges = (weekIndex, hostel, metricKey) => {
    if (weekIndex === 0) return { change: 0, percentage: 0, isNew: true };

    const currentValue = weeklyData[weekIndex].hostels[hostel]?.[metricKey] || 0;
    const previousValue = weeklyData[weekIndex - 1].hostels[hostel]?.[metricKey] || 0;

    return calculateMetricChange(currentValue, previousValue);
};
```

## 🎨 UI Patterns

### Responsive Design Strategy
- **Desktop**: 4-column grid for hostel cards
- **Mobile**: 2-column grid
- **Tablets**: Adaptive with `sm:` and `lg:` Tailwind breakpoints

### Component Patterns
```jsx
// Reusable metric change display component
const MetricChange = ({ changes, isCurrency = false }) => {
    if (changes.isNew) return <div>First Week</div>;
    if (changes.change === 0) return <div>No change</div>;

    const colorClass = changes.change > 0 ? 'text-green-600' : 'text-red-600';
    const Icon = changes.change > 0 ? TrendingUp : TrendingDown;

    return (
        <div className={colorClass}>
            <Icon className="w-3 h-3" />
            <span>{prefix}{value} ({prefix}{changes.percentage}%)</span>
        </div>
    );
};
```

### Color Coding
- **Green**: Positive trends, revenue, valid bookings
- **Red**: Negative trends, cancellations
- **Blue**: Neutral data, ADR, Nest Pass info
- **Purple**: Nest Pass metrics and totals
- **Yellow**: Warnings (week mismatches)

## ⚡ Performance Guidelines

### When to Optimize
- **Measure first**: Use React DevTools Profiler before optimizing
- **Optimize only bottlenecks**: Don't prematurely optimize
- **Keep it simple**: Performance hacks hurt maintainability

### React.memo Usage
```javascript
// ✅ GOOD: Memoize expensive list items
const HostelCard = React.memo(({ data, week }) => {
  // Card render logic
});

// ❌ BAD: Memoizing everything
const SimpleButton = React.memo(({ onClick }) => <button onClick={onClick}>Click</button>);
```

### useMemo for Heavy Calculations
```javascript
// ✅ GOOD: Expensive chart data preparation
const chartData = useMemo(() => {
  return weeklyData.map(week => ({
    week: week.week,
    ...complexCalculations(week)
  }));
}, [weeklyData]);

// ❌ BAD: Simple operations don't need useMemo
const doubledValue = useMemo(() => count * 2, [count]); // Overkill
```

### useCallback for Event Handlers
```javascript
// ✅ GOOD: Prevent recreating functions in renders
const handleDrop = useCallback(async (e) => {
  e.preventDefault();
  // Drop logic
}, []); // Empty deps, function never changes

// ❌ BAD: Callbacks that don't prevent re-renders
const handleClick = useCallback(() => setCount(count + 1), [count]); // Updates anyway
```

## ♿ Accessibility Guidelines

### Semantic HTML
```jsx
// ✅ GOOD: Semantic elements
<button onClick={handleClick}>Process Data</button>
<nav>
  <ul>
    <li><a href="#upload">Upload</a></li>
  </ul>
</nav>

// ❌ BAD: Generic divs with click handlers
<div onClick={handleClick}>Process Data</div>
```

### ARIA Labels
```jsx
// ✅ GOOD: Descriptive labels
<button aria-label="Upload Excel file for Flamingo hostel">
  <Upload className="w-4 h-4" />
</button>

<input
  type="file"
  aria-describedby="file-upload-instructions"
  accept=".xlsx,.xls"
/>
<p id="file-upload-instructions">Upload CloudBeds Excel reports</p>

// ❌ BAD: Missing context
<button><Upload /></button>
```

### Keyboard Navigation
```jsx
// ✅ GOOD: Proper tab order and keyboard support
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>
  Paste Data
</div>

// ❌ BAD: No keyboard access
<div onClick={handleClick}>Paste Data</div>
```

## 🔧 Configuration

### Hostel Configuration
```javascript
const hostelConfig = {
    'Flamingo': { id: '6733', name: 'Flamingo' },
    'Puerto': { id: '316328', name: 'Puerto' },
    'Arena': { id: '315588', name: 'Arena' },
    // ... add new hostels here with CloudBeds property ID
};
```

### Date Configuration (Extensible)
```javascript
const dateConfig = {
    type: 'week',          // Can be changed to 'month', 'custom', etc.
    weekStartDay: 1,       // Monday = 1, Sunday = 0
    weekLength: 7          // Days in a week
};
```

### Nest Pass Configuration
- **Nest Pass**: 7+ night stays (long-term)
- **Monthly**: 28+ night stays (subset of Nest Pass)
- Displayed with percentage of valid bookings
- Color-coded in purple across UI

## 🤖 AI Integration

### Claude API Integration
Located in `getAIAnalysis()`:
```javascript
const prompt = `Analyze this hostel reservation data and provide insights on performance trends and reasons for changes:

${JSON.stringify(weeklyData, null, 2)}

Please provide:
1. Key performance insights
2. Trends by hostel
3. Possible reasons for week-over-week changes
4. Recommendations for improvement
5. Notable patterns in booking behavior and ADR

Format your response in a clear, actionable report.`;
```

**Note**: API key management should be added for production use

## 🚨 Important Constraints

### Data Source Requirements
- **Source Field**: Must contain "Sitio web" (CloudBeds direct booking indicator)
- **Required Fields**: Booking date, check-in, check-out, nights, price, status
- **Excel Column Indices**:
  - row[23]: Arrival date
  - row[25]: Nights (used for Nest Pass calculation)
  - row[27]: Price
  - row[32]: Booking date
  - row[33]: Source
  - row[35]: Status

### Week Validation
- System validates that uploaded data matches selected week
- Displays warnings if mismatch detected
- Auto-detects week from earliest booking date if not specified

## 📝 Development Guidelines for AI Assistants

### When Making Changes

1. **Always Preserve Comments**
   - Never remove explanatory comments
   - Add new comments for new logic
   - Update comments if behavior changes

2. **Maintain DRY Principles**
   - Extract repeated code into utilities
   - Reuse existing helper functions
   - Create new utilities when patterns repeat

3. **Test Data Processing**
   - Verify Excel parsing with real CloudBeds exports
   - Test copy-paste with both HTML and tab-separated text
   - Confirm metric calculations are accurate (especially Nest Pass)

4. **Responsive Design**
   - Always test changes at mobile, tablet, and desktop breakpoints
   - Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`)
   - Maintain 2-column mobile, 4-column desktop grid

5. **State Management**
   - Keep state updates immutable
   - Use functional updates for derived state
   - Sort weeklyData chronologically after updates

### Code Review Checklist
- [ ] Comments explain "why" not just "what"
- [ ] DRY principles followed (no repeated code)
- [ ] Code is simple and readable (no over-engineering)
- [ ] Incremental change (not a rewrite)
- [ ] No unnecessary dependencies added
- [ ] No custom hooks unless reused 3+ times
- [ ] Responsive design maintained
- [ ] Data processing pipeline intact
- [ ] Week detection and validation working
- [ ] Metrics calculations accurate (including Nest Pass/Monthly)
- [ ] UI color coding consistent
- [ ] Error handling present
- [ ] Proper React key props in lists
- [ ] Correct useEffect/useCallback dependencies
- [ ] Accessibility considerations (semantic HTML, ARIA)
- [ ] Performance optimized only where needed

## 🔮 Future Extensibility

### Designed for Extension
The codebase includes extension points:

```javascript
// Period calculations ready for month/custom periods
// Future: Add month, custom period calculations here

// Format period range
// Future: Add other period formats here

// Hostel configuration
// Add new properties by extending hostelConfig object
```

### Potential Enhancements
1. **Multiple Period Types**: Month, quarter, custom date ranges
2. **Data Persistence**: LocalStorage or database integration
3. **Export Functionality**: PDF reports, Excel exports
4. **Advanced Filtering**: By source, status, date range
5. **Comparative Analytics**: Year-over-year, hostel benchmarking
6. **API Integration**: Direct CloudBeds API connection
7. **Multi-language Support**: i18n for Spanish/other languages
8. **Nest Pass Analytics**: Deeper insights into long-term stay patterns
9. **Cancellation Analysis**: Reasons and patterns for cancellations

## 📚 Key Files Reference

### Main Component
- `src/components/HostelAnalytics.jsx` - Main orchestrator component (428 lines)

### Dashboard Components
- `src/components/Dashboard/HostelCard.jsx` - Individual hostel metric cards
- `src/components/Dashboard/LatestWeekSummary.jsx` - Latest week grid display
- `src/components/Dashboard/PerformanceTable.jsx` - Weekly comparison table (largest component, 239 lines)
- `src/components/Dashboard/MetricChange.jsx` - Trend indicator component (↑↓)
- `src/components/Dashboard/ExcelStyleView.jsx` - Excel-style row-based table view (NEW)
- `src/components/Dashboard/NestedHostelTable.jsx` - Nested hostel metrics table for Excel view (NEW)

### Data Input Components
- `src/components/DataInput/DataInputPanel.jsx` - Complete data input section (file + paste)
- `src/components/DataInput/WeekSelector.jsx` - Week date selection
- `src/components/DataInput/WarningBanner.jsx` - Warning display component

### Charts & Analysis
- `src/components/Charts/ReservationChart.jsx` - Chart visualization (line/bar)
- `src/components/Analysis/AIAnalysisPanel.jsx` - AI analysis display

### Utilities
- `src/utils/index.js` - Centralized utility exports
- `src/utils/dateUtils.js` - Date calculations and week detection
- `src/utils/formatters.js` - Currency and price formatting
- `src/utils/metricsCalculator.js` - Core business logic (ADR, metrics)
- `src/utils/dataParser.js` - Data parsing and transformation

### Configuration
- `src/config/hostelConfig.js` - Hostel configuration (IDs and names)
- `vite.config.js` - Dev server (port 3333)
- `tailwind.config.js` - Custom colors and animations
- `package.json` - Dependencies and scripts

### Styling
- `src/index.css` - Tailwind setup + custom styles

### Documentation
- `README.md` - User-facing documentation
- `documentation.md` - Setup and configuration guide
- `CLAUDE.md` - This file (AI development guide)
- `REFACTORING_STEPS.md` - Refactoring progress tracking

## 🎓 Learning Resources

### Libraries Used
- **React 18**: https://react.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **Recharts**: https://recharts.org/
- **SheetJS (XLSX)**: https://docs.sheetjs.com/
- **Lucide React**: https://lucide.dev/

### Patterns Applied
- React Hooks patterns
- Functional programming (map, filter, reduce)
- Progressive enhancement
- Mobile-first responsive design
- DRY (Don't Repeat Yourself)

## 📞 Questions & Context

### Business Context: Nests Hostels
This dashboard is built specifically for **Nests Hostels**, a Spanish hostel chain operating multiple properties across Spain. Understanding the business context is crucial:

- **Target Users**: Hostel operators and management
- **Primary Language**: Spanish (though app is currently English)
- **Data Source**: CloudBeds (property management system)
- **Use Case**: Weekly direct booking performance tracking
- **Decision Making**: Week-over-week trends inform pricing and marketing
- **Nest Pass**: Long-term stay program (7+ nights) is a key revenue driver
- **Monthly Stays**: 28+ night bookings are high-value guests

### For User Clarifications
When unclear about requirements, ask about:
1. **Hostel Business Context**: How do operators use this data?
2. **CloudBeds Workflow**: What's the typical export/analysis flow?
3. **Metric Definitions**: Confirm ADR, lead time, cancellation tracking, Nest Pass criteria
4. **UI/UX Preferences**: Desktop vs mobile priority, data density
5. **Simplicity vs Features**: Always err on side of simplicity

### Common Tasks
- **Adding Hostels**: Update `hostelConfig` with ID and name
- **Changing Metrics**: Modify `calculateHostelMetrics()`
- **Adjusting Periods**: Extend `dateConfig` and period functions
- **Styling Updates**: Use Tailwind classes, maintain color scheme
- **New Features**: Follow existing patterns, maintain comments
- **Nest Pass Thresholds**: Currently 7+ for Nest Pass, 28+ for Monthly (hardcoded in calculateHostelMetrics)

## 🆕 Recent Updates

### Nest Pass & Monthly Metrics
- **Added**: Nest Pass (7+ nights) and Monthly (28+ nights) tracking
- **Display**: Shows count and percentage in cards and table
- **Totals Row**: New TOTAL NEST PASS row in comparison table
- **Color Scheme**: Purple highlighting for Nest Pass metrics
- **Formula**:
  - Nest Pass = valid bookings with nights >= 7
  - Monthly = Nest Pass bookings with nights >= 28
  - Percentage = (nestPass / valid) * 100

### Excel-Style Table View & Nests Brand Redesign
- **Added**: NEW Excel-style row-based table view (weeks as rows, hostels nested)
- **Toggle**: Switch between Dashboard and Excel views with button toggle
- **Layout**: 15 columns total (PERIODO + 6 GA + EUR + TOP TRAFFIC + 4 Funnel + CONVERSIONES + 2 manual)
- **Nested Table**: NestedHostelTable component displays per-hostel metrics (Count, Revenue, Nest Pass)
- **Sticky Column**: PERIODO column stays visible during horizontal scroll
- **Placeholder Columns**: Gray columns marked for future data integration (GA, funnel, manual entries)
- **Brand Redesign**: Nests brand colors and fonts applied throughout
  - **Colors**: Teal (#53CED1), Green (#53D195), Yellow (#E5B853), Red (#D15653)
  - **Fonts**: Poppins (headings), Montserrat (body text)
  - **Gradients**: Teal gradient backgrounds for headers
  - **No box-shadows**: Clean, minimal design with borders only
- **Components Created**:
  - `ExcelStyleView.jsx` - Main Excel-style table container
  - `NestedHostelTable.jsx` - Reusable nested table for hostel metrics
- **Files Modified**:
  - `tailwind.config.js` - Added Nests brand colors, fonts, and gradients
  - `src/index.css` - Added Google Fonts import
  - `HostelAnalytics.jsx` - Added view mode toggle and conditional rendering

### Revenue Enrichment & Tax Breakdown
- **Problem**: CloudBeds `getReservations` (plural) endpoint returns `balance` field showing €0 for paid bookings
- **Solution**: Manual enrichment via individual `getReservation` (singular) API calls
- **Added Features**:
  - **enrichBookingRevenue()** utility in `cloudbedsApi.js` - Fetches detailed revenue from singular endpoint
  - **Enrichment State Management** in `HostelAnalytics.jsx` - Tracks progress, handles cancellation
  - **Enrich Revenue Button** in `APIFetchPanel.jsx` - Appears after API fetch, triggers background enrichment
  - **Real-time Progress Display** - Shows booking-by-booking enrichment progress with cancel option
  - **Rate Limiting** - 100ms delay between calls (configurable via `VITE_CLOUDBEDS_API_DELAY_MS`), respects CloudBeds 10 requests/second limit
  - **Tax Breakdown Toggle** - Shows/hides tax breakdown across all views
  - **formatRevenue()** utility - Formats revenue with optional tax display: `€52.73 + (€6.92 taxes)`
  - **Updated Metrics Calculator** - Calculates `netRevenue` and `totalTaxes` from enriched bookings
- **Data Flow**:
  1. User fetches bookings via API (fast, but `balance` = €0)
  2. Bookings stored with `reservation` ID, `total` = null
  3. User clicks "Enrich Revenue Data"
  4. Sequential API calls to `getReservation` extract: `total`, `netPrice` (subTotal), `taxes` (taxesFees)
  5. State updated incrementally as each booking enriches
  6. Tax breakdown toggle appears when enriched data available
- **Pattern: Hybrid Fast + Slow Enrichment**:
  - Fast initial fetch (getReservations plural) for quick display
  - Optional slow enrichment (getReservation singular) for detailed analysis
  - User controls when to pay the time cost
- **Components Updated**:
  - `HostelCard.jsx` - Uses `formatRevenue` with tax breakdown support
  - `PerformanceTable.jsx` - Revenue display with tax breakdown
  - `ExcelStyleView.jsx` - EUR column with tax breakdown
  - `NestedHostelTable.jsx` - Revenue cells with tax breakdown
- **Files Created**:
  - `docs/plans/revenue-enrichment-implementation-plan.md` - 14-step implementation guide
- **Files Modified**:
  - `src/utils/cloudbedsApi.js` - Added enrichment API function
  - `src/utils/formatters.js` - Added `formatRevenue()` utility
  - `src/utils/metricsCalculator.js` - Added netRevenue and totalTaxes calculation
  - `src/components/HostelAnalytics.jsx` - Enrichment state, toggle, helper functions
  - `src/components/DataInput/APIFetchPanel.jsx` - Enrichment button and progress UI
  - All dashboard view components - Tax breakdown support

### Database Persistence with Supabase (Optional)
- **Added**: Complete Supabase PostgreSQL database layer for data persistence
- **Architecture**: Option A: DB-First, State-Cached
  - Database is the source of truth
  - State (weeklyData) is a cache for fast rendering
  - Perfect for future backend integration
- **Tables Created**:
  - `hostels` - Master table for 11 properties
  - `reservations` - Hybrid structured + JSONB model for all booking data
  - `weekly_reports` - Pre-calculated metrics for fast loading
  - `data_imports` - Complete audit trail
- **Auto-Calculated Fields**: `lead_time`, `is_nest_pass`, `is_monthly`, `is_cancelled` (via database triggers)
- **Integration Points**:
  - **API Fetch**: Auto-saves to DB after successful fetch
  - **Excel Upload**: Auto-saves after processing
  - **Paste**: Auto-saves after parsing
  - **Revenue Enrichment**: Updates DB with enriched revenue immediately
- **UI Components**:
  - Database status indicator (green/red/blue badges)
  - "Load Last 3 Months from Database" button
  - Real-time loading states and error messages
  - Current data info display (weeks, hostels, auto-save status)
- **Key Functions**:
  - `saveReservationsToDatabase()` - Save bookings with audit trail
  - `loadReservationsFromDatabase()` - Load and populate state from DB
  - `updateReservationRevenue()` - Update enriched revenue
- **Files Created**:
  - `supabase/migrations/001_initial_schema.sql` - Complete database schema (500+ lines)
  - `src/config/supabaseClient.js` - Supabase client configuration
  - `src/utils/dbUtils.js` - Database utility functions (20+ functions)
  - `docs/database-schema.md` - Schema documentation
  - `docs/database-setup-guide.md` - Step-by-step setup
  - `docs/database-integration-guide.md` - Integration instructions
  - `docs/database-api-reference.md` - Complete API reference
  - `docs/database-testing-guide.md` - Testing instructions
- **Files Modified**:
  - `HostelAnalytics.jsx` - Database state, helper functions, integration with all data sources
  - `DataInputPanel.jsx` - Database operations UI panel
  - `.env.example` - Added Supabase environment variables
  - `package.json` - Added `@supabase/supabase-js` dependency
- **Pattern: Background Auto-Save**:
  - All data sources save to DB automatically in background
  - Non-blocking: State updates immediately, DB saves async
  - User sees data instantly, persistence happens behind the scenes
  - Graceful degradation: App works without DB configuration
- **Future-Ready**:
  - When backend is added, it can write directly to DB
  - Frontend will load from DB (same code, no changes needed)
  - Date range selection ready for implementation
  - Multi-user support built-in (RLS policies configured)

---

## 🎯 Remember: Core Principles

**This codebase prioritizes:**
1. **Simplicity over complexity** - Keep it simple, readable, maintainable
2. **Pragmatic over theoretical** - Real functionality trumps ideology
3. **Low coupling** - Independent, reusable components
4. **Proper encapsulation** - Components manage their own concerns
5. **Incremental improvements** - Small changes, not rewrites
6. **Well-commented code** - Explain the "why", not just the "what"
7. **DRY principles** - Reuse, don't repeat
8. **No over-engineering** - Solve today's problems, not tomorrow's
9. **Business value** - Every change should serve Nests Hostels operators

**When interacting with users:**
- **Ask before coding** - Confirm requirements and approach first
- **Explain trade-offs** - Present options with reasoning
- **Avoid "best practices" claims** - Context matters more than dogma
- **Provide examples** - Show practical, commented code
- **Be pragmatic** - Choose what works, not what's "pure"

**When in doubt:**
- Choose simpler solution
- Add comments, not complexity
- Ask before major changes
- Keep existing patterns
- Measure before optimizing
- Explain your reasoning

**Last Updated**: December 31, 2024
**Maintained By**: Claude AI in collaboration with Artur Mamedov
**Built For**: Nests Hostels (Spanish hostel chain)
