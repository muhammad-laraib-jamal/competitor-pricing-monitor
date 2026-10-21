// src/components/ApprovalCard.jsx
import React, { useState } from 'react';
import {
  Check,
  X,
  ArrowRight,
  ShieldAlert,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/format';
import StatusBadge from './StatusBadge';

export default function ApprovalCard({ approval, onApprove, onReject, isReadOnly = false }) {
  const [confirmingAction, setConfirmingAction] = useState(null); // 'approve' | 'reject' | null
  const [decisionReason, setDecisionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleConfirm = async () => {
    if (!confirmingAction) return;
    setProcessing(true);
    try {
      if (confirmingAction === 'approve') {
        await onApprove(approval.id, {
          reason: decisionReason || 'Approved by operator',
          decided_by: 'admin',
        });
      } else {
        await onReject(approval.id, {
          reason: decisionReason || 'Rejected by operator',
          decided_by: 'admin',
        });
      }
      setConfirmingAction(null);
      setDecisionReason('');
    } finally {
      setProcessing(false);
    }
  };

  const isPending = approval.status === 'pending';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-md transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-slate-900 text-base">
              {approval.competitor_name || `Competitor #${approval.competitor_id || ''}`}
            </h4>
            <span className="text-slate-400">•</span>
            <span className="text-sm font-medium text-slate-600">
              {approval.plan_name || 'Standard Tier'}
            </span>
            <StatusBadge status={approval.status} size="xs" />
          </div>
          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Requested: {formatDate(approval.requested_at)}</span>
          </div>
        </div>

        {approval.execution_status === 'executed' && approval.verified && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verified in Internal Sheet</span>
          </div>
        )}
      </div>

      {/* Comparison Grid */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Current Sheet Value
          </span>
          <div className="font-mono text-base font-medium text-slate-700">
            {approval.previous_sheet_price !== null && approval.previous_sheet_price !== undefined
              ? `${formatCurrency(approval.previous_sheet_price, approval.previous_sheet_currency || 'INR')}`
              : 'Unset / Initial Entry'}
          </div>
        </div>

        <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100">
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider block mb-1">
            Proposed New Value
          </span>
          <div className="font-mono text-base font-bold text-blue-900">
            {formatCurrency(approval.proposed_price, approval.proposed_currency || 'INR')}
            <span className="text-xs text-blue-600 font-sans font-normal ml-1">
              / {approval.proposed_billing || 'month'}
            </span>
          </div>
        </div>
      </div>

      {/* Evidence & Rationale */}
      <div className="mt-3 p-3 bg-slate-50/70 rounded-lg border border-slate-200/60 text-xs text-slate-600 space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-700">Impact Statement:</span>
          <span className="text-[11px] font-mono text-slate-400">
            Action: update_internal_sheet
          </span>
        </div>
        <p className="leading-relaxed">
          Approving this proposal will update the internal competitive monitoring sheet with the audited price.
          <strong className="text-slate-800 font-semibold"> No storefront prices will ever be changed.</strong>
        </p>
      </div>

      {/* History notes if decided */}
      {!isPending && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Decided by: <strong className="text-slate-700">{approval.decided_by || 'admin'}</strong>
            </span>
          </div>
          {approval.decided_at && (
            <span>Decided on: {formatDate(approval.decided_at)}</span>
          )}
          {approval.reason && (
            <div className="w-full text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 italic">
              "{approval.reason}"
            </div>
          )}
        </div>
      )}

      {/* Interactive Controls (For Pending items) */}
      {isPending && !isReadOnly && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          {confirmingAction ? (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>
                  Confirm {confirmingAction === 'approve' ? 'Approval' : 'Rejection'}:
                </span>
              </div>
              <input
                type="text"
                placeholder="Operational justification / note (optional)"
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => setConfirmingAction(null)}
                  className="px-3 py-1 text-xs font-medium text-slate-600 bg-slate-200 hover:bg-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={handleConfirm}
                  className={`px-3 py-1 text-xs font-medium text-white rounded flex items-center gap-1.5 ${
                    confirmingAction === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {processing ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : confirmingAction === 'approve' ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <X className="w-3 h-3" />
                  )}
                  <span>
                    Yes, {confirmingAction === 'approve' ? 'Approve Update' : 'Reject Alert'}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingAction('reject')}
                className="px-3.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmingAction('approve')}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Update</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
