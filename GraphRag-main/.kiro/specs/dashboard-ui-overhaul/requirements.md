# Requirements Document

## Introduction

This feature is a professional UI/UX overhaul of the FraudGraph dashboard — a React/Vite single-page application that benchmarks a Baseline LLM pipeline against a GraphRAG pipeline for fraud detection. The overhaul replaces the current neon-heavy aesthetic with a refined "Deep Space" design system, restructures the layout into a Split-Pane Workbench, upgrades typography to monospace-first data presentation, and introduces purposeful animations (typewriter effect for LLM reasoning, node-expansion for the graph). All existing functionality (Pipeline Race, Hallucination Test, Benchmark Results, Fraud Ring Graph, Live Query) is preserved.

Four additional "Rank 1 Power Moves" are added for the TigerGraph hackathon: a Synthetic Identity Extraction Layer that resolves fragmented account nodes into unified entities via shared-identifier edges; a Multi-Hop Neighborhood Summary that compresses 3-hop graph context into a single natural-language callout for the LLM prompt; an Agentic Feedback Loop that triggers a second targeted TigerGraph query when the initial verdict is uncertain and refines the LLM output; and a TigerGraph Benchmark Metrics card that surfaces four quantitative performance indicators (Inference Yield, Path Fidelity, Context Window Load, Multi-Hop Depth) in the ScoreBoard tab.

---

## Glossary

- **Dashboard**: The FraudGraph React/Vite single-page application located at `fraudgraph/dashboard/src/`.
- **Deep Space Palette**: The refined color system — background `#0B0E14`, card surface `#151921`, accent Electric Cyan `#00F5FF` for safe verdicts, Warning Amber `#FFB800` or Crimson `#FF4D4D` for fraud verdicts.
- **Split-Pane Workbench**: The primary layout — a locked header, a 30% left Control Panel column, and a 70% right Comparison Engine column.
- **Control Panel**: The left column containing account/log input and the Run Benchmark action.
- **Comparison Engine**: The right column split vertically into Baseline and GraphRAG result panes.
- **Pulse Line**: The animated vertical separator between the Baseline and GraphRAG panes.
- **Ghost Button**: A button with outline-only styling that fills with color on hover.
- **Typewriter Effect**: A character-by-character reveal animation applied to LLM reasoning text.
- **Node-Expansion Animation**: A staggered scale-in animation applied to graph nodes on first render.
- **Radial Gauge**: A circular progress indicator replacing pie charts for single-metric display.
- **JSON Syntax Highlighting**: Color-coded rendering of graph evidence strings to resemble code output.
- **Surface**: A card or panel background layer elevated above the page background.
- **Border_System**: The 1px solid border scheme using `#2D333B` with subtle hover state transitions.
- **Entity_Resolution**: The process of identifying that two or more Account vertices represent the same real-world fraudster by detecting shared identifiers (IP address and Device ID).
- **ENTITY_LINK**: An undirected edge between two Account vertices created by the `entity_resolution` GSQL query when those accounts share 2 or more identifiers. Attributes: `shared_identifiers` (LIST<STRING>), `confidence_score` (FLOAT).
- **Neighborhood_Summary**: A natural-language string produced by the `neighborhood_summary` GSQL query that describes the cluster context of a target account within 3 hops (e.g., cluster size, chargeback rate).
- **GraphRAGResult**: The Python dataclass returned by `GraphRAGPipeline.run()`, located in `fraudgraph/inference_layer/graphrag_pipeline.py`.
- **Agentic_Loop**: A second inference pass triggered when the initial GraphRAG verdict is SUSPICIOUS with a `risk_score` between 5.0 and 8.0 (inclusive). It queries `ip_transaction_volume` for the linked IP and feeds the result back to the LLM for a refined verdict.
- **IP_Transaction_Volume**: The GSQL query `ip_transaction_volume(ip_address)` that returns `total_login_count`, `unique_accounts`, and `chargeback_rate` for a given IP address.
- **Inference_Yield**: A composite benchmark metric computed as `(graphrag_accuracy_pct / baseline_accuracy_pct) * (baseline_tokens / graphrag_tokens)`. Target value: > 10.0×.
- **Path_Fidelity**: The percentage of GraphRAG verdicts in the benchmark dataset where `fraud_path` is non-null. Target value: 100%.
- **Context_Window_Load**: The average `graphrag_tokens` across all benchmark records. Target value: < 1,000 tokens.
- **Multi_Hop_Depth**: The fixed BFS traversal depth used by the `neighborhood_summary` query. Value: 3 hops.
- **TigerGraph_Metrics_Card**: A dedicated card within the ScoreBoard tab that displays the four benchmark metrics: Inference Yield, Path Fidelity, Context Window Load, and Multi-Hop Depth.

