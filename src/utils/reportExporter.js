import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getFilterSummary = (filters) => {
  const parts = [];
  if (filters.buildingName) parts.push(`Building: ${filters.buildingName}`);
  if (filters.floorName) parts.push(`Floor: ${filters.floorName}`);
  if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom || 'beginning';
    const to = filters.dateTo || 'now';
    parts.push(`Date: ${from} to ${to}`);
  }
  if (filters.status && filters.status !== 'all') parts.push(`Status: ${filters.status}`);
  return parts.length > 0 ? parts.join(' | ') : 'None';
};

const finalizePdf = (doc, filename, options = {}) => {
  const mode = options?.mode || 'download';
  const safeFilename = filename || `report-${Date.now()}.pdf`;

  if (mode === 'open') {
    const url = doc.output('bloburl');
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  doc.save(safeFilename);
};

// Export Student Assignment Report
export const generateAssignmentReport = (reportData, filters = {}, options = {}) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129);
  doc.text('Student Assignment Report', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
  
  doc.setTextColor(100);
  doc.text(`Filters: ${getFilterSummary(filters)}`, 14, 36);
  
  // Summary
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Summary', 14, 46);
  doc.setFontSize(10);
  doc.text(`Total Buildings: ${reportData.summary.total_buildings}`, 14, 54);
  doc.text(`Total Floors: ${reportData.summary.total_floors}`, 14, 60);
  doc.text(`Total Students: ${reportData.summary.total_students}`, 14, 66);
  doc.text(`Total Assignments: ${reportData.summary.total_assignments}`, 14, 72);
  
  const tableData = reportData.assignments.map(item => [
    item.building_name,
    item.floor_name,
    item.student_count,
    item.student_names || 'No students'
  ]);
  
  autoTable(doc, {
    startY: 80,
    head: [['Building', 'Floor', 'Student Count', 'Students']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    styles: { fontSize: 9 },
  });

  finalizePdf(doc, `student-assignment-report-${Date.now()}.pdf`, options);
};

// Export Inspection Summary Report
export const generateInspectionReport = (reportData, filters = {}, options = {}) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  
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
  doc.text(`Total Inspections: ${reportData.summary.total_inspections || 0}`, 14, 52);
  doc.text(`Excellent: ${reportData.summary.excellent || 0}`, 70, 52);
  doc.text(`Good: ${reportData.summary.good || 0}`, 110, 52);
  doc.text(`Fair: ${reportData.summary.fair || 0}`, 145, 52);
  doc.text(`Poor: ${reportData.summary.poor || 0}`, 180, 52);
  
  // Legend
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Condition: Excellent / Good / Fair / Poor | Checklist: OK / Not OK / Pending', 14, 60);
  
  const inspections = Array.isArray(reportData?.inspections) ? reportData.inspections : [];
  
  // Get unique checklist names from all inspections (limit to 3)
  const checklistNames = Array.from(
    new Set(
      inspections
        .flatMap((i) => (Array.isArray(i.checklist) ? i.checklist : []))
        .map((c) => String(c.checklist_name || '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b)).slice(0, 3);
  
  // Helper to format checklist status
  const formatStatus = (val) => {
    const n = val === null || val === undefined ? null : Number(val);
    if (n === 1) return 'OK';
    if (n === 0) return 'Not OK';
    return 'Pending';
  };
  
  // Build table header and body
  const head = [['Room', 'Condition', ...checklistNames, 'Remarks', 'Inspected By', 'Date']];
  
  const body = inspections.map((insp) => {
    const checklist = Array.isArray(insp.checklist) ? insp.checklist : [];
    const checklistStatus = checklistNames.map((name) => {
      const item = checklist.find((c) => String(c.checklist_name || '').trim() === name);
      return formatStatus(item?.operation_is_functional);
    });
    
    return [
      String(insp.room_number || ''),
      String(insp.assigned_status || 'N/A').toUpperCase(),
      ...checklistStatus,
      insp.assigned_remarks || '-',
      insp.inspected_by || '-',
      formatDate(insp.inspected_date)
    ];
  });
  
  // Color definitions
  const conditionColors = {
    excellent: { fill: [16, 185, 129], text: [255, 255, 255] },
    good: { fill: [59, 130, 246], text: [255, 255, 255] },
    fair: { fill: [245, 158, 11], text: [255, 255, 255] },
    poor: { fill: [239, 68, 68], text: [255, 255, 255] },
  };
  
  const okFill = [236, 253, 245];
  const noFill = [255, 241, 242];
  const pendingFill = [248, 250, 252];
  const okText = [4, 120, 87];
  const noText = [190, 18, 60];
  const pendingText = [71, 85, 105];
  
  // Dynamic column widths
  const checklistCount = checklistNames.length;
  const colStyles = {
    0: { cellWidth: 18, fontStyle: 'bold' },
    1: { cellWidth: 24 },
    [2 + checklistCount]: { cellWidth: 35 },
    [3 + checklistCount]: { cellWidth: 28 },
    [4 + checklistCount]: { cellWidth: 22 },
  };
  
  autoTable(doc, {
    startY: 68,
    head,
    body,
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2, valign: 'middle', overflow: 'linebreak' },
    columnStyles: colStyles,
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      
      // Condition column color coding
      if (data.column.index === 1) {
        const condition = String(data.cell.text?.[0] || '').toLowerCase();
        if (conditionColors[condition]) {
          data.cell.styles.fillColor = conditionColors[condition].fill;
          data.cell.styles.textColor = conditionColors[condition].text;
          data.cell.styles.fontStyle = 'bold';
        }
      }
      
      // Checklist columns color coding (columns 2 to 2+checklistCount-1)
      if (data.column.index >= 2 && data.column.index < 2 + checklistCount) {
        const val = String(data.cell.text?.[0] || '').toLowerCase();
        if (val === 'ok') {
          data.cell.styles.fillColor = okFill;
          data.cell.styles.textColor = okText;
        } else if (val === 'not ok') {
          data.cell.styles.fillColor = noFill;
          data.cell.styles.textColor = noText;
        } else {
          data.cell.styles.fillColor = pendingFill;
          data.cell.styles.textColor = pendingText;
        }
      }
    },
    margin: { left: 14, right: 14 },
  });
  
  finalizePdf(doc, `inspection-report-${Date.now()}.pdf`, options);
};

// Export Overall Conditions Report
export const generateConditionsReport = (reportData, filters = {}, options = {}) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129);
  doc.text('Overall Conditions Report', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
  doc.text(`Filters: ${getFilterSummary(filters)}`, 14, 36);
  
  // Table
  const tableData = reportData.conditions.map(item => [
    item.building_name,
    item.floor_name,
    item.total_rooms,
    item.total_ratings,
    `${item.excellent_pct}%`,
    `${item.good_pct}%`,
    `${item.fair_pct}%`,
    `${item.poor_pct}%`,
    item.overall_rating,
    formatDate(item.last_inspection_date)
  ]);
  
  autoTable(doc, {
    startY: 45,
    head: [['Building', 'Floor', 'Rooms', 'Ratings', 'Excellent', 'Good', 'Fair', 'Poor', 'Rating', 'Last Inspection']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    styles: { fontSize: 8 },
  });

  finalizePdf(doc, `conditions-report-${Date.now()}.pdf`, options);
};

// Export Condition Trends Report
export const generateTrendsReport = (reportData, filters = {}, options = {}) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129);
  doc.text('Condition Trends Report', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Period: ${reportData.summary.period}`, 14, 30);
  doc.text(`Grouped By: ${reportData.summary.group_by}`, 14, 36);
  doc.text(`Total Inspections: ${reportData.summary.total_inspections}`, 14, 42);
  
  // Overall trend
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Overall Trend:', 14, 52);
  const trendText = reportData.summary.overall_trend;
  const trendColor = {
    'improving': [16, 185, 129],
    'good': [16, 185, 129],
    'stable': [245, 158, 11],
    'declining': [239, 68, 68],
    'average': [245, 158, 11],
    'needs_attention': [239, 68, 68]
  }[trendText] || [100, 100, 100];
  
  doc.setTextColor(...trendColor);
  doc.setFontSize(11);
  doc.text(trendText.toUpperCase(), 60, 52);
  
  // Table
  const tableData = reportData.trends.map(item => [
    item.period,
    item.date_range,
    item.excellent,
    item.good,
    item.fair,
    item.poor,
    item.total,
    item.condition_score.toFixed(1),
    item.trend
  ]);
  
  autoTable(doc, {
    startY: 60,
    head: [['Period', 'Date Range', 'Excellent', 'Good', 'Fair', 'Poor', 'Total', 'Score', 'Trend']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    styles: { fontSize: 9 },
  });

  finalizePdf(doc, `trends-report-${Date.now()}.pdf`, options);
};
