import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0d1627', border: '1px solid rgba(244,63,94,0.3)',
      borderRadius: 10, padding: '10px 14px', fontSize: 13,
    }}>
      <p style={{ color: '#94a3b8', marginBottom: 6 }}>Round {label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, margin: '2px 0', fontWeight: 600 }}>
          {p.name}: {p.value?.toFixed(4)}
        </p>
      ))}
    </div>
  )
}

export default function LossChart({ fedavgLoss = [], trustLoss = [] }) {
  const data = fedavgLoss.map((v, i) => ({
    round: i + 1,
    'FedAvg': v,
    'Trust-Weighted': trustLoss[i] ?? null,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,63,94,0.08)" />
        <XAxis
          dataKey="round"
          stroke="#475569"
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          label={{ value: 'Round', position: 'insideBottom', offset: -4, fill: '#64748b', fontSize: 12 }}
        />
        <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 13 }}>{v}</span>} />
        <Line
          type="monotone" dataKey="FedAvg"
          stroke="#f43f5e" strokeWidth={2.5}
          dot={{ fill: '#f43f5e', r: 4 }}
          activeDot={{ r: 6 }}
          animationDuration={1200}
        />
        <Line
          type="monotone" dataKey="Trust-Weighted"
          stroke="#f59e0b" strokeWidth={2.5}
          dot={{ fill: '#f59e0b', r: 4 }}
          activeDot={{ r: 6 }}
          animationDuration={1200}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
