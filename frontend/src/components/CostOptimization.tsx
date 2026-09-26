import { useState, useEffect } from 'react'
import { DollarSign, Zap, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react'

export const CostOptimization = ({ machineId }: { machineId: string }) => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const fetchCost = async () => {
      setLoading(true)
      try {
        const cleanId = machineId.replace('M-', '') || '1'
        const res = await fetch(`http://localhost:8000/api/v1/intelligence/cost/M-${cleanId}`)
        if (res.ok && isMounted) {
          setData(await res.json())
        }
      } catch (e) {
        console.error("Failed to load cost intelligence:", e)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchCost()

    return () => {
      isMounted = false
    }
  }, [machineId])

  return (
    <div className="glass-panel p-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
          <DollarSign size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-white">Cost & Energy Optimization</h3>
          <p className="text-gray-400 text-sm">AI-driven financial insights</p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <RefreshCw size={20} className="animate-spin" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-800/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Zap size={16} />
                <span className="text-xs">Energy Inefficiency Cost</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-rose-500">
                  {data.energy_inefficiency_cost !== null && data.energy_inefficiency_cost !== undefined
                    ? `$${data.energy_inefficiency_cost.toLocaleString(undefined, {maximumFractionDigits:0})}`
                    : 'N/A'}
                </span>
                {data.energy_inefficiency_cost !== null && data.energy_inefficiency_cost !== undefined && data.energy_inefficiency_cost > 0 && (
                  <span className="text-xs text-rose-500 flex items-center"><TrendingUp size={12} /> /mo</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">{data.cost_driver || 'Operational baseline envelope'}</p>
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <DollarSign size={16} />
                <span className="text-xs">Est. AI Savings</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-500">
                  {data.savings !== null && data.savings !== undefined
                    ? `$${data.savings.toLocaleString(undefined, {maximumFractionDigits:0})}`
                    : 'N/A'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Preventive vs Run-to-failure</p>
            </div>
          </div>

          <div className="flex-1 bg-rose-500/5 rounded-lg border border-rose-500/10 p-4 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 text-rose-500/5">
              <AlertTriangle size={100} />
            </div>
            <h4 className="text-sm font-semibold text-rose-400 mb-2 flex items-center gap-2">
              Prescriptive Action
              {data.is_estimate && <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-400">AI Estimate</span>}
            </h4>
            <p className="text-sm text-gray-300 leading-relaxed relative z-10">
              {data.prescriptive_action}
            </p>
            <p className="text-xs text-gray-500 mt-2 relative z-10">
              Preventive Maintenance Cost: ${data.maintenance_cost !== null && data.maintenance_cost !== undefined ? data.maintenance_cost.toLocaleString(undefined, {maximumFractionDigits:0}) : 'N/A'} <br />
              Run-to-failure Estimate: ${data.run_to_failure_cost !== null && data.run_to_failure_cost !== undefined ? data.run_to_failure_cost.toLocaleString(undefined, {maximumFractionDigits:0}) : 'N/A'}
            </p>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-rose-400 text-sm">Failed to load cost intelligence.</div>
      )}
    </div>
  )
}
