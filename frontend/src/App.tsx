import React, { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Workbench } from './pages/Workbench';
import { Problems } from './pages/Problems';
import { useCanvasStore } from './state/canvasStore';

export function App() {
  const theme = useCanvasStore((state) => state.theme);

  // Apply the active theme to the document root so CSS variables switch across
  // every route (dashboard + workbench share one theme).
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/problems" element={<Problems />} />
      <Route path="/design/:projectId" element={<Workbench />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
