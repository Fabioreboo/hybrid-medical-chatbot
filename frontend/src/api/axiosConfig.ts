import axios from 'axios';

export function setupAxios() {
  axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  axios.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  axios.interceptors.response.use(
    response => response,
    error => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        window.location.href = '/';
      }
      return Promise.reject(error);
    },
  );
}