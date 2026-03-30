import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';

import {
  useBookings,
  STATUS_CONFIG,
  TRIP_TYPE_LABELS,
} from '../../src/hooks/useBookings';
import { colors } from '../../src/constants/colors';

// ─────────────────────────────────────────────────────────────────────────────
// Filter tabs config
// ─────────────────────────────────────────────────────────────────────────────
const FILTERS = [
  { label: 'All',         value: null },
  { label: 'Pending',     value: 'pending' },
  { label: 'Assigned',    value: 'assigned' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed',   value: 'completed' },
  { label: 'Cancelled',   value: 'cancelled' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const formatDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
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
// Booking Card
// ─────────────────────────────────────────────────────────────────────────────
const BookingCard = ({ booking }) => {
  const isActive = ['pending', 'assigned', 'in_progress'].includes(booking.status);

  const handlePress = () => {
    if (isActive) {
      router.push(`/track/${booking.id}`);
    } else {
      router.push(`/trip/${booking.id}`);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      {/* Top row: booking number + status */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.bookingNumber}>#{booking.booking_number}</Text>
          <Text style={styles.tripType}>
            {TRIP_TYPE_LABELS[booking.trip_type] ?? booking.trip_type}
          </Text>
        </View>
        <StatusChip status={booking.status} />
      </View>

      {/* Route */}
      <View style={styles.routeBlock}>
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.routeText} numberOfLines={1}>
            {booking.pickup_address}
          </Text>
        </View>
        <View style={styles.routeConnector} />
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: colors.error ?? '#EF4444' }]} />
          <Text style={styles.routeText} numberOfLines={1}>
            {booking.drop_address}
          </Text>
        </View>
      </View>

      {/* Footer: date + chevron */}
      <View style={styles.cardFooter}>
        <View style={styles.cardFooterLeft}>
          <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
          <Text style={styles.cardFooterDate}>{formatDateTime(booking.scheduled_at)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────────────────────────
const EmptyState = ({ activeFilter }) => (
  <View style={styles.emptyState}>
    <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
    <Text style={styles.emptyTitle}>No bookings found</Text>
    <Text style={styles.emptySub}>
      {activeFilter
        ? `You have no ${activeFilter.replace('_', ' ')} bookings.`
        : 'Your booking history will appear here.'}
    </Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// Footer — loading more indicator
// ─────────────────────────────────────────────────────────────────────────────
const ListFooter = ({ isFetchingNextPage }) => {
  if (!isFetchingNextPage) return <View style={styles.listFooterSpacer} />;
  return (
    <View style={styles.listFooter}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.listFooterText}>Loading more…</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function HistoryScreen() {
  const [activeFilter, setActiveFilter] = useState(null);

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBookings({ status: activeFilter });

  const bookings = data?.bookings ?? [];

  // ── Pull to refresh ──
  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // ── Infinite scroll trigger ──
  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ── Filter change — reset happens automatically via new queryKey ──
  const handleFilterChange = (value) => {
    setActiveFilter(value);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.flex}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Booking History</Text>
        <Text style={styles.headerSub}>
          {!isLoading && !isError
            ? `${bookings.length} booking${bookings.length !== 1 ? 's' : ''} shown`
            : ' '}
        </Text>
      </View>

      {/* ── Filter tabs ── */}
      <View style={styles.filterWrapper}>
        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(f) => String(f.value)}
          contentContainerStyle={styles.filterList}
          renderItem={({ item: f }) => {
            const selected = activeFilter === f.value;
            return (
              <TouchableOpacity
                style={[styles.filterTab, selected && styles.filterTabSelected]}
                onPress={() => handleFilterChange(f.value)}
                activeOpacity={0.75}
              >
                {selected && f.value !== null && (
                  <View
                    style={[
                      styles.filterDot,
                      { backgroundColor: STATUS_CONFIG[f.value]?.text ?? colors.primary },
                    ]}
                  />
                )}
                <Text style={[styles.filterTabText, selected && styles.filterTabTextSelected]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── Content ── */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading bookings…</Text>
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.errorText}>Could not load bookings.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <BookingCard booking={item} />}
          contentContainerStyle={[
            styles.listContent,
            bookings.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<EmptyState activeFilter={activeFilter} />}
          ListFooterComponent={
            <ListFooter isFetchingNextPage={isFetchingNextPage} />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background ?? '#F8F9FB' },

  // ── Header ──
  header: {
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },

  // ── Filter tabs ──
  filterWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  filterList: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: colors.background ?? '#F8F9FB',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  filterTabSelected: {
    backgroundColor: colors.primary + '12',
    borderColor: colors.primary,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTabTextSelected: {
    color: colors.primary,
  },

  // ── Centered states ──
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: { fontSize: 14, color: colors.textSecondary },
  errorText:   { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  retryBtnText: { color: '#fff', fontWeight: '600' },

  // ── List ──
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  listContentEmpty: {
    flex: 1,
  },
  separator: { height: 10 },

  // ── Booking card ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardHeaderLeft: { gap: 2 },
  bookingNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  tripType: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // ── Route ──
  routeBlock: { marginBottom: 12 },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeConnector: {
    width: 1.5,
    height: 10,
    backgroundColor: '#D1D5DB',
    marginLeft: 3,
    marginVertical: 2,
  },
  routeText: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },

  // ── Card footer ──
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  cardFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardFooterDate: {
    fontSize: 11,
    color: colors.textSecondary,
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

  // ── Empty state ──
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── List footer ──
  listFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  listFooterText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  listFooterSpacer: { height: 20 },
});