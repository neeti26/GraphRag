# Social Media Post Templates

## LinkedIn Post

```
🚀 Excited to share FraudGraph - my submission for the TigerGraph GraphRAG Inference Hackathon! 

The Challenge: LLMs hallucinate when analyzing fraud patterns in raw transaction logs.

The Solution: TigerGraph GraphRAG grounds LLM reasoning in verified graph relationships.

The Results:
✅ 100% accuracy vs 50% baseline
✅ 94% token reduction (3,838 → 210 tokens)
✅ 94% cost savings
✅ 70% faster inference
✅ Zero hallucinations

Key Innovation: 3-hop GSQL traversal extracts only relevant fraud ring connections, eliminating the noise that causes LLMs to miss synthetic identity patterns.

Real Example: Account #8821 looks clean in logs but shares devices with banned accounts and uses blacklisted IPs. Baseline LLM says "SAFE" ❌. GraphRAG catches the fraud ring ✅.

Built with AI Factory architecture (Graph, Orchestration, LLM, Evaluation layers) + agentic loop refinement for uncertain cases.

🔗 GitHub: https://github.com/neeti26/GraphRag
📊 Live Dashboard: [Your deployed URL]
🎥 Demo Video: [Your YouTube URL]

#TigerGraph #GraphRAG #AI #MachineLearning #FraudDetection #LLM #GraphDatabase #Hackathon
```

## Twitter/X Post (Thread)

```
🧵 1/6 Just built FraudGraph for @TigerGraphDB's GraphRAG Hackathon!

The problem: LLMs hallucinate when detecting fraud in transaction logs.

The solution: Ground LLM reasoning in TigerGraph relationships.

Results: 100% accuracy, 94% token reduction, zero hallucinations 🎯

---

2/6 Real example of LLM hallucination:

Account #8821 looks clean in logs → Baseline LLM says "SAFE" ❌

But TigerGraph 3-hop traversal reveals:
• Shares device with BANNED accounts
• Uses BLACKLISTED IPs
• Part of 4-account fraud ring

GraphRAG catches it ✅

---

3/6 The magic: TigerGraph GSQL queries

Instead of feeding 3,800 tokens of noisy logs to the LLM, we:
1. Run 3-hop BFS from target account
2. Extract only relevant fraud signals (6-8 nodes)
3. Build focused prompt (~250 tokens)

94% token reduction = 94% cost savings 💰

---

4/6 Innovation: Agentic Loop Refinement

When GraphRAG returns uncertain verdict (risk 5.0-8.0):
1. Query IP transaction volume from graph
2. Build second prompt with enriched context
3. LLM refines analysis with higher confidence

2/4 test cases triggered this → improved risk scores 📈

---

5/6 Dashboard features:
• Dual-pipeline inference race (side-by-side comparison)
• Token Economics Scorecard (94% reduction)
• Evidence Trace sub-graph (visual fraud connections)
• Explainable graph paths (zero hallucination)
• TigerGraph Metrics (Inference Yield, Path Fidelity)

---

6/6 Tech stack:
• TigerGraph Cloud (GSQL queries)
• OpenAI GPT-4o
• Python + pyTigerGraph
• React + Vite + Framer Motion

🔗 GitHub: https://github.com/neeti26/GraphRag
📊 Live Demo: [Your URL]
🎥 Video: [Your URL]

#TigerGraph #GraphRAG #AI #FraudDetection
```

## Instagram Caption

```
🛡️ FraudGraph: Eliminating LLM Hallucinations with TigerGraph GraphRAG

Built for the TigerGraph GraphRAG Inference Hackathon 🚀

The Problem:
LLMs analyzing raw transaction logs miss fraud patterns and hallucinate "SAFE" verdicts for accounts that are actually part of synthetic identity rings.

The Solution:
TigerGraph GraphRAG grounds LLM reasoning in verified graph relationships using 3-hop GSQL traversal.

The Results:
✅ 100% accuracy (vs 50% baseline)
✅ 94% token reduction
✅ 94% cost savings
✅ 70% faster inference
✅ Zero hallucinations

Swipe to see:
1️⃣ Dual-pipeline inference race
2️⃣ Evidence trace sub-graph
3️⃣ Token economics scorecard
4️⃣ Agentic loop refinement
5️⃣ TigerGraph metrics dashboard

Real-world impact: Catches fraud rings that baseline LLMs miss entirely by analyzing device sharing, IP connections, and fraud ring membership.

Built with AI Factory architecture (Graph, Orchestration, LLM, Evaluation layers) for production-ready deployment.

🔗 Link in bio for GitHub repo, live demo, and technical write-up!

#TigerGraph #GraphRAG #AI #MachineLearning #FraudDetection #LLM #GraphDatabase #Hackathon #TechInnovation #DataScience #ArtificialIntelligence
```

