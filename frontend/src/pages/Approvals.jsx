// src/pages/Approvals.jsx
import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  ShieldCheck,
  RefreshCw,
  History,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle,
} from 'lucide-react';
import api from '../services/api';
import ApprovalCard from '../components/ApprovalCard';

export default function Approvals() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState(null);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await api.getApprovals();
      setApprovals(res.data || []);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleApprove = async (id, data) => {
    try {
      await api.approveAlert(id, {
        decided_by: data.decided_by || 'admin',
        reason: data.reason || 'Approved by operator',
        idempotency_key: `approval-${id}-${Date.now()}`,
      });
      setStatusMessage({
        type: 'success',
        text: `Proposal #${id} approved! Internal price sheet updated and read-back verified.`,
      });
      await fetchApprovals();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to approve proposal.',
      });
    }
  };

  const handleReject = async (id, data) => {
    try {
      await api.rejectAlert(id, {
        decided_by: data.decided_by || 'admin',
        reason: data.reason || 'Rejected by operator',
      });
      setStatusMessage({
        type: 'info',
        text: `Proposal #${id} was rejected. No changes made to internal sheet.`,
      });
      await fetchApprovals();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to reject proposal.',
      });
    }
  };

  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const decidedApprovals = approvals.filter((a) => a.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Human Approval Queue</h2>
            <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
              Human-in-the-Loop Gate
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Review AI-detected competitor price updates before committing them to your internal tracking sheet.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchApprovals}
          className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors self-start sm:self-center"
          title="Refresh approval queue"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Safety Notice */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900">
        <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold">Strict Internal Isolation Guarantee</h4>
          <p className="leading-relaxed">
            Approving an entry here will only update the <strong>Internal Price Sheet</strong>. It will{' '}
            <strong>NEVER</strong> automatically adjust your live storefront, customer checkout prices, or pricing tiers.
          </p>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : statusMessage.type === 'info'
              ? 'bg-slate-100 border-slate-300 text-slate-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-500 hover:text-slate-900 font-semibold underline text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Pending Items Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">Pending Sign-offs</h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {pendingApprovals.length} awaiting review
          </span>
        </div>

        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : pendingApprovals.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-800">Queue is Clear</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are no pending price updates waiting for review. New price discrepancies detected during monitoring runs will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingApprovals.map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </div>

      {/* History Section */}
      {decidedApprovals.length > 0 && (
        <div className="space-y-4 pt-6">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-800 text-base">Audit History & Decisions</h3>
            <span className="text-xs text-slate-400">({decidedApprovals.length} past actions)</span>
          </div>

          <div className="space-y-3">
            {decidedApprovals.map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                onApprove={handleApprove}
                onReject={handleReject}
                isReadOnly={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
