// src/components/StatCard.jsx
import React from 'react';

const COLOR_MAP = {
  blue: {
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-100 text-blue-600',
    border: 'border-blue-100',
    accent: 'text-blue-600',
  },
  emerald: {
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-100 text-emerald-600',
    border: 'border-emerald-100',
    accent: 'text-emerald-600',
  },
  amber: {
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100 text-amber-600',
    border: 'border-amber-100',
    accent: 'text-amber-600',
  },
  rose: {
    bg: 'bg-rose-50',
    iconBg: 'bg-rose-100 text-rose-600',
    border: 'border-rose-100',
    accent: 'text-rose-600',
  },
  purple: {
    bg: 'bg-purple-50',
    iconBg: 'bg-purple-100 text-purple-600',
    border: 'border-purple-100',
    accent: 'text-purple-600',
  },
  slate: {
    bg: 'bg-slate-50',
    iconBg: 'bg-slate-100 text-slate-600',
    border: 'border-slate-200',
    accent: 'text-slate-600',
  },
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  change,
  changeType = 'neutral', // 'positive' | 'negative' | 'neutral'
  color = 'blue',
  loading = false,
}) {
  const scheme = COLOR_MAP[color] || COLOR_MAP.blue;

  if (loading) {
    return (
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-slate-200 rounded w-24"></div>
          <div className="w-10 h-10 rounded-lg bg-slate-200"></div>
        </div>
        <div className="mt-4 h-8 bg-slate-200 rounded w-16"></div>
        <div className="mt-2 h-3 bg-slate-100 rounded w-32"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${scheme.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl font-bold text-slate-900 tracking-tight">
          {value !== undefined && value !== null ? value : '—'}
        </div>
        {change && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              changeType === 'positive'
                ? 'bg-emerald-50 text-emerald-700'
                : changeType === 'negative'
                ? 'bg-rose-50 text-rose-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {change}
          </span>
        )}
      </div>

      {subtitle && (
        <div className="mt-1 text-xs text-slate-500 font-normal truncate">
          {subtitle}
        </div>
      )}
    </div>
  );
}
