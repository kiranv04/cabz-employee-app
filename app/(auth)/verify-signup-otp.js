import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { resendSignupOtp, verifySignupOtp } from '../../src/api/authApi';
import { colors } from '../../src/constants/colors';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifySignupOtpScreen() {
  const { email, companyName, branchName } = useLocalSearchParams();
  const { login } = useAuth();

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const verifyMutation = useMutation({
    mutationFn: () => verifySignupOtp(email, otp),
    onSuccess: async (res) => {
      if (!res.success) {
        setError(res.error);
        return;
      }
      await login(res.data.token, res.data.user);
      router.replace('/(app)/home');
    },
    onError: () => {
      setError('Something went wrong. Please try again.');
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => resendSignupOtp(email),
    onSuccess: (res) => {
      if (!res.success) {
        setError(res.error);
        return;
      }
      setError('');
      setInfo('A new code has been sent to your email.');
      setOtp('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    },
    onError: () => {
      setError('Failed to resend code. Please try again.');
    },
  });

  const handleVerify = () => {
    setError('');
    setInfo('');
    if (otp.length !== 6) {
      setError('Enter the 6-digit code sent to your email.');
      return;
    }
    verifyMutation.mutate();
  };

  const handleResend = () => {
    setError('');
    setInfo('');
    resendMutation.mutate();
  };

  const isPending = verifyMutation.isPending || resendMutation.isPending;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail-open-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit code to{'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>
          {companyName ? (
            <View style={styles.companyBadge}>
              <Ionicons name="business-outline" size={14} color={colors.primary} />
              <Text style={styles.companyBadgeText}>
                {companyName}{branchName ? ` · ${branchName}` : ''}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {info ? (
            <View style={styles.infoBox}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
              <Text style={styles.infoText}>{info}</Text>
            </View>
          ) : null}

          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="------"
            placeholderTextColor={colors.gray300}
            textAlign="center"
            editable={!isPending}
          />

          <TouchableOpacity
            style={[styles.button, (isPending || otp.length !== 6) && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={isPending || otp.length !== 6}
            activeOpacity={0.85}
          >
            {verifyMutation.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Verify & Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResend}
            disabled={isPending || cooldown > 0}
            activeOpacity={0.7}
          >
            {resendMutation.isPending ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={[styles.resendText, cooldown > 0 && styles.resendTextDisabled]}>
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.back()} disabled={isPending}>
          <Text style={styles.footer}>
            Wrong email? <Text style={styles.footerLink}>Go back</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
  },
  emailText: {
    fontWeight: '700',
    color: colors.gray700,
  },
  companyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  companyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    color: colors.success,
    fontSize: 13,
    flex: 1,
  },
  otpInput: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.gray900,
    letterSpacing: 12,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: colors.gray50,
    marginBottom: 20,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  resendButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  resendText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: colors.gray500,
  },
  footer: {
    textAlign: 'center',
    color: colors.gray500,
    fontSize: 13,
    marginTop: 24,
  },
  footerLink: {
    color: colors.primary,
    fontWeight: '700',
  },
});
