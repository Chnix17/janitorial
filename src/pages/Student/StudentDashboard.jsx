import React from 'react';

export default function StudentDashboard() {
  return (
    <div>
      <h1 className="cc-page-title">Student Dashboard</h1>
      <p className="cc-page-subtitle">
        View your assigned rooms and submit daily inspection reports.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 16 }}>
        <div className="cc-card cc-card-pad">
          <div style={{ fontWeight: 900 }}>My Assignments</div>
          <div style={{ marginTop: 6, color: 'var(--cc-muted)' }}>See rooms and inspection dates.</div>
        </div>
        <div className="cc-card cc-card-pad">
          <div style={{ fontWeight: 900 }}>Submit Inspection</div>
          <div style={{ marginTop: 6, color: 'var(--cc-muted)' }}>Checklist + remarks + condition.</div>
        </div>
        <div className="cc-card cc-card-pad">
          <div style={{ fontWeight: 900 }}>My Activity</div>
          <div style={{ marginTop: 6, color: 'var(--cc-muted)' }}>Active / Inactive tracking by date.</div>
        </div>
      </div>
    </div>
  );
}
