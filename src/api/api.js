import axios from 'axios';
import { getAuthToken } from '../context/AuthContext';
import { triggerUnauthorized } from './authEvents';

const PUBLIC_PATHS = ['/api/mobile/employees/login'];

const api = axios.create({
  // baseURL: 'http://192.168.1.10:8000', // change to your backend IP
  // baseURL: 'http://10.37.228.228:8000', // Bangalore mobile data
  // baseURL: 'http://192.168.1.7:8000', // Bangalore home wifi
  // baseURL: 'https://smartapi.studiohalfx.com', // change to your backend IP
  baseURL: 'https://testapi.smartcabz.com', // pre-production backend
  timeout: 15000,
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