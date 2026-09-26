import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Server } from 'lucide-react'

interface AddMachineModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const AddMachineModal = ({ isOpen, onClose, onSuccess }: AddMachineModalProps) => {
  const [name, setName] = useState('')
  const [type, setType] = useState('Machining')
  const [status, setStatus] = useState('Active')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('http://localhost:8000/api/v1/machines/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, status })
      })

      if (res.ok) {
        onSuccess()
        onClose()
        setName('')
        setType('Machining')
        setStatus('Active')
      } else {
        console.error('Failed to add machine', await res.text())
      }
    } catch (error) {
      console.error('Error adding machine:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass-panel w-full max-w-md p-6 z-10"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <Server size={20} />
                </div>
                <h2 className="text-xl font-bold text-white">Add New Machine</h2>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Machine Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full glass-input rounded-lg px-4 py-2"
                  placeholder="e.g. CNC Lathe Beta"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Equipment Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full glass-input rounded-lg px-4 py-2 [&>option]:bg-gray-900"
                >
                  <option value="Machining">Machining</option>
                  <option value="Assembly">Assembly</option>
                  <option value="Stamping">Stamping</option>
                  <option value="Molding">Molding</option>
                  <option value="Welding">Welding</option>
                  <option value="Transport">Transport</option>
                  <option value="Packaging">Packaging</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Initial Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full glass-input rounded-lg px-4 py-2 [&>option]:bg-gray-900"
                >
                  <option value="HEALTHY">Healthy</option>
                  <option value="WARNING">Warning</option>
                  <option value="HIGH_RISK">High Risk</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="glass-button px-4 py-2 rounded-lg font-medium flex items-center justify-center min-w-[100px]"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Add Machine'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
