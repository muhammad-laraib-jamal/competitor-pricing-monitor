// src/components/PlanMappingForm.jsx
import React, { useState, useEffect } from 'react';
import { X, GitCompare, Check, AlertCircle } from 'lucide-react';

export default function PlanMappingForm({
  isOpen,
  onClose,
  onSave,
  competitors = [],
  initialData = null,
}) {
  const [competitorId, setCompetitorId] = useState('');
  const [rawPlanName, setRawPlanName] = useState('');
  const [canonicalName, setCanonicalName] = useState('');
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [currency, setCurrency] = useState('INR');
  const [alertThreshold, setAlertThreshold] = useState(0.0);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setCompetitorId(initialData.competitor_id || '');
      setRawPlanName(initialData.raw_plan_name || '');
      setCanonicalName(initialData.canonical_name || '');
      setBillingPeriod(initialData.billing_period || 'monthly');
      setCurrency(initialData.currency || 'INR');
      setAlertThreshold(initialData.alert_threshold !== undefined ? initialData.alert_threshold : 0.0);
      setNotes(initialData.notes || '');
    } else {
      setCompetitorId(competitors.length > 0 ? competitors[0].id : '');
      setRawPlanName('');
      setCanonicalName('');
      setBillingPeriod('monthly');
      setCurrency('INR');
      setAlertThreshold(0.0);
      setNotes('');
    }
    setErrors({});
  }, [initialData, isOpen, competitors]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!competitorId) {
      errs.competitorId = 'Please select a competitor';
    }
    if (!rawPlanName.trim()) {
      errs.rawPlanName = 'Competitor plan name is required';
    }
    if (!canonicalName.trim()) {
      errs.canonicalName = 'Canonical internal tier name is required';
    }
    if (alertThreshold < 0) {
      errs.alertThreshold = 'Threshold cannot be negative';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSave({
        competitor_id: Number(competitorId),
        raw_plan_name: rawPlanName.trim(),
        canonical_name: canonicalName.trim(),
        billing_period: billingPeriod,
        currency: currency,
        alert_threshold: Number(alertThreshold) || 0.0,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err) {
      setErrors({ form: err.response?.data?.detail || err.message || 'Failed to save plan mapping' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-800 text-lg">
              {initialData ? 'Edit Plan Mapping' : 'Add Plan Mapping'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.form && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.form}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Competitor <span className="text-rose-500">*</span>
            </label>
            <select
              value={competitorId}
              onChange={(e) => setCompetitorId(e.target.value)}
              disabled={!!initialData}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 ${
                errors.competitorId ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'
              }`}
            >
              <option value="">Select a Competitor</option>
              {competitors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.competitorId && <p className="text-xs text-rose-600 mt-1">{errors.competitorId}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Raw Plan Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Starter Plan"
                value={rawPlanName}
                onChange={(e) => setRawPlanName(e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 ${
                  errors.rawPlanName ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'
                }`}
              />
              {errors.rawPlanName && <p className="text-xs text-rose-600 mt-1">{errors.rawPlanName}</p>}
              <p className="text-[11px] text-slate-400 mt-1">Exact name on competitor page</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Canonical Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Basic Tier"
                value={canonicalName}
                onChange={(e) => setCanonicalName(e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 ${
                  errors.canonicalName ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'
                }`}
              />
              {errors.canonicalName && <p className="text-xs text-rose-600 mt-1">{errors.canonicalName}</p>}
              <p className="text-[11px] text-slate-400 mt-1">Normalized internal tier name</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Billing
              </label>
              <select
                value={billingPeriod}
                onChange={(e) => setBillingPeriod(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
                <option value="quarterly">Quarterly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Min % Alert
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Internal Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Tier matches our Starter package"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs hover:shadow transition-all flex items-center gap-2"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{initialData ? 'Update Plan Mapping' : 'Save Plan Mapping'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
