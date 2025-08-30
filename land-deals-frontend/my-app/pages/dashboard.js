// pages/dashboard.js - Full Width Professional Dashboard with Fixed Icons
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { getUser, logout, isAuthenticated } from '../lib/auth'
import { dealAPI } from '../lib/api'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Navbar from '../components/layout/Navbar'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchDeals = useCallback(async () => {
    try {
      const response = await dealAPI.getAll()
      setDeals(response.data)
    } catch (error) {
      if (error?.response?.status === 401) {
        toast.error('Session expired. Please login again.')
        logout()
        router.push('/login')
      } else {
        toast.error('Failed to fetch deals')
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    setUser(getUser())
    fetchDeals()
  }, [fetchDeals, router])

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
            <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Loading Dashboard</h3>
          <p className="text-slate-600">Please wait while we prepare your data</p>
        </div>
      </div>
    )
  }

  // Calculate statistics
  const totalDeals = deals.length
  const activeDeals = deals.filter(deal => deal.status === 'open').length
  const closedDeals = deals.filter(deal => deal.status === 'closed').length

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation - Full Width */}
      <div className="bg-white  border-b border-slate-200 w-full">
        <Navbar user={user} onLogout={handleLogout} />
      </div>

      {/* Page Header - Full Width */}
      <div className="w-full">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Property Management Dashboard
                </h1>
                <div className="mt-2 flex items-center text-sm text-slate-500 space-x-4">
                  <span className="font-medium text-slate-700">{user?.name || 'User'}</span>
                  <span>•</span>
                  <span className="capitalize">{user?.role}</span>
                  <span>•</span>
                  <span>{new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              {(user?.role === 'admin' || user?.role === 'auditor') && (
                <Link href="/deals/new">
                  <span className="flex items-center rounded bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 cursor-pointer">
                    + Create New Deal
                  </span>
                </Link>
              )}
              <Link href="/deals/deals">
                <span className="flex items-center rounded bg-white px-6 py-3 text-sm font-medium text-slate-900 border border-slate-300 hover:bg-slate-50 cursor-pointer">
                  View All Deals
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width Layout */}
      <div className="w-full px-6 py-8 space-y-8">
        
        {/* Statistics Section - ONLY ICONS CHANGED HERE */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Total Deals */}
          <div className="bg-white overflow-hidden  rounded border border-slate-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Deals</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{totalDeals}</p>
                  <p className="text-xs text-slate-500 mt-1">All registered deals</p>
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Active Deals */}
          <div className="bg-white overflow-hidden  rounded border border-slate-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Deals</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{activeDeals}</p>
                  <p className="text-xs text-slate-500 mt-1">Currently ongoing</p>
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Closed Deals */}
          <div className="bg-white overflow-hidden  rounded border border-slate-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Closed Deals</p>
                  <p className="text-3xl font-bold text-slate-700 mt-2">{closedDeals}</p>
                  <p className="text-xs text-slate-500 mt-1">Successfully completed</p>
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-white overflow-hidden  rounded border border-slate-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Success Rate</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">
                    {totalDeals > 0 ? Math.round((closedDeals / totalDeals) * 100) : 0}%
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Deal completion rate</p>
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout for Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* Main Content - Recent Deals (3/4 width) */}
          <div className="xl:col-span-3">
            <div className="bg-white  rounded border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-medium text-slate-900">Recent Property Deals</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Overview of your latest property transactions and agreements
                    </p>
                  </div>
                  <Link href="/deals/deals">
                    <span className="text-sm font-medium text-slate-700 hover:text-slate-900 cursor-pointer flex items-center px-4 py-2 border border-slate-300 rounded hover:bg-white ">
                      View all deals
                      <span className="ml-2">→</span>
                    </span>
                  </Link>
                </div>
              </div>

              <div className="p-6">
                {deals.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-slate-100 rounded mx-auto mb-6 flex items-center justify-center">
                      <div className="w-10 h-10 border-2 border-slate-300 rounded"></div>
                    </div>
                    <h3 className="text-xl font-medium text-slate-900 mb-3">No deals available</h3>
                    <p className="text-slate-600 mb-8 max-w-md mx-auto">
                      Get started by creating your first property deal to begin tracking your transactions and managing your portfolio.
                    </p>
                    {(user?.role === 'admin' || user?.role === 'auditor') && (
                      <Link href="/deals/new">
                        <span className="flex items-center rounded bg-slate-900 px-6 py-3 text-sm font-medium text-white  hover:bg-slate-800 cursor-pointer ">
                          Create Your First Deal
                        </span>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deals.slice(0, 8).map((deal) => (
                      <div
                        key={deal.id}
                        className="border border-slate-200 rounded hover:shadow-md hover:border-slate-300 "
                      >
                        <Link href={`/deals/${deal.id}`}>
                          <div className="p-6 cursor-pointer">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-4">
                                  <div className="flex-1">
                                    <h3 className="text-lg font-medium text-slate-900 truncate">
                                      {deal.project_name}
                                    </h3>
                                    <p className="text-sm text-slate-600 mt-1">
                                      Survey: {deal.survey_number || 'Not specified'} • {(deal.district || deal.taluka || deal.village) ? `${deal.district || ''}${deal.district && deal.taluka ? ', ' : ''}${deal.taluka || ''}${(deal.village && (deal.district || deal.taluka)) ? ', ' : ''}${deal.village || ''}` : 'Not specified'}
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-6">
                                    <div className="text-right">
                                      <p className="text-sm font-medium text-slate-600">Purchase Amount</p>
                                      <p className="text-lg font-medium text-slate-900">
                                        ₹{deal.purchase_amount?.toLocaleString('en-IN') || '0'}
                                      </p>
                                    </div>
                                    {deal.selling_amount && (
                                      <div className="text-right">
                                        <p className="text-sm font-medium text-slate-600">Selling Amount</p>
                                        <p className="text-lg font-medium text-slate-900">
                                          ₹{deal.selling_amount?.toLocaleString('en-IN')}
                                        </p>
                                      </div>
                                    )}
                                    <div className="text-right">
                                      <span
                                        className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                          deal.status === 'open'
                                            ? 'bg-slate-100 text-slate-800'
                                            : 'bg-slate-100 text-slate-700'
                                        }`}
                                      >
                                        {deal.status === 'open' ? 'Active' : 'Closed'}
                                      </span>
                                      <p className="text-xs text-slate-500 mt-2">
                                        {new Date(deal.created_at).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>

                        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-sm text-slate-600">
                              <span>Deal ID: #{deal.id}</span>
                              <span>•</span>
                              <span>Last updated: {new Date(deal.created_at).toLocaleDateString()}</span>
                            </div>
                            <button
                              className="text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded "
                              onClick={async (e) => {
                                e.preventDefault()
                                if (window.confirm('Are you sure you want to delete this deal? This action cannot be undone.')) {
                                  try {
                                    await dealAPI.delete(deal.id)
                                    toast.success('Deal deleted successfully')
                                    setDeals(deals.filter(d => d.id !== deal.id))
                                  } catch {
                                    toast.error('Failed to delete deal')
                                  }
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Quick Actions & Info (1/4 width) */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* Quick Actions */}
            <div className="bg-white  rounded border border-slate-200">
              <div className="px-4 py-4 border-b border-slate-200 bg-slate-50">
                <h3 className="text-lg font-medium text-slate-900">Quick Actions</h3>
              </div>
              <div className="p-4 space-y-3">
                {(user?.role === 'admin' || user?.role === 'auditor') && (
                  <Link href="/deals/new">
                    <span className="w-full flex items-center justify-center px-4 py-3 border border-slate-300 rounded text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer ">
                      + New Deal
                    </span>
                  </Link>
                )}
                <Link href="/deals/deals">
                  <span className="w-full flex items-center justify-center px-4 py-3 border border-slate-300 rounded text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer ">
                    Browse All
                  </span>
                </Link>
              </div>
            </div>

            {/* System Info */}
            <div className="bg-white  rounded border border-slate-200">
              <div className="px-4 py-4 border-b border-slate-200 bg-slate-50">
                <h3 className="text-lg font-medium text-slate-900">System Information</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-slate-600">User Role</span>
                  <span className="text-sm font-medium text-slate-900 capitalize px-2 py-1 bg-slate-100 rounded">
                    {user?.role}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-slate-600">Total Deals</span>
                  <span className="text-sm font-medium text-slate-900">{totalDeals}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-slate-600">Active Deals</span>
                  <span className="text-sm font-medium text-slate-900">{activeDeals}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-slate-600">Last Login</span>
                  <span className="text-sm font-medium text-slate-900">Today</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white  rounded border border-slate-200">
              <div className="px-4 py-4 border-b border-slate-200 bg-slate-50">
                <h3 className="text-lg font-medium text-slate-900">Recent Activity</h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span className="text-sm text-slate-600">Dashboard accessed</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                    <span className="text-sm text-slate-600">System updated</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                    <span className="text-sm text-slate-600">User logged in</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
