import { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Send, Bot, User, CheckCircle2 } from 'lucide-react'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

export const MaintenanceCopilot = ({ machineId }: { machineId: string }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      content: `Hello! I'm your Maintenance Copilot for Machine ${machineId}. I have access to live telemetry, historical maintenance logs, and AI predictions. How can I help you today?`
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const handleSend = async () => {
    if (!input.trim()) return

    const userText = input.trim()
    const newMsg: Message = { id: Date.now(), role: 'user', content: userText }
    const updatedMessages = [...messages, newMsg]
    setMessages(updatedMessages)
    setInput('')
    setIsTyping(true)

    try {
      const res = await fetch('http://localhost:8000/api/v1/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: machineId,
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content }))
        })
      })

      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [
          ...prev,
          { id: Date.now(), role: 'assistant', content: data.response, sources: data.sources }
        ])
      } else {
        setMessages(prev => [
          ...prev,
          { id: Date.now(), role: 'assistant', content: "Failed to query AI copilot service. Please try again.", sources: ["System Status"] }
        ])
      }
    } catch (e) {
      setMessages(prev => [
        ...prev,
        { id: Date.now(), role: 'assistant', content: "Network error connecting to Maintenance Copilot.", sources: ["System Offline"] }
      ])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="glass-panel p-6 flex flex-col h-[500px]">
      <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
        <div className="p-2 bg-primary/10 text-primary rounded-lg">
          <MessageSquare size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-white">Maintenance Copilot</h3>
          <p className="text-gray-400 text-sm">RAG-powered AI Assistant</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.map(msg => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-primary text-white' : 'bg-gray-800 text-primary'
            }`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`max-w-[80%] rounded-2xl p-4 ${
              msg.role === 'user' 
                ? 'bg-primary text-white rounded-tr-none' 
                : 'bg-gray-800/50 text-gray-200 border border-gray-700/50 rounded-tl-none'
            }`}>
              <p className="text-sm leading-relaxed">{msg.content}</p>
              
              {msg.sources && (
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <p className="text-xs text-gray-400 font-medium mb-2 flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    Sources Retrieved:
                  </p>
                  <ul className="space-y-1">
                    {msg.sources.map((src, i) => (
                      <li key={i} className="text-xs text-primary/80 bg-primary/5 px-2 py-1 rounded inline-block mr-2 mb-1">
                        {src}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-800 text-primary flex items-center justify-center">
              <Bot size={16} />
            </div>
            <div className="bg-gray-800/50 rounded-2xl rounded-tl-none p-4 flex items-center gap-1">
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-2 h-2 bg-gray-400 rounded-full" />
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-2 h-2 bg-gray-400 rounded-full" />
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-2 h-2 bg-gray-400 rounded-full" />
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about risk, maintenance, or history..."
          className="w-full glass-input rounded-xl px-4 py-3 pr-12 text-sm"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
