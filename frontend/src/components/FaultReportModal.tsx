import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react'

interface FaultReportModalProps {
  isOpen: boolean
  onClose: () => void
  machineId?: string
  aiPredictionId?: string
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

export const FaultReportModal = ({ isOpen, onClose, machineId, aiPredictionId, onSuccess }: FaultReportModalProps) => {
  const [selectedMachine, setSelectedMachine] = useState(machineId || 'M-1')
  const [category, setCategory] = useState('Mechanical')
  const [severity, setSeverity] = useState('Warning')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  if (!isOpen) return null

  const targetMachine = machineId || selectedMachine

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch('http://localhost:8000/api/v1/maintenance/fault-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: targetMachine,
          category,
          severity,
          description,
          reported_by: 'Shift Engineer',
          ai_prediction_id: aiPredictionId || null
        })
      })

      if (res.ok) {
        setIsSuccess(true)
        onSuccess?.()
        setTimeout(() => {
          setIsSuccess(false)
          onClose()
          setDescription('')
        }, 1500)
      }
    } catch (error) {
      console.error("Failed to submit fault report", error)
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
                <div className="p-2 bg-amber-500/20 text-amber-500 rounded-lg">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Report Fault</h2>
                  <p className="text-sm text-gray-400">
                    {machineId ? `Equipment: ${machineId}` : 'Log New Anomaly / Failure'}
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
                <h3 className="text-xl font-bold text-white mb-2">Fault Reported</h3>
                <p className="text-gray-400">The maintenance team has been notified.</p>
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

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Fault Category</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary/50"
                  >
                    <option value="Mechanical">Mechanical</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Software">Software/Sensor</option>
                    <option value="Hydraulic">Hydraulic</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Severity</label>
                  <select 
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary/50"
                  >
                    <option value="Critical">Critical (Immediate Action Required)</option>
                    <option value="Warning">Warning (Schedule Inspection)</option>
                    <option value="Info">Info (Monitor Situation)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={4}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50 resize-none"
                    placeholder="Provide details about the fault..."
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
                    disabled={isSubmitting || !description}
                    className="glass-button px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <FileText size={16} />
                    )}
                    Submit Report
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
