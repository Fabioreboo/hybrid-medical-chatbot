import axios from 'axios';

// Use different base URLs for different endpoints
const API_BASE_URL = 'http://localhost:5000';
const AUTH_BASE_URL = 'http://localhost:3001';

export const authAxios = axios.create({
  baseURL: AUTH_BASE_URL,
});

export const apiAxios = axios.create({
  baseURL: API_BASE_URL,
});

export function setupAxios() {
  // Setup default headers for API calls
  apiAxios.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  apiAxios.interceptors.response.use(
    response => response,
    error => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/';
      }
      return Promise.reject(error);
    },
  );
}