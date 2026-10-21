// src/pages/PlanMappings.jsx
import React, { useState, useEffect } from 'react';
import {
  GitCompare,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  Building2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import api from '../services/api';
import PlanMappingForm from '../components/PlanMappingForm';
import { formatCurrency, formatDate } from '../utils/format';

export default function PlanMappings() {
  const [plans, setPlans] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [competitorFilter, setCompetitorFilter] = useState('all');
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, compsRes] = await Promise.all([
        api.getPlans(),
        api.getCompetitors(),
      ]);
      setPlans(plansRes.data || []);
      setCompetitors(compsRes.data || []);
    } catch (err) {
      console.error('Failed to load plan mappings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingPlan(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const handleSave = async (data) => {
    if (editingPlan) {
      await api.updatePlan(editingPlan.id, data);
    } else {
      await api.createPlan(data);
    }
    await loadData();
  };

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await api.deletePlan(id);
      setDeleteConfirmId(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete plan:', err);
    } finally {
      setDeleting(false);
    }
  };

  const filteredPlans = plans.filter((p) => {
    const matchesSearch =
      p.raw_plan_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.canonical_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.competitor_name && p.competitor_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesComp =
      competitorFilter === 'all'
        ? true
        : String(p.competitor_id) === String(competitorFilter);

    return matchesSearch && matchesComp;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Plan Mappings</h2>
            <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-200">
              Normalization Engine
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Map arbitrary competitor plan names to your standardized canonical tiers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            disabled={competitors.length === 0}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all flex items-center gap-2 shadow-xs hover:shadow disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            <span>Add Plan Mapping</span>
          </button>
        </div>
      </div>

      {/* Explainer Callout */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 text-xs text-slate-600">
        <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-slate-800">How Plan Normalization Works:</strong> When competitor websites change wording
          (e.g., from "Basic" to "Starter"), canonical mappings maintain long-term price change tracking and alert thresholds.
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search raw or canonical name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 font-medium">Competitor:</span>
          <select
            value={competitorFilter}
            onChange={(e) => setCompetitorFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Competitors</option>
            {competitors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Plan Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="text-center py-16 px-4">
            <GitCompare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-800">No plan mappings found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {competitors.length === 0
                ? 'Please add at least one competitor before creating plan mappings.'
                : 'Define canonical tiers to normalize scraping results across vendors.'}
            </p>
            {competitors.length > 0 && (
              <button
                onClick={handleOpenAdd}
                className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Plan Mapping</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider text-[11px] font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Competitor</th>
                  <th className="px-6 py-3.5">Raw Plan Name</th>
                  <th className="px-6 py-3.5">Canonical Tier</th>
                  <th className="px-6 py-3.5">Currency</th>
                  <th className="px-6 py-3.5">Billing</th>
                  <th className="px-6 py-3.5">Alert Threshold</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Competitor */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-slate-900">
                          {plan.competitor_name || `Competitor #${plan.competitor_id}`}
                        </span>
                      </div>
                    </td>

                    {/* Raw Plan Name */}
                    <td className="px-6 py-4 font-mono font-medium text-slate-700">
                      {plan.raw_plan_name}
                    </td>

                    {/* Canonical Name */}
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                        {plan.canonical_name}
                      </span>
                    </td>

                    {/* Currency */}
                    <td className="px-6 py-4 font-mono font-bold text-slate-700">
                      {plan.currency || 'INR'}
                    </td>

                    {/* Billing Period */}
                    <td className="px-6 py-4 capitalize">
                      {plan.billing_period || 'monthly'}
                    </td>

                    {/* Alert Threshold */}
                    <td className="px-6 py-4">
                      <span className="font-mono text-slate-700">
                        {plan.alert_threshold ? `≥ ${plan.alert_threshold}%` : 'Any Change (>0%)'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(plan)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit Plan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(plan.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Plan"
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

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-200 space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">Delete Plan Mapping?</h4>
            <p className="text-xs text-slate-500">
              Future scrape checks will not be able to normalize this competitor tier.
            </p>
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
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Mapping Form Modal */}
      <PlanMappingForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        competitors={competitors}
        initialData={editingPlan}
      />
    </div>
  );
}
