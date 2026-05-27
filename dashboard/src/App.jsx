import React, { useState, useEffect } from 'react'
import Header from './components/Header.jsx'
import HeroMetrics from './components/HeroMetrics.jsx'
import TabView from './components/TabView.jsx'
import PipelineRace from './components/PipelineRace.jsx'
import BenchmarkTable from './components/BenchmarkTable.jsx'
import AccuracyPanel from './components/AccuracyPanel.jsx'
import TokenEconomics from './components/TokenEconomics.jsx'
import FraudRingGraph from './components/FraudRingGraph.jsx'
import LiveQuery from './components/LiveQuery.jsx'
import DatasetBadge from './components/DatasetBadge.jsx'
import { fetchResults } from './api.js'

const TABS = [
  { id: 'race',      label: '⚡ Pipeline Race' },
  { id: 'accuracy',  label: '🎯 Accuracy' },
  { id: 'tokens',    label: '📉 Token Economics' },
  { id: 'benchmark', label: '📊 Benchmark Table' },
  { id: 'graph',     label: '🕸️ Fraud Ring Graph' },
  { id: 'live',      label: '🔍 Live Query' },
]

export default function App() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [activeTab, setActiveTab] = useState('race')

  useEffect(() => {
    fetchResults()
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:16 }}>
      <div style={{ fontSize:48 }}>🐯</div>
      <div style={{ color:'var(--text-secondary)', fontSize:16 }}>Loading FraudGraph...</div>
      <div className="pulse" style={{ width:200, height:4, background:'var(--accent-blue)', borderRadius:2 }} />
    </div>
  )

  if (error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:48 }}>⚠️</div>
      <div style={{ color:'var(--accent-red)', fontSize:16 }}>Could not load results</div>
      <div style={{ color:'var(--text-muted)', fontSize:13 }}>{error}</div>
      <div style={{ color:'var(--text-secondary)', fontSize:12, marginTop:8 }}>
        Run: <code style={{ background:'var(--bg-card)', padding:'2px 8px', borderRadius:4 }}>python demo_mode.py</code> then refresh
      </div>
    </div>
  )

  const summary = data?.summary || {}
  const records = data?.records || []

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)' }}>
      <Header />

      <main style={{ maxWidth:1400, margin:'0 auto', padding:'24px 20px' }}>
        <DatasetBadge summary={summary} />
        <HeroMetrics summary={summary} />

        <div style={{ marginTop:24 }}>
          <TabView tabs={TABS} active={activeTab} onChange={setActiveTab} />
        </div>

        <div style={{ marginTop:20 }} className="slide-in" key={activeTab}>
          {activeTab === 'race'      && <PipelineRace records={records} summary={summary} />}
          {activeTab === 'accuracy'  && <AccuracyPanel summary={summary} records={records} />}
          {activeTab === 'tokens'    && <TokenEconomics summary={summary} records={records} />}
          {activeTab === 'benchmark' && <BenchmarkTable records={records} />}
          {activeTab === 'graph'     && <FraudRingGraph records={records} />}
          {activeTab === 'live'      && <LiveQuery />}
        </div>
      </main>

      <footer style={{ textAlign:'center', padding:'32px 20px', color:'var(--text-muted)', fontSize:12, borderTop:'1px solid var(--border)', marginTop:40 }}>
        FraudGraph Round 2 · TigerGraph GraphRAG Hackathon 2026 · Built by Neeti Malu &amp; Sanket Patil
        <span style={{ margin:'0 8px' }}>·</span>
        <a href="https://github.com/neeti26/GraphRag" target="_blank" rel="noreferrer" style={{ color:'var(--accent-blue)', textDecoration:'none' }}>GitHub</a>
        <span style={{ margin:'0 8px' }}>·</span>
        <span style={{ color:'var(--accent-tiger)' }}>#GraphRAGInferenceHackathon</span>
      </footer>
    </div>
  )
}
