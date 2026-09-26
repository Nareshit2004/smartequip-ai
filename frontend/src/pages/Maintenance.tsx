import { useState, useEffect } from 'react'
import { AlertTriangle, Calendar, Clock, Server, Loader2, Wrench, Plus, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { WorkOrderModal } from '../components/WorkOrderModal'
import { FaultReportModal } from '../components/FaultReportModal'

interface FaultReport {
  id: number
  report_id: string
  machine_id: string
  category: string
  severity: string
  description: string
  status: string
  reported_by: string
  timestamp: string
  work_order_id?: string
}

interface WorkOrder {
  id: number
  order_id: string
  machine_id: string
  scheduled_date: string
  technician: string
  priority: string
  reason: string
  status: string
  estimated_duration_hours?: number
}

export const Maintenance = () => {
  const [activeTab, setActiveTab] = useState<'work_orders' | 'fault_reports'>('work_orders')
  
  const [faultReports, setFaultReports] = useState<FaultReport[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modals
  const [workOrderModalOpen, setWorkOrderModalOpen] = useState(false)
  const [faultModalOpen, setFaultModalOpen] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<string>('')
  const [selectedFaultId, setSelectedFaultId] = useState<string | undefined>(undefined)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [faultsRes, ordersRes] = await Promise.all([
        fetch('http://localhost:8000/api/v1/maintenance/fault-reports'),
        fetch('http://localhost:8000/api/v1/maintenance/work-orders')
      ])
      
      if (faultsRes.ok) setFaultReports(await faultsRes.json())
      if (ordersRes.ok) setWorkOrders(await ordersRes.json())
    } catch (error) {
      console.error("Failed to fetch maintenance data", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const updateWorkOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/maintenance/work-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        fetchData()
      }
    } catch (e) {
      console.error("Failed to update work order status", e)
    }
  }

  const updateFaultStatus = async (reportId: string, newStatus: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/maintenance/fault-reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        fetchData()
      }
    } catch (e) {
      console.error("Failed to update fault report status", e)
    }
  }

  const handleScheduleFromFault = (machineId: string, faultId: string) => {
    setSelectedMachine(machineId)
    setSelectedFaultId(faultId)
    setWorkOrderModalOpen(true)
  }

  const handleOpenGlobalWorkOrder = () => {
    setSelectedMachine('')
    setSelectedFaultId(undefined)
    setWorkOrderModalOpen(true)
  }

  const handleOpenGlobalFault = () => {
    setSelectedMachine('')
    setSelectedFaultId(undefined)
    setFaultModalOpen(true)
  }

  const getPriorityBadge = (priority: string) => {
    const p = priority.toLowerCase()
    if (p.includes('high') || p.includes('critical')) {
      return 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
    } else if (p.includes('medium') || p.includes('normal')) {
      return 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
    } else {
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    }
  }

  const getSeverityBadge = (severity: string) => {
    const s = severity.toLowerCase()
    if (s.includes('critical') || s.includes('high')) {
      return 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
    } else if (s.includes('warning') || s.includes('medium')) {
      return 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
    } else {
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wrench className="text-primary" /> Maintenance Operations
          </h1>
          <p className="text-gray-400 mt-1">Manage fault reports and schedule work orders</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenGlobalFault}
            className="flex items-center gap-2 glass-button px-4 py-2 rounded-lg text-sm font-medium text-amber-400 hover:text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
          >
            <Plus size={16} />
            Report Fault
          </button>
          <button
            onClick={handleOpenGlobalWorkOrder}
            className="flex items-center gap-2 glass-button px-4 py-2 rounded-lg text-sm font-medium bg-primary/20 text-primary border-primary/30 hover:bg-primary/30"
          >
            <Calendar size={16} />
            Schedule Work Order
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('work_orders')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'work_orders' 
              ? 'border-primary text-primary bg-primary/5' 
              : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Calendar size={16} />
          Scheduled Work Orders ({workOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('fault_reports')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'fault_reports' 
              ? 'border-primary text-primary bg-primary/5' 
              : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <AlertTriangle size={16} />
          Fault Reports ({faultReports.length})
        </button>
      </div>

      <div className="glass-panel overflow-hidden min-h-[400px] p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[300px]">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-gray-400">Loading maintenance operations...</p>
          </div>
        ) : activeTab === 'work_orders' ? (
          <div className="space-y-4">
            {workOrders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No scheduled work orders found.</div>
            ) : (
              workOrders.map((order) => {
                const dateObj = new Date(order.scheduled_date)
                const formattedDate = isNaN(dateObj.getTime()) ? 'Scheduled' : dateObj.toLocaleDateString()
                return (
                  <div key={order.id} className="border border-indigo-500/30 rounded-xl p-5 bg-indigo-500/5 transition-all hover:bg-indigo-500/10">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg"><Calendar size={20} /></div>
                        <div>
                          <h3 className="text-lg font-bold text-white">{order.order_id}</h3>
                          <p className="text-sm text-gray-400">{order.reason}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${getPriorityBadge(order.priority)}`}>
                          {order.priority} Priority
                        </span>
                        <select
                          value={order.status}
                          onChange={(e) => updateWorkOrderStatus(order.order_id, e.target.value)}
                          className="bg-gray-900 border border-gray-700 text-white rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Scheduled">Scheduled</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-gray-400 border-t border-indigo-500/20 pt-3">
                      <span className="flex items-center gap-1">
                        <Server size={14} className="text-gray-500" /> 
                        <Link to={`/machines/${order.machine_id}`} className="text-indigo-400 hover:underline font-mono">
                          {order.machine_id}
                        </Link>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} className="text-gray-500" /> Scheduled: {formattedDate}
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <span className="text-gray-500">Tech:</span> <span className="text-white">{order.technician}</span>
                      </span>
                      {order.estimated_duration_hours && (
                        <span className="flex items-center gap-1">
                          <span className="text-gray-500">Est:</span> {order.estimated_duration_hours.toFixed(1)} hrs
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {faultReports.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No fault reports filed.</div>
            ) : (
              faultReports.map((fault) => {
                const dateObj = new Date(fault.timestamp)
                const formattedTime = isNaN(dateObj.getTime()) ? 'Recently' : dateObj.toLocaleString()
                const isResolved = fault.status === 'Resolved' || fault.status === 'Closed'
                return (
                  <div key={fault.id} className="border border-amber-500/30 rounded-xl p-5 bg-amber-500/5 transition-all hover:bg-amber-500/10">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 text-amber-500 rounded-lg"><AlertTriangle size={20} /></div>
                        <div>
                          <h3 className="text-lg font-bold text-white">{fault.report_id} — {fault.category}</h3>
                          <p className="text-sm text-gray-400">{fault.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${getSeverityBadge(fault.severity)}`}>
                          {fault.severity} Severity
                        </span>
                        <select
                          value={fault.status}
                          onChange={(e) => updateFaultStatus(fault.report_id, e.target.value)}
                          className="bg-gray-900 border border-gray-700 text-white rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary"
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Maintenance Scheduled">Maintenance Scheduled</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm text-gray-400 border-t border-amber-500/20 pt-3">
                      <div className="flex flex-wrap items-center gap-6">
                        <span className="flex items-center gap-1">
                          <Server size={14} className="text-gray-500" /> 
                          <Link to={`/machines/${fault.machine_id}`} className="text-indigo-400 hover:underline font-mono">
                            {fault.machine_id}
                          </Link>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} className="text-gray-500" /> {formattedTime}
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <span className="text-gray-500">Reported By:</span> <span className="text-white">{fault.reported_by}</span>
                        </span>
                        {fault.work_order_id && (
                          <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/30">
                            Linked WO: {fault.work_order_id}
                          </span>
                        )}
                      </div>

                      {!isResolved && !fault.work_order_id && (
                        <button
                          onClick={() => handleScheduleFromFault(fault.machine_id, fault.report_id)}
                          className="text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg border border-indigo-500/30 flex items-center gap-1.5 transition-colors"
                        >
                          <Calendar size={14} /> Schedule Work Order <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      <WorkOrderModal
        isOpen={workOrderModalOpen}
        onClose={() => setWorkOrderModalOpen(false)}
        machineId={selectedMachine}
        faultReportId={selectedFaultId}
        onSuccess={fetchData}
      />

      <FaultReportModal
        isOpen={faultModalOpen}
        onClose={() => setFaultModalOpen(false)}
        machineId={selectedMachine}
        onSuccess={fetchData}
      />
    </div>
  )
}
