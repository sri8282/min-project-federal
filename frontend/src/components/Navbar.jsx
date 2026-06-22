import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  Brain, LayoutDashboard, Play, BarChart3, Info, Menu, X, Shield
} from 'lucide-react'

const links = [
  { to: '/',           label: 'Home',       icon: Brain },
  { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/simulation', label: 'Simulation', icon: Play },
  { to: '/analytics',  label: 'Analytics',  icon: BarChart3 },
  { to: '/about',      label: 'About',      icon: Info },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => { setOpen(false) }, [location])

  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 1000,
      height: '72px',
      display: 'flex',
      alignItems: 'center',
      background: scrolled
        ? 'rgba(3,6,15,0.88)'
        : 'rgba(3,6,15,0.4)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: `1px solid ${scrolled ? 'rgba(99,102,241,0.2)' : 'transparent'}`,
      transition: 'all 0.3s ease',
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        {/* Logo */}
        <NavLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>
            <span className="gradient-text">TrustFL</span>
          </span>
        </NavLink>

        {/* Desktop Links */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}
          className="nav-links">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s ease',
              color: isActive ? '#818cf8' : '#94a3b8',
              background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
              border: isActive ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
            })}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </div>

        {/* Mobile menu button */}
        <button
          id="navbar-menu-toggle"
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'none',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-primary)', padding: '8px',
          }}
          className="mobile-menu-btn"
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div style={{
          position: 'absolute', top: '72px', left: 0, right: 0,
          background: 'rgba(3,6,15,0.97)',
          backdropFilter: 'blur(24px)',
          borderBottom: '1px solid var(--border)',
          padding: '12px 24px 20px',
          display: 'flex', flexDirection: 'column', gap: '4px',
          animation: 'fadeUp 0.3s ease',
        }}>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px 16px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '15px',
              fontWeight: 500,
              color: isActive ? '#818cf8' : '#94a3b8',
              background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
            })}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </nav>
  )
}
