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

export const investorsAPI = {
  getAll: () => api.get('/investors'),
  getById: (id) => api.get(`/investors/${id}`),
  create: (data) => api.post('/investors', data),
  update: (id, data) => api.put(`/investors/${id}`, data),
  delete: (id) => api.delete(`/investors/${id}`)
}

export const ownersAPI = {
  getAll: () => api.get('/owners'),
  getById: (id) => api.get(`/owners/${id}`),
  create: (data) => api.post('/owners', data),
  update: (id, data) => api.put(`/owners/${id}`, data),
  delete: (id) => api.delete(`/owners/${id}`)
}

export const paymentsAPI = {
  list: (dealId) => api.get(`/payments/${dealId}`),
  detail: (dealId, paymentId) => api.get(`/payments/${dealId}/${paymentId}`),
  // create accepts optional options object: { params: { force: true } }
  create: (dealId, data, options = {}) => api.post(`/payments/${dealId}`, data, { params: options.params || {} }),
  update: (dealId, paymentId, data) => api.put(`/payments/${dealId}/${paymentId}`, data)
  , delete: (dealId, paymentId) => api.delete(`/payments/${dealId}/${paymentId}`)
}

// Proofs
paymentsAPI.uploadProof = (dealId, paymentId, formData) => api.post(`/payments/${dealId}/${paymentId}/proof`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})

// Admin user management
export const adminAPI = {
  listUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`)
}

paymentsAPI.listProofs = (dealId, paymentId) => api.get(`/payments/${dealId}/${paymentId}/proofs`)
paymentsAPI.deleteProof = (dealId, paymentId, proofId) => api.delete(`/payments/${dealId}/${paymentId}/proofs/${proofId}`)

// Ledger: flexible filter endpoint
paymentsAPI.ledger = (filters) => api.get('/payments/ledger', { params: filters })
// Server CSV export
paymentsAPI.ledgerCsv = (filters) => api.get('/payments/ledger.csv', { params: filters, responseType: 'blob' })
// Server PDF export (returns a PDF blob)
paymentsAPI.ledgerPdf = (filters) => api.get('/payments/ledger.pdf', { params: filters, responseType: 'blob' })

export default api