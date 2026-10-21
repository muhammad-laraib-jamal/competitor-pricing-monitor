// src/components/AlertRow.jsx
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ArrowRight, Clock, Building2 } from 'lucide-react';
import StatusBadge from './StatusBadge';
import EvidenceViewer from './EvidenceViewer';
import { formatCurrency, formatPercentage, formatDate } from '../utils/format';

export default function AlertRow({ alert, compact = false }) {
  const [expanded, setExpanded] = useState(false);

  // Determine row accent or indicator based on change_type
  const typeColors = {
    price_change: 'border-l-4 border-l-amber-500',
    currency_change: 'border-l-4 border-l-blue-500',
    unavailable: 'border-l-4 border-l-slate-400',
    no_change: 'border-l-4 border-l-emerald-500',
  };

  const borderClass = typeColors[alert.change_type] || 'border-l-4 border-l-slate-300';

  return (
    <div className={`bg-white border border-slate-200 rounded-lg overflow-hidden transition-all duration-150 ${borderClass} hover:border-slate-300 shadow-sm`}>
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none hover:bg-slate-50/70"
      >
        {/* Left: Competitor and Plan */}
        <div className="flex items-start gap-3 min-w-[200px]">
          <div className="p-2 rounded-lg bg-slate-100 text-slate-600 mt-0.5">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-sm">
                {alert.competitor_name || `Competitor #${alert.competitor_id}`}
              </span>
              <StatusBadge type={alert.change_type} size="xs" />
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium">
              Plan: <span className="text-slate-700">{alert.plan_name || 'Standard Plan'}</span>
            </div>
          </div>
        </div>

        {/* Center: Price Delta */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-400 font-medium">Previous</div>
            <div className="text-sm font-semibold text-slate-600 font-mono">
              {alert.previous_price !== null && alert.previous_price !== undefined
                ? formatCurrency(alert.previous_price, alert.previous_currency || 'INR')
                : '—'}
            </div>
          </div>

          <div className="text-slate-300">
            <ArrowRight className="w-4 h-4" />
          </div>

          <div>
            <div className="text-xs text-slate-400 font-medium">Current</div>
            <div className="text-sm font-bold text-slate-900 font-mono">
              {alert.current_price !== null && alert.current_price !== undefined
                ? formatCurrency(alert.current_price, alert.current_currency || 'INR')
                : (alert.change_type === 'unavailable' ? 'Contact Sales' : '—')}
            </div>
          </div>

          {alert.percentage_change !== null && alert.percentage_change !== undefined && (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-1 ${
                alert.percentage_change > 0
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : alert.percentage_change < 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {formatPercentage(alert.percentage_change)}
            </span>
          )}
        </div>

        {/* Right: Status, Timestamp & Expand Toggle */}
        <div className="flex items-center justify-between md:justify-end gap-3 min-w-[200px]">
          <StatusBadge status={alert.status} size="sm" />
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatDate(alert.created_at, !compact)}</span>
          </div>
          <button
            type="button"
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Expand alert"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Details Section */}
      {expanded && (
        <div className="border-t border-slate-200 p-4 bg-slate-50/50">
          <EvidenceViewer alert={alert} diffData={alert.classification_reason} />
        </div>
      )}
    </div>
  );
}
