# Excel View - User Guide

## 📊 Overview

The **Excel View** is a new table format that displays your weekly booking data in a row-based layout, similar to your Excel tracking spreadsheets. This view is perfect for operators who prefer to see weeks as rows with all metrics displayed horizontally.

### Key Benefits

- ✅ **Familiar Format**: Matches your Excel tracking spreadsheet layout
- ✅ **All Data in One View**: See all weeks and hostels in a single scrollable table
- ✅ **Sticky Period Column**: Week dates stay visible as you scroll horizontally
- ✅ **Nested Hostel Details**: Per-hostel metrics (Count, Revenue, Nest Pass) in one column
- ✅ **Future-Ready**: Placeholder columns for Google Analytics, funnel metrics, and manual entries

---

## 🚀 Getting Started

### Accessing Excel View

1. **Upload or paste your booking data** as usual (Excel file or copy-paste from CloudBeds)
2. **Toggle buttons appear** above the dashboard once data is loaded
3. **Click "Excel View"** button to switch to the Excel-style table

![Toggle Buttons](https://via.placeholder.com/600x100?text=Dashboard+View+|+Excel+View)

### Switching Between Views

- **Dashboard View** (default): Card-based layout with charts and performance tables
- **Excel View**: Row-based table with weeks as rows and metrics as columns

You can switch between views at any time without losing your data.

---

## 📋 Table Structure

### Column Layout (15 columns total)

The Excel view displays data in the following column order:

| Column Group | Columns | Status | Description |
|-------------|---------|--------|-------------|
| **Period** | PERIODO | ✅ Active | Week date range (sticky column) |
| **Google Analytics** | USUARIOS, SESIONES, CONVERSIONS, CONV RT, BOUNCE RATE, AVG Time | 🔲 Placeholder | Future GA integration |
| **Revenue** | EUR | ✅ Active | Total weekly revenue (calculated from bookings) |
| **Traffic** | TOP TRAFICO | 🔲 Placeholder | Future traffic source data |
| **Funnel** | BOOKING ENGINE, ADD TO CART, CHECK-OUT, PURCHASE | 🔲 Placeholder | Future funnel metrics |
| **Hostel Data** | CONVERSIONES POR HOSTAL | ✅ Active | Nested table with per-hostel metrics |
| **Manual** | PICOS/CAÍDAS, TOP 3 países | 🔲 Placeholder | Future manual entry fields |

### Column Descriptions

#### ✅ Active Columns (Calculated from Your Data)

**PERIODO (Period)**
- Displays the week date range (e.g., "15 Dec 2024\n21 Dec 2024")
- Sticky column - stays visible when scrolling horizontally
- Line break between start and end dates for readability

**EUR (Revenue)**
- Total revenue for the week across all hostels
- Green highlight for easy identification
- Calculated from your uploaded booking data
- Format: €X,XXX.XX

**CONVERSIONES POR HOSTAL (Conversions by Hostel)**
- Nested table showing per-hostel breakdown
- Includes:
  - **Hostel name**: All configured hostels in order
  - **Count**: Number of bookings (including zero)
  - **Revenue**: Total revenue (shows "-" if zero bookings)
  - **Nest Pass**: Number of Nest Pass bookings (7+ nights)
- **TOTAL row** at bottom with yellow highlight
- Hostels are listed in configuration order

#### 🔲 Placeholder Columns (Future Features)

These columns show "-" and are reserved for future data integration:

**Google Analytics Metrics**
- USUARIOS: Unique users
- SESIONES: Total sessions
- CONVERSIONS: Conversion events
- CONV RT: Conversion rate
- BOUNCE RATE: Bounce rate percentage
- AVG Time: Average session duration

**Traffic Source**
- TOP TRAFICO: Top traffic sources

**Funnel Metrics**
- BOOKING ENGINE: Funnel stage 1
- ADD TO CART: Funnel stage 2
- CHECK-OUT: Funnel stage 3
- PURCHASE: Funnel stage 4

**Manual Entry Fields**
- PICOS/CAÍDAS: Peaks and drops (manual notes)
- TOP 3 países: Top 3 countries (manual entry)

---

## 🎨 Visual Design

### Color Coding

The Excel view uses the **Nests brand color scheme**:

| Element | Color | Purpose |
|---------|-------|---------|
| Header row | Teal gradient | Main table headers |
| EUR column header | Green | Revenue highlight |
| CONVERSIONES column header | Teal | Hostel data highlight |
| EUR cells | Light green | Revenue data |
| CONVERSIONES cells | Light teal | Hostel data background |
| Placeholder columns | Light gray | Future features |
| TOTAL row | Yellow | Summary row emphasis |
| Active toggle button | Teal | Current view indicator |

### Typography

- **Headings**: Poppins font (bold, clean)
- **Body text**: Montserrat font (readable, professional)
- **No box shadows**: Clean, minimal design with borders only

---

## 💡 How to Use Excel View

### Basic Workflow

1. **Load Your Data**
   - Upload Excel files OR paste CloudBeds data
   - Data processes automatically

2. **Switch to Excel View**
   - Click "Excel View" toggle button
   - Table displays all your weeks

3. **Review Data**
   - Scroll horizontally to see all columns
   - PERIODO column stays visible (sticky)
   - Check EUR totals and per-hostel breakdowns

4. **Generate AI Analysis** (Optional)
   - Click "Generate AI Analysis" button
   - AI analyzes trends and provides insights
   - Same AI analysis available in both views

5. **Switch Back to Dashboard View**
   - Click "Dashboard View" toggle button
   - Returns to card-based layout with charts

### Reading the Nested Hostel Table

Each week's **CONVERSIONES POR HOSTAL** column contains a nested table:

```
┌─────────────┬───────┬──────────────┬───────────┐
│ Hostel      │ Count │ Revenue      │ Nest Pass │
├─────────────┼───────┼──────────────┼───────────┤
│ Flamingo    │ 15    │ 2,125.00 €   │ 3         │
│ Puerto      │ 4     │ 532.00 €     │ 2         │
│ Arena       │ 0     │ -            │ -         │
│ ...         │ ...   │ ...          │ ...       │
├─────────────┼───────┼──────────────┼───────────┤
│ TOTAL       │ 70    │ 6,058.00 €   │ 14        │
└─────────────┴───────┴──────────────┴───────────┘
```

**How to read it:**
- Each row = one hostel
- **Count**: Total bookings (0 if no bookings)
- **Revenue**: Total revenue (shows "-" if no bookings)
- **Nest Pass**: Bookings with 7+ nights (shows "-" if no bookings)
- **TOTAL row**: Sum across all hostels (yellow highlight)

### Comparing Weeks

To compare performance across weeks:

1. **Vertical Scanning**: Compare EUR column values down the rows
2. **Hostel Performance**: Check CONVERSIONES column for each week
3. **TOTAL Rows**: Focus on TOTAL rows in nested tables for quick summaries
4. **Use AI Analysis**: Generate insights for trend explanations

---

## 🔍 Understanding Placeholder Columns

### Why Are There Placeholder Columns?

The Excel view is designed to match your complete Excel tracking spreadsheet format, which includes:
- Google Analytics data (not yet integrated)
- Funnel conversion metrics (future feature)
- Manual entry fields for notes (future feature)

These columns currently show "-" but are reserved for future data integration.

### What Will Change When Data Is Integrated?

When future features are added:
- Google Analytics columns will populate with real GA4 data
- Funnel columns will show conversion funnel metrics
- Manual columns will become editable for adding notes

Your current booking data (EUR and CONVERSIONES) will remain unchanged.

---

## 🎯 Tips & Best Practices

### Navigation Tips

✅ **Use horizontal scroll** - Swipe or drag to see all columns
✅ **Watch the sticky column** - PERIODO stays visible for orientation
✅ **Look for color highlights** - Green (EUR) and Teal (CONVERSIONES) are your calculated data
✅ **Focus on TOTAL rows** - Quick summary of weekly performance

### Workflow Recommendations

**For Quick Revenue Check:**
1. Switch to Excel View
2. Scan EUR column vertically
3. Note weeks with significant changes

**For Hostel-Specific Analysis:**
1. Locate the week of interest
2. Open CONVERSIONES column
3. Review per-hostel breakdown
4. Compare TOTAL row with previous weeks

**For Detailed Analysis:**
1. Use Dashboard View for charts and trends
2. Switch to Excel View for tabular comparison
3. Generate AI Analysis for insights
4. Use both views complementarily

### Printing & Exporting

**Current Status:**
- Excel view is optimized for on-screen viewing
- Horizontal scroll required for all columns
- Print functionality: Use browser print (landscape orientation recommended)

**Future Features:**
- Export to Excel file functionality (planned)
- PDF export with all columns (planned)
- Column visibility toggle (planned)

---

## ❓ Frequently Asked Questions

### General Questions

**Q: Can I edit data in Excel View?**
A: No, Excel View is read-only. Upload new data to update the table.

**Q: Will my data be lost when switching views?**
A: No, your data persists across both views. Toggle freely without losing data.

**Q: Can I hide placeholder columns?**
A: Not currently. Column visibility toggle is a planned future feature.

**Q: Why does the table scroll horizontally?**
A: The table has 15 columns to match your Excel format. Horizontal scroll ensures all columns are visible on any screen size.

### Data Questions

**Q: What does "-" mean in a cell?**
A: Either a placeholder column (future feature) or no data for that hostel (e.g., zero bookings).

**Q: Why are some hostels missing from CONVERSIONES?**
A: All configured hostels appear. Hostels with zero bookings show "0" for Count and "-" for Revenue/Nest Pass.

**Q: How is EUR calculated?**
A: Sum of all valid booking revenue for that week across all hostels (cancellations excluded).

**Q: What's the difference between Count and TOTAL?**
A: Count is per-hostel bookings. TOTAL is the sum of all hostels for that week.

### Technical Questions

**Q: Do I need special software to view Excel View?**
A: No, it works in your web browser. No Excel or additional software needed.

**Q: Can I use Excel View on mobile?**
A: Yes, but horizontal scrolling required. Tablet or desktop recommended for best experience.

**Q: Does Excel View work with copy-paste data?**
A: Yes! Both Excel file upload and copy-paste work with Excel View.

---

## 🆘 Troubleshooting

### Common Issues

**Toggle buttons don't appear**
- ✅ **Solution**: Upload or paste data first. Buttons only appear when data is loaded.

**Excel View shows "No data yet"**
- ✅ **Solution**: Switch to Dashboard View, upload data, then switch back to Excel View.

**Columns are too narrow**
- ℹ️ **This is normal**: Minimum widths ensure data alignment. Use horizontal scroll to see all columns.

**TOTAL row doesn't match expected value**
- ✅ **Check**: Ensure all hostels are included in the calculation
- ✅ **Verify**: Cancellations are excluded from revenue totals

**Sticky column not working**
- ✅ **Solution**: Ensure you're using a modern browser (Chrome, Firefox, Safari, Edge latest versions)
- ✅ **Try**: Refresh the page

---

## 📞 Support & Feedback

### Getting Help

If you encounter issues or have questions:

1. **Check this guide** - Most common questions are answered above
2. **Review CLAUDE.md** - Technical documentation for developers
3. **Contact support** - arturmamedov1993@gmail.com

### Providing Feedback

We'd love to hear your thoughts on Excel View:

- What features would you like to see in placeholder columns?
- How can we improve the table layout or navigation?
- What additional metrics would be helpful?

---

## 🔮 Upcoming Features

### Planned Enhancements

**Phase 1: Data Integration**
- Google Analytics 4 integration for traffic metrics
- Funnel conversion tracking
- Manual entry fields for notes and observations

**Phase 2: Export & Print**
- Export to Excel (.xlsx) file
- PDF export with all columns
- Print-optimized layout

**Phase 3: Customization**
- Column visibility toggle (show/hide columns)
- Sortable columns (click to sort)
- Collapsible nested tables (expand/collapse hostel details)

**Phase 4: Advanced Features**
- Week-to-week comparison arrows (delta indicators)
- Conditional formatting (highlight high/low values)
- Custom date ranges beyond weekly

---

## 📚 Related Documentation

- **README.md** - General project documentation
- **CLAUDE.md** - Technical development guide
- **NESTS_BRAND_COLORS.md** - Brand color reference
- **EXCEL_VIEW_IMPLEMENTATION_STEPS.md** - Technical implementation guide

---

**Version**: 1.0
**Last Updated**: December 31, 2024
**Feature Status**: ✅ Active
**Maintained By**: Nests Hostels Analytics Team

---

*Transform your CloudBeds data into actionable insights. Track performance, understand trends, and grow your hostel business with data-driven decisions.* 🚀
