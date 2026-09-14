import React, { useEffect, useState } from 'react';
import api from '../api/axios.js';
import { Card, Select, Button, Spinner, EmptyState, ErrorState } from '../components/ui.jsx';

const ACTION_COLORS = {
  create: 'green', update: 'blue', delete: 'red', convert: 'indigo',
  return: 'yellow', transfer: 'indigo', restore: 'red', export: 'blue',
  close_fy: 'yellow', adjust_stock: 'yellow', payment_update: 'yellow',
};

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (entity) params.entity = entity;
      if (action) params.action = action;
      const res = await api.get('/audit', { params });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setError('');
    } catch (err) {
      setLogs([]);
      setTotal(0);
      setError(err?.response?.data?.message || 'Failed to load activity log.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, entity, action]);

  const entities = ['backup', 'invoice', 'item', 'party', 'payment', 'purchase', 'expense', 'godown', 'company', 'user'];
  const actions = ['create', 'update', 'delete', 'convert', 'return', 'transfer', 'restore', 'export', 'close_fy', 'adjust_stock', 'payment_update', 'bulk_create'];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Activity Log</h2>
        <p className="text-sm text-gray-500">Full audit trail of changes made across the app</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <span className="text-sm text-gray-600">Entity</span>
            <Select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }}>
              <option value="">All</option>
              {entities.map((e) => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
            </Select>
          </div>
          <div>
            <span className="text-sm text-gray-600">Action</span>
            <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
              <option value="">All</option>
              {actions.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </Select>
          </div>
          <Button variant="secondary" onClick={() => { setEntity(''); setAction(''); setPage(1); }}>Clear Filters</Button>
        </div>
      </Card>

      {error && <ErrorState message={error} />}

      {loading ? (
        <Spinner />
      ) : logs.length === 0 ? (
        <Card className="p-8"><EmptyState message="No activity recorded" /></Card>
      ) : (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 px-3 font-medium">When</th>
                  <th className="py-2 px-3 font-medium">User</th>
                  <th className="py-2 px-3 font-medium">Action</th>
                  <th className="py-2 px-3 font-medium">Entity</th>
                  <th className="py-2 px-3 font-medium">Reference</th>
                  <th className="py-2 px-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l._id} className="border-b border-gray-100 align-top">
                    <td className="py-2 px-3 text-gray-500 whitespace-nowrap">{new Date(l.date).toLocaleString()}</td>
                    <td className="py-2 px-3 text-gray-800 whitespace-nowrap">{l.userName || '—'}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${badgeClass(ACTION_COLORS[l.action] || 'gray')}`}>{l.action.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="py-2 px-3 text-gray-700">{l.entity}</td>
                    <td className="py-2 px-3 text-gray-600">{l.ref || '—'}</td>
                    <td className="py-2 px-3 text-gray-500 max-w-xs break-words">{Object.keys(l.details || {}).length ? JSON.stringify(l.details) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{total} entries · page {page}</span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="secondary" disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function badgeClass(color) {
  const map = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
    indigo: 'bg-indigo-100 text-indigo-700',
  };
  return map[color] || map.gray;
}

export default ActivityLog;