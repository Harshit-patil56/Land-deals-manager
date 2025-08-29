import { useRouter } from 'next/router'
import { useEffect, useState, useRef } from 'react'
import { paymentsAPI, dealAPI } from '../../../lib/api'
import { getToken } from '../../../lib/auth'
import toast from 'react-hot-toast'
import Navbar from '../../../components/layout/Navbar'

export default function AddPaymentPage() {
  const router = useRouter()
  const { id } = router.query
  const [form, setForm] = useState({ amount: '', payment_date: '', payment_mode: '', reference: '', notes: '', status: 'paid', due_date: '', payment_type: 'other' })
  const [customMode, setCustomMode] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [participants, setParticipants] = useState([])
  const [parties, setParties] = useState([{ party_type: 'owner', party_id: '', amount: '', party_name: '', role: '' }])
  const [saving, setSaving] = useState(false)
  const [forceSave, setForceSave] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [totalPartiesAmount, setTotalPartiesAmount] = useState(0)
  const amountRef = useRef(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => { if (amountRef.current) amountRef.current.focus() }, [amountRef, mounted])

  useEffect(() => {
    if (!id) return
    (async () => {
      try {
        const res = await dealAPI.getById(id)
        const data = res.data || {}
        const owners = data.owners || []
        const investors = data.investors || []
        const buyers = data.buyers || []
        const ownerRows = owners.map(o => ({ party_type: 'owner', id: o.id, name: o.name || '', role: 'owner' }))
        const investorRows = investors.map(i => ({ party_type: 'investor', id: i.id, name: i.investor_name || '', role: 'investor' }))
        const buyerRows = buyers.map(b => ({ party_type: 'buyer', id: b.id, name: b.name || '', role: 'buyer' }))
        setParticipants([...ownerRows, ...investorRows, ...buyerRows])
      } catch {
        // ignore
      }
    })()
  }, [id])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handlePartyChange = (index, key, value) => {
    setParties(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [key]: value }
      return copy
    })
  }
  const addParty = () => setParties(prev => ([...prev, { 
    party_type: 'owner', 
    party_id: '', 
    amount: '', 
    party_name: '', 
    role: '',
    pay_to_id: '',
    pay_to_name: '',
    pay_to_type: ''
  }]))
  const removeParty = (index) => setParties(prev => prev.filter((_, i) => i !== index))

  const importParticipants = () => {
    if (!participants || participants.length === 0) { toast('No participants to import'); return }
    const rows = participants.map((p, index) => ({ 
      party_type: p.party_type, 
      party_id: p.id, 
      party_name: p.name || '', 
      amount: '', 
      role: index === 0 ? 'payer' : 'payee', // First participant is payer, others are payees
      pay_to_id: '',
      pay_to_name: '',
      pay_to_type: ''
    }))
    setParties(rows)
  }

  const importAndSplitEqual = () => {
    if (!participants || participants.length === 0) { toast('No participants to import'); return }
    const rows = participants.map((p, index) => ({
      party_type: p.party_type, 
      party_id: p.id, 
      party_name: p.name || '', 
      amount: '', 
      role: index === 0 ? 'payer' : 'payee' // First participant is payer, others are payees
    }))
    setParties(rows)
  }

  // Compute totals when form.amount or parties change
  useEffect(() => {
    let tpa = 0
    parties.forEach(p => {
      const a = parseFloat(p.amount)
      if (!isNaN(a)) tpa += a
    })
    setTotalPartiesAmount(+(tpa).toFixed(2))
  }, [form.amount, parties])

  const submit = async (e) => {
    e?.preventDefault()
    if (saving) return
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) { toast.error('Enter a valid amount'); return }
    if (!form.payment_date) { toast.error('Select a payment date'); return }
    
    // Validate that we have at least one party with a role and payment target
    const validParties = parties.filter(p => p.role && p.pay_to_id)
    if (validParties.length === 0) { 
      toast.error('Please add at least one person with a role and payment target'); 
      return 
    }
    
    // Validate each party has required fields
    for (let i = 0; i < parties.length; i++) {
      const p = parties[i]
      if (!p.party_type) { toast.error(`Party ${i + 1}: Please select a party type`); return }
      if (!p.party_id && p.party_type !== 'other') { toast.error(`Party ${i + 1}: Please select a specific person`); return }
      if (!p.role) { toast.error(`Party ${i + 1}: Please select if they are paying or receiving`); return }
      if (!p.pay_to_id) { toast.error(`Party ${i + 1}: Please select who they ${p.role === 'payer' ? 'pay to' : 'receive from'}`); return }
    }
    
    setSaving(true)
    try {
      const paymentAmount = parseFloat(form.amount || 0)
      
      const preparedParties = parties.map(p => ({ 
        party_type: p.party_type, 
        party_id: p.party_id || null, 
        amount: paymentAmount, // Set amount to the total payment amount
        role: p.role || null,
        pay_to_id: p.pay_to_id || null,
        pay_to_name: p.pay_to_name || null,
        pay_to_type: p.pay_to_type || null
      }))
      
      // Remove the amount validation since we're setting it automatically
      setFieldErrors({})
      const params = {}
      if (forceSave) params.force = true
      const payload = { ...form, amount: parseFloat(form.amount), parties: preparedParties }
      if ((form.payment_mode === 'other' || !form.payment_mode) && customMode) payload.payment_mode = customMode

      const resp = await paymentsAPI.create(id, payload, { params })
      toast.success('Payment recorded')
      const newPaymentId = resp?.data?.payment_id

      if (receiptFile && newPaymentId) {
        try {
          const fd = new FormData()
          fd.append('proof', receiptFile)
          await paymentsAPI.uploadProof(id, newPaymentId, fd)
          toast.success('Receipt uploaded')
        } catch {
          toast.error('Receipt upload failed')
        }
      }

  // reset and navigate back to the payments list page (uses query param `id`)
  setForm({ amount: '', payment_date: '', payment_mode: '', reference: '', notes: '', status: 'paid', due_date: '', payment_type: 'other' })
  setReceiptFile(null)
  setCustomMode('')
  setParties([{ party_type: 'owner', party_id: '', amount: '', party_name: '', role: '' }])
  setForceSave(false)
  // Use query-based navigation to match pages/deals/payments.js which expects `id` in router.query
  router.push({ pathname: '/deals/payments', query: { id } })

      } catch (err) {
      try {
        const resp = err?.response
        const data = resp?.data
        if (data && data.error === 'party_amount_mismatch') {
          toast.error(`Party sum mismatch: payment ${data.payment_amount} vs parties ${data.parties_total}`)
        } else if (data && data.error === 'party_percentage_mismatch') {
          toast.error(`Party percentage mismatch: total ${data.total_percentage}`)
        } else if (resp && resp.status) {
          const msg = (data && (data.error || data.message)) || resp.statusText || `Server error ${resp.status}`
          toast.error(`${resp.status}: ${msg}`)
        } else if (err && err.message) {
          toast.error(err.message)
        } else {
          toast.error('Failed to record payment')
        }
      } catch {
        toast.error('Failed to prepare parties')
      }
    } finally {
      setSaving(false)
    }
  }

  const isAuthed = mounted && !!getToken()

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-50 border-b border-slate-200 w-full">
        <Navbar />
      </div>

      <div className="max-w-3xl mx-auto py-8 px-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Add Payment (with Roles)</h2>
              <p className="text-sm text-slate-500 mt-1">Record a new payment for deal #{id}</p>
            </div>
            <button
              type="button"
              onClick={() => router.push({ pathname: '/deals/payments', query: { id } })}
              className="inline-flex items-center rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Payments
            </button>
          </div>
          {!isAuthed ? (
            <div className="text-sm text-slate-600">Please log in to add payments.</div>
          ) : (
            <form onSubmit={submit} className="space-y-6">
              
              {/* Basic Payment Information */}
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Payment Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 font-medium">₹</span>
                      <input
                        ref={amountRef}
                        name="amount"
                        type="number"
                        step="0.01"
                        value={form.amount}
                        onChange={handleChange}
                        className="w-full pl-8 pr-3 py-3 border border-slate-300 rounded-lg text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  {/* Payment Date */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Payment Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="payment_date"
                      type="date"
                      value={form.payment_date}
                      onChange={handleChange}
                      className="w-full px-3 py-3 border border-slate-300 rounded-lg text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                      required
                    />
                  </div>

                  {/* Payment Type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Payment Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="payment_type"
                      value={form.payment_type || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-3 border border-slate-300 rounded-lg text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                      required
                    >
                      <option value="">Select payment type</option>
                      <option value="land_purchase">Land Purchase Payment</option>
                      <option value="investment_sale">Investment/Sale Payment</option>
                      <option value="documentation_legal">Documentation & Legal Fees</option>
                      <option value="other">Other Payment</option>
                    </select>
                  </div>

                  {/* Payment Mode */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Payment Mode <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="payment_mode"
                      value={form.payment_mode || ''}
                      onChange={e => { 
                        const v = e.target.value; 
                        setForm(prev => ({ ...prev, payment_mode: v })); 
                        if (v !== 'other') setCustomMode('') 
                      }}
                      className="w-full px-3 py-3 border border-slate-300 rounded-lg text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                      required
                    >
                      <option value="">Select payment mode</option>
                      <option value="UPI">UPI</option>
                      <option value="NEFT">NEFT</option>
                      <option value="RTGS">RTGS</option>
                      <option value="IMPS">IMPS</option>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                      <option value="other">Other</option>
                    </select>
                    {form.payment_mode === 'other' && (
                      <input 
                        placeholder="Enter custom payment mode" 
                        value={customMode} 
                        onChange={e => setCustomMode(e.target.value)} 
                        className="mt-3 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" 
                      />
                    )}
                  </div>
                </div>

                {/* Reference & Description Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Reference Number</label>
                    <input
                      name="reference"
                      type="text"
                      value={form.reference || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-3 border border-slate-300 rounded-lg text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                      placeholder="Transaction ID, Cheque No, etc."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                    <input
                      name="description"
                      type="text"
                      value={form.description || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-3 border border-slate-300 rounded-lg text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                      placeholder="Brief description of payment"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Status & Additional Info */}
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Additional Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Payment Status */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Payment Status</label>
                    <div className="flex items-center gap-6">
                      <label className="inline-flex items-center">
                        <input 
                          type="radio" 
                          name="status" 
                          value="paid" 
                          checked={form.status === 'paid'} 
                          onChange={() => setForm(prev => ({ ...prev, status: 'paid' }))} 
                          className="mr-2 text-blue-600 focus:ring-blue-500" 
                        />
                        <span className="text-sm">Paid</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input 
                          type="radio" 
                          name="status" 
                          value="pending" 
                          checked={form.status === 'pending'} 
                          onChange={() => setForm(prev => ({ ...prev, status: 'pending' }))} 
                          className="mr-2 text-blue-600 focus:ring-blue-500" 
                        />
                        <span className="text-sm">Pending</span>
                      </label>
                    </div>
                    {form.status === 'pending' && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Expected Payment Date</label>
                        <input 
                          name="due_date" 
                          type="date" 
                          value={form.due_date} 
                          onChange={e => setForm(prev => ({ ...prev, due_date: e.target.value }))} 
                          className="w-full px-3 py-3 border border-slate-300 rounded-lg text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" 
                        />
                      </div>
                    )}
                  </div>

                  {/* Receipt Upload */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Receipt (Optional)</label>
                    <input 
                      type="file" 
                      accept="image/*,.pdf,.jpg,.jpeg,.png" 
                      onChange={e => setReceiptFile(e.target.files?.[0] || null)} 
                      className="w-full px-3 py-3 border border-slate-300 rounded-lg text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                    />
                    {receiptFile && (
                      <div className="text-xs text-slate-600 mt-2 bg-green-50 border border-green-200 rounded p-2">
                        📎 Selected: {receiptFile.name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                  <textarea 
                    name="notes" 
                    value={form.notes} 
                    onChange={handleChange} 
                    rows={3}
                    className="w-full px-3 py-3 border border-slate-300 rounded-lg text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="Additional notes about this payment..."
                  />
                </div>
              </div>

              {/* Payment Participants Section */}
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Payment Participants</h3>
                
                {participants.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <div className="text-sm text-yellow-800">
                      <div className="font-medium mb-1">No participants found</div>
                      <div className="text-xs">
                        Add owners, investors, or buyers to this deal first, then refresh this page.
                      </div>
                    </div>
                  </div>
                )}

                {/* Party Cards */}
                <div className="space-y-4">
                  {parties.map((pt, idx) => (
                    <div key={`p-${idx}`} className="bg-white border border-slate-300 rounded-lg p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-slate-900">Person #{idx + 1}</h4>
                        {parties.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => removeParty(idx)} 
                            className="inline-flex items-center rounded-md px-3 py-1 text-sm font-medium text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50 transition-colors"
                          >
                            🗑️ Remove
                          </button>
                        )}
                      </div>
                      
                      {/* Party Information Section */}
                      <div className="bg-gradient-to-r from-blue-50 to-slate-50 rounded-lg border border-slate-200 p-4 mb-4">
                        <div className="flex items-center mb-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                          <h5 className="text-sm font-semibold text-slate-800">Party Information</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Party Type */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Party Type <span className="text-red-500">*</span>
                            </label>
                            <select 
                              value={pt.party_type || 'other'} 
                              onChange={e => { 
                                const t = e.target.value; 
                                handlePartyChange(idx, 'party_type', t); 
                                handlePartyChange(idx, 'party_id', ''); 
                                handlePartyChange(idx, 'party_name', '') 
                              }} 
                              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white transition-all"
                              required
                            >
                              <option value="">Select type</option>
                              <option value="owner">Owner</option>
                              <option value="buyer">Buyer</option>
                              <option value="investor">Investor</option>
                              <option value="other">Other</option>
                            </select>
                          </div>

                          {/* Specific Person Selection */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Select Person <span className="text-red-500">*</span>
                            </label>
                            {pt.party_type && pt.party_type !== 'other' ? (
                              <div>
                                <select 
                                  value={pt.party_id || ''} 
                                  onChange={e => { 
                                    const val = e.target.value; 
                                    handlePartyChange(idx, 'party_id', val); 
                                    const found = participants.find(p => String(p.id) === String(val) && p.party_type === pt.party_type); 
                                    handlePartyChange(idx, 'party_name', found ? found.name : '') 
                                  }} 
                                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white transition-all"
                                  required
                                >
                                  <option value="">Choose {pt.party_type}...</option>
                                  {participants.filter(pp => pp.party_type === pt.party_type).map(pp => (
                                    <option key={`op-${pp.id}`} value={pp.id}>
                                      {pp.name || 'Unnamed'} (ID: {pp.id})
                                    </option>
                                  ))}
                                </select>
                                <div className="flex items-center text-xs text-emerald-600 mt-1">
                                  <div className="w-1 h-1 bg-emerald-500 rounded-full mr-1"></div>
                                  {participants.filter(pp => pp.party_type === pt.party_type).length} {pt.party_type}(s) available
                                </div>
                              </div>
                            ) : (
                              <div>
                                <input 
                                  placeholder="Enter person's name manually" 
                                  value={pt.party_name || ''} 
                                  onChange={e => handlePartyChange(idx, 'party_name', e.target.value)} 
                                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white transition-all" 
                                  required
                                />
                                <div className="flex items-center text-xs text-amber-600 mt-1">
                                  <div className="w-1 h-1 bg-amber-500 rounded-full mr-1"></div>
                                  Manual entry for other party types
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Payment Flow Section */}
                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-slate-200 p-4">
                        <div className="flex items-center mb-3">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
                          <h5 className="text-sm font-semibold text-slate-800">Payment Flow</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Role Selection */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Role in Payment <span className="text-red-500">*</span>
                            </label>
                            <select 
                              value={pt.role || ''} 
                              onChange={e => {
                                console.log('Role changed:', e.target.value);
                                handlePartyChange(idx, 'role', e.target.value);
                              }} 
                              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 bg-white transition-all"
                              required
                            >
                              <option value="">Select role...</option>
                              <option value="payer">Payer (Giving money)</option>
                              <option value="payee">Payee (Receiving money)</option>
                            </select>
                            <div className="flex items-center text-xs text-slate-500 mt-1">
                              <div className="w-1 h-1 bg-slate-400 rounded-full mr-1"></div>
                              Who is this person in this transaction?
                            </div>
                          </div>

                          {/* Payment Target Type */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Target Type <span className="text-red-500">*</span>
                            </label>
                            <select 
                              value={pt.pay_to_type || 'other'} 
                              onChange={e => { 
                                const t = e.target.value; 
                                handlePartyChange(idx, 'pay_to_type', t); 
                                handlePartyChange(idx, 'pay_to_id', ''); 
                                handlePartyChange(idx, 'pay_to_name', '') 
                              }} 
                              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 bg-white transition-all"
                              required
                            >
                              <option value="">Select type</option>
                              <option value="owner">Owner</option>
                              <option value="buyer">Buyer</option>
                              <option value="investor">Investor</option>
                              <option value="other">Other</option>
                            </select>
                          </div>

                          {/* Payment Target Selection */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              <span className="inline-block">
                                {pt.role === 'payer' ? 'Pay To Whom?' : pt.role === 'payee' ? 'Receive From Whom?' : 'Payment Target'}
                              </span>
                              <span className="text-red-500 ml-1">*</span>
                            </label>
                            {pt.pay_to_type && pt.pay_to_type !== 'other' ? (
                              <div>
                                <select 
                                  value={pt.pay_to_id || ''} 
                                  onChange={e => { 
                                    const val = e.target.value; 
                                    handlePartyChange(idx, 'pay_to_id', val); 
                                    const found = participants.find(p => String(p.id) === String(val) && p.party_type === pt.pay_to_type); 
                                    handlePartyChange(idx, 'pay_to_name', found ? found.name : '') 
                                  }} 
                                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 bg-white transition-all"
                                  required
                                >
                                  <option value="">Choose {pt.pay_to_type}...</option>
                                  {participants
                                    .filter(pp => pp.party_type === pt.pay_to_type && String(pp.id) !== String(pt.party_id))
                                    .map(pp => (
                                      <option key={`target-${pp.id}`} value={pp.id}>
                                        {pp.name || 'Unnamed'} (ID: {pp.id})
                                      </option>
                                    ))}
                                </select>
                                <div className="flex items-center text-xs text-emerald-600 mt-1">
                                  <div className="w-1 h-1 bg-emerald-500 rounded-full mr-1"></div>
                                  {participants.filter(pp => pp.party_type === pt.pay_to_type && String(pp.id) !== String(pt.party_id)).length} {pt.pay_to_type}(s) available
                                </div>
                              </div>
                            ) : (
                              <div>
                                <input 
                                  placeholder="Enter person's name manually" 
                                  value={pt.pay_to_name || ''} 
                                  onChange={e => handlePartyChange(idx, 'pay_to_name', e.target.value)} 
                                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 bg-white transition-all" 
                                  required
                                />
                                <div className="flex items-center text-xs text-amber-600 mt-1">
                                  <div className="w-1 h-1 bg-amber-500 rounded-full mr-1"></div>
                                  Manual entry for other party types
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex gap-3 flex-wrap">
                  <button 
                    type="button" 
                    onClick={addParty} 
                    className="inline-flex items-center rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Person
                  </button>
                  <button 
                    type="button" 
                    onClick={importParticipants} 
                    className="inline-flex items-center rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    Import from Deal
                  </button>
                </div>
              </div>

              {/* Submit Section */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <label className="inline-flex items-center">
                      <input 
                        type="checkbox" 
                        checked={forceSave} 
                        onChange={e => setForceSave(e.target.checked)} 
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                      />
                      <span className="ml-2 text-sm text-slate-600">Force save if amounts don't match</span>
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      type="button" 
                      onClick={() => router.push({ pathname: '/deals/payments', query: { id } })} 
                      className="inline-flex items-center rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={saving} 
                      className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        '💾 Save Payment'
                      )}
                    </button>
                  </div>
                </div>

                {fieldErrors.form && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-sm text-red-600">{fieldErrors.form}</div>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
