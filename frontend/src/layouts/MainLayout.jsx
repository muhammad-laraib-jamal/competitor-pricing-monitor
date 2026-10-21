// src/layouts/MainLayout.jsx
import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Eye,
  LayoutDashboard,
  Users,
  GitCompare,
  Radio,
  Bell,
  CheckSquare,
  FileSpreadsheet,
  TestTube2,
  Menu,
  X,
  Activity,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import api from '../services/api';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Competitors', path: '/competitors', icon: Users },
  { name: 'Plan Mappings', path: '/plans', icon: GitCompare },
  { name: 'Monitoring Runs', path: '/monitoring', icon: Radio },
  { name: 'Pricing Alerts', path: '/alerts', icon: Bell },
  { name: 'Approval Queue', path: '/approvals', icon: CheckSquare },
  { name: 'Internal Sheet', path: '/internal-sheet', icon: FileSpreadsheet },
  { name: 'Test Results', path: '/tests', icon: TestTube2 },
];

export default function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const location = useLocation();

  const checkHealth = async () => {
    try {
      const res = await api.getHealth();
      setBackendOnline(res.status === 200);
    } catch {
      setBackendOnline(false);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const res = await api.getApprovals({ status: 'pending' });
      if (Array.isArray(res.data)) {
        setPendingApprovalsCount(res.data.filter((a) => a.status === 'pending').length);
      }
    } catch {
      // Ignore background badge error
    }
  };

  useEffect(() => {
    checkHealth();
    fetchPendingCount();
    const interval = setInterval(() => {
      checkHealth();
      fetchPendingCount();
    }, 15000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  // Close mobile menu on navigate
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base leading-tight">PriceWatch AI</h1>
            <p className="text-[10px] text-slate-500 font-medium">Pricing Monitor</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-600 hover:text-slate-900 rounded-lg focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:inset-auto ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Eye className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-slate-900 text-base tracking-tight">PriceWatch AI</h1>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  MVP
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Competitor Pricing Monitor</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0 stroke-[2]" />
                  <span>{item.name}</span>
                </div>
                {item.name === 'Approval Queue' && pendingApprovalsCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-white animate-pulse">
                    {pendingApprovalsCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Safety & Compliance Badge */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 text-xs text-slate-500 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Storefront Safety Rule</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            Read-only external tracking. Never alters your customer-facing pricing.
          </p>
        </div>

        {/* System Health Status Footer */}
        <div className="p-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                backendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            ></span>
            <span className="font-medium text-slate-600">
              {backendOnline ? 'Backend Online' : 'Backend Disconnected'}
            </span>
          </div>
          <button
            onClick={checkHealth}
            title="Refresh connection status"
            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="hidden md:flex bg-white border-b border-slate-200 px-8 py-3.5 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Environment:</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active Session
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500">Autonomous Monitoring & Audit Chain</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span>Target: Up to 10 competitors</span>
            </div>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-blue-600 flex items-center gap-1 font-medium transition-colors"
            >
              <span>API Swagger</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
        ></div>
      )}
    </div>
  );
}
