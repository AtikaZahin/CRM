import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { ChatProvider } from '../context/ChatContext';

const DashboardLayout = () => {
  return (
    <ChatProvider>
      <div className="layout-root">
        <Navbar />
        <div className="layout-body">
          <Sidebar />
          <main className="main-content">
            <div className="page">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      {/* AI Chat Drawer temporarily hidden */}
    </ChatProvider>
  );
};

export default DashboardLayout;
