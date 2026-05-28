import React, { useState, useEffect, useRef } from 'react'
import GSQLViewer from './GSQLViewer.jsx'

const STAGES = {
  baseline: [
    { label: '📄 Reading raw logs (50 entries)', layer: 'DATA',   ms: 120 },
    { label: '✍️  Building prompt (~3,800 tokens)', layer: 'ORCH',  ms: 80  },
    { label: '🤖 LLM inference',                   layer: 'LLM',   ms: 1800 },
  ],
  basic_rag: [
    { label: '🔍 Embedding query',                 layer: 'EMBED', ms: 200 },
    { label: '📦 Vector search (top-5 chunks)',    layer: 'RAG',   ms: 300 },
    { label: '✍️  Building prompt (~2,100 tokens)', layer: 'ORCH',  ms: 80  },
    { label: '🤖 LLM inference',                   layer: 'LLM',   ms: 1400 },
  ],
  graphrag: [
    { label: '⬡ TigerGraph 3-hop GSQL traversal', layer: 'GRAPH', ms: 180 },
    { label: '🔍 Evidence extraction',             layer: 'ORCH',  ms: 60  },
    { label: '✍️  Building prompt (~250 tokens)',   layer: 'ORCH',  ms: 40  },
    { label: '🧠 LLM inference',                   layer: 'LLM',   ms: 600 },
  ],
}

const LAYER_COLORS = {
  DATA:  'var(--accent-purple)',
  EMBED: 'var(--accent-purple)',
  RAG:   'var(--accent-cyan)',
  GRAPH: 'var(--accent-tiger)',
  ORCH:  'var(--accent-blue)',
  LLM:   'var(--accent-green)',
}