## Reddit Post (r/MachineLearning or r/datascience)

```
Title: [P] FraudGraph: Eliminating LLM Hallucinations with TigerGraph GraphRAG (100% accuracy, 94% token reduction)

I built FraudGraph for the TigerGraph GraphRAG Inference Hackathon to solve a critical problem: LLMs hallucinate when analyzing fraud patterns in raw transaction logs.

**The Problem:**
Baseline LLMs analyzing 50+ transaction logs (3,800 tokens) miss fraud rings hidden in relationship patterns. In my test dataset, baseline achieved only 50% accuracy - missing 2 out of 4 fraud cases entirely.

**The Solution:**
TigerGraph GraphRAG grounds LLM reasoning in verified graph relationships:
1. Run 3-hop GSQL BFS traversal from target account
2. Extract only relevant fraud signals (device sharing, IP connections, fraud ring membership)
3. Build focused LLM prompt with ~250 tokens (94% reduction)
4. LLM generates verdict grounded in graph truth

**Results:**
- Detection Accuracy: 100% (vs 50% baseline)
- Token Reduction: 94% (3,838 → 210 avg)
- Cost Savings: 94% ($0.000576 → $0.000032 per query)
- Latency: 70% faster (2,053ms → 598ms)
- Hallucinations: 0 (vs 2 in baseline)

**Real Example:**
Account #8821 looks clean in logs → Baseline says "SAFE" ❌

But TigerGraph reveals:
- Shares Device XYZ-999 with Account #1002 (FLAGGED) and Account #0001 (BANNED)
- Logged from IP 192.168.1.1 (BLACKLISTED - linked to 12 chargebacks)
- Part of 4-account synthetic identity ring

GraphRAG catches it → "SUSPICIOUS, Risk 9.2/10" ✅

**Key Innovation: Agentic Loop Refinement**
When GraphRAG returns uncertain verdict (risk 5.0-8.0), system:
1. Queries IP transaction volume from graph
2. Builds second prompt with enriched context
3. LLM refines analysis with higher confidence

**Tech Stack:**
- TigerGraph Cloud (GSQL queries)
- OpenAI GPT-4o
- Python + pyTigerGraph
- React + Vite + Framer Motion

**Dashboard Features:**
- Dual-pipeline inference race (side-by-side comparison)
- Token Economics Scorecard
- Evidence Trace sub-graph (visual fraud connections)
- Explainable graph paths
- TigerGraph Metrics (Inference Yield, Path Fidelity, Context Window Load)

GitHub: https://github.com/neeti26/GraphRag
Live Demo: [Your URL]
Technical Write-up: https://github.com/neeti26/GraphRag/blob/main/TECHNICAL_WRITEUP.md

Happy to answer questions about the implementation!
```

## YouTube Video Description

```
FraudGraph: Eliminating LLM Hallucinations with TigerGraph GraphRAG

This demo shows how TigerGraph GraphRAG achieves 100% accuracy in fraud detection vs 50% baseline, while reducing tokens by 94% and cutting costs by 94%.

🎯 Timestamps:
0:00 - Introduction & Problem Statement
0:30 - Dual-Pipeline Inference Race
1:30 - The Hallucination Case (Account #8821)
2:30 - Evidence Trace Sub-Graph
3:30 - Token Economics Scorecard
4:00 - Agentic Loop Refinement
4:45 - TigerGraph Metrics Dashboard
5:30 - Conclusion & Results

📊 Benchmark Results:
✅ 100% accuracy (vs 50% baseline)
✅ 94% token reduction (3,838 → 210 tokens)
✅ 94% cost savings
✅ 70% faster inference
✅ Zero hallucinations

🔗 Links:
GitHub: https://github.com/neeti26/GraphRag
Live Demo: [Your deployed URL]
Technical Write-up: https://github.com/neeti26/GraphRag/blob/main/TECHNICAL_WRITEUP.md

🏆 Built for TigerGraph GraphRAG Inference Hackathon 2025

#TigerGraph #GraphRAG #AI #MachineLearning #FraudDetection #LLM #GraphDatabase #Hackathon
```
