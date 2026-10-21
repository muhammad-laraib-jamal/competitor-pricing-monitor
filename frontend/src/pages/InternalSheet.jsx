// src/pages/InternalSheet.jsx
import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldAlert,
  Building2,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';

export default function InternalSheet() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('all');

  const fetchSheet = async () => {
    setLoading(true);
    try {
      const res = await api.getInternalSheet();
      setEntries(res.data || []);
    } catch (err) {
      console.error('Failed to load internal sheet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheet();
  }, []);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await api.exportSheet();
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `internal_price_sheet_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export internal sheet CSV:', err);
    } finally {
      setExporting(false);
    }
  };

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.competitor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.plan_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCurrency =
      currencyFilter === 'all' ? true : entry.currency === currencyFilter;

    return matchesSearch && matchesCurrency;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Internal Price Sheet</h2>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
              Approved Single-Source-of-Truth
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Verified competitive pricing matrix. Updated exclusively through signed human approvals.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchSheet}
            className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Refresh sheet"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={exporting || entries.length === 0}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-all flex items-center gap-2 shadow-2xs disabled:opacity-50"
          >
            {exporting ? (
              <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Download className="w-4 h-4 text-slate-600" />
            )}
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Prominent Architectural Safety Callout */}
      <div className="bg-slate-900 text-slate-100 p-4 rounded-xl flex items-center justify-between gap-4 shadow-sm border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 text-blue-400 rounded-lg">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Internal Monitoring Sheet — Not connected to any storefront
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Data on this sheet serves internal market analysis only. It does NOT publish prices or affect client pricing.
            </p>
          </div>
        </div>
        <span className="hidden md:inline-block text-[11px] font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded">
          AUDIT_ISOLATION_ACTIVE
        </span>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search competitor or plan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 font-medium">Currency:</span>
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Currencies</option>
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>
      </div>

      {/* Sheet Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-800">Internal sheet is empty</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Run monitoring checks and approve price updates to populate and maintain this competitive intelligence sheet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider text-[11px] font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Competitor</th>
                  <th className="px-6 py-3.5">Canonical Plan</th>
                  <th className="px-6 py-3.5">Verified Price</th>
                  <th className="px-6 py-3.5">Billing</th>
                  <th className="px-6 py-3.5">Source URL</th>
                  <th className="px-6 py-3.5">Approval ID</th>
                  <th className="px-6 py-3.5">Updates</th>
                  <th className="px-6 py-3.5">Last Audited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Competitor */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-slate-900">{row.competitor_name}</span>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-800 font-medium">
                        {row.plan_name}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-6 py-4 font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(row.price_amount, row.currency)}
                    </td>

                    {/* Billing */}
                    <td className="px-6 py-4 capitalize font-medium text-slate-700">
                      {row.billing_period || 'monthly'}
                    </td>

                    {/* Source URL */}
                    <td className="px-6 py-4 max-w-xs truncate">
                      <a
                        href={row.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-mono truncate"
                        title={row.source_url}
                      >
                        <span className="truncate">{row.source_url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>

                    {/* Approval ID */}
                    <td className="px-6 py-4">
                      {row.approval_id ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          #{row.approval_id}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">Initial Baseline</span>
                      )}
                    </td>

                    {/* Update count */}
                    <td className="px-6 py-4 font-mono text-slate-600">
                      v{row.update_count || 1}
                    </td>

                    {/* Last Updated */}
                    <td className="px-6 py-4 text-slate-500 font-mono">
                      {formatDate(row.last_updated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
