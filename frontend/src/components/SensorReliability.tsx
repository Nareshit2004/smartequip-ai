import { useState, useEffect } from 'react'
import { ActivitySquare, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react'

export const SensorReliability = ({ machineId }: { machineId: string }) => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const fetchHealth = async () => {
      setLoading(true)
      try {
        const cleanId = machineId.replace('M-', '') || '1'
        const res = await fetch(`http://localhost:8000/api/v1/intelligence/sensor-health/M-${cleanId}`)
        if (res.ok && isMounted) {
          setData(await res.json())
        }
      } catch (e) {
        console.error("Failed to load sensor health:", e)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchHealth()

    return () => {
      isMounted = false
    }
  }, [machineId])

  return (
    <div className="glass-panel p-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
          <ActivitySquare size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-white">Sensor Reliability</h3>
          <p className="text-gray-400 text-sm">Data quality & drift analysis</p>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <RefreshCw size={20} className="animate-spin text-indigo-400" />
        </div>
      ) : data ? (
        <div className="space-y-4 flex-1">
          <div className="flex justify-between items-center bg-gray-800/30 p-4 rounded-lg">
            <span className="text-gray-400 text-sm">Overall Reliability Score</span>
            <span className={`text-xl font-bold ${data.reliability_score > 80 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {data.reliability_score}/100
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/30 p-3 rounded-lg">
              <span className="block text-xs text-gray-500 mb-1">Missing Data</span>
              <span className="text-white font-medium">{data.missing_data_pct ?? 0}%</span>
            </div>
            <div className="bg-gray-800/30 p-3 rounded-lg">
              <span className="block text-xs text-gray-500 mb-1">Noise Level</span>
              <span className="text-white font-medium">{data.noise_level ?? 'Low'}</span>
            </div>
          </div>

          {data.issues && data.issues.length > 0 ? (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <h4 className="text-sm font-medium text-rose-400 flex items-center gap-2 mb-3">
                <ShieldAlert size={16} /> Detected Anomalies ({data.issues.length})
              </h4>
              <ul className="space-y-2 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                {data.issues.map((issue: string, idx: number) => (
                  <li key={idx} className="text-xs text-gray-300 bg-rose-500/10 px-3 py-2 rounded-md border border-rose-500/20">
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-gray-800 flex items-center gap-2 text-emerald-400">
              <CheckCircle2 size={16} />
              <span className="text-sm">All sensors reporting normally</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Analyzing telemetry stream...
        </div>
      )}
    </div>
  )
}
