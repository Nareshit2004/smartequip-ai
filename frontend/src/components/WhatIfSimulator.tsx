import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calculator, AlertCircle, RefreshCw, Network } from 'lucide-react'

interface WhatIfSimulatorProps {
  machineId: string
  currentRisk?: number | null
  onOpenLineage?: () => void
}

export const WhatIfSimulator = ({ machineId, onOpenLineage }: WhatIfSimulatorProps) => {
  const [duration, setDuration] = useState(7)
  const [load, setLoad] = useState(1.0)
  const [isSimulating, setIsSimulating] = useState(false)
  const [results, setResults] = useState<any>(null)

  const runSimulation = async () => {
    setIsSimulating(true)
    
    try {
      const machineIdInt = parseInt(machineId.replace('M-', ''), 10)
      const res = await fetch('http://localhost:8000/api/v1/simulation/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: machineIdInt,
          operating_duration_days: duration,
          machine_load_modifier: load
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        setResults(data)
      } else {
        console.error("Simulation failed:", await res.text())
        // Fallback if not enough data
        setResults({
          simulated_health_score: 0,
          simulated_failure_risk: 100,
          simulated_rul_days: 0,
          warning_message: "Error running simulation. Ensure machine has enough sensor data."
        })
      }
    } catch (error) {
      console.error("Simulation error:", error)
    } finally {
      setIsSimulating(false)
    }
  }

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 text-primary rounded-lg">
          <Calculator size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-white">AI What-If Simulator</h3>
          <p className="text-gray-400 text-sm">Test hypothetical scenarios</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-400 block mb-1">Operating Duration (Days): {duration}</label>
          <input 
            type="range" min="1" max="30" 
            value={duration} onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">Machine Load Modifier: {Math.round(load * 100)}%</label>
          <input 
            type="range" min="0.5" max="1.5" step="0.1" 
            value={load} onChange={(e) => setLoad(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        <button 
          onClick={runSimulation}
          disabled={isSimulating}
          className="w-full mt-4 glass-button font-medium py-2 rounded-lg flex items-center justify-center gap-2"
        >
          {isSimulating ? <RefreshCw size={16} className="animate-spin" /> : 'Run Simulation'}
        </button>

        <AnimatePresence>
          {results && !isSimulating && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-800"
            >
              <h4 className="text-sm font-semibold text-white mb-3">AI Estimated Results</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Simulated Risk</p>
                  <p className={`text-lg font-bold ${(results.simulated_failure_risk ?? 0) > 70 ? 'text-rose-500' : 'text-amber-500'}`}>
                    {(results.simulated_failure_risk ?? 0).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Simulated RUL</p>
                  <p className="text-lg font-bold text-white">{(results.simulated_rul_days ?? 0).toFixed(1)} days</p>
                </div>
              </div>
              {results.warning_message && (
                <div className="flex gap-2 text-sm text-rose-400 bg-rose-500/10 p-3 rounded-md mb-4">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>{results.warning_message}</p>
                </div>
              )}
              {onOpenLineage && (
                <button
                   onClick={onOpenLineage}
                   className="mt-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center justify-center gap-1 bg-indigo-500/10 px-3 py-2 rounded-md border border-indigo-500/20 w-full"
                 >
                   <Network size={14} /> View Data Lineage
                 </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
