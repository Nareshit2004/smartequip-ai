import { motion } from 'framer-motion'

interface DigitalTwinProps {
  healthScore: number
  activeSensor: string | null
}

export const DigitalTwin = ({ healthScore, activeSensor }: DigitalTwinProps) => {
  // A simple 2D representation of an industrial machine (e.g. CNC Lathe)
  // We use colored blocks/nodes to represent components.
  
  const getStatusColor = (baseHealth: number) => {
    // scale base health by the overall machine health for visual effect
    const actualHealth = baseHealth * (healthScore / 100)
    if (actualHealth > 80) return 'bg-emerald-500'
    if (actualHealth > 50) return 'bg-amber-500'
    return 'bg-rose-500'
  }

  return (
    <div className="relative w-full h-64 bg-gray-900 rounded-lg border border-gray-700 p-4 overflow-hidden flex items-center justify-center">
      {/* Background Grid */}
      <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-10">
        {Array.from({ length: 36 }).map((_, i) => (
          <div key={i} className="border border-white/20"></div>
        ))}
      </div>

      <div className="relative w-3/4 h-3/4 flex gap-4">
        {/* Motor Block */}
        <motion.div 
          animate={{ scale: activeSensor === 'current' || activeSensor === 'rpm' ? 1.05 : 1 }}
          className="flex-1 flex flex-col gap-2"
        >
          <div className={`w-full h-2/3 rounded-md shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-colors duration-500 ${getStatusColor(95)} opacity-80 border-2 border-white/10 relative flex items-center justify-center`}>
            <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Motor</span>
          </div>
          <div className={`w-full h-1/3 rounded-md transition-colors duration-500 ${getStatusColor(85)} opacity-60 border border-white/10 flex items-center justify-center`}>
            <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Cooling</span>
          </div>
        </motion.div>

        {/* Transmission / Spindle */}
        <motion.div 
          animate={{ scale: activeSensor === 'vibration' || activeSensor === 'temperature' ? 1.05 : 1 }}
          className="w-1/4 h-full flex items-center justify-center relative"
        >
          {/* Spindle shaft */}
          <div className="absolute w-full h-8 bg-gray-600 rounded-sm"></div>
          {/* Bearing (most sensitive to vibration) */}
          <div className={`relative w-12 h-16 rounded-full transition-colors duration-500 ${getStatusColor(70)} shadow-[0_0_20px_rgba(0,0,0,0.5)] z-10 flex items-center justify-center border-4 border-gray-800`}>
             <span className="text-[10px] font-bold text-white/50 uppercase">BRG</span>
          </div>
        </motion.div>

        {/* Chuck / Workpiece area */}
        <motion.div 
          animate={{ scale: activeSensor === 'pressure' ? 1.05 : 1 }}
          className={`w-1/3 h-full rounded-r-3xl transition-colors duration-500 ${getStatusColor(90)} opacity-70 border-y-2 border-r-2 border-white/10 flex items-center justify-center`}
        >
           <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Hydraulics</span>
        </motion.div>
      </div>
      
      {/* HUD overlay */}
      <div className="absolute top-4 left-4 text-xs font-mono text-cyan-500/70">
        SYS.STATE: ONLINE<br/>
        DIAGNOSTIC: ACTIVE
      </div>
    </div>
  )
}