---

## Requirements

### Requirement 1: Deep Space Color Palette

**User Story:** As a developer demoing FraudGraph, I want the dashboard to use a refined "Deep Space" color palette, so that the UI looks professional and credible rather than neon-heavy.

#### Acceptance Criteria

1. THE Dashboard SHALL use `#0B0E14` as the root page background color.
2. THE Dashboard SHALL use `#151921` as the default card and surface background color.
3. WHEN a verdict is SAFE, THE Dashboard SHALL render the associated accent color as Electric Cyan (`#00F5FF`).
4. WHEN a verdict is SUSPICIOUS or FRAUD, THE Dashboard SHALL render the associated accent color as Crimson (`#FF4D4D`) or Warning Amber (`#FFB800`).
5. THE Dashboard SHALL apply color exclusively to data points, labels, and interactive states — not to card borders or panel backgrounds.
6. THE Dashboard SHALL replace all existing neon glow box-shadows on non-interactive surfaces with no shadow or a maximum `0 1px 3px rgba(0,0,0,0.4)` shadow.

---

### Requirement 2: Border System

**User Story:** As a developer demoing FraudGraph, I want all card and panel borders to use a clean, subtle style, so that the UI feels polished rather than garish.

#### Acceptance Criteria

1. THE Border_System SHALL render all card and panel borders as `1px solid #2D333B`.
2. WHEN a card or interactive element receives keyboard focus or pointer hover, THE Border_System SHALL transition the border color to `#444C56` within 150ms.
3. THE Dashboard SHALL remove all neon-colored borders from non-interactive card surfaces.

---

### Requirement 3: Split-Pane Workbench Layout

**User Story:** As a user running a benchmark, I want a persistent Control Panel on the left and a Comparison Engine on the right, so that I can configure and observe results without scrolling between sections.

#### Acceptance Criteria

1. THE Dashboard SHALL render a locked header that remains fixed at the top of the viewport during scroll.
2. THE Dashboard SHALL render the main content area as a two-column grid with the Control Panel occupying 30% of the width and the Comparison Engine occupying 70% of the width.
3. WHILE the viewport width is below 900px, THE Dashboard SHALL collapse the two-column layout into a single-column stacked layout.
4. THE Control Panel SHALL contain the account ID input field, the log upload control, and the Run Benchmark Ghost Button.
5. THE Comparison Engine SHALL render the Baseline result pane and the GraphRAG result pane side by side, separated by the Pulse Line.
6. THE Dashboard SHALL preserve all existing tab navigation (Pipeline Race, Hallucination Test, Benchmark Results, Fraud Ring Graph, Live Query) within the Comparison Engine area.

---

### Requirement 4: Pulse Line Separator

**User Story:** As a user watching a benchmark race, I want a visual separator between the Baseline and GraphRAG panes that animates during inference, so that the "racing" metaphor is reinforced.

#### Acceptance Criteria

1. THE Pulse_Line SHALL render as a vertical 1px line using color `#2D333B` between the Baseline and GraphRAG panes.
2. WHEN a benchmark race is in progress, THE Pulse_Line SHALL animate a traveling highlight — a short gradient segment moving top-to-bottom — repeating for the duration of the race.
3. WHEN the benchmark race is not in progress, THE Pulse_Line SHALL render as a static 1px line with no animation.

---

### Requirement 5: Typography System

**User Story:** As a user reading inference results, I want headers in a clean sans-serif font and data/logs in a monospace font, so that technical output looks credible and readable.

#### Acceptance Criteria

1. THE Dashboard SHALL load Inter (weights 400, 600, 700, 800) as the primary sans-serif font for all headings and UI labels.
2. THE Dashboard SHALL load JetBrains Mono (weights 400, 500, 600) as the monospace font for all data values, token counts, latency figures, reasoning text, and evidence strings.
3. THE Dashboard SHALL apply JetBrains Mono to all elements that display numeric metrics, account IDs, verdict labels, and graph evidence.
4. THE Dashboard SHALL apply Inter to all page headings, section titles, and descriptive body copy.

---

### Requirement 6: Ghost Buttons

**User Story:** As a user interacting with the dashboard, I want action buttons to use a ghost (outline-only) style that fills on hover, so that the UI feels modern and intentional rather than heavy.

#### Acceptance Criteria

