import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LeadsPage from './pages/LeadsPage';
import ContactsPage from './pages/ContactsPage';
import DealsPage from './pages/DealsPage';
import TasksPage from './pages/TasksPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/deals" element={<DealsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
