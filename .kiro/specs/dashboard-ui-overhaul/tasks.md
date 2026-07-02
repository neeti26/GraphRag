# Implementation Plan: Dashboard UI Overhaul

## Overview

Transform the FraudGraph React/Vite SPA from a neon-heavy aesthetic into the "Deep Space" design system, and add five hackathon-winning features: Dual-Pipeline Inference Race, Token Economics Scorecard, AI Factory Schema layer terminology, Evidence Trace sub-graph, and Explainable Pathing. All changes are purely presentational — no backend or data model changes.

## Tasks

- [x] 1. Update CSS design tokens to Deep Space palette
  - Replace all CSS custom properties in `index.css` with the Deep Space palette values per the token mapping table in the design
  - Update `.card` base styles: background to `#151921`, border to `1px solid #2D333B`, remove neon glow box-shadows
  - Retain `--shadow-red`, `--shadow-green`, `--shadow-cyan` only for interactive elements
  - Add CSS transition `border-color 150ms` to `.card` hover state
  - _Requirements: 1.1, 1.2, 1.5, 1.6, 2.1, 2.2, 2.3_

- [x] 2. Create new reusable components and hook
  - [x] 2.1 Create `fraudgraph/dashboard/src/components/GhostButton.jsx`
    - `motion.button` with transparent background, `1px solid {accent}` border, accent-colored label
    - On hover: background transitions to `{accent}26` (15% opacity), label to `#FFFFFF`, within 150ms
    - `whileTap={{ scale: 0.97 }}`
    - Accepts `children`, `accent`, `onClick`, `disabled`, `fullWidth` props
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 2.2 Write unit tests for GhostButton
    - Test renders with correct border color from `accent` prop
    - Test disabled state prevents click handler
    - _Requirements: 6.1, 6.3_

  - [x] 2.3 Create `fraudgraph/dashboard/src/hooks/useTypewriter.js`
    - Accepts `(text, active)` and returns `{ displayed, done }`
    - When `active` becomes true, reveals characters at 45–56ms per character using `setInterval` via `useRef`
    - When `active` becomes false mid-animation, immediately sets `displayed = text` and `done = true`
    - Empty string: returns `{ displayed: '', done: true }` immediately
    - Cleans up interval on unmount
    - _Requirements: 7.1, 7.3, 7.4_

  - [ ]* 2.4 Write property test for useTypewriter — Property 6: Typewriter completion
    - Install `fast-check` as a dev dependency: `npm install --save-dev fast-check vitest @vitest/ui` in `fraudgraph/dashboard/`
    - Create `fraudgraph/dashboard/src/__tests__/useTypewriter.test.js`
    - Use `fc.string({ minLength: 1 })` as generator; simulate ticks by advancing fake timers; assert `displayed === text` and `done === true` after sufficient ticks
    - **Property 6: Typewriter effect completes to full text**
    - **Validates: Requirements 7.1, 7.3**

  - [ ]* 2.5 Write property test for useTypewriter — Property 7: Typewriter cancellation
    - In the same test file, add a second `fc.assert` block
    - Generator: `fc.tuple(fc.string({ minLength: 2 }), fc.nat())` — string + random cancellation tick
    - Set `active = false` at the random tick; assert `displayed === text` immediately
    - **Property 7: Typewriter cancellation immediately yields full text**
    - **Validates: Requirements 7.4**

  - [x] 2.6 Create `fraudgraph/dashboard/src/components/PulseLine.jsx`
    - At rest (`active=false`): `width: 1px`, `background: #2D333B`, `height: 100%`
    - When `active=true`: overlay `motion.div` child with `height: 60px`, gradient `transparent → #00F5FF → transparent`, animating `top` from `-60px` to `100%`, `repeat: Infinity`, `duration: 1.2s`
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 2.7 Create `fraudgraph/dashboard/src/components/EvidenceString.jsx`
    - Parses a single evidence string and returns a `<span>` with inline color styling
    - Priority 1: contains `ALERT`, `BLACKLISTED`, `banned`, or `flagged` → entire string in `#FF4D4D`
    - Priority 2: contains `clean`, `SAFE`, or `isolated` → entire string in `#00F5FF`
    - Priority 3: tokenize on `:` or `=`; key in `#00F5FF`, value in `#F0F6FF`
    - Prefix with `> ` in `#444C56`; all text in `font-family: var(--mono)`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 2.8 Write property test for EvidenceString — Property 2: content preservation and prefix
    - Create `fraudgraph/dashboard/src/__tests__/EvidenceString.test.jsx`
    - Generator: `fc.string({ minLength: 1 })` filtered to exclude alert/safe tokens
    - Render with `@testing-library/react`; assert rendered text contains all non-whitespace tokens from input and output starts with `>`
    - **Property 2: EvidenceString preserves content and adds prefix**
    - **Validates: Requirements 9.1, 9.5**

  - [ ]* 2.9 Write property test for EvidenceString — Property 3: alert and safe token coloring
    - In the same test file, add a second `fc.assert` block
    - Generator: `fc.string()` with one of `['ALERT','BLACKLISTED','banned','flagged','clean','SAFE','isolated']` injected at a random position
    - Assert alert token present → rendered color `#FF4D4D`; safe token only → `#00F5FF`
    - **Property 3: EvidenceString alert and safe token coloring**
    - **Validates: Requirements 9.3, 9.4**

  - [ ]* 2.10 Write property test for EvidenceString — Property 4: key-value syntax highlighting
    - Generator: `fc.tuple(fc.string({ minLength: 1 }), fc.constantFrom(':', '='), fc.string({ minLength: 1 }))` (no alert/safe tokens)
    - Assert key portion color is `#00F5FF`; value portion color is `#F0F6FF`
    - **Property 4: EvidenceString key-value syntax highlighting**
    - **Validates: Requirements 9.2**

  - [x] 2.11 Create `fraudgraph/dashboard/src/components/RadialGauge.jsx`
    - Inline SVG arc from 135° to 405° (270° sweep) using `stroke-dasharray` / `stroke-dashoffset`
    - Track arc: `#2D333B`; value arc color: `>80` → `#00F5FF`, `50–80` → `#FFB800`, `<50` → `#FF4D4D`
    - Clamp `value` to [0, 100]; center text: numeric value (large) + label (small) in JetBrains Mono
    - Accepts `value`, `label`, `size` (default 160) props
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 2.12 Write property test for RadialGauge — Property 5: arc color matches value range
    - Create `fraudgraph/dashboard/src/__tests__/RadialGauge.test.jsx`
    - Generator: `fc.integer({ min: 0, max: 100 })`
    - Render component; query the SVG `<path>` with `data-testid="gauge-arc"` (add testid to RadialGauge); assert stroke color matches range rule
    - **Property 5: RadialGauge arc color matches value range**
    - **Validates: Requirements 10.4, 10.5, 10.6**

