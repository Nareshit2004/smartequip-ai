import { useState, useEffect } from 'react'
import { FileText, Server, AlertTriangle, Wrench, Cpu, Download } from 'lucide-react'

export const Reports = () => {
  const [activeTab, setActiveTab] = useState<'equipment' | 'faults' | 'maintenance' | 'ai'>('equipment')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchReportData(activeTab)
  }, [activeTab])

  const fetchReportData = async (type: string) => {
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:8000/api/v1/reports/${type}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    if (data.length === 0) return
    const headers = Object.keys(data[0]).join(',')
    const rows = data.map(obj => Object.values(obj).join(',')).join('\n')
    const csv = `${headers}\n${rows}`
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeTab}_report_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const tabs = [
    { id: 'equipment', label: 'Equipment Health', icon: Server },
    { id: 'faults', label: 'Fault History', icon: AlertTriangle },
    { id: 'maintenance', label: 'Maintenance Log', icon: Wrench },
    { id: 'ai', label: 'AI Operations', icon: Cpu },
  ] as const

  const formatCellValue = (key: string, val: any) => {
    if (val === null || val === undefined) return 'N/A'
    
    // Status formatting
    if (key === 'status') {
      const isHealthy = val === 'HEALTHY' || val === 'Active'
      const isWarning = val === 'WARNING' || val === 'Warning'
      const isHighRisk = val === 'HIGH_RISK'
      const isCritical = val === 'CRITICAL' || val === 'Critical'
      return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
          isHealthy ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
          isWarning ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
          isHighRisk ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
          isCritical ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
          'bg-gray-800 text-gray-300 border-gray-700'
        }`}>
          {val}
        </span>
      )
    }

    // Severity / Priority formatting
    if (key === 'severity' || key === 'priority') {
      return (
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
          val === 'High' || val === 'Critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
          val === 'Medium' || val === 'Warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
          'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
        }`}>
          {val}
        </span>
      )
    }

    // Active faults count formatting
    if (key === 'active_faults_count') {
      const count = Number(val) || 0
      if (count === 0) {
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            0 Active
          </span>
        )
      } else if (count >= 2) {
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            {count} Critical
          </span>
        )
      } else {
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            {count} Active
          </span>
        )
      }
    }

    // Health score
    if (key === 'health_score' && typeof val === 'number') {
      return (
        <span className={`font-semibold ${
          val > 80 ? 'text-emerald-400' : val > 50 ? 'text-amber-400' : 'text-rose-400'
        }`}>
          {val.toFixed(1)}%
        </span>
      )
    }

    // Confidence
    if (key === 'confidence' && typeof val === 'number') {
      return `${val.toFixed(1)}%`
    }

    // Estimated duration hours
    if (key.includes('duration') && typeof val === 'number') {
      return `${val.toFixed(1)} hrs`
    }

    // Rul days
    if (key === 'rul_days' && typeof val === 'number') {
      return `${val.toFixed(1)} days`
    }

    // Date / timestamp
    if ((key.includes('time') || key.includes('date')) && typeof val === 'string') {
      const d = new Date(val)
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      }
    }

    // Float rounding
    if (typeof val === 'number' && !Number.isInteger(val)) {
      return val.toFixed(2)
    }

    if (typeof val === 'object') return JSON.stringify(val)
    return String(val)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/20 text-primary rounded-xl">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">System Reports</h1>
            <p className="text-gray-400 mt-1">Exportable aggregate data</p>
          </div>
        </div>
        <button 
          onClick={exportCSV}
          disabled={data.length === 0}
          className="glass-button px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Download size={18} /> Export CSV
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-800 pb-px overflow-x-auto scrollbar-hide">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                isActive 
                  ? 'border-primary text-white bg-primary/5' 
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-primary' : ''} />
              <span className="font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>

      <div className="glass-panel overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading report data...</div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No data available for this report.</div>
        ) : (
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-800/50 border-b border-gray-700">
                {Object.keys(data[0]).map(key => (
                  <th key={key} className="p-4 text-gray-300 font-medium capitalize">
                    {key.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                  {Object.entries(row).map(([key, val], j) => (
                    <td key={j} className="p-4 text-gray-400">
                      {formatCellValue(key, val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
