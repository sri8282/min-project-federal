import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import {
  Upload, Play, Users, AlertTriangle, RefreshCw,
  FileText, CheckCircle, XCircle, ChevronRight
} from 'lucide-react'
import LogConsole from '../components/LogConsole'
import ProgressBar from '../components/ProgressBar'

const API = '/api'

function SliderField({ id, label, value, min, max, step = 1, onChange, disabled }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <label htmlFor={id} style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
          {label}
        </label>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
          color: 'var(--accent-primary)',
          background: 'rgba(99,102,241,0.12)',
          padding: '2px 10px', borderRadius: 6,
        }}>
          {value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        disabled={disabled}
        style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{min}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{max}</span>
      </div>
    </div>
  )
}

export default function Simulation() {
  const navigate = useNavigate()

  // Config
  const [numClients,   setNumClients]   = useState(5)
  const [numMalicious, setNumMalicious] = useState(1)
  const [numRounds,    setNumRounds]    = useState(5)

  // Upload
  const [uploadedFile,   setUploadedFile]   = useState(null)
  const [uploadInfo,     setUploadInfo]     = useState(null)
  const [uploading,      setUploading]      = useState(false)
  const [uploadError,    setUploadError]    = useState(null)

  // Simulation
  const [simStatus,   setSimStatus]   = useState('idle')   // idle|running|completed|error
  const [logs,        setLogs]        = useState([])
  const [logOffset,   setLogOffset]   = useState(0)
  const [progress,    setProgress]    = useState(0)
  const [simError,    setSimError]    = useState(null)

  const pollRef = useRef(null)

  // ── Dropzone ──────────────────────────────────────────────────────
  const onDrop = useCallback(async (accepted) => {
    const file = accepted[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadError('Only CSV files are accepted.')
      return
    }
    setUploadError(null)
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch(`${API}/upload-dataset`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setUploadedFile(file)
      setUploadInfo(data)
    } catch (e) {
      setUploadError(e.message)
    } finally {
      setUploading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    disabled: uploading || simStatus === 'running',
  })

  // ── Poll logs/status ──────────────────────────────────────────────
  const pollLogs = useCallback(async () => {
    try {
      const [statusRes, logsRes] = await Promise.all([
        fetch(`${API}/status`).then(r => r.json()),
        fetch(`${API}/logs?offset=${logOffset}`).then(r => r.json()),
      ])
      const st = statusRes.status || 'idle'
      setSimStatus(st)
      setSimError(statusRes.error || null)

      if (logsRes.logs?.length) {
        setLogs(prev => [...prev, ...logsRes.logs])
        setLogOffset(logsRes.total || 0)
      }

      if (st === 'running') {
        setProgress(Math.min((logsRes.total / 100) * 100, 94))
      } else if (st === 'completed') {
        setProgress(100)
        clearInterval(pollRef.current)
        // Auto-navigate to Analytics after 1.5s
        setTimeout(() => navigate('/analytics'), 1500)
      } else if (st === 'error') {
        clearInterval(pollRef.current)
      }
    } catch (_) {}
  }, [logOffset, navigate])

  useEffect(() => {
    if (simStatus === 'running') {
      pollRef.current = setInterval(pollLogs, 1500)
      return () => clearInterval(pollRef.current)
    }
  }, [simStatus, pollLogs])

  // ── Run simulation ─────────────────────────────────────────────────
  const runSimulation = async () => {
    setLogs([])
    setLogOffset(0)
    setProgress(0)
    setSimError(null)
    setSimStatus('running')

    try {
      const res = await fetch(`${API}/run-simulation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_clients: numClients, num_malicious: numMalicious, num_rounds: numRounds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start simulation')
      // Polling will take over
    } catch (e) {
      setSimError(e.message)
      setSimStatus('error')
    }
  }

  const canRun = uploadedFile && simStatus !== 'running'
  const effectiveMax = Math.max(numClients - 1, 0)

  return (
    <div className="page-wrapper">
      <div className="container" style={{ padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
            <span className="gradient-text">Simulation</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
            Upload your dataset, configure clients, and run federated learning.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 28, alignItems: 'start' }}>

          {/* ── Left: Config Panel ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Dataset Upload */}
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Upload size={16} color="#06b6d4" /> Dataset Upload
              </h3>

              <div
                {...getRootProps()}
                id="dataset-dropzone"
                style={{
                  border: `2px dashed ${isDragActive ? 'var(--accent-primary)' : uploadedFile ? '#10b981' : 'var(--border-strong)'}`,
                  borderRadius: 14,
                  padding: '32px 20px',
                  textAlign: 'center',
                  cursor: uploading || simStatus === 'running' ? 'not-allowed' : 'pointer',
                  background: isDragActive ? 'rgba(99,102,241,0.08)' : 'var(--bg-input)',
                  transition: 'all 0.25s ease',
                }}
              >
                <input {...getInputProps()} id="csv-file-input" />
                {uploading ? (
                  <div>
                    <RefreshCw size={28} color="#6366f1" style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Uploading…</p>
                  </div>
                ) : uploadedFile ? (
                  <div>
                    <CheckCircle size={28} color="#10b981" style={{ marginBottom: 12 }} />
                    <p style={{ color: '#10b981', fontWeight: 600, fontSize: 14 }}>{uploadedFile.name}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                      {uploadInfo?.approximate_rows?.toLocaleString()} rows · {uploadInfo?.num_columns} columns
                    </p>
                    <p style={{ color: '#8b5cf6', fontSize: 12, marginTop: 4 }}>
                      Label: <strong>{uploadInfo?.label_column}</strong>
                    </p>
                  </div>
                ) : (
                  <div>
                    <FileText size={28} color="#475569" style={{ marginBottom: 12 }} />
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 4 }}>
                      {isDragActive ? 'Drop CSV here' : 'Drag & drop CSV or click to browse'}
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Only .csv files accepted</p>
                  </div>
                )}
              </div>

              {uploadError && (
                <div style={{ marginTop: 10, color: '#f43f5e', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <XCircle size={14} /> {uploadError}
                </div>
              )}
            </div>

            {/* Config sliders */}
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={16} color="#8b5cf6" /> Configuration
              </h3>

              <SliderField
                id="slider-num-clients"
                label="Number of Clients"
                value={numClients}
                min={2} max={20}
                onChange={v => { setNumClients(v); if (numMalicious >= v) setNumMalicious(v - 1) }}
                disabled={simStatus === 'running'}
              />
              <SliderField
                id="slider-num-malicious"
                label="Malicious Clients"
                value={numMalicious}
                min={0} max={effectiveMax}
                onChange={setNumMalicious}
                disabled={simStatus === 'running'}
              />
              <SliderField
                id="slider-num-rounds"
                label="Training Rounds"
                value={numRounds}
                min={1} max={15}
                onChange={setNumRounds}
                disabled={simStatus === 'running'}
              />

              {/* Summary chips */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <span className="badge badge-info">{numClients - numMalicious} normal</span>
                <span className="badge badge-malicious">{numMalicious} malicious</span>
                <span className="badge badge-warning">{numRounds} rounds</span>
              </div>
            </div>

            {/* Run button */}
            <button
              id="run-simulation-btn"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: 16 }}
              disabled={!canRun}
              onClick={runSimulation}
            >
              {simStatus === 'running' ? (
                <>
                  <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Simulating…
                </>
              ) : (
                <>
                  <Play size={18} />
                  Run Simulation
                  <ChevronRight size={18} />
                </>
              )}
            </button>

            {!uploadedFile && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Upload a CSV dataset to enable the Run button.
              </p>
            )}
          </div>

          {/* ── Right: Logs / Progress ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Progress */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Progress</h3>
                {simStatus === 'completed' && (
                  <span className="badge badge-normal">
                    <CheckCircle size={12} /> Complete
                  </span>
                )}
                {simStatus === 'error' && (
                  <span className="badge badge-malicious">
                    <XCircle size={12} /> Error
                  </span>
                )}
              </div>
              <ProgressBar
                value={progress}
                label={
                  simStatus === 'idle'      ? 'Waiting to start…' :
                  simStatus === 'running'   ? 'Training in progress…' :
                  simStatus === 'completed' ? 'Simulation complete! Redirecting to Analytics…' :
                  simStatus === 'error'     ? `Error: ${simError}` : ''
                }
              />
              {simStatus === 'completed' && (
                <p style={{ color: '#10b981', fontSize: 13, marginTop: 12, textAlign: 'center' }}>
                  ✅ Redirecting to Analytics automatically…
                </p>
              )}
            </div>

            {/* Logs */}
            <div className="card" style={{ flex: 1 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} color="#6366f1" />
                Live Output Logs
                {simStatus === 'running' && (
                  <RefreshCw size={13} color="#f59e0b" style={{ animation: 'spin 1s linear infinite', marginLeft: 'auto' }} />
                )}
              </h3>
              <LogConsole logs={logs} id="simulation-log-console" />
            </div>

            {/* Dataset info card */}
            {uploadInfo && (
              <div className="card" style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.2)' }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#06b6d4', marginBottom: 10 }}>Dataset Info</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    ['File',    uploadInfo.filename],
                    ['Rows',    uploadInfo.approximate_rows?.toLocaleString()],
                    ['Columns', uploadInfo.num_columns],
                    ['Label',   uploadInfo.label_column],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</span>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Columns</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {uploadInfo.columns?.slice(0, 12).map(c => (
                      <span key={c} style={{
                        background: 'rgba(6,182,212,0.12)',
                        border: '1px solid rgba(6,182,212,0.2)',
                        borderRadius: 6, padding: '2px 8px',
                        fontSize: 11, fontFamily: 'var(--font-mono)', color: '#06b6d4',
                      }}>{c}</span>
                    ))}
                    {uploadInfo.columns?.length > 12 && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{uploadInfo.columns.length - 12} more</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 400px 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
