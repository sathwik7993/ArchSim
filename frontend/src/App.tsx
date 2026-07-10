import React, { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Workbench } from './pages/Workbench';
import { Problems } from './pages/Problems';
import { useCanvasStore } from './state/canvasStore';
import { useAuth } from './state/auth';

export function App() {
  const theme = useCanvasStore((state) => state.theme);
  const restore = useAuth((state) => state.restore);

  // Apply the active theme to the document root so CSS variables switch across
  // every route (dashboard + workbench share one theme).
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Revalidate a cached session on boot; if valid, pull cloud projects/progress.
  useEffect(() => {
    void restore();
  }, [restore]);

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
