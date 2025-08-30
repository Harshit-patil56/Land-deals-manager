import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { getUser, isAuthenticated } from '../../lib/auth'
import { hasPermission, PERMISSIONS } from '../../lib/permissions'
import toast from 'react-hot-toast'

export default function AdminIndex() {
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    const currentUser = getUser()
    if (!hasPermission(currentUser, PERMISSIONS.ADMIN_ACCESS)) {
      toast.error('Access denied. Admin privileges required.')
      router.push('/dashboard')
      return
    }

    // Redirect directly to user management
    router.push('/admin/users')
  }, [router])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
          <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">Redirecting to User Management</h3>
        <p className="text-slate-600">Please wait...</p>
      </div>
    </div>
  )
}
