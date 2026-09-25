import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, ProtectedRoute } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DealsPage from './pages/DealsPage';
import RegisterPage from './pages/RegisterPage';
import UsersPage from './pages/UsersPage';
import RoleSelectorPage from './pages/RoleSelectorPage';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
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
            {/* Role selector landing */}
            <Route path="/login"          element={<RoleSelectorPage />} />
            {/* Role-specific login portals */}
            <Route path="/login/:role"    element={<LoginPage />} />
            {/* Salesperson-only registration */}
            <Route path="/register/salesperson" element={<RegisterPage />} />
            {/* Legacy /register → role selector */}
            <Route path="/register"      element={<Navigate to="/login" replace />} />

            <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route path="/"        element={<DashboardPage />} />
              <Route path="/deals"   element={<DealsPage />} />
              <Route path="/users"   element={<UsersPage />} />
              <Route path="*"        element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
