# Admin Reports Page Implementation Plan

## Overview
Create a detailed admin reports page that shows:
1. **Student assignments per floor/building** - Which students are assigned where
2. **Inspection/Checklist data** - Room conditions reported by students (OK/Not OK)
3. **Overall condition summary** - Per room/floor/building condition statistics
4. **Date range filtering** - Filter all reports by date range for historical data
5. **PDF export** - Download detailed reports

## Current State Analysis

### Existing Components
- **Routes**: `/admin/reports` placeholder exists in [`AppRoutes.jsx`](src/AppRoutes.jsx:39)
- **Sidebar**: No reports link yet (needs to be added)
- **API**: Multiple inspection-related endpoints exist in [`api/admin.php`](api/admin.php:1683)
- **Database**: [`janitorial.sql`](janitorial.sql) shows inspection tracking tables

### Relevant Database Tables
```sql
tbluser (user_id, full_name, username, role_id, is_active)
tblbuilding (building_id, building_name)
tblfloor (floor_id, floor_name)
tblbuildingfloor (floorbuilding_id, building_id, floor_id)
tblroom (room_id, room_number, room_building_floor_id)
tblassigned (assigned_id, assigned_user_id, assigned_floor_building_id, assigned_status_enum)
tblassignedstatus (assigned_status_id, assigned_id, room_id, assigned_status, assigned_remarks, completion_date)
tblroomchecklist (checklist_id, checklist_name, checklist_room_id)
tblassignedoperation (operation_id, operation_is_functional, operation_room_id, operation_checklist_id, operation_updated_at)
```

## Requirements

### 1. Report Page Features

#### Section A: Student Assignments Report
- Students assigned to each floor/building combination
- Student count per floor/building
- Individual student names with assignment status
- Assignment date range
- Filter by building, floor, student, status

#### Section B: Inspection/Checklist Report
- Room conditions reported by students
- Overall condition ratings (excellent/good/fair/poor)
- Functional vs non-functional checklist items
- **Date range filtering** - Filter inspections by date range
- Inspection history summary

#### Section C: Overall Condition Summary
- Condition distribution per floor/building
- **Historical trends** - Show condition changes over time
- Room count per condition rating
- Overall rating per floor/building

### 2. Filters & Controls

| Filter | Description | Report Types |
|--------|-------------|--------------|
| Building | Select specific building | All |
| Floor | Select specific floor (dependent on building) | All |
| Student | Filter by student name | Assignments, Inspections |
| Status | Active/Inactive/All | Assignments |
| **Date Range** | **Start and end date** | **Inspections, Conditions** |
| Search | Text search across all fields | All |

### 3. PDF Download
- Professional PDF formatting
- Report title and generation date
- Applied filters displayed
- Summary statistics section
- Detailed tables with all data
- Date range covered in report

## Implementation Plan

### Phase 1: Backend API Development

#### 1.1 Add new API endpoints in [`api/admin.php`](api/admin.php)

**Endpoint 1: `getStudentAssignmentReport`**
```php
public function getStudentAssignmentReport($data) {
    // Filters:
    // - building_id (optional)
    // - floor_id (optional)
    // - assigned_user_id (optional)
    // - assigned_status_enum (optional)
    // 
    // Returns:
    // - building_name, floor_name
    // - student_count
    // - student_details (array with user_id, full_name, assignment status)
    // - assignment date range
}
```

**Endpoint 2: `getInspectionSummaryReport`**
```php
public function getInspectionSummaryReport($data) {
    // Filters:
    // - building_id (optional)
    // - floor_id (optional)
    // - assigned_user_id (optional)
    // - date_from (optional) - NEW: Filter inspections from this date
    // - date_to (optional) - NEW: Filter inspections until this date
    //
    // Returns:
    // - building_name, floor_name, room_number
    // - condition ratings
    // - functional/non-functional checklist items
    // - inspection dates and student
}
```

