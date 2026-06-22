import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import {
  Shield, Zap, Brain, TrendingUp, Users, Lock, ArrowRight,
  CheckCircle, ChevronRight, GitBranch, Database, Activity
} from 'lucide-react'

function AnimatedCounter({ target, suffix = '', duration = 2000 }) {
  const [val, setVal] = useState(0)
  const rafRef = useRef(null)
  const startedRef = useRef(false)
  const elemRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !startedRef.current) {
        startedRef.current = true
        const start = performance.now()
        const animate = (now) => {
          const t = Math.min((now - start) / duration, 1)
          const eased = 1 - Math.pow(1 - t, 3)
          setVal(Math.round(eased * target))
          if (t < 1) rafRef.current = requestAnimationFrame(animate)
        }
        rafRef.current = requestAnimationFrame(animate)
      }
    }, { threshold: 0.5 })
    if (elemRef.current) observer.observe(elemRef.current)
    return () => { observer.disconnect(); cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return <span ref={elemRef}>{val}{suffix}</span>
}

const features = [
  { icon: Shield, title: 'Trust-Aware Aggregation', desc: 'Deviation-based scoring isolates malicious participants using mathematical anomaly detection.', color: '#6366f1' },
  { icon: Brain, title: 'Real PyTorch Training', desc: 'Genuine neural network training on your uploaded dataset — no synthetic or demo data.', color: '#8b5cf6' },
  { icon: GitBranch, title: 'Federated Simulation', desc: 'Multi-client simulation with stratified data partitioning across normal and malicious nodes.', color: '#06b6d4' },
  { icon: TrendingUp, title: 'FedAvg vs TrustFL', desc: 'Side-by-side comparison of classic averaging against trust-weighted aggregation per round.', color: '#10b981' },
  { icon: Database, title: 'Your Data Only', desc: 'Upload any CSV dataset. All training, splits, and metrics derive exclusively from your data.', color: '#f59e0b' },
  { icon: Activity, title: 'Live Analytics', desc: 'Real-time accuracy, loss, trust scores, and contribution weights after every round.', color: '#f43f5e' },
]

const metrics = [
  { label: 'Aggregation Strategies', value: 2, suffix: '' },
  { label: 'Trust Formula Steps', value: 3, suffix: '' },
  { label: 'API Endpoints', value: 5, suffix: '' },
  { label: 'Max Clients Supported', value: 50, suffix: '+' },
]

