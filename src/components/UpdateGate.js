import { useCallback, useEffect, useState } from 'react';
import { AppState, View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';

const APP = 'employee';

// True when version a is older than b ("1.0.2" < "1.1").
const isOlder = (a, b) => {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d < 0;
  }
  return false;
};

// Blocks the whole app when it is older than the minimum version set in the
// admin Settings page. A failed check never blocks (offline use must work).
export default function UpdateGate({ children }) {
  const [required, setRequired] = useState(null);

  const check = useCallback(async () => {
    try {
      const { data } = await api.get('/api/public/app-version', { params: { app: APP } });
      const min = data?.data?.min_version;
      const current = Constants.expoConfig?.version;
      setRequired(min && current && isOlder(current, min) ? { url: data.data.update_url } : null);
    } catch {
      // keep the last known state
    }
  }, []);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', s => s === 'active' && check());
    return () => sub.remove();
  }, [check]);

  if (!required) return children;

  return (
    <View style={styles.wrap}>
      <Ionicons name="cloud-download-outline" size={64} color="#2563eb" />
      <Text style={styles.title}>Update required</Text>
      <Text style={styles.body}>
        A new version of SmartCabz is available. Please update the app to continue.
      </Text>
      {!!required.url && (
        <TouchableOpacity style={styles.button} onPress={() => Linking.openURL(required.url)}>
          <Text style={styles.buttonText}>Update now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 20 },
  body: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginTop: 10, lineHeight: 22 },
  button: { marginTop: 28, paddingVertical: 14, paddingHorizontal: 36, borderRadius: 14, backgroundColor: '#2563eb' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
