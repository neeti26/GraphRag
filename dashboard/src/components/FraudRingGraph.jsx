import React, { useState } from 'react'
import GSQLViewer from './GSQLViewer.jsx'

const NODE_COLORS = {
  banned:    '#ef4444',
  flagged:   '#f59e0b',
  active:    '#3b82f6',
  safe:      '#10b981',
  device:    '#8b5cf6',
  ip:        '#06b6d4',
  blacklist: '#ef4444',
}

function buildGraphFromRecord(record) {
  const nodes = []
  const edges = []
  const seen = new Set()

  const addNode = (id, type, label, extra = {}) => {
    if (seen.has(id)) return
    seen.add(id)
    nodes.push({ id, type, label, ...extra })
  }

  // Target account
  const isTarget = record.graphrag_verdict === 'SUSPICIOUS'
  addNode(record.account_id, isTarget ? 'flagged' : 'safe', record.account_id, { isTarget: true })

  // Flagged connections
  ;(record.flagged_connections || []).forEach(acc => {
    addNode(acc, 'banned', acc)
    edges.push({ from: record.account_id, to: acc, label: 'CONNECTED' })
  })

  // Shared devices
  ;(record.shared_devices || []).forEach(dev => {
    addNode(dev, 'device', dev)
    edges.push({ from: record.account_id, to: dev, label: 'USED_DEVICE' })
    ;(record.flagged_connections || []).forEach(acc => {
      edges.push({ from: acc, to: dev, label: 'USED_DEVICE' })
    })
  })

  // Blacklisted IPs
  ;(record.blacklisted_ips || []).forEach(ip => {
    addNode(ip, 'blacklist', ip)
    edges.push({ from: record.account_id, to: ip, label: 'LOGGED_FROM_IP' })
  })

  return { nodes, edges }
}

function SVGGraph({ nodes, edges }) {
  if (nodes.length === 0) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
      No graph connections to display for this account.
    </div>
  )

  const W = 600, H = 340
  const cx = W / 2, cy = H / 2
  const r = Math.min(cx, cy) - 70

  // Position nodes in a circle, target in center
  const nonTarget = nodes.filter(n => !n.isTarget)
  const target = nodes.find(n => n.isTarget)

  const positions = {}
  if (target) positions[target.id] = { x: cx, y: cy }
  nonTarget.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / nonTarget.length - Math.PI / 2
    positions[n.id] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  })

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxHeight: 340 }}>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="var(--border-bright)" />
        </marker>
      </defs>

      {/* Edges */}
      {edges.map((e, i) => {
        const from = positions[e.from]
        const to   = positions[e.to]
        if (!from || !to) return null
        const mx = (from.x + to.x) / 2
        const my = (from.y + to.y) / 2
        return (
          <g key={i}>
            <line
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke="var(--border-bright)" strokeWidth={1.5}
              strokeDasharray={e.label === 'LOGGED_FROM_IP' ? '4 3' : 'none'}
              markerEnd="url(#arrow)"
            />
            <text x={mx} y={my - 4} textAnchor="middle" fontSize={9} fill="var(--text-muted)">{e.label}</text>
          </g>
        )
      })}

      {/* Nodes */}
      {nodes.map(n => {
        const pos = positions[n.id]
        if (!pos) return null
        const color = NODE_COLORS[n.type] || '#888'
        const radius = n.isTarget ? 28 : 20
        return (
          <g key={n.id}>
            <circle cx={pos.x} cy={pos.y} r={radius} fill={`${color}22`} stroke={color} strokeWidth={n.isTarget ? 2.5 : 1.5} />
            {n.isTarget && <circle cx={pos.x} cy={pos.y} r={radius + 5} fill="none" stroke={color} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />}
            <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={n.isTarget ? 9 : 8} fill={color} fontWeight={n.isTarget ? 700 : 500}>
              {n.label.length > 10 ? n.label.slice(0, 10) + '…' : n.label}
            </text>
            {n.type === 'banned' && (
              <text x={pos.x} y={pos.y - radius - 6} textAnchor="middle" fontSize={10} fill="var(--accent-red)">⛔</text>
            )}
            {n.type === 'blacklist' && (
              <text x={pos.x} y={pos.y - radius - 6} textAnchor="middle" fontSize={10} fill="var(--accent-red)">🚫</text>
            )}
            {n.isTarget && (
              <text x={pos.x} y={pos.y - radius - 6} textAnchor="middle" fontSize={10} fill={color}>🎯</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default function FraudRingGraph({ records }) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const record = records[selectedIdx] || records[0]

  if (!record) return <div style={{ color: 'var(--text-muted)' }}>No records loaded.</div>

  const { nodes, edges } = buildGraphFromRecord(record)

  const legend = [
    { color: NODE_COLORS.banned,    label: 'Banned Account' },
    { color: NODE_COLORS.flagged,   label: 'Flagged / Target' },
    { color: NODE_COLORS.safe,      label: 'Safe Account' },
    { color: NODE_COLORS.device,    label: 'Shared Device' },
    { color: NODE_COLORS.blacklist, label: 'Blacklisted IP' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Account selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {records.map((r, i) => (
          <button
            key={i}
            className={`btn ${selectedIdx === i ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 14px', fontSize: 12 }}
            onClick={() => setSelectedIdx(i)}
          >
            {r.account_id}
            {r.graphrag_verdict === 'SUSPICIOUS' && <span style={{ marginLeft: 4 }}>⚠️</span>}
          </button>
        ))}
      </div>

      <div className="grid-2">
        {/* Graph */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>
            Evidence Sub-Graph — {record.account_id}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>
            TigerGraph 3-hop traversal · {nodes.length} nodes · {edges.length} edges
          </div>
          <SVGGraph nodes={nodes} edges={edges} />
          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {legend.map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Evidence list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ borderColor: record.graphrag_verdict === 'SUSPICIOUS' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)' }}>
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 13 }}>Verdict</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: record.graphrag_verdict === 'SUSPICIOUS' ? 'var(--accent-red)' : 'var(--accent-green)' }}>
              {record.graphrag_verdict}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: record.graphrag_risk_score > 7 ? 'var(--accent-red)' : 'var(--accent-green)', marginTop: 4 }}>
              Risk: {record.graphrag_risk_score}/10
            </div>
            {record.neighborhood_summary && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.6 }}>
                {record.neighborhood_summary}
              </div>
            )}
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 13 }}>Graph Evidence ({(record.graph_evidence || []).length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {(record.graph_evidence || []).length === 0
                ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No suspicious connections found.</div>
                : (record.graph_evidence || []).map((e, i) => (
                  <div key={i} style={{ fontSize: 12, color: e.startsWith('ALERT') ? 'var(--accent-red)' : 'var(--text-secondary)', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                    {e.startsWith('ALERT') ? '🚨' : '•'} {e}
                  </div>
                ))
              }
            </div>
          </div>

          {record.agentic_loop_triggered && (
            <div className="card" style={{ borderColor: 'rgba(249,115,22,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span className="badge badge-orange">🔄 AGENTIC LOOP</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{record.agentic_refinement}</div>
            </div>
          )}
        </div>
      </div>

      {/* GSQL Viewer */}
      <GSQLViewer record={record} />
    </div>
  )
}
