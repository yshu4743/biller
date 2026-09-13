import React, { useState } from 'react';
import { UserPlus, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import { Card, Button, Input, Select } from '../components/ui.jsx';

const emptyForm = { name: '', email: '', phone: '', password: '', role: 'salesman' };

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.name || !form.email || !form.password) {
      setError('Name, email and password are required');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      setSuccess(`User "${form.name}" registered successfully`);
      setForm(emptyForm);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
          <UserPlus size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Register User</h2>
          <p className="text-sm text-gray-500">Create an admin, salesman or driver account</p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg border border-red-100">{error}</div>
          )}
          {success && (
            <div className="bg-emerald-50 text-emerald-700 text-sm px-3 py-2 rounded-lg border border-emerald-100">
              <CheckCircle2 size={16} className="inline mr-1" />{success}
            </div>
          )}
          <Input label="Name *" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Ramesh Shop Salesman" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email *" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@biller.com" />
            <Input label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="98XXXXXXXX" />
          </div>
          <Input label="Password *" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••••" />
          <Select label="Role" value={form.role} onChange={(e) => set('role', e.target.value)}>
            <option value="salesman">Salesman</option>
            <option value="driver">Driver</option>
            <option value="admin">Admin</option>
          </Select>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Registering...' : 'Register User'}
            </Button>
            <Button variant="secondary" type="button" onClick={() => navigate('/users')}>
              Manage Users
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default Register;