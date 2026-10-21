// src/components/TestCaseCard.jsx
import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileCode,
  Clock,
  FlaskConical,
} from 'lucide-react';
import { formatDate } from '../utils/format';

export default function TestCaseCard({ testCase }) {
  const [expanded, setExpanded] = useState(false);

  // Parse JSON fields safely
  const parseJson = (val) => {
    if (!val) return null;
    if (typeof val === 'object') return val;
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  };

  const inputData = parseJson(testCase.input_json);
  const expectedData = parseJson(testCase.expected_result_json);
  const actualData = parseJson(testCase.actual_result_json);
  const diffData = parseJson(testCase.diff_json);

  const passed = !!testCase.passed;

  return (
    <div
      className={`bg-white rounded-xl border transition-all duration-150 overflow-hidden shadow-xs hover:shadow-md ${
        passed ? 'border-emerald-200' : 'border-rose-200'
      }`}
    >
      {/* Card Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none hover:bg-slate-50/50"
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-lg mt-0.5 ${
              passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}
          >
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                {testCase.test_case_id}
              </span>
              <h3 className="font-semibold text-slate-900 text-base">
                {testCase.test_name}
              </h3>
            </div>
            {testCase.explanation && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-1 max-w-xl">
                {testCase.explanation}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
              passed
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                : 'bg-rose-50 text-rose-700 border border-rose-300'
            }`}
          >
            {passed ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{passed ? 'PASSED' : 'FAILED'}</span>
          </span>

          <div className="text-xs text-slate-400 flex items-center gap-1 font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDate(testCase.ran_at)}</span>
          </div>

          <button
            type="button"
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Toggle details"
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-slate-200 bg-slate-50 p-5 space-y-4 text-xs">
          {testCase.explanation && (
            <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-700">
              <span className="font-bold text-slate-900 block mb-1">
                Evaluation Notes & Assertion Explanation:
              </span>
              <p className="leading-relaxed">{testCase.explanation}</p>
            </div>
          )}

          {/* Three Column Comparison: Input -> Expected -> Actual */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Input Data */}
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <span className="font-semibold text-slate-700 block mb-1.5 uppercase tracking-wider text-[11px]">
                Input Payload
              </span>
              <pre className="bg-slate-900 text-slate-100 p-2.5 rounded font-mono text-[11px] overflow-x-auto max-h-56">
                {JSON.stringify(inputData, null, 2)}
              </pre>
            </div>

            {/* Expected Result */}
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <span className="font-semibold text-slate-700 block mb-1.5 uppercase tracking-wider text-[11px]">
                Expected Outcome
              </span>
              <pre className="bg-slate-900 text-slate-100 p-2.5 rounded font-mono text-[11px] overflow-x-auto max-h-56">
                {JSON.stringify(expectedData, null, 2)}
              </pre>
            </div>

            {/* Actual Result */}
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <span className="font-semibold text-slate-700 block mb-1.5 uppercase tracking-wider text-[11px]">
                Actual Outcome
              </span>
              <pre
                className={`p-2.5 rounded font-mono text-[11px] overflow-x-auto max-h-56 ${
                  passed
                    ? 'bg-slate-900 text-slate-100'
                    : 'bg-rose-950 text-rose-100 border border-rose-800'
                }`}
              >
                {JSON.stringify(actualData, null, 2)}
              </pre>
            </div>
          </div>

          {/* Diff Data if available */}
          {diffData && (
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <span className="font-semibold text-slate-700 block mb-1.5 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-blue-600" />
                Structured Diff & Field Verification
              </span>
              <pre className="bg-slate-900 text-emerald-400 p-2.5 rounded font-mono text-[11px] overflow-x-auto max-h-48">
                {JSON.stringify(diffData, null, 2)}
              </pre>
            </div>
          )}

          {testCase.evidence_path && (
            <div className="text-[11px] text-slate-500 font-mono">
              Evidence record saved at: <span className="text-slate-700">{testCase.evidence_path}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
