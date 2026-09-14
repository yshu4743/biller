import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Company from './pages/Company.jsx';
import Items from './pages/Items.jsx';
import Parties from './pages/Parties.jsx';
import Billing from './pages/Billing.jsx';
import Invoices from './pages/Invoices.jsx';
import InvoicePrint from './pages/InvoicePrint.jsx';
import BulkPrint from './pages/BulkPrint.jsx';
import BarcodeLabels from './pages/BarcodeLabels.jsx';
import Expenses from './pages/Expenses.jsx';
import Purchases from './pages/Purchases.jsx';
import Payments from './pages/Payments.jsx';
import Reports from './pages/Reports.jsx';
import Gst from './pages/Gst.jsx';
import Godowns from './pages/Godowns.jsx';
import Users from './pages/Users.jsx';
import Register from './pages/Register.jsx';
import Settings from './pages/Settings.jsx';
import ActivityLog from './pages/ActivityLog.jsx';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/:id/print" element={<InvoicePrint />} />
            <Route path="/invoices/print-bulk" element={<BulkPrint />} />
            <Route path="/barcodes" element={<BarcodeLabels />} />
            <Route path="/items" element={<Items />} />
            <Route path="/parties" element={<Parties />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/gst" element={<Gst />} />
            <Route path="/godowns" element={<Godowns />} />
            <Route path="/company" element={<Company />} />
            <Route path="/users" element={<AdminRoute><Users /></AdminRoute>} />
            <Route path="/register" element={<AdminRoute><Register /></AdminRoute>} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/activity" element={<AdminRoute><ActivityLog /></AdminRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;