// lib/api.js - API utilities
import axios from 'axios'
import { getToken } from './auth'

const API_BASE_URL = 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const dealAPI = {
  getAll: () => api.get('/deals'),
  getById: (id) => api.get(`/deals/${id}`),
  create: (data) => api.post('/deals', data),
  update: (id, data) => api.put(`/deals/${id}`, data),
  addExpense: (dealId, data) => api.post(`/deals/${dealId}/expenses`, data),
  uploadDocument: (formData) => api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/deals/${id}`)
}

export default api