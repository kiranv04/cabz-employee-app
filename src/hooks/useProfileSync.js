import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { fetchMe } from '../api/authApi';

// Minimum gap between refreshes, so rapid app switching doesn't spam /me.
const MIN_INTERVAL_MS = 60 * 1000;

/**
 * Keeps the cached profile (branch, department, company, managed branches)
 * in step with the server: refreshes from GET /api/mobile/employees/me when
 * the authenticated app opens and whenever it returns to the foreground.
 * Without this, an admin's change to an employee's branch or department only
 * showed up after a logout/login (Features Item 32).
 */
export function useProfileSync() {
  const { isAuthenticated, biometricLocked, updateUser } = useAuth();
  const lastRun = useRef(0);

  useEffect(() => {
    if (!isAuthenticated || biometricLocked) return;

    const refresh = async () => {
      if (Date.now() - lastRun.current < MIN_INTERVAL_MS) return;
      lastRun.current = Date.now();
      const res = await fetchMe();
      // Failures are silent - the cached profile stays until the next attempt.
      if (res.success) await updateUser(res.data);
    };

    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [isAuthenticated, biometricLocked, updateUser]);
}
