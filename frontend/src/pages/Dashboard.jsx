import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, AlertTriangle, RefreshCw, Activity, CheckCircle,
  Clock, XCircle, Play, BarChart3
} from 'lucide-react'
import StatCard from '../components/StatCard'
import LogConsole from '../components/LogConsole'
import ProgressBar from '../components/ProgressBar'

const API = 'https://min-project-federal.onrender.com'

function ClientBadge({ clientId, type, trustScore }) {
  const isMal = type === 'malicious'
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${isMal ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.25)'}`,
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      transition: 'all 0.2s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: isMal ? '#f43f5e' : '#10b981',
          boxShadow: `0 0 8px ${isMal ? '#f43f5e' : '#10b981'}`,
          animation: isMal ? 'pulse-glow 2s infinite' : 'none',
        }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)' }}>
          {clientId}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {trustScore !== undefined && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 12,
            color: trustScore < 0.3 ? '#f43f5e' : '#10b981',
            background: trustScore < 0.3 ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)',
            padding: '2px 8px',
            borderRadius: 6,
          }}>
            T: {trustScore.toFixed(3)}
          </span>
        )}
        <span className={`badge ${isMal ? 'badge-malicious' : 'badge-normal'}`}>
          {isMal ? '🔴 Malicious' : '🟢 Normal'}
        </span>
      </div>
    </div>
  )
}

const statusStyle = {
  idle:      { color: '#64748b', icon: Clock,       label: 'Idle'      },
  running:   { color: '#f59e0b', icon: Activity,    label: 'Running'   },
  completed: { color: '#10b981', icon: CheckCircle, label: 'Completed' },
  error:     { color: '#f43f5e', icon: XCircle,     label: 'Error'     },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle')
  const [results, setResults] = useState(null)
  const [logs, setLogs] = useState([])
  const [logOffset, setLogOffset] = useState(0)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)

  const poll = useCallback(async () => {
    try {
      const [statusRes, logsRes] = await Promise.all([
        fetch(`${API}/status`).then(r => r.json()),
        fetch(`${API}/logs?offset=${logOffset}`).then(r => r.json()),
      ])

      setStatus(statusRes.status || 'idle')
      setError(statusRes.error || null)

      if (logsRes.logs?.length) {
        setLogs(prev => [...prev, ...logsRes.logs])
        setLogOffset(logsRes.total || 0)
      }

      // Estimate progress from log count
      if (statusRes.status === 'running') {
        setProgress(Math.min((logsRes.total / 80) * 100, 95))
      } else if (statusRes.status === 'completed') {
        setProgress(100)
      }

      if (statusRes.status === 'completed') {
        const resData = await fetch(`${API}/results`).then(r => r.json())
        setResults(resData)
      }
    } catch (e) {
      // backend not running
    }
  }, [logOffset])

  useEffect(() => {
    poll()
    const id = setInterval(poll, 2000)
    return () => clearInterval(id)
  }, [poll])

  const st = statusStyle[status] || statusStyle.idle
  const StatusIcon = st.icon

  const clients = results?.client_types
    ? Object.entries(results.client_types).map(([id, type]) => ({
        clientId: id,
        type,
        trustScore: results.trust_scores?.[id],
      }))
    : []

  return (
    <div className="page-wrapper">
      <div className="container" style={{ padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }}>
                <span className="gradient-text">Dashboard</span>
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
                Live simulation monitoring and client overview
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button id="dashboard-goto-sim-btn" className="btn btn-outline" onClick={() => navigate('/simulation')}>
                <Play size={15} /> Run Simulation
              </button>
              {status === 'completed' && (
                <button id="dashboard-goto-analytics-btn" className="btn btn-primary" onClick={() => navigate('/analytics')}>
                  <BarChart3 size={15} /> View Analytics
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="card" style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `${st.color}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <StatusIcon size={20} color={st.color} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: st.color }}>{st.label}</div>
            {error && <div style={{ fontSize: 13, color: '#f43f5e' }}>{error}</div>}
          </div>
          {status === 'running' && (
            <RefreshCw size={16} color="#f59e0b" style={{ animation: 'spin 1s linear infinite' }} />
          )}
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 20, marginBottom: 32 }}>
          <StatCard icon={Users}         label="Total Clients"    value={results?.num_clients    ?? 0} color="#6366f1" />
          <StatCard icon={AlertTriangle} label="Malicious Clients" value={results?.num_malicious  ?? 0} color="#f43f5e" />
          <StatCard icon={RefreshCw}     label="Rounds"           value={results?.rounds         ?? 0} color="#8b5cf6" />
          <StatCard icon={Activity}      label="Trust Accuracy"   value={results?.final_trust_accuracy != null ? results.final_trust_accuracy * 100 : 0} suffix="%" color="#10b981" />
        </div>

        {/* Progress */}
        {(status === 'running' || status === 'completed') && (
          <div className="card" style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Training Progress</h3>
            <ProgressBar value={progress} label={status === 'completed' ? 'Simulation complete' : 'Training rounds…'} />
          </div>
        )}

        {/* Two-column: Logs + Clients */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* Logs */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} color="#6366f1" />
              Live Logs
            </h3>
            <LogConsole logs={logs} id="dashboard-log-console" />
          </div>

          {/* Client Grid */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={16} color="#8b5cf6" />
              Clients ({clients.length})
            </h3>
            {clients.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 14, fontStyle: 'italic' }}>
                Run a simulation to see client details…
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
                {clients.map(c => (
                  <ClientBadge key={c.clientId} {...c} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Results */}
        {results && (
          <div className="card" style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Final Results Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 20 }}>
              {[
                { label: 'FedAvg Final Accuracy', value: `${(results.final_fedavg_accuracy * 100).toFixed(2)}%`, color: '#6366f1' },
                { label: 'Trust Final Accuracy',  value: `${(results.final_trust_accuracy  * 100).toFixed(2)}%`, color: '#10b981' },
                { label: 'Improvement',            value: `${results.improvement > 0 ? '+' : ''}${results.improvement}%`, color: results.improvement > 0 ? '#10b981' : '#f59e0b' },
                { label: 'Classes Detected',       value: results.num_classes, color: '#8b5cf6' },
              ].map(({ label, value, color }, i) => (
                <div key={i} style={{
                  background: 'var(--bg-surface)',
                  border: `1px solid ${color}33`,
                  borderRadius: 12, padding: '16px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
