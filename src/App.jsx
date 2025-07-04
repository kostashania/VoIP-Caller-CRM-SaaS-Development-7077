import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { useCallStore } from './store/callStore';

// Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import CallerDetails from './components/callers/CallerDetails';
import CallHistory from './components/calls/CallHistory';
import ContactsManagement from './components/contacts/ContactsManagement';
import Settings from './components/settings/Settings';
import UserManagement from './components/admin/UserManagement';
import CompanyManagement from './components/superadmin/CompanyManagement';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import IncomingCallDisplay from './components/voip/IncomingCallDisplay';

function App() {
  const { user } = useAuthStore();
  const { incomingCall } = useCallStore();

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 2000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 1500,
            },
            error: {
              duration: 3000,
            }
          }}
        />

        {/* Incoming Call Display */}
        {incomingCall && <IncomingCallDisplay />}

        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/register"
            element={!user ? <Register /> : <Navigate to="/dashboard" />}
          />

          {/* Protected Routes */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/calls" element={<CallHistory />} />
            <Route path="/contacts" element={<ContactsManagement />} />
            <Route path="/caller/:id" element={<CallerDetails />} />
            <Route path="/settings" element={<Settings />} />
            <Route
              path="/users"
              element={
                <ProtectedRoute requiredRole="admin">
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/companies"
              element={
                <ProtectedRoute requiredRole="superadmin">
                  <CompanyManagement />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;