import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../src/context/AuthContext';
import {
  useActiveBooking,
  useRecentBookings,
  canCancelBooking,
  STATUS_CONFIG,
  TRIP_TYPE_LABELS,
  bookingKeys,
} from '../../src/hooks/useBookings';
import { colors } from '../../src/constants/colors';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

const formatDateOnly = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Status Chip
// ─────────────────────────────────────────────────────────────────────────────
const StatusChip = ({ status }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={11} color={cfg.text} style={{ marginRight: 3 }} />
      <Text style={[styles.statusChipText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Active Booking Card
// ─────────────────────────────────────────────────────────────────────────────
const ActiveBookingCard = ({ booking }) => {
  return (
    <View style={styles.activeCard}>
      {/* Top row: trip type + status */}
      <View style={styles.activeCardHeader}>
        <View style={styles.activeCardTripType}>
          <Ionicons name="car-outline" size={14} color={colors.primary} style={{ marginRight: 5 }} />
          <Text style={styles.activeCardTripTypeText}>
            {TRIP_TYPE_LABELS[booking.trip_type] ?? booking.trip_type}
          </Text>
        </View>
        <StatusChip status={booking.status} />
      </View>

      {/* Route */}
      <View style={styles.activeCardRoute}>
        <View style={styles.activeRouteRow}>
          <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.activeRouteText} numberOfLines={1}>
            {booking.pickup_address}
          </Text>
        </View>
        <View style={styles.activeRouteLine} />
        <View style={styles.activeRouteRow}>
          <View style={[styles.routeDot, { backgroundColor: colors.error ?? '#EF4444' }]} />
          <Text style={styles.activeRouteText} numberOfLines={1}>
            {booking.drop_address}
          </Text>
        </View>
      </View>

      {/* Scheduled time */}
      <View style={styles.activeCardMeta}>
        <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
        <Text style={styles.activeCardMetaText}>{formatDateTime(booking.scheduled_at)}</Text>
      </View>

      {/* CTAs */}
      <View style={styles.activeCardActions}>
        <TouchableOpacity
          style={styles.trackBtn}
          onPress={() => router.push(`/track/${booking.id}`)}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.trackBtnText}>Track Ride</Text>
        </TouchableOpacity>

        {/* Cancel shortcut — only for pending/assigned */}
        {canCancelBooking(booking.status) && (
          <TouchableOpacity
            style={styles.cancelShortcutBtn}
            onPress={() => router.push(`/track/${booking.id}`)}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelShortcutText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// No Active Booking — empty state
// ─────────────────────────────────────────────────────────────────────────────
const NoActiveBooking = () => (
  <View style={styles.emptyActiveCard}>
    <View style={styles.emptyActiveIcon}>
      <Ionicons name="car-outline" size={28} color={colors.primary} />
    </View>
    <View style={styles.emptyActiveText}>
      <Text style={styles.emptyActiveTitle}>No active ride</Text>
      <Text style={styles.emptyActiveSub}>Book a cab to get started</Text>
    </View>
    <TouchableOpacity
      style={styles.bookNowBtn}
      onPress={() => router.push('/(app)/book-cab')}
      activeOpacity={0.85}
    >
      <Text style={styles.bookNowBtnText}>Book</Text>
    </TouchableOpacity>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// Recent Trip Card
// ─────────────────────────────────────────────────────────────────────────────
const RecentTripCard = ({ booking }) => (
  <TouchableOpacity
    style={styles.recentCard}
    onPress={() => router.push(`/trip/${booking.id}`)}
    activeOpacity={0.75}
  >
    <View style={styles.recentCardLeft}>
      <View style={styles.recentIconWrap}>
        <Ionicons name="time-outline" size={18} color={colors.primary} />
      </View>
      <View style={styles.recentCardInfo}>
        <Text style={styles.recentCardRoute} numberOfLines={1}>
          {booking.pickup_address} → {booking.drop_address}
        </Text>
        <Text style={styles.recentCardDate}>{formatDateOnly(booking.scheduled_at)}</Text>
      </View>
    </View>
    <View style={styles.recentCardRight}>
      <StatusChip status={booking.status} />
      <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} style={{ marginTop: 6 }} />
    </View>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: activeBooking,
    isLoading: loadingActive,
    isError: errorActive,
  } = useActiveBooking();

  const {
    data: recentBookings = [],
    isLoading: loadingRecent,
    isError: errorRecent,
  } = useRecentBookings();

  const employee   = user?.employee;
  const costCenter = employee?.cost_center;
  const company    = costCenter?.branch?.company;

  // Pull-to-refresh invalidates both queries
  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: bookingKeys.list({ status: 'active', per_page: 1 }) }),
      queryClient.invalidateQueries({ queryKey: bookingKeys.list({ status: 'completed', per_page: 3 }) }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >

      {/* ── Top bar: company context ── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Ionicons name="business-outline" size={13} color={colors.primary} style={{ marginRight: 5 }} />
          <Text style={styles.topBarText} numberOfLines={1}>
            {company?.name ?? '—'} · {costCenter?.name ?? '—'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(app)/profile')}>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarSmallText}>
              {user?.name?.charAt(0).toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Greeting ── */}
      <View style={styles.greetingBlock}>
        <Text style={styles.greeting}>{getGreeting()},</Text>
        <Text style={styles.greetingName}>{user?.name?.split(' ')[0]} 👋</Text>
      </View>

      {/* ── Book a Cab CTA ── */}
      <TouchableOpacity
        style={styles.bookCabCta}
        onPress={() => router.push('/(app)/book-cab')}
        activeOpacity={0.88}
      >
        <View style={styles.bookCabCtaLeft}>
          <Text style={styles.bookCabCtaTitle}>Need a ride?</Text>
          <Text style={styles.bookCabCtaSub}>Schedule a cab for your next trip</Text>
        </View>
        <View style={styles.bookCabCtaIcon}>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* ── Active Booking ── */}
      <Text style={styles.sectionTitle}>Current Booking</Text>

      {loadingActive ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : errorActive ? (
        <View style={styles.loadingCard}>
          <Text style={styles.errorText}>Could not load booking.</Text>
        </View>
      ) : activeBooking ? (
        <ActiveBookingCard booking={activeBooking} />
      ) : (
        <NoActiveBooking />
      )}

      {/* ── Recent Trips ── */}
      <View style={styles.recentHeader}>
        <Text style={styles.sectionTitle}>Recent Trips</Text>
        {recentBookings.length > 0 && (
          <TouchableOpacity onPress={() => router.push('/(app)/history')}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        )}
      </View>

      {loadingRecent ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : errorRecent ? (
        <View style={styles.loadingCard}>
          <Text style={styles.errorText}>Could not load recent trips.</Text>
        </View>
      ) : recentBookings.length > 0 ? (
        <View style={styles.recentList}>
          {recentBookings.map((b) => (
            <RecentTripCard key={b.id} booking={b} />
          ))}
        </View>
      ) : (
        <View style={styles.emptyRecentCard}>
          <Ionicons name="receipt-outline" size={32} color={colors.textSecondary} />
          <Text style={styles.emptyRecentText}>No trips yet</Text>
          <Text style={styles.emptyRecentSub}>Your completed trips will appear here</Text>
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Need React for useState (pull-to-refresh)
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.background ?? '#F8F9FB' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },

  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 4,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  topBarText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmallText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  // ── Greeting ──
  greetingBlock: { marginTop: 20, marginBottom: 20 },
  greeting: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 2,
  },

  // ── Book CTA banner ──
  bookCabCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 18,
    marginBottom: 28,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bookCabCtaLeft: { flex: 1 },
  bookCabCtaTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  bookCabCtaSub: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginTop: 3,
  },
  bookCabCtaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Section title ──
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.2,
  },

  // ── Loading / error card ──
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  errorText: { fontSize: 13, color: colors.textSecondary },

  // ── Active booking card ──
  activeCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  activeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  activeCardTripType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeCardTripTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  activeCardRoute: { marginBottom: 12 },
  activeRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 3,
  },
  routeDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  activeRouteLine: {
    width: 1.5,
    height: 12,
    backgroundColor: '#D1D5DB',
    marginLeft: 4,
  },
  activeRouteText: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  activeCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 14,
  },
  activeCardMetaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  activeCardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  trackBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  trackBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelShortcutBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelShortcutText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // ── Empty active card ──
  emptyActiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyActiveIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emptyActiveText: { flex: 1 },
  emptyActiveTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyActiveSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bookNowBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  bookNowBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // ── Recent trips ──
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  recentList: { gap: 10, marginBottom: 8 },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  recentCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  recentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentCardInfo: { flex: 1 },
  recentCardRoute: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  recentCardDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 3,
  },
  recentCardRight: {
    alignItems: 'flex-end',
    gap: 2,
  },

  // ── Status chip ──
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── Empty recent ──
  emptyRecentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyRecentText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
  },
  emptyRecentSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  bottomSpacer: { height: 20 },
});