- [ ] 3. Checkpoint — Ensure all new components render without errors
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Update App.jsx with Split-Pane Workbench layout
  - Import and use `GhostButton` and `PulseLine`
  - Change main content area to `display: grid; grid-template-columns: 30% 70%`
  - Add `@media (max-width: 900px)` collapse to single column
  - Move tab bar inside the Comparison Engine column (still `position: sticky`)
  - Control Panel: account ID input, log upload placeholder, Run Benchmark `GhostButton` with `accent="var(--red)"`
  - Pass `racing` state to `PulseLine` as `active` prop between the two panes
  - Apply Deep Space token values to header and background elements
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 11.1, 11.2, 11.3_

- [x] 5. Update Header.jsx with Deep Space tokens
  - Replace hardcoded neon colors with Deep Space token variables
  - Apply `GhostButton` styling to any interactive header actions
  - _Requirements: 1.1, 1.2, 2.1_

- [-] 6. Update PipelineRace.jsx with GhostButton, Typewriter, and PulseLine
  - Replace the START RACE and RUN AGAIN buttons with `GhostButton` (accent `var(--red)`)
  - Replace the GSQL Trace button with `GhostButton` (accent `var(--purple)`)
  - Apply `useTypewriter` to the reasoning text in `PipelinePanel` result section — `active` when `isDone && result`
  - Show blinking `▋` cursor during typewriter animation; remove when `done`
  - Apply Deep Space token updates throughout
  - _Requirements: 6.1–6.4, 7.1–7.4, 1.1–1.6_

- [ ] 7. Update ScoreBoard.jsx with RadialGauge and Deep Space tokens
  - Replace the `RadialBarChart` accuracy display with `<RadialGauge value={summary.graphrag_accuracy_pct} label="GraphRAG" />`
  - Add a second `<RadialGauge value={summary.baseline_accuracy_pct} label="Baseline" />` alongside
  - Apply Deep Space token updates throughout
  - _Requirements: 10.1–10.6, 1.1–1.6_

