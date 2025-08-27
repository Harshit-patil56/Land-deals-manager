import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { adminAPI } from '../../lib/api'
import { getUser } from '../../lib/auth'
import toast from 'react-hot-toast'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ username: '', password: '', role: 'user', full_name: '' })
  const router = useRouter()

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminAPI.listUsers()
      setUsers(res.data)
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to load users'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // run once: guard access and only load when confirmed admin
  useEffect(() => {
    const u = getUser()
    if (!u) {
      router.push('/login')
      return
    }
    if (u.role !== 'admin') {
      // show friendly message instead of immediately redirecting
      setError('Access denied: admin only')
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await adminAPI.createUser(form)
      toast.success('User created')
      setForm({ username: '', password: '', role: 'user', full_name: '' })
      load()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Create failed')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this user?')) return
    try {
      await adminAPI.deleteUser(id)
      toast.success('Deleted')
      load()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Delete failed')
    }
  }

  const handleReset = async (id) => {
    const pw = prompt('Enter new password for user (will be hashed):')
    if (!pw) return
    try {
      await adminAPI.updateUser(id, { password: pw })
      toast.success('Password updated')
      load()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Update failed')
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Admin: Manage Users</h1>
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-800 border border-red-100 rounded">{error}</div>
      )}

      <div className="mb-6">
        <form onSubmit={handleCreate} className="space-y-3 max-w-md">
          <input value={form.username} onChange={e=>setForm({...form, username:e.target.value})} placeholder="username" className="w-full p-2 border rounded" />
          <input value={form.password} onChange={e=>setForm({...form, password:e.target.value})} placeholder="password" className="w-full p-2 border rounded" />
          <input value={form.full_name} onChange={e=>setForm({...form, full_name:e.target.value})} placeholder="full name" className="w-full p-2 border rounded" />
          <select value={form.role} onChange={e=>setForm({...form, role:e.target.value})} className="w-full p-2 border rounded">
            <option value="user">user</option>
            <option value="admin">admin</option>
            <option value="auditor">auditor</option>
          </select>
          <button className="px-4 py-2 bg-slate-900 text-white rounded">Create user</button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Existing users</h2>
        {loading ? <div>Loading...</div> : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left">
                <th className="p-2">ID</th>
                <th className="p-2">Username</th>
                <th className="p-2">Full name</th>
                <th className="p-2">Role</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t">
                  <td className="p-2">{u.id}</td>
                  <td className="p-2">{u.username}</td>
                  <td className="p-2">{u.full_name}</td>
                  <td className="p-2">{u.role}</td>
                  <td className="p-2 space-x-2">
                    <button onClick={()=>handleReset(u.id)} className="px-2 py-1 bg-yellow-400 rounded">Reset PW</button>
                    <button onClick={()=>handleDelete(u.id)} className="px-2 py-1 bg-red-500 text-white rounded">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
