# Fix Admin Reports PDF - Implementation Plan

## Overview
Improve the Inspection Report PDF to be cleaner and more detailed by showing:
- Overall condition for each room
- All checklist items (up to 3) visible at once
- Remarks, Inspected By, and Date columns

## Current State Analysis

### Current PDF Format (`generateInspectionReport` in [`reportExporter.js`](src/utils/reportExporter.js:82-166))
```
| Room | Checklist 1 | Checklist 2 | Checklist 3 |
|------|-------------|-------------|-------------|
| 101  | OK          | Not OK      | OK          |
```

**Issues:**
- Does NOT show overall condition per room
- Does NOT show remarks
- Does NOT show inspected by
- Does NOT show inspection date
- Limited detail for administrators

## Required Changes

### 1. Update PDF Export Function

**File:** [`src/utils/reportExporter.js`](src/utils/reportExporter.js:82-166)

**New PDF Format:**
```
| Room | Condition | Checklist 1 | Checklist 2 | Checklist 3 | Remarks | Inspected By | Date |
|------|-----------|-------------|-------------|-------------|---------|--------------|------|
| 101  | Good      | OK          | Not OK      | OK          | Clean   | John Doe     | Jan 15|
```

**Changes:**
1. Add "Condition" column with color coding:
   - Excellent = Green
   - Good = Blue
   - Fair = Amber
   - Poor = Red

2. Add "Remarks" column for room-specific notes

3. Add "Inspected By" column (student name)

4. Add "Date" column (inspection completion date)

5. Better column widths for readability

### 2. Updated Column Structure

| Column | Width | Description |
|--------|-------|-------------|
| Room | 18mm | Room number (bold) |
| Condition | 22mm | Overall condition badge |
| Checklist 1 | 20mm | First checklist status |
| Checklist 2 | 20mm | Second checklist status |
| Checklist 3 | 20mm | Third checklist status |
| Remarks | 35mm | Room remarks (truncated) |
| Inspected By | 30mm | Student name |
| Date | 22mm | Inspection date |

### 3. Condition Color Coding for PDF

```javascript
const conditionColors = {
  excellent: { fill: [16, 185, 129], text: [255, 255, 255] },  // Green
  good: { fill: [59, 130, 246], text: [255, 255, 255] },       // Blue
  fair: { fill: [245, 158, 11], text: [255, 255, 255] },       // Amber
  poor: { fill: [239, 68, 68], text: [255, 255, 255] },        // Red
  pending: { fill: [241, 245, 249], text: [71, 85, 105] }      // Gray
};
```

### 4. Checklist Status Color Coding (Already Implemented)
- OK = Green background
- Not OK = Red background
- Pending = Gray background

## Implementation Steps

### Step 1: Update `generateInspectionReport` function

**Current code (lines 82-166):**
```javascript
export const generateInspectionReport = (reportData, filters = {}, options = {}) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  // ... existing header code ...
  
  // Current table structure - MISSING condition, remarks, inspected_by, date
  const head = [['Room', ...checklistNames]];
  const body = inspections.map((insp) => {
    // ... existing mapping ...
    return [String(insp.room_number || ''), ...cells];
  });
  // ... rest of function ...
};
```

