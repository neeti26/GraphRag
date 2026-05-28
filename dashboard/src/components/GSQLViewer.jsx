import React, { useState, useEffect } from 'react'

// Generate the exact GSQL query with live parameters injected
function buildGSQLQuery(accountId, maxHops = 3) {
  return `// ─────────────────────────────────────────────────────────────
//  TigerGraph GSQL — multi_hop_fraud_context
//  Generated: ${new Date().toISOString()}
//  Parameters injected from entity extraction
// ─────────────────────────────────────────────────────────────

CREATE QUERY multi_hop_fraud_context(
  STRING target_account = "${accountId}",
  INT    max_hops       = ${maxHops}
) FOR GRAPH FraudGraph {

  SetAccum<VERTEX>  @@visited;
  ListAccum<STRING> @@evidence;
  SetAccum<STRING>  @@flagged_accounts;
  SetAccum<STRING>  @@blacklisted_ips;
  SetAccum<STRING>  @@shared_devices;

  // ── Seed: target account ──────────────────────────────────
  seed = {Account.*};
  seed = SELECT a FROM seed:a
         WHERE a.id == "${accountId}";

  // ── Hop 1: direct device connections ─────────────────────
  hop1_devices = SELECT d FROM seed:a -(USED_DEVICE)-> DeviceID:d
    ACCUM @@visited += d,
          @@evidence += "Account ${accountId} used Device " + d.device_id;

  // ── Hop 1: direct IP connections ─────────────────────────
  hop1_ips = SELECT ip FROM seed:a -(LOGGED_FROM_IP)-> IPAddress:ip
    ACCUM @@visited += ip,
          IF ip.is_blacklisted THEN
            @@evidence += "ALERT: Account ${accountId} logged from " +
                          "BLACKLISTED IP " + ip.ip +
                          " (" + ip.blacklist_reason + ")",
            @@blacklisted_ips += ip.ip
          END;

  // ── Hop 2: accounts sharing same device ──────────────────
  hop2_accounts = SELECT a2
    FROM hop1_devices:d -(USED_DEVICE)- Account:a2
    WHERE a2.id != "${accountId}"
    ACCUM @@visited += a2,
          @@evidence += "Device " + d.device_id +
                        " is ALSO used by Account " + a2.id,
          IF a2.status == "flagged" OR a2.status == "banned" THEN
            @@evidence += "ALERT: Account " + a2.id +
                          " is " + a2.status +
                          " (risk_score=" + (STRING)a2.risk_score + ")",
            @@flagged_accounts += a2.id
          END,
          @@shared_devices += d.device_id;

  // ── Hop 2b: accounts sharing same IP ─────────────────────
  hop2_ip_accounts = SELECT a3
    FROM hop1_ips:ip -(LOGGED_FROM_IP)- Account:a3
    WHERE a3.id != "${accountId}"
    ACCUM @@visited += a3,
          @@evidence += "IP " + ip.ip +
                        " is ALSO used by Account " + a3.id,
          IF a3.status == "flagged" OR a3.status == "banned" THEN
            @@evidence += "ALERT: Account " + a3.id +
                          " sharing IP is " + a3.status,
            @@flagged_accounts += a3.id
          END;

  // ── Hop 3: connections of flagged accounts ────────────────
  all_hop2 = hop2_accounts UNION hop2_ip_accounts;
  hop3_devices = SELECT d2
    FROM all_hop2:a -(USED_DEVICE)-> DeviceID:d2
    WHERE d2 NOT IN @@visited
    LIMIT 20
    ACCUM @@visited += d2,
          @@evidence += "Hop-3: Account " + a.id +
                        " also used Device " + d2.device_id;

  PRINT @@evidence          AS evidence;
  PRINT @@flagged_accounts  AS flagged_accounts;
  PRINT @@blacklisted_ips   AS blacklisted_ips;
  PRINT @@shared_devices    AS shared_devices;
  PRINT @@visited.size()    AS total_nodes_traversed;
}`
}

