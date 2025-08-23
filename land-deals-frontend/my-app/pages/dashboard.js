// pages/dashboard.js - Main dashboard
import { useEffect, useState } from 'react'
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
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-blue-600"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Calculate statistics
  const totalDeals = deals.length
  const activeDeals = deals.filter(deal => deal.status === 'open').length
  const closedDeals = deals.filter(deal => deal.status === 'closed').length

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col">
      {/* Navigation Header */}
      <div className="bg-white border-b border-gray-200">
        <Navbar user={user} onLogout={handleLogout} />
      </div>

      {/* Dashboard Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              Welcome back, <span className="font-medium">{user?.name || 'User'}</span>
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {(user?.role === 'admin' || user?.role === 'auditor') && (
              <Link href="/deals/new">
                <span className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition-colors font-medium text-sm">
                  + New Deal
                </span>
              </Link>
            )}
            <Link href="/deals/deals">
              <span className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors font-medium text-sm">
                View All
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-6 space-y-6">

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Deals Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Deals</p>
                <p className="text-2xl font-bold text-gray-900">{totalDeals}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
              </div>
            </div>
          </div>

          {/* Active Deals Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Deals</p>
                <p className="text-2xl font-bold text-green-600">{activeDeals}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
              </div>
            </div>
          </div>

          {/* Closed Deals Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Closed Deals</p>
                <p className="text-2xl font-bold text-gray-600">{closedDeals}</p>
              </div>
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-gray-600 rounded"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Deals Section */}
        <div className="bg-white rounded-lg border border-gray-200">
          {/* Section Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Deals</h2>
                <p className="text-sm text-gray-600">Latest property transactions</p>
              </div>
              <Link href="/deals/deals">
                <span className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer font-medium">
                  View all →
                </span>
              </Link>
            </div>
          </div>

          {/* Deals Content */}
          <div className="p-6">
            {deals.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-gray-400 rounded"></div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No deals found</h3>
                <p className="text-gray-600 mb-4">Get started by creating your first deal</p>
                {(user?.role === 'admin' || user?.role === 'auditor') && (
                  <Link href="/deals/new">
                    <span className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors text-sm">
                      Create New Deal
                    </span>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {deals.slice(0, 6).map((deal) => (
                  <div key={deal.id} className="border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                    <Link href={`/deals/${deal.id}`}>
                      <div className="p-4 cursor-pointer">
                        {/* Deal Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 truncate">
                              {deal.project_name}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {deal.survey_number || 'N/A'}
                            </p>
                          </div>
                          <span
                            className={`ml-2 inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              deal.status === 'open'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {deal.status.toUpperCase()}
                          </span>
                        </div>

                        {/* Location */}
                        <div className="text-sm text-gray-600 mb-3">
                          <span className="truncate">{deal.location}</span>
                        </div>

                        {/* Financial Info */}
                        <div className="space-y-1 mb-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Purchase:</span>
                            <span className="font-medium text-gray-900">
                              ₹{deal.purchase_amount?.toLocaleString() || '0'}
                            </span>
                          </div>
                          {deal.selling_amount && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Selling:</span>
                              <span className="font-medium text-gray-900">
                                ₹{deal.selling_amount?.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Date */}
                        <div className="text-xs text-gray-500 border-t pt-2">
                          {new Date(deal.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    </Link>

                    {/* Delete Action */}
                    <div className="px-4 pb-4">
                      <button
                        className="w-full text-center py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors text-sm"
                        onClick={async (e) => {
                          e.preventDefault()
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
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>Role: <span className="font-medium text-gray-900">{user?.role}</span></span>
            <span>Updated: <span className="font-medium text-gray-900">{new Date().toLocaleDateString()}</span></span>
          </div>
        </div>
      </div>
    </div>
  )
}
