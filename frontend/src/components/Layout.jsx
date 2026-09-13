import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FilePlus2, Receipt, Package, Users, Wallet, ShoppingCart,
  ArrowLeftRight, BarChart3, UserCog, Building2, LogOut, Settings, Store,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const menu = (isAdmin) => [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/billing', label: 'New Bill', icon: FilePlus2 },
  { to: '/invoices', label: 'Invoices', icon: Receipt },
  { to: '/items', label: 'Items & Stock', icon: Package, adminOnly: false },
  { to: '/parties', label: 'Parties', icon: Users, adminOnly: false },
  { to: '/expenses', label: 'Expenses', icon: Wallet, adminOnly: false },
  { to: '/purchases', label: 'Purchases', icon: ShoppingCart },
  { to: '/payments', label: 'Payments & Dues', icon: ArrowLeftRight },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/company', label: 'Company', icon: Building2 },
  ...(isAdmin ? [{ to: '/users', label: 'Staff Users', icon: UserCog }] : []),
  { to: '/settings', label: 'Settings', icon: Settings },
];

const Layout = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = menu(isAdmin);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebar = (
    <div className="h-full flex flex-col">
      <div className="px-5 py-5 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Store size={20} />
          </div>
          <div>
            <p className="font-bold text-white">Biller</p>
            <p className="text-xs text-gray-400">GST Billing Software</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-gray-700">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="text-gray-400 hover:text-white" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="hidden md:block fixed inset-y-0 left-0 w-60 bg-gray-900 z-30">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-60 bg-gray-900">{sidebar}</aside>
        </div>
      )}

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="md:hidden text-gray-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="font-semibold text-gray-800">Biller</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline capitalize text-sm text-gray-600">{user?.email}</span>
          </div>
        </header>
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;