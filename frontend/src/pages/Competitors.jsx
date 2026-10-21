// src/pages/Competitors.jsx
import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  ExternalLink,
  Edit2,
  Trash2,
  Power,
  RefreshCw,
  Search,
  AlertTriangle,
  Building2,
  Layers,
} from 'lucide-react';
import api from '../services/api';
import CompetitorForm from '../components/CompetitorForm';
import StatusBadge from '../components/StatusBadge';
import { formatDate } from '../utils/format';

export default function Competitors() {
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleting, setDeleting] = useState(false);

  const fetchCompetitors = async () => {
    setLoading(true);
    try {
      const res = await api.getCompetitors();
      setCompetitors(res.data || []);
    } catch (err) {
      console.error('Failed to load competitors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitors();
  }, []);

  const handleOpenAdd = () => {
    setEditingCompetitor(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (comp) => {
    setEditingCompetitor(comp);
    setIsModalOpen(true);
  };

  const handleSave = async (data) => {
    if (editingCompetitor) {
      await api.updateCompetitor(editingCompetitor.id, data);
    } else {
      await api.createCompetitor(data);
    }
    await fetchCompetitors();
  };

  const handleToggleEnabled = async (comp) => {
    try {
      await api.updateCompetitor(comp.id, { enabled: !comp.enabled });
      setCompetitors((prev) =>
        prev.map((c) => (c.id === comp.id ? { ...c, enabled: !c.enabled } : c))
      );
    } catch (err) {
      console.error('Failed to toggle competitor state:', err);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await api.deleteCompetitor(id);
      setDeleteConfirmId(null);
      await fetchCompetitors();
    } catch (err) {
      console.error('Failed to delete competitor:', err);
    } finally {
      setDeleting(false);
    }
  };

  const filteredCompetitors = competitors.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.price_page_url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'enabled'
        ? c.enabled
        : !c.enabled;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Competitor Directory</h2>
            <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full border border-slate-200">
              {competitors.length} / 10 Target Limit
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configure target competitor pricing URLs and track plan variants.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchCompetitors}
            className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all flex items-center gap-2 shadow-xs hover:shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Add Competitor</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search competitor or URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All ({competitors.length})</option>
            <option value="enabled">Active Only</option>
            <option value="disabled">Disabled Only</option>
          </select>
        </div>
      </div>

      {/* Competitors Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : filteredCompetitors.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-800">No competitors found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'Try adjusting your search filter or clear your criteria.'
                : 'Get started by adding your first competitor pricing page URL.'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleOpenAdd}
                className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Competitor</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider text-[11px] font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Competitor</th>
                  <th className="px-6 py-3.5">Pricing URL</th>
                  <th className="px-6 py-3.5">Plans</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Last Updated</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCompetitors.map((comp) => (
                  <tr key={comp.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
                          {comp.name.substring(0, 2)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block text-sm">
                            {comp.name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            ID: #{comp.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* URL */}
                    <td className="px-6 py-4 max-w-xs">
                      <a
                        href={comp.price_page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-mono truncate"
                        title={comp.price_page_url}
                      >
                        <span className="truncate">{comp.price_page_url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>

                    {/* Plans Count */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
                        <Layers className="w-3 h-3 text-slate-500" />
                        {comp.plans_count || 0} mapped
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(comp)}
                        className="group flex items-center gap-1.5 focus:outline-none"
                        title={comp.enabled ? 'Click to disable monitoring' : 'Click to enable monitoring'}
                      >
                        <StatusBadge
                          status={comp.enabled ? 'active' : 'disabled'}
                          customText={comp.enabled ? 'Active' : 'Disabled'}
                          size="xs"
                        />
                      </button>
                    </td>

                    {/* Last Updated */}
                    <td className="px-6 py-4 text-slate-500 font-mono">
                      {formatDate(comp.updated_at || comp.created_at, false)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleEnabled(comp)}
                          className={`p-1.5 rounded transition-colors ${
                            comp.enabled
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-slate-400 hover:bg-slate-100'
                          }`}
                          title={comp.enabled ? 'Disable monitoring' : 'Enable monitoring'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(comp)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit Competitor"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(comp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Competitor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 rounded-full bg-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Delete Competitor?</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  This will remove the competitor and all associated plan mappings.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-1.5 shadow-xs"
              >
                {deleting && (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Competitor Form Modal */}
      <CompetitorForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingCompetitor}
      />
    </div>
  );
}
