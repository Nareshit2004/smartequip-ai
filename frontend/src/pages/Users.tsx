import { useState, useEffect } from 'react'
import { Users as UsersIcon, CheckCircle, XCircle, UserPlus } from 'lucide-react'
import { AddUserModal } from '../components/AddUserModal'

interface User {
  id: number
  email: string
  full_name: string
  role: string
  is_active: boolean
}

export const Users = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:8000/api/v1/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError("You do not have permission to view this page. Admin access required.")
        } else {
          setError("Failed to fetch users.")
        }
        return
      }
      const data = await res.json()
      setUsers(data)
    } catch (e) {
      setError("Network error fetching users.")
    } finally {
      setLoading(false)
    }
  }

  const toggleUserStatus = async (id: number, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:8000/api/v1/users/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !currentStatus })
      })
      if (res.ok) {
        fetchUsers()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const changeUserRole = async (id: number, newRole: string) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:8000/api/v1/users/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      })
      if (res.ok) {
        fetchUsers()
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
            <UsersIcon size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-gray-400 mt-1">Manage platform access and roles</p>
          </div>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 glass-button px-4 py-2 rounded-lg font-medium"
        >
          <UserPlus size={18} />
          Add User
        </button>
      </div>

      {error ? (
        <div className="glass-panel p-6 text-center text-rose-500">
          <p>{error}</p>
        </div>
      ) : loading ? (
        <div className="glass-panel p-6 text-center text-gray-400">
          <p>Loading users...</p>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800/50 border-b border-gray-700">
                <th className="p-4 text-gray-300 font-medium">Name</th>
                <th className="p-4 text-gray-300 font-medium">Email</th>
                <th className="p-4 text-gray-300 font-medium">Role</th>
                <th className="p-4 text-gray-300 font-medium">Status</th>
                <th className="p-4 text-gray-300 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="p-4">
                    <div className="text-white font-medium">{user.full_name || 'N/A'}</div>
                  </td>
                  <td className="p-4 text-gray-400">{user.email}</td>
                  <td className="p-4">
                    <select
                      value={user.role}
                      onChange={(e) => changeUserRole(user.id, e.target.value)}
                      className="bg-gray-900 border border-gray-700 text-white rounded px-2 py-1 outline-none focus:border-primary"
                    >
                      <option value="admin">Admin</option>
                      <option value="engineer">Engineer</option>
                      <option value="operator">Operator</option>
                    </select>
                  </td>
                  <td className="p-4">
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle size={12} /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <XCircle size={12} /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => toggleUserStatus(user.id, user.is_active)}
                      className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchUsers}
      />
    </div>
  )
}
