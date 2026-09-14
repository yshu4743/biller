import React, { useState, useEffect } from 'react';
import api from '../api/axios.js';
import { Card, Button, Input, Spinner } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Download, UploadCloud, History } from 'lucide-react';

const Settings = () => {
  const { user, isAdmin } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [fySummary, setFySummary] = useState(null);
  const [fyLoading, setFyLoading] = useState(false);
  const [fyMsg, setFyMsg] = useState('');
  const [closing, setClosing] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreConfirm, setRestoreConfirm] = useState('');
  const [activity, setActivity] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);

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

  const loadActivity = async () => {
    setActivityLoading(true);
    try {
      const res = await api.get('/audit', { params: { limit: 8 } });
      setActivity(res.data.logs || []);
    } catch (err) {
      setActivity([]);
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadActivity();
    // eslint-disable-next-line
  }, [isAdmin]);

  const handleBackup = async () => {
    setBackupLoading(true);
    setBackupMsg('');
    try {
      const res = await api.get('/backup');
      const data = res.data;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `biller-backup-${data.exportedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupMsg({ type: 'success', text: `Backup exported (${Object.values(data.collections || {}).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0)} records).` });
      loadActivity();
    } catch (err) {
      setBackupMsg({ type: 'error', text: err.response?.data?.message || 'Backup failed' });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = async () => {
    setBackupMsg('');
    if (!restoreFile) return setBackupMsg({ type: 'error', text: 'Select a backup file first' });
    if (restoreConfirm !== 'RESTORE') return setBackupMsg({ type: 'error', text: 'Type RESTORE to confirm you want to wipe current data and restore the backup' });
    const ok = confirm('WARNING: This deletes ALL current data (users, items, parties, invoices, purchases) and replaces it with the backup file contents. This cannot be undone. Continue?');
    if (!ok) return;
    setRestoreLoading(true);
    try {
      const text = await restoreFile.text();
      const data = JSON.parse(text);
      const res = await api.post('/backup/restore', { confirm: 'RESTORE', collections: data.collections });
      setBackupMsg({ type: 'success', text: res.data.message });
      setRestoreConfirm('');
      setRestoreFile(null);
      loadActivity();
    } catch (err) {
      setBackupMsg({ type: 'error', text: err.response?.data?.message || err.message || 'Restore failed' });
    } finally {
      setRestoreLoading(false);
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
        <h3 className="font-semibold text-gray-800 mb-2">Data Backup &amp; Restore</h3>
        <p className="text-sm text-gray-500 mb-4">Your data is stored securely on MongoDB Atlas (cloud database) and is backed up automatically. You can also download a full JSON backup and restore it later (admin only).</p>
        {backupMsg && (
          <div className={`text-sm px-3 py-2 rounded-lg border mb-4 ${backupMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
            {backupMsg.text}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 rounded-lg bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5"><Download size={16} /> Export Backup</p>
            <p className="text-xs text-gray-500 mb-3">Download companies, items, parties, invoices, purchases, payments, users as a JSON file.</p>
            <Button variant="secondary" onClick={handleBackup} disabled={backupLoading || !isAdmin}>
              {backupLoading ? 'Exporting...' : 'Backup Now'}
            </Button>
          </div>
          <div className="flex-1 rounded-lg bg-gray-50 p-4 border border-dashed border-gray-300">
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5"><UploadCloud size={16} /> Restore from Backup</p>
            <p className="text-xs text-gray-500 mb-3">Wipes current data and replaces it with a backup file.</p>
            <div className="space-y-2">
              <input type="file" accept="application/json,.json" onChange={(e) => setRestoreFile(e.target.files[0] || null)} className="text-sm w-full" />
              <Input placeholder='Type RESTORE to confirm' value={restoreConfirm} onChange={(e) => setRestoreConfirm(e.target.value)} />
              <Button variant="danger" onClick={handleRestore} disabled={restoreLoading || !isAdmin}>
                {restoreLoading ? 'Restoring...' : 'Restore Backup'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {isAdmin && (
        <Card className="p-5">
          <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-1.5"><History size={16} /> Recent Activity</h3>
          <p className="text-sm text-gray-500 mb-4">Latest actions across the app. View the full log in Activity Log.</p>
          {activityLoading ? (
            <Spinner />
          ) : activity && activity.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {activity.map((a) => (
                <li key={a._id} className="py-2 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-gray-800 capitalize">{a.action.replace(/_/g, ' ')}</span>
                    <span className="text-gray-500"> · {a.entity}</span>
                    {a.ref && <span className="text-gray-500"> · {a.ref}</span>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">{a.userName || '—'}</p>
                    <p className="text-xs text-gray-400">{new Date(a.date).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">No activity recorded yet.</p>
          )}
        </Card>
      )}
    </div>
  );
};

export default Settings;