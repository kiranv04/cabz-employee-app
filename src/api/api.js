import axios from 'axios';
import { getAuthToken } from '../context/AuthContext';

const api = axios.create({
  baseURL: 'https://smartapi.studiohalfx.com', // change to your backend IP
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Unauthorized — token may be expired');
    }
    return Promise.reject(error);
  }
);

export default api;