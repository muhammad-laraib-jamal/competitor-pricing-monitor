// src/components/CompetitorForm.jsx
import React, { useState, useEffect } from 'react';
import { X, Globe, Building2, Check, AlertCircle } from 'lucide-react';

export default function CompetitorForm({ isOpen, onClose, onSave, initialData = null }) {
  const [name, setName] = useState('');
  const [pricePageUrl, setPricePageUrl] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setPricePageUrl(initialData.price_page_url || '');
      setEnabled(initialData.enabled !== undefined ? initialData.enabled : true);
    } else {
      setName('');
      setPricePageUrl('');
      setEnabled(true);
    }
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!name.trim()) {
      errs.name = 'Competitor name is required';
    } else if (name.trim().length > 150) {
      errs.name = 'Name must be 150 characters or less';
    }

    if (!pricePageUrl.trim()) {
      errs.pricePageUrl = 'Pricing page URL is required';
    } else {
      try {
        const parsed = new URL(pricePageUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          errs.pricePageUrl = 'URL must start with http:// or https://';
        }
      } catch {
        errs.pricePageUrl = 'Please enter a valid URL (e.g. https://competitor.com/pricing)';
      }
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
        name: name.trim(),
        price_page_url: pricePageUrl.trim(),
        enabled,
      });
      onClose();
    } catch (err) {
      setErrors({ form: err.response?.data?.detail || err.message || 'Failed to save competitor' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-800 text-lg">
              {initialData ? 'Edit Competitor' : 'Add Competitor'}
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
              Competitor Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Acme Cloud Systems"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 ${
                errors.name ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'
              }`}
            />
            {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Pricing Page URL <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Globe className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="https://example.com/pricing"
                value={pricePageUrl}
                onChange={(e) => setPricePageUrl(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 ${
                  errors.pricePageUrl ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'
                }`}
              />
            </div>
            {errors.pricePageUrl && <p className="text-xs text-rose-600 mt-1">{errors.pricePageUrl}</p>}
            <p className="text-[11px] text-slate-400 mt-1">
              Must be the public URL displaying plan pricing tiers.
            </p>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">
                Enable automated monitoring for this competitor
              </span>
            </label>
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
              <span>{initialData ? 'Update Competitor' : 'Save Competitor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
