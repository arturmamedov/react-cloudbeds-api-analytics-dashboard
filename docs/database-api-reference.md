# Database API Reference

Quick reference guide for all database utility functions in `src/utils/dbUtils.js`.

## Import

```javascript
import {
  // Hostels
  getHostels,
  getHostelByCloudbedsId,
  getHostelBySlug,
  upsertHostel,
  seedHostelsFromConfig,

  // Reservations
  saveReservation,
  saveReservations,
  getReservationsByWeek,
  getReservationsByDateRange,
  updateReservationRevenue,

  // Weekly Reports
  saveWeeklyReport,
  saveWeeklyReports,
  getWeeklyReportsByDateRange,
  getAllWeeklyReports,

  // Data Imports
  createDataImport,
  getRecentImports,

  // Transformers
  transformDBReservationToApp,
  transformDBWeeklyReportToApp,
} from './utils/dbUtils';
```

---

## Hostels

### `getHostels()`
Get all active hostels.

**Returns**: `Promise<{success: boolean, data?: Array, error?: string}>`

**Example**:
```javascript
const result = await getHostels();
console.log(result.data); // [{ id, cloudbeds_id, name, slug, ... }]
```

---

### `getHostelByCloudbedsId(cloudbedsId)`
Get hostel by CloudBeds property ID.

**Parameters**:
- `cloudbedsId` (string): CloudBeds ID (e.g., "6733")

**Returns**: `Promise<{success: boolean, data?: Object, error?: string}>`

**Example**:
```javascript
const result = await getHostelByCloudbedsId('6733');
console.log(result.data); // { id, cloudbeds_id: "6733", name: "Flamingo", ... }
```

---

### `getHostelBySlug(slug)`
Get hostel by slug.

**Parameters**:
- `slug` (string): Hostel slug (e.g., "flamingo")

**Returns**: `Promise<{success: boolean, data?: Object, error?: string}>`

**Example**:
```javascript
const result = await getHostelBySlug('flamingo');
console.log(result.data); // { id, slug: "flamingo", name: "Flamingo", ... }
```

---

### `upsertHostel(hostelData)`
Create or update hostel (upsert by `cloudbeds_id`).

**Parameters**:
- `hostelData` (Object):
  - `cloudbedsId` (string): CloudBeds property ID
  - `name` (string): Hostel name
  - `slug` (string, optional): URL slug (auto-generated from name if not provided)
  - `active` (boolean, optional): Is active? (default: true)
  - `metadata` (Object, optional): Custom fields

**Returns**: `Promise<{success: boolean, data?: Object, error?: string}>`

**Example**:
```javascript
const result = await upsertHostel({
  cloudbedsId: '6733',
  name: 'Flamingo',
  slug: 'flamingo',
  active: true,
  metadata: { address: 'Barcelona, Spain' },
});
```

---

### `seedHostelsFromConfig()`
Seed all hostels from `hostelConfig` into database.

**Returns**: `Promise<{success: boolean, data?: Array, error?: string}>`

**Example**:
```javascript
// Run once on app initialization
const result = await seedHostelsFromConfig();
console.log(`Seeded ${result.data.length} hostels`);
```

---

## Reservations

### `saveReservation(reservation, hostelSlug, dataSource)`
Save a single reservation (upsert by `cloudbeds_reservation_id`).

**Parameters**:
- `reservation` (Object): Reservation data from CloudBeds API or Excel
- `hostelSlug` (string): Hostel slug (e.g., "flamingo")
- `dataSource` (string, optional): 'api', 'excel', or 'paste' (default: 'api')

**Returns**: `Promise<{success: boolean, data?: Object, error?: string}>`

**Example**:
```javascript
const result = await saveReservation(
  {
    reservationID: '12345',
    created: '2024-12-01',
    startDate: '2024-12-16',
    endDate: '2024-12-18',
    source: 'Sitio web',
    status: 'confirmed',
    nights: 2,
    guests: 2,
    price: 100.00,
  },
  'flamingo',
  'api'
);
```

---

### `saveReservations(reservations, hostelSlug, dataSource)`
Save multiple reservations in batch (more efficient).

**Parameters**:
- `reservations` (Array): Array of reservation objects
- `hostelSlug` (string): Hostel slug
- `dataSource` (string, optional): 'api', 'excel', or 'paste'

**Returns**: `Promise<{success: boolean, data?: Array, error?: string, stats?: Object}>`

**Example**:
```javascript
const result = await saveReservations(bookings, 'flamingo', 'api');
console.log(`Saved ${result.stats.saved} of ${result.stats.total} reservations`);
```

---

### `getReservationsByWeek(weekStart, weekEnd, hostelSlug)`
Get reservations for a specific week.

