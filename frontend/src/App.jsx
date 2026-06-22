import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Simulation from './pages/Simulation'
import Analytics from './pages/Analytics'
import About from './pages/About'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/"           element={<Landing />} />
        <Route path="/dashboard"  element={<Dashboard />} />
        <Route path="/simulation" element={<Simulation />} />
        <Route path="/analytics"  element={<Analytics />} />
        <Route path="/about"      element={<About />} />
      </Routes>
    </BrowserRouter>
  )
}
