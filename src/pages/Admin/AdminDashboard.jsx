import React from 'react';

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="cc-page-title">Admin Dashboard</h1>
      <p className="cc-page-subtitle">
        Manage users, assignments, inspections, and reports.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 16 }}>
        <div className="cc-card cc-card-pad">
          <div style={{ fontWeight: 900 }}>Users</div>
          <div style={{ marginTop: 6, color: 'var(--cc-muted)' }}>Create/update/deactivate accounts.</div>
        </div>
        <div className="cc-card cc-card-pad">
          <div style={{ fontWeight: 900 }}>Assignments</div>
          <div style={{ marginTop: 6, color: 'var(--cc-muted)' }}>Assign rooms and schedules.</div>
        </div>
        <div className="cc-card cc-card-pad">
          <div style={{ fontWeight: 900 }}>Reports</div>
          <div style={{ marginTop: 6, color: 'var(--cc-muted)' }}>Monitor activity by date.</div>
        </div>
      </div>
    </div>
  );
}
