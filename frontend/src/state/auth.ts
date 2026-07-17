import { create } from 'zustand';
import { api, setAccessToken, getAccessToken, type CurrentUser } from '../api/client';
import { useWorkspace } from './workspace';
import { useProgress } from './progress';

// ---------------------------------------------------------------------------
// Phase 10 — accounts. Sign-in is optional (the app stays local-first), but when
// a student signs in their projects and practice progress sync to the backend so
// they survive across devices. The token + a lightweight user profile are cached
// in localStorage so a reload restores the session instantly, then `restore()`
// revalidates against the server in the background.
// ---------------------------------------------------------------------------

const USER_KEY = 'archsim.user';

function readUser(): CurrentUser | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as CurrentUser) : null;
  } catch {
    return null;
  }
}
function writeUser(user: CurrentUser | null) {
  if (typeof localStorage === 'undefined') return;
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

// After a successful sign-in, pull the user's cloud state down and merge it with
// whatever they built locally while signed out.
async function afterSignIn() {
  await Promise.allSettled([
    useWorkspace.getState().syncFromServer(),
    useProgress.getState().hydrateFromServer(),
  ]);
}

interface AuthState {
  user: CurrentUser | null;
  status: 'anonymous' | 'authenticated';
  busy: boolean;
  error: string | null;
  register: (email: string, password: string, displayName: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  /** Revalidate a cached token on app boot; sync if still valid. */
  restore: () => Promise<void>;
  clearError: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: readUser(),
  status: getAccessToken() && readUser() ? 'authenticated' : 'anonymous',
  busy: false,
  error: null,

  register: async (email, password, displayName) => {
    set({ busy: true, error: null });
    try {
      const r = await api.register(email.trim(), password, displayName.trim() || email.split('@')[0]);
      setAccessToken(r.accessToken);
      const user = { userId: r.userId, email: r.email, displayName: r.displayName };
      writeUser(user);
      set({ user, status: 'authenticated', busy: false });
      await afterSignIn();
      return true;
    } catch (e) {
      const msg = e instanceof Error && /409|already/i.test(e.message)
        ? 'That email is already registered — try signing in.'
        : 'Could not create your account. Is the backend running?';
      set({ busy: false, error: msg });
      return false;
    }
  },

  login: async (email, password) => {
    set({ busy: true, error: null });
    try {
      const r = await api.login(email.trim(), password);
      setAccessToken(r.accessToken);
      const user = { userId: r.userId, email: r.email, displayName: r.displayName };
      writeUser(user);
      set({ user, status: 'authenticated', busy: false });
      await afterSignIn();
      return true;
    } catch (e) {
      const msg = e instanceof Error && /401|invalid/i.test(e.message)
        ? 'Wrong email or password.'
        : 'Could not sign in. Is the backend running?';
      set({ busy: false, error: msg });
      return false;
    }
  },

  logout: () => {
    // Best-effort server-side revocation (while the token is still present),
    // so the token can't be reused if it leaked. Ignore failures — sign-out
    // must always succeed locally.
    if (getAccessToken()) {
      void api.logout().catch(() => {});
    }
    setAccessToken('');
    writeUser(null);
    set({ user: null, status: 'anonymous', error: null });
    // Local projects/progress stay in localStorage — the app remains usable
    // signed out; they'll re-merge on the next sign-in.
  },

  restore: async () => {
    if (!getAccessToken()) return;
    try {
      const user = await api.me();
      writeUser(user);
      set({ user, status: 'authenticated' });
      await afterSignIn();
    } catch {
      // Token expired or invalid — drop it silently, stay anonymous/local.
      setAccessToken('');
      writeUser(null);
      set({ user: null, status: 'anonymous' });
    }
  },

  clearError: () => set({ error: null }),
}));
