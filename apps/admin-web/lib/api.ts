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
    const hasAuthorizationHeader =
      typeof config.headers?.Authorization === 'string' &&
      config.headers.Authorization.trim().length > 0;
    if (token && !hasAuthorizationHeader) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
