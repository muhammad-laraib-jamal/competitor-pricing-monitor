// src/services/api.js
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  // System / Health
  getHealth: () => api.get('/health'),

  // Competitors
  getCompetitors: () => api.get('/competitors'),
  getCompetitor: (id) => api.get(`/competitors/${id}`),
  createCompetitor: (data) => api.post('/competitors', data),
  updateCompetitor: (id, data) => api.put(`/competitors/${id}`, data),
  deleteCompetitor: (id) => api.delete(`/competitors/${id}`),

  // Plan Mappings
  getPlans: (params) => api.get('/plans', { params }),
  getPlan: (id) => api.get(`/plans/${id}`),
  createPlan: (data) => api.post('/plans', data),
  updatePlan: (id, data) => api.put(`/plans/${id}`, data),
  deletePlan: (id) => api.delete(`/plans/${id}`),

  // Monitoring
  runMonitoring: (data) => api.post('/monitoring/run', data || {}),
  getMonitoringRuns: () => api.get('/monitoring/runs'),
  getMonitoringRun: (id) => api.get(`/monitoring/runs/${id}`),

  // Observations
  getObservations: (params) => api.get('/observations', { params }),

  // Alerts
  getAlerts: (params) => api.get('/alerts', { params }),
  getAlert: (id) => api.get(`/alerts/${id}`),
  getEvidence: (id) => api.get(`/evidence/${id}`),

  // Approvals
  getApprovals: (params) => api.get('/approvals', { params }),
  approveAlert: (id, data) => api.post(`/approvals/${id}/approve`, data || {}),
  rejectAlert: (id, data) => api.post(`/approvals/${id}/reject`, data || {}),

  // Internal Sheet
  getInternalSheet: () => api.get('/internal-sheet'),
  exportSheet: () => api.get('/internal-sheet/export', { responseType: 'blob' }),

  // Official Tests
  getTests: () => api.get('/tests'),
  runTests: () => api.post('/tests/run'),
  getTest: (id) => api.get(`/tests/${id}`),

  // Dashboard Stats
  getDashboardStats: () => api.get('/dashboard/stats'),
};

export default apiService;
