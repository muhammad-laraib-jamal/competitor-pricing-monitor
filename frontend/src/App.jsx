// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Competitors from './pages/Competitors';
import PlanMappings from './pages/PlanMappings';
import Monitoring from './pages/Monitoring';
import Alerts from './pages/Alerts';
import Approvals from './pages/Approvals';
import InternalSheet from './pages/InternalSheet';
import TestResults from './pages/TestResults';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/competitors" element={<Competitors />} />
          <Route path="/plans" element={<PlanMappings />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/internal-sheet" element={<InternalSheet />} />
          <Route path="/tests" element={<TestResults />} />
          {/* Catch-all redirect to Dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