1. THE Dashboard SHALL render all primary action buttons (Run Benchmark, Start Race, Scan) with a transparent background and a `1px solid` border in the relevant accent color.
2. WHEN a Ghost Button receives pointer hover, THE Dashboard SHALL transition the button background to the accent color at 15% opacity within 150ms.
3. WHEN a Ghost Button receives pointer press, THE Dashboard SHALL apply a `scale(0.97)` transform.
4. THE Dashboard SHALL render the button label in the accent color at rest and in full white (`#FFFFFF`) on hover.

---

### Requirement 7: Typewriter Effect for LLM Reasoning

**User Story:** As a user watching inference complete, I want the LLM reasoning text to appear character by character, so that the output feels like it is being generated in real time.

#### Acceptance Criteria

1. WHEN a pipeline result becomes available and the reasoning text is first rendered, THE Typewriter_Effect SHALL reveal the reasoning string one character at a time at a rate of 18–22 characters per second.
2. THE Typewriter_Effect SHALL display a blinking cursor character (`▋`) at the insertion point during the reveal animation.
3. WHEN the Typewriter_Effect completes, THE Dashboard SHALL remove the blinking cursor.
4. IF the user navigates away from the result pane before the Typewriter_Effect completes, THE Dashboard SHALL cancel the animation and display the full reasoning text immediately.

---

### Requirement 8: Node-Expansion Animation for Fraud Ring Graph

**User Story:** As a user viewing the Fraud Ring Graph, I want graph nodes to animate into view on first render, so that the graph feels like it is being discovered rather than statically displayed.

#### Acceptance Criteria

1. WHEN the Fraud Ring Graph tab is first activated, THE Node_Expansion_Animation SHALL render each node with an initial scale of 0 and animate to scale 1 over 300ms.
2. THE Node_Expansion_Animation SHALL stagger each node's animation start by 40ms relative to the previous node, ordered by node index.
3. WHEN the Fraud Ring Graph tab is re-activated after having been previously viewed, THE Node_Expansion_Animation SHALL not replay — nodes SHALL appear at full scale immediately.
4. THE Node_Expansion_Animation SHALL use an ease-out curve so that nodes decelerate as they reach full size.

---

### Requirement 9: JSON Syntax Highlighting for Graph Evidence

**User Story:** As a user reviewing graph evidence, I want evidence strings rendered with syntax-highlighted formatting, so that the data looks like real code output rather than plain text.

#### Acceptance Criteria

1. THE Dashboard SHALL render graph evidence strings using JetBrains Mono in a dark surface panel (`#0B0E14` background).
2. WHEN an evidence string contains a key-value pattern (e.g., `key: value` or `key=value`), THE Dashboard SHALL render the key in Electric Cyan (`#00F5FF`) and the value in white (`#F0F6FF`).
3. WHEN an evidence string contains the tokens `ALERT`, `BLACKLISTED`, `banned`, or `flagged`, THE Dashboard SHALL render the entire string in Crimson (`#FF4D4D`).
4. WHEN an evidence string contains the tokens `clean`, `SAFE`, or `isolated`, THE Dashboard SHALL render the entire string in Electric Cyan (`#00F5FF`).
5. THE Dashboard SHALL prefix each evidence string with a `>` prompt character rendered in `#444C56`.

---

### Requirement 10: Radial Gauge for Single-Metric Display

**User Story:** As a user reading benchmark summary metrics, I want accuracy and risk scores displayed as radial gauges rather than pie charts, so that the data is immediately scannable.

#### Acceptance Criteria

1. THE Dashboard SHALL replace the existing RadialBarChart accuracy display in the Benchmark Results tab with a Radial_Gauge component.
2. THE Radial_Gauge SHALL render a circular arc from 0° to 270° representing 0–100% of the metric value.
3. THE Radial_Gauge SHALL render the numeric value and label centered inside the arc using JetBrains Mono.
4. WHEN the metric value is above 80, THE Radial_Gauge SHALL color the arc in Electric Cyan (`#00F5FF`).
5. WHEN the metric value is between 50 and 80, THE Radial_Gauge SHALL color the arc in Warning Amber (`#FFB800`).
6. WHEN the metric value is below 50, THE Radial_Gauge SHALL color the arc in Crimson (`#FF4D4D`).

---

### Requirement 11: Responsive Layout Preservation

**User Story:** As a user on a smaller screen, I want the dashboard to remain usable, so that I can still run benchmarks and read results without horizontal scrolling.

#### Acceptance Criteria

