import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { StaffAuthProvider, ProtectedStaffRoute } from './context/StaffAuthContext';
import { CustomerAuthProvider, ProtectedCustomerRoute } from './context/CustomerAuthContext';

import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DealsPage from './pages/DealsPage';
import UsersPage from './pages/UsersPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import SupportPage from './pages/SupportPage';
import CustomersPage from './pages/CustomersPage';
import RoleSelectorPage from './pages/RoleSelectorPage';
import CustomerLayout from './layouts/CustomerLayout';
import ShopPage from './pages/ShopPage';
import CustomerOrdersPage from './pages/CustomerOrdersPage';
import CustomerTicketsPage from './pages/CustomerTicketsPage';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#fdf9f2',
              color: '#1a1714',
              border: '1px solid rgba(43,32,19,0.14)',
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: '13px',
              borderRadius: '8px',
              boxShadow: '0 4px 16px rgba(43,32,19,0.12)',
            },
            success: { iconTheme: { primary: '#4a5a35', secondary: '#fdf9f2' } },
            error:   { iconTheme: { primary: '#7a3b3b', secondary: '#fdf9f2' } },
          }}
        />
        <Routes>
          {/* Entry page */}
          <Route path="/" element={<RoleSelectorPage />} />
          
          {/* Default fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />

          {/* STAFF ROUTES */}
          <Route path="/staff/*" element={
            <StaffAuthProvider>
              <Routes>
                <Route path="login" element={<LoginPage type="staff" />} />
                <Route element={<ProtectedStaffRoute><DashboardLayout /></ProtectedStaffRoute>}>
                  <Route path="announcements" element={<AnnouncementsPage />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="support" element={<SupportPage />} />
                  <Route path="deals" element={<DealsPage />} />
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="*" element={<Navigate to="/staff/dashboard" replace />} />
                </Route>
              </Routes>
            </StaffAuthProvider>
          } />

          {/* CUSTOMER ROUTES */}
          <Route path="/shop" element={
            <CustomerAuthProvider>
              <CustomerLayout />
            </CustomerAuthProvider>
          }>
            <Route index element={<ShopPage />} />
            <Route path="login" element={<LoginPage type="customer" />} />
            <Route path="register" element={<RegisterPage />} />
            
            {/* Protected customer routes */}
            <Route element={<ProtectedCustomerRoute><Outlet /></ProtectedCustomerRoute>}>
              <Route path="orders" element={<CustomerOrdersPage />} />
              <Route path="tickets" element={<CustomerTicketsPage />} />
              <Route path="dashboard" element={<Navigate to="/shop/orders" replace />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/shop" replace />} />
          </Route>

          {/* Legacy redirects */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/customer/login" element={<Navigate to="/shop/login" replace />} />
          <Route path="/customer/register" element={<Navigate to="/shop/register" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
