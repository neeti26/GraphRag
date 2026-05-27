const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Try live API first, fall back to bundled static results.json
// This makes the Vercel deployment fully self-contained
async function fetchWithFallback(apiPath, staticPath) {
  try {
    const res = await fetch(`${BASE}${apiPath}`, { signal: AbortSignal.timeout(3000) })
    if (res.ok) return res.json()
  } catch {
    // API not reachable — use static file (Vercel deployment)
  }
  const res = await fetch(staticPath)
  if (!res.ok) throw new Error(`Could not load ${staticPath}`)
  return res.json()
}

export async function fetchResults() {
  return fetchWithFallback('/api/results', '/results.json')
}

export async function fetchSummary() {
  const data = await fetchResults()
  return data.summary || {}
}

export async function fetchTokenCount() {
  try {
    const res = await fetch(`${BASE}/api/token-count`, { signal: AbortSignal.timeout(3000) })
    if (res.ok) return res.json()
  } catch {}
  try {
    const res = await fetch('/token_count_report.json')
    if (res.ok) return res.json()
  } catch {}
  return null
}

export async function runQuery(accountId) {
  const res = await fetch(`${BASE}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_id: accountId, run_all_pipelines: true }),
  })
  if (!res.ok) throw new Error(`API not available. Run python api_server.py locally to use Live Query.`)
  return res.json()
}

export async function checkHealth() {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}