- [ ] 8. Update HallucinationTest.jsx with EvidenceString and Deep Space tokens
  - Replace the inline evidence string rendering in the GraphRAG pane with `<EvidenceString text={e} />`
  - Apply Deep Space token updates throughout
  - _Requirements: 9.1–9.5, 1.1–1.6_

- [ ] 9. Update EvidenceModal.jsx with EvidenceString and Deep Space tokens
  - Replace the inline evidence signal rendering with `<EvidenceString text={e} />`
  - Apply Deep Space token updates throughout
  - _Requirements: 9.1–9.5, 1.1–1.6_

- [ ] 10. Update FraudRingGraph.jsx with Node-Expansion Animation
  - Add a module-level `let graphHasAnimated = false` flag (persists across tab switches without unmounting)
  - In the canvas draw loop, on first render (`!graphHasAnimated`): each node starts at `animScale = 0` and increments toward 1 over 300ms with 40ms stagger per node index; apply `animScale` to node radius and glyph rendering
  - Set `graphHasAnimated = true` after all nodes reach full scale
  - On subsequent renders: nodes render at full scale immediately
  - Apply Deep Space token updates to sidebar cards
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 11. Update LiveQuery.jsx and TokenTax.jsx with Deep Space tokens and GhostButton
  - Replace the SCAN button in `LiveQuery.jsx` with `GhostButton` (accent `var(--red)`)
  - Apply Deep Space token updates to both components
  - _Requirements: 6.1–6.4, 1.1–1.6_

- [ ] 12. Update GSQLTrace.jsx with Deep Space tokens and GhostButton
  - Replace the Replay Trace button with `GhostButton` (accent `var(--purple)`)
  - Apply Deep Space token updates throughout
  - _Requirements: 6.1–6.4, 1.1–1.6_

- [ ] 13. Checkpoint — Core UI overhaul complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Add AI Factory Schema layer labels to PipelineRace hero banner
  - In `PipelineRace.jsx`, add a four-chip row beneath the existing badge row in the hero card
  - Chips: `Graph Layer` (cyan), `Orchestration Layer` (purple), `LLM Layer` (red), `Evaluation Layer` (yellow)
  - Each chip is a small `<span>` with `font-family: var(--mono)`, `font-size: 9px`, `font-weight: 700`, `letter-spacing: 1.5`, `border-radius: 20px`, `padding: 3px 12px`
  - Add a tooltip or sub-label mapping each chip to its role: Graph Layer = TigerGraph GSQL, Orchestration Layer = GraphRAG pipeline, LLM Layer = OpenAI inference, Evaluation Layer = benchmark metrics
  - _Requirements: 3.6 (preserved functionality), hackathon criterion 3_

- [ ] 15. Upgrade PipelineRace.jsx with Dual-Pipeline Inference Race enhancements
  - [ ] 15.1 Add a "Compare" button that appears after the race completes
    - Render a `GhostButton` (accent `var(--cyan)`) labeled `⚡ Compare` next to the existing "RUN AGAIN" button
    - Clicking it scrolls the `ScoreboardRow` into view using `scrollIntoView({ behavior: 'smooth' })`
    - _Requirements: 3.1, hackathon criterion 1_

  - [ ] 15.2 Add a "struggling vs instant" progress bar to each PipelinePanel
    - In `PipelinePanel`, while `racing` is true, render a thin progress bar below the stage list
    - Baseline bar: animates slowly (fills over the full baseline duration ~2100ms) with color `var(--red)` and label `LLM struggling…`
    - GraphRAG bar: animates quickly (fills over the full graphrag duration ~880ms) with color `var(--cyan)` and label `Graph: instant`
    - Use `motion.div` with `animate={{ width: '100%' }}` and `transition={{ duration }}` keyed to `racing`
    - When `isDone`, bar shows full width with a `✓` checkmark
    - _Requirements: 4.1–4.3, hackathon criterion 1_

  - [ ] 15.3 Wire `onRacingChange` prop from App.jsx into PipelineRace
    - `PipelineRace` already receives `onRacingChange` prop from `App.jsx`
    - Call `onRacingChange(true)` when `runRace()` starts and `onRacingChange(false)` when the race completes
    - This drives the `PulseLine` `active` prop in `App.jsx`
    - _Requirements: 4.2, 4.3_

