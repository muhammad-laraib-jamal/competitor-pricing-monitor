// src/components/EvidenceViewer.jsx
import React from 'react';
import { ExternalLink, Image as ImageIcon, FileCode, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../utils/format';

export default function EvidenceViewer({ alert, evidence, diffData, isTestCase = false }) {
  // Can be rendered for an alert or a test case evidence
  const sourceUrl = alert?.current_observation?.source_url || alert?.source_url || evidence?.source_url;
  const classificationReason = alert?.classification_reason || alert?.notes || evidence?.comparison_reason;
  const screenshotPath = alert?.current_observation?.evidence_screenshot_path || evidence?.screenshot_path;

  // Diff data parsing
  let diff = diffData;
  if (typeof diff === 'string') {
    try {
      diff = JSON.parse(diff);
    } catch {
      // Keep as string
    }
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4 text-sm">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <h4 className="font-semibold text-slate-800 flex items-center gap-2">
          <FileCode className="w-4 h-4 text-blue-600" />
          Traceable Evidence & Verification Details
        </h4>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>Source Page</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Classification Reason & Audit */}
        <div className="space-y-3">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Detection Classification
            </span>
            <div className="p-3 bg-white rounded border border-slate-200 text-slate-700 leading-relaxed text-xs">
              {classificationReason || 'Standard comparison detected variance beyond configured threshold.'}
            </div>
          </div>

          {alert && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-slate-400 block mb-0.5">Confidence Score</span>
                <span className="font-semibold text-slate-800">
                  {alert.confidence ? `${Math.round(alert.confidence * 100)}%` : '100%'}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-slate-400 block mb-0.5">Verification Mode</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-600" /> Human Gate
                </span>
              </div>
            </div>
          )}

          {/* Structured Side-by-side values */}
          {alert && (
            <div className="p-3 bg-white rounded border border-slate-200 text-xs">
              <span className="text-slate-400 block mb-2 font-medium">Comparison Delta:</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2 rounded">
                  <div className="text-slate-500 text-[11px]">Previous Baseline</div>
                  <div className="font-mono font-medium text-slate-800 text-sm mt-0.5">
                    {alert.previous_price !== null && alert.previous_price !== undefined
                      ? `${formatCurrency(alert.previous_price, alert.previous_currency || 'INR')} / ${alert.previous_billing || 'month'}`
                      : 'None (Initial)'}
                  </div>
                </div>
                <div className="bg-blue-50/50 p-2 rounded border border-blue-100">
                  <div className="text-blue-600 text-[11px] font-medium">New Extracted</div>
                  <div className="font-mono font-semibold text-blue-900 text-sm mt-0.5">
                    {alert.current_price !== null && alert.current_price !== undefined
                      ? `${formatCurrency(alert.current_price, alert.current_currency || 'INR')} / ${alert.current_billing || 'month'}`
                      : (alert.change_type === 'unavailable' ? 'Unavailable / Contact Sales' : 'N/A')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Screenshot & Raw Diff */}
        <div className="space-y-3">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Visual Screenshot Proof
            </span>
            <div className="h-32 bg-slate-900/5 rounded border border-slate-200 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
              <ImageIcon className="w-8 h-8 text-slate-400 mb-1" />
              <span className="text-xs font-medium text-slate-600">
                {screenshotPath ? screenshotPath.split(/[\\/]/).pop() : 'Pricing Page Snapshot'}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                Saved in evidence/ directory with SHA-256 integrity hash
              </span>
            </div>
          </div>

          {diff && (
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                JSON Diff Output
              </span>
              <pre className="p-2.5 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto max-h-36">
                {typeof diff === 'object' ? JSON.stringify(diff, null, 2) : String(diff)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
