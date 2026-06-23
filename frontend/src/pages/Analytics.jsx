import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, TrendingUp, Shield, GitBranch, RefreshCw, Play, AlertCircle } from 'lucide-react'
import AccuracyChart from '../components/charts/AccuracyChart'
import LossChart from '../components/charts/LossChart'
import TrustScoreChart from '../components/charts/TrustScoreChart'
import ContributionChart from '../components/charts/ContributionChart'

const API = 'https://min-project-federal.onrender.com'

function ChartCard({ title, icon: Icon, iconColor, children, badge }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={16} color={iconColor} />
          {title}
        </h3>
        {badge && badge}
      </div>
      {children}
    </div>
  )
}

export default function Analytics() {
  const navigate = useNavigate()
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/results`)
        if (res.status === 404) {
          const d = await res.json()
          setError(d.error || 'Simulation not yet completed.')
          return
        }
        if (!res.ok) throw new Error('Failed to fetch results')
        const data = await res.json()
        setResults(data)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetch_()
  }, [])

  if (loading) return (
    <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div style={{ textAlign: 'center' }}>
        <RefreshCw size={36} color="#6366f1" style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading results…</p>
      </div>
    </div>
  )

  if (error || !results) return (
    <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="card" style={{ textAlign: 'center', maxWidth: 480 }}>
        <AlertCircle size={40} color="#f59e0b" style={{ marginBottom: 16 }} />
        <h2 style={{ marginBottom: 12 }}>No Results Available</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          {error || 'Run a simulation first to see analytics.'}
        </p>
        <button
          id="analytics-goto-sim-btn"
          className="btn btn-primary"
          onClick={() => navigate('/simulation')}
        >
          <Play size={15} /> Go to Simulation
        </button>
      </div>
    </div>
  )

  const {
    fedavg_accuracy, trust_accuracy,
    fedavg_loss, trust_loss,
    trust_scores, contribution_weights,
    anomaly_flags, client_types,
    final_fedavg_accuracy, final_trust_accuracy,
    improvement, num_clients, num_malicious, rounds, num_classes, feature_names,
  } = results

  const roundLabels = Array.from({ length: rounds }, (_, i) => i + 1)

  return (
    <div className="page-wrapper">
      <div className="container" style={{ padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
            <span className="gradient-text">Analytics</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
            Real training results — FedAvg vs Trust-Weighted across {rounds} rounds · {num_clients} clients · {num_classes} classes
          </p>
        </div>

        {/* Top KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'FedAvg Accuracy',  value: `${(final_fedavg_accuracy * 100).toFixed(2)}%`, color: '#6366f1' },
            { label: 'Trust Accuracy',   value: `${(final_trust_accuracy * 100).toFixed(2)}%`,  color: '#10b981' },
            { label: 'Improvement',      value: `${improvement > 0 ? '+' : ''}${improvement}%`, color: improvement > 0 ? '#10b981' : '#f59e0b' },
            { label: 'Malicious Caught', value: `${num_malicious}/${num_clients}`, color: '#f43f5e' },
            { label: 'Training Rounds',  value: rounds, color: '#8b5cf6' },
            { label: 'Feature Dims',     value: feature_names?.length ?? '—', color: '#06b6d4' },
          ].map(({ label, value, color }, i) => (
            <div key={i} className="card fade-up" style={{
              textAlign: 'center', animationDelay: `${i * 0.06}s`,
              background: `linear-gradient(145deg, rgba(13,22,39,0.9), ${color}11)`,
              border: `1px solid ${color}33`,
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1, marginBottom: 6 }}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Charts grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <ChartCard
            title="Accuracy per Round"
            icon={TrendingUp}
            iconColor="#10b981"
            badge={<span className="badge badge-normal">FedAvg vs TrustFL</span>}
          >
            <AccuracyChart fedavgData={fedavg_accuracy} trustData={trust_accuracy} />
          </ChartCard>

          <ChartCard
            title="Loss per Round"
            icon={BarChart3}
            iconColor="#f43f5e"
            badge={<span className="badge badge-malicious">Lower is Better</span>}
          >
            <LossChart fedavgLoss={fedavg_loss} trustLoss={trust_loss} />
          </ChartCard>

          <ChartCard
            title="Trust Scores per Client"
            icon={Shield}
            iconColor="#8b5cf6"
            badge={<span className="badge badge-warning">Threshold: 0.30</span>}
          >
            <TrustScoreChart
              trustScores={trust_scores}
              clientTypes={client_types}
              anomalyFlags={anomaly_flags}
            />
          </ChartCard>

          <ChartCard
            title="Aggregation Contribution Weights"
            icon={GitBranch}
            iconColor="#6366f1"
            badge={<span className="badge badge-info">Trust-Weighted</span>}
          >
            <ContributionChart
              weights={contribution_weights}
              clientTypes={client_types}
            />
          </ChartCard>
        </div>

        {/* Final Comparison Table */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={16} color="#6366f1" />
            Final Comparison Table
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Round', 'FedAvg Acc', 'Trust Acc', 'FedAvg Loss', 'Trust Loss', 'Δ Accuracy'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left',
                      color: 'var(--text-muted)', fontSize: 12,
                      textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roundLabels.map((r, i) => {
                  const fa = fedavg_accuracy[i] ?? 0
                  const tr = trust_accuracy[i] ?? 0
                  const delta = (tr - fa) * 100
                  return (
                    <tr key={r} style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    }}>
                      <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>R{r}</td>
                      <td style={{ padding: '10px 16px', color: '#6366f1', fontWeight: 600 }}>{(fa * 100).toFixed(2)}%</td>
                      <td style={{ padding: '10px 16px', color: '#10b981', fontWeight: 600 }}>{(tr * 100).toFixed(2)}%</td>
                      <td style={{ padding: '10px 16px', color: '#f43f5e' }}>{fedavg_loss[i]?.toFixed(4) ?? '—'}</td>
                      <td style={{ padding: '10px 16px', color: '#f59e0b' }}>{trust_loss[i]?.toFixed(4) ?? '—'}</td>
                      <td style={{ padding: '10px 16px', fontWeight: 700, color: delta >= 0 ? '#10b981' : '#f43f5e' }}>
                        {delta >= 0 ? '+' : ''}{delta.toFixed(2)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border-strong)', background: 'rgba(99,102,241,0.05)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>Final</td>
                  <td style={{ padding: '12px 16px', color: '#6366f1', fontWeight: 800 }}>{(final_fedavg_accuracy * 100).toFixed(2)}%</td>
                  <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: 800 }}>{(final_trust_accuracy * 100).toFixed(2)}%</td>
                  <td colSpan={2} />
                  <td style={{ padding: '12px 16px', fontWeight: 800, color: improvement > 0 ? '#10b981' : '#f43f5e' }}>
                    {improvement > 0 ? '+' : ''}{improvement}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Per-client trust table */}
        <div className="card" style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={16} color="#8b5cf6" />
            Per-Client Trust Details
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Client', 'Type', 'Trust Score', 'Weight', 'Status'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left',
                      color: 'var(--text-muted)', fontSize: 12,
                      textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(trust_scores).map(([cid, score]) => {
                  const type = client_types[cid] || 'normal'
                  const weight = contribution_weights[cid] ?? 0
                  const isAnomaly = anomaly_flags[cid]
                  return (
                    <tr key={cid} style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: type === 'malicious' ? 'rgba(244,63,94,0.03)' : 'transparent',
                    }}>
                      <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>{cid}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span className={`badge ${type === 'malicious' ? 'badge-malicious' : 'badge-normal'}`}>
                          {type === 'malicious' ? '🔴 Malicious' : '🟢 Normal'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontWeight: 600,
                        color: score < 0.3 ? '#f43f5e' : '#10b981' }}>
                        {score.toFixed(4)}
                      </td>
                      <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', color: '#8b5cf6' }}>
                        {(weight * 100).toFixed(2)}%
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {isAnomaly
                          ? <span className="badge badge-malicious">⚠ Anomaly</span>
                          : <span className="badge badge-normal">✓ Trusted</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
