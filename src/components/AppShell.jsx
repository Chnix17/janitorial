import React from 'react';
import { Outlet } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import Sidebar from './Sidebar';
import './appShell.css';

export default function AppShell({ title, homePath }) {
  const isMobile = useMediaQuery({ maxWidth: 900 });
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(!isMobile);

  React.useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  return (
    <div className={"cc-shell" + (isMobile ? ' cc-shell-mobile' : '') + (!isSidebarOpen ? ' cc-shell-sidebar-closed' : '')}>
      <Sidebar
        title={title}
        homePath={homePath}
        isMobile={isMobile}
        isOpen={isSidebarOpen}
        onOpen={() => setIsSidebarOpen(true)}
        onClose={() => setIsSidebarOpen(false)}
        onToggle={() => setIsSidebarOpen((v) => !v)}
      />
      <main className="cc-main">
        <Outlet />
      </main>
    </div>
  );
}
