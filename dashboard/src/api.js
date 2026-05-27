const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function fetchResults() {
  const res = await fetch(`${BASE}/api/results`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export async function fetchSummary() {
  const res = await fetch(`${BASE}/api/summary`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export async function fetchTokenCount() {
  const res = await fetch(`${BASE}/api/token-count`)
  if (!res.ok) return null
  return res.json()
}

export async function runQuery(accountId) {
  const res = await fetch(`${BASE}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_id: accountId, run_all_pipelines: true }),
  })
  if (!res.ok) throw new Error(`Query failed: ${res.status}`)
  return res.json()
}

export async function checkHealth() {
  try {
    const res = await fetch(`${BASE}/health`)
    return res.ok
  } catch {
    return false
  }
}
