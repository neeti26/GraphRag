export default function EvidenceTrace({ accountId, sharedDevice, bannedAccount, blacklistedIp, entity_link }) {
  const device = sharedDevice || 'XYZ-999'
  const banned = bannedAccount || '1002'

  return (
    <div style={{ position: 'relative' }}>
      {/* SAME ENTITY badge */}
      {entity_link && (
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <span style={{
            display: 'inline-block',
            padding: '3px 12px',
            borderRadius: 10,
            fontSize: 10,
            fontWeight: 800,
            background: 'rgba(255,184,0,0.15)',
            color: '#FFB800',
            border: '1px solid rgba(255,184,0,0.4)',
            fontFamily: 'var(--mono)',
            letterSpacing: 1.5,
          }}>
            ⚡ SAME ENTITY
          </span>
        </div>
      )}

      <svg width={500} height={blacklistedIp ? 160 : 120} style={{ display: 'block', maxWidth: '100%' }}>
        {/* Edges */}
        {/* Account A → Device */}
        <line x1={80} y1={80} x2={228} y2={80} stroke="#444C56" strokeWidth={1.5} />
        {/* Device → Account B */}
        <line x1={272} y1={80} x2={420} y2={80} stroke="#444C56" strokeWidth={1.5} />
        {/* IP dashed line to Device */}
        {blacklistedIp && (
          <line x1={250} y1={80} x2={250} y2={124} stroke="#444C56" strokeWidth={1.5} strokeDasharray="4 3" />
        )}

        {/* Node 1: Account A — cyan circle */}
        <circle cx={80} cy={80} r={22} fill="rgba(0,245,255,0.12)" stroke="#00F5FF" strokeWidth={2} />
        <text x={80} y={112} textAnchor="middle" fill="#00F5FF" fontSize={10} fontFamily="JetBrains Mono, monospace">
          Account #{accountId}
        </text>
        <text x={80} y={124} textAnchor="middle" fill="#00F5FF" fontSize={9} fontFamily="JetBrains Mono, monospace" opacity={0.7}>
          target
        </text>

        {/* Node 2: Device — purple diamond (rotated rect) */}
        <rect x={250} y={80} width={30} height={30} rx={3}
          transform="rotate(45 250 80)"
          fill="rgba(191,90,242,0.12)" stroke="#BF5AF2" strokeWidth={2} />
        <text x={250} y={112} textAnchor="middle" fill="#BF5AF2" fontSize={10} fontFamily="JetBrains Mono, monospace">
          Device {device}
        </text>
        <text x={250} y={124} textAnchor="middle" fill="#BF5AF2" fontSize={9} fontFamily="JetBrains Mono, monospace" opacity={0.7}>
          shared
        </text>

        {/* Node 3: Account B — red circle */}
        <circle cx={420} cy={80} r={22} fill="rgba(255,77,77,0.12)" stroke="#FF4D4D" strokeWidth={2} />
        <text x={420} y={112} textAnchor="middle" fill="#FF4D4D" fontSize={10} fontFamily="JetBrains Mono, monospace">
          Account #{banned}
        </text>
        <text x={420} y={124} textAnchor="middle" fill="#FF4D4D" fontSize={9} fontFamily="JetBrains Mono, monospace" opacity={0.7}>
          banned
        </text>

        {/* Node 4: IP — red small circle (optional) */}
        {blacklistedIp && (
          <>
            <circle cx={250} cy={140} r={16} fill="rgba(255,77,77,0.12)" stroke="#FF4D4D" strokeWidth={1.5} strokeDasharray="4 3" />
            <text x={250} y={162} textAnchor="middle" fill="#FF4D4D" fontSize={10} fontFamily="JetBrains Mono, monospace">
              IP {blacklistedIp}
            </text>
            <text x={250} y={174} textAnchor="middle" fill="#FF4D4D" fontSize={9} fontFamily="JetBrains Mono, monospace" opacity={0.7}>
              blacklisted
            </text>
          </>
        )}
      </svg>
    </div>
  )
}
