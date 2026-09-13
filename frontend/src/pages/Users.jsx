import React, { useEffect, useState } from 'react';
import { Pencil, Trash2, UserPlus, Mail } from 'lucide-react';
import api from '../api/axios.js';
import { Card, Button, Input, Select, Modal, Badge, Spinner, EmptyState } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate } from '../utils/format.js';

const emptyForm = { name: '', email: '', phone: '', password: '', role: 'salesman' };

const Users = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => api.get('/users').then((res) => setUsers(res.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setEditId(null); setModalOpen(true); };
  const openEdit = (u) => { setEditId(u._id); setForm({ name: u.name, email: u.email, phone: u.phone, password: '', role: u.role }); setModalOpen(true); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name || !form.email) return alert('Name and email are required');
    if (!editId && !form.password) return alert('Password is required for new user');
    try {
      if (editId) await api.put(`/users/${editId}`, form);
      else await api.post('/users', form);
      setModalOpen(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save user');
    }
  };

  const toggleActive = async (u) => {
    await api.put(`/users/${u._id}`, { isActive: !u.isActive });
    load();
  };

  const handleDelete = async (u) => {
    if (!confirm(`Delete user "${u.name}"?`)) return;
    await api.delete(`/users/${u._id}`);
    load();
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Staff Users</h2>
          <p className="text-sm text-gray-500">Add salesman & driver accounts for billing</p>
        </div>
        <Button onClick={openCreate}>
          <UserPlus size={16} className="mr-1" /> Add User
        </Button>
      </div>

      <Card className="overflow-x-auto">
        {users.length === 0 ? <EmptyState message="No users yet" /> : (
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                <th className="py-3 px-4 font-medium">Name</th>
                <th className="py-3 px-4 font-medium">Email</th>
                <th className="py-3 px-4 font-medium">Phone</th>
                <th className="py-3 px-4 font-medium">Role</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Joined</th>
                <th className="py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-800">{u.name}{u._id === user._id && <Badge color="indigo" >You</Badge>}</td>
                  <td className="py-3 px-4 text-gray-500">{u.email}</td>
                  <td className="py-3 px-4 text-gray-500">{u.phone || '-'}</td>
                  <td className="py-3 px-4">
                    <Badge color={u.role === 'admin' ? 'indigo' : u.role === 'salesman' ? 'blue' : 'yellow'}>{u.role}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge color={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{formatDate(u.createdAt)}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-indigo-600"><Pencil size={16} /></button>
                      <button onClick={() => toggleActive(u)} className="p-1.5 text-gray-400 hover:text-yellow-600" title="Toggle active">◐</button>
                      {u._id !== user._id && (
                        <button onClick={() => handleDelete(u)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit User' : 'Add User'} maxWidth="max-w-md">
        <div className="space-y-4">
          <Input label="Name *" value={form.name} onChange={(e) => set('name', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email *" value={form.email} onChange={(e) => set('email', e.target.value)} />
            <Input label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <Input type="password" label={editId ? 'New Password (leave blank to keep)' : 'Password *'} value={form.password} onChange={(e) => set('password', e.target.value)} />
          <Select label="Role" value={form.role} onChange={(e) => set('role', e.target.value)}>
            <option value="salesman">Salesman</option>
            <option value="driver">Driver</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>{editId ? 'Update' : 'Create'}</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Users;