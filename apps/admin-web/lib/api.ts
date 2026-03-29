import axios from 'axios';
import Cookies from 'js-cookie';
import { getApiBaseUrl } from './api-base';

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // We try to get token from cookie just in case, but HttpOnly cookies are handled by browser
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
