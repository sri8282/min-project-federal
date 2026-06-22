import { useEffect, useRef, useState } from 'react'

function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    const num = parseFloat(target)
    if (isNaN(num)) { setVal(target); return }
    const start = performance.now()
    const animate = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setVal(eased * num)
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return val
}

export default function StatCard({ icon: Icon, label, value, color = '#6366f1', suffix = '', prefix = '' }) {
  const animated = useCountUp(typeof value === 'number' ? value : 0)
  const isNum = typeof value === 'number'
  const isFloat = isNum && !Number.isInteger(value)

  return (
    <div className="stat-card fade-up">
      <div className="stat-icon" style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
        {Icon && <Icon size={22} color={color} strokeWidth={1.8} />}
      </div>
      <div className="stat-value gradient-text" style={{ background: `linear-gradient(135deg, ${color}, #8b5cf6)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        {prefix}
        {isNum ? (isFloat ? animated.toFixed(2) : Math.round(animated)) : value}
        {suffix}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