- [ ] 16. Build Token Economics Scorecard component
  - [ ] 16.1 Create `fraudgraph/dashboard/src/components/TokenEconomics.jsx`
    - A horizontal stats bar with three metrics displayed as large monospace figures:
      - `Context Reduction %` — computed as `((baseline_tokens - graphrag_tokens) / baseline_tokens * 100).toFixed(1)` averaged across all records
      - `Cost Savings USD` — computed as `(total_baseline_cost_usd - total_graphrag_cost_usd).toFixed(6)` from summary
      - `Hallucination Guard` — a label badge: `"Grounded in GSQL Truth"` (green, `#00F5FF`) when `graphrag_correct`, else `"Unverifiable Guess"` (red, `#FF4D4D`)
    - Props: `{ summary, records, graphragCorrect: boolean }`
    - Layout: `display: flex; gap: 24px; padding: 16px 24px` inside a `.card` with `borderTop: '2px solid var(--cyan)'`
    - Each metric: label in `var(--text-muted)` 9px mono uppercase, value in 24px bold mono with accent color
    - _Requirements: 1.3, 1.4, hackathon criterion 2_

  - [ ] 16.2 Wire TokenEconomics into PipelineRace result section
    - After the `ScoreboardRow` `AnimatePresence` block in `PipelineRace.jsx`, add `<TokenEconomics summary={summary} records={records} graphragCorrect={result?.graphrag?.correct} />`
    - Only render when `done && result`
    - _Requirements: hackathon criterion 2_

  - [ ]* 16.3 Write property test for TokenEconomics — Property 1: verdict-to-color mapping
    - Create `fraudgraph/dashboard/src/__tests__/TokenEconomics.test.jsx`
    - Generator: `fc.constantFrom('SAFE', 'SUSPICIOUS', 'FRAUD')`
    - Assert SAFE → `#00F5FF` label text; SUSPICIOUS/FRAUD → `#FF4D4D` label text
    - **Property 1: Verdict-to-color mapping is total and correct**
    - **Validates: Requirements 1.3, 1.4**

- [ ] 17. Build Evidence Trace sub-graph component
  - [ ] 17.1 Create `fraudgraph/dashboard/src/components/EvidenceTrace.jsx`
    - A compact SVG sub-graph showing only the 3–4 nodes that proved fraud: `Account A → DeviceID_Z ← Account B`
    - Props: `{ accountId, sharedDevice, bannedAccount, blacklistedIp }`
    - SVG layout: three nodes in a row — `Account #{accountId}` (cyan circle) → `Device {sharedDevice}` (purple diamond) ← `Account #{bannedAccount}` (red circle)
    - Optionally a fourth node below the device: `IP {blacklistedIp}` (red hexagon) connected with a dashed line
    - Each node: circle/shape with `r=22`, label below in 10px JetBrains Mono, status badge (`target`, `shared`, `banned`, `blacklisted`)
    - Edges: `stroke: var(--border2)`, `strokeWidth: 1.5`, animated `stroke-dashoffset` draw-in on mount using CSS `@keyframes draw-line` (already defined in `index.css`)
    - Node colors: target account `#00F5FF`, shared device `#bf5af2`, banned account `#FF4D4D`, blacklisted IP `#FF4D4D`
    - _Requirements: 9.1–9.5, hackathon criterion 4_

  - [ ] 17.2 Wire EvidenceTrace into EvidenceModal.jsx
    - In `EvidenceModal.jsx`, replace the existing 3-hop path `<div>` section with `<EvidenceTrace accountId={accountId} sharedDevice={sharedDevices?.[0]} bannedAccount={flagged?.[0]} blacklistedIp={blacklisted?.[0]} />`
    - Keep the existing hop-step labels below as a text legend
    - _Requirements: hackathon criterion 4_

  - [ ] 17.3 Wire EvidenceTrace into HallucinationTest.jsx
    - In `HallucinationTest.jsx`, replace the `<HopPath>` component with `<EvidenceTrace>` using the same props
    - _Requirements: hackathon criterion 4_

