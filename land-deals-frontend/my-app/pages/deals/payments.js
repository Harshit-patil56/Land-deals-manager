import { useRouter } from 'next/router'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { paymentsAPI } from '../../lib/api'
import api from '../../lib/api'
import { getToken } from '../../lib/auth'
import toast from 'react-hot-toast'
import Navbar from '../../components/layout/Navbar'

export default function PaymentsPage() {
  const router = useRouter()
  const { id } = router.query
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
    const [ledgerFilters, setLedgerFilters] = useState({ 
      payment_mode: '', 
      party_type: '', 
      party_id: '', 
      payment_type: '', 
      person_search: '',
      status: '',
      start_date: '',
      end_date: '',
      amount_min: '',
      amount_max: ''
    })
  const [ledgerResults, setLedgerResults] = useState([])
  const [uploading, setUploading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [proofsByPayment, setProofsByPayment] = useState({})
  const [openProofPayment, setOpenProofPayment] = useState(null)

  useEffect(() => setMounted(true), [])

  const isAuthed = mounted && !!getToken()

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await paymentsAPI.list(id)
      setPayments(res.data || [])
    } catch {
      toast.error('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    fetchPayments()
  }, [id, fetchPayments])

  const getParticipantLabel = (pt) => {
    if (!pt) return ''
    
    // Show detailed name when available
    if (pt.party_name) {
      if (pt.party_id) {
        return `${pt.party_name} (${pt.party_type} #${pt.party_id})`
      } else {
        return `${pt.party_name} (${pt.party_type})`
      }
    }
    
    // Fallback to ID-based display
    if (pt.party_id) return `${pt.party_type || 'participant'} #${pt.party_id}`
    return pt.party_type || 'participant'
  }

  const isDocPayment = (p) => {
    if (!p) return false
    const text = ((p.notes || '') + ' ' + (p.reference || '') + ' ' + (p.payment_mode || '')).toLowerCase()
    if (text.includes('doc') || text.includes('document') || text.includes('stamp') || text.includes('registration') || text.includes('fees') || text.includes('charges')) return true
    // also treat payments whose parties only include owner but are small amounts as docs (heuristic)
    if (p.parties && p.parties.length === 1 && p.parties[0].party_type === 'owner' && Number(p.amount) < 50000) return true
    return false
  }

  const loadProofs = async (paymentId) => {
    try {
      // reuse paymentsAPI.listProofs which calls /payments/{dealId}/{paymentId}/proofs
      const res = await paymentsAPI.listProofs(id, paymentId)
      const proofs = res.data || []
      setProofsByPayment(prev => ({ ...prev, [paymentId]: proofs }))
      setOpenProofPayment(paymentId)
    } catch (err) {
      console.error('Failed to load proofs', err)
      toast.error('Failed to load receipts/proofs')
    }
  }

  const annotate = async (paymentId) => {
    const notes = prompt('Add notes for this payment')
    if (!notes) return
    try {
      await paymentsAPI.update(id, paymentId, { notes })
      toast.success('Notes updated')
      fetchPayments()
    } catch {
      toast.error('Failed to update payment')
    }
  }

  const handleProofUpload = async (paymentId, file) => {
    if (!file) return
    const fd = new FormData()
    fd.append('proof', file)
    setUploading(true)
    try {
      await paymentsAPI.uploadProof(id, paymentId, fd)
      toast.success('Proof uploaded')
      fetchPayments()
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const runLedger = async () => {
    try {
      const filters = { ...ledgerFilters }
      if (id) filters.deal_id = id
      const res = await paymentsAPI.ledger(filters)
      setLedgerResults(res.data || [])
    } catch {
      toast.error('Ledger query failed')
    }
  }

  const exportLedgerCSV = () => {
    if (!ledgerResults || ledgerResults.length === 0) return
    const rows = []
    const headers = ['deal_id','payment_id','payment_date','amount','payment_mode','payers','payees','payment_flow','notes']
    ledgerResults.forEach(r => {
      const payers = r.parties ? r.parties.filter(p => (p.role || '').toLowerCase() === 'payer').map(p => getParticipantLabel(p)).join(', ') : ''
      const payees = r.parties ? r.parties.filter(p => (p.role || '').toLowerCase() === 'payee').map(p => getParticipantLabel(p)).join(', ') : ''
      
      let paymentFlow = ''
      if (payers && payees) {
        paymentFlow = `₹${Number(r.amount).toLocaleString()} paid by ${payers} to ${payees}`
      } else if (payers) {
        paymentFlow = `₹${Number(r.amount).toLocaleString()} paid by ${payers}`
      } else if (payees) {
        paymentFlow = `₹${Number(r.amount).toLocaleString()} paid to ${payees}`
      } else if (r.parties && r.parties.length > 0) {
        paymentFlow = `₹${Number(r.amount).toLocaleString()} involving ${getParticipantLabel(r.parties[0])}`
      } else {
        paymentFlow = `₹${Number(r.amount).toLocaleString()}`
      }
      
      rows.push([r.deal_id || id || '', r.id, r.payment_date?.split('T')[0] || r.payment_date || '', r.amount, r.payment_mode || '', payers, payees, paymentFlow, r.notes || ''])
    })
    const csv = [headers.join(',')].concat(rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(','))).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ledger_${id || 'all'}_${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const downloadServerCsv = async () => {
    try {
      const filters = { ...ledgerFilters }
      if (id) filters.deal_id = id
      const resp = await paymentsAPI.ledgerCsv(filters)
      const blob = new Blob([resp.data], { type: resp.headers['content-type'] || 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ledger_deal_${id || 'all'}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download server CSV', err)
      toast.error('Failed to download server CSV')
    }
  }

  const downloadServerPdf = async () => {
    try {
      const filters = { ...ledgerFilters }
      if (id) filters.deal_id = id
      const resp = await paymentsAPI.ledgerPdf(filters)
      const blob = new Blob([resp.data], { type: resp.headers['content-type'] || 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ledger_deal_${id || 'all'}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download server PDF', err)
      toast.error('Failed to download server PDF')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <div className="bg-white shadow-sm border-b border-slate-200 w-full">
        <Navbar />
      </div>

      {/* Page Header */}
      <div className="w-full">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Payment Management</h1>
                <div className="mt-2 flex items-center text-sm text-slate-500 space-x-4">
                  <span className="font-medium text-slate-700">Deal #{id}</span>
                  <span>•</span>
                  <span>{payments.length} total payments</span>
                  <span>•</span>
                  <span>₹{payments.reduce((sum, p) => sum + Number(p.amount || 0), 0).toLocaleString()} total value</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push(`/deals/${id}`)} 
                className="inline-flex items-center rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Deal
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Add Payment Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Add Payment</h3>
              </div>
              {!isAuthed ? (
                <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-4">
                  Please log in to add payments.
                </div>
              ) : (
                <div>
                  <p className="text-sm text-slate-600 mb-4">
                    Record a new payment transaction with detailed tracking.
                  </p>
                  <button 
                    onClick={() => router.push(`/deals/${id}/add-payment`)} 
                    className="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add New Payment
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Payments List */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Payment Records</h3>
                </div>
                
                {/* Quick Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={runLedger} 
                    className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search
                  </button>
                  <button 
                    onClick={exportLedgerCSV} 
                    className="inline-flex items-center rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                  >
                    CSV
                  </button>
                  <button 
                    onClick={downloadServerPdf} 
                    disabled={!isAuthed}
                    className={`inline-flex items-center rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      isAuthed 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    PDF
                  </button>
                </div>
              </div>

              {/* Enhanced Filters Section */}
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-900">Search & Filter Payments</h4>
                  <button 
                    onClick={() => setLedgerFilters({ 
                      payment_mode: '', party_type: '', party_id: '', payment_type: '', person_search: '',
                      status: '', start_date: '', end_date: '', amount_min: '', amount_max: ''
                    })} 
                    className="text-xs text-slate-600 hover:text-slate-800 font-medium"
                  >
                    Clear All
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {/* Person Search */}
                  <input
                    type="text"
                    placeholder="Search person..."
                    value={ledgerFilters.person_search || ''}
                    onChange={e => setLedgerFilters(prev => ({ ...prev, person_search: e.target.value }))}
                    className="text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />

                  {/* Payment Type */}
                  <select 
                    value={ledgerFilters.payment_type || ''} 
                    onChange={e => setLedgerFilters(prev => ({ ...prev, payment_type: e.target.value }))} 
                    className="text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="land_purchase">Land Purchase</option>
                    <option value="investment_sale">Investment/Sale</option>
                    <option value="documentation_legal">Documentation & Legal</option>
                    <option value="other">Other</option>
                  </select>

                  {/* Payment Mode */}
                  <select 
                    value={ledgerFilters.payment_mode} 
                    onChange={e => setLedgerFilters(prev => ({ ...prev, payment_mode: e.target.value }))} 
                    className="text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Modes</option>
                    <option value="UPI">UPI</option>
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="IMPS">IMPS</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>

                  {/* Party Type */}
                  <select 
                    value={ledgerFilters.party_type} 
                    onChange={e => setLedgerFilters(prev => ({ ...prev, party_type: e.target.value }))} 
                    className="text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Parties</option>
                    <option value="owner">Owner</option>
                    <option value="buyer">Buyer</option>
                    <option value="investor">Investor</option>
                  </select>

                  {/* Start Date */}
                  <input 
                    type="date"
                    value={ledgerFilters.start_date} 
                    onChange={e => setLedgerFilters(prev => ({ ...prev, start_date: e.target.value }))} 
                    className="text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                  />

                  {/* End Date */}
                  <input 
                    type="date"
                    value={ledgerFilters.end_date} 
                    onChange={e => setLedgerFilters(prev => ({ ...prev, end_date: e.target.value }))} 
                    className="text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                    <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading Payments</h3>
                  <p className="text-sm text-slate-600">Please wait while we fetch payment records...</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Payments Yet</h3>
                  <p className="text-sm text-slate-600 text-center">No payment records found for this deal.<br />Use the "Add New Payment" button to record your first transaction.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Payment Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Total Value</p>
                          <p className="text-lg font-bold text-blue-900">₹{payments.reduce((sum, p) => sum + Number(p.amount || 0), 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Total Payments</p>
                          <p className="text-lg font-bold text-green-900">{payments.length}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-yellow-600 uppercase tracking-wide">Paid Status</p>
                          <p className="text-lg font-bold text-yellow-900">{payments.filter(p => p.status === 'paid').length}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Pending</p>
                          <p className="text-lg font-bold text-orange-900">{payments.filter(p => p.status === 'pending').length}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment List */}
                  <div className="space-y-4">
                    {payments.map(payment => (
                      <div key={payment.id} className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <div className="p-6">
                          {/* Payment Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${
                                payment.status === 'paid' ? 'bg-green-100' : 'bg-orange-100'
                              }`}>
                                {payment.status === 'paid' ? (
                                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-3">
                                  <h4 className="text-xl font-bold text-slate-900">₹{Number(payment.amount).toLocaleString()}</h4>
                                  <span className="text-xs text-slate-500">{payment.currency || 'INR'}</span>
                                  {payment.payment_type && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                      {payment.payment_type === 'land_purchase' ? 'Land Purchase' :
                                       payment.payment_type === 'investment_sale' ? 'Investment/Sale' :
                                       payment.payment_type === 'documentation_legal' ? 'Documentation & Legal' :
                                       'Other Payment'}
                                    </span>
                                  )}
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    payment.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                  }`}>
                                    {payment.status === 'paid' ? 'Paid' : 'Pending'}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600 mt-1">
                                  Payment ID: #{payment.id} • {(payment.payment_date || '').split('T')[0]}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button onClick={() => annotate(payment.id)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                                Annotate
                              </button>
                              <button onClick={() => loadProofs(payment.id)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                                Receipts
                              </button>
                              <label className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer">
                                <input type="file" className="hidden" onChange={(e) => handleProofUpload(payment.id, e.target.files[0])} />
                                Upload Receipt
                              </label>
                              <button onClick={async () => {
                                if (!confirm('Delete this payment and its receipts?')) return
                                try {
                                  await paymentsAPI.delete(id, payment.id)
                                  toast.success('Payment deleted successfully')
                                  fetchPayments()
                                } catch {
                                  toast.error('Failed to delete payment')
                                }
                              }} className="text-xs text-red-600 hover:text-red-800 font-medium">
                                Delete
                              </button>
                              <button onClick={() => router.push(`/deals/${id}/payment/${payment.id}`)} className="text-xs text-slate-600 hover:text-slate-800 font-medium">
                                Open
                              </button>
                            </div>
                          </div>

                          {/* Payment Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                            <div>
                              <h5 className="text-sm font-semibold text-slate-900 mb-2">Payment Information</h5>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Mode:</span>
                                  <span className="font-medium text-slate-900">{payment.payment_mode || 'Not specified'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Reference:</span>
                                  <span className="font-medium text-slate-900">{payment.reference || 'Not provided'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Created by:</span>
                                  <span className="font-medium text-slate-900">{payment.created_by || 'Unknown'}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h5 className="text-sm font-semibold text-slate-900 mb-2">Timeline</h5>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Payment Date:</span>
                                  <span className="font-medium text-slate-900">{(payment.payment_date || '').split('T')[0] || 'Not set'}</span>
                                </div>
                                {payment.due_date && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-600">Due Date:</span>
                                    <span className="font-medium text-slate-900">{(payment.due_date || '').split('T')[0]}</span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Recorded:</span>
                                  <span className="font-medium text-slate-900">{(payment.created_at || '').split('T')[0] || 'Unknown'}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h5 className="text-sm font-semibold text-slate-900 mb-2">Additional Details</h5>
                              <div className="space-y-1 text-sm">
                                <div>
                                  <span className="text-slate-600">Notes:</span>
                                  <p className="font-medium text-slate-900 mt-1">{payment.notes || 'No additional notes'}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Payment Flow Section */}
                          <div className="border-t border-slate-200 pt-4">
                            <h5 className="text-sm font-semibold text-slate-900 mb-3">Payment Flow Details</h5>
                            <div className="bg-slate-50 rounded-lg p-4">
                              {payment.parties && payment.parties.length > 0 ? (
                                (() => {
                                  const payers = payment.parties.filter(pp => (pp.role || '').toLowerCase() === 'payer')
                                  const payees = payment.parties.filter(pp => (pp.role || '').toLowerCase() === 'payee')
                                  
                                  if (payers.length > 0 && payees.length > 0) {
                                    return (
                                      <div className="space-y-3">
                                        <div className="text-center">
                                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                            ₹{Number(payment.amount).toLocaleString()} Transfer
                                          </span>
                                        </div>
                                        
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">From (Payer)</p>
                                            <div className="space-y-1">
                                              {payers.map((payer, idx) => (
                                                <div key={idx} className="bg-green-100 border border-green-200 rounded-lg p-3">
                                                  <div className="font-medium text-green-800">
                                                    {getParticipantLabel(payer)}
                                                  </div>
                                                  {payer.amount && payer.amount !== Number(payment.amount) && (
                                                    <div className="text-xs text-green-600 mt-1">
                                                      Amount: ₹{Number(payer.amount).toLocaleString()}
                                                    </div>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                          
                                          <div className="px-4">
                                            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                          </div>
                                          
                                          <div className="flex-1">
                                            <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">To (Payee)</p>
                                            <div className="space-y-1">
                                              {payees.map((payee, idx) => (
                                                <div key={idx} className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                                                  <div className="font-medium text-blue-800">
                                                    {getParticipantLabel(payee)}
                                                  </div>
                                                  {payee.amount && payee.amount !== Number(payment.amount) && (
                                                    <div className="text-xs text-blue-600 mt-1">
                                                      Amount: ₹{Number(payee.amount).toLocaleString()}
                                                    </div>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  } else if (payment.parties.length > 0) {
                                    return (
                                      <div className="space-y-2">
                                        <div className="text-center">
                                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                            ₹{Number(payment.amount).toLocaleString()} Payment
                                          </span>
                                        </div>
                                        <div className="space-y-2">
                                          <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Parties Involved:</p>
                                          {payment.parties.map((party, idx) => (
                                            <div key={idx} className="bg-slate-100 border border-slate-200 rounded-lg p-3">
                                              <div className="font-medium text-slate-800">
                                                {getParticipantLabel(party)}
                                              </div>
                                              {party.role && (
                                                <div className="text-xs text-slate-600 mt-1">
                                                  Role: {party.role}
                                                </div>
                                              )}
                                              {party.amount && (
                                                <div className="text-xs text-slate-600 mt-1">
                                                  Amount: ₹{Number(party.amount).toLocaleString()}
                                                </div>
                                              )}
                                              {party.pay_to_name && (
                                                <div className="text-xs text-blue-600 mt-1 bg-blue-50 p-1 rounded">
                                                  <strong>Paid to:</strong> {party.pay_to_name}
                                                </div>
                                              )}
                                              {party.pay_to_id && !party.pay_to_name && (
                                                <div className="text-xs text-blue-600 mt-1 bg-blue-50 p-1 rounded">
                                                  <strong>Paid to:</strong> {party.pay_to_type} #{party.pay_to_id}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        
                                        {/* Show payment flow summary */}
                                        {payment.payment_flow && (
                                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                            <div className="font-medium text-blue-800">Flow:</div>
                                            <div className="text-blue-700">{payment.payment_flow}</div>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  } else {
                                    return (
                                      <div className="text-center text-sm text-slate-600">
                                        No payment flow information available
                                      </div>
                                    )
                                  }
                                })()
                              ) : (
                                <div className="text-center py-4">
                                  <div className="text-sm text-slate-600 mb-2">
                                    <strong>Payment Amount:</strong> ₹{Number(payment.amount).toLocaleString()}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    Detailed payment flow information not available for this payment.
                                    {payment.party_type && payment.party_id && (
                                      <div className="mt-1">
                                        Related to: {payment.party_type} #{payment.party_id}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ledger Results */}
          {ledgerResults.length > 0 && (
            <div className="lg:col-span-4 mt-6">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Ledger Results ({ledgerResults.length})</h3>
                </div>
                <div className="space-y-3">
                  {ledgerResults.map(r => (
                    <div key={`l-${r.id}`} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-slate-900">₹{Number(r.amount).toLocaleString()}</div>
                          <div className="text-xs text-slate-500 mt-1">{(r.payment_date || '').split('T')[0]} • {r.party_type} {r.party_id ? `#${r.party_id}` : ''} • {r.payment_mode}</div>
                        </div>
                        <button onClick={() => router.push(`/deals/${r.deal_id}/payment/${r.id}`)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                          Open Payment
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Proofs Modal */}
      {openProofPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Receipts for Payment #{openProofPayment}</h3>
              <button 
                onClick={() => setOpenProofPayment(null)} 
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              {proofsByPayment[openProofPayment] && proofsByPayment[openProofPayment].length > 0 ? (
                proofsByPayment[openProofPayment].map(pr => (
                  <div key={pr.id} className="flex items-center justify-between border border-slate-200 rounded-lg p-4">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{pr.file_name || pr.file_path || 'Receipt'}</div>
                      <div className="text-xs text-slate-500 mt-1">Uploaded: {pr.uploaded_at ? pr.uploaded_at.split('T')[0] : 'Unknown'}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <a href={pr.url || `http://localhost:5000/uploads/${pr.file_path || pr.file_name}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Open
                      </a>
                      <a href={pr.url || `http://localhost:5000/uploads/${pr.file_path || pr.file_name}`} download className="text-slate-600 hover:text-slate-800 text-sm font-medium">
                        Download
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-medium text-slate-900 mb-1">No Receipts</h4>
                  <p className="text-sm text-slate-500">No receipts have been uploaded for this payment.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}