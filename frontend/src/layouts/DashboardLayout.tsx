import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { ChatProvider } from '../context/ChatContext';
import ChatDrawer from '../components/ChatDrawer';

const DashboardLayout = () => {
  return (
    <ChatProvider>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <div style={{ display: 'flex', flex: 1 }}>
          <Sidebar />
          <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
            <Outlet />
          </main>
        </div>
      </div>
      <ChatDrawer />
    </ChatProvider>
  );
};

export default DashboardLayout;
