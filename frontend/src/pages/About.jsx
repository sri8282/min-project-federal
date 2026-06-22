import { Shield, Database, GitBranch, Brain, Activity, Server, ChevronRight } from 'lucide-react'

const modules = [
  {
    file: 'client.py',
    title: 'Client Trainer',
    icon: Brain,
    color: '#6366f1',
    description: 'Simulates each federated learning participant. Holds a real partition of the uploaded CSV. Trains a local copy of the global MLP for LOCAL_EPOCHS epochs using Adam optimizer. Malicious clients apply label-flipping (before training) or noise-injection (after training) attacks.',
    details: [
      'Class: ClientTrainer(client_id, X, y, is_malicious, attack_type)',
      'train(global_weights, input_dim, num_classes) → (local_weights, loss_history)',
      'Attacks: label_flip | noise_inject (NOISE_SCALE=5.0)',
      'LOCAL_EPOCHS=3, BATCH_SIZE=32, LR=0.01, Adam optimizer',
    ],
  },
  {
    file: 'server.py',
    title: 'Global Model',
    icon: Server,
    color: '#8b5cf6',
    description: 'Defines the shared PyTorch MLP whose input/output dimensions are dynamically set at runtime from the uploaded CSV\'s feature count and class cardinality. Provides weight distribution and evaluation on the held-out test set.',
    details: [
      'Architecture: Input → 128 → BN → ReLU → Dropout → 64 → BN → ReLU → Dropout → 32 → ReLU → num_classes',
      'GlobalModel.get_weights() → deep-copy state dict',
      'GlobalModel.set_weights(state_dict) → load aggregated weights',
      'GlobalModel.evaluate(X_test, y_test) → (accuracy, loss)',
    ],
  },
  {
    file: 'aggregation.py',
    title: 'Aggregation Engine',
    icon: GitBranch,
    color: '#06b6d4',
    description: 'Two aggregation strategies run in parallel on every round. FedAvg weights by local sample count. Trust-Weighted excludes anomalous clients (trust < 0.3) and down-weights others proportional to their trust score.',
    details: [
      'fedavg(client_updates, sample_counts) → averaged state dict',
      'trust_weighted_aggregation(client_updates) → (state_dict, trust_scores, anomaly_flags, weights)',
      'Anomaly threshold: 0.30 (configurable)',
      'Fallback to equal weights if all clients anomalous',
    ],
  },
  {
    file: 'trust.py',
    title: 'Trust Score Engine',
    icon: Shield,
    color: '#10b981',
    description: 'Computes per-client trust by measuring L2 deviation of each client\'s model update from the mean update. Large deviations (malicious clients) yield low trust scores via exponential decay.',
    details: [
      'deviation_i = ||w_i – mean(w)||₂',
      'trust_i = exp(−α × deviation_i)   where α = 0.5',
      'trust_i = clamp(trust_i, 0.01, 1.0)',
      'Anomaly: trust_i < 0.30 → weight = 0',
    ],
  },
  {
    file: 'simulation.py',
    title: 'Round Orchestrator',
    icon: Activity,
    color: '#f59e0b',
    description: 'Orchestrates the complete federated learning simulation. Preprocesses the CSV, splits training data with stratified partitioning, runs all communication rounds, maintains two parallel global models, and accumulates results.',
    details: [
      'load_and_preprocess: drops NaN, encodes categoricals, StandardScaler',
      'stratified_split: round-robin by class → balanced partitions',
      'Per round: distribute → train (2× FedAvg/Trust branches) → aggregate → evaluate',
      'Results stored in module-level dict, streamed as logs',
    ],
  },
  {
    file: 'app.py',
    title: 'REST API',
    icon: Database,
    color: '#f43f5e',
    description: 'Flask application exposing REST endpoints with CORS. Simulation runs in a background thread to avoid blocking. Logs and status are polled by the frontend until completion.',
    details: [
      'POST /upload-dataset  — validate + save CSV, return metadata',
      'POST /run-simulation  — start background thread, return job info',
      'GET  /results         — full results JSON after completion',
      'GET  /logs?offset=N   — incremental log polling',
      'GET  /status          — idle | running | completed | error',
    ],
  },
]

