import api from './api';

const ENDPOINTS = {
  CREATE:        '/api/mobile/employees/bookings',           // POST
  LIST:          '/api/mobile/employees/bookings',           // GET  ?page=&status=
  SHOW:          (id) => `/api/mobile/employees/bookings/${id}`,   // GET
  CANCEL:        (id) => `/api/mobile/employees/bookings/${id}/cancel`, // POST
  VEHICLE_TYPES: (companyId) => `/api/mobile/employees/companies/${companyId}/vehicle-types`,     // GET
};

// ─────────────────────────────────────────────────────────────────────────────
// Create a new booking — see buildBookingPayload() in ../hooks/useBookings.js
// for the exact payload shape (self vs. cost-center-manager booking for
// another employee).
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
  const response = await api.get(ENDPOINTS.VEHICLE_TYPES(companyId));
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// List employees in a branch a cost-center-manager manages — powers the
// "book for" picker in the CCM booking flow (project CLAUDE.md Item 8).
// Reuses the same endpoint the admin webapp's CCM pages use — role-gated
// server-side (role:cost-center-manager), works the same over a mobile
// Sanctum bearer token as it does over the webapp's session cookie.
// ─────────────────────────────────────────────────────────────────────────────
export const getBranchEmployees = async (branchId) => {
  const { data } = await api.get(`/api/ccm/branch/${branchId}/employees`);
  return data; // { data: employee[] }
};