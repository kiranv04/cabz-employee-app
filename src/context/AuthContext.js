import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppState } from 'react-native';
import { registerLogoutHandler } from '../api/authEvents';
import { router } from 'expo-router';

const TOKEN_KEY = 'employee_auth_token';
const USER_KEY = 'employee_user_data';
const BIOMETRIC_KEY = 'employee_biometric_enabled';

const AuthContext = createContext();

// Cached in memory so the axios interceptor doesn't hit SecureStore on every request.
let cachedToken = null;

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricLocked, setBiometricLocked] = useState(false);

  // Mirrors state for the AppState listener below, which is registered once
  // and would otherwise close over stale values.
  const sessionRef = useRef({ token: null, biometricEnabled: false });

  useEffect(() => {
    async function loadSession() {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedUser = await SecureStore.getItemAsync(USER_KEY);
        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          cachedToken = storedToken;
          setToken(storedToken);
          setUser(parsedUser);

          let enabled = await SecureStore.getItemAsync(BIOMETRIC_KEY);
          if (enabled === null) {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = hasHardware && (await LocalAuthentication.isEnrolledAsync());
            enabled = isEnrolled ? 'true' : 'false';
            await SecureStore.setItemAsync(BIOMETRIC_KEY, enabled);
          }
          const isEnabled = enabled === 'true';
          setBiometricEnabledState(isEnabled);
          setBiometricLocked(isEnabled);
          sessionRef.current = { token: storedToken, biometricEnabled: isEnabled };
        }
      } catch (e) {
        console.error('Failed to load session', e);
        await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
        await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, []);

  useEffect(() => {
    registerLogoutHandler(async () => {
      await logout();
      router.replace('/login');
    });
  }, []);

  // Re-lock behind biometrics whenever the app returns from the background.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && sessionRef.current.token && sessionRef.current.biometricEnabled) {
        setBiometricLocked(true);
      }
    });
    return () => subscription.remove();
  }, []);

  const login = useCallback(async (newToken, userData) => {
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));
    cachedToken = newToken;
    sessionRef.current.token = newToken;
    setToken(newToken);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.error('Failed to clear SecureStore on logout:', error);
    } finally {
      // This ensures the user is logged out in the app's state,
      // even if SecureStore throws an error.
      cachedToken = null;
      sessionRef.current = { token: null, biometricEnabled: false };
      setToken(null);
      setUser(null);
      setBiometricLocked(false);
    }
  }, []);

  const unlockBiometric = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock SmartCabz',
      disableDeviceFallback: false,
    });
    if (result.success) setBiometricLocked(false);
    return result;
  }, []);

  const setBiometricEnabled = useCallback(async (value) => {
    await SecureStore.setItemAsync(BIOMETRIC_KEY, value ? 'true' : 'false');
    sessionRef.current.biometricEnabled = value;
    setBiometricEnabledState(value);
    if (!value) setBiometricLocked(false);
  }, []);

  const value = useMemo(() => ({
    token,
    user,
    isAuthenticated: !!token,
    isLoading,
    biometricEnabled,
    biometricLocked,
    login,
    logout,
    unlockBiometric,
    setBiometricEnabled,
  }), [token, user, isLoading, biometricEnabled, biometricLocked, login, logout, unlockBiometric, setBiometricEnabled]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function getAuthToken() {
  return cachedToken;
}
