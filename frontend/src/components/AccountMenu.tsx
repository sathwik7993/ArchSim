import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../state/auth';
import { AuthModal } from './AuthModal';

/**
 * Topbar account widget. Signed out: a "Sign in" button. Signed in: an avatar
 * that opens a small menu with the profile and a sign-out action. Drop it into
 * any header — it owns its own modal + dropdown state.
 */
export function AccountMenu() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const [showAuth, setShowAuth] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!user) {
    return (
      <>
        <button className="ghost-btn" onClick={() => setShowAuth(true)}>Sign in</button>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </>
    );
  }

  const label = user.displayName || user.email;
  const initial = (label || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="account-menu" ref={ref}>
      <button className="account-avatar" onClick={() => setOpen((v) => !v)} title={label} aria-label="Account menu">
        {initial}
      </button>
      {open && (
        <div className="account-dropdown" role="menu">
          <div className="account-id">
            <strong>{user.displayName || 'Signed in'}</strong>
            <span>{user.email}</span>
          </div>
          <div className="account-hint">Your designs &amp; progress sync to this account.</div>
          <button className="account-signout" role="menuitem" onClick={() => { setOpen(false); logout(); }}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
