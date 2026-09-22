import axios from 'axios';

const api = axios.create({
    // baseURL: 'http://localhost:5001/api',
    baseURL: 'https://servora-hrms-86cu.onrender.com/api',
});

// Attach JWT token from localStorage to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('servora_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 globally – clear storage and redirect
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('servora_token');
            localStorage.removeItem('servora_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
