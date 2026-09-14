import React, { useState, useEffect } from 'react';
import api from '../api/axios.js';
import { Card, Button, Input, Spinner } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const Settings = () => {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [fySummary, setFySummary] = useState(null);
  const [fyLoading, setFyLoading] = useState(false);
  const [fyMsg, setFyMsg] = useState('');
  const [closing, setClosing] = useState(false);

  const loadFy = async () => {
    try {
      const res = await api.get('/companies');
      const company = res.data[0];
      if (!company) { setFySummary(null); return; }
      const summary = await api.get(`/companies/${company._id}/financial-year`);
      setFySummary({ company, ...summary.data });
    } catch (err) {
      setFyMsg({ type: 'error', text: err.response?.data?.message || 'Failed to load financial year data' });
    }
  };

  useEffect(() => { loadFy(); }, []);

  const handleCloseFy = async () => {
    const ok = confirm('Close the current financial year?\n• Outstanding party dues will be carried forward as opening balances\n• New bill numbers will start fresh in the new financial year\n\nThis advances the year permanently. Continue?');
    if (!ok) return;
    setClosing(true);
    setFyMsg('');
    try {
      await api.post(`/companies/${fySummary.company._id}/close-financial-year`, { confirm: 'CLOSE' });
      setFyMsg({ type: 'success', text: 'Financial year closed successfully.' });
      loadFy();
    } catch (err) {
      setFyMsg({ type: 'error', text: err.response?.data?.message || 'Failed to close financial year' });
    } finally {
      setClosing(false);
    }
  };

  const handleChangePassword = async () => {
    setMessage('');
    if (newPassword.length < 6) return setMessage('New password must be at least 6 characters');
    if (newPassword !== confirmPassword) return setMessage('Passwords do not match');
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      setMessage({ type: 'success', text: 'Password updated successfully' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update password' });
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Settings</h2>
        <p className="text-sm text-gray-500">Change your password and manage account</p>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Account</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-gray-500">Name</p><p className="font-medium">{user?.name}</p></div>
          <div><p className="text-gray-500">Role</p><p className="font-medium capitalize">{user?.role}</p></div>
          <div className="col-span-2"><p className="text-gray-500">Email</p><p className="font-medium">{user?.email}</p></div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Change Password</h3>
        <div className="space-y-4">
          {message && (
            <div className={`text-sm px-3 py-2 rounded-lg border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
              {message.text}
            </div>
          )}
          <Input type="password" label="Current Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <Input type="password" label="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <Input type="password" label="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          <Button onClick={handleChangePassword}>Update Password</Button>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-gray-800 mb-2">Financial Year</h3>
        <p className="text-sm text-gray-500 mb-4">Close the current financial year to carry forward party dues and restart bill numbering.</p>
        {fyMsg && (
          <div className={`text-sm px-3 py-2 rounded-lg border mb-4 ${fyMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
            {fyMsg.text}
          </div>
        )}
        {fySummary === null && !fyLoading && <p className="text-sm text-gray-400">No company configured yet.</p>}
        {fySummary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-4">
            <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Current Financial Year</p><p className="font-semibold text-gray-800">FY {fySummary.currentYear}</p></div>
            <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Closing Stock Value</p><p className="font-semibold text-gray-800">₹{fySummary.closingStockValue?.toLocaleString('en-IN')}</p></div>
            <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Outstanding Party Dues</p><p className="font-semibold text-gray-800">₹{fySummary.totalOutstanding?.toLocaleString('en-IN')} <span className="text-gray-400 text-xs">({fySummary.partiesWithDues} parties)</span></p></div>
          </div>
        )}
        <Button variant="danger" onClick={handleCloseFy} disabled={closing || !fySummary}>
          {closing ? 'Closing Year...' : 'Close Financial Year'}
        </Button>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-gray-800 mb-2">Data Backup</h3>
        <p className="text-sm text-gray-500 mb-4">Your data is stored securely on MongoDB Atlas (cloud database) and is backed up automatically.</p>
        <Button variant="secondary" onClick={() => alert('Data is automatically backed up in the cloud.')}>
          Backup Now (Cloud)
        </Button>
      </Card>
    </div>
  );
};

export default Settings;