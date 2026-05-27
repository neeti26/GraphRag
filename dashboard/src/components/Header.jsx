import React from 'react'

export default function Header() {
  return (
    <header style={{
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      padding: '0 20px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ maxWidth:1400, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:60 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:28 }}>🐯</span>
          <div>
            <div style={{ fontWeight:700, fontSize:16, color:'var(--text-primary)', letterSpacing:'-0.3px' }}>
              FraudGraph
              <span style={{ marginLeft:8, fontSize:11, background:'var(--accent-tiger)', color:'white', padding:'2px 8px', borderRadius:20, fontWeight:600 }}>
                ROUND 2
              </span>
            </div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>TigerGraph GraphRAG Inference Hackathon · 100M Tokens</div>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--accent-green)' }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--accent-green)', display:'inline-block' }} className="pulse" />
            LIVE
          </div>
          <a
            href="https://github.com/neeti26/GraphRag"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
            style={{ padding:'6px 14px', fontSize:12 }}
          >
            GitHub ↗
          </a>
        </div>
      </div>
    </header>
  )
}
