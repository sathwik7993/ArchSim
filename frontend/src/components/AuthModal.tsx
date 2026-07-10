import React, { useState } from 'react';
import { useAuth } from '../state/auth';

/**
 * Sign in / create account. On success the auth store pulls the user's cloud
 * projects and progress down and the modal closes. Optional — the app works
 * fully signed out; this just makes work follow you across devices.
 */
export function AuthModal({ onClose }: { onClose: () => void }) {
  const login = useAuth((s) => s.login);
  const register = useAuth((s) => s.register);
  const busy = useAuth((s) => s.busy);
  const error = useAuth((s) => s.error);
  const clearError = useAuth((s) => s.clearError);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const swap = (m: 'login' | 'register') => {
    clearError();
    setMode(m);
  };

  const submit = async () => {
    if (!email.trim() || password.length < 6) return;
    const ok = mode === 'login'
      ? await login(email, password)
      : await register(email, password, displayName);
    if (ok) onClose();
  };

  const canSubmit = email.trim().length > 3 && password.length >= 6 && !busy;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-tabs" role="tablist">
          <button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => swap('login')}>Sign in</button>
          <button role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => swap('register')}>Create account</button>
        </div>

        <p className="modal-copy">
          {mode === 'login'
            ? 'Sign in to sync your designs and practice progress across devices.'
            : 'Create a free account so your designs and progress follow you everywhere.'}
        </p>

        {mode === 'register' && (
          <label className="modal-field">
            <span>Display name <em>(optional)</em></span>
            <input value={displayName} placeholder="Ada Lovelace" onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />
          </label>
        )}

        <label className="modal-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canSubmit && submit()}
            autoComplete="email"
            autoFocus
          />
        </label>

        <label className="modal-field">
          <span>Password <em>(min 6 characters)</em></span>
          <input
            type="password"
            value={password}
            placeholder="••••••••"
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canSubmit && submit()}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>

        {error && <div className="auth-error">{error}</div>}

        <div className="modal-actions">
          <button className="ghost-btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="primary-btn" onClick={submit} disabled={!canSubmit}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </div>
      </div>
    </div>
  );
}
