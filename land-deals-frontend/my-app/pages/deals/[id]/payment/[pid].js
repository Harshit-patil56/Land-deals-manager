/* eslint-disable @next/next/no-img-element */
import { useRouter } from 'next/router'
import { useEffect, useState, useCallback } from 'react'
import Navbar from '../../../../components/layout/Navbar'
import { paymentsAPI } from '../../../../lib/api'
import { getUser, logout } from '../../../../lib/auth'
import toast from 'react-hot-toast'

export default function PaymentDetailPage() {
  const router = useRouter()
  const { id, pid } = router.query
  const [user, setUser] = useState(null)
  const [payment, setPayment] = useState(null)
  const [proofs, setProofs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  // track failed images (used to fallback to icon) - used to toggle a CSS class when an image fails
  const [failedImages, setFailedImages] = useState(new Set()) // kept for potential future use
  const [selectedDocType, setSelectedDocType] = useState('receipt')

  useEffect(() => {
    setUser(getUser())
  }, [])

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    router.push('/login')
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await paymentsAPI.list(id)
      const pay = (res.data || []).find(p => String(p.id) === String(pid))
      setPayment(pay)
      const pr = await paymentsAPI.listProofs(id, pid)
      setProofs(pr.data || [])
    } catch {
      toast.error('Failed to load')
    } finally {
      setLoading(false)
    }
  }, [id, pid])

  useEffect(() => {
    if (!id || !pid) return
    fetchData()
  }, [id, pid, fetchData])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('proof', file)
  fd.append('doc_type', selectedDocType)
    try {
      setUploading(true)
      await paymentsAPI.uploadProof(id, pid, fd)
      toast.success('Uploaded')
      // reset failed image set in case this upload fixes rendering issues
      setFailedImages(new Set())
      fetchData()
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      // clear the file input value so the same file can be re-selected
      try { e.target.value = null } catch {}
    }
  }

  const handleDeleteProof = async (proofId) => {
    if (!confirm('Delete this proof?')) return
    try {
      await paymentsAPI.deleteProof(id, pid, proofId)
      toast.success('Deleted')
      fetchData()
    } catch {
      toast.error('Delete failed')
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-50 border-b border-slate-200 w-full"><Navbar user={user} onLogout={handleLogout}/></div>
      <div className="max-w-6xl mx-auto py-12 px-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="text-slate-600">Loading payment details...</div>
        </div>
      </div>
    </div>
  )

  if (!payment) return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-50 border-b border-slate-200 w-full"><Navbar user={user} onLogout={handleLogout}/></div>
      <div className="max-w-6xl mx-auto py-12 px-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="text-slate-600">Payment not found</div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-50 border-b border-slate-200 w-full"><Navbar user={user} onLogout={handleLogout}/></div>
      <div className="max-w-6xl mx-auto py-8 px-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Payment #{payment.id}</h2>
              <p className="text-sm text-slate-600 mt-1">{payment.payment_date?.split('T')[0] || payment.payment_date} • ₹{Number(payment.amount).toLocaleString()}</p>
            </div>
            <button 
              onClick={() => router.push({ pathname: '/deals/payments', query: { id } })} 
              className="inline-flex items-center rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Payments
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="space-y-2">
                <div><strong>Party</strong>: {payment.party_type} {payment.party_id ? `#${payment.party_id}` : ''}</div>
                <div><strong>Mode</strong>: {payment.payment_mode || '-'}</div>
                <div><strong>Reference</strong>: {payment.reference || '-'}</div>
                <div><strong>Notes</strong>: {payment.notes || '-'}</div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <h3 className="text-lg font-medium mb-4">Proofs</h3>
              {proofs.length === 0 ? (
                <p className="text-slate-500">No proofs uploaded yet.</p>
              ) : (
                <div className="space-y-6">
                  {proofs.map(pr => (
                    <div key={pr.id} className="bg-white rounded border p-4 shadow-sm">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="md:flex-1">
                          <p className="text-sm text-slate-600">Uploaded by #{pr.uploaded_by} • {new Date(pr.uploaded_at).toLocaleString()}</p>
                          <div className="mt-3 bg-slate-50 rounded overflow-hidden border">
                                    {pr.file_path && pr.file_path.endsWith('.pdf') ? ( 
                              <object data={pr.url} type="application/pdf" width="100%" height="500">PDF preview not available</object>
                            ) : (
                                      <img
                                        src={pr.url}
                                        alt={pr.file_path || 'proof'}
                                        className={`w-full max-h-[560px] object-contain bg-white ${failedImages.has(pr.id) ? 'opacity-60' : ''}`}
                                        onError={() => {
                                          try { /* silence */ } catch {}
                                          // replace broken image with generic icon
                                          const img = document.querySelector(`img[alt="${pr.file_path || 'proof'}"]`)
                                          if (img) img.src = '/file.svg'
                                          setFailedImages(prev => {
                                            const s = new Set(prev)
                                            s.add(pr.id)
                                            return s
                                          })
                                        }}
                                      />
                            )}
                          </div>
                          <div className="mt-2 text-sm text-slate-600">{(pr.file_path || pr.url || '').split('/').pop()}</div>
                          {pr.doc_type && <div className="mt-1 inline-block text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">{pr.doc_type}</div>}
                        </div>
                        <div className="flex-shrink-0 flex flex-col items-end gap-2">
                          <a href={pr.url} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md bg-white px-3 py-1 text-sm font-medium text-indigo-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50">Open</a>
                          <a href={pr.url} download className="inline-flex items-center rounded-md bg-white px-3 py-1 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50">Download</a>
                          <button onClick={() => handleDeleteProof(pr.id)} className="inline-flex items-center rounded-md bg-white px-3 py-1 text-sm font-medium text-red-600 ring-1 ring-inset ring-slate-200 hover:bg-red-50">Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-6">
          <div className="flex items-center gap-3">
            <select value={selectedDocType} onChange={e => setSelectedDocType(e.target.value)} className="border border-slate-200 rounded p-2 text-sm">
              <option value="receipt">Receipt / Voucher</option>
              <option value="bank_transfer">Bank Transfer Proof</option>
              <option value="cheque">Cheque Copy</option>
              <option value="cash">Cash Receipt</option>
              <option value="upi">UPI Screenshot</option>
              <option value="contra">Contra / Journal Voucher</option>
              <option value="other">Other</option>
            </select>
            <label className="inline-flex items-center gap-2">
              <input type="file" onChange={handleUpload} disabled={uploading} />
              <span className={`inline-flex items-center rounded-md px-3 py-1 text-sm font-medium ${uploading ? 'bg-slate-500 text-slate-200' : 'bg-slate-900 text-white'}`}>
                {uploading ? 'Uploading...' : 'Upload Proof'}
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