function buildRESTCall(accountId, maxHops = 3) {
  return `# TigerGraph REST++ API Call
# Endpoint: POST /restpp/query/{graph_name}/multi_hop_fraud_context

curl -X POST \\
  "https://your-instance.i.tgcloud.io/restpp/query/FraudGraph/multi_hop_fraud_context" \\
  -H "Authorization: Bearer \${TG_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "target_account": "${accountId}",
    "max_hops": ${maxHops}
  }'`
}

function buildPythonCall(accountId, maxHops = 3) {
  return `# pyTigerGraph Python Driver Call
import pyTigerGraph as tg

conn = tg.TigerGraphConnection(
    host="https://your-instance.i.tgcloud.io",
    graphname="FraudGraph",
    apiToken=TG_TOKEN
)

# Execute installed query with injected parameters
result = conn.runInstalledQuery(
    "multi_hop_fraud_context",
    params={
        "target_account": "${accountId}",
        "max_hops": ${maxHops}
    }
)

# Result structure
evidence       = result[0]["evidence"]          # List[str]
flagged        = result[0]["flagged_accounts"]  # List[str]
blacklisted    = result[0]["blacklisted_ips"]   # List[str]
shared_devices = result[0]["shared_devices"]    # List[str]
nodes_visited  = result[0]["total_nodes_traversed"]  # int

print(f"Traversed {nodes_visited} nodes in 3 hops")
print(f"Found {len(flagged)} flagged accounts")
print(f"Found {len(blacklisted)} blacklisted IPs")`
}

const TABS = ['GSQL', 'REST API', 'Python']