export default function Landing() {
  const navigate = useNavigate()
  const [orbPos, setOrbPos] = useState({ x: 50, y: 50 })

  useEffect(() => {
    const move = (e) => {
      setOrbPos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      })
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  return (
    <div className="page-wrapper">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '120px 24px 80px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Orb that follows cursor */}
        <div style={{
          position: 'absolute',
          width: 600, height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          left: `${orbPos.x}%`, top: `${orbPos.y}%`,
          transform: 'translate(-50%,-50%)',
          transition: 'left 0.8s ease, top 0.8s ease',
          pointerEvents: 'none',
        }} />

        {/* Hero badge */}
        <div className="badge badge-info fade-up" style={{ marginBottom: 24, padding: '6px 16px', fontSize: 13 }}>
          <Shield size={13} /> Trust-Aware Federated Learning System
        </div>

        {/* Hero headline */}
        <h1 className="fade-up anim-delay-1" style={{
          fontSize: 'clamp(2.5rem, 7vw, 5.5rem)',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          textAlign: 'center',
          lineHeight: 1.05,
          maxWidth: 900,
          marginBottom: 24,
        }}>
          Federated Learning
          <br />
          <span className="gradient-text">Built on Trust</span>
        </h1>

        {/* Subheadline */}
        <p className="fade-up anim-delay-2" style={{
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          maxWidth: 620,
          lineHeight: 1.7,
          marginBottom: 48,
        }}>
          Upload your dataset. Watch real PyTorch models train across simulated clients.
          See how trust-weighted aggregation defeats malicious participants.
        </p>

        {/* CTAs */}
        <div className="fade-up anim-delay-3" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 80 }}>
          <button
            id="hero-start-simulation-btn"
            className="btn btn-primary btn-lg"
            onClick={() => navigate('/simulation')}
            style={{ fontSize: 16, gap: 10 }}
          >
            <Zap size={18} />
            Start Simulation
            <ArrowRight size={18} />
          </button>
          <button
            id="hero-dashboard-btn"
            className="btn btn-outline btn-lg"
            onClick={() => navigate('/dashboard')}
          >
            View Dashboard
          </button>
        </div>

        {/* Floating architecture diagram */}
        <div className="fade-up anim-delay-4" style={{ width: '100%', maxWidth: 780 }}>
          <div style={{
            background: 'rgba(13,22,39,0.8)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: '32px 40px',
            backdropFilter: 'blur(20px)',
            animation: 'float 6s ease-in-out infinite',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'wrap', position: 'relative' }}>
              {[
                { label: 'CSV Dataset', color: '#06b6d4', icon: Database },
                { label: 'Split Clients', color: '#8b5cf6', icon: Users },
                { label: 'Local Training', color: '#6366f1', icon: Brain },
                { label: 'Trust Score', color: '#10b981', icon: Shield },
                { label: 'Aggregation', color: '#f59e0b', icon: GitBranch },
                { label: 'Analytics', color: '#f43f5e', icon: Activity },
              ].map(({ label, color, icon: Icon }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 8,
                  }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 14,
                      background: `${color}22`, border: `1px solid ${color}55`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={20} color={color} />
                    </div>
                    <span style={{ fontSize: 11, color: '#64748b', textAlign: 'center', width: 70 }}>{label}</span>
                  </div>
                  {i < 5 && (
                    <ChevronRight size={16} color="#334155" style={{ margin: '0 4px', marginTop: -20 }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Metrics ──────────────────────────────────────────────────── */}
      <section style={{
        padding: '80px 24px',
        background: 'rgba(13,22,39,0.5)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 24 }}>
            {metrics.map(({ label, value, suffix }, i) => (
              <div key={i} className="fade-up" style={{
                textAlign: 'center',
                animationDelay: `${i * 0.1}s`,
              }}>
                <div style={{
                  fontSize: 48, fontWeight: 900,
                  background: 'var(--grad-hero)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1,
                  marginBottom: 8,
                }}>
                  <AnimatedCounter target={value} suffix={suffix} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 className="fade-up" style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', marginBottom: 16 }}>
              Everything You Need for{' '}
              <span className="gradient-text">Real FL Research</span>
            </h2>
            <p className="fade-up anim-delay-1" style={{ color: 'var(--text-secondary)', fontSize: 17, maxWidth: 560, margin: '0 auto' }}>
              A complete pipeline from raw data to trust-aware model aggregation.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 }}>
            {features.map(({ icon: Icon, title, desc, color }, i) => (
              <div key={i} className="card fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${color}22`, border: `1px solid ${color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <Icon size={20} color={color} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px' }}>
        <div className="container">
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 24,
            padding: '60px 40px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 24,
              background: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(99,102,241,0.12), transparent)',
              pointerEvents: 'none',
            }} />
            <Lock size={40} color="#6366f1" style={{ marginBottom: 20 }} />
            <h2 style={{ fontSize: 'clamp(1.6rem,3vw,2.4rem)', marginBottom: 16 }}>
              Ready to Run Your{' '}
              <span className="gradient-text">First Simulation?</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 36, maxWidth: 480, margin: '0 auto 36px' }}>
              Upload a CSV, set your client config, and see real federated training with trust scores — in minutes.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                id="cta-start-simulation-btn"
                className="btn btn-primary btn-lg"
                onClick={() => navigate('/simulation')}
              >
                <Zap size={18} />
                Start Simulation
              </button>
              <button
                id="cta-about-btn"
                className="btn btn-outline btn-lg"
                onClick={() => navigate('/about')}
              >
                How It Works
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '32px 24px',
        borderTop: '1px solid var(--border)',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: 13,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
          <Shield size={14} color="#6366f1" />
          <strong style={{ color: 'var(--text-secondary)' }}>TrustFL</strong>
        </div>
        Trust-Aware Federated Learning System · Local Simulation · Real PyTorch Training
      </footer>
    </div>
  )
}
