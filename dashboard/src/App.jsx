import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './components/Header.jsx'
import PipelineRace from './components/PipelineRace.jsx'
import ScoreBoard from './components/ScoreBoard.jsx'
import FraudRingGraph from './components/FraudRingGraph.jsx'
import HallucinationTest from './components/HallucinationTest.jsx'
import LiveQuery from './components/LiveQuery.jsx'
import { DEMO_DATA } from './data/demoData.js'

const TABS = [
  { key: 'race',          icon: '⚡', label: 'Pipeline Race' },
  { key: 'hallucination', icon: '🧪', label: 'Hallucination Test' },
  { key: 'scoreboard',    icon: '📊', label: 'Benchmark Results' },
  { key: 'graph',         icon: '🕸️', label: 'Fraud Ring Graph' },
  { key: 'live',          icon: '🔍', label: 'Live Query' },
]

export default function App() {
  const [data, setData]     = useState(null)
  const [tab, setTab]       = useState('race')
  const [loading, setLoading] = useState(true)

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
        <Header summary={summary} />

        {/* Tab bar */}
        <div style={{
          display: 'flex', alignItems: 'center', padding: '0 36px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(2,9,18,0.92)', backdropFilter: 'blur(20px)',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          {TABS.map(({ key, icon, label }) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '14px 22px', background: 'none', border: 'none',
              color: tab === key ? 'var(--red2)' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: 13, fontWeight: tab === key ? 700 : 400,
              fontFamily: 'var(--font)',
              borderBottom: tab === key ? '2px solid var(--red)' : '2px solid transparent',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: -1, position: 'relative',
            }}>
              {tab === key && (
                <motion.div layoutId="tab-glow" style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(255,59,92,0.06)',
                  borderRadius: '4px 4px 0 0',
                }} />
              )}
              <span style={{ position: 'relative' }}>{icon}</span>
              <span style={{ position: 'relative' }}>{label}</span>
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 4 }}>
            <div className="pulse-dot" />
            <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, fontFamily: 'var(--mono)' }}>LIVE</span>
          </div>
        </div>

        <div style={{ padding: '28px 36px', maxWidth: 1500, margin: '0 auto' }}>
          <AnimatePresence mode="wait">
            <motion.div key={tab}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
            >
              {tab === 'race'          && <PipelineRace records={records} summary={summary} />}
              {tab === 'hallucination' && <HallucinationTest records={records} />}
              {tab === 'scoreboard'    && <ScoreBoard summary={summary} records={records} />}
              {tab === 'graph'         && <FraudRingGraph records={records} />}
              {tab === 'live'          && <LiveQuery />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function Background() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,59,92,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,59,92,0.022) 1px,transparent 1px)',
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%,black 40%,transparent 100%)',
      }} />
      <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,59,92,0.05) 0%,transparent 65%)' }} />
      <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,230,118,0.04) 0%,transparent 65%)' }} />
      <div style={{ position: 'absolute', top: '40%', left: '50%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,180,216,0.025) 0%,transparent 65%)', transform: 'translate(-50%,-50%)' }} />
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