**Endpoint 3: `getOverallConditionReport`**
```php
public function getOverallConditionReport($data) {
    // Filters:
    // - building_id (optional)
    // - floor_id (optional)
    // - date_from (optional)
    // - date_to (optional)
    //
    // Returns:
    // - building_name, floor_name
    // - total_rooms
    // - condition_breakdown (excellent/good/fair/poor counts and percentages)
    // - historical_comparison (compared to previous period)
    // - overall_rating
    // - last_inspection_date
}
```

**Endpoint 4: `getConditionTrendsReport`** (NEW - for historical data)
```php
public function getConditionTrendsReport($data) {
    // For showing condition trends over time
    // 
    // Filters:
    // - building_id (optional)
    // - floor_id (optional)
    // - date_from (required)
    // - date_to (required)
    // - group_by (day/week/month)
    //
    // Returns:
    // - period
    // - excellent, good, fair, poor counts
    // - total inspections
    // - trend direction (improving/declining/stable)
}
```

#### 1.2 API Response Structure

**Student Assignment Report Response:**
```json
{
  "success": true,
  "data": {
    "filters_applied": {
      "building_id": 1,
      "floor_id": null,
      "user_id": null,
      "status": "active"
    },
    "summary": {
      "total_buildings": 1,
      "total_floors": 2,
      "total_students": 5,
      "total_assignments": 6
    },
    "assignments": [
      {
        "floorbuilding_id": 1,
        "building_id": 1,
        "building_name": "MSSS",
        "floor_id": 1,
        "floor_name": "1st floor",
        "student_count": 2,
        "students": [
          {"user_id": 2, "full_name": "John Doe", "status": "active", "start_date": "2026-01-01", "end_date": "2026-12-31"},
          {"user_id": 3, "full_name": "Jane Smith", "status": "active", "start_date": "2026-01-01", "end_date": "2026-12-31"}
        ]
      }
    ]
  }
}
```

**Inspection Summary Report Response (with Date Range):**
```json
{
  "success": true,
  "data": {
    "filters_applied": {
      "date_from": "2026-01-01",
      "date_to": "2026-01-31",
      "building_id": 1,
      "floor_id": null
    },
    "summary": {
      "total_inspections": 150,
      "date_range": "Jan 1, 2026 - Jan 31, 2026",
      "excellent": 50,
      "good": 60,
      "fair": 30,
      "poor": 10,
      "functional_items": 140,
      "non_functional_items": 10,
      "inspections_per_day_avg": 4.8
    },
    "inspections": [
      {
        "building_name": "MSSS",
        "floor_name": "1st floor",
        "room_number": "101",
        "condition": "good",
        "checklist_items": [
          {"name": "Chairs", "functional": true},
          {"name": "Tables", "functional": false},
          {"name": "Lights", "functional": true}
        ],
        "inspected_by": "John Doe",
        "inspected_date": "2026-01-15"
      }
    ]
  }
}
```

**Condition Trends Report Response (NEW):**
```json
{
  "success": true,
  "data": {
    "filters_applied": {
      "date_from": "2026-01-01",
      "date_to": "2026-01-31",
      "group_by": "week"
    },
    "summary": {
      "period": "Jan 1, 2026 - Jan 31, 2026",
      "total_inspections": 150,
      "overall_trend": "improving"
    },
    "trends": [
      {
        "period": "Week 1",
        "date_range": "Jan 1 - Jan 7",
        "excellent": 10,
        "good": 15,
        "fair": 8,
        "poor": 2,
        "total": 35,
        "condition_score": 78.6
      },
      {
        "period": "Week 2",
        "date_range": "Jan 8 - Jan 14",
        "excellent": 12,
        "good": 18,
        "fair": 5,
        "poor": 1,
        "total": 36,
        "condition_score": 83.3
      }
    ]
  }
}
```

### Phase 2: Frontend Component Development

#### 2.1 Create [`AdminReports.jsx`](src/pages/Admin/AdminReports.jsx)