- [ ] 18. Add Explainable Pathing to PipelinePanel reasoning display
  - In `PipelinePanel` (inside `PipelineRace.jsx`), update the reasoning text display for the GraphRAG panel
  - After the typewriter animation completes (`done === true`), if `result.fraud_path` is non-null, append a highlighted path block below the reasoning text:
    - A `<div>` with `background: rgba(191,90,242,0.06)`, `border: 1px solid rgba(191,90,242,0.25)`, `borderRadius: 8`, `padding: 10px 12px`, `marginTop: 8`
    - Label: `⬡ Graph traversal path` in `var(--purple)` 9px mono
    - Path text: `result.fraud_path` rendered in `var(--cyan)` 11px mono with `whiteSpace: pre-wrap`
    - Sub-label: `"LLM reasoning explicitly references this graph path — zero hallucination"` in `var(--text-muted)` 10px
  - This ensures the LLM reasoning text explicitly references the graph traversal path
  - _Requirements: 7.1–7.4, hackathon criterion 5_

- [ ] 19. Add AI Factory layer badges to Control Panel in App.jsx
  - In the Control Panel `<aside>` in `App.jsx`, add a "System Architecture" section below the summary stats
  - Render four stacked rows, each with a colored left-border accent and label:
    - `Graph Layer` — `var(--cyan)` — "TigerGraph GSQL 3-hop BFS"
    - `Orchestration Layer` — `var(--purple)` — "GraphRAG Pipeline"
    - `LLM Layer` — `var(--red)` — "OpenAI GPT-4o"
    - `Evaluation Layer` — `var(--yellow)` — "Benchmark Metrics"
  - Each row: `padding: 8px 12px`, `borderLeft: 3px solid {color}`, `background: {color}08`, `borderRadius: '0 8px 8px 0'`, `fontSize: 10px`, label in `var(--text-muted)`, value in `{color}` mono
  - _Requirements: 3.4, hackathon criterion 3_

