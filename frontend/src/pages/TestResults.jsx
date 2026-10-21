// src/pages/TestResults.jsx
import React, { useState, useEffect } from 'react';
import {
  TestTube2,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FlaskConical,
  ShieldCheck,
  FileCode,
  Sparkles,
} from 'lucide-react';
import api from '../services/api';
import TestCaseCard from '../components/TestCaseCard';
import { formatDate } from '../utils/format';

export default function TestResults() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastExecutedAt, setLastExecutedAt] = useState(null);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const res = await api.getTests();
      setTests(res.data || []);
      if (res.data && res.data.length > 0) {
        setLastExecutedAt(res.data[0].ran_at);
      }
    } catch (err) {
      console.error('Failed to load test cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const handleRunTests = async () => {
    setRunning(true);
    try {
      const res = await api.runTests();
      setTests(res.data || []);
      if (res.data && res.data.length > 0) {
        setLastExecutedAt(res.data[0].ran_at);
      }
    } catch (err) {
      console.error('Failed to execute test suite:', err);
    } finally {
      setRunning(false);
    }
  };

  const totalCount = tests.length;
  const passedCount = tests.filter((t) => t.passed).length;
  const failedCount = totalCount - passedCount;
  const allPassed = totalCount > 0 && failedCount === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Official Test Suite</h2>
            <span className="text-xs bg-purple-50 text-purple-700 font-semibold px-2.5 py-0.5 rounded-full border border-purple-200">
              Deterministic Verification (TC1 – TC4)
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Execute and audit deterministic acceptance tests covering tier change, currency switch, sales gating, and human approval isolation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchTests}
            className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Refresh test results"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleRunTests}
            disabled={running}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all flex items-center gap-2 shadow-xs hover:shadow disabled:opacity-75"
          >
            {running ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>{running ? 'Running Official Suite...' : 'Run All Tests'}</span>
          </button>
        </div>
      </div>

      {/* Test Suite Summary Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-50 rounded-xl">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Test Cases
          </span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block font-mono">
            {totalCount}
          </span>
        </div>

        <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">
            Passed Tests
          </span>
          <span className="text-2xl font-bold text-emerald-700 mt-1 block font-mono">
            {passedCount}
          </span>
        </div>

        <div className="p-4 bg-rose-50/70 border border-rose-100 rounded-xl">
          <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider block">
            Failed Tests
          </span>
          <span className="text-2xl font-bold text-rose-700 mt-1 block font-mono">
            {failedCount}
          </span>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl flex flex-col justify-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Suite Health
          </span>
          {totalCount === 0 ? (
            <span className="text-xs text-slate-400">Awaiting run</span>
          ) : allPassed ? (
            <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>100% Passed</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-rose-700 font-bold text-sm">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Issues Detected</span>
            </div>
          )}
        </div>
      </div>

      {/* Test Specification Blueprint Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
        <div className="font-semibold text-slate-800 flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-purple-600" />
          <span>Hackathon Evaluation Test Scenarios (Deterministic Mocks)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] leading-relaxed">
          <div className="bg-white p-2.5 rounded border border-slate-200">
            <strong>TC1 — Tier Price Change:</strong> ₹999/mo → ₹1,099/mo (+10.01% alert + evidence + unexecuted proposal).
          </div>
          <div className="bg-white p-2.5 rounded border border-slate-200">
            <strong>TC2 — Currency Display Change:</strong> $12/mo → ₹999/mo (no false price change alert, currency change flagged).
          </div>
          <div className="bg-white p-2.5 rounded border border-slate-200">
            <strong>TC3 — Contact Sales Only:</strong> ₹1,999/mo → "Contact Sales" (marked unavailable, no zero price fabricated).
          </div>
          <div className="bg-white p-2.5 rounded border border-slate-200">
            <strong>TC4 — Human Approval Execution:</strong> ₹500/mo → ₹550/mo (human gate verifies internal sheet single update).
          </div>
        </div>
      </div>

      {/* Test Results Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : tests.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 text-center py-16 px-4">
            <FlaskConical className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-800">No test runs found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Click "Run All Tests" above to execute the official test cases against deterministic fixtures.
            </p>
            <button
              onClick={handleRunTests}
              disabled={running}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Run All Tests</span>
            </button>
          </div>
        ) : (
          tests.map((testCase) => (
            <TestCaseCard key={testCase.id || testCase.test_case_id} testCase={testCase} />
          ))
        )}
      </div>
    </div>
  );
}
