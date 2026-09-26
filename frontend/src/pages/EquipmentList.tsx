import { useState, useEffect } from 'react'
import { Server, Plus, Filter, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AddMachineModal } from '../components/AddMachineModal'

interface Machine {
  id: number
  name: string
  type: string
  status: string
  health_score: number
}

export const EquipmentList = () => {
  const [machines, setMachines] = useState<Machine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('All')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const fetchMachines = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('http://localhost:8000/api/v1/machines/')
      if (res.ok) {
        const data = await res.json()
        setMachines(data)
      }
    } catch (error) {
      console.error("Failed to fetch machines", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMachines()
    // Re-fetch whenever this page becomes visible (e.g. navigating back from Machine Details)
    const onFocus = () => fetchMachines()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Equipment Management</h1>
          <p className="text-gray-400 mt-1">Monitor and manage factory machines</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 glass-button px-4 py-2 rounded-lg min-w-[110px]"
            >
              <Filter size={18} />
              {filterStatus === 'All' ? 'Filter' : filterStatus}
            </button>

            <AnimatePresence>
              {isFilterOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 mt-2 w-40 glass-panel p-1 flex flex-col z-50 border border-gray-700 shadow-xl"
                >
                  {['All', 'HEALTHY', 'WARNING', 'HIGH_RISK', 'CRITICAL'].map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        setFilterStatus(status)
                        setIsFilterOpen(false)
                      }}
                      className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        filterStatus === status 
                          ? 'bg-primary/20 text-white' 
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {status === 'All' ? 'All Machines' : status}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 glass-button px-4 py-2 rounded-lg"
          >
            <Plus size={18} />
            Add Machine
          </button>
        </div>
      </div>

      <div className="glass-panel overflow-x-auto min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[400px]">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-gray-400">Loading equipment data from server...</p>
          </div>
        ) : machines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px]">
            <Server className="w-12 h-12 text-gray-500 mb-4" />
            <p className="text-gray-400">No equipment found. Add a machine to get started.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-800/50 text-gray-400 border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 font-medium text-sm">Machine ID</th>
                <th className="px-6 py-4 font-medium text-sm">Name</th>
                <th className="px-6 py-4 font-medium text-sm">Type</th>
                <th className="px-6 py-4 font-medium text-sm">Status</th>
                <th className="px-6 py-4 font-medium text-sm">Health Score</th>
                <th className="px-6 py-4 font-medium text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {(filterStatus === 'All' ? machines : machines.filter(m => m.status === filterStatus)).map((m, i) => (
                <motion.tr 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={m.id} 
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        <Server size={18} />
                      </div>
                      <span className="font-medium text-white">M-{m.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{m.name}</td>
                  <td className="px-6 py-4 text-gray-400">{m.type}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      m.status === 'HEALTHY' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                      m.status === 'WARNING' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      m.status === 'HIGH_RISK' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-gray-800 rounded-full h-2 max-w-[100px]">
                        <div 
                          className={`h-2 rounded-full ${
                            (m.health_score ?? 100) > 80 ? 'bg-emerald-500' : 
                            (m.health_score ?? 100) > 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, m.health_score ?? 100))}%` }}
                        ></div>
                      </div>
                      <span className="text-gray-300 text-sm">{(m.health_score ?? 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/machines/M-${m.id}`} className="text-primary hover:text-primary/80 text-sm font-medium transition-colors">
                      View Details
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AddMachineModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          fetchMachines()
        }}
      />
    </div>
  )
}
