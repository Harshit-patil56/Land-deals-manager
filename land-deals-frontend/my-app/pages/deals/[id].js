// pages/deals/[id].js - Professional Deal Details Page
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { dealAPI } from '../../lib/api'
import { getUser, logout } from '../../lib/auth'
import { hasPermission, PERMISSIONS } from '../../lib/permissions'
import { EditButton, DeleteButton } from '../../components/common/PermissionButton'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Navbar from '../../components/layout/Navbar'

export default function DealDetails() {
  const router = useRouter()
  const { id } = router.query
  const [deal, setDeal] = useState(null)
  const [investors, setInvestors] = useState([])
  const [expenses, setExpenses] = useState([])
  const [documents, setDocuments] = useState([])
  const [owners, setOwners] = useState([])
  const [buyers, setBuyers] = useState([])
  const [paymentMode, setPaymentMode] = useState('')
  const [mutationDone, setMutationDone] = useState(false)
  const [profitAllocation, setProfitAllocation] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)
  }, [])

  useEffect(() => {
    if (!id) return
    const fetchDeal = async () => {
      try {
        const response = await dealAPI.getById(id)
        const data = response.data
        setDeal(data.deal || data)
        setInvestors(data.investors || [])
        setExpenses(data.expenses || [])
        setDocuments(data.documents || [])
        setOwners(data.owners || [])
        setBuyers(data.buyers || [])
        setPaymentMode(data.deal?.payment_mode || '')
        setMutationDone(data.deal?.mutation_done || false)
        setProfitAllocation(data.deal?.profit_allocation || '')
        setStatus(data.deal?.status || '')
      } catch {
        toast.error('Failed to fetch deal details')
      } finally {
        setLoading(false)
      }
    }
    fetchDeal()
  }, [id])

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
            <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading Deal Details</h3>
          <p className="text-slate-600">Please wait while we fetch the information</p>
        </div>
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white shadow-sm border-b border-slate-200">
          <Navbar user={user} onLogout={handleLogout} />
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-lg mx-auto mb-6 flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Deal Not Found</h2>
            <p className="text-slate-600 mb-8">The requested deal could not be found or may have been deleted.</p>
            <Link href="/dashboard">
              <span className="inline-flex items-center px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-all duration-200 cursor-pointer">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation - Full Width */}
      <div className="bg-white shadow-sm border-b border-slate-200 w-full">
        <Navbar user={user} onLogout={handleLogout} />
      </div>

      {/* Page Header - Full Width */}
      <div className="w-full">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Deal Details</h1>
                <p className="text-slate-600 mt-1">
                  Complete information for <span className="font-medium">{deal.project_name}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                  status === 'open'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {status === 'open' ? 'Active Deal' : 'Closed Deal'}
              </span>
              <EditButton
                user={user}
                resource="deals"
                onClick={() => router.push(`/deals/edit/${id}`)}
                className="inline-flex items-center px-4 py-2 border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all duration-200 font-semibold rounded-lg"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Deal
              </EditButton>
              <DeleteButton
                user={user}
                resource="deals"
                onClick={async () => {
                  if (window.confirm('Are you sure you want to delete this deal? This action cannot be undone.')) {
                    try {
                      await dealAPI.delete(id)
                      toast.success('Deal deleted successfully')
                      router.push('/deals/deals')
                    } catch {
                      toast.error('Failed to delete deal')
                    }
                  }
                }}
                className="inline-flex items-center px-4 py-2 border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 transition-all duration-200 font-semibold rounded-lg"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Deal
              </DeleteButton>
              <Link href="/dashboard">
                <span className="inline-flex items-center px-4 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-all duration-200 font-semibold cursor-pointer rounded-lg">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Dashboard
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Actions - Prominent Top Section */}
      <div className="w-full">
        <div className="px-6 pb-8">
          <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-xl border border-slate-200 shadow-sm">
            <div className="px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Payment Management</h2>
                  <p className="text-slate-600">Manage payments for this deal quickly and efficiently</p>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => router.push(`/deals/payments?id=${id}`)}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Payments
                  </button>
                    <button
                      onClick={() => router.push(`/deals/${id}/add-payment`)}
                      className="inline-flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Payment
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width Grid Layout */}
      <div className="w-full px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* Left Sidebar - Quick Info & Navigation */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* Quick Overview */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                  <svg className="w-5 h-5 text-slate-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Deal Overview
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-2">Deal ID</p>
                  <p className="text-2xl font-bold text-slate-900">#{deal.id}</p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-600">Status</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {status === 'open' ? 'Active' : 'Closed'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-600">Owners</span>
                    <span className="text-sm font-medium text-slate-900">{owners.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-600">Investors</span>
                    <span className="text-sm font-medium text-slate-900">{investors.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-600">Expenses</span>
                    <span className="text-sm font-medium text-slate-900">{expenses.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-600">Documents</span>
                    <span className="text-sm font-medium text-slate-900">{documents.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            {(deal.purchase_amount || deal.selling_amount) && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="px-6 py-5 border-b border-slate-200 bg-emerald-50">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                    <svg className="w-5 h-5 text-emerald-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Financial Summary
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  {deal.purchase_amount && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Purchase Amount</p>
                      <p className="text-xl font-bold text-slate-900">₹{deal.purchase_amount?.toLocaleString('en-IN')}</p>
                    </div>
                  )}
                  {deal.selling_amount && (
                    <div>
                      <p className="text-sm text-emerald-600 mb-1">Selling Amount</p>
                      <p className="text-xl font-bold text-emerald-700">₹{deal.selling_amount?.toLocaleString('en-IN')}</p>
                    </div>
                  )}
                  {deal.selling_amount && deal.purchase_amount && (
                    <div className="pt-4 border-t border-slate-200">
                      <p className="text-sm text-slate-600 mb-1">Profit/Loss</p>
                      <p className={`text-xl font-bold ${
                        (deal.selling_amount - deal.purchase_amount) >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        ₹{((deal.selling_amount - deal.purchase_amount) || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Navigation */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                <h3 className="text-lg font-semibold text-slate-900">Quick Navigation</h3>
              </div>
              <div className="p-4 space-y-2">
                <a href="#project-info" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                  Project Information
                </a>
                <a href="#financial-info" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                  Financial Details
                </a>
                <a href="#owners-section" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                  Owners ({owners.length})
                </a>
                <a href="#investors-section" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                  Investors ({investors.length})
                </a>
                <a href="#expenses-section" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                  Expenses ({expenses.length})
                </a>
                <a href="#documents-section" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                  Documents ({documents.length})
                </a>
              </div>
            </div>
          </div>

          {/* Main Content - Takes 3/4 of the width */}
          <div className="xl:col-span-3 space-y-8">
            
            {/* Project Information */}
            <section id="project-info" className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-slate-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <h2 className="text-xl font-semibold text-slate-900">Project Information</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Project Name</label>
                    <div className="text-slate-900 py-3 px-4 bg-slate-50 rounded-lg border border-slate-200 font-medium">{deal.project_name || 'Not specified'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Survey Number</label>
                    <div className="text-slate-900 py-3 px-4 bg-slate-50 rounded-lg border border-slate-200">{deal.survey_number || 'Not specified'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Location</label>
                    <div className="text-slate-900 py-3 px-4 bg-slate-50 rounded-lg border border-slate-200">
                      {(deal.district || deal.taluka || deal.village) ? 
                        `${deal.district || ''}${deal.district && deal.taluka ? ', ' : ''}${deal.taluka || ''}${(deal.village && (deal.district || deal.taluka)) ? ', ' : ''}${deal.village || ''}` 
                        : 'Not specified'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">District</label>
                    <div className="text-slate-900 py-3 px-4 bg-slate-50 rounded-lg border border-slate-200">{deal.district || 'Not specified'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Taluka</label>
                    <div className="text-slate-900 py-3 px-4 bg-slate-50 rounded-lg border border-slate-200">{deal.taluka || 'Not specified'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Village</label>
                    <div className="text-slate-900 py-3 px-4 bg-slate-50 rounded-lg border border-slate-200">{deal.village || 'Not specified'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Total Area</label>
                    <div className="text-slate-900 py-3 px-4 bg-slate-50 rounded-lg border border-slate-200">{deal.total_area || 'Not specified'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Created By</label>
                    <div className="text-slate-900 py-3 px-4 bg-slate-50 rounded-lg border border-slate-200">{deal.created_by_name || deal.created_by || 'Not specified'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                    <div className="py-3 px-4 bg-slate-50 rounded-lg border border-slate-200">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${
                        status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {status || 'Not specified'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Financial Information */}
            <section id="financial-info" className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-emerald-50">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-emerald-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <h2 className="text-xl font-semibold text-slate-900">Financial Information</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Purchase Date</label>
                    <div className="text-slate-900 py-3 px-4 bg-slate-50 rounded-lg border border-slate-200">{deal.purchase_date || 'Not specified'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Purchase Amount</label>
                    <div className="text-slate-900 py-3 px-4 bg-slate-50 rounded-lg border border-slate-200 font-bold text-lg">
                      ₹{deal.purchase_amount?.toLocaleString('en-IN') || '0'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Selling Amount</label>
                    <div className="text-emerald-700 py-3 px-4 bg-emerald-50 rounded-lg border border-emerald-200 font-bold text-lg">
                      ₹{deal.selling_amount?.toLocaleString('en-IN') || 'Not set'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Mode</label>
                    <div className="text-slate-900 py-3 px-4 bg-slate-50 rounded-lg border border-slate-200 capitalize">{paymentMode || 'Not specified'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Mutation Status</label>
                    <div className="py-3 px-4 bg-slate-50 rounded-lg border border-slate-200">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        mutationDone ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {mutationDone ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Profit Allocation</label>
                    <div className="text-slate-900 py-3 px-4 bg-slate-50 rounded-lg border border-slate-200">{profitAllocation || 'Not specified'}</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Owners Section */}
            <section id="owners-section" className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-slate-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <h2 className="text-xl font-semibold text-slate-900">Property Owners</h2>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-sm font-medium">
                    {owners.length} owner{owners.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="p-6">
                {owners.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-16 w-16 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No Owners Listed</h3>
                    <p className="text-slate-600">No property owners have been added to this deal yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">Name</th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">Photo URL</th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">Aadhar Card</th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">PAN Card</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {owners.map((owner, index) => (
                          <tr key={owner.id || index} className="hover:bg-slate-50">
                            <td className="py-4 px-4 text-sm font-medium text-slate-900">{owner.name || 'Not specified'}</td>
                            <td className="py-4 px-4 text-sm text-slate-600">{owner.photo || 'Not provided'}</td>
                            <td className="py-4 px-4 text-sm text-slate-600">{owner.aadhar_card || 'Not provided'}</td>
                            <td className="py-4 px-4 text-sm text-slate-600">{owner.pan_card || 'Not provided'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* Buyers Section */}
            <section className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-slate-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h2 className="text-xl font-semibold text-slate-900">Property Buyers</h2>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-sm font-medium">
                    {buyers.length} buyer{buyers.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="p-6">
                {buyers.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-16 w-16 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No Buyers Listed</h3>
                    <p className="text-slate-600">No property buyers have been added to this deal yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">Name</th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">Photo URL</th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">Aadhar Card</th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">PAN Card</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {buyers.map((buyer, index) => (
                          <tr key={buyer.id || index} className="hover:bg-slate-50">
                            <td className="py-4 px-4 text-sm font-medium text-slate-900">{buyer.name || 'Not specified'}</td>
                            <td className="py-4 px-4 text-sm text-slate-600">{buyer.photo || 'Not provided'}</td>
                            <td className="py-4 px-4 text-sm text-slate-600">{buyer.aadhar_card || 'Not provided'}</td>
                            <td className="py-4 px-4 text-sm text-slate-600">{buyer.pan_card || 'Not provided'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* Investors Section */}
            <section id="investors-section" className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-blue-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h2 className="text-xl font-semibold text-slate-900">Investors</h2>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 bg-blue-200 text-blue-700 rounded-full text-sm font-medium">
                    {investors.length} investor{investors.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="p-6">
                {investors.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-16 w-16 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No Investors</h3>
                    <p className="text-slate-600">No investors have been added to this deal yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">Name</th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">Amount</th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">Percentage</th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">Phone</th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">Email</th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">Aadhar</th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">PAN</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {investors.map((inv, index) => (
                          <tr key={inv.id || index} className="hover:bg-slate-50">
                            <td className="py-4 px-4 text-sm font-medium text-slate-900">{inv.investor_name || 'Not specified'}</td>
                            <td className="py-4 px-4 text-sm font-bold text-blue-600">₹{inv.investment_amount?.toLocaleString('en-IN') || '0'}</td>
                            <td className="py-4 px-4 text-sm text-slate-600">{inv.investment_percentage}% || 'Not set'</td>
                            <td className="py-4 px-4 text-sm text-slate-600">{inv.phone || 'Not provided'}</td>
                            <td className="py-4 px-4 text-sm text-slate-600">{inv.email || 'Not provided'}</td>
                            <td className="py-4 px-4 text-sm text-slate-600">{inv.aadhar_card || 'Not provided'}</td>
                            <td className="py-4 px-4 text-sm text-slate-600">{inv.pan_card || 'Not provided'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* Expenses Section */}
            <section id="expenses-section" className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-orange-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-orange-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <h2 className="text-xl font-semibold text-slate-900">Expenses</h2>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 bg-orange-200 text-orange-700 rounded-full text-sm font-medium">
                    {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="p-6">
                {expenses.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-16 w-16 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No Expenses Recorded</h3>
                    <p className="text-slate-600">No expenses have been added to this deal yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">Type</th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">Description</th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">Amount</th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">Paid By</th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">Date</th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">Receipt #</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {expenses.map((exp, index) => (
                          <tr key={exp.id || index} className="hover:bg-slate-50">
                            <td className="py-4 px-4 text-sm font-medium text-slate-900">{exp.expense_type || 'Not specified'}</td>
                            <td className="py-4 px-4 text-sm text-slate-600">{exp.expense_description || 'Not provided'}</td>
                            <td className="py-4 px-4 text-sm font-bold text-orange-600">₹{exp.amount?.toLocaleString('en-IN') || '0'}</td>
                            <td className="py-4 px-4 text-sm text-slate-600">
                              {exp.paid_by_name || 
                               (investors.find(inv => String(inv.id) === String(exp.paid_by))?.investor_name) || 
                               exp.paid_by || 'Not specified'}
                            </td>
                            <td className="py-4 px-4 text-sm text-slate-600">{exp.expense_date || 'Not provided'}</td>
                            <td className="py-4 px-4 text-sm text-slate-600">{exp.receipt_number || 'Not provided'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* Documents Section */}
            <section id="documents-section" className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-slate-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h2 className="text-xl font-semibold text-slate-900">Documents</h2>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-sm font-medium">
                    {documents.length} document{documents.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="p-6">
                {documents.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-16 w-16 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No Documents Uploaded</h3>
                    <p className="text-slate-600">No documents have been uploaded for this deal yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">Document Type</th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">Document Name</th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">File Size</th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">Uploaded By</th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 text-sm">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {documents.map((doc, index) => (
                          <tr key={doc.id || index} className="hover:bg-slate-50">
                            <td className="py-4 px-4 text-sm font-medium text-slate-900">{doc.document_type || 'Not specified'}</td>
                            <td className="py-4 px-4 text-sm text-slate-600">{doc.document_name || 'Not provided'}</td>
                            <td className="py-4 px-4 text-sm text-slate-600">{doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : 'Unknown'}</td>
                            <td className="py-4 px-4 text-sm text-slate-600">{doc.uploaded_by || 'Not specified'}</td>
                            <td className="py-4 px-4 text-sm">
                              <a
                                href={`http://localhost:5000/uploads/${doc.file_path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md font-medium transition-all duration-200"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
