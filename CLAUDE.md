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

## 🏗️ Architecture Patterns

### Component Structure
- **Monolithic Component Design**: Single `HostelAnalytics.jsx` component manages all state and logic
- **React Hooks**: Extensive use of `useState` and `useCallback` for state management
- **No External State Management**: All state is local to the component (no Redux/Context)

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
- [ ] Responsive design maintained
- [ ] Data processing pipeline intact
- [ ] Week detection and validation working
- [ ] Metrics calculations accurate (including Nest Pass/Monthly)
- [ ] UI color coding consistent
- [ ] Error handling present

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

### Primary Component
- `src/components/HostelAnalytics.jsx` - Main component (1100+ lines)

### Styling
- `src/index.css` - Tailwind setup + custom styles
- `tailwind.config.js` - Custom colors and animations

### Configuration
- `vite.config.js` - Dev server (port 3333)
- `package.json` - Dependencies and scripts

### Documentation
- `README.md` - User-facing documentation
- `documentation.md` - Setup and configuration guide
- `CLAUDE.md` - This file (AI development guide)

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

### For User Clarifications
When unclear about requirements, ask about:
1. **Hostel Business Context**: How do operators use this data?
2. **CloudBeds Workflow**: What's the typical export/analysis flow?
3. **Metric Definitions**: Confirm ADR, lead time, cancellation tracking, Nest Pass criteria
4. **UI/UX Preferences**: Desktop vs mobile priority, data density

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

---

**Remember**: This codebase prioritizes clarity, maintainability, and well-documented code. Always preserve and enhance comments, follow DRY principles, and maintain the established patterns.

**Last Updated**: December 30, 2024
**Maintained By**: Claude AI in collaboration with Artur Mamedov