1. WHILE the viewport width is below 900px, THE Dashboard SHALL render all multi-column grids as single-column stacked layouts.
2. WHILE the viewport width is below 900px, THE Dashboard SHALL render the tab navigation as a horizontally scrollable row with no text wrapping.
3. THE Dashboard SHALL not introduce any horizontal overflow on viewports 375px wide or wider.

---

### Requirement 12: Preserved Functionality

**User Story:** As a developer demoing FraudGraph, I want all existing features to continue working after the UI overhaul, so that no benchmark data or interactive behavior is lost.

#### Acceptance Criteria

1. THE Dashboard SHALL preserve the Pipeline Race animation and all account selector behavior after the overhaul.
2. THE Dashboard SHALL preserve the Hallucination Test tab and all its data display after the overhaul.
3. THE Dashboard SHALL preserve the Benchmark Results tab including all charts and the per-account table after the overhaul.
4. THE Dashboard SHALL preserve the Fraud Ring Graph canvas, physics simulation, and node interaction after the overhaul.
5. THE Dashboard SHALL preserve the Live Query tab including the API fetch, loading stages, and result display after the overhaul.
6. THE Dashboard SHALL preserve the demo data fallback behavior — WHEN the API is unavailable, THE Dashboard SHALL load from `demoData.js` without error.

---

### Requirement 13: Synthetic Identity Extraction Layer (Entity Resolution)

**User Story:** As a fraud analyst demoing FraudGraph, I want the system to automatically detect when two accounts share multiple identifiers and link them as the same entity, so that I can demonstrate real-time synthetic identity reconstruction to hackathon judges.

#### Acceptance Criteria

1. THE Graph_Layer SHALL include a GSQL query named `entity_resolution` that selects all pairs of Account vertices sharing both the same IP address and the same Device ID.
2. WHEN the `entity_resolution` query identifies a qualifying account pair, THE Graph_Layer SHALL create an `ENTITY_LINK` undirected edge between those two Account vertices with a `shared_identifiers` attribute (LIST<STRING>) listing the shared IP and Device ID values and a `confidence_score` attribute (FLOAT) set to a value between 0.0 and 1.0 proportional to the number of shared identifiers.
3. THE Dashboard SHALL render accounts connected by an `ENTITY_LINK` edge within the Evidence Trace with a badge labeled `SAME ENTITY` displayed in Warning Amber (`#FFB800`).
4. WHEN an `ENTITY_LINK` edge is present in the graph evidence for a target account, THE Dashboard SHALL display the `SAME ENTITY` badge adjacent to each linked account node in the Evidence Trace component.
5. IF the `entity_resolution` query returns no qualifying pairs for a given account, THE Dashboard SHALL render the Evidence Trace without any `SAME ENTITY` badges.

---

### Requirement 14: Multi-Hop Neighborhood Summary (Context Compression)

**User Story:** As a fraud analyst demoing FraudGraph, I want the GraphRAG pipeline to compress 3-hop graph context into a single natural-language summary, so that the LLM receives a focused, high-signal prompt fragment instead of a raw node list.

#### Acceptance Criteria

1. THE Graph_Layer SHALL include a GSQL query named `neighborhood_summary` that traverses all vertices within 3 hops of a target Account and uses aggregators to count the total nodes, the number of accounts flagged for chargebacks, and the time window of those chargebacks.
2. WHEN the `neighborhood_summary` query completes, THE Graph_Layer SHALL return a structured result containing at minimum: cluster size (INT), chargeback account count (INT), chargeback rate as a percentage (FLOAT), and the time window in hours (INT).
3. THE GraphRAGResult SHALL include a field `neighborhood_summary` (STRING) containing a natural-language sentence constructed from the `neighborhood_summary` query result, for example: `"This account is part of a cluster with N other accounts, X% of which have been flagged for chargebacks in the last H hours."`.
4. WHEN the GraphRAG pipeline builds the LLM prompt, THE GraphRAGPipeline SHALL include the `neighborhood_summary` string as the first fragment of the graph context section, replacing the raw node list for cluster-level context.
5. THE Dashboard SHALL render the `neighborhood_summary` string as a highlighted callout block above the graph evidence list in any component that displays GraphRAG results, using a `background: rgba(0,245,255,0.06)` surface and a `1px solid rgba(0,245,255,0.25)` border.
6. IF the `neighborhood_summary` field is null or empty, THE Dashboard SHALL not render the callout block and SHALL display the graph evidence list without a summary header.

---

### Requirement 15: Agentic Feedback Loop

**User Story:** As a fraud analyst demoing FraudGraph, I want the pipeline to automatically trigger a second targeted query when the initial verdict is uncertain, so that I can demonstrate autonomous multi-step reasoning to hackathon judges.