const flow = [
  { step: '1', label: 'Upload CSV',        desc: 'POST /upload-dataset → validated, saved, metadata returned',   color: '#06b6d4' },
  { step: '2', label: 'Preprocess',         desc: 'Drop NaN, encode categoricals, StandardScaler, encode labels', color: '#8b5cf6' },
  { step: '3', label: 'Partition Data',     desc: 'Stratified split into N client partitions',                    color: '#6366f1' },
  { step: '4', label: 'Distribute Weights', desc: 'Global model weights broadcast to all clients',               color: '#f59e0b' },
  { step: '5', label: 'Local Training',     desc: 'Each client trains for 3 epochs on its partition',            color: '#10b981' },
  { step: '6', label: 'FedAvg Aggregation', desc: 'Sample-weighted average of all client updates',               color: '#6366f1' },
  { step: '7', label: 'Trust Scoring',      desc: 'dev_i = ||w_i − mean(w)||₂ → trust_i = exp(−0.5·dev_i)',     color: '#10b981' },
  { step: '8', label: 'Trust Aggregation',  desc: 'Anomalies (trust<0.3) excluded; remainder re-weighted',       color: '#8b5cf6' },
  { step: '9', label: 'Evaluate',           desc: 'Both models evaluated on 20% held-out test set',             color: '#f59e0b' },
  { step: '↺', label: 'Next Round',         desc: 'Repeat steps 4–9 for num_rounds iterations',                  color: '#94a3b8' },
]

