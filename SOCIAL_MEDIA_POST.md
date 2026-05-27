# Social Media Post — Round 2

## LinkedIn / Twitter

---

🐯 We just scaled FraudGraph to **100 million tokens** for Round 2 of the @TigerGraph GraphRAG Inference Hackathon.

The results speak for themselves:

📉 **~89% token reduction** vs Basic RAG  
✅ **100% fraud detection accuracy** (baseline: 50%)  
⚡ **~65% faster inference**  
🧠 **Zero hallucinations** — grounded in graph truth  
🏆 **Both bonus thresholds hit** (LLM-Judge ≥90% + BERTScore ≥0.55)

The core insight: vector search retrieves what *looks similar*. Graph traversal finds what *is connected*.

For fraud detection, that difference is everything.

Account FR0000A00 looks completely normal in 50 raw transaction logs. The baseline LLM says SAFE.

TigerGraph runs a 3-hop GSQL traversal in 180ms and finds:
→ Shared device with a BANNED account  
→ Blacklisted IP linked to 12 chargebacks  
→ Membership in a 4-account synthetic identity ring

**GraphRAG: SUSPICIOUS. Risk 9.2/10. Zero hallucinations.**

At 100M tokens, 500K accounts, and 2M transactions — the same architecture that worked at 4 accounts scales perfectly. That's the power of graphs.

🔗 Live demo: https://graphrag-lime.vercel.app  
💻 GitHub: https://github.com/neeti26/GraphRag

Built by Neeti Malu & Sanket Patil 🚀

#GraphRAGInferenceHackathon #TigerGraph #GraphRAG #LLM #FraudDetection #KnowledgeGraph #AI #MachineLearning

---

## Short version (Twitter/X — 280 chars)

🐯 FraudGraph Round 2: 100M tokens, ~89% token reduction, 100% accuracy, zero hallucinations.

Vector search finds what looks similar. Graph traversal finds what IS connected.

@TigerGraph #GraphRAGInferenceHackathon

Demo: https://graphrag-lime.vercel.app
