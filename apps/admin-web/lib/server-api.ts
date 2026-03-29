import axios from 'axios';
import { cookies } from 'next/headers';
import { getApiBaseUrl } from './api-base';

const serverApi = axios.create({
  baseURL: getApiBaseUrl(),
});

serverApi.interceptors.request.use(async (config) => {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token.value}`;
    // Also propagate the cookie header so the backend receives it if it looks for cookies
    config.headers.Cookie = `token=${token.value}`;
  }
  
  return config;
});

export default serverApi;
