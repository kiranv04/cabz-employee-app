import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useBookingDetail, STATUS_CONFIG, TRIP_TYPE_LABELS } from '../../../src/hooks/useBookings';
import { colors } from '../../../src/constants/colors';

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
// Small components
// ─────────────────────────────────────────────────────────────────────────────
const DetailRow = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIconWrap}>
      <Ionicons name={icon} size={16} color={colors.primary} />
    </View>
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value ?? '—'}</Text>
    </View>
  </View>
);

const SectionHeader = ({ title }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function TripDetailScreen() {
  const { id } = useLocalSearchParams();
  const { data: booking, isLoading, isError, isRefetching, refetch } = useBookingDetail(id);

  // ── Loading ──
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading trip details…</Text>
      </View>
    );
  }

  // ── Error ──
  if (isError || !booking) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.errorText}>Could not load trip details.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cfg     = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.completed;
  const driver  = booking.driver;
  const vehicle = booking.vehicle;
  // const vehicleType = booking.rate_card_vehicle.vehicle_type;

  return (
    <View style={styles.flex}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Trip Details</Text>
          <Text style={styles.headerBookingNum}>#{booking.booking_number}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}        // Android
            tintColor={colors.primary}       // iOS
          />
        }
      >

        {/* ── Status banner ── */}
        <View style={[styles.statusBanner, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={20} color={cfg.text} />
          <Text style={[styles.statusBannerText, { color: cfg.text }]}>{cfg.label}</Text>
        </View>

        {/* ── Route card ── */}
        <View style={styles.card}>
          <SectionHeader title="Route" />
          <View style={styles.routeBlock}>
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
              <View style={styles.routeTextWrap}>
                <Text style={styles.routeLabel}>Pickup</Text>
                <Text style={styles.routeAddress}>{booking.pickup_address}</Text>
              </View>
            </View>
            <View style={styles.routeConnector} />
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, { backgroundColor: colors.error ?? '#EF4444' }]} />
              <View style={styles.routeTextWrap}>
                <Text style={styles.routeLabel}>Drop</Text>
                <Text style={styles.routeAddress}>{booking.drop_address}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Trip info card ── */}
        <View style={styles.card}>
          <SectionHeader title="Trip Info" />
          <DetailRow
            icon="swap-horizontal-outline"
            label="Trip Type"
            value={TRIP_TYPE_LABELS[booking.trip_type] ?? booking.trip_type}
          />
          {/* <DetailRow
            icon="car-outline"
            label="Vehicle Type"
            value={vehicleType.name}
          /> */}
          {/* <DetailRow
            icon="calendar-outline"
            label="Scheduled"
            value={formatDateTime(booking.scheduled_at)}
          />   */}
          {booking.trip_type === 'outstation' && (
            <>
              <DetailRow
                icon="map-outline"
                label="Journey Start"
                value={formatDateTime(booking.started_at)}
              />
              <DetailRow
                icon="moon-outline"
                label="Journey End"
                value={formatDateTime(booking.completed_at)}
              />
            </>
          )}
        </View>

        {/* ── Driver & vehicle card — only if assigned ── */}
        {(driver || vehicle) && (
          <View style={styles.card}>
            <SectionHeader title="Driver & Vehicle" />
            {driver && (
              <View style={styles.driverRow}>
                <View style={styles.driverAvatar}>
                  <Ionicons name="person" size={20} color="#fff" />
                </View>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{driver.name}</Text>
                  {driver.mobile && (
                    <Text style={styles.driverMeta}>{driver.mobile}</Text>
                  )}
                </View>
              </View>
            )}
            {vehicle && (
              <DetailRow
                icon="car-sport-outline"
                label="Vehicle"
                value={`${vehicle.license_plate}`}
              />
            )}
          </View>
        )}

        {/* ── Notes / Instructions — only if present ── */}
        {(booking.instructions || booking.notes) && (
          <View style={styles.card}>
            <SectionHeader title="Notes" />
            {booking.instructions && (
              <DetailRow
                icon="chatbox-ellipses-outline"
                label="Instructions"
                value={booking.instructions}
              />
            )}
            {booking.notes && (
              <DetailRow
                icon="document-text-outline"
                label="Notes"
                value={booking.notes}
              />
            )}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background ?? '#F8F9FB' },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  errorText:   { fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  retryBtnText: { color: '#fff', fontWeight: '600' },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.background ?? '#F8F9FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerBookingNum: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  headerRight: { width: 40 },

  scrollContent: { padding: 16, paddingBottom: 40 },

  // ── Status banner ──
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  statusBannerText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Card ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 14,
  },

  // ── Route ──
  routeBlock: { gap: 0 },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  routeConnector: {
    width: 1.5,
    height: 20,
    backgroundColor: '#D1D5DB',
    marginLeft: 4,
    marginVertical: 3,
  },
  routeTextWrap: { flex: 1, paddingBottom: 4 },
  routeLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  routeAddress: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },

  // ── Detail row ──
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: 12,
  },
  detailIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: { flex: 1 },
  detailLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },

  // ── Driver row ──
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverInfo: { flex: 1 },
  driverName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  driverMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  bottomSpacer: { height: 20 },
});