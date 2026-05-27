import React from 'react'

export default function DatasetBadge({ summary }) {
  const tokenStr = summary?.dataset_tokens
    ? (summary.dataset_tokens.includes('270') ? '270M tokens (Gemini count_tokens API)' : summary.dataset_tokens)
    : '270M tokens'
  const tokenizer = summary?.tokenizer || 'gemini-2.0-flash count_tokens API'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 16px',
      background: 'rgba(249,115,22,0.08)',
      border: '1px solid rgba(249,115,22,0.25)',
      borderRadius: 10,
      marginBottom: 20,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize:18 }}>🐯</span>
      <div style={{ flex:1 }}>
        <span style={{ color:'var(--accent-tiger)', fontWeight:700, fontSize:13 }}>Round 2 — Production Scale</span>
        <span style={{ color:'var(--text-secondary)', fontSize:12, marginLeft:12 }}>{tokenStr}</span>
        <span style={{ color:'var(--text-muted)', fontSize:11, marginLeft:12 }}>Tokenizer: {tokenizer}</span>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <span className="badge badge-orange">100M Tokens</span>
        <span className="badge badge-green">3 Pipelines</span>
        <span className="badge badge-blue">LLM-Judge + BERTScore</span>
      </div>
    </div>
  )
}
