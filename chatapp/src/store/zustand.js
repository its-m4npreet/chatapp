import {create} from 'zustand';
import api from '../lib/axios';

export const useStore = create((set) => ({
  user: null,
  setUser: (user) => set({user}),
    fetchUser: async () => {
    try {
      const response = await api.get('/auth/me');
      set({user: response.data});
    } catch (error) {
        set({user: null});
        console.error('Failed to fetch user:', error);
    }
}}));
