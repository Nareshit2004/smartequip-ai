import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Image as ImageIcon, ShieldCheck, AlertCircle } from 'lucide-react'

interface MultimodalUploadProps {
  machineId?: string
}

export const MultimodalUpload = ({ machineId = '1' }: MultimodalUploadProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleFileUpload = async (file: File) => {
    setIsAnalyzing(true)
    setResults(null)
    setErrorMessage(null)

    try {
      const formData = new FormData()
      formData.append('machine_id', machineId.replace('M-', '') || '1')
      formData.append('file', file)

      const res = await fetch('http://localhost:8000/api/v1/multimodal/analyze', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        const data = await res.json()
        setResults({
          findings: data.findings,
          confidence: data.confidence,
          action: data.recommended_action
        })
      } else {
        const errText = await res.text()
        console.error("Multimodal upload failed:", errText)
        setErrorMessage("Upload analysis failed. Please verify file format.")
      }
    } catch (e) {
      console.error("Multimodal error:", e)
      setErrorMessage("Network error connecting to Multimodal AI service.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0])
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="glass-panel p-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 text-primary rounded-lg">
          <ImageIcon size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-white">Multimodal Analysis</h3>
          <p className="text-gray-400 text-sm">Upload images or service docs</p>
        </div>
      </div>

      {!results && !isAnalyzing && (
        <>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={onFileChange} 
            className="hidden" 
            accept=".png,.jpg,.jpeg,.pdf,.txt,.csv,.log"
          />
          <div 
            className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-gray-700 hover:border-gray-500'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={32} className="text-gray-500 mb-4" />
            <p className="text-white font-medium mb-1">Drag and drop or click to upload</p>
            <p className="text-gray-500 text-sm">Supports PNG, JPG, PDF, TXT, CSV</p>
            {errorMessage && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20">
                <AlertCircle size={14} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </>
      )}

      {isAnalyzing && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-primary font-medium animate-pulse">Running AI Vision Model...</p>
        </div>
      )}

      <AnimatePresence>
        {results && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col justify-center space-y-4"
          >
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-emerald-500 mb-2">
                <ShieldCheck size={18} />
                <span className="font-medium">Analysis Complete ({results.confidence}% confidence)</span>
              </div>
              <ul className="space-y-2 list-disc list-inside text-sm text-gray-300">
                {results.findings.map((f: string, i: number) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Recommended Action</p>
              <p className="text-sm text-white font-medium">{results.action}</p>
            </div>
            
            <button 
              onClick={() => {
                setResults(null)
                setErrorMessage(null)
              }}
              className="text-primary text-sm hover:underline text-left"
            >
              Upload another file
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