- [ ] 20. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 21. Add ENTITY_LINK edge to schema and seed data
  - Add `CREATE UNDIRECTED EDGE ENTITY_LINK (FROM Account, TO Account, shared_identifiers LIST<STRING>, confidence_score FLOAT)` to `fraudgraph/graph_layer/schema.gsql`
  - Add `ENTITY_LINK` to the `CREATE GRAPH FraudGraph(...)` vertex/edge list in `schema.gsql`
  - Update `fraudgraph/graph_layer/seed_data.py` to include at least 2 demo ENTITY_LINK edges between accounts that share both an IP and a Device ID (e.g., Account #8821 and Account #1002 share device XYZ-999 and IP 192.168.1.1)
  - _Requirements: 13.1, 13.2_

- [ ] 22. Add entity_resolution, neighborhood_summary, and ip_transaction_volume GSQL queries
  - Append the `entity_resolution` query to `fraudgraph/graph_layer/queries.gsql` (finds Account pairs sharing same IP AND Device ID, creates ENTITY_LINK edges)
  - Append the `neighborhood_summary` query to `fraudgraph/graph_layer/queries.gsql` (3-hop BFS aggregating cluster_size, chargeback_count, chargeback_rate, time_window_hours, returns natural-language summary string)
  - Append the `ip_transaction_volume` query to `fraudgraph/graph_layer/queries.gsql` (accepts ip_address STRING, returns total_login_count, unique_accounts, chargeback_rate)
  - _Requirements: 13.1, 14.1, 14.2, 15.1_

- [ ] 23. Add TigerGraphClient methods for new queries
  - Add `entity_resolution(self) -> list` method to `fraudgraph/graph_layer/tigergraph_client.py`
  - Add `neighborhood_summary(self, account_id: str) -> dict` method
  - Add `ip_transaction_volume(self, ip_address: str) -> dict` method
  - Each method should call the corresponding installed GSQL query via pyTigerGraph and return the parsed result dict; include a demo/mock fallback for when TigerGraph is unavailable (consistent with existing client pattern)
  - _Requirements: 14.1, 14.2, 15.1_

- [ ] 24. Update GraphRAGPipeline with neighborhood_summary and agentic loop
  - Add `neighborhood_summary: str = ""`, `agentic_loop_triggered: bool = False`, `agentic_refinement: str = ""` fields to the `GraphRAGResult` dataclass in `fraudgraph/inference_layer/graphrag_pipeline.py`
  - In `GraphRAGPipeline.run()`, call `self.tg.neighborhood_summary(account_id)` after the multi-hop traversal and store the result in `neighborhood_summary`
  - Inject the `neighborhood_summary` string as the first fragment of the graph context section in the LLM prompt (before the raw evidence list)
  - After the initial verdict: if `verdict == "SUSPICIOUS"` and `5.0 <= risk_score <= 8.0` and `blacklisted` is non-empty, call `self.tg.ip_transaction_volume(blacklisted[0])`, build a second prompt with original evidence + initial verdict + IP volume data, call LLM again, set `agentic_loop_triggered = True` and `agentic_refinement = refined_content`
  - Update `demo_mode.py` to include `neighborhood_summary`, `agentic_loop_triggered`, `agentic_refinement` in the demo result records
  - _Requirements: 14.3, 14.4, 15.2, 15.3, 15.4, 15.5_

- [ ] 25. Update demoData.js with new fields
  - Add `neighborhood_summary`, `agentic_loop_triggered`, `agentic_refinement`, `entity_link` fields to the demo records in `fraudgraph/dashboard/src/data/demoData.js`
  - For at least 2 records: set `agentic_loop_triggered: true` with a realistic `agentic_refinement` string
  - For at least 1 record: set `entity_link: { account_a, account_b, shared_identifiers, confidence_score }` to demonstrate the SAME ENTITY badge
  - For all records: set `neighborhood_summary` to a realistic natural-language string
  - _Requirements: 13.3, 14.5, 15.6, 15.7_

- [ ] 26. Build TigerGraphMetrics.jsx component and wire into ScoreBoard
  - Create `fraudgraph/dashboard/src/components/TigerGraphMetrics.jsx`
    - Props: `{ summary, records }`
    - Compute Inference Yield, Path Fidelity, Context Window Load, Multi-Hop Depth client-side
    - 2×2 grid layout; each metric card uses large JetBrains Mono number + target annotation
    - Color rules per Requirements 16.6–16.11
  - In `ScoreBoard.jsx`, import and render `<TigerGraphMetrics summary={summary} records={records} />` as a new card below the existing accuracy gauges
  - _Requirements: 16.1–16.11_

- [ ] 27. Build NeighborhoodSummaryCallout, AgentLoopBadge, and SAME ENTITY badge
  - Create `NeighborhoodSummaryCallout` as an inline component in `fraudgraph/dashboard/src/components/HallucinationTest.jsx` (or a shared file)
    - Props: `{ summary: string | null }`
    - Renders callout div with `rgba(0,245,255,0.06)` background, `1px solid rgba(0,245,255,0.25)` border when summary is non-null/non-empty; renders null otherwise
    - Wire into `HallucinationTest.jsx` above the graph evidence list
    - Wire into `EvidenceModal.jsx` above the evidence signals list
  - In `PipelineRace.jsx` `PipelinePanel`, add `AgentLoopBadge`:
    - When `record.agentic_loop_triggered === true`: render `AGENT LOOP` badge in cyan next to verdict label
    - Render "Initial Analysis" block (useTypewriter), horizontal divider, "Refined Analysis" block (useTypewriter, starts after first completes)
    - When `agentic_loop_triggered === false`: standard single reasoning block
  - In `EvidenceTrace.jsx`, add SAME ENTITY badge:
    - When `entity_link` prop is provided for a node: render `SAME ENTITY` badge in Warning Amber (`#FFB800`) adjacent to that node
    - When `entity_link` is null: no badge
  - _Requirements: 13.3, 13.4, 13.5, 14.5, 14.6, 15.6, 15.7, 15.8_

- [ ] 28. Final integration checkpoint — Power Moves complete
  - Verify all four Power Move features render correctly with demoData.js fallback
  - Verify TigerGraphMetrics card appears in ScoreBoard tab with all four metrics
  - Verify NeighborhoodSummaryCallout appears in HallucinationTest and EvidenceModal
  - Verify AGENT LOOP badge and dual-reasoning display appear for records with `agentic_loop_triggered: true`
  - Verify SAME ENTITY badge appears in EvidenceTrace for records with `entity_link`
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 13–16_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests use **fast-check** — install with `npm install --save-dev fast-check vitest @vitest/ui` in `fraudgraph/dashboard/`
- Property tests validate universal correctness properties defined in the design document
- The design uses JavaScript/JSX (React) — no TypeScript compilation needed
- Hackathon criteria 1–5 are addressed by tasks 14–19
- Tasks 21–28 cover the four Rank 1 Power Moves (Requirements 13–16)
- Backend tasks (21–24) modify Python files in `fraudgraph/graph_layer/` and `fraudgraph/inference_layer/`
- Frontend tasks (25–27) modify React components and `demoData.js`