export default function GSQLViewer({ record, accountId: propAccountId, autoExpand = false }) {
  const [open, setOpen]         = useState(autoExpand)
  const [activeTab, setActiveTab] = useState('GSQL')
  const [animating, setAnimating] = useState(false)
  const [displayedId, setDisplayedId] = useState('')

  const accountId = propAccountId || record?.account_id || 'FR0000A00'
  const maxHops   = record?.hops_traversed || 3
  const nodes     = record?.nodes_visited || 0
  const flagged   = record?.flagged_connections || []
  const blacklisted = record?.blacklisted_ips || []

  // Animate the account ID being "injected" character by character
  useEffect(() => {
    if (!open) return
    setAnimating(true)
    setDisplayedId('')
    let i = 0
    const interval = setInterval(() => {
      setDisplayedId(accountId.slice(0, i + 1))
      i++
      if (i >= accountId.length) {
        clearInterval(interval)
        setAnimating(false)
      }
    }, 40)
    return () => clearInterval(interval)
  }, [open, accountId])

  const code = activeTab === 'GSQL'
    ? buildGSQLQuery(animating ? displayedId : accountId, maxHops)
    : activeTab === 'REST API'
    ? buildRESTCall(accountId, maxHops)
    : buildPythonCall(accountId, maxHops)

  // Syntax highlight: keywords, strings, comments, params
  function highlight(text) {
    return text.split('\n').map((line, i) => {
      let color = 'var(--text-secondary)'
      let bg = 'transparent'

      if (line.trim().startsWith('//') || line.trim().startsWith('#')) {
        color = 'var(--text-muted)'
      } else if (line.includes(`"${accountId}"`)) {
        bg = 'rgba(249,115,22,0.08)'
        color = 'var(--text-primary)'
      } else if (/\b(SELECT|FROM|WHERE|ACCUM|IF|THEN|END|PRINT|CREATE|QUERY|FOR|GRAPH|LIMIT|UNION|NOT|IN|AND|OR)\b/.test(line)) {
        color = 'var(--accent-blue)'
      } else if (line.includes('@@') || line.includes('@')) {
        color = 'var(--accent-cyan)'
      } else if (line.includes('BLACKLISTED') || line.includes('flagged') || line.includes('banned')) {
        color = 'var(--accent-red)'
      } else if (line.includes('ALERT')) {
        color = 'var(--accent-orange)'
      }

      return (
        <div key={i} style={{
          background: bg,
          color,
          padding: bg !== 'transparent' ? '0 4px' : '0',
          borderRadius: bg !== 'transparent' ? 3 : 0,
          borderLeft: bg !== 'transparent' ? '2px solid var(--accent-tiger)' : 'none',
          paddingLeft: bg !== 'transparent' ? 8 : 0,
        }}>
          {line || '\u00A0'}
        </div>
      )
    })
  }

  return (
    <div style={{ marginTop: 12 }}>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: open ? '8px 8px 0 0' : 8,
          padding: '8px 14px',
          cursor: 'pointer',
          color: 'var(--accent-tiger)',
          fontSize: 12, fontWeight: 600,
          width: '100%',
          transition: 'all 0.2s',
        }}
      >
        <span style={{ fontSize: 14 }}>⬡</span>
        <span>View Generated Traversal Logic</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
          {open ? '▲ collapse' : '▼ expand'}
        </span>
        {/* Live params badge */}
        <span style={{
          padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
          background: 'rgba(249,115,22,0.15)', color: 'var(--accent-tiger)',
          border: '1px solid rgba(249,115,22,0.3)',
        }}>
          target_account="{accountId}" max_hops={maxHops}
        </span>
      </button>

      {open && (
        <div style={{
          border: '1px solid var(--border)',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          background: 'var(--bg-secondary)',
          overflow: 'hidden',
        }}>
          {/* Tab bar */}
          <div style={{
            display: 'flex', gap: 0,
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-primary)',
          }}>
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 16px', border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600,
                  background: activeTab === tab ? 'var(--bg-secondary)' : 'transparent',
                  color: activeTab === tab ? 'var(--accent-tiger)' : 'var(--text-muted)',
                  borderBottom: activeTab === tab ? '2px solid var(--accent-tiger)' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {tab === 'GSQL' ? '⬡ GSQL' : tab === 'REST API' ? '🌐 REST API' : '🐍 Python'}
              </button>
            ))}

            {/* Live injection indicator */}
            <div style={{
              marginLeft: 'auto', padding: '8px 14px',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 10, color: 'var(--accent-green)',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--accent-green)',
                display: 'inline-block',
                animation: animating ? 'pulse 0.5s infinite' : 'none',
              }} />
              {animating ? 'Injecting parameters...' : 'Parameters injected'}
            </div>
          </div>

          {/* Execution stats */}
          {nodes > 0 && (
            <div style={{
              display: 'flex', gap: 16, padding: '8px 16px',
              background: 'rgba(249,115,22,0.04)',
              borderBottom: '1px solid var(--border)',
              flexWrap: 'wrap',
            }}>
              {[
                { label: 'Nodes traversed', value: nodes, color: 'var(--accent-blue)' },
                { label: 'Hops executed', value: maxHops, color: 'var(--accent-tiger)' },
                { label: 'Flagged found', value: flagged.length, color: flagged.length > 0 ? 'var(--accent-red)' : 'var(--text-muted)' },
                { label: 'Blacklisted IPs', value: blacklisted.length, color: blacklisted.length > 0 ? 'var(--accent-red)' : 'var(--text-muted)' },
              ].map(stat => (
                <div key={stat.label} style={{ fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{stat.label}: </span>
                  <span style={{ color: stat.color, fontWeight: 700 }}>{stat.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Code block */}
          <div style={{
            padding: '14px 16px',
            fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
            fontSize: 11,
            lineHeight: 1.7,
            maxHeight: 420,
            overflowY: 'auto',
            overflowX: 'auto',
            whiteSpace: 'pre',
          }}>
            {highlight(code)}
          </div>

          {/* Copy button */}
          <div style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--border)',
            display: 'flex', justifyContent: 'flex-end', gap: 8,
          }}>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11, padding: '4px 12px' }}
              onClick={() => navigator.clipboard?.writeText(code)}
            >
              📋 Copy
            </button>
            <a
              href="https://github.com/neeti26/GraphRag/blob/round2/graph_layer/queries.gsql"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
              style={{ fontSize: 11, padding: '4px 12px', textDecoration: 'none' }}
            >
              📂 View Full GSQL ↗
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
