import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './appShell.css';

export default function Sidebar({ title, homePath }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const linkClassName = ({ isActive }) => (isActive ? 'cc-nav-link cc-nav-link-active' : 'cc-nav-link');

  return (
    <aside className="cc-sidebar">
      <div className="cc-brand">
        <div className="cc-brand-title">CleanCheck PH</div>
        <div className="cc-brand-sub">{title}</div>
      </div>

      <nav className="cc-nav">
        <NavLink className={linkClassName} to={homePath} end>
          Dashboard
        </NavLink>
        {user?.role === 'admin' ? (
          <>
            <NavLink className={linkClassName} to="/admin/users">Users</NavLink>
            <NavLink className={linkClassName} to="/admin/assignments">Assignments</NavLink>
            <NavLink className={linkClassName} to="/admin/reports">Reports</NavLink>
          </>
        ) : (
          <>
            <NavLink className={linkClassName} to="/student/assignments">My Assignments</NavLink>
            <NavLink className={linkClassName} to="/student/inspection">Submit Inspection</NavLink>
            <NavLink className={linkClassName} to="/student/activity">My Activity</NavLink>
          </>
        )}
      </nav>

      <div className="cc-user">
        <div className="cc-user-name">{user?.full_name}</div>
        <div className="cc-user-role">{user?.role}</div>
        <button
          className="cc-btn cc-btn-secondary"
          type="button"
          onClick={() => {
            try {
              logout();
            } finally {
              sessionStorage.removeItem('janitorial_userData');
              navigate('/login', { replace: true });
            }
          }}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
