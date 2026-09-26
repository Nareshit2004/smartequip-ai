import { useState, useEffect } from 'react'
import { Zap, AlertCircle, Activity, Gauge } from 'lucide-react'

export const EnergyIntelligence = ({ machineId }: { machineId: string }) => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const fetchEnergy = async () => {
      setLoading(true)
      try {
        const cleanId = machineId.replace('M-', '') || '1'
        const res = await fetch(`http://localhost:8000/api/v1/intelligence/energy/M-${cleanId}`)
        if (res.ok && isMounted) {
          setData(await res.json())
        }
      } catch (e) {
        console.error("Failed to load energy intelligence:", e)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchEnergy()

    return () => {
      isMounted = false
    }
  }, [machineId])

  return (
    <div className="glass-panel p-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg">
          <Zap size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-white">Energy Intelligence</h3>
          <p className="text-gray-400 text-sm">Power consumption & efficiency</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {loading ? (
          <div className="text-gray-500 text-center py-8">Checking energy pipeline...</div>
        ) : data && data.has_data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/30 p-3 rounded-lg">
                <span className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Gauge size={12} className="text-yellow-500" /> Power Draw
                </span>
                <span className="text-xl font-bold text-white">{data.power_kw} <span className="text-xs font-normal text-gray-400">kW</span></span>
                <p className="text-[11px] text-gray-500 mt-1">{data.voltage}V • {data.current}A (3-Phase)</p>
              </div>

              <div className="bg-gray-800/30 p-3 rounded-lg">
                <span className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Activity size={12} className="text-emerald-500" /> Efficiency
                </span>
                <span className={`text-xl font-bold ${data.efficiency > 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {data.efficiency}%
                </span>
                <p className="text-[11px] text-gray-500 mt-1">{data.trend}</p>
              </div>
            </div>

            <div className="bg-gray-800/40 p-3.5 rounded-lg border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 block">Est. Monthly Consumption</span>
                <span className="text-sm font-semibold text-white">{data.monthly_kwh?.toLocaleString()} kWh</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400 block">Est. Energy Cost</span>
                <span className="text-sm font-semibold text-yellow-400">${data.monthly_cost?.toLocaleString()} /mo</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 flex flex-col items-center max-w-sm mx-auto text-center">
            <AlertCircle className="text-gray-500 mb-3" size={32} />
            <h4 className="text-gray-300 font-medium mb-1">Energy Data Unavailable</h4>
            <p className="text-gray-500 text-sm">
              {data?.message || `Energy data is unavailable for ${machineId} because no energy telemetry is currently recorded.`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
