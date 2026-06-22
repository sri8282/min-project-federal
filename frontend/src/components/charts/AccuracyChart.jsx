import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0d1627', border: '1px solid rgba(99,102,241,0.3)',
      borderRadius: 10, padding: '10px 14px', fontSize: 13,
    }}>
      <p style={{ color: '#94a3b8', marginBottom: 6 }}>Round {label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, margin: '2px 0', fontWeight: 600 }}>
          {p.name}: {(p.value * 100).toFixed(2)}%
        </p>
      ))}
    </div>
  )
}

export default function AccuracyChart({ fedavgData = [], trustData = [] }) {
  const data = fedavgData.map((v, i) => ({
    round: i + 1,
    'FedAvg': v,
    'Trust-Weighted': trustData[i] ?? null,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
        <XAxis
          dataKey="round"
          stroke="#475569"
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          label={{ value: 'Round', position: 'insideBottom', offset: -4, fill: '#64748b', fontSize: 12 }}
        />
        <YAxis
          stroke="#475569"
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          tickFormatter={v => `${(v * 100).toFixed(0)}%`}
          domain={[0, 1]}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 13 }}>{v}</span>}
        />
        <Line
          type="monotone"
          dataKey="FedAvg"
          stroke="#6366f1"
          strokeWidth={2.5}
          dot={{ fill: '#6366f1', r: 4 }}
          activeDot={{ r: 6, fill: '#818cf8' }}
          animationDuration={1200}
        />
        <Line
          type="monotone"
          dataKey="Trust-Weighted"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={{ fill: '#10b981', r: 4 }}
          activeDot={{ r: 6, fill: '#34d399' }}
          animationDuration={1200}
          strokeDasharray="0"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
