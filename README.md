# React CloudBeds Bookings Analytics

A powerful analytics dashboard for hostel chains to track weekly direct booking performance, analyze conversion trends, and gain AI-powered insights from CloudBeds reservation data.

## 🏨 Overview

This React-based dashboard transforms your CloudBeds reservation exports into actionable insights, helping hostel operators understand booking patterns, track week-over-week performance, and identify growth opportunities across their property portfolio.

## ✨ Features

### 📊 **Multi-Format Data Input**
- **Excel File Upload**: Drag & drop CloudBeds .xlsx exports
- **Copy & Paste**: Lightning-fast data entry from CloudBeds web interface
- **CloudBeds API**: Direct API integration for real-time data fetching ✨ NEW
- **Revenue Enrichment**: Get detailed revenue breakdown with tax information ✨ NEW
- **Auto-Detection**: Automatically identifies hostels by name or CloudBeds property ID
- **Multi-Hostel Support**: Handle multiple properties simultaneously

### 📈 **Comprehensive Analytics**
- **Week-over-Week Comparisons**: Track reservation trends with percentage changes
- **Average Daily Rate (ADR)**: Calculate and monitor pricing performance
- **Lead Time Analysis**: Understand booking advance patterns
- **Cancellation Tracking**: Monitor cancellation rates as conversion metrics

### 📱 **Modern Dashboard**
- **Responsive Design**: Optimized for desktop (4 columns) and mobile (2 columns)
- **Interactive Charts**: Toggle between line and bar charts
- **Real-Time Updates**: Instant calculations and trend analysis
- **Clean Table View**: Hostels as rows, weeks as columns with totals

### 📊 **Excel-Style Table View** ✨ NEW
- **Row-Based Layout**: Weeks as rows, matching Excel spreadsheet format
- **View Toggle**: Switch between Dashboard and Excel views instantly
- **Nested Hostel Metrics**: Per-hostel breakdown (Count, Revenue, Nest Pass) in one column
- **Sticky Period Column**: Week dates stay visible during horizontal scroll
- **15 Columns Total**: Current data + placeholder columns for future integrations (GA, funnel metrics)
- **Nests Brand Design**: Professional teal, green, and yellow color scheme
- **Future-Ready**: Built for Google Analytics, funnel tracking, and manual entry integration

### 🤖 **AI-Powered Insights**
- **Trend Analysis**: Understand why performance changes week to week
- **Pattern Recognition**: Identify seasonal and booking behavior patterns
- **Actionable Recommendations**: Get specific suggestions for improvement

## 🚀 Quick Start

### Prerequisites
- Node.js (latest stable version recommended)
- npm package manager
- CloudBeds account with reservation export access

### Installation

