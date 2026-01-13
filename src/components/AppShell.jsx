import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import './appShell.css';

export default function AppShell({ title, homePath }) {
  return (
    <div className="cc-shell">
      <Sidebar title={title} homePath={homePath} />
      <main className="cc-main">
        <Outlet />
      </main>
    </div>
  );
}
