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
  const doc = new jsPDF({ orientation: 'portrait' });

  const inspections = Array.isArray(reportData?.inspections) ? reportData.inspections : [];
  const checklistNames = Array.from(
    new Set(
      inspections
        .flatMap((i) => (Array.isArray(i.checklist) ? i.checklist : []))
        .map((c) => String(c.checklist_name || '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  // Header
  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129);
  doc.text('Inspection Report', 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Period: ${reportData.summary.date_range || 'N/A'}`, 14, 30);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);
  doc.text(`Filters: ${getFilterSummary(filters)}`, 14, 42);



  // Legend
  doc.setFontSize(8);
  doc.setTextColor(100);
  
  // Helper functions
  const formatStatus = (val) => {
    const n = val === null || val === undefined ? null : Number(val);
    if (n === 1) return '✓ OK';
    if (n === 0) return '✗ Not OK';
    return '- Pending';
  };

  const conditionColors = {
    excellent: { fill: [16, 185, 129], text: [255, 255, 255] },
    good: { fill: [59, 130, 246], text: [255, 255, 255] },
    fair: { fill: [245, 158, 11], text: [255, 255, 255] },
    poor: { fill: [239, 68, 68], text: [255, 255, 255] },
  };

  const statusTextColors = {
    '✓ OK': [4, 120, 87],
    '✗ Not OK': [190, 18, 60],
    '- Pending': [100, 100, 100],
  };

  let currentY = 90;
  const pageHeight = 280;
  const cardPadding = 4;

  // Render each inspection as a card
  inspections.forEach((insp, index) => {
    const checklist = Array.isArray(insp.checklist) ? insp.checklist : [];
    const activeChecklists = checklist.filter(c => c.operation_is_functional !== null);
    const pendingCount = checklist.length - activeChecklists.length;

    // Calculate card height
    const checklistRows = Math.ceil(checklist.length / 2);
    const hasRemarks = insp.assigned_remarks && insp.assigned_remarks.trim();
    const cardHeight = 20 + (checklistRows * 6) + (hasRemarks ? 10 : 0);

    // Check page break
    if (currentY + cardHeight > pageHeight) {
      doc.addPage();
      currentY = 20;
    }

    // Card border (no colored header)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(200, 200, 200);
    doc.rect(14, currentY, 182, cardHeight, 'FD');

    // Card header (no background color, just text)
    const condition = String(insp.assigned_status || 'N/A').toLowerCase();
    const headerText = `#${index + 1}  Room ${insp.room_number || 'N/A'} • ${condition.toUpperCase()}`;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text(headerText, 18, currentY + 8);

    // Date and Inspector (right-aligned)
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    const dateStr = formatDate(insp.inspected_date);
    const inspectorStr = insp.inspected_by || '-';
    const rightText = `${dateStr} • ${inspectorStr}`;
    const rightTextWidth = doc.getTextWidth(rightText);
    doc.text(rightText, 192 - rightTextWidth, currentY + 8);

    // Checklist items - 2 column layout
    let checklistY = currentY + 18;
    doc.setFontSize(8);

    for (let i = 0; i < checklist.length; i += 2) {
      const leftItem = checklist[i];
      const rightItem = checklist[i + 1];

      // Left column
      if (leftItem) {
        const status = formatStatus(leftItem.operation_is_functional);
        const statusColor = statusTextColors[status] || [100, 100, 100];
        doc.setTextColor(71, 85, 105);
        doc.text(`${leftItem.checklist_name}:`, 18, checklistY);
        doc.setTextColor(...statusColor);
        doc.text(status, 50, checklistY);
      }

      // Right column
      if (rightItem) {
        const status = formatStatus(rightItem.operation_is_functional);
        const statusColor = statusTextColors[status] || [100, 100, 100];
        doc.setTextColor(71, 85, 105);
        doc.text(`${rightItem.checklist_name}:`, 100, checklistY);
        doc.setTextColor(...statusColor);
        doc.text(status, 132, checklistY);
      }

      checklistY += 6;
    }

    // Pending count if applicable
    if (pendingCount > 0) {
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      doc.text(`(${pendingCount} pending)`, 18, checklistY);
      checklistY += 4;
    }

    // Remarks
    if (hasRemarks) {
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.setFont(undefined, 'italic');
      doc.text(`Remarks: ${insp.assigned_remarks}`, 18, checklistY + 4);
      doc.setFont(undefined, 'normal');
    }

    // Separator line
    if (index < inspections.length - 1) {
      doc.setDrawColor(226, 232, 240);
      doc.line(14, currentY + cardHeight, 196, currentY + cardHeight);
    }

    currentY += cardHeight + cardPadding;
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