**State Variables:**
```javascript
const [reportType, setReportType] = useState('assignments'); // 'assignments' | 'inspections' | 'conditions' | 'trends'
const [assignmentData, setAssignmentData] = useState([]);
const [inspectionData, setInspectionData] = useState([]);
const [conditionData, setConditionData] = useState([]);
const [trendData, setTrendData] = useState([]);
const [loading, setLoading] = useState(false);

// Filters
const [buildingFilter, setBuildingFilter] = useState('');
const [floorFilter, setFloorFilter] = useState('');
const [studentFilter, setStudentFilter] = useState('');
const [statusFilter, setStatusFilter] = useState('');
const [dateRange, setDateRange] = useState({ from: '', to: '' });
const [groupBy, setGroupBy] = useState('week'); // for trends
const [searchQuery, setSearchQuery] = useState('');
```

**UI Sections:**

1. **Report Type Selector Tabs**
   - Student Assignments
   - Inspection Details
   - Overall Conditions
   - **Condition Trends (NEW)** - Historical trends over time

2. **Filter Controls Row**
   ```
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────────────┐
   │ Building ▼  │ │ Floor ▼    │ │ Status ▼   │ │ Student    │ │ Date Range          │
   └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └──────────────────────┘
   ```
   
   For Trends Report:
   ```
   ┌─────────────┐ ┌─────────────┐ ┌──────────────────────┐ ┌─────────────┐
   │ Building ▼  │ │ Floor ▼    │ │ Date Range          │ │ Group By ▼  │
   └─────────────┘ └─────────────┘ └──────────────────────┘ └─────────────┘
   ```

3. **Summary Cards**
   - **Assignments:** Total Students, Total Buildings, Total Assignments
   - **Inspections:** Total Inspections, Condition Breakdown, Functional Items
   - **Conditions:** Total Rooms, Overall Rating, Last Updated
   - **Trends:** Period Covered, Total Inspections, Trend Direction (↑/↓/→)

4. **Data Tables**

   **Assignments Table:**
   - Building | Floor | Student Count | Students (expandable) | Assignment Period

   **Inspections Table:**
   - Building | Floor | Room | Condition | Items | Inspected By | Date

   **Conditions Table:**
   - Building | Floor | Rooms | Excellent% | Good% | Fair% | Poor% | Rating

   **Trends Table (NEW):**
   - Period | Date Range | Excellent | Good | Fair | Poor | Total | Score | Trend

5. **Export Section**
   - PDF Download button with dropdown for report type
   - "Export Current View" button

#### 2.2 Update [`Sidebar.jsx`](src/components/Sidebar.jsx)

```jsx
<NavItem to="/admin/reports" icon={Icon.Clipboard}>
  Reports
</NavItem>
```

#### 2.3 Update [`AppRoutes.jsx`](src/AppRoutes.jsx)

```jsx
import AdminReports from './pages/Admin/AdminReports';
<Route path="/admin/reports" element={<AdminReports />} />
```

### Phase 3: PDF Export Implementation

#### 3.1 Install PDF Library
```bash
npm install jspdf jspdf-autotable
```

#### 3.2 Create PDF Export Functions

**File:** `src/utils/reportExporter.js`

All PDF functions include:
- Report title
- Generation timestamp
- Applied filters displayed
- Summary statistics
- Detailed data table