export default function About() {
  return (
    <div className="page-wrapper">
      <div className="container" style={{ padding: '40px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 60, textAlign: 'center' }}>
          <div className="badge badge-info" style={{ marginBottom: 20, padding: '6px 16px' }}>
            <Shield size={13} /> System Architecture
          </div>
          <h1 style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900, marginBottom: 16 }}>
            How <span className="gradient-text">TrustFL</span> Works
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 620, margin: '0 auto', lineHeight: 1.7 }}>
            A complete overview of the backend modules, data flow, trust mathematics, and training pipeline.
          </p>
        </div>

        {/* Trust Math */}
        <div className="card" style={{
          marginBottom: 48,
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(99,102,241,0.05))',
          border: '1px solid rgba(16,185,129,0.2)',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={20} color="#10b981" />
            Trust Score Mathematics
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 32 }}>
            <div>
              <h4 style={{ color: '#10b981', marginBottom: 12, fontSize: 14 }}>Step 1 — Flatten Weights</h4>
              <div style={{
                background: '#010409', borderRadius: 10, padding: '16px',
                fontFamily: 'var(--font-mono)', fontSize: 14, color: '#a0aec0',
                border: '1px solid rgba(16,185,129,0.15)',
              }}>
                <span style={{ color: '#10b981' }}>W_i</span> = flatten(model_weights_i)
                <br /><br />
                All parameter tensors concatenated into a single 1-D vector.
              </div>
            </div>
            <div>
              <h4 style={{ color: '#06b6d4', marginBottom: 12, fontSize: 14 }}>Step 2 — Compute Deviation</h4>
              <div style={{
                background: '#010409', borderRadius: 10, padding: '16px',
                fontFamily: 'var(--font-mono)', fontSize: 14, color: '#a0aec0',
                border: '1px solid rgba(6,182,212,0.15)',
              }}>
                <span style={{ color: '#06b6d4' }}>μ</span> = mean(W_1, …, W_n)
                <br />
                <span style={{ color: '#06b6d4' }}>dev_i</span> = ‖W_i − μ‖₂
                <br /><br />
                L2 norm of client's deviation from the mean.
              </div>
            </div>
            <div>
              <h4 style={{ color: '#8b5cf6', marginBottom: 12, fontSize: 14 }}>Step 3 — Trust Score</h4>
              <div style={{
                background: '#010409', borderRadius: 10, padding: '16px',
                fontFamily: 'var(--font-mono)', fontSize: 14, color: '#a0aec0',
                border: '1px solid rgba(139,92,246,0.15)',
              }}>
                <span style={{ color: '#8b5cf6' }}>trust_i</span> = exp(−0.5 × dev_i)
                <br />
                <span style={{ color: '#475569' }}># clamp to [0.01, 1.0]</span>
                <br /><br />
                Malicious clients (large dev) → trust near 0.
              </div>
            </div>
          </div>
          <div style={{
            marginTop: 24, padding: '14px 20px',
            background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
            borderRadius: 10, fontSize: 14, color: '#f43f5e',
          }}>
            ⚠ Clients with trust &lt; 0.30 are flagged as anomalies and receive weight = 0 in the trust-weighted aggregation.
            The remaining trusted clients are re-normalised so their weights sum to 1.
          </div>
        </div>

        {/* Data Flow */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 28 }}>
            Data Flow & Training Pipeline
          </h2>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {flow.map(({ step, label, desc, color }, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  {/* Timeline */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, minWidth: 40 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: `${color}22`, border: `2px solid ${color}66`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13, color,
                      flexShrink: 0,
                    }}>{step}</div>
                    {i < flow.length - 1 && (
                      <div style={{ width: 2, flexGrow: 1, minHeight: 20, background: `${color}33`, margin: '4px 0' }} />
                    )}
                  </div>
                  {/* Content */}
                  <div style={{ paddingBottom: 20, paddingTop: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Backend Modules */}
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 28 }}>Backend Modules</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 24 }}>
          {modules.map(({ file, title, icon: Icon, color, description, details }) => (
            <div key={file} className="card fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${color}22`, border: `1px solid ${color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={20} color={color} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color, fontWeight: 700 }}>{file}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
                </div>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{description}</p>
              <div style={{
                background: '#010409', borderRadius: 10, padding: '12px 16px',
                border: `1px solid ${color}22`,
              }}>
                {details.map((d, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: i < details.length - 1 ? 6 : 0 }}>
                    <ChevronRight size={13} color={color} style={{ flexShrink: 0, marginTop: 3 }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* API Table */}
        <div className="card" style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>REST API Reference</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Method', 'Endpoint', 'Description', 'Response'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left',
                      color: 'var(--text-muted)', fontSize: 11,
                      textTransform: 'uppercase', letterSpacing: '0.07em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['GET',  '/health',          'Health check',                                    '{ status: "ok" }'],
                  ['POST', '/upload-dataset',   'Upload CSV; validates + saves',                   '{ columns, rows, label_column }'],
                  ['POST', '/run-simulation',   'Start simulation in background thread',           '{ message, num_clients, ... }'],
                  ['GET',  '/results',          'Full results after completion',                   '{ fedavg_accuracy[], trust_accuracy[], trust_scores, ... }'],
                  ['GET',  '/logs?offset=N',    'Incremental log lines (poll every 1.5s)',         '{ logs[], total, status }'],
                  ['GET',  '/status',           'Current state: idle|running|completed|error',    '{ status, error, log_count }'],
                ].map(([method, path, desc, resp], i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700,
                        background: method === 'GET' ? 'rgba(6,182,212,0.15)' : 'rgba(139,92,246,0.15)',
                        color: method === 'GET' ? '#06b6d4' : '#8b5cf6',
                        fontFamily: 'var(--font-mono)',
                      }}>{method}</span>
                    </td>
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', color: '#e2e8f0', fontSize: 13 }}>{path}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{desc}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', color: '#64748b', fontSize: 12 }}>{resp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stack */}
        <div className="card" style={{ marginTop: 24, textAlign: 'center' }}>
          <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 700 }}>Technology Stack</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {[
              ['PyTorch', '#ee4c2c'],
              ['Flask',   '#000'],
              ['React',   '#61dafb'],
              ['Vite',    '#bd34fe'],
              ['Recharts','#27ae60'],
              ['Pandas',  '#150458'],
              ['Scikit-learn','#f89939'],
              ['React Router','#f44250'],
            ].map(([name, color]) => (
              <span key={name} style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                fontSize: 13, fontWeight: 600,
                color: 'var(--text-secondary)',
                background: 'var(--bg-card)',
              }}>{name}</span>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
