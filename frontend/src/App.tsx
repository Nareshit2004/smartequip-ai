import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { EquipmentList } from './pages/EquipmentList'
import { MachineDetails } from './pages/MachineDetails'
import { FactoryMap } from './pages/FactoryMap'
import { Alerts } from './pages/Alerts'
import { Settings } from './pages/Settings'
import { Users } from './pages/Users'
import { Reports } from './pages/Reports'
import { Maintenance } from './pages/Maintenance'
import { useAuthStore } from './store/useAuthStore'

function App() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        } />
        
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/equipment" element={<EquipmentList />} />
          <Route path="/equipment/:id" element={<MachineDetails />} />
          <Route path="/machines/:id" element={<MachineDetails />} />
          <Route path="/map" element={<FactoryMap />} />
          <Route path="/users" element={<Users />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
