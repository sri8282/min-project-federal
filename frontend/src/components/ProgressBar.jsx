export default function ProgressBar({ value = 0, label = '', showLabel = true }) {
  const pct = Math.min(Math.max(value, 0), 100)

  return (
    <div style={{ width: '100%' }}>
      {showLabel && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)',
        }}>
          <span>{label}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-primary)' }}>
            {pct.toFixed(0)}%
          </span>
        </div>
      )}
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
