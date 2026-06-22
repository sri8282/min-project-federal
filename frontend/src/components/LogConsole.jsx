import { useEffect, useRef } from 'react'

export default function LogConsole({ logs = [], id = 'log-console' }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [logs])

  const classify = (line) => {
    if (!line) return 'log-line-normal'
    const l = line.toLowerCase()
    if (l.includes('✅') || l.includes('success') || l.includes('✓') || l.includes('normal 🟢')) return 'log-line-success'
    if (l.includes('❌') || l.includes('error') || l.includes('failed')) return 'log-line-error'
    if (l.includes('⚠') || l.includes('warn') || l.includes('malicious') || l.includes('🔴')) return 'log-line-error'
    if (l.includes('round') || l.includes('===') || l.includes('fedavg') || l.includes('trustwt')) return 'log-line-info'
    return 'log-line-normal'
  }

  return (
    <div id={id} className="log-console" ref={ref}>
      {logs.length === 0 ? (
        <span style={{ color: '#475569', fontStyle: 'italic' }}>
          Waiting for simulation to start…
        </span>
      ) : (
        logs.map((line, i) => (
          <div key={i} className={classify(line)}>
            <span style={{ color: '#334155', marginRight: 8, userSelect: 'none' }}>
              {String(i + 1).padStart(3, '0')}
            </span>
            {line || '\u00a0'}
          </div>
        ))
      )}
    </div>
  )
}
