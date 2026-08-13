import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, ProtectedRoute } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LeadsPage from './pages/LeadsPage';
import ContactsPage from './pages/ContactsPage';
import DealsPage from './pages/DealsPage';
import TasksPage from './pages/TasksPage';
import RegisterPage from './pages/RegisterPage';

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
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route path="/"        element={<DashboardPage />} />
              <Route path="/leads"   element={<LeadsPage />} />
              <Route path="/contacts"element={<ContactsPage />} />
              <Route path="/deals"   element={<DealsPage />} />
              <Route path="/tasks"   element={<TasksPage />} />
              <Route path="*"        element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
