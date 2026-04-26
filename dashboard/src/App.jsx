import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './components/Header.jsx'
import PipelineRace from './components/PipelineRace.jsx'
import ScoreBoard from './components/ScoreBoard.jsx'
import FraudRingGraph from './components/FraudRingGraph.jsx'
import HallucinationTest from './components/HallucinationTest.jsx'
import LiveQuery from './components/LiveQuery.jsx'
import GhostButton from './components/GhostButton.jsx'
import PulseLine from './components/PulseLine.jsx'
import { DEMO_DATA } from './data/demoData.js'

const TABS = [
  { key: 'race',          icon: '⚡', label: 'Pipeline Race' },
  { key: 'hallucination', icon: '🧪', label: 'Hallucination Test' },
  { key: 'scoreboard',    icon: '📊', label: 'Benchmark Results' },
  { key: 'graph',         icon: '🕸️', label: 'Fraud Ring Graph' },
  { key: 'live',          icon: '🔍', label: 'Live Query' },
]

export default function App() {
  const [data, setData]         = useState(null)
  const [tab, setTab]           = useState('race')
  const [loading, setLoading]   = useState(true)
  const [accountInput, setAccountInput] = useState('')
  const [racing, setRacing]     = useState(false)

  useEffect(() => {
    fetch('/api/results')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(() =>
        fetch('/results.json')
          .then(r => { if (!r.ok) throw new Error(); return r.json() })
          .then(d => { setData(d); setLoading(false) })
          .catch(() => { setData(DEMO_DATA); setLoading(false) })
      )
  }, [])

  if (loading) return <Loader />
  const { summary, records } = data

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Background />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Fixed header */}
        <Header summary={summary} />

        {/* Split-Pane Workbench */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '30% 70%',
          minHeight: 'calc(100vh - 69px)',
        }}
          className="workbench-grid"
        >
          {/* ── Control Panel (30%) ── */}
          <aside style={{
            borderRight: '1px solid var(--border)',
            padding: '24px 20px',
            position: 'sticky',
            top: 69,
            height: 'calc(100vh - 69px)',
            overflowY: 'auto',
            background: 'var(--bg)',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 20, fontFamily: 'var(--mono)' }}>
              Control Panel
            </div>

            {/* Account ID input */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--mono)', letterSpacing: 1, marginBottom: 6 }}>
                ACCOUNT ID
              </label>
              <input
                value={accountInput}
                onChange={e => setAccountInput(e.target.value)}
                placeholder="e.g. 8821"
                style={{
                  width: '100%', padding: '10px 14px',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text)',
                  fontSize: 13, outline: 'none', fontFamily: 'var(--mono)',
                  transition: 'border-color 150ms, box-shadow 150ms',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--red)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,77,77,0.1)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            {/* Log upload placeholder */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--mono)', letterSpacing: 1, marginBottom: 6 }}>
                LOG FILE
              </label>
              <div style={{
                padding: '14px', border: '1px dashed var(--border2)', borderRadius: 'var(--radius-sm)',
                textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer',
                transition: 'border-color 150ms',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border2)'}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>📂</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>Drop logs here</div>
              </div>
            </div>

            {/* Run Benchmark Ghost Button */}
            <GhostButton
              accent="var(--red)"
              fullWidth
              onClick={() => { setTab('race'); setRacing(true) }}
            >
              ▶ Run Benchmark
            </GhostButton>

            {/* Summary stats */}
            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: 'var(--mono)', marginBottom: 4 }}>
                Last Run
              </div>
              {[
                [`${summary.graphrag_accuracy_pct}%`, 'GraphRAG Accuracy', 'var(--green)'],
                [`${summary.avg_token_savings_pct}%`, 'Token Savings', 'var(--cyan)'],
                [`${summary.hallucination_cases?.length}`, 'Hallucinations Caught', 'var(--orange)'],
                [`${summary.avg_latency_improvement_pct}%`, 'Latency Speedup', 'var(--yellow)'],
              ].map(([v, l, c]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: c, fontFamily: 'var(--mono)' }}>{v}</span>
                </div>
              ))}
            </div>
          </aside>

          {/* ── Comparison Engine (70%) ── */}
          <main style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Tab bar — sticky within the comparison engine */}
            <div style={{
              display: 'flex', alignItems: 'center', padding: '0 28px',
              borderBottom: '1px solid var(--border)',
              background: 'rgba(11,14,20,0.95)', backdropFilter: 'blur(20px)',
              position: 'sticky', top: 69, zIndex: 50,
              overflowX: 'auto', whiteSpace: 'nowrap',
            }}>
              {TABS.map(({ key, icon, label }) => (
                <button key={key} onClick={() => setTab(key)} style={{
                  padding: '14px 20px', background: 'none', border: 'none',
                  color: tab === key ? 'var(--red2)' : 'var(--text-muted)',
                  cursor: 'pointer', fontSize: 13, fontWeight: tab === key ? 700 : 400,
                  fontFamily: 'var(--font)',
                  borderBottom: tab === key ? '2px solid var(--red)' : '2px solid transparent',
                  transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: 8,
                  marginBottom: -1, position: 'relative', flexShrink: 0,
                }}>
                  {tab === key && (
                    <motion.div layoutId="tab-glow" style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(255,77,77,0.06)',
                      borderRadius: '4px 4px 0 0',
                    }} />
                  )}
                  <span style={{ position: 'relative' }}>{icon}</span>
                  <span style={{ position: 'relative' }}>{label}</span>
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 4, flexShrink: 0 }}>
                <div className="pulse-dot" />
                <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, fontFamily: 'var(--mono)' }}>LIVE</span>
              </div>
            </div>

            {/* Tab content */}
            <div style={{ padding: '28px', flex: 1 }}>
              <AnimatePresence mode="wait">
                <motion.div key={tab}
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
                >
                  {tab === 'race'          && <PipelineRace records={records} summary={summary} onRacingChange={setRacing} />}
                  {tab === 'hallucination' && <HallucinationTest records={records} />}
                  {tab === 'scoreboard'    && <ScoreBoard summary={summary} records={records} />}
                  {tab === 'graph'         && <FraudRingGraph records={records} />}
                  {tab === 'live'          && <LiveQuery />}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .workbench-grid {
            grid-template-columns: 1fr !important;
          }
          .workbench-grid aside {
            position: static !important;
            height: auto !important;
            border-right: none !important;
            border-bottom: 1px solid var(--border) !important;
          }
        }
      `}</style>
    </div>
  )
}

function Background() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,77,77,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,77,77,0.015) 1px,transparent 1px)',
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%,black 40%,transparent 100%)',
      }} />
      <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,77,77,0.04) 0%,transparent 65%)' }} />
      <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,245,255,0.03) 0%,transparent 65%)' }} />
    </div>
  )
}

function Loader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 20, background: 'var(--bg)' }}>
      <Background />
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        style={{ width: 52, height: 52, borderRadius: 13, background: 'linear-gradient(135deg,#7f1d1d,var(--red),var(--orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: 'var(--shadow-red)' }}>🛡️</motion.div>
      <div style={{ color: 'var(--text-dim)', fontSize: 13, fontFamily: 'var(--mono)' }}>
        initializing FraudGraph<span className="cursor">_</span>
      </div>
      <div style={{ width: 220, height: 2, background: 'var(--surface2)', borderRadius: 1, overflow: 'hidden' }}>
        <motion.div initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
          style={{ height: '100%', width: '60%', background: 'linear-gradient(90deg,transparent,var(--red),transparent)', borderRadius: 1 }} />
      </div>
    </div>
  )
}
