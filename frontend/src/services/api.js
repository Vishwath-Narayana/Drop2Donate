/**
 * Fetch API abstraction layer
 * - Base URL config
 * - Auto-attaches JWT token
 * - Global error handling
 */

const BASE_URL = '/api';

const getToken = () => localStorage.getItem('d2d_token');

const buildHeaders = (isFormData = false) => {
  const headers = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
};

export const api = {
  get: async (path, params = {}) => {
    const url = new URL(`${BASE_URL}${path}`, window.location.origin);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: buildHeaders(),
    });
    return handleResponse(res);
  },

  post: async (path, body = {}) => {
    const isFormData = body instanceof FormData;
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: buildHeaders(isFormData),
      body: isFormData ? body : JSON.stringify(body),
    });
    return handleResponse(res);
  },

  put: async (path, body = {}) => {
    const isFormData = body instanceof FormData;
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: buildHeaders(isFormData),
      body: isFormData ? body : JSON.stringify(body),
    });
    return handleResponse(res);
  },

  delete: async (path) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    });
    return handleResponse(res);
  },
};

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  updatePassword: (data) => api.put('/auth/password', data),
  markNotificationsRead: () => api.put('/auth/notifications/read'),
};

// Donation API
export const donationAPI = {
  create: (formData) => api.post('/donations', formData),
  getNearby: (params) => api.get('/donations/nearby', params),
  getMap: (params) => api.get('/donations/map', params),
  getMy: (params) => api.get('/donations/my', params),
  getById: (id) => api.get(`/donations/${id}`),
  update: (id, data) => api.put(`/donations/${id}`, data),
  cancel: (id) => api.delete(`/donations/${id}`),
  getStats: () => api.get('/donations/stats'),
};

// Claim API
export const claimAPI = {
  create:           (data)     => api.post('/claims', data),
  getMy:            (params)   => api.get('/claims/my', params),
  getReceived:      (params)   => api.get('/claims/received', params),
  getById:          (id)       => api.get(`/claims/${id}`),
  respondToClaim:   (id, data) => api.put(`/claims/${id}/respond`, data),
  choosePickupMethod:(id, data) => api.put(`/claims/${id}/pickup-method`, data),
  confirmPickup:    (id)       => api.put(`/claims/${id}/confirm-pickup`, {}),
  cancel:           (id)       => api.put(`/claims/${id}/cancel`, {}),
  rate:             (id, data) => api.post(`/claims/${id}/rate`, data),
};

// Delivery API
export const deliveryAPI = {
  getNearby:      (params)   => api.get('/deliveries/nearby', params),
  getMy:          (params)   => api.get('/deliveries/my', params),
  getById:        (id)       => api.get(`/deliveries/${id}`),
  accept:         (id)       => api.post(`/deliveries/accept/${id}`, {}),
  updateStatus:   (id, data) => api.put(`/deliveries/status/${id}`, data),
  updateLocation: (id, data) => api.put(`/deliveries/location/${id}`, data),
  rate:           (id, data) => api.post(`/deliveries/${id}/rate`, data),
};

// Admin API
export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', params),
  getUser: (id) => api.get(`/admin/users/${id}`),
  verifyNGO: (id, data) => api.put(`/admin/users/${id}/verify`, data),
  toggleActive: (id) => api.put(`/admin/users/${id}/toggle-active`),
  getAnalytics: () => api.get('/admin/analytics'),
  getPendingNGOs: () => api.get('/admin/ngos/pending'),
  getDonations: (params) => api.get('/admin/donations', params),
  deleteDonation: (id) => api.delete(`/admin/donations/${id}`),
};
