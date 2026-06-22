import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, ReferenceLine
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const score = payload[0]?.value
  const isAnomaly = score < 0.3
  return (
    <div style={{
      background: '#0d1627', border: `1px solid ${isAnomaly ? 'rgba(244,63,94,0.4)' : 'rgba(99,102,241,0.3)'}`,
      borderRadius: 10, padding: '10px 14px', fontSize: 13,
    }}>
      <p style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</p>
      <p style={{ color: isAnomaly ? '#f43f5e' : '#10b981', fontWeight: 700 }}>
        Trust: {score?.toFixed(4)}
      </p>
      {isAnomaly && <p style={{ color: '#f43f5e', fontSize: 11 }}>⚠ ANOMALY DETECTED</p>}
    </div>
  )
}

export default function TrustScoreChart({ trustScores = {}, clientTypes = {}, anomalyFlags = {} }) {
  const data = Object.entries(trustScores).map(([cid, score]) => ({
    client: cid.replace('client_', 'C'),
    score: parseFloat(score),
    type: clientTypes[cid] || 'normal',
    anomaly: anomalyFlags[cid] || false,
  }))

  const getColor = (entry) => {
    if (entry.type === 'malicious' || entry.anomaly) return '#f43f5e'
    return '#10b981'
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
        <XAxis dataKey="client" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <YAxis domain={[0, 1]} stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine
          y={0.3} stroke="#f59e0b"
          strokeDasharray="4 4"
          label={{ value: 'Anomaly Threshold', position: 'insideTopRight', fill: '#f59e0b', fontSize: 11 }}
        />
        <Bar dataKey="score" radius={[6, 6, 0, 0]} animationDuration={1000}>
          {data.map((entry, index) => (
            <Cell key={index} fill={getColor(entry)} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
