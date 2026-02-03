import React, { useState } from 'react';
import {
  LeftOutlined,
  AppstoreOutlined,
  TeamOutlined,
  BankOutlined,
  GatewayOutlined,
  CalendarOutlined,
  FileSearchOutlined,
  LineChartOutlined,
  LogoutOutlined,
  DownOutlined,
  HomeOutlined,
  CheckSquareOutlined,
  ApartmentOutlined,
  BarsOutlined,
} from '@ant-design/icons';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './appShell.css';

export default function Sidebar({ title, homePath, isMobile, isOpen, onOpen, onClose, onToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = String(user?.role || '').toLowerCase().includes('admin');
  const [isFacilitiesOpen, setIsFacilitiesOpen] = useState(true);

  // Close sidebar on route change when mobile, but NOT when isMobile first becomes true
  // This prevents the sidebar from auto-closing when the user tries to open it
  const prevPathnameRef = React.useRef(location.pathname);
  
  React.useEffect(() => {
    // Only close on pathname change, not on isMobile change
    if (isMobile && location.pathname !== prevPathnameRef.current) {
      onClose?.();
      prevPathnameRef.current = location.pathname;
    }
  }, [isMobile, onClose, location.pathname]);

  const linkClassName = ({ isActive }) =>
    isActive ? 'cc-nav-item cc-nav-item-active' : 'cc-nav-item';

  const Icon = {
    ChevronDown: DownOutlined,
    Dashboard: AppstoreOutlined,
    Home: HomeOutlined,
    Users: TeamOutlined,
    Building: BankOutlined,
    Door: GatewayOutlined,
    Calendar: CalendarOutlined,
    Clipboard: FileSearchOutlined,
    Checklist: CheckSquareOutlined,
    Activity: LineChartOutlined,
    Logout: LogoutOutlined,
    Floor: ApartmentOutlined,
    FloorNames: BarsOutlined,
  };

  const NavItem = ({ to, icon: IconCmp, children, end }) => (
    <NavLink
      className={linkClassName}
      to={to}
      end={end}
      onClick={() => {
        if (isMobile) onClose?.();
      }}
    >
      <span className="cc-nav-ico">
        <IconCmp />
      </span>
      <span className="cc-nav-text">{children}</span>
    </NavLink>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          type="button"
          className="cc-mobile-menu-btn"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          onClick={() => (isOpen ? onClose?.() : onOpen?.())}
        >
          <span className="cc-mobile-menu-btn-lines" aria-hidden="true" />
        </button>
      )}

      {/* Mobile Backdrop */}
      {isMobile && isOpen && (
        <div
          className="cc-sidebar-backdrop"
          role="button"
          tabIndex={-1}
          aria-label="Close sidebar"
          onClick={() => onClose?.()}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'cc-sidebar',
          'cc-sidebar-v2',
          'cc-sidebar-v3',
          isMobile ? 'cc-sidebar-drawer' : '',
          isMobile && isOpen ? 'cc-sidebar-open' : '',
          !isMobile && !isOpen ? 'cc-sidebar-collapsed' : '',
        ].join(' ')}
      >
        {/* Brand Header */}
        <div className="cc-side-top">
          <div className="cc-side-brand">
            <div className="cc-side-logo-wrapper">
              <img src="/phinma.png" alt="PHINMA" className="cc-side-logo" />
            </div>
            <div className="cc-side-brand-text">
              <div className="cc-side-brand-title">
                Student Janitorial
                <span className="cc-side-brand-badge">GSD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="cc-nav cc-nav-v2">
          {isAdmin ? (
            <div className="cc-nav-section">
              {/* Main Navigation */}
              <div className="cc-nav-group-title">Main</div>
              <NavItem to={homePath} icon={Icon.Dashboard} end>
                Dashboard
              </NavItem>
              <NavItem to="/admin/users" icon={Icon.Users}>
                Users
              </NavItem>

              {/* Facilities Group */}
              <div className="cc-nav-group">
                <button
                  type="button"
                  className="cc-nav-item cc-nav-group-trigger"
                  onClick={() => setIsFacilitiesOpen((v) => !v)}
                  aria-expanded={isFacilitiesOpen}
                >
                  <span className="cc-nav-ico">
                    <Icon.Building />
                  </span>
                  <span className="cc-nav-text">Facilities</span>
                  <span
                    className={[
                      'cc-nav-group-chev',
                      isFacilitiesOpen ? 'cc-nav-group-chev-open' : '',
                    ].join(' ')}
                  >
                    <Icon.ChevronDown />
                  </span>
                </button>

                {isFacilitiesOpen && (
                  <div className="cc-nav-sub">
                    <NavItem to="/admin/buildings" icon={Icon.Building}>
                      Buildings
                    </NavItem>
                    <NavItem to="/admin/rooms" icon={Icon.Door}>
                      Rooms
                    </NavItem>
                    <NavItem to="/admin/floors" icon={Icon.Floor}>
                      Floors
                    </NavItem>
                    <NavItem to="/admin/floor-names" icon={Icon.FloorNames}>
                      Floor Names
                    </NavItem>
                    <NavItem to="/admin/checklists" icon={Icon.Checklist}>
                      Checklists
                    </NavItem>
                  </div>
                )}
              </div>

              {/* Management */}
              <div className="cc-nav-group-title">Management</div>
              <NavItem to="/admin/assignments" icon={Icon.Calendar}>
                Assignments
              </NavItem>
              <NavItem to="/admin/activity" icon={Icon.Activity}>
                Activity
              </NavItem>
            </div>
          ) : (
            <div className="cc-nav-section">
              <div className="cc-nav-group-title">Student</div>
              <NavItem to="/student/assignments" icon={Icon.Calendar}>
                Assignments
              </NavItem>
              <NavItem to="/student/activity" icon={Icon.Activity}>
                Activity
              </NavItem>
            </div>
          )}
        </nav>

        {/* User & Logout */}
        <div className="cc-side-bottom">
          <div className="cc-side-user">
            <div className="cc-side-user-avatar">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="cc-side-user-info">
              <div className="cc-side-user-name">{user?.full_name || 'User'}</div>
              <div className="cc-side-user-role">
                {isAdmin ? 'Administrator' : title || user?.role || 'Student'}
              </div>
            </div>
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
            <span className="cc-nav-ico" aria-hidden="true">
              <Icon.Logout />
            </span>
            <span className="cc-nav-text">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
