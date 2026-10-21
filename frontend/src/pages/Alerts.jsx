// src/pages/Alerts.jsx
import React, { useState, useEffect } from 'react';
import {
  Bell,
  RefreshCw,
  Search,
  Filter,
  CheckSquare,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import AlertRow from '../components/AlertRow';
import StatusBadge from '../components/StatusBadge';

export default function Alerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.getAlerts();
      setAlerts(res.data || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      (alert.competitor_name && alert.competitor_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (alert.plan_name && alert.plan_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (alert.classification_reason && alert.classification_reason.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ? true : alert.status.toLowerCase() === statusFilter.toLowerCase();

    const matchesType =
      typeFilter === 'all' ? true : alert.change_type.toLowerCase() === typeFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesType;
  });

  const pendingCount = alerts.filter((a) => a.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Price Change Alerts</h2>
            <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
              Audit Log
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Browse all detected price jumps, tier renames, currency adjustments, and plan unavailabilities.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchAlerts}
            className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Refresh alerts"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {pendingCount > 0 && (
            <button
              type="button"
              onClick={() => navigate('/approvals')}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-all flex items-center gap-2 shadow-xs"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Review {pendingCount} Pending Approvals</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search competitor, plan, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="price_change">Price Changes (Orange)</option>
              <option value="currency_change">Currency Changes (Blue)</option>
              <option value="unavailable">Unavailable (Gray)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 text-center py-16 px-4">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-800">No alerts match your criteria</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Run a monitoring check or refine your search query / filters to view historical alerts.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} compact={false} />
          ))
        )}
      </div>
    </div>
  );
}
