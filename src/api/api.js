import axios from 'axios';
import { getAuthToken } from '../context/AuthContext';
import { triggerUnauthorized } from './authEvents';
import { ENV } from '../config/env';

const PUBLIC_PATHS = [
  '/api/mobile/employees/login',
  '/api/mobile/employees/signup/',
];

const api = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: ENV.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const isPublic = PUBLIC_PATHS.some((p) => config.url?.includes(p));
    if (!isPublic) {
      const token = await getAuthToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Unauthorized — token may be expired');
      triggerUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default api;