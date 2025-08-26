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
  addExpense: (dealId, data) => api.post(`/deals/${dealId}/expenses`, data),
  uploadDocument: (formData) => api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/deals/${id}`)
}

export const paymentsAPI = {
  list: (dealId) => api.get(`/payments/${dealId}`),
  // create accepts optional options object: { params: { force: true } }
  create: (dealId, data, options = {}) => api.post(`/payments/${dealId}`, data, { params: options.params || {} }),
  update: (dealId, paymentId, data) => api.put(`/payments/${dealId}/${paymentId}`, data)
  , delete: (dealId, paymentId) => api.delete(`/payments/${dealId}/${paymentId}`)
}

// Proofs
paymentsAPI.uploadProof = (dealId, paymentId, formData) => api.post(`/payments/${dealId}/${paymentId}/proof`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})

paymentsAPI.listProofs = (dealId, paymentId) => api.get(`/payments/${dealId}/${paymentId}/proofs`)
paymentsAPI.deleteProof = (dealId, paymentId, proofId) => api.delete(`/payments/${dealId}/${paymentId}/proofs/${proofId}`)

// Ledger: flexible filter endpoint
paymentsAPI.ledger = (filters) => api.get('/payments/ledger', { params: filters })
// Server CSV export
paymentsAPI.ledgerCsv = (filters) => api.get('/payments/ledger.csv', { params: filters, responseType: 'blob' })
// Server PDF export (returns a PDF blob)
paymentsAPI.ledgerPdf = (filters) => api.get('/payments/ledger.pdf', { params: filters, responseType: 'blob' })

export default api