```javascript
// Export with date range in filename and content
export const generateInspectionReport = (reportData, filters) => {
  const doc = new jsPDF();
  const dateFrom = filters.date_from || 'all';
  const dateTo = filters.date_to || 'now';
  
  doc.setFontSize(18);
  doc.text('Inspection Report', 14, 22);
  doc.setFontSize(10);
  doc.text(`Period: ${reportData.summary.date_range}`, 14, 30);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);
  
  // Filters applied
  doc.text(`Filters: ${getFilterSummary(filters)}`, 14, 42);
  
  // Summary
  doc.setFontSize(12);
  doc.text('Summary', 14, 52);
  doc.setFontSize(10);
  doc.text(`Total Inspections: ${reportData.summary.total_inspections}`, 14, 60);
  doc.text(`Excellent: ${reportData.summary.excellent}`, 14, 66);
  doc.text(`Good: ${reportData.summary.good}`, 14, 72);
  doc.text(`Fair: ${reportData.summary.fair}`, 14, 78);
  doc.text(`Poor: ${reportData.summary.poor}`, 14, 84);
  
  // Table
  doc.autoTable({
    startY: 90,
    head: [['Building', 'Floor', 'Room', 'Condition', 'Inspected By', 'Date']],
    body: reportData.inspections.map(item => [
      item.building_name,
      item.floor_name,
      item.room_number,
      item.condition,
      item.inspected_by,
      item.inspected_date
    ]),
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129] },
  });
  
  doc.save(`inspection-report-${dateFrom}-to-${dateTo}.pdf`);
};

// Export Trends Report
export const generateTrendsReport = (reportData, filters) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Condition Trends Report', 14, 22);
  doc.setFontSize(10);
  doc.text(`Period: ${reportData.summary.period}`, 14, 30);
  doc.text(`Trend Direction: ${reportData.summary.overall_trend}`, 14, 36);
  
  // Trend chart data in table form
  doc.autoTable({
    startY: 45,
    head: [['Period', 'Date Range', 'Excellent', 'Good', 'Fair', 'Poor', 'Total', 'Score', 'Trend']],
    body: reportData.trends.map(item => [
      item.period,
      item.date_range,
      item.excellent,
      item.good,
      item.fair,
      item.poor,
      item.total,
      item.condition_score.toFixed(1),
      item.trend
    ]),
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129] },
  });
  
  doc.save(`trends-report-${filters.date_from}-to-${filters.date_to}.pdf`);
};
```

### Phase 4: Testing

- [ ] Verify API returns correct data with date filters
- [ ] Test page loads without errors
- [ ] Test report type switching
- [ ] Test all filter combinations
- [ ] Test date range filtering (valid dates, invalid dates, empty range)
- [ ] Test trends grouping (day/week/month)
- [ ] Test search functionality
- [ ] Test PDF download for each report type with date range
- [ ] Verify responsive design
- [ ] Test empty state displays correctly
- [ ] Test loading state during data fetch
- [ ] Verify condition ratings match actual data
- [ ] Test trend calculations (improving/declining/stable)

## File Changes Summary

| File | Action |
|------|--------|
| `api/admin.php` | Add `getStudentAssignmentReport`, `getInspectionSummaryReport`, `getOverallConditionReport`, `getConditionTrendsReport` |
| `src/pages/Admin/AdminReports.jsx` | Create new component with 4 report views and date range filtering |
| `src/components/Sidebar.jsx` | Add Reports nav item |
| `src/AppRoutes.jsx` | Connect route to component |
| `src/utils/reportExporter.js` | Create PDF export utilities with date range support |
| `package.json` | Add jspdf and jspdf-autotable dependencies |

## SQL Query Examples (Updated with Date Range)

**Inspection Summary with Date Range:**
```sql
SELECT 
    b.building_name,
    f.floor_name,
    r.room_number,
    s.assigned_status,
    COUNT(o.operation_id) as total_checklist_items,
    SUM(CASE WHEN o.operation_is_functional = 1 THEN 1 ELSE 0 END) as functional_items,
    SUM(CASE WHEN o.operation_is_functional = 0 THEN 1 ELSE 0 END) as non_functional_items,
    u.full_name as inspected_by,
    s.completion_date as inspected_date
FROM tblassignedstatus s
JOIN tblroom r ON r.room_id = s.room_id
JOIN tblbuildingfloor bf ON bf.floorbuilding_id = r.room_building_floor_id
JOIN tblbuilding b ON b.building_id = bf.building_id
JOIN tblfloor f ON f.floor_id = bf.floor_id
JOIN tbluser u ON u.user_id = s.assigned_reported_by
LEFT JOIN tblassignedoperation o ON o.operation_room_id = r.room_id
WHERE s.completion_date BETWEEN ? AND ?
GROUP BY s.assigned_status_id
ORDER BY b.building_name ASC, f.floor_name ASC, r.room_number ASC
```