**New code structure:**
```javascript
export const generateInspectionReport = (reportData, filters = {}, options = {}) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  
  // Header section
  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129);
  doc.text('Inspection Report', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Period: ${reportData.summary.date_range}`, 14, 30);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);
  doc.text(`Filters: ${getFilterSummary(filters)}`, 14, 42);
  
  // Summary stats
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(`Total Inspections: ${reportData.summary.total_inspections}`, 14, 52);
  doc.text(`Excellent: ${reportData.summary.excellent}`, 70, 52);
  doc.text(`Good: ${reportData.summary.good}`, 110, 52);
  doc.text(`Fair: ${reportData.summary.fair}`, 145, 52);
  doc.text(`Poor: ${reportData.summary.poor}`, 180, 52);
  
  // Legend
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Condition: Excellent / Good / Fair / Poor', 14, 60);
  doc.text('Checklist: OK / Not OK / Pending', 14, 66);
  
  // Build table data
  const inspections = Array.isArray(reportData?.inspections) ? reportData.inspections : [];
  
  const head = [
    ['Room', 'Condition', 'Chairs', 'Tables', 'Lights', 'Remarks', 'Inspected By', 'Date']
  ];
  
  const body = inspections.map((insp) => {
    const checklist = Array.isArray(insp.checklist) ? insp.checklist : [];
    
    // Get checklist statuses (up to 3)
    const checklist1 = checklist[0]?.operation_is_functional;
    const checklist2 = checklist[1]?.operation_is_functional;
    const checklist3 = checklist[2]?.operation_is_functional;
    
    const formatStatus = (val) => {
      const n = val === null || val === undefined ? null : Number(val);
      if (n === 1) return 'OK';
      if (n === 0) return 'Not OK';
      return 'Pending';
    };
    
    return [
      insp.room_number || '',
      insp.assigned_status || 'N/A',
      formatStatus(checklist1),
      formatStatus(checklist2),
      formatStatus(checklist3),
      insp.assigned_remarks || '-',
      insp.inspected_by || '-',
      formatDate(insp.inspected_date)
    ];
  });
  
  // Table with color coding
  autoTable(doc, {
    startY: 74,
    head,
    body,
    theme: 'grid',
    headStyles: { 
      fillColor: [16, 185, 129], 
      textColor: 255, 
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: { 
      fontSize: 7, 
      cellPadding: 2, 
      valign: 'middle',
      overflow: 'linebreak'
    },
    columnStyles: {
      0: { cellWidth: 18, fontStyle: 'bold' },   // Room
      1: { cellWidth: 22 },                      // Condition
      2: { cellWidth: 20 },                      // Checklist 1
      3: { cellWidth: 20 },                      // Checklist 2
      4: { cellWidth: 20 },                      // Checklist 3
      5: { cellWidth: 35 },                      // Remarks
      6: { cellWidth: 30 },                      // Inspected By
      7: { cellWidth: 22 },                      // Date
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      
      // Condition column color coding
      if (data.column.index === 1) {
        const condition = String(data.cell.text?.[0] || '').toLowerCase();
        const colors = {
          excellent: { fill: [16, 185, 129], text: [255, 255, 255] },
          good: { fill: [59, 130, 246], text: [255, 255, 255] },
          fair: { fill: [245, 158, 11], text: [255, 255, 255] },
          poor: { fill: [239, 68, 68], text: [255, 255, 255] },
        };
        if (colors[condition]) {
          data.cell.styles.fillColor = colors[condition].fill;
          data.cell.styles.textColor = colors[condition].text;
          data.cell.styles.fontStyle = 'bold';
        }
      }
      
      // Checklist columns color coding
      if (data.column.index >= 2 && data.column.index <= 4) {
        const val = String(data.cell.text?.[0] || '').toLowerCase();
        if (val === 'ok') {
          data.cell.styles.fillColor = [236, 253, 245];
          data.cell.styles.textColor = [4, 120, 87];
        } else if (val === 'not ok') {
          data.cell.styles.fillColor = [255, 241, 242];
          data.cell.styles.textColor = [190, 18, 60];
        } else {
          data.cell.styles.fillColor = [248, 250, 252];
          data.cell.styles.textColor = [71, 85, 105];
        }
      }
    },
    margin: { left: 14, right: 14 },
  });
  
  finalizePdf(doc, `inspection-report-${Date.now()}.pdf`, options);
};
```

### Step 2: Dynamic Checklist Names

For dynamic checklist names (instead of hardcoded "Chairs", "Tables", "Lights"), update the head row:

```javascript
// Get unique checklist names from all inspections
const checklistNames = Array.from(
  new Set(
    inspections
      .flatMap((i) => (Array.isArray(i.checklist) ? i.checklist : []))
      .map((c) => String(c.checklist_name || '').trim())
      .filter(Boolean)
  )
).sort((a, b) => a.localeCompare(b));

// Build header with first 3 checklist names
const checklistHeaders = checklistNames.slice(0, 3);
const head = [
  ['Room', 'Condition', ...checklistHeaders, 'Remarks', 'Inspected By', 'Date']
];
```

## File Changes Summary

| File | Change |
|------|--------|
| [`src/utils/reportExporter.js`](src/utils/reportExporter.js:82-166) | Update `generateInspectionReport` function to include condition, remarks, inspected_by, date columns with proper color coding |

## PDF Output Example

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              INSPECTION REPORT                                       │
│  Period: Jan 1, 2026 - Jan 31, 2026                                                  │
│  Generated: Jan 15, 2026, 10:30 AM                                                   │
│  Filters: Building: MSSS | Floor: 1st floor                                         │
│                                                                                      │
│  Total Inspections: 25  Excellent: 10  Good: 8  Fair: 5  Poor: 2                    │
│  Condition: Excellent / Good / Fair / Poor | Checklist: OK / Not OK / Pending      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ Room   │ Condition │ Chairs │ Tables │ Lights │ Remarks       │ Inspected By │ Date   │
├────────┼───────────┼────────┼────────┼────────┼────────────────┼──────────────┼────────┤
│ 101    │ Excellent │ OK     │ OK     │ OK     │ Clean          │ John Doe     │ Jan 15 │
│ 102    │ Good      │ OK      │ Not OK │ OK     │ Table damaged  │ Jane Smith   │ Jan 15 │
│ 103    │ Fair      │ OK      │ OK     │ Pending │ Lights need.. │ Mike Brown   │ Jan 14 │
│ ...    │ ...       │ ...     │ ...    │ ...    │ ...            │ ...          │ ...    │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Next Steps

1. Switch to Code mode to implement the PDF export changes
2. Test the PDF output with sample data
3. Verify color coding works correctly
4. Check responsiveness with different checklist configurations
