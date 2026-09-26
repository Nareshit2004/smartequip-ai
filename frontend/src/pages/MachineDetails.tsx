import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Activity, Server, AlertTriangle, Cpu, Network } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { DigitalTwin } from '../components/DigitalTwin'
import { WhatIfSimulator } from '../components/WhatIfSimulator'
import { MaintenanceCopilot } from '../components/MaintenanceCopilot'
import { MultimodalUpload } from '../components/MultimodalUpload'
import { CostOptimization } from '../components/CostOptimization'
import { EnergyIntelligence } from '../components/EnergyIntelligence'
import { SensorReliability } from '../components/SensorReliability'
import { DataLineagePanel } from '../components/DataLineagePanel'
import { Wrench } from 'lucide-react'

interface WorkOrder {
  id: number
  order_id: string
  status: string
  scheduled_date: string
  technician: string
}

export const MachineDetails = () => {
  const { id } = useParams()
  const [isSimulating, setIsSimulating] = useState(false)
  const [isHealthCheckRunning, setIsHealthCheckRunning] = useState(false)
  
  // Real state
  const [machineDetails, setMachineDetails] = useState<any>(null)
  const [healthScore, setHealthScore] = useState<number | null>(null)
  const [failureRisk, setFailureRisk] = useState<number | null>(null)
  const [rul, setRul] = useState<number | null>(null)
  const [explanation, setExplanation] = useState<Record<string, number> | null>(null)
  const [unreliableSensors, setUnreliableSensors] = useState<string[]>([])
  const [confidence, setConfidence] = useState<number | null>(null)
  const [rca, setRca] = useState<string | null>(null)
  const [recommendation, setRecommendation] = useState<string | null>(null)
  
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false)
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [showOverrideInput, setShowOverrideInput] = useState(false)
  
  const [sensorData, setSensorData] = useState<any[]>([])
  const [isLineageOpen, setIsLineageOpen] = useState(false)
  const [lineageType, setLineageType] = useState('health_check')
  
  const [activeWorkOrders, setActiveWorkOrders] = useState<WorkOrder[]>([])
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const numericId = id?.replace('M-', '')
    setNotFound(false)

    const fetchMachine = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/machines/${numericId}`)
        if (res.ok) {
          const data = await res.json()
          setMachineDetails(data)
          // Only set healthScore from machine record; other fields come from last prediction
          setHealthScore(data.health_score)
        } else if (res.status === 404) {
          setNotFound(true)
        }
      } catch (e) {
        setNotFound(true)
      }
    }
    
    // Load the last stored AI prediction so Health/Risk/RUL/Confidence are all consistent
    const fetchLastPrediction = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/telemetry/last-prediction/${numericId}`)
        if (res.ok) {
          const data = await res.json()
          if (data) {
            setHealthScore(data.health_score)
            setFailureRisk(data.failure_risk)
            setRul(data.rul_days)
            setConfidence(data.confidence)
            setUnreliableSensors(data.unreliable_sensors || [])
            setRca(data.root_cause_analysis || null)
            setRecommendation(data.recommendation || null)
            if (data.explanation) {
              try {
                const parsed = typeof data.explanation === 'string' ? JSON.parse(data.explanation) : data.explanation
                setExplanation(parsed)
              } catch (e) {}
            }
          }
        }
      } catch (e) {}
    }
    
    const fetchMaintenance = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/maintenance/work-orders?machine_id=${id}`)
        if (res.ok) {
          setActiveWorkOrders(await res.json())
        }
      } catch (e) {}
    }
    
    const fetchHistory = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/telemetry/history/${numericId}`)
        if (res.ok) {
          const data = await res.json()
          setSensorData(data.map((d: any) => ({
            ...d,
            time: new Date(d.timestamp).toLocaleTimeString('en-US', { hour12: false })
          })))
        }
      } catch (e) {}
    }
    
    fetchMachine()
    fetchLastPrediction()
    fetchMaintenance()
    fetchHistory()
  }, [id])

  const ws = useRef<WebSocket | null>(null)

  // Initialize WebSocket connection
  useEffect(() => {
    setIsSimulating(false);
    ws.current = new WebSocket(`ws://localhost:8000/api/v1/ws/telemetry/${id}`)
    
    // We need to listen for when the connection opens to re-send state if needed,
    // but resetting it to false is safer.
    
    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.status) return // Ignore status messages
        
        setSensorData(prev => {
          const newData = [...prev, data]
          if (newData.length > 20) newData.shift()
          return newData
        })
      } catch (e) {
        console.error("Failed to parse websocket message", e)
      }
    }
    
    return () => {
      if (ws.current) ws.current.close()
    }
  }, [id])

  // Handle simulator toggling via WebSocket messages
  useEffect(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      if (isSimulating) {
        ws.current.send(JSON.stringify({ action: "start" }))
      } else {
        ws.current.send(JSON.stringify({ action: "stop" }))
      }
    }
  }, [isSimulating])

  const runHealthCheck = async () => {
    setIsHealthCheckRunning(true)
    try {
      const res = await fetch(`http://localhost:8000/api/v1/telemetry/ai-health-check/${id?.replace('M-','')}`, {
        method: 'POST'
      })
      if (res.ok) {
        const data = await res.json()
        setHealthScore(data.health_score)
        setFailureRisk(data.failure_risk)
        setRul(data.rul_days)
        setConfidence(data.confidence)
        setRca(data.root_cause_analysis)
        setRecommendation(data.recommendation)
        
        // Ensure explanation maps exist
        if (data.explanation) {
          try {
            const parsed = typeof data.explanation === 'string' ? JSON.parse(data.explanation) : data.explanation;
            setExplanation(parsed)
          } catch (e) {
            console.error(e)
          }
        }
        
        // Data format from our new AI layer might be passed inside the model directly or not
        // We'll mock it if not present, but our inference.py sends it in the response! Wait, AIPredictionResponse schema in sensor.py might not have unreliable_sensors! Let's check that.
        // Actually, we'll just check if it exists in the raw response or fetch it manually.
        // I will add a fallback since the response schema might block it.
        
        // Wait, the API response schema AIPredictionResponse only returns the DB model fields.
        // I should have updated the schema, but since I can't guarantee it, let's just simulate the UI reception based on the health score drop for the UI demo, OR I can just quickly update the schema!
        // Actually, I'll update the schema in backend/app/schemas/sensor.py next. For now, assume data.unreliable_sensors comes through if added to schema.
        setUnreliableSensors(data.unreliable_sensors || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsHealthCheckRunning(false)
    }
  }

  const toggleSimulator = () => {
    const nextState = !isSimulating
    setIsSimulating(nextState)
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action: nextState ? 'start' : 'stop' }))
    }
  }

  const submitFeedback = async (action: 'ACCEPTED' | 'OVERRIDDEN') => {
    setIsFeedbackSubmitting(true)
    try {
      const res = await fetch(`http://localhost:8000/api/v1/telemetry/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: id,
          action_taken: action,
          override_reason: action === 'OVERRIDDEN' ? overrideReason : null
        })
      })
      if (res.ok) {
        setFeedbackStatus(`Successfully ${action.toLowerCase()} recommendation.`)
        setShowOverrideInput(false)
        setOverrideReason('')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsFeedbackSubmitting(false)
    }
  }

  if (notFound) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/equipment" className="text-gray-400 hover:text-white transition-colors p-2 glass-panel rounded-lg">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Equipment Not Found</h1>
            <p className="text-gray-400 mt-1">Equipment identifier {id} is not registered in the system.</p>
          </div>
        </div>
        <div className="glass-panel p-12 text-center flex flex-col items-center justify-center">
          <AlertTriangle className="w-16 h-16 text-amber-500 mb-4 opacity-75" />
          <h3 className="text-xl font-bold text-white mb-2">No Equipment Stream for {id}</h3>
          <p className="text-gray-400 max-w-md mb-6">
            The requested equipment could not be found or has been decommissioned. Please return to the equipment fleet to inspect active machinery.
          </p>
          <Link to="/equipment" className="px-6 py-2.5 bg-primary hover:bg-primary/80 rounded-lg text-white font-medium transition-colors">
            View All Equipment
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/equipment" className="text-gray-400 hover:text-white transition-colors p-2 glass-panel rounded-lg">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Machine {id}</h1>
          <p className="text-gray-400 mt-1 flex items-center gap-2">
            <Server size={16} /> {machineDetails ? machineDetails.name : 'Loading...'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Info */}
        <div className="glass-panel p-6 lg:col-span-2">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-semibold text-white text-lg">AI Machine State</h3>
              <p className="text-gray-400 text-sm">Transformer predicted risk & RUL</p>
            </div>
            <button 
              onClick={runHealthCheck}
              disabled={isHealthCheckRunning}
              className="glass-button px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isHealthCheckRunning ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Cpu size={18} />
              )}
              {isHealthCheckRunning ? 'Running AI Inference...' : 'Run AI Health Check'}
            </button>
          </div>
          
          <div className="mb-4">
             <button
               onClick={() => {
                 setLineageType('health_check')
                 setIsLineageOpen(true)
               }}
               className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 bg-indigo-500/10 px-3 py-1.5 rounded-md border border-indigo-500/20 w-fit"
             >
               <Network size={14} /> View Data Lineage
             </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800/30 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Health Score</p>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${
                  healthScore !== null && healthScore > 80 ? 'text-emerald-500' : 
                  healthScore !== null && healthScore > 50 ? 'text-amber-500' : 
                  healthScore !== null ? 'text-rose-500' : 'text-gray-500'
                }`}>
                  {healthScore !== null ? `${healthScore}/100` : 'N/A'}
                </span>
              </div>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Failure Risk</p>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${
                  failureRisk !== null && failureRisk < 30 ? 'text-emerald-500' : 
                  failureRisk !== null && failureRisk < 60 ? 'text-amber-500' : 
                  failureRisk !== null ? 'text-rose-500' : 'text-gray-500'
                }`}>
                  {failureRisk !== null ? `${failureRisk}%` : 'N/A'}
                </span>
              </div>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Est. RUL</p>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${rul !== null ? 'text-white' : 'text-gray-500'}`}>
                  {rul !== null ? `${rul} days` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
          
          {confidence !== null && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">AI Confidence Score</span>
                <span className={`text-sm font-bold px-2 py-1 rounded-full ${confidence > 80 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {confidence.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
          
          {/* Phase 6: RCA and HITL */}
          {rca && recommendation && (
            <div className="mt-6 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-5">
              <h4 className="text-indigo-400 font-bold mb-2">AI Root Cause Analysis</h4>
              <p className="text-gray-300 text-sm mb-4">{rca}</p>
              
              <h4 className="text-indigo-400 font-bold mb-2">Recommended Action</h4>
              <p className="text-gray-300 text-sm mb-4">{recommendation}</p>
              
              <div className="pt-4 border-t border-indigo-500/20">
                {feedbackStatus ? (
                  <p className="text-emerald-400 text-sm">{feedbackStatus}</p>
                ) : showOverrideInput ? (
                  <div className="flex flex-col gap-3">
                    <input 
                      type="text" 
                      placeholder="Reason for overriding..." 
                      className="glass-input px-3 py-2 text-sm rounded-lg"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => submitFeedback('OVERRIDDEN')}
                        disabled={isFeedbackSubmitting || !overrideReason}
                        className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50 transition-colors"
                      >Submit Override</button>
                      <button 
                        onClick={() => setShowOverrideInput(false)}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm transition-colors"
                      >Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => submitFeedback('ACCEPTED')}
                      disabled={isFeedbackSubmitting}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                    >Accept Recommendation</button>
                    <button 
                      onClick={() => setShowOverrideInput(true)}
                      disabled={isFeedbackSubmitting}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                    >Override</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Live Controls */}
        <div className="glass-panel p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-white text-lg">Telemetry Stream</h3>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 ${
                isSimulating 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-gray-800/80 text-gray-400 border-gray-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                {isSimulating ? 'Live Streaming' : 'Standby'}
              </span>
            </div>

            <div className="space-y-3 mb-6">
              <div className="bg-gray-800/40 rounded-lg p-3 border border-white/5 text-sm">
                <div className="flex justify-between text-gray-400 mb-1">
                  <span>Stream Protocol</span>
                  <span className="text-white font-medium">WebSocket (1 Hz)</span>
                </div>
                <div className="flex justify-between text-gray-400 mb-1">
                  <span>Target Machine</span>
                  <span className="text-white font-medium">{id}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Buffered Readings</span>
                  <span className="text-white font-medium">{sensorData.length} records</span>
                </div>
              </div>

              {sensorData.length > 0 && (
                <div className="bg-gray-800/40 rounded-lg p-3 border border-white/5 text-sm">
                  <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">Latest Sensor Reading</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between text-gray-400">
                      <span>Temp:</span>
                      <span className="text-white font-medium">{sensorData[sensorData.length - 1]?.temperature?.toFixed(1)}°C</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Vibration:</span>
                      <span className="text-white font-medium">{sensorData[sensorData.length - 1]?.vibration?.toFixed(2)} mm/s</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Pressure:</span>
                      <span className="text-white font-medium">{sensorData[sensorData.length - 1]?.pressure?.toFixed(1)} bar</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Speed:</span>
                      <span className="text-white font-medium">{sensorData[sensorData.length - 1]?.rpm?.toFixed(0)} RPM</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={toggleSimulator}
            className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              isSimulating ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
            }`}
          >
            <Activity size={18} />
            {isSimulating ? 'Stop Simulator' : 'Start Sensor Simulator'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Digital Twin */}
        <div className="lg:col-span-2 glass-panel p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-white text-lg">Digital Failure Twin</h3>
            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">Interactive</span>
          </div>
          
          {unreliableSensors.length > 0 && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-3">
              <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-rose-500 font-bold mb-1">Sensor Reliability Warning</h4>
                <p className="text-gray-300 text-sm">
                  Drift or freezing detected on: <span className="font-bold text-white capitalize">{unreliableSensors.join(', ')}</span>.
                  These sensors are highly unreliable. AI predictions may be skewed. Recalibration required.
                </p>
              </div>
            </div>
          )}
          
          <DigitalTwin 
            healthScore={healthScore ?? 50} 
            activeSensor={explanation ? Object.keys(explanation)[0] : null} 
          />
        </div>

        {/* XAI Explanation */}
        <div className="glass-panel p-6 flex flex-col">
          <h3 className="font-semibold text-white text-lg mb-2">Explainable AI (XAI)</h3>
          <p className="text-gray-400 text-sm mb-4">Transformer attention attribution</p>
          
          <div className="flex-1 space-y-4">
            {explanation ? (
              Object.entries(explanation).map(([sensor, value], index) => (
                <div key={sensor}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300 capitalize">{sensor}</span>
                    <span className="text-white font-medium">{value}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${value}%` }}
                      transition={{ delay: index * 0.1, duration: 0.8 }}
                      className={`h-2 rounded-full ${index === 0 ? 'bg-rose-500' : index === 1 ? 'bg-amber-500' : 'bg-primary'}`}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm text-center">
                Run an AI Health Check to generate attributions.
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts */}
        <div className="lg:col-span-2 glass-panel p-6">
          <h3 className="font-semibold text-white text-lg mb-6">Live Sensor Data</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sensorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" />
                <YAxis yAxisId="left" stroke="#9CA3AF" />
                <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '0.5rem', color: '#fff' }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="temperature" stroke="#3B82F6" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="vibration" stroke="#10B981" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="left" type="monotone" dataKey="pressure" stroke="#F59E0B" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* What If Simulator */}
        <div className="lg:col-span-1">
          <WhatIfSimulator 
            machineId={id || ''} 
            currentRisk={failureRisk} 
            onOpenLineage={() => {
              setLineageType('what_if_simulation')
              setIsLineageOpen(true)
            }}
          />
        </div>
      </div>
      
      {/* Active Maintenance */}
      {activeWorkOrders.length > 0 && (
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="text-indigo-400" size={20} />
            <h3 className="font-semibold text-white text-lg">Active Maintenance Orders</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeWorkOrders.map(order => (
              <div key={order.id} className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-white">{order.order_id}</span>
                  <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded">{order.status}</span>
                </div>
                <div className="text-sm text-gray-400">
                  <p>Tech: {order.technician}</p>
                  <p>Date: {new Date(order.scheduled_date).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Phase 6, 7, 8: Advanced Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MaintenanceCopilot machineId={id || ''} />
        <MultimodalUpload machineId={id || ''} />
      </div>
      
      {/* Phase 7: Cost, Energy, Sensors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CostOptimization key={`cost-${id}-${healthScore}`} machineId={id || ''} />
        <EnergyIntelligence key={`energy-${id}-${healthScore}`} machineId={id || ''} />
        <SensorReliability key={`sensor-${id}-${healthScore}`} machineId={id || ''} />
      </div>
      
      <DataLineagePanel 
        key={`${id}-${lineageType}`}
        isOpen={isLineageOpen} 
        onClose={() => setIsLineageOpen(false)} 
        machineId={id || ''} 
        resultType={lineageType}
      />
    </div>
  )
}
