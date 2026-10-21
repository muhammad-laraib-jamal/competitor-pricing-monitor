// src/pages/Monitoring.jsx
import React, { useState, useEffect } from 'react';
import {
  Radio,
  Play,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { formatDate, formatRelativeTime } from '../utils/format';

export default function Monitoring() {
  const [collectorMode, setCollectorMode] = useState('mock');
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [expandedRunId, setExpandedRunId] = useState(null);
  const [runDetails, setRunDetails] = useState({});
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const res = await api.getMonitoringRuns();
      setRuns(res.data || []);
    } catch (err) {
      console.error('Failed to load monitoring runs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleRunMonitoring = async () => {
    setRunning(true);
    setLastResult(null);
    try {
      const res = await api.runMonitoring({ collector_type: collectorMode });
      setLastResult({
        success: true,
        data: res.data,
      });
      await fetchRuns();
    } catch (err) {
      setLastResult({
        success: false,
        error: err.response?.data?.detail || err.message || 'Monitoring run failed.',
      });
    } finally {
      setRunning(false);
    }
  };

  const handleToggleExpandRun = async (runId) => {
    if (expandedRunId === runId) {
      setExpandedRunId(null);
      return;
    }

    setExpandedRunId(runId);
    if (!runDetails[runId]) {
      setLoadingDetail(true);
      try {
        const res = await api.getMonitoringRun(runId);
        setRunDetails((prev) => ({ ...prev, [runId]: res.data }));
      } catch (err) {
        console.error('Failed to fetch run details:', err);
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Trigger Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Monitoring Engine</h2>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
              Collector Active
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Trigger deterministic pricing checks across all active competitors and view execution audits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-600 border border-slate-200">
            <button
              type="button"
              onClick={() => setCollectorMode('mock')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                collectorMode === 'mock'
                  ? 'bg-white text-blue-700 shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              Mock (TC1-TC4)
            </button>
            <button
              type="button"
              onClick={() => setCollectorMode('http')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                collectorMode === 'http'
                  ? 'bg-white text-blue-700 shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              Live Web (HTTP/BS4)
            </button>
          </div>

          <button
            type="button"
            onClick={fetchRuns}
            className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Refresh history"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleRunMonitoring}
            disabled={running}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all flex items-center gap-2 shadow-xs hover:shadow disabled:opacity-75"
          >
            {running ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>
              {running
                ? 'Running Scrape & Compare...'
                : collectorMode === 'http'
                ? 'Run Live Web Scrape'
                : 'Run Monitoring Now'}
            </span>
          </button>
        </div>
      </div>

      {/* Latest Run Result Feedback Banner */}
      {lastResult && (
        <div
          className={`p-5 rounded-2xl border shadow-xs transition-all ${
            lastResult.success
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/80 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-start gap-3">
            {lastResult.success ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
            )}
            <div className="space-y-1">
              <h4 className="font-bold text-sm">
                {lastResult.success ? 'Monitoring Run Succeeded' : 'Monitoring Run Error'}
              </h4>
              <p className="text-xs opacity-90 leading-relaxed">
                {lastResult.success
                  ? `Completed execution across ${lastResult.data?.total_competitors || 0} competitors. Detected ${lastResult.data?.changes_detected || 0} price changes.`
                  : lastResult.error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Monitoring Runs History List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-slate-800 text-sm">Execution History</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {runs.length} runs recorded
          </span>
        </div>

        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Radio className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-800">No monitoring runs recorded yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Execute your first check using the button above to observe pricing data and detect alerts.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {runs.map((run) => {
              const isExpanded = expandedRunId === run.id;
              const detail = runDetails[run.id];

              return (
                <div key={run.id} className="transition-colors hover:bg-slate-50/40">
                  <div
                    onClick={() => handleToggleExpandRun(run.id)}
                    className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none"
                  >
                    {/* Run Identification */}
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600 mt-0.5">
                        <Radio className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800 text-sm">
                            Run #{run.id}
                          </span>
                          <StatusBadge status={run.status} size="xs" />
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                            Mode: {run.collector_type || 'mock'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Started: {formatDate(run.started_at)}</span>
                          {run.completed_at && (
                            <>
                              <span>•</span>
                              <span>Finished: {formatRelativeTime(run.completed_at)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Metrics Summary */}
                    <div className="flex items-center gap-6 text-xs">
                      <div>
                        <span className="text-slate-400 block font-medium">Checked</span>
                        <span className="font-bold text-slate-800 text-sm font-mono">
                          {run.total_competitors}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block font-medium">Successful</span>
                        <span className="font-bold text-emerald-600 text-sm font-mono">
                          {run.successful}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block font-medium">Changes</span>
                        <span className="font-bold text-amber-600 text-sm font-mono flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {run.changes_detected}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block font-medium">Failed</span>
                        <span
                          className={`font-bold text-sm font-mono ${
                            run.failed > 0 ? 'text-rose-600' : 'text-slate-500'
                          }`}
                        >
                          {run.failed}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/80 p-5 space-y-4 text-xs">
                      {loadingDetail && !detail ? (
                        <div className="py-4 text-center text-slate-400">Loading run observations...</div>
                      ) : detail ? (
                        <div className="space-y-4">
                          {/* Observations summary table */}
                          <div>
                            <h5 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-blue-600" />
                              Extracted Price Observations ({detail.observations?.length || 0})
                            </h5>
                            {detail.observations && detail.observations.length > 0 ? (
                              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                <table className="w-full text-left">
                                  <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-500 border-b border-slate-200">
                                    <tr>
                                      <th className="px-4 py-2">Competitor</th>
                                      <th className="px-4 py-2">Plan</th>
                                      <th className="px-4 py-2">Extracted Price</th>
                                      <th className="px-4 py-2">Currency</th>
                                      <th className="px-4 py-2">Billing</th>
                                      <th className="px-4 py-2">Method</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-mono">
                                    {detail.observations.map((obs) => (
                                      <tr key={obs.id}>
                                        <td className="px-4 py-2 text-slate-800 font-sans font-medium">
                                          {obs.competitor_name || `Comp #${obs.competitor_id}`}
                                        </td>
                                        <td className="px-4 py-2 text-slate-700">{obs.raw_plan_name}</td>
                                        <td className="px-4 py-2 font-bold text-slate-900">
                                          {obs.price_amount !== null && obs.price_amount !== undefined
                                            ? obs.price_amount
                                            : obs.raw_price_text || 'Unavailable'}
                                        </td>
                                        <td className="px-4 py-2 text-slate-600">{obs.currency || 'INR'}</td>
                                        <td className="px-4 py-2 text-slate-600">{obs.billing_period || 'monthly'}</td>
                                        <td className="px-4 py-2 text-slate-500 font-sans text-[11px]">
                                          {obs.extraction_method || 'regex'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-slate-400 italic">No observations captured in this run.</p>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
