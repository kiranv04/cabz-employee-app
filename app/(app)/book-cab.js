import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Linking,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useAuth } from '../../src/context/AuthContext';
import { useVehicleTypes, useCreateBooking, buildBookingPayload, TRIP_TYPES } from '../../src/hooks/useBookings';
import { colors } from '../../src/constants/colors';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const MAX_SCHEDULE_DAYS = 20;

const TRIP_TYPE_META = {
  local:          { icon: 'car-outline',       description: 'Within city limits' },
  outstation:     { icon: 'map-outline',        description: 'Multi-day intercity trip' },
  airport_pickup: { icon: 'airplane-outline',   description: 'Pick up from airport' },
  airport_drop:   { icon: 'airplane-outline',   description: 'Drop to airport' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Small reusable sub-components
// ─────────────────────────────────────────────────────────────────────────────
const SectionLabel = ({ children, required }) => (
  <Text style={styles.sectionLabel}>
    {children}
    {required && <Text style={styles.required}> *</Text>}
  </Text>
);

const FieldError = ({ message }) =>
  message ? <Text style={styles.fieldError}>{message}</Text> : null;

// Formats a JS Date to "YYYY-MM-DDTHH:mm:ss" in local time — no UTC conversion
const formatLocalISO = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function BookCabScreen() {
  const { user } = useAuth();
  const companyId = user?.employee.owner_id;
  const { data: vehicleTypes = [], isLoading: loadingVehicles } = useVehicleTypes(companyId);
  const { mutate: createBooking, isPending: isSubmitting } = useCreateBooking();
  
  // console.log('Veh types', vehicleTypes); // Debug log to inspect user data structure

  // ── Form state ──────────────────────────────────────────────────────────────
  const [tripType, setTripType]               = useState(null);
  const [vehicleTypeId, setVehicleTypeId]     = useState(null);
  const [pickupAddress, setPickupAddress]     = useState('');
  const [dropAddress, setDropAddress]         = useState('');
  const [scheduledAt, setScheduledAt]         = useState(null);  // JS Date
  const [estimatedDays, setEstimatedDays]     = useState('');
  const [estimatedKms, setEstimatedKms]       = useState('');
  const [instructions, setInstructions]       = useState('');
  const [notes, setNotes]                     = useState('');

  // ── UI state ────────────────────────────────────────────────────────────────
  const [fetchingGps, setFetchingGps]         = useState(false);
  const [showDatePicker, setShowDatePicker]   = useState(false);
  const [showTimePicker, setShowTimePicker]   = useState(false);
  const [pickerTempDate, setPickerTempDate]   = useState(new Date());
  const [errors, setErrors]                   = useState({});

  // Reset form every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setTripType(null);
      setVehicleTypeId(null);
      setPickupAddress('');
      setDropAddress('');
      setScheduledAt(null);
      setEstimatedDays('');
      setEstimatedKms('');
      setInstructions('');
      setNotes('');
      setErrors({});
    }, [])
  );

  // ── GPS pickup ──────────────────────────────────────────────────────────────
  const handleGpsPickup = useCallback(async () => {
    setFetchingGps(true);
    try {
      // Step 1 — check current status without triggering a dialog
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();

      if (status !== 'granted') {
        if (canAskAgain) {
          // First time or session reset — ask normally
          const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
          if (newStatus !== 'granted') {
            setFetchingGps(false);
            return; // They just denied it — stay silent, let them type manually
          }
        } else {
          // Permanently denied — send them to Settings
          Alert.alert(
            'Location Permission Required',
            'Location access is blocked. Please enable it in Settings to use auto-detect.',
            [
              { text: 'Not Now', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
          setFetchingGps(false);
          return;
        }
      }

      // Step 2 — permission is granted, fetch location
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (place) {
        const parts = [place.name, place.street, place.district, place.city, place.region]
          .filter(Boolean);
        setPickupAddress(parts.join(', '));
        setErrors((e) => ({ ...e, pickupAddress: undefined }));
      }
    } catch {
      Alert.alert('Error', 'Could not fetch your location. Please enter manually.');
    } finally {
      setFetchingGps(false);
    }
  }, []);

  // ── Date / Time picker handlers ─────────────────────────────────────────────
  const minDate = new Date();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + MAX_SCHEDULE_DAYS);

  const onDateChange = (_, selected) => {
    setShowDatePicker(false);
    if (!selected) return;
    // Clamp to range
    const clamped = selected < minDate ? minDate : selected > maxDate ? maxDate : selected;
    setPickerTempDate(clamped);
    // Now open time picker
    setShowTimePicker(true);
  };

  const onTimeChange = (_, selected) => {
    setShowTimePicker(false);
    if (!selected) return;
    // Merge date from pickerTempDate + time from selected
    const merged = new Date(pickerTempDate);
    merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    // Must be in the future
    if (merged <= new Date()) {
      Alert.alert('Invalid Time', 'Please pick a future date and time.');
      return;
    }
    setScheduledAt(merged);
    setErrors((e) => ({ ...e, scheduledAt: undefined }));
  };

  const formattedDateTime = scheduledAt
    ? scheduledAt.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : null;

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!tripType)         e.tripType       = 'Please select a trip type.';
    if (!vehicleTypeId)    e.vehicleTypeId  = 'Please select a vehicle type.';
    if (!pickupAddress.trim()) e.pickupAddress = 'Pickup address is required.';
    if (!dropAddress.trim())   e.dropAddress   = 'Drop address is required.';
    if (!scheduledAt)          e.scheduledAt   = 'Please select date and time.';
    if (tripType === 'outstation') {
      if (!estimatedDays || isNaN(Number(estimatedDays)) || Number(estimatedDays) < 1)
        e.estimatedDays = 'Enter number of days (min 1).';
      if (!estimatedKms || isNaN(Number(estimatedKms)) || Number(estimatedKms) < 1)
        e.estimatedKms  = 'Enter estimated kilometres (min 1).';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    setErrors({});
    if (!validate()) return;

    const form = {
      trip_type:       tripType,
      vehicle_type_id: vehicleTypeId,
      pickup_address:  pickupAddress.trim(),
      drop_address:    dropAddress.trim(),
      scheduled_at:    formatLocalISO(scheduledAt),
      instructions:    instructions.trim(),
      notes:           notes.trim(),
      ...(tripType === 'outstation' && {
        estimated_days: Number(estimatedDays),
        estimated_kms:  Number(estimatedKms),
      }),
    };

    const payload = buildBookingPayload(user, form);

    createBooking(payload, {
      onSuccess: (response) => {
        const bookingId = response?.data?.id;

        if (!bookingId) {
          Alert.alert('Booking Created', 'Booking was created but we could not redirect. Please check your home screen.');
          router.replace('/(app)/home');
          return;
        }
        router.replace(`/track/${bookingId}`);
      },
      onError: (err) => {
        const msg = err?.response?.data?.message ?? 'Something went wrong. Please try again.';
        Alert.alert('Booking Failed', msg);
      },
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book a Cab</Text>
          <View style={styles.headerRight} />
        </View>

        {/* ── Booking for card ── */}
        <View style={styles.passengerCard}>
          <View style={styles.passengerAvatar}>
            <Text style={styles.passengerAvatarText}>
              {user?.name?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.passengerInfo}>
            <Text style={styles.passengerName}>{user?.name}</Text>
            <Text style={styles.passengerMeta}>
              {user?.employee?.position} · {user?.employee?.department}
            </Text>
          </View>
          <View style={styles.passengerBadge}>
            <Text style={styles.passengerBadgeText}>Booking for self</Text>
          </View>
        </View>

        {/* ── Trip Type ── */}
        <View style={styles.section}>
          <SectionLabel required>Trip Type</SectionLabel>
          <View style={styles.tripTypeGrid}>
            {TRIP_TYPES.map((t) => {
              const meta = TRIP_TYPE_META[t.value];
              const selected = tripType === t.value;
              return (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.tripTypeCard, selected && styles.tripTypeCardSelected]}
                  onPress={() => {
                    setTripType(t.value);
                    setErrors((e) => ({ ...e, tripType: undefined }));
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={meta.icon}
                    size={22}
                    color={selected ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.tripTypeLabel, selected && styles.tripTypeLabelSelected]}>
                    {t.label}
                  </Text>
                  <Text style={[styles.tripTypeDesc, selected && styles.tripTypeDescSelected]}>
                    {meta.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <FieldError message={errors.tripType} />
        </View>

        {/* ── Outstation extras ── */}
        {tripType === 'outstation' && (
          <View style={styles.section}>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <SectionLabel required>Est. Days</SectionLabel>
                <TextInput
                  style={[styles.input, errors.estimatedDays && styles.inputError]}
                  placeholder="e.g. 2"
                  placeholderTextColor={colors.textHint}
                  keyboardType="number-pad"
                  value={estimatedDays}
                  onChangeText={(v) => {
                    setEstimatedDays(v);
                    setErrors((e) => ({ ...e, estimatedDays: undefined }));
                  }}
                />
                <FieldError message={errors.estimatedDays} />
              </View>
              <View style={styles.halfField}>
                <SectionLabel required>Est. Kilometres</SectionLabel>
                <TextInput
                  style={[styles.input, errors.estimatedKms && styles.inputError]}
                  placeholder="e.g. 350"
                  placeholderTextColor={colors.textHint}
                  keyboardType="number-pad"
                  value={estimatedKms}
                  onChangeText={(v) => {
                    setEstimatedKms(v);
                    setErrors((e) => ({ ...e, estimatedKms: undefined }));
                  }}
                />
                <FieldError message={errors.estimatedKms} />
              </View>
            </View>
          </View>
        )}

        {/* ── Vehicle Type ── */}
        <View style={styles.section}>
          <SectionLabel required>Vehicle Type</SectionLabel>
          {loadingVehicles ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll}>
              {vehicleTypes.map((v) => {
                const selected = vehicleTypeId === v.id;
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.vehicleChip, selected && styles.vehicleChipSelected]}
                    onPress={() => {
                      setVehicleTypeId(v.id);
                      setErrors((e) => ({ ...e, vehicleTypeId: undefined }));
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="car-sport-outline"
                      size={16}
                      color={selected ? '#fff' : colors.textSecondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.vehicleChipText, selected && styles.vehicleChipTextSelected]}>
                      {v.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
          <FieldError message={errors.vehicleTypeId} />
        </View>

        {/* ── Pickup Address ── */}
        <View style={styles.section}>
          <SectionLabel required>Pickup Address</SectionLabel>
          <View style={styles.addressInputWrapper}>
            <View style={styles.addressDot} />
            <TextInput
              style={[styles.addressInput, errors.pickupAddress && styles.inputError]}
              placeholder="Enter pickup location"
              placeholderTextColor={colors.textHint}
              value={pickupAddress}
              onChangeText={(v) => {
                setPickupAddress(v);
                setErrors((e) => ({ ...e, pickupAddress: undefined }));
              }}
              multiline
            />
            <TouchableOpacity
              style={styles.gpsBtn}
              onPress={handleGpsPickup}
              disabled={fetchingGps}
            >
              {fetchingGps
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Ionicons name="locate-outline" size={20} color={colors.primary} />
              }
            </TouchableOpacity>
          </View>
          <FieldError message={errors.pickupAddress} />
        </View>

        {/* ── Drop Address ── */}
        <View style={styles.section}>
          <SectionLabel required>Drop Address</SectionLabel>
          <View style={styles.addressInputWrapper}>
            <View style={[styles.addressDot, styles.addressDotDrop]} />
            <TextInput
              style={[styles.addressInput, errors.dropAddress && styles.inputError]}
              placeholder="Enter drop location"
              placeholderTextColor={colors.textHint}
              value={dropAddress}
              onChangeText={(v) => {
                setDropAddress(v);
                setErrors((e) => ({ ...e, dropAddress: undefined }));
              }}
              multiline
            />
          </View>
          <FieldError message={errors.dropAddress} />
        </View>

        {/* ── Route line connector (visual) ── */}
        <View style={styles.routeConnector}>
          <View style={styles.routeConnectorLine} />
        </View>

        {/* ── Schedule Date & Time ── */}
        <View style={styles.section}>
          <SectionLabel required>Schedule Date & Time</SectionLabel>
          <TouchableOpacity
            style={[styles.datePickerBtn, errors.scheduledAt && styles.inputError]}
            onPress={() => {
              setPickerTempDate(scheduledAt ?? new Date());
              setShowDatePicker(true);
            }}
          >
            <Ionicons
              name="calendar-outline"
              size={20}
              color={scheduledAt ? colors.primary : colors.textHint}
            />
            <Text style={[styles.datePickerText, !scheduledAt && styles.datePickerPlaceholder]}>
              {formattedDateTime ?? 'Select date and time'}
            </Text>
            <Ionicons name="chevron-down-outline" size={16} color={colors.textHint} />
          </TouchableOpacity>
          <Text style={styles.helperText}>
            You can schedule up to 7 days in advance.
          </Text>
          <FieldError message={errors.scheduledAt} />
        </View>

        {/* ── Instructions (optional) ── */}
        <View style={styles.section}>
          <SectionLabel>Special Instructions</SectionLabel>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Any specific instructions for the driver (optional)"
            placeholderTextColor={colors.textHint}
            value={instructions}
            onChangeText={setInstructions}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* ── Notes (optional) ── */}
        <View style={styles.section}>
          <SectionLabel>Notes</SectionLabel>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Internal notes or reference (optional)"
            placeholderTextColor={colors.textHint}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Confirm Booking</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── Native Date Picker ── */}
      {showDatePicker && (
        <DateTimePicker
          value={pickerTempDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
          minimumDate={minDate}
          maximumDate={maxDate}
          onChange={onDateChange}
        />
      )}

      {/* ── Native Time Picker ── */}
      {showTimePicker && (
        <DateTimePicker
          value={pickerTempDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
          is24Hour={false}
          onChange={onTimeChange}
        />
      )}
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8F9FB' },

  container: { flex: 1 },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.black,
    letterSpacing: -0.3,
  },
  headerRight: { width: 40 },

  // ── Passenger card ──
  passengerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  passengerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  passengerAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  passengerInfo: { flex: 1 },
  passengerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  passengerMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  passengerBadge: {
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  passengerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },

  // ── Section ──
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  required: { color: colors.error ?? '#EF4444' },
  fieldError: {
    fontSize: 12,
    color: colors.error ?? '#EF4444',
    marginTop: 4,
  },

  // ── Trip type grid ──
  tripTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tripTypeCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  tripTypeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight ,
  },
  tripTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 8,
    marginBottom: 2,
  },
  tripTypeLabelSelected: { color: colors.primary },
  tripTypeDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 14,
  },
  tripTypeDescSelected: { color: colors.primary },

  // ── Vehicle type horizontal scroll ──
  vehicleScroll: { marginTop: 4 },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  vehicleChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  vehicleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  vehicleChipTextSelected: { color: '#fff' },

  // ── Address inputs ──
  addressInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 6,
    marginRight: 10,
  },
  addressDotDrop: { backgroundColor: colors.error ?? '#EF4444' },
  addressInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    minHeight: 40,
  },
  gpsBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },

  // ── Route connector ──
  routeConnector: {
    paddingLeft: 28,
    marginTop: -16,
    marginBottom: -4,
    zIndex: -1,
  },
  routeConnectorLine: {
    width: 1.5,
    height: 20,
    backgroundColor: '#D1D5DB',
    marginLeft: 4,
  },

  // ── Generic input ──
  input: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textPrimary,
  },
  inputError: { borderColor: colors.error ?? '#EF4444' },
  textarea: { minHeight: 80, textAlignVertical: 'top' },

  // ── Outstation row ──
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },

  // ── Date picker button ──
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  datePickerText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  datePickerPlaceholder: { color: colors.textHint },
  helperText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
    marginLeft: 2,
  },

  // ── Submit ──
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  bottomSpacer: { height: 20 },
});