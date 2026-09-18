import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../constants/colors';

export default function BiometricLockScreen() {
  const { unlockBiometric, logout } = useAuth();
  const [error, setError] = useState(null);

  const attempt = useCallback(async () => {
    setError(null);
    const result = await unlockBiometric();
    if (!result.success && result.error !== 'user_cancel') {
      setError('Authentication failed. Please try again.');
    }
  }, [unlockBiometric]);

  useEffect(() => {
    attempt();
  }, [attempt]);

  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed" size={48} color={colors.primary} />
      <Text style={styles.title}>Unlock SmartCabz</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={attempt}>
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={logout}>
        <Text style={styles.logout}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  error: {
    color: colors.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonText: {
    color: colors.white,
    fontWeight: '600',
  },
  logout: {
    color: colors.textSecondary,
    marginTop: 20,
    textDecorationLine: 'underline',
  },
});
