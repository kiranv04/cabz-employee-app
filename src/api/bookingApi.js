import api from './api';

// ─────────────────────────────────────────────────────────────────────────────
// PLACEHOLDER ENDPOINTS — update base paths before wiring up the UI
// ─────────────────────────────────────────────────────────────────────────────
const ENDPOINTS = {
  CREATE:        '/api/mobile/employees/bookings',           // POST
  LIST:          '/api/mobile/employees/bookings',           // GET  ?page=&status=
  SHOW:          (id) => `/api/mobile/employees/bookings/${id}`,   // GET
  CANCEL:        (id) => `/api/mobile/employees/bookings/${id}/cancel`, // POST
  VEHICLE_TYPES: (companyId) => `/api/mobile/employees/companies/${companyId}/vehicle-types`,     // GET
};

// ─────────────────────────────────────────────────────────────────────────────
// Create a new booking
//
// Required by backend (employee context):
//   trip_type, pickup_address, drop_address, scheduled_at, vehicle_type_id
//   employee_id, company_id, cost_center_id  ← caller pulls from auth user
//
// Conditionally required:
//   estimated_days + estimated_kms  → when trip_type === 'outstation'
//
// Optional:
//   instructions, notes, place_itinerary
// ─────────────────────────────────────────────────────────────────────────────
export const createBooking = async (payload) => {
  const response  = await api.post(ENDPOINTS.CREATE, payload);
  return response.data; // { message, data: booking }
};

// ─────────────────────────────────────────────────────────────────────────────
// List bookings for the logged-in employee
// params: { page, status, per_page }
// status filter values: pending | assigned | in_progress | completed | cancelled
// ─────────────────────────────────────────────────────────────────────────────
export const getBookings = async ({ page = 1, status = null, per_page = 15, employee_id = null } = {}) => {
  const params = { page, per_page, employee_id };
  if (status) params.status = status;
  if (employee_id) params.employee_id = employee_id;
  const { data } = await api.get(ENDPOINTS.LIST, { params });
  return data; // { data: booking[], meta: { current_page, last_page, total } }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get a single booking by ID (used for tracking screen)
// ─────────────────────────────────────────────────────────────────────────────
export const getBooking = async (id) => {
  const { data } = await api.get(ENDPOINTS.SHOW(id));
  return data; // { data: booking }
};

// ─────────────────────────────────────────────────────────────────────────────
// Cancel a booking
// Only valid for status: pending | assigned
// Backend should reject if status is in_progress | completed | cancelled
// ─────────────────────────────────────────────────────────────────────────────
export const cancelBooking = async (id) => {
  const { data } = await api.post(ENDPOINTS.CANCEL(id));
  return data; // { message }
};

// ─────────────────────────────────────────────────────────────────────────────
// Fetch available vehicle types (for the booking form dropdown)
// Returns: [{ id, name, description?, icon? }]
// ─────────────────────────────────────────────────────────────────────────────
export const getVehicleTypes = async (companyId) => {
  // console.log('getVehicleTypes called with companyId:', companyId); // ← does this print?
    const response = await api.get(ENDPOINTS.VEHICLE_TYPES(companyId));
    // console.log('Full response:', response);
    // console.log('Response data:', response.data);
    return response.data;

};