**Parameters**:
- `weekStart` (Date): Monday of the week
- `weekEnd` (Date): Sunday of the week
- `hostelSlug` (string, optional): Filter by hostel

**Returns**: `Promise<{success: boolean, data?: Array, error?: string}>`

**Example**:
```javascript
const weekStart = new Date('2024-12-16');
const weekEnd = new Date('2024-12-22');
const result = await getReservationsByWeek(weekStart, weekEnd, 'flamingo');
console.log(result.data); // Array of reservations with hostel info
```

---

### `getReservationsByDateRange(startDate, endDate, filters)`
Get reservations by date range with optional filters.

**Parameters**:
- `startDate` (Date): Start date
- `endDate` (Date): End date
- `filters` (Object, optional):
  - `hostelSlug` (string): Filter by hostel
  - `source` (string): Filter by source (e.g., "Sitio web")
  - `status` (string): Filter by status (e.g., "confirmed")

**Returns**: `Promise<{success: boolean, data?: Array, error?: string}>`

**Example**:
```javascript
const result = await getReservationsByDateRange(
  new Date('2024-12-01'),
  new Date('2024-12-31'),
  { hostelSlug: 'flamingo', source: 'Sitio web' }
);
console.log(result.data); // Filtered reservations
```

---

### `updateReservationRevenue(cloudbedsReservationId, enrichmentData)`
Update reservation with enriched revenue data.

**Parameters**:
- `cloudbedsReservationId` (string): CloudBeds reservation ID
- `enrichmentData` (Object):
  - `total` (number): Total price
  - `netPrice` or `subTotal` (number): Price before taxes
  - `taxes` or `taxesFees` (number): Tax amount

**Returns**: `Promise<{success: boolean, data?: Object, error?: string}>`

**Example**:
```javascript
const result = await updateReservationRevenue('12345', {
  total: 105.50,
  netPrice: 98.00,
  taxes: 7.50,
});
```

---

## Weekly Reports

### `saveWeeklyReport(reportData)`
Save a weekly report (pre-calculated metrics).

**Parameters**:
- `reportData` (Object):
  - `hostelSlug` (string): Hostel slug
  - `weekStart` (string): ISO date (YYYY-MM-DD)
  - `weekEnd` (string): ISO date (YYYY-MM-DD)
  - `weekLabel` (string): Display label (e.g., "16 Dec 2024 - 22 Dec 2024")
  - `metrics` (Object): Output from `calculateHostelMetrics()`
  - `wowChanges` (Object, optional): Week-over-week changes

**Returns**: `Promise<{success: boolean, data?: Object, error?: string}>`

**Example**:
```javascript
const result = await saveWeeklyReport({
  hostelSlug: 'flamingo',
  weekStart: '2024-12-16',
  weekEnd: '2024-12-22',
  weekLabel: '16 Dec 2024 - 22 Dec 2024',
  metrics: {
    count: 50,
    cancelled: [/* ... */],
    valid: [/* ... */],
    revenue: 5000.00,
    adr: 100.00,
    nestPass: [/* ... */],
    monthly: [/* ... */],
    avgLeadTime: 14.5,
  },
  wowChanges: {},
});
```

---

### `saveWeeklyReports(reports)`
Save multiple weekly reports in batch.

**Parameters**:
- `reports` (Array): Array of report objects (see `saveWeeklyReport`)

**Returns**: `Promise<{success: boolean, data?: Array, error?: string}>`

**Example**:
```javascript
const result = await saveWeeklyReports([report1, report2, report3]);
console.log(`Saved ${result.data.length} reports`);
```

---

### `getWeeklyReportsByDateRange(startDate, endDate, hostelSlug)`
Get weekly reports by date range.

**Parameters**:
- `startDate` (Date): Start date
- `endDate` (Date): End date
- `hostelSlug` (string, optional): Filter by hostel

**Returns**: `Promise<{success: boolean, data?: Array, error?: string}>`

**Example**:
```javascript
const result = await getWeeklyReportsByDateRange(
  new Date('2024-12-01'),
  new Date('2024-12-31'),
  'flamingo'
);
console.log(result.data); // Array of weekly reports
```

---

### `getAllWeeklyReports()`
Get all weekly reports (sorted by week_start descending).

**Returns**: `Promise<{success: boolean, data?: Array, error?: string}>`

**Example**:
```javascript
const result = await getAllWeeklyReports();
console.log(result.data); // All weekly reports
```

---

## Data Imports

### `createDataImport(importData)`
Create data import record (audit trail).

**Parameters**:
- `importData` (Object):
  - `importType` (string): 'api', 'excel', or 'paste'
  - `importSource` (string): Filename, API endpoint, etc.
  - `dateFrom` (Date, optional): Start date of data
  - `dateTo` (Date, optional): End date of data
  - `reservationsCount` (number): Number of reservations imported
  - `hostelsAffected` (Array<string>): Array of hostel slugs
  - `status` (string, optional): 'completed', 'processing', 'failed'
  - `errorMessage` (string, optional): Error message if failed
  - `rawFileData` (Object, optional): Raw data for re-processing

**Returns**: `Promise<{success: boolean, data?: Object, error?: string}>`

**Example**:
```javascript
const result = await createDataImport({
  importType: 'api',
  importSource: 'CloudBeds API - getReservations',
  dateFrom: new Date('2024-12-16'),
  dateTo: new Date('2024-12-22'),
  reservationsCount: 250,
  hostelsAffected: ['flamingo', 'puerto', 'arena'],
  status: 'completed',
});
```

---

### `getRecentImports(limit)`
Get recent data imports (sorted by created_at descending).

**Parameters**:
- `limit` (number, optional): Number of imports to fetch (default: 10)

**Returns**: `Promise<{success: boolean, data?: Array, error?: string}>`

**Example**:
```javascript
const result = await getRecentImports(5);
console.log(result.data); // Last 5 imports
```

---

## Transformers

### `transformDBReservationToApp(dbReservation)`
Transform database reservation to app format.

**Parameters**:
- `dbReservation` (Object): Reservation from database

**Returns**: Object in app format

**Example**:
```javascript
const dbReservations = await getReservationsByWeek(/* ... */);
const appReservations = dbReservations.data.map(transformDBReservationToApp);
```

---

### `transformDBWeeklyReportToApp(dbReport)`
Transform database weekly report to app format.

**Parameters**:
- `dbReport` (Object): Weekly report from database

**Returns**: Object in app format

**Example**:
```javascript
const dbReports = await getAllWeeklyReports();
const weeklyData = dbReports.data.map(transformDBWeeklyReportToApp);
setWeeklyData(weeklyData);
```

---

## Response Format

All functions return a consistent response object:

```typescript
{
  success: boolean,      // true if operation succeeded
  data?: any,           // Result data (if success)
  error?: string,       // Error message (if failed)
  stats?: Object        // Additional stats (for batch operations)
}
```

### Example Usage Pattern

```javascript
const result = await getHostels();

if (result.success) {
  console.log('Data:', result.data);
} else {
  console.error('Error:', result.error);
}
```

---

## Common Patterns

### Pattern 1: Save after API fetch
```javascript
const bookings = await fetchFromAPI(/* ... */);
await saveReservations(bookings, 'flamingo', 'api');
```

### Pattern 2: Load and display
```javascript
const result = await getAllWeeklyReports();
if (result.success) {
  const weeklyData = result.data.map(transformDBWeeklyReportToApp);
  setWeeklyData(weeklyData);
}
```

### Pattern 3: Batch save with error handling
```javascript
const results = await Promise.all(
  bookings.map(booking => saveReservation(booking, 'flamingo', 'api'))
);

const errors = results.filter(r => !r.success);
if (errors.length > 0) {
  console.error(`Failed to save ${errors.length} bookings`);
}
```

### Pattern 4: Incremental enrichment
```javascript
for (const booking of bookings) {
  const enrichedData = await fetchDetailedRevenue(booking.id);
  await updateReservationRevenue(booking.id, enrichedData);
}
```

---

## TypeScript Types (Optional)

If you add TypeScript, here are suggested types:

```typescript
interface DbResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  stats?: {
    total?: number;
    saved?: number;
  };
}

interface Hostel {
  id: string;
  cloudbeds_id: string;
  name: string;
  slug: string;
  active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface Reservation {
  id: string;
  cloudbeds_reservation_id: string;
  hostel_id: string;
  booking_date: string;
  checkin_date: string;
  checkout_date: string;
  source: string;
  status: string;
  nights: number;
  guests: number;
  total_price: number;
  net_price: number;
  taxes: number;
  currency: string;
  lead_time: number;
  is_nest_pass: boolean;
  is_monthly: boolean;
  is_cancelled: boolean;
  raw_data: Record<string, any>;
  enrichment_data: Record<string, any>;
  data_source: string;
  imported_at: string;
  enriched_at?: string;
  created_at: string;
  updated_at: string;
}

interface WeeklyReport {
  id: string;
  hostel_id: string;
  week_start: string;
  week_end: string;
  week_label: string;
  total_count: number;
  cancelled_count: number;
  valid_count: number;
  total_revenue: number;
  net_revenue: number;
  total_taxes: number;
  adr: number;
  nest_pass_count: number;
  nest_pass_pct: number;
  monthly_count: number;
  monthly_pct: number;
  avg_lead_time: number;
  wow_changes: Record<string, any>;
  metrics_snapshot: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

---

**Last Updated**: January 16, 2026
**Maintained By**: Claude AI + Artur Mamedov
