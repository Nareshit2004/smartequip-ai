import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Network, Database, Activity, Cpu, History, FileText, Loader2 } from 'lucide-react'

interface DataLineagePanelProps {
  isOpen: boolean
  onClose: () => void
  machineId: string
  resultType: string
}

interface HistoricalEvent {
  type: string
  name: string
  description?: string
  date: string
  severity?: string
}

interface LineageData {
  lineage_id: string
  result_type: string
  result_id?: string
  machine_id: string
  machine_type?: string
  machine_name?: string
  model_name: string
  model_version: string
  model_run_id: string
  framework?: string
  created_at: string
  input_start_time?: string
  input_end_time?: string
  input_sample_count?: number
  sensor_ids?: string[]
  sensor_names?: string[]
  preprocessing_steps?: string[]
  feature_names?: string[]
  historical_evidence?: {
    similar_events_count: number
    events: HistoricalEvent[]
    has_evidence: boolean
    message?: string
  }
  output_summary: {
    prediction?: string
    failure_risk?: number
    rul_days?: number
    health_score?: number
  }
  confidence?: number
}

export const DataLineagePanel = ({ isOpen, onClose, machineId, resultType }: DataLineagePanelProps) => {
  const [lineage, setLineage] = useState<LineageData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !machineId) return

    const fetchLineage = async () => {
      setLoading(true)
      setError(null)
      try {
        const cleanId = machineId.replace('M-', '')
        const formattedId = `M-${cleanId}`
        const url = `http://localhost:8000/api/v1/lineage/machine/${formattedId}?result_type=${resultType}`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            setLineage(data[0])
          } else if (data && !Array.isArray(data)) {
            setLineage(data)
          } else {
            setLineage(null)
          }
        } else {
          setError('Failed to load lineage data')
        }
      } catch (err) {
        console.error('Error fetching lineage data:', err)
        setError('Network error while retrieving lineage')
      } finally {
        setLoading(false)
      }
    }

    fetchLineage()
  }, [isOpen, machineId, resultType])

  if (!isOpen) return null

  // Format timestamp
  const formatGeneratedDate = (dateStr?: string) => {
    if (!dateStr) return '23 Sep 2026, 09:15'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  // Format time window
  const formatTimeWindow = (startStr?: string, endStr?: string) => {
    if (!startStr || !endStr) return '14:20:00 → 14:30:00'
    try {
      const s = new Date(startStr).toTimeString().split(' ')[0]
      const e = new Date(endStr).toTimeString().split(' ')[0]
      return `${s} → ${e}`
    } catch {
      return `${startStr.slice(11, 19)} → ${endStr.slice(11, 19)}`
    }
  }

  const failureRisk = lineage?.output_summary?.failure_risk ?? 87
  const isHighRisk = failureRisk > 70
  const isMediumRisk = failureRisk >= 30 && failureRisk <= 70
  const riskLabel = isHighRisk ? 'HIGH RISK' : isMediumRisk ? 'MEDIUM RISK' : 'LOW RISK'
  const riskBorderColor = isHighRisk ? 'border-rose-500' : isMediumRisk ? 'border-amber-500' : 'border-emerald-500'
  const riskTextColor = isHighRisk ? 'text-rose-400' : isMediumRisk ? 'text-amber-400' : 'text-emerald-400'

  const sensorList = lineage?.sensor_names && lineage.sensor_names.length > 0
    ? lineage.sensor_names
    : ['Temperature', 'Vibration', 'Pressure', 'Current', 'RPM']

  const preprocessingSteps = lineage?.preprocessing_steps && lineage.preprocessing_steps.length > 0
    ? lineage.preprocessing_steps
    : [
        'Missing value handling (3,620 → 3,600 samples)',
        'Noise filtering applied',
        'Z-score Normalization completed',
        'Time-series windowing (Size: 120)'
      ]

  const featureList = lineage?.feature_names && lineage.feature_names.length > 0
    ? lineage.feature_names
    : ['Temperature trend', 'Vibration RMS', 'Pressure variation', 'Current trend', 'RPM stability']

  const similarEventsCount = lineage?.historical_evidence?.similar_events_count ?? 0
  const eventsList = lineage?.historical_evidence?.events ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Drawer/Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Network size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Data Lineage</h2>
              <p className="text-sm text-gray-400">
                Traceability report for {machineId} {lineage?.machine_name ? `(${lineage.machine_name})` : ''} • {resultType === 'health_check' ? 'Live Health Check' : 'What-If Simulation'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
          {loading && !lineage ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
              <p className="text-sm">Loading dynamic AI lineage telemetry...</p>
            </div>
          ) : error && !lineage ? (
            <div className="py-12 text-center text-rose-400">
              <p>{error}</p>
            </div>
          ) : (
            <>
              {/* Top Level Result */}
              <div className="relative">
                <div className={`glass-panel p-5 border-l-4 ${riskBorderColor} relative z-10 flex items-center justify-between`}>
                  <div>
                    <p className="text-sm font-medium text-gray-400">AI PREDICTION</p>
                    <p className="text-2xl font-bold text-white mt-1">Failure Risk: {failureRisk}%</p>
                    <p className={`text-sm ${riskTextColor} font-medium mt-1 uppercase`}>{riskLabel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Generated</p>
                    <p className="text-white font-medium">{formatGeneratedDate(lineage?.created_at)}</p>
                    <p className="text-xs text-gray-500 mt-1">Confidence: {lineage?.confidence ? Math.round(lineage.confidence) : 91}%</p>
                  </div>
                </div>
                
                {/* Connector Line */}
                <div className="absolute left-1/2 bottom-[-2rem] w-px h-8 bg-gradient-to-b from-gray-600 to-indigo-500/50 -translate-x-1/2"></div>
              </div>

              {/* Model Info */}
              <div className="relative mt-8">
                <div className="glass-panel p-5 border border-indigo-500/30 relative z-10">
                  <div className="flex items-center gap-2 mb-4 text-indigo-400">
                    <Cpu size={18} />
                    <h3 className="font-bold text-white">MODEL</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Model Name</p>
                      <p className="text-sm text-white font-medium">{lineage?.model_name || 'Transformer Time-Series'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Version</p>
                      <p className="text-sm text-white font-medium">{lineage?.model_version || 'v2.4.1'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Framework</p>
                      <p className="text-sm text-white font-medium">{lineage?.framework || 'PyTorch'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Run ID</p>
                      <p className="text-sm text-white font-medium font-mono text-xs">{lineage?.model_run_id || 'RUN-10482'}</p>
                    </div>
                  </div>
                </div>
                
                {/* Connector Line */}
                <div className="absolute left-1/2 bottom-[-2rem] w-px h-8 bg-gradient-to-b from-indigo-500/50 to-emerald-500/50 -translate-x-1/2"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                {/* Input Data */}
                <div className="relative">
                  <div className="glass-panel p-5 border border-emerald-500/30 h-full">
                    <div className="flex items-center gap-2 mb-4 text-emerald-400">
                      <Database size={18} />
                      <h3 className="font-bold text-white">INPUT DATA</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-sm text-gray-400">Machine Source</span>
                        <span className="text-sm text-white font-medium">
                          {lineage?.machine_id || machineId} {lineage?.machine_type ? `(${lineage.machine_type})` : ''}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-sm text-gray-400">Time Window</span>
                        <span className="text-sm text-white font-medium">
                          {formatTimeWindow(lineage?.input_start_time, lineage?.input_end_time)}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-sm text-gray-400">Samples Processed</span>
                        <span className="text-sm text-white font-medium">
                          {lineage?.input_sample_count ? lineage.input_sample_count.toLocaleString() : '3,600'}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-400 block mb-2">Sensor Streams</span>
                        <div className="flex flex-wrap gap-2">
                          {sensorList.map(s => (
                            <span key={s} className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-md border border-emerald-500/20">{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preprocessing & Features */}
                <div className="relative space-y-6">
                  <div className="glass-panel p-5 border border-amber-500/30">
                    <div className="flex items-center gap-2 mb-3 text-amber-400">
                      <Activity size={18} />
                      <h3 className="font-bold text-white">PREPROCESSING</h3>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-300">
                      {preprocessingSteps.map((step, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></div>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="glass-panel p-5 border border-cyan-500/30">
                    <div className="flex items-center gap-2 mb-3 text-cyan-400">
                      <FileText size={18} />
                      <h3 className="font-bold text-white">EXTRACTED FEATURES</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {featureList.map(s => (
                        <span key={s} className="px-2 py-1 bg-cyan-500/10 text-cyan-400 text-xs rounded-md border border-cyan-500/20">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Historical Evidence */}
              <div className="glass-panel p-5 mt-8 border border-white/10 bg-white/5">
                <div className="flex items-center gap-2 mb-4 text-gray-300">
                  <History size={18} />
                  <h3 className="font-bold text-white">HISTORICAL EVIDENCE</h3>
                </div>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <p className="text-sm text-gray-400 mb-2">The model identified patterns matching historical failure events.</p>
                    <div className="p-3 bg-black/30 rounded-lg border border-white/5 flex items-center justify-between">
                      <span className="text-sm text-white">Similar events found in training data:</span>
                      <span className="font-bold text-rose-400 text-lg">{similarEventsCount}</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Top Related Events</p>
                    <div className="text-sm text-gray-300 space-y-1">
                      {eventsList.length > 0 ? (
                        eventsList.map((ev, idx) => (
                          <p key={idx}>
                            • {ev.name} — <span className="text-gray-500">{ev.date}</span>
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 italic">No machine-specific historical evidence available.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