```bash
# Clone the repository
git clone https://github.com/arturmamedov1993/react-cloudbeds-bookings-analytics.git

# Navigate to project directory
cd react-cloudbeds-bookings-analytics

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

## 📋 Usage Guide

### Method 1: File Upload
1. **Export from CloudBeds**: Go to Reports → Reservations → Export as Excel
2. **Filter for Direct Bookings**: Ensure "Sitio web o motor de reservas" source is selected
3. **Upload Files**: Drag and drop .xlsx files (one per hostel) into the dashboard
4. **Analyze**: View instant analytics and trends

### Method 2: Copy & Paste (Fastest)
1. **In CloudBeds**: Navigate to your reservations table
2. **Select & Copy**: Select table data and copy (Ctrl+C/Cmd+C)
3. **In Dashboard**: Switch to "Copy & Paste" mode
4. **Paste Data**: Paste into the text area (supports HTML or plain text)
5. **Process**: Click "Process Data" for instant analysis

### Method 3: CloudBeds API (Automated) ✨ NEW
**Real-time data fetching directly from CloudBeds API**

#### Setup (One-Time)
1. **Get API Credentials**:
   - Log in to CloudBeds Dashboard
   - Go to **Connect** → **API Access**
   - Create a new API key with **Read** permissions for Reservations
   - Copy your API key

2. **Configure Environment**:
   - Create a `.env` file in the project root
   - Add your credentials:
   ```bash
   VITE_CLOUDBEDS_API_KEY=your_api_key_here
   VITE_CLOUDBEDS_API_BASE_URL=https://api.cloudbeds.com/api/v1.3
   VITE_CLOUDBEDS_API_TIMEOUT=10000
   ```
   - **Restart the dev server** after adding `.env` (required for Vite)

3. **Security**:
   - `.env` is automatically ignored by git
   - Never commit API keys to version control
   - API key is only stored locally

#### Usage
1. **In Dashboard**: Switch to "CloudBeds API" mode
2. **Select Week**: Choose the week you want to analyze
3. **Choose Fetch Mode**:
   - **All Hostels**: Fetch all 11 properties at once (~25-35 seconds)
     - Real-time progress display with per-hostel status
     - Success/failure tracking for each property
     - Automatic retry delay to avoid rate limiting
   - **Single Hostel**: Fetch one property quickly (~2-3 seconds)
     - Select from dropdown
     - Instant results
4. **Duplicate Warning**: If week already has data, a modal will warn you:
   - Shows existing hostels and booking counts
   - Explains smart merge behavior
   - Cancel or Continue & Merge
5. **Smart Merge**: Fetched data updates only the selected hostels, preserving others
6. **View Results**: Data appears in dashboard instantly

#### Features
- ✅ **Real-time Progress**: Visual progress bar with timing for multi-hostel fetches
- ✅ **Error Handling**: Clear error messages with troubleshooting hints
- ✅ **Smart Merge**: Prevents accidental data overwriting
- ✅ **Duplicate Detection**: Warns before overwriting existing week data
- ✅ **Automatic Filtering**: Only fetches direct bookings (Website/Booking Engine source)
- ✅ **Rate Limiting**: Built-in delays to respect API limits

#### Revenue Enrichment & Tax Breakdown ✨ NEW
**Get detailed revenue breakdown with tax information**

The CloudBeds `getReservations` (plural) endpoint returns a `balance` field that shows €0 for paid bookings. To get accurate revenue data with tax breakdown, use the **Revenue Enrichment** feature:

**How It Works:**
1. **Fetch Data First**: Use CloudBeds API to fetch booking data (as described above)
2. **Enrich Revenue Button**: After fetching, an "Enrich Revenue Data" button appears in the API panel
3. **Background Processing**: Click to start enrichment
   - Makes individual API calls to `getReservation` (singular) for each booking
   - Extracts: `total` (with taxes), `netPrice` (subtotal), `taxes` (tax amount)
   - 10-second delay between calls to respect CloudBeds rate limits
   - Real-time progress display with cancel option
   - Expected time: ~17 minutes for 100 bookings
4. **Tax Breakdown Toggle**: Once enrichment completes, a "Show Tax Breakdown" toggle appears
5. **Enhanced Display**: When enabled, revenue shows as: `€52.73 + (€6.92 taxes)` instead of just `€59.65`

**Benefits:**
- ✅ **Accurate Revenue**: Get actual revenue amounts (not balance)
- ✅ **Tax Transparency**: See net revenue vs. taxes separately
- ✅ **All Views Updated**: Tax breakdown works in Dashboard, Excel, and Table views
- ✅ **Optional Display**: Toggle on/off as needed without re-fetching
- ✅ **Cancellable**: Stop enrichment anytime if taking too long

**Note:** This is a manual process due to API rate limits. Enrich only when you need detailed tax breakdown analysis.

#### Troubleshooting
| Issue | Solution |
|-------|----------|
| "API key not found" | Check `.env` file exists and restart dev server |
| "Invalid API key" | Verify key in CloudBeds Connect → API Access |
| "Request timeout" | Check internet connection, API may be slow |
| "Network error" | Verify internet connectivity |
| "Property ID not found" | Check `hostelConfig.js` has correct CloudBeds property IDs |

### Supported Data Sources
- **CloudBeds Reservation Reports**: Direct booking data with full reservation details
- **Required Fields**: Booking date, check-in, check-out, nights, price, status, source
- **Auto-Detection**: Works with hostel names (Flamingo, Puerto, Duque) or CloudBeds property IDs

## 🏗️ Technical Stack

### Core Technologies
- **React 18**: Modern UI framework with hooks
- **Tailwind CSS**: Utility-first styling
- **Recharts**: Interactive charts and visualizations
- **SheetJS (XLSX)**: Excel file processing
- **Lucide React**: Modern icon library

### Key Dependencies
- **Math Operations**: Automatic ADR and lead time calculations
- **Date Processing**: Excel date parsing and week range generation
- **AI Integration**: Claude API for intelligent analysis
- **Responsive Design**: Mobile-first responsive grid system

### Browser Compatibility
- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge (latest versions)

## 📊 Data Processing

### Metrics Calculated
- **Total Reservations**: All bookings including cancellations (conversion tracking)
- **Valid Reservations**: Confirmed and checked-out bookings
- **Cancellation Rate**: Percentage of cancelled vs total bookings
- **Average Daily Rate (ADR)**: Total revenue ÷ total nights (excluding cancellations)
- **Average Lead Time**: Days between booking and check-in dates

### Data Filtering
- **Source Filter**: Only "Sitio web o motor de reservas" (direct bookings)
- **Status Tracking**: Separates confirmed, checked-out, and cancelled reservations
- **Week Grouping**: Groups reservations by booking date ranges

## 🔧 Development

### Available Scripts
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

### Project Structure
```
src/
├── components/
│   ├── HostelAnalytics.jsx      # Main orchestrator component
│   ├── Dashboard/               # Dashboard UI components
│   │   ├── HostelCard.jsx
│   │   ├── LatestWeekSummary.jsx
│   │   ├── PerformanceTable.jsx
│   │   └── MetricChange.jsx
│   ├── DataInput/               # Data input components
│   │   ├── DataInputPanel.jsx
│   │   ├── APIFetchPanel.jsx    # NEW: CloudBeds API UI
│   │   ├── WeekSelector.jsx
│   │   └── WarningBanner.jsx
│   ├── Charts/                  # Chart components
│   │   └── ReservationChart.jsx
│   └── Analysis/                # AI analysis components
│       └── AIAnalysisPanel.jsx
├── utils/                       # Utility functions
│   ├── index.js                 # Centralized exports
│   ├── cloudbedsApi.js          # NEW: CloudBeds API integration
│   ├── dateUtils.js             # Date calculations
│   ├── formatters.js            # Currency formatting
│   ├── metricsCalculator.js     # Business logic
│   └── dataParser.js            # Data transformation
├── config/
│   └── hostelConfig.js          # Hostel configuration
├── index.css                    # Tailwind setup
└── main.jsx                     # App entry point
```

## 🚀 Deployment

### Production Build
```bash
npm run build
```
This creates an optimized build in the `dist/` directory ready for deployment.

### Deployment Options
- **Netlify**: Connect your GitHub repository for automatic deployments
- **Vercel**: Perfect for React applications with zero configuration
- **Static Hosting**: Deploy the `dist/` folder to any static hosting service

## 🤝 Contributing

This project is primarily designed for internal use at hostel chains but welcomes contributions from hospitality tech enthusiasts.

### Getting Started
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and patterns
- Test with real CloudBeds data when possible
- Ensure mobile responsiveness
- Update documentation for new features

## 📈 Roadmap

### Planned Features
- **Advanced Cancellation Analytics**: Detailed cancellation reason tracking
- **Revenue Forecasting**: Predictive analytics for future performance
- **Multi-Language Support**: Spanish and other language interfaces
- **API Integrations**: Direct CloudBeds API connectivity
- **Custom Date Ranges**: Flexible reporting periods beyond weekly

### Performance Optimizations
- **Data Caching**: Store processed data for faster subsequent loads
- **Chart Performance**: Optimize rendering for large datasets
- **Mobile UX**: Enhanced mobile interface and gestures

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Author

**Artur Mamedov** - [arturmamedov1993@gmail.com](mailto:arturmamedov1993@gmail.com)

## 🙏 Acknowledgments

- Built for hostel chain operators who need actionable booking insights
- Inspired by the need for fast, reliable CloudBeds data analysis
- Thanks to the React and open-source community for excellent libraries

## 📞 Support

For questions, issues, or feature requests:
- **Email**: arturmamedov1993@gmail.com
- **Issues**: Use GitHub Issues for bug reports and feature requests
- **CloudBeds Integration**: Ensure your data exports include all required fields

---

*Transform your CloudBeds data into actionable insights. Track performance, understand trends, and grow your hostel business with data-driven decisions.*