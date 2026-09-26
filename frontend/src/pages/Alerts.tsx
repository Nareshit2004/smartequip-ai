import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle, Clock, Server, Loader2, Plus, Calendar } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FaultReportModal } from '../components/FaultReportModal'
import { WorkOrderModal } from '../components/WorkOrderModal'

interface Notification {
  notification_id: string
  machine_id: string
  machine_name: string
  severity: 'Critical' | 'Warning' | 'Info'
  message: string
  timestamp: string
  is_read: boolean
  is_resolved: boolean
}

export const Alerts = () => {
  const [alerts, setAlerts] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'critical' | 'resolved'>('all')
  
  const [faultModalOpen, setFaultModalOpen] = useState(false)
  const [workOrderModalOpen, setWorkOrderModalOpen] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<string>('')

  useEffect(() => {
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/notifications/')
      if (res.ok) {
        setAlerts(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (alertId: string, is_resolved: boolean) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/notifications/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_resolved })
      })
      if (res.ok) {
        fetchAlerts() // Refresh
      }
    } catch (error) {
      console.error("Failed to update status", error)
    }
  }

  const handleReportFault = (machineId: string) => {
    setSelectedMachine(machineId)
    setFaultModalOpen(true)
  }

  const handleCreateWorkOrder = (machineId: string) => {
    setSelectedMachine(machineId)
    setWorkOrderModalOpen(true)
  }

  const activeCount = alerts.filter(a => !a.is_resolved).length
  const criticalCount = alerts.filter(a => !a.is_resolved && a.severity?.toLowerCase() === 'critical').length
  const resolvedCount = alerts.filter(a => a.is_resolved).length

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'active') return !alert.is_resolved
    if (filter === 'critical') return !alert.is_resolved && alert.severity?.toLowerCase() === 'critical'
    if (filter === 'resolved') return alert.is_resolved
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Alert Triage</h1>
          <p className="text-gray-400 mt-1">Real-time anomaly detection and predictive maintenance alerts</p>
        </div>

        {/* Triage Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 bg-gray-900/60 p-1.5 rounded-xl border border-white/5 backdrop-blur-md">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === 'all' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            All ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              filter === 'active' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              filter === 'critical' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Critical ({criticalCount})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === 'resolved' ? 'bg-gray-700 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>
      </div>

      <div className="glass-panel overflow-hidden min-h-[400px] p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[300px]">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-gray-400">Analyzing telemetry streams...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px]">
            <CheckCircle className="w-16 h-16 text-emerald-500 mb-4 opacity-50" />
            <h3 className="text-xl font-medium text-white mb-2">
              {filter === 'all' ? 'All Systems Nominal' : `No ${filter.charAt(0).toUpperCase() + filter.slice(1)} Alerts`}
            </h3>
            <p className="text-gray-400">
              {filter === 'all' 
                ? 'No active alerts or anomalies detected across the factory floor.'
                : `There are currently no alerts matching the "${filter}" triage filter.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredAlerts.map((alert, i) => (
                <motion.div
                  key={alert.notification_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.05 }}
                  className={`border rounded-xl p-5 backdrop-blur-md transition-all ${
                    alert.is_resolved ? 'bg-gray-800/30 border-gray-700/50 opacity-60' :
                    alert.severity === 'Critical' ? 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 
                    alert.severity === 'Warning' ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]' :
                    'bg-blue-500/10 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className={`mt-1 p-2 rounded-lg ${
                        alert.is_resolved ? 'bg-gray-700 text-gray-400' :
                        alert.severity === 'Critical' ? 'bg-rose-500/20 text-rose-500' : 
                        alert.severity === 'Warning' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {alert.is_resolved ? <CheckCircle size={24} /> : alert.severity === 'Info' ? <Server size={24} /> : <AlertTriangle size={24} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className={`text-lg font-bold ${alert.is_resolved ? 'text-gray-400' : 'text-white'}`}>
                            {alert.machine_name || (alert.machine_id ? `Equipment ${alert.machine_id}` : 'System Notification')}
                          </h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            alert.is_resolved ? 'bg-gray-700 text-gray-400' :
                            alert.severity === 'Critical' ? 'bg-rose-500 text-white' : 
                            alert.severity === 'Warning' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                          }`}>
                            {alert.severity ? alert.severity.toUpperCase() : 'INFO'}
                          </span>
                        </div>
                        <p className={`${alert.is_resolved ? 'text-gray-500' : 'text-gray-300'} mb-3`}>
                          {alert.message}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Clock size={14} /> {new Date(alert.timestamp).toLocaleTimeString()}</span>
                          <span className="flex items-center gap-1"><Server size={14} /> ID: {alert.machine_id || 'N/A'}</span>
                          <span className="flex items-center gap-1 font-medium">Status: {alert.is_resolved ? 'Resolved' : 'Active'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {!alert.is_resolved && (
                        <>
                          <button 
                            onClick={() => handleReportFault(alert.machine_id)}
                            className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/40 text-amber-500 rounded-lg text-xs font-medium transition-colors border border-amber-500/30 flex items-center justify-center gap-1"
                          >
                            <Plus size={14} /> Report Fault
                          </button>
                          <button 
                            onClick={() => handleCreateWorkOrder(alert.machine_id)}
                            className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-400 rounded-lg text-xs font-medium transition-colors border border-indigo-500/30 flex items-center justify-center gap-1"
                          >
                            <Calendar size={14} /> Schedule WO
                          </button>
                          <button 
                            onClick={() => handleStatusChange(alert.notification_id, true)}
                            className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-500 rounded-lg text-xs font-medium transition-colors border border-emerald-500/30 mt-2"
                          >
                            Mark Resolved
                          </button>
                        </>
                      )}
                      <Link 
                        to={`/machines/${alert.machine_id ? alert.machine_id.replace('M-', '') : '1'}`}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-medium transition-colors text-center"
                      >
                        Diagnostics
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <FaultReportModal 
        key={`fault-${selectedMachine}-${faultModalOpen}`}
        isOpen={faultModalOpen} 
        onClose={() => setFaultModalOpen(false)} 
        machineId={selectedMachine} 
        onSuccess={fetchAlerts}
      />
      <WorkOrderModal 
        key={`wo-${selectedMachine}-${workOrderModalOpen}`}
        isOpen={workOrderModalOpen} 
        onClose={() => setWorkOrderModalOpen(false)} 
        machineId={selectedMachine} 
        onSuccess={fetchAlerts}
      />
    </div>
  )
}