**Condition Trends Query (Weekly):**
```sql
SELECT 
    YEARWEEK(s.completion_date, 1) as week_key,
    DATE_FORMAT(MIN(s.completion_date), '%b %d') as week_start,
    DATE_FORMAT(MAX(s.completion_date), '%b %d') as week_end,
    SUM(CASE WHEN s.assigned_status = 'excellent' THEN 1 ELSE 0 END) as excellent,
    SUM(CASE WHEN s.assigned_status = 'good' THEN 1 ELSE 0 END) as good,
    SUM(CASE WHEN s.assigned_status = 'fair' THEN 1 ELSE 0 END) as fair,
    SUM(CASE WHEN s.assigned_status = 'poor' THEN 1 ELSE 0 END) as poor,
    COUNT(*) as total
FROM tblassignedstatus s
WHERE s.completion_date BETWEEN ? AND ?
GROUP BY YEARWEEK(s.completion_date, 1)
ORDER BY week_key ASC
```

## UI Mockup - Reports Page with Date Range

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Admin Reports                                                   [Download PDF] │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Assignments] [Inspection Details] [Overall Conditions] [Condition Trends]  │
├─────────────────────────────────────────────────────────────────────────────┤
│ Filters:                                                                    │
│ ┌─────────────┐ ┌─────────────┐ ┌────────────────────┐ ┌─────────────────┐ │
│ │ Building ▼  │ │ Floor ▼     │ │ Date From  ───► To │ │ Search...       │ │
│ └─────────────┘ └─────────────┘ └────────────────────┘ └─────────────────┘ │
│ For Trends:  ┌─────────────┐                           ┌─────────────┐     │
│             │ Group By ▼  │                           │             │     │
│             └─────────────┘                           └─────────────┘     │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────────────────┐  │
│ │ Period Covered: Jan 1, 2026 - Jan 31, 2026    Trend: ↑ Improving       │  │
│ ├───────────────────────────────────────────────────────────────────────┤  │
│ │ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐  │  │
│ │ │ Week 1    │ │ Week 2    │ │ Week 3    │ │ Week 4    │ │ Total     │  │  │
│ │ │ 35 rooms  │ │ 36 rooms  │ │ 38 rooms  │ │ 41 rooms  │ │ 150 rooms │  │  │
│ │ │ Score: 79 │ │ Score: 83 │ │ Score: 85 │ │ Score: 88 │ │           │  │  │
│ │ │ → Stable  │ │ ↑ +4      │ │ ↑ +2      │ │ ↑ +3      │ │           │  │  │
│ │ └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘  │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│ Period      │ Date Range  │ Excellent │ Good │ Fair │ Poor │ Total │ Score │
│─────────────┼─────────────┼───────────┼──────┼──────┼──────┼───────┼───────│
│ Week 1      │ Jan 1-7     │    10     │  15  │   8  │   2  │   35  │  79   │
│ Week 2      │ Jan 8-14    │    12     │  18  │   5  │   1  │   36  │  83   │
│ Week 3      │ Jan 15-21   │    14     │  16  │   6  │   2  │   38  │  85   │
│ Week 4      │ Jan 22-28    │    14     │  19  │   6  │   2  │   41  │  88   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Questions for Clarification

1. What should be the default date range when the page loads? **(Answered: Current month)**
2. Should the trends report show daily breakdowns for date ranges less than 2 weeks?
3. Do you want to include comparison percentages in the trends (e.g., "Week 2 is +4% better than Week 1")?
4. Is the trend direction calculated based on condition score improvement/decline?
