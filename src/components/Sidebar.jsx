import React, { useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './appShell.css';

export default function Sidebar({ title, homePath }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isFacilitiesOpen, setIsFacilitiesOpen] = useState(false);

  const isAdmin = String(user?.role || '').toLowerCase().includes('admin');

  const linkClassName = ({ isActive }) => (isActive ? 'cc-nav-item cc-nav-item-active' : 'cc-nav-item');

  const Icon = {
    Check: (props) => (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M8.5 12.2l2.4 2.5L15.7 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    ChevronLeft: (props) => (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M14.5 6.5L9 12l5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    Dashboard: (props) => (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M4 13.5V6.8c0-.9.7-1.6 1.6-1.6h3.6c.9 0 1.6.7 1.6 1.6v6.7c0 .9-.7 1.6-1.6 1.6H5.6c-.9 0-1.6-.7-1.6-1.6z" stroke="currentColor" strokeWidth="2" />
        <path d="M13.2 17.2V6.8c0-.9.7-1.6 1.6-1.6h3.6c.9 0 1.6.7 1.6 1.6v10.4c0 .9-.7 1.6-1.6 1.6h-3.6c-.9 0-1.6-.7-1.6-1.6z" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    Users: (props) => (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M16 20c0-2.2-1.8-4-4-4s-4 1.8-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    Building: (props) => (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M5 20V6.5c0-.8.7-1.5 1.5-1.5h5c.8 0 1.5.7 1.5 1.5V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M14 20V10.5c0-.8.7-1.5 1.5-1.5H18c.6 0 1 .4 1 1v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M8 9h2M8 12h2M8 15h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    Door: (props) => (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M7 20V5.8c0-.9.7-1.6 1.6-1.6h6.8c.9 0 1.6.7 1.6 1.6V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M10 12h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
    Calendar: (props) => (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M4.5 9h15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6.5 6h11c1.1 0 2 .9 2 2v11c0 1.1-.9 2-2 2h-11c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    Clipboard: (props) => (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M9 5h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M9 3h6c1.1 0 2 .9 2 2v1H7V5c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" />
        <path d="M7 7h10v13c0 1.1-.9 2-2 2H9c-1.1 0-2-.9-2-2V7z" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    Activity: (props) => (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M3 12h4l2-6 4 14 2-8h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    Logout: (props) => (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M10 7V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M4 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M7 9l-3 3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    ChevronDown: (props) => (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M6.5 9.5L12 15l5.5-5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  };

  const NavItem = ({ to, icon: IconCmp, children, end }) => (
    <NavLink className={linkClassName} to={to} end={end}>
      <span className="cc-nav-ico"><IconCmp /></span>
      <span className="cc-nav-text">{children}</span>
    </NavLink>
  );

  const facilitiesLinks = useMemo(
    () => [
      { to: '/admin/buildings', label: 'Buildings', icon: Icon.Building },
      { to: '/admin/rooms', label: 'Rooms', icon: Icon.Door },
      { to: '/admin/checklists', label: 'Checklists', icon: Icon.Clipboard },
      { to: '/admin/floor-names', label: 'Floor Names', icon: Icon.Building },
      { to: '/admin/floors', label: 'Floors', icon: Icon.Building }
    ],
    []
  );

  return (
    <aside className="cc-sidebar cc-sidebar-v2">
      <div className="cc-side-top">
        <div className="cc-side-brand">
          <span className="cc-side-logo" aria-hidden="true"><Icon.Check /></span>
          <div className="cc-side-brand-text">
            <div className="cc-side-brand-title">CleanCheck <span className="cc-side-brand-title-sub">PH</span></div>
          </div>
        </div>

        <button type="button" className="cc-side-collapse" aria-label="Collapse sidebar">
          <Icon.ChevronLeft />
        </button>
      </div>

      <nav className="cc-nav cc-nav-v2">
        <NavItem to={homePath} icon={Icon.Dashboard} end>
          Dashboard
        </NavItem>

        {isAdmin ? (
          <>
            <NavItem to="/admin/users" icon={Icon.Users}>Users</NavItem>

            <div className="cc-nav-group">
              <button
                type="button"
                className="cc-nav-item cc-nav-group-trigger"
                aria-expanded={isFacilitiesOpen}
                onClick={() => setIsFacilitiesOpen((v) => !v)}
              >
                <span className="cc-nav-ico"><Icon.Building /></span>
                <span className="cc-nav-text">Facilities</span>
                <span className={isFacilitiesOpen ? 'cc-nav-group-chev cc-nav-group-chev-open' : 'cc-nav-group-chev'}>
                  <Icon.ChevronDown />
                </span>
              </button>

              {isFacilitiesOpen ? (
                <div className="cc-nav-sub">
                  {facilitiesLinks.map((l) => (
                    <NavItem key={l.to} to={l.to} icon={l.icon}>
                      {l.label}
                    </NavItem>
                  ))}
                </div>
              ) : null}
            </div>

            <NavItem to="/admin/assignments" icon={Icon.Calendar}>Assignments</NavItem>
            <NavItem to="/admin/inspections" icon={Icon.Clipboard}>Inspections</NavItem>
            <NavItem to="/admin/activity" icon={Icon.Activity}>Activity</NavItem>
          </>
        ) : (
          <>
            <NavItem to="/student/assignments" icon={Icon.Calendar}>Assignments</NavItem>
            <NavItem to="/student/inspection" icon={Icon.Clipboard}>Inspections</NavItem>
            <NavItem to="/student/activity" icon={Icon.Activity}>Activity</NavItem>
          </>
        )}
      </nav>

      <div className="cc-side-bottom">
        <div className="cc-side-user">
          <div className="cc-side-user-name">{user?.full_name || 'User'}</div>
          <div className="cc-side-user-role">{isAdmin ? 'Admin' : (title || user?.role || '')}</div>
        </div>

        <button
          className="cc-side-logout"
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
          <span className="cc-nav-ico" aria-hidden="true"><Icon.Logout /></span>
          <span className="cc-nav-text">Logout</span>
        </button>
      </div>
    </aside>
  );
}
