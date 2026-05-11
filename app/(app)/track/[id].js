import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { useBooking, useCancelBooking, canCancelBooking, STATUS_CONFIG } from '../../../src/hooks/useBookings';
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

const StatusChip = ({ status }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={13} color={cfg.text} style={{ marginRight: 4 }} />
      <Text style={[styles.statusChipText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-screens
// ─────────────────────────────────────────────────────────────────────────────

// ── Pending state: no driver yet ──────────────────────────────────────────────
const PendingState = ({ booking }) => (
  <View style={styles.waitCard}>
    <View style={styles.waitIconWrap}>
      <Ionicons name="hourglass-outline" size={36} color={colors.primary} />
    </View>
    <Text style={styles.waitTitle}>Looking for a driver…</Text>
    <Text style={styles.waitSubtitle}>
      Your booking has been received. The cab company will assign a driver shortly.
    </Text>
    <View style={styles.waitMeta}>
      <View style={styles.waitMetaRow}>
        <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
        <Text style={styles.waitMetaText} numberOfLines={2}>{booking.pickup_address}</Text>
      </View>
      <View style={styles.waitMetaDivider} />
      <View style={styles.waitMetaRow}>
        <Ionicons name="navigate-outline" size={15} color={colors.textSecondary} />
        <Text style={styles.waitMetaText} numberOfLines={2}>{booking.drop_address}</Text>
      </View>
      <View style={styles.waitMetaDivider} />
      <View style={styles.waitMetaRow}>
        <Ionicons name="calendar-outline" size={15} color={colors.textSecondary} />
        <Text style={styles.waitMetaText}>{formatDateTime(booking.scheduled_at)}</Text>
      </View>
    </View>
  </View>
);

// ── Assigned state: driver info shown, no live map yet ───────────────────────
const AssignedState = ({ booking }) => {
  // console.log('Assigned booking details:', booking); // Debug log to inspect booking data structure
  const driver  = booking.driver;
  const vehicle = booking.vehicle;
  // const vehicleType = booking.rate_card_vehicle.vehicle_type;

  return (
    <View style={styles.assignedCard}>
      <View style={styles.driverRow}>
        <View style={styles.driverAvatar}>
          <Ionicons name="person" size={24} color="#fff" />
        </View>
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{driver?.name ?? '—'}</Text>
          {driver.mobile && (
            <Text style={styles.driverMeta}>{driver.mobile}</Text>
          )}
          <Text style={styles.driverMeta}>Driver assigned</Text>
        </View>
        <StatusChip status="assigned" />
      </View>

      {vehicle && (
        <View style={styles.vehicleRow}>
          <Ionicons name="car-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.vehicleText}>
            · {vehicle.license_plate}
          </Text>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.routeBlock}>
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.routeText} numberOfLines={2}>{booking.pickup_address}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: colors.error ?? '#EF4444' }]} />
          <Text style={styles.routeText} numberOfLines={2}>{booking.drop_address}</Text>
        </View>
      </View>
      <View style={styles.waitMeta}>
        <View style={styles.waitMetaRow}>
          <Ionicons name="calendar-outline" size={15} color={colors.textSecondary} />
          <Text style={styles.waitMetaText}>{formatDateTime(booking.scheduled_at)}</Text>
        </View>
      </View>
      <View style={styles.waitMeta}>
        <View style={styles.waitMetaRow}>
          <Text style={styles.otp}>OTP for driver: </Text>
          <Text style={styles.otp}>{booking.employee.otp}</Text>
        </View>
      </View>
      <View style={styles.mapComingSoon}>
        <Ionicons name="map-outline" size={20} color={colors.textSecondary} />
        <Text style={styles.mapComingSoonText}>Live tracking coming soon</Text>
      </View>
    </View>
  );
};

// ── In Progress state: map shown with mocked driver location ─────────────────
// TODO: Replace MOCK_DRIVER_LOCATION with real Pusher/Reverb WebSocket data
//       Channel: private-booking.{id}
//       Event:   DriverLocationUpdated → { lat, lng, bearing, eta_minutes }
const MOCK_DRIVER_LOCATION = { latitude: 12.9716, longitude: 77.5946 }; // Bengaluru center

const InProgressState = ({ booking }) => {
  const driver  = booking.driver;
  const vehicle = booking.vehicle;

  // Default map region centered on driver mock location
  const region = {
    ...MOCK_DRIVER_LOCATION,
    latitudeDelta:  0.03,
    longitudeDelta: 0.03,
  };

  return (
    <View style={styles.mapContainer}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Mock driver marker — replace lat/lng with Pusher payload when ready */}
        <Marker coordinate={MOCK_DRIVER_LOCATION} title={driver?.name ?? 'Driver'}>
          <View style={styles.driverMarker}>
            <Ionicons name="car" size={18} color="#fff" />
          </View>
        </Marker>
      </MapView>

      {/* Driver info strip over the map */}
      <View style={styles.driverStrip}>
        <View style={styles.driverStripAvatar}>
          <Ionicons name="person" size={18} color="#fff" />
        </View>
        <View style={styles.driverStripInfo}>
          <Text style={styles.driverStripName}>{driver?.name ?? '—'}</Text>
          {vehicle && (
            <Text style={styles.driverStripMeta}>
              {vehicle.make} {vehicle.model} · {vehicle.plate_number}
            </Text>
          )}
        </View>
        <StatusChip status="in_progress" />
      </View>
    </View>
  );
};

