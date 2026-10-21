// src/components/StatusBadge.jsx
import React from 'react';

const BADGE_STYLES = {
  // Alert types
  price_change: 'bg-amber-50 text-amber-700 border-amber-200',
  currency_change: 'bg-blue-50 text-blue-700 border-blue-200',
  unavailable: 'bg-slate-100 text-slate-700 border-slate-300',
  no_change: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  uncertain: 'bg-purple-50 text-purple-700 border-purple-200',

  // Approval / Alert Statuses
  pending: 'bg-amber-50 text-amber-700 border-amber-300',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  rejected: 'bg-rose-50 text-rose-700 border-rose-300',

  // Competitor Statuses
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  enabled: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  disabled: 'bg-slate-100 text-slate-600 border-slate-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',

  // Monitoring run statuses
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  running: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',

  // Test statuses
  passed: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  pass: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  failed_test: 'bg-rose-50 text-rose-700 border-rose-300',
  fail: 'bg-rose-50 text-rose-700 border-rose-300',
};

export default function StatusBadge({ status, type, size = 'sm', customText }) {
  const key = (type || status || '').toLowerCase().replace(/\s+/g, '_');
  const style = BADGE_STYLES[key] || 'bg-slate-100 text-slate-700 border-slate-200';

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  }[size] || 'px-2.5 py-0.5 text-xs';

  const displayText = customText || (status || type || 'Unknown').replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-full capitalize select-none ${sizeClasses} ${style}`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-70"></span>
      {displayText}
    </span>
  );
}
