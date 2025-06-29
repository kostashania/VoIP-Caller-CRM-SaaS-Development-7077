import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

// Mock API base URL - replace with your actual API
const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  },
  
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  },
  
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore logout errors
    }
  }
};

// Callers API
export const callersAPI = {
  getAll: async () => {
    try {
      const response = await api.get('/callers');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch callers');
    }
  },
  
  getById: async (id) => {
    try {
      const response = await api.get(`/callers/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch caller');
    }
  },
  
  create: async (callerData) => {
    try {
      const response = await api.post('/callers', callerData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create caller');
    }
  },
  
  update: async (id, callerData) => {
    try {
      const response = await api.put(`/callers/${id}`, callerData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update caller');
    }
  },
  
  delete: async (id) => {
    try {
      await api.delete(`/callers/${id}`);
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete caller');
    }
  },
  
  addAddress: async (callerId, addressData) => {
    try {
      const response = await api.post(`/callers/${callerId}/addresses`, addressData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to add address');
    }
  },
  
  updateAddress: async (callerId, addressId, addressData) => {
    try {
      const response = await api.put(`/callers/${callerId}/addresses/${addressId}`, addressData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update address');
    }
  },
  
  deleteAddress: async (callerId, addressId) => {
    try {
      await api.delete(`/callers/${callerId}/addresses/${addressId}`);
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete address');
    }
  }
};

// Calls API
export const callsAPI = {
  getAll: async (filters = {}) => {
    try {
      const response = await api.get('/calls', { params: filters });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch calls');
    }
  },
  
  getById: async (id) => {
    try {
      const response = await api.get(`/calls/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch call');
    }
  },
  
  updateStatus: async (id, status) => {
    try {
      const response = await api.patch(`/calls/${id}/status`, { status });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update call status');
    }
  }
};

// Companies API (for super admin)
export const companiesAPI = {
  getAll: async () => {
    try {
      const response = await api.get('/companies');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch companies');
    }
  },
  
  create: async (companyData) => {
    try {
      const response = await api.post('/companies', companyData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create company');
    }
  },
  
  update: async (id, companyData) => {
    try {
      const response = await api.put(`/companies/${id}`, companyData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update company');
    }
  },
  
  delete: async (id) => {
    try {
      await api.delete(`/companies/${id}`);
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete company');
    }
  }
};

// Users API
export const usersAPI = {
  getAll: async () => {
    try {
      const response = await api.get('/users');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch users');
    }
  },
  
  create: async (userData) => {
    try {
      const response = await api.post('/users', userData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create user');
    }
  },
  
  update: async (id, userData) => {
    try {
      const response = await api.put(`/users/${id}`, userData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update user');
    }
  },
  
  delete: async (id) => {
    try {
      await api.delete(`/users/${id}`);
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete user');
    }
  }
};

// Settings API
export const settingsAPI = {
  getVoipSettings: async () => {
    try {
      const response = await api.get('/settings/voip');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch VoIP settings');
    }
  },
  
  updateVoipSettings: async (settings) => {
    try {
      const response = await api.put('/settings/voip', settings);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update VoIP settings');
    }
  },
  
  testVoipConnection: async (settings) => {
    try {
      const response = await api.post('/settings/voip/test', settings);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'VoIP connection test failed');
    }
  }
};

export default api;