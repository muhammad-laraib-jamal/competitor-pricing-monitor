// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  TrendingUp,
  CheckSquare,
  AlertOctagon,
  Play,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/StatCard';
import AlertRow from '../components/AlertRow';
import { formatDate, formatRelativeTime } from '../utils/format';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monitoringRunning, setMonitoringRunning] = useState(false);
  const [bannerMessage, setBannerMessage] = useState(null);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [statsRes, alertsRes] = await Promise.allSettled([
        api.getDashboardStats(),
        api.getAlerts(),
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      }
      if (alertsRes.status === 'fulfilled') {
        const sorted = (alertsRes.value.data || []).sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setAlerts(sorted.slice(0, 10));
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunMonitoring = async () => {
    setMonitoringRunning(true);
    setBannerMessage(null);
    try {
      const res = await api.runMonitoring({ collector_type: 'mock' });
      setBannerMessage({
        type: 'success',
        text: `Monitoring run completed! ${res.data?.changes_detected || 0} price changes detected across ${res.data?.total_competitors || 0} competitors.`,
      });
      await loadData(true);
    } catch (err) {
      setBannerMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to trigger monitoring run.',
      });
    } finally {
      setMonitoringRunning(false);
    }
  };

  const lastCheckTime = stats?.last_run?.completed_at || stats?.last_run?.started_at;

  return (
    <div className="space-y-6">
      {/* Top Banner Alert (if any) */}
      {bannerMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm transition-all ${
            bannerMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              {bannerMessage.type === 'success' ? 'Success:' : 'Error:'}
            </span>
            <span>{bannerMessage.text}</span>
          </div>
          <button
            onClick={() => setBannerMessage(null)}
            className="text-xs underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Welcome & Quick Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Competitor Pricing Overview
            </h2>
            <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2.5 py-0.5 rounded-full">
              Live Monitor
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time tracking of competitor plan prices, currencies, and automated approval workflows.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            title="Refresh dashboard stats"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/approvals')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-all flex items-center gap-2 shadow-2xs"
          >
            <CheckSquare className="w-4 h-4 text-amber-600" />
            <span>Approvals Queue</span>
            {stats?.pending_approvals > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {stats.pending_approvals}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleRunMonitoring}
            disabled={monitoringRunning}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all flex items-center gap-2 shadow-xs hover:shadow disabled:opacity-75"
          >
            {monitoringRunning ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>{monitoringRunning ? 'Checking Prices...' : 'Run Monitoring Now'}</span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Competitors"
          value={stats ? `${stats.active_competitors ?? stats.total_competitors ?? 0}` : '—'}
          subtitle={`${stats?.total_monitored_plans ?? 0} plans mapped`}
          icon={Users}
          color="blue"
          loading={loading}
        />

        <StatCard
          title="Last Monitored"
          value={lastCheckTime ? formatRelativeTime(lastCheckTime) : 'Never'}
          subtitle={lastCheckTime ? formatDate(lastCheckTime, false) : 'Awaiting initial run'}
          icon={Clock}
          color="slate"
          loading={loading}
        />

        <StatCard
          title="Price Changes"
          value={stats ? stats.total_alerts ?? 0 : '—'}
          subtitle="Genuine price alerts"
          icon={TrendingUp}
          color="amber"
          change={stats?.total_alerts > 0 ? `${stats.total_alerts} detected` : undefined}
          changeType="neutral"
          loading={loading}
        />

        <StatCard
          title="Pending Approvals"
          value={stats ? stats.pending_approvals ?? 0 : '—'}
          subtitle="Human sign-off required"
          icon={CheckSquare}
          color={stats?.pending_approvals > 0 ? 'rose' : 'emerald'}
          loading={loading}
        />

        <StatCard
          title="Failed Checks"
          value={stats?.last_run ? stats.last_run.failed : 0}
          subtitle="Scrape / access errors"
          icon={AlertOctagon}
          color={stats?.last_run?.failed > 0 ? 'rose' : 'emerald'}
          loading={loading}
        />
      </div>

      {/* Safety & Storefront Assurance Banner */}
      <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-white/10 text-emerald-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-white">
              Storefront Price Safety Guarantee
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
              PriceWatch AI monitors competitor pricing for competitive intelligence only. The system is
              architecturally isolated: all approved updates are recorded exclusively into your
              Internal Sheet and can never modify your public storefront or customer checkouts.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/internal-sheet')}
          className="shrink-0 px-4 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-white/20"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>View Internal Sheet</span>
        </button>
      </div>

      {/* Recent Alerts Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Price Change Alerts</h3>
            <p className="text-xs text-slate-500">
              Showing the latest detected tier updates and currency changes with verified evidence.
            </p>
          </div>
          <button
            onClick={() => navigate('/alerts')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>View All Alerts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <Eye className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">No price alerts yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Run your first monitoring check or wait for the scheduled scraper to compare competitor pages.
            </p>
            <button
              onClick={handleRunMonitoring}
              disabled={monitoringRunning}
              className="mt-4 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Monitoring Now</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {alerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} compact={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