// ── Completed / Cancelled state ───────────────────────────────────────────────
const DoneState = ({ booking }) => {
  const cfg = STATUS_CONFIG[booking.status];
  const isDone = booking.status === 'completed';

  return (
    <View style={styles.doneCard}>
      <View style={[styles.doneIconWrap, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={36} color={cfg.text} />
      </View>
      <Text style={styles.doneTitle}>
        {isDone ? 'Trip Completed' : 'Booking Cancelled'}
      </Text>
      <Text style={styles.doneSubtitle}>
        {isDone
          ? 'Your trip has been completed successfully.'
          : 'This booking has been cancelled.'}
      </Text>

      <View style={styles.waitMeta}>
        <View style={styles.waitMetaRow}>
          <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
          <Text style={styles.waitMetaText} numberOfLines={2}>{booking.pickup_address}</Text>
        </View>
        <View style={styles.waitMetaDivider} />
        <View style={styles.waitMetaRow}>
          <Ionicons name="navigate-outline" size={15} color={colors.textSecondary} />
          <Text style={styles.waitMetaText} numberOfLines={2}>{booking.drop_address}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.goHomeBtn} onPress={() => router.replace('/(app)/home')}>
        <Text style={styles.goHomeBtnText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function TrackScreen() {
  const { id } = useLocalSearchParams();
  const { data: booking, isLoading, isError, refetch, isRefetching } = useBooking(id);
  const { mutate: cancel, isPending: cancelling } = useCancelBooking(id);
  console.log('Booking data:', booking);

  const handleCancel = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () =>
            cancel(undefined, {
              onSuccess: () => {},
              onError: (err) => {
                const msg = err?.response?.data?.message ?? 'Could not cancel. Please try again.';
                Alert.alert('Error', msg);
              },
            }),
        },
      ]
    );
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your booking…</Text>
      </View>
    );
  }

  // ── Error ──
  if (isError || !booking) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.errorText}>Could not load booking.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = booking.status;
  const isInProgress = status === 'in_progress';
  const isDone = status === 'completed' || status === 'cancelled';

  return (
    <View style={styles.flex}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(app)/home')}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Track Ride</Text>
          <Text style={styles.headerBookingNum}>#{booking.booking_number}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* ── Content — map fills screen for in_progress, scrollable otherwise ── */}
      {isInProgress ? (
        <>
          <InProgressState booking={booking} />
          {/* Cancel strip below map for assigned/in_progress if applicable */}
        </>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
        >
          {status === 'pending'  && <PendingState  booking={booking} />}
          {status === 'assigned' && <AssignedState booking={booking} />}
          {isDone                && <DoneState     booking={booking} />}
        </ScrollView>
      )}

      {/* ── Cancel button — shown for pending and assigned only ── */}
      {canCancelBooking(status) && (
        <View style={styles.cancelBar}>
          <TouchableOpacity
            style={[styles.cancelBtn, cancelling && styles.cancelBtnDisabled]}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling
              ? <ActivityIndicator color={colors.error ?? '#EF4444'} />
              : (
                <>
                  <Ionicons name="close-circle-outline" size={18} color={colors.error ?? '#EF4444'} style={{ marginRight: 6 }} />
                  <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                </>
              )
            }
          </TouchableOpacity>
        </View>
      )}
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

  scrollContent: { padding: 16, paddingBottom: 32 },

  // ── Pending state ──
  waitCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  waitIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  waitTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  waitSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  waitMeta: {
    width: '100%',
    backgroundColor: colors.background ?? '#F8F9FB',
    borderRadius: 14,
    padding: 14,
    gap: 4,
    marginBottom: 12,
  },
  waitMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
  },
  waitMetaText: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  waitMetaDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 2,
  },

  // ── Assigned state ──
  assignedCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverInfo: { flex: 1 },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  driverMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
    paddingLeft: 2,
  },
  vehicleText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F1F1',
    marginBottom: 14,
  },
  routeBlock: { gap: 4, marginBottom: 16 },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  routeLine: {
    width: 1.5,
    height: 14,
    backgroundColor: '#D1D5DB',
    marginLeft: 4,
    marginVertical: 2,
  },
  routeText: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  mapComingSoon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.background ?? '#F8F9FB',
    borderRadius: 10,
    paddingVertical: 12,
  },
  mapComingSoonText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  // ── In progress / Map ──
  mapContainer: { flex: 1 },
  map:          { flex: 1 },
  driverMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  driverStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  driverStripAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverStripInfo: { flex: 1 },
  driverStripName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  driverStripMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // ── Done state ──
  doneCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  doneIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  doneTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  doneSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  goHomeBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 13,
  },
  goHomeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  // ── Status chip ──
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── Cancel bar ──
  cancelBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F1F1',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.error ?? '#EF4444',
    borderRadius: 14,
    paddingVertical: 13,
  },
  cancelBtnDisabled: { opacity: 0.5 },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.error ?? '#EF4444',
  },
  otp: {
    fontsize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  }
});