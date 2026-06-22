import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const weight = payload[0]?.value
  return (
    <div style={{
      background: '#0d1627', border: '1px solid rgba(139,92,246,0.3)',
      borderRadius: 10, padding: '10px 14px', fontSize: 13,
    }}>
      <p style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#8b5cf6', fontWeight: 700 }}>
        Weight: {(weight * 100).toFixed(2)}%
      </p>
    </div>
  )
}

const COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e','#ec4899','#a78bfa']

export default function ContributionChart({ weights = {}, clientTypes = {} }) {
  const data = Object.entries(weights).map(([cid, w]) => ({
    client: cid.replace('client_', 'C'),
    weight: parseFloat(w),
    type: clientTypes[cid] || 'normal',
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.08)" />
        <XAxis dataKey="client" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <YAxis
          stroke="#475569"
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          tickFormatter={v => `${(v * 100).toFixed(0)}%`}
          domain={[0, 1]}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="weight" radius={[6, 6, 0, 0]} animationDuration={1000}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.type === 'malicious' ? '#f43f5e' : COLORS[index % COLORS.length]}
              fillOpacity={entry.weight < 0.001 ? 0.2 : 0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
