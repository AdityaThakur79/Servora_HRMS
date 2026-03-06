import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../utils/api';

const useAuthStore = create(
    persist(
        (set) => ({
            user: null,
            token: null,
            isLoading: false,
            error: null,

            login: async (email, password) => {
                set({ isLoading: true, error: null });
                try {
                    const { data } = await api.post('/auth/login', { email, password });
                    localStorage.setItem('servora_token', data.token);
                    set({ user: data, token: data.token, isLoading: false });
                    return { success: true };
                } catch (err) {
                    const msg = err.response?.data?.message || 'Login failed';
                    set({ error: msg, isLoading: false });
                    return { success: false, error: msg };
                }
            },

            register: async (name, email, password) => {
                set({ isLoading: true, error: null });
                try {
                    const { data } = await api.post('/auth/register', { name, email, password });
                    localStorage.setItem('servora_token', data.token);
                    set({ user: data, token: data.token, isLoading: false });
                    return { success: true };
                } catch (err) {
                    const msg = err.response?.data?.message || 'Registration failed';
                    set({ error: msg, isLoading: false });
                    return { success: false, error: msg };
                }
            },

            logout: () => {
                localStorage.removeItem('servora_token');
                localStorage.removeItem('servora_user');
                set({ user: null, token: null });
            },

            clearError: () => set({ error: null }),
        }),
        {
            name: 'servora_user',
            partialize: (state) => ({ user: state.user, token: state.token }),
        }
    )
);

export default useAuthStore;
