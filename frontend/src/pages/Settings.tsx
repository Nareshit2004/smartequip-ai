import { useState } from 'react'
import { User, Bell, Shield, Zap, Check, Loader2, Key, Copy, CheckCircle2 } from 'lucide-react'

export const Settings = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'system' | 'security'>('system')
  
  // Notification states
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [smsAlerts, setSmsAlerts] = useState(true)
  const [pushAlerts, setPushAlerts] = useState(false)
  
  // System states
  const [aiScaling, setAiScaling] = useState(true)
  const [predictiveMaint, setPredictiveMaint] = useState(true)
  const [highPerfMode, setHighPerfMode] = useState(false)

  // Security states
  const [apiKeyCopied, setApiKeyCopied] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true)
  
  // UI states
  const [isSavingSystem, setIsSavingSystem] = useState(false)
  const [isSavedSystem, setIsSavedSystem] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavedProfile, setIsSavedProfile] = useState(false)
  const [isSavingSecurity, setIsSavingSecurity] = useState(false)
  const [isSavedSecurity, setIsSavedSecurity] = useState(false)

  const handleSaveSystem = () => {
    setIsSavingSystem(true)
    setTimeout(() => {
      setIsSavingSystem(false)
      setIsSavedSystem(true)
      setTimeout(() => setIsSavedSystem(false), 2000)
    }, 800)
  }

  const handleSaveProfile = () => {
    setIsSavingProfile(true)
    setTimeout(() => {
      setIsSavingProfile(false)
      setIsSavedProfile(true)
      setTimeout(() => setIsSavedProfile(false), 2000)
    }, 800)
  }

  const handleSaveSecurity = () => {
    setIsSavingSecurity(true)
    setTimeout(() => {
      setIsSavingSecurity(false)
      setIsSavedSecurity(true)
      setTimeout(() => setIsSavedSecurity(false), 2000)
    }, 800)
  }

  const copyApiKey = () => {
    navigator.clipboard.writeText("sme_live_9f83a4c102bd84720914e6fa")
    setApiKeyCopied(true)
    setTimeout(() => setApiKeyCopied(false), 2000)
  }

  const Toggle = ({ enabled, onChange }: { enabled: boolean, onChange: (val: boolean) => void }) => (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enabled ? 'bg-primary' : 'bg-gray-700'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account, notifications, and system preferences</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 space-y-2">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'profile' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            <User size={18} />
            <span className="font-medium">Profile</span>
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'notifications' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            <Bell size={18} />
            <span className="font-medium">Notifications</span>
          </button>
          <button 
            onClick={() => setActiveTab('system')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'system' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            <Zap size={18} />
            <span className="font-medium">System Configuration</span>
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'security' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'} mt-4`}
          >
            <Shield size={18} />
            <span className="font-medium">Security & API Keys</span>
          </button>
        </div>

        {/* Settings Content Area */}
        <div className="flex-1 glass-panel p-8">
          {activeTab === 'system' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <h2 className="text-xl font-bold text-white mb-6">System Configuration</h2>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <h3 className="font-medium text-white">AI Predictive Maintenance</h3>
                      <p className="text-sm text-gray-400 mt-1">Automatically generate alerts before failure occurs based on telemetry</p>
                    </div>
                    <Toggle enabled={predictiveMaint} onChange={setPredictiveMaint} />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <h3 className="font-medium text-white">Dynamic Visual Mode</h3>
                      <p className="text-sm text-gray-400 mt-1">Enable complex mesh gradients and glassmorphism (requires high performance)</p>
                    </div>
                    <Toggle enabled={highPerfMode} onChange={setHighPerfMode} />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <h3 className="font-medium text-white">Auto-Scale Analytics</h3>
                      <p className="text-sm text-gray-400 mt-1">Scale up processing power automatically during high-volume telemetry ingestion</p>
                    </div>
                    <Toggle enabled={aiScaling} onChange={setAiScaling} />
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t border-white/10 flex items-center gap-4">
                <button 
                  onClick={handleSaveSystem}
                  disabled={isSavingSystem}
                  className="glass-button px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 min-w-[200px] justify-center transition-all disabled:opacity-70"
                >
                  {isSavingSystem ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : isSavedSystem ? (
                    <Check size={18} className="text-emerald-400" />
                  ) : (
                    <Check size={18} />
                  )}
                  {isSavingSystem ? 'Saving...' : isSavedSystem ? 'Settings Saved' : 'Save System Settings'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <h2 className="text-xl font-bold text-white mb-6">Profile Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-400">Full Name</label>
                    <input type="text" className="w-full glass-input rounded-lg px-4 py-2" defaultValue="Admin User" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-400">Email Address</label>
                    <input type="email" className="w-full glass-input rounded-lg px-4 py-2" defaultValue="admin@smartequip.ai" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-400">Role</label>
                    <input type="text" className="w-full glass-input rounded-lg px-4 py-2 text-gray-500" defaultValue="Super Administrator" disabled />
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-white/10 flex items-center gap-4">
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="glass-button px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 min-w-[160px] justify-center transition-all disabled:opacity-70"
                >
                  {isSavingProfile ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : isSavedProfile ? (
                    <Check size={18} className="text-emerald-400" />
                  ) : (
                    <User size={18} />
                  )}
                  {isSavingProfile ? 'Updating...' : isSavedProfile ? 'Profile Updated' : 'Update Profile'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <h2 className="text-xl font-bold text-white mb-6">Notification Preferences</h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <h3 className="font-medium text-white">Email Alerts</h3>
                      <p className="text-sm text-gray-400 mt-1">Receive critical equipment alerts via email</p>
                    </div>
                    <Toggle enabled={emailAlerts} onChange={setEmailAlerts} />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <h3 className="font-medium text-white">SMS Notifications</h3>
                      <p className="text-sm text-gray-400 mt-1">Receive text messages for downtime events</p>
                    </div>
                    <Toggle enabled={smsAlerts} onChange={setSmsAlerts} />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <h3 className="font-medium text-white">Push Notifications</h3>
                      <p className="text-sm text-gray-400 mt-1">Receive browser push notifications for all alerts</p>
                    </div>
                    <Toggle enabled={pushAlerts} onChange={setPushAlerts} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Security & API Keys</h2>
                <p className="text-sm text-gray-400 mb-6">Manage edge gateway ingestion tokens and platform authentication credentials</p>

                <div className="space-y-6">
                  {/* API Ingestion Key */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key size={18} className="text-primary" />
                        <h3 className="font-medium text-white">Telemetry Ingestion API Key</h3>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Use this bearer token to authenticate edge IoT gateways sending telemetry batches to <code className="text-indigo-300 bg-black/40 px-1 py-0.5 rounded">POST /api/v1/telemetry/simulate/:id</code>.
                    </p>
                    <div className="flex items-center gap-3">
                      <input 
                        type="password" 
                        readOnly 
                        value="sme_live_9f83a4c102bd84720914e6fa" 
                        className="flex-1 glass-input rounded-lg px-4 py-2 text-sm text-gray-300 font-mono tracking-wider" 
                      />
                      <button 
                        onClick={copyApiKey}
                        className="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                      >
                        {apiKeyCopied ? <CheckCircle2 size={15} className="text-emerald-300" /> : <Copy size={15} />}
                        {apiKeyCopied ? 'Copied!' : 'Copy Key'}
                      </button>
                    </div>
                  </div>

                  {/* 2FA Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <h3 className="font-medium text-white">Multi-Factor Authentication (MFA)</h3>
                      <p className="text-sm text-gray-400 mt-1">Require TOTP authentication token for critical diagnostic resets</p>
                    </div>
                    <Toggle enabled={twoFactorEnabled} onChange={setTwoFactorEnabled} />
                  </div>

                  {/* Password Reset Section */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                    <h3 className="font-medium text-white">Change Master Password</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">New Password</label>
                        <input type="password" placeholder="••••••••••••" className="w-full glass-input rounded-lg px-4 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Confirm New Password</label>
                        <input type="password" placeholder="••••••••••••" className="w-full glass-input rounded-lg px-4 py-2 text-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 flex items-center gap-4">
                <button 
                  onClick={handleSaveSecurity}
                  disabled={isSavingSecurity}
                  className="glass-button px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 min-w-[180px] justify-center transition-all disabled:opacity-70"
                >
                  {isSavingSecurity ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : isSavedSecurity ? (
                    <Check size={18} className="text-emerald-400" />
                  ) : (
                    <Shield size={18} />
                  )}
                  {isSavingSecurity ? 'Securing...' : isSavedSecurity ? 'Security Updated' : 'Update Security'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
