// pages/deals/index.js - Deals Listing page
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getUser, logout, isAuthenticated } from '../../lib/auth'
import { dealAPI } from '../../lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Navbar from '../../components/layout/Navbar'

export default function DealsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }
    setUser(getUser())
    fetchDeals()
  }, [])

  const fetchDeals = async () => {
    try {
      const response = await dealAPI.getAll()
      setDeals(response.data)
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.')
        logout()
        router.push('/login')
      } else {
        toast.error('Failed to fetch deals')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full flex justify-center items-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
          <p className="text-gray-600 font-medium">Loading deals...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col">
      {/* Navigation Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <Navbar user={user} onLogout={handleLogout} />
      </div>

      {/* Page Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Deals</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage and view all your property deals
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              {deals.length} deal{deals.length !== 1 ? 's' : ''} found
            </span>
            <Link href="/dashboard">
              <span className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors">
                ← Back to Dashboard
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content - Full Screen */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full px-6 py-6">
          {deals.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="text-center">
                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No deals found</h3>
                <p className="text-gray-500 mb-6">Get started by creating your first deal!</p>
                <Link href="/deals/new">
                  <span className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition-colors">
                    Create New Deal
                  </span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Table Header */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="col-span-3">Project Details</div>
                  <div className="col-span-2">Location</div>
                  <div className="col-span-2">Financial Info</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Created Date</div>
                  <div className="col-span-1">Actions</div>
                </div>
              </div>

              {/* Scrollable Deal List */}
              <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
                <div className="divide-y divide-gray-200">
                  {deals.map((deal) => (
                    <div key={deal.id} className="hover:bg-gray-50 transition-colors">
                      <Link href={`/deals/${deal.id}`}>
                        <div className="px-6 py-4 cursor-pointer">
                          <div className="grid grid-cols-12 gap-4 items-center">
                            {/* Project Details */}
                            <div className="col-span-3">
                              <div className="flex items-start">
                                <div className="flex-1">
                                  <h4 className="text-sm font-medium text-gray-900 truncate">
                                    {deal.project_name}
                                  </h4>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Survey: {deal.survey_number || 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Location */}
                            <div className="col-span-2">
                              <div className="flex items-center text-sm text-gray-900">
                                <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="truncate">{deal.location}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                {deal.district}, {deal.taluka}
                              </p>
                            </div>

                            {/* Financial Info */}
                            <div className="col-span-2">
                              <div className="text-sm">
                                <div className="flex items-center text-gray-900 mb-1">
                                  <svg className="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                  </svg>
                                  <span className="text-xs">₹{deal.purchase_amount?.toLocaleString() || '0'}</span>
                                </div>
                                {deal.selling_amount && (
                                  <div className="flex items-center text-gray-600">
                                    <svg className="w-4 h-4 text-blue-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                    <span className="text-xs">₹{deal.selling_amount?.toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Status */}
                            <div className="col-span-2">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  deal.status === 'open'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                    deal.status === 'open' ? 'bg-green-600' : 'bg-gray-600'
                                  }`}
                                />
                                {deal.status.toUpperCase()}
                              </span>
                            </div>

                            {/* Created Date */}
                            <div className="col-span-2">
                              <div className="text-sm text-gray-900">
                                {new Date(deal.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(deal.created_at).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="col-span-1">
                              <div className="flex justify-end">
                                <button
                                  className="inline-flex items-center p-1.5 border border-transparent rounded-md text-red-600 hover:bg-red-50 transition-colors"
                                  onClick={async (e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    if (window.confirm('Are you sure you want to delete this deal?')) {
                                      try {
                                        await dealAPI.delete(deal.id)
                                        toast.success('Deal deleted successfully')
                                        setDeals(deals.filter(d => d.id !== deal.id))
                                      } catch (err) {
                                        toast.error('Failed to delete deal')
                                      }
                                    }
                                  }}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <div className="flex items-center space-x-6">
            <span>
              <span className="font-medium text-gray-900">{deals.filter(d => d.status === 'open').length}</span> Open Deals
            </span>
            <span>
              <span className="font-medium text-gray-900">{deals.filter(d => d.status === 'closed').length}</span> Closed Deals
            </span>
            <span>
              Total Value: <span className="font-medium text-gray-900">
                ₹{deals.reduce((sum, deal) => sum + (deal.purchase_amount || 0), 0).toLocaleString()}
              </span>
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}