#### Acceptance Criteria

1. THE Graph_Layer SHALL include a GSQL query named `ip_transaction_volume` that accepts a single STRING parameter `ip_address` and returns `total_login_count` (INT), `unique_accounts` (INT), and `chargeback_rate` (FLOAT) for all Account vertices that have logged in from that IP address.
2. WHEN the GraphRAG pipeline produces an initial verdict of `SUSPICIOUS` with a `risk_score` greater than or equal to 5.0 and less than or equal to 8.0, THE GraphRAGPipeline SHALL execute the `ip_transaction_volume` query for the first blacklisted or linked IP address in the graph evidence.
3. WHEN the `ip_transaction_volume` query result is available, THE GraphRAGPipeline SHALL construct a second LLM prompt that includes the original graph evidence, the initial verdict and risk score, and the IP transaction volume data, and SHALL invoke the LLM to produce a refined verdict and reasoning.
4. THE GraphRAGResult SHALL include a field `agentic_loop_triggered` (BOOL) set to `true` when the second query and LLM pass were executed, and `false` otherwise.
5. THE GraphRAGResult SHALL include a field `agentic_refinement` (STRING) containing the refined LLM reasoning when `agentic_loop_triggered` is `true`, and an empty string otherwise.
6. THE Dashboard SHALL display an `AGENT LOOP` badge in Electric Cyan (`#00F5FF`) adjacent to the GraphRAG verdict label when `agentic_loop_triggered` is `true`.
7. WHEN `agentic_loop_triggered` is `true`, THE Dashboard SHALL display both the initial reasoning (labeled `Initial Analysis`) and the refined reasoning (labeled `Refined Analysis`) in the GraphRAG result pane, separated by a visible divider.
8. IF `agentic_loop_triggered` is `false`, THE Dashboard SHALL display only the standard reasoning text with no `AGENT LOOP` badge and no divider.

---

### Requirement 16: TigerGraph Benchmark Metrics Dashboard

**User Story:** As a developer presenting FraudGraph at the TigerGraph hackathon, I want four specific performance metrics displayed prominently in the ScoreBoard tab, so that judges can immediately see the quantitative advantage of the GraphRAG approach.

#### Acceptance Criteria

1. THE Dashboard SHALL render a dedicated card labeled `TigerGraph Metrics` within the ScoreBoard tab.
2. THE TigerGraph_Metrics_Card SHALL display the Inference_Yield metric computed as `(graphrag_accuracy_pct / baseline_accuracy_pct) * (baseline_tokens / graphrag_tokens)` using the benchmark summary values, formatted to two decimal places with the suffix `×`, with a target annotation of `target > 10.0×`.
3. THE TigerGraph_Metrics_Card SHALL display the Path_Fidelity metric computed as the percentage of records in the benchmark dataset where `fraud_path` is non-null, formatted as a whole-number percentage, with a target annotation of `target 100%`.
4. THE TigerGraph_Metrics_Card SHALL display the Context_Window_Load metric computed as the arithmetic mean of `graphrag_tokens` across all benchmark records, formatted as a whole number with the suffix `tokens`, with a target annotation of `target < 1,000`.
5. THE TigerGraph_Metrics_Card SHALL display the Multi_Hop_Depth metric as the fixed value `3` with the suffix `hops`, with a label indicating this reflects the 3-hop BFS traversal depth.
6. WHEN the computed Inference_Yield value exceeds 10.0, THE TigerGraph_Metrics_Card SHALL render the Inference_Yield figure in Electric Cyan (`#00F5FF`).
7. WHEN the computed Inference_Yield value is 10.0 or below, THE TigerGraph_Metrics_Card SHALL render the Inference_Yield figure in Warning Amber (`#FFB800`).
8. WHEN the computed Path_Fidelity value equals 100, THE TigerGraph_Metrics_Card SHALL render the Path_Fidelity figure in Electric Cyan (`#00F5FF`).
9. WHEN the computed Path_Fidelity value is below 100, THE TigerGraph_Metrics_Card SHALL render the Path_Fidelity figure in Crimson (`#FF4D4D`).
10. WHEN the computed Context_Window_Load value is below 1000, THE TigerGraph_Metrics_Card SHALL render the Context_Window_Load figure in Electric Cyan (`#00F5FF`).
11. WHEN the computed Context_Window_Load value is 1000 or above, THE TigerGraph_Metrics_Card SHALL render the Context_Window_Load figure in Warning Amber (`#FFB800`).
