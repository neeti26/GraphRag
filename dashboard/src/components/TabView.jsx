import React from 'react'

export default function TabView({ tabs, active, onChange }) {
  return (
    <div className="tab-bar" style={{ overflowX: 'auto' }}>
      {tabs.map(t => (
        <button
          key={t.id}
          className={`tab${active === t.id ? ' active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
