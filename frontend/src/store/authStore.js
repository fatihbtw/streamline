import { create } from 'zustand';
import api from '../utils/api';

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('mf_token'),
  isLoading: false,

  setAuth: (token, user) => {
    localStorage.setItem('mf_token', token);
    set({ token, user });
  },

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/login', { username, password });
      const { token, user } = res.data;
      localStorage.setItem('mf_token', token);
      set({ token, user, isLoading: false });
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, error: err.response?.data?.error || 'Login failed' };
    }
  },

  logout: () => {
    localStorage.removeItem('mf_token');
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data });
    } catch {
      set({ user: null, token: null });
      localStorage.removeItem('mf_token');
    }
  },
}));

export default useAuthStore;
