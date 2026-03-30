import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  createBooking,
  getBookings,
  getBooking,
  cancelBooking,
  getVehicleTypes,
} from '../api/bookingApi';
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Query keys — centralised so invalidations are consistent everywhere
// ─────────────────────────────────────────────────────────────────────────────
export const bookingKeys = {
  all:          ['bookings'],
  lists:        () => [...bookingKeys.all, 'list'],
  list:         (filters) => [...bookingKeys.lists(), filters],
  details:      () => [...bookingKeys.all, 'detail'],
  detail:       (id) => [...bookingKeys.details(), id],
  vehicleTypes: ['vehicleTypes'],
};

// ─────────────────────────────────────────────────────────────────────────────
// useVehicleTypes
// Fetches vehicle types for the booking form.
// Cached for 10 minutes — this data rarely changes.
// ─────────────────────────────────────────────────────────────────────────────
export const useVehicleTypes = () => {
  return useQuery({
    queryKey: bookingKeys.vehicleTypes,
    queryFn:  getVehicleTypes,
    staleTime: 10 * 60 * 1000,
    select: (data) => data.data ?? [],
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// useBookings
// Paginated list of bookings — used by history.js
// Pass status to filter: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
// Pass status = null for "all"
// ─────────────────────────────────────────────────────────────────────────────
export const useBookings = ({ status = null, per_page = 15 } = {}) => {
  const { user } = useAuth();
  const employeeId = user?.employee?.id ?? null;

  return useInfiniteQuery({
    queryKey: bookingKeys.list({ status, per_page, employee_id: employeeId }),
    queryFn:  ({ pageParam = 1 }) => getBookings({ page: pageParam, status, per_page, employee_id: employeeId }),
    getNextPageParam: (lastPage) => {
      const { current_page, last_page } = lastPage.meta ?? {};
      return current_page < last_page ? current_page + 1 : undefined;
    },
    select: (data) => ({
      pages:    data.pages,
      bookings: data.pages.flatMap((p) => p.data ?? []),
    }),
    enabled:   !!employeeId,
    staleTime: 30 * 1000,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// useActiveBooking
// Fetches only pending + assigned + in_progress bookings — used on home.js
// Takes the first result as the "active" booking
// ─────────────────────────────────────────────────────────────────────────────
export const useActiveBooking = () => {
  const { user } = useAuth();
  const employeeId = user?.employee?.id ?? null;

  return useQuery({
    queryKey: bookingKeys.list({ status: 'active', per_page: 1, employee_id: employeeId  }),
    queryFn:  () => getBookings({ status: 'active', per_page: 1, employee_id: employeeId  }),
    select:   (data) => data.data?.[0] ?? null,
    enabled:  !!employeeId,
    staleTime: 15 * 1000,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// useRecentBookings
// Last 3 completed/cancelled bookings — used for "Recent Trips" on home.js
// ─────────────────────────────────────────────────────────────────────────────
export const useRecentBookings = () => {
  const { user } = useAuth();
  const employeeId = user?.employee?.id ?? null;

  return useQuery({
    queryKey: bookingKeys.list({ status: 'completed', per_page: 3, employee_id: employeeId }),
    queryFn:  () => getBookings({ status: 'completed', per_page: 3, employee_id: employeeId }),
    select:   (data) => data.data ?? [],
    enabled:  !!employeeId,
    staleTime: 60 * 1000,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// useBooking
// Single booking detail — used by track/[id].js and trip/[id].js
// Polls every 10 seconds when the booking is active (pending/assigned/in_progress)
// Stops polling once completed or cancelled
// ─────────────────────────────────────────────────────────────────────────────
export const useBooking = (id) => {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn:  () => getBooking(id),
    select:   (data) => data.data ?? null,
    enabled:  !!id,
    staleTime: 10 * 1000,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Stop polling once the ride is done
      if (!status || status === 'completed' || status === 'cancelled') return false;
      return 10 * 1000; // Poll every 10s while active
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// useBookingDetail
// Same as useBooking but no polling — used by the read-only trip detail screen
// for completed/cancelled trips where real-time updates aren't needed
// ─────────────────────────────────────────────────────────────────────────────
export const useBookingDetail = (id) => {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn:  () => getBooking(id),
    select:   (data) => data.data ?? null,
    enabled:  !!id,
    staleTime: 5 * 60 * 1000, // 5 min — completed trips don't change
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// useCreateBooking
// Mutation for the book-cab form.
// On success: invalidates home active booking + history list.
// ─────────────────────────────────────────────────────────────────────────────
export const useCreateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// useCancelBooking
// Mutation to cancel a booking.
// ─────────────────────────────────────────────────────────────────────────────
export const useCancelBooking = (id) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// canCancelBooking — pure helper, no hooks
// ─────────────────────────────────────────────────────────────────────────────
export const canCancelBooking = (status) => {
  return status === 'pending' || status === 'assigned';
};

// ─────────────────────────────────────────────────────────────────────────────
// TRIP TYPE OPTIONS — flat_rate excluded (admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const TRIP_TYPES = [
  { value: 'local',          label: 'Local' },
  { value: 'outstation',     label: 'Outstation' },
  { value: 'airport_pickup', label: 'Airport Pickup' },
  { value: 'airport_drop',   label: 'Airport Drop' },
];

// ─────────────────────────────────────────────────────────────────────────────
// buildBookingPayload
// Assembles the API payload from form state + auth user.
// ─────────────────────────────────────────────────────────────────────────────
export const buildBookingPayload = (user, form) => {
  const employee   = user.employee;
  const costCenter = employee.cost_center;
  const company    = costCenter.branch.company;
  const location_id = costCenter.branch.location;

  const payload = {
    booking_type:    'corporate',
    company_id:      company.id,
    cost_center_id:  costCenter.id,
    employee_id:     employee.id,
    location_id:     location_id,
    passenger_name:   user.name,
    passenger_mobile: employee.mobile,
    trip_type:       form.trip_type,
    vehicle_type_id: form.vehicle_type_id,
    pickup_address:  form.pickup_address,
    drop_address:    form.drop_address,
    scheduled_at:    form.scheduled_at,
    ...(form.instructions    && { instructions:  form.instructions }),
    ...(form.notes           && { notes:         form.notes }),
    ...(form.trip_type === 'outstation' && {
      estimated_days: form.estimated_days,
      estimated_kms:  form.estimated_kms,
    }),
  };

  return payload;
};

// ─────────────────────────────────────────────────────────────────────────────
// BOOKING STATUS CONFIG
// Centralised colors + labels for status chips across all screens
// ─────────────────────────────────────────────────────────────────────────────
export const STATUS_CONFIG = {
  pending:     { label: 'Pending',     bg: '#FEF3C7', text: '#92400E', icon: 'time-outline' },
  assigned:    { label: 'Assigned',    bg: '#DBEAFE', text: '#1E40AF', icon: 'person-outline' },
  in_progress: { label: 'In Progress', bg: '#D1FAE5', text: '#065F46', icon: 'navigate-outline' },
  completed:   { label: 'Completed',   bg: '#F3F4F6', text: '#374151', icon: 'checkmark-circle-outline' },
  cancelled:   { label: 'Cancelled',   bg: '#FEE2E2', text: '#991B1B', icon: 'close-circle-outline' },
};

// ─────────────────────────────────────────────────────────────────────────────
// TRIP TYPE LABELS — for display in detail/summary screens
// ─────────────────────────────────────────────────────────────────────────────
export const TRIP_TYPE_LABELS = {
  local:          'Local',
  outstation:     'Outstation',
  airport_pickup: 'Airport Pickup',
  airport_drop:   'Airport Drop',
  flat_rate:      'Flat Rate',
};