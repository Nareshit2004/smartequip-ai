import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, CheckCircle2 } from 'lucide-react'

interface WorkOrderModalProps {
  isOpen: boolean
  onClose: () => void
  machineId?: string
  faultReportId?: string
  onSuccess?: () => void
}

const DEFAULT_MACHINES = [
  { id: 'M-1', name: 'CNC Lathe Alpha' },
  { id: 'M-2', name: 'CNC Milling Machine Beta' },
  { id: 'M-3', name: 'Hydraulic Press Gamma' },
  { id: 'M-4', name: 'Industrial Compressor Delta' },
  { id: 'M-5', name: 'Injection Molding Machine Epsilon' },
  { id: 'M-6', name: 'Robotic Welding Cell Zeta' },
  { id: 'M-7', name: 'Industrial Pump Eta' },
  { id: 'M-8', name: 'Conveyor Drive System Theta' },
  { id: 'M-9', name: 'Industrial Air Compressor Iota' },
  { id: 'M-10', name: 'CNC Grinding Machine Kappa' },
  { id: 'M-11', name: 'Gearbox Assembly Unit Lambda' },
  { id: 'M-12', name: 'Industrial Boiler Unit Mu' },
  { id: 'M-13', name: 'Automated Cutting Machine Nu' },
  { id: 'M-14', name: 'Hydraulic Pump System Xi' },
  { id: 'M-15', name: 'Industrial Fan System Omicron' },
]

export const WorkOrderModal = ({ isOpen, onClose, machineId, faultReportId, onSuccess }: WorkOrderModalProps) => {
  const [selectedMachine, setSelectedMachine] = useState(machineId || 'M-1')
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0])
  const [technician, setTechnician] = useState('Tech-1 Alpha')
  const [priority, setPriority] = useState('High')
  const [reason, setReason] = useState('')
  const [duration, setDuration] = useState('2')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  if (!isOpen) return null

  const targetMachine = machineId || selectedMachine

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch('http://localhost:8000/api/v1/maintenance/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: targetMachine,
          fault_report_id: faultReportId || null,
          scheduled_date: new Date(scheduledDate).toISOString(),
          technician,
          priority,
          reason,
          estimated_duration_hours: parseFloat(duration) || 2.0
        })
      })

      if (res.ok) {
        setIsSuccess(true)
        onSuccess?.()
        setTimeout(() => {
          setIsSuccess(false)
          onClose()
          setReason('')
        }, 1500)
      }
    } catch (error) {
      console.error("Failed to schedule work order", error)
    } finally {
      setIsSubmitting(false)
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
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                  <Calendar size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Schedule Work Order</h2>
                  <p className="text-sm text-gray-400">
                    {machineId ? `Equipment: ${machineId}` : 'Create Maintenance Assignment'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            {isSuccess ? (
              <div className="p-12 flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Work Order Scheduled</h3>
                <p className="text-gray-400">The maintenance team has been assigned.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {!machineId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Target Machine</label>
                    <select
                      value={selectedMachine}
                      onChange={(e) => setSelectedMachine(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary/50"
                    >
                      {DEFAULT_MACHINES.map(m => (
                        <option key={m.id} value={m.id}>{m.id} — {m.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
                    <input 
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      required
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Priority</label>
                    <select 
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary/50"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Technician</label>
                    <select 
                      value={technician}
                      onChange={(e) => setTechnician(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary/50"
                    >
                      <option value="Tech-1 Alpha">Tech-1 Alpha</option>
                      <option value="Tech-2 Beta">Tech-2 Beta</option>
                      <option value="Ext. Contractor">Ext. Contractor</option>
                      <option value="John Doe">John Doe</option>
                      <option value="Jane Smith">Jane Smith</option>
                      <option value="Mike Ross">Mike Ross</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Est. Duration (Hrs)</label>
                    <input 
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      required
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Reason / Task Instructions</label>
                  <textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50 resize-none"
                    placeholder="Provide details about the maintenance task..."
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={onClose}
                    className="px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting || !reason}
                    className="glass-button px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/40 hover:text-indigo-300 border border-indigo-500/30"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-indigo-400/20 border-t-indigo-400 rounded-full animate-spin" />
                    ) : (
                      <Calendar size={16} />
                    )}
                    Schedule Order
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
