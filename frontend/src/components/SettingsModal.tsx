import React, { useState } from 'react';
import { useAiSettings, GEMINI_MODELS } from '../ai/settings';

/**
 * Google Gemini bring-your-own-key settings. The key is stored only in the
 * browser and sent per-request to our backend proxy (never stored server-side).
 */
export function SettingsModal({ onClose }: { onClose: () => void }) {
  const apiKey = useAiSettings((s) => s.apiKey);
  const model = useAiSettings((s) => s.model);
  const setApiKey = useAiSettings((s) => s.setApiKey);
  const setModel = useAiSettings((s) => s.setModel);

  const [show, setShow] = useState(false);
  const isCustom = !GEMINI_MODELS.some((m) => m.id === model);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">AI evaluation settings</h2>
        <p className="modal-copy">
          Evaluation uses your own free <strong>Google Gemini</strong> API key. Get one at{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="source-link">aistudio.google.com/apikey</a>{' '}
          — it stays in your browser and is only sent to our proxy to call Gemini.
        </p>

        <label className="modal-field">
          <span>Gemini API key <em>(starts with AIza)</em></span>
          <div className="key-row">
            <input
              type={show ? 'text' : 'password'}
              value={apiKey}
              placeholder="AIza…"
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
            <button className="ghost-btn" type="button" onClick={() => setShow((v) => !v)}>{show ? 'Hide' : 'Show'}</button>
          </div>
        </label>

        <label className="modal-field">
          <span>Model</span>
          <select className="topic-select" value={isCustom ? '__custom' : model} onChange={(e) => e.target.value !== '__custom' && setModel(e.target.value)}>
            {GEMINI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label} — {m.note}</option>
            ))}
            <option value="__custom">Custom…</option>
          </select>
        </label>

        {isCustom && (
          <label className="modal-field">
            <span>Custom model id</span>
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="publisher/model-name" />
          </label>
        )}

        <div className="modal-actions">
          <button className="primary-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