function PipelineColumn({ title, color, stages, running, done, verdict, tokens, latency, riskScore, evidence }) {
  const [currentStage, setCurrentStage] = useState(-1)
  const [completedStages, setCompletedStages] = useState([])
  const timerRef = useRef(null)

  useEffect(() => {
    if (!running) { setCurrentStage(-1); setCompletedStages([]); return }
    let idx = 0
    const run = () => {
      if (idx >= stages.length) return
      setCurrentStage(idx)
      timerRef.current = setTimeout(() => {
        setCompletedStages(prev => [...prev, idx])
        idx++
        run()
      }, stages[idx].ms)
    }
    run()
    return () => clearTimeout(timerRef.current)
  }, [running])

  const verdictColor = verdict === 'SUSPICIOUS' ? 'var(--accent-red)' : verdict === 'SAFE' ? 'var(--accent-green)' : 'var(--text-muted)'

  return (
    <div className="card" style={{ flex: 1, minWidth: 0, borderColor: done ? `${color}55` : 'var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 8px ${color}` }} />
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{title}</span>
        {done && verdict && (
          <span className="badge" style={{ marginLeft: 'auto', background: verdict === 'SUSPICIOUS' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: verdictColor, border: `1px solid ${verdictColor}44` }}>
            {verdict}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 140 }}>
        {stages.map((s, i) => {
          const isActive    = currentStage === i
          const isCompleted = completedStages.includes(i)
          const isPending   = !isActive && !isCompleted
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: isPending && running ? 0.35 : 1, transition: 'opacity 0.3s' }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: isCompleted ? 'var(--accent-green)' : isActive ? color : 'var(--border)',
                boxShadow: isActive ? `0 0 6px ${color}` : 'none',
              }} className={isActive ? 'pulse' : ''} />
              <span style={{ fontSize: 12, color: isCompleted ? 'var(--text-primary)' : isActive ? 'var(--text-primary)' : 'var(--text-muted)', flex: 1 }}>{s.label}</span>
              <span className="badge" style={{ fontSize: 10, padding: '1px 6px', background: `${LAYER_COLORS[s.layer]}22`, color: LAYER_COLORS[s.layer], border: `1px solid ${LAYER_COLORS[s.layer]}44` }}>
                {s.layer}
              </span>
              {isCompleted && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.ms}ms</span>}
            </div>
          )
        })}
      </div>

      {done && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color }}>{tokens}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>tokens</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{latency}ms</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>latency</div>
            </div>
            {riskScore !== undefined && (
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: riskScore > 7 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{riskScore}/10</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>risk score</div>
              </div>
            )}
          </div>
          {evidence && evidence.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Graph Evidence</div>
              {evidence.slice(0, 3).map((e, i) => (
                <div key={i} style={{ fontSize: 11, color: 'var(--accent-orange)', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>• {e}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {!running && !done && (
        <div style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
          Press START RACE to begin
        </div>
      )}
    </div>
  )
}

export default function PipelineRace({ records, summary }) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [racing, setRacing]   = useState(false)
  const [done, setDone]       = useState(false)

  const record = records[selectedIdx] || records[0]

  const totalRaceMs = Math.max(
    STAGES.baseline.reduce((a, s) => a + s.ms, 0),
    STAGES.basic_rag.reduce((a, s) => a + s.ms, 0),
    STAGES.graphrag.reduce((a, s) => a + s.ms, 0),
  )

  function startRace() {
    setDone(false)
    setRacing(false)
    setTimeout(() => {
      setRacing(true)
      setTimeout(() => { setRacing(false); setDone(true) }, totalRaceMs + 200)
    }, 50)
  }

  if (!record) return <div style={{ color: 'var(--text-muted)' }}>No records loaded.</div>

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {records.map((r, i) => (
            <button
              key={i}
              className={`btn ${selectedIdx === i ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px 14px', fontSize: 12 }}
              onClick={() => { setSelectedIdx(i); setDone(false); setRacing(false) }}
            >
              {r.account_id}
              {r.ground_truth === 'SUSPICIOUS' && <span style={{ marginLeft: 4, color: 'var(--accent-red)' }}>⚠️</span>}
            </button>
          ))}
        </div>
        <button className="btn btn-tiger" onClick={startRace} style={{ marginLeft: 'auto' }}>
          {racing ? '⏳ Racing...' : '▶ START RACE'}
        </button>
      </div>

      {/* Account info */}
      <div style={{ marginBottom: 16, padding: '10px 16px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
        <span style={{ color: 'var(--text-muted)' }}>Target: </span>
        <span style={{ fontWeight: 700 }}>{record.account_id}</span>
        <span style={{ margin: '0 12px', color: 'var(--border)' }}>|</span>
        <span style={{ color: 'var(--text-muted)' }}>Ground Truth: </span>
        <span style={{ fontWeight: 700, color: record.ground_truth === 'SUSPICIOUS' ? 'var(--accent-red)' : 'var(--accent-green)' }}>
          {record.ground_truth}
        </span>
        {record.ground_truth === 'SUSPICIOUS' && !record.baseline_correct && (
          <span className="badge badge-red" style={{ marginLeft: 12 }}>⚠️ Hallucination Case</span>
        )}
      </div>

      {/* Three pipeline columns */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <PipelineColumn
          title="Pipeline 1 — Baseline LLM"
          color="var(--accent-red)"
          stages={STAGES.baseline}
          running={racing}
          done={done}
          verdict={record.baseline_verdict}
          tokens={record.baseline_tokens}
          latency={Math.round(record.baseline_latency_ms)}
        />
        <PipelineColumn
          title="Pipeline 2 — Basic RAG"
          color="var(--accent-blue)"
          stages={STAGES.basic_rag}
          running={racing}
          done={done}
          verdict={record.basic_rag_verdict}
          tokens={record.basic_rag_tokens}
          latency={Math.round(record.basic_rag_latency_ms)}
        />
        <PipelineColumn
          title="Pipeline 3 — GraphRAG"
          color="var(--accent-green)"
          stages={STAGES.graphrag}
          running={racing}
          done={done}
          verdict={record.graphrag_verdict}
          tokens={record.graphrag_tokens}
          latency={Math.round(record.graphrag_latency_ms)}
          riskScore={record.graphrag_risk_score}
          evidence={record.graph_evidence}
        />
      </div>

      {/* Post-race summary */}
      {done && (
        <div className="card slide-in" style={{ marginTop: 20, borderColor: 'var(--accent-green)44' }}>
          <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--accent-green)' }}>🏆 Race Complete</div>
          <div className="grid-3">
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Token Savings vs Basic RAG</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-green)' }}>{record.token_savings_vs_basic_rag_pct}%</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Latency Improvement</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-cyan)' }}>{record.latency_improvement_pct}%</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Agentic Loop</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: record.agentic_loop_triggered ? 'var(--accent-orange)' : 'var(--text-muted)' }}>
                {record.agentic_loop_triggered ? '✅ Triggered' : 'Not needed'}
              </div>
            </div>
          </div>

          {/* Multi-hop badge */}
          {record.graphrag_verdict === 'SUSPICIOUS' && (record.flagged_connections?.length > 0 || record.blacklisted_ips?.length > 0) && (
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(249,115,22,0.15)', color: 'var(--accent-tiger)', border: '1px solid rgba(249,115,22,0.3)', fontSize: 12, fontWeight: 700 }}>
                ✓ Resolved {record.hops_traversed || 3}-Hop Multi-Document Relationship
              </span>
              <span style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 12, fontWeight: 700 }}>
                {record.nodes_visited} nodes traversed
              </span>
              <span style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 11 }}>
                ✗ Vector RAG cannot traverse this chain
              </span>
            </div>
          )}

          {record.agentic_loop_triggered && record.agentic_refinement && (
            <div style={{ marginTop: 12, padding: 12, background: 'rgba(249,115,22,0.08)', borderRadius: 8, border: '1px solid rgba(249,115,22,0.2)', fontSize: 12, color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--accent-tiger)', fontWeight: 600 }}>🔄 Agentic Refinement: </span>
              {record.agentic_refinement}
            </div>
          )}

          {/* GSQL Viewer — collapsible traversal logic with live params */}
          <GSQLViewer record={record} />
        </div>
      )}
    </div>
  )
}