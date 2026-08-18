# ELENCHUS
## The On-Chain Socratic Tribunal for Decentralized Adjudication

![Socratic Dragon Arbiter](./socratic_dragon.jpg)

---

### Manifesto of the Examined Hypothesis

Modern online spaces suffer from a fundamental crisis of trust: debate is dominated by algorithmic noise, unchecked assertions, and rhetorical persuasion. 

**Elenchus** (named after the Socratic method of refutation and cross-examination) provides a digital *Basanos* (touchstone)—a decentralized, fact-grounded tribunal on GenLayer where statements are audited against external reality. Every assertion proposed or challenged in the Academy must be backed by a verifiable **Web Evidence URL**. Rather than trusting subjective opinions, GenLayer nodes crawl the web page on-chain, and a Socratic Dragon Arbiter adjudicates the claims strictly against retrieved facts.

---

### The Dialectic Protocol

The execution lifecycle of any dialectic session inside Elenchus is divided into four distinct phases:

```
  [ Propositio ] ───> Proponent establishes a hypothesis with web evidence
        │
        ▼
  [ Disputatio ] ───> Opponent challenges the thesis with a counter-claim & link
        │
        ▼
  [ Adjudicatio ] ──> Socratic Dragon Arbiter fetches content & weighs facts
        │
        ├─────────── UPHOLD: Incumbent holds; defenses counter increments
        ▼
  [ Renovatio ] ────> REFUTE: Challenger overthrows thesis; becomes new proponent
```

1. **Propositio (Proposal)**: A user submits a topic, a specific category tag (Science, Technology, Philosophy, Geopolitics), and an opening claim supported by a web page.
2. **Disputatio (Dispute)**: A challenger disputes the active claim, presenting a counter-claim and their own supporting web link.
3. **Adjudicatio (Adjudication)**: GenLayer VM coordinates the non-deterministic web crawl. An LLM roleplaying as the Socratic Arbiter compares the facts from both pages.
4. **Renovatio (Renewal)**: If the challenger’s evidence is decisively superior (satisfying a margin threshold of 55+), the incumbent is overthrown. The challenger is crowned the new proponent, and the stage increases.

---

### Under the Hood: State & Gas Architecture

Elenchus implements several critical gas-saving and consistency mechanisms inside the GenLayer VM environment:

* **Categorized Query Streams**: Dialectics are registered with category strings, allowing frontends to query, search, and filter subsets of debates without loading the entire state history.
* **Refutation Champion Analytics**: The contract actively tracks the most decisive overthrow in history (highest decision margin and its reasoning). This provides a system-wide benchmark for evidentiary truth.
* **O(1) Circular Buffer Queue**: Logs are saved using a modulo index (`total_debates % MAX_LOG_SIZE`) within a fixed-size storage array. This prevents gas fee escalation as the platform records thousands of duels.
* **TreeMap Partitioning**: Individual values (topics, categories, claims, defenses) are mapped in independent Treemaps, avoiding expensive JSON serialization/deserialization during contract writes.

---

### Scholastic API Reference

| Interface Signature | Type | Description |
| :--- | :--- | :--- |
| `propose_hypothesis(topic, category, claim, url)` | Write | Spawns a new dialectic session with a category tag. |
| `refute_hypothesis(dialectic_id, claim, url)` | Write | Challenges the active statement with a counter-evidence url. |
| `get_stats()` | View | Returns global stats and the Refutation Champion details. |
| `get_arena(dialectic_id)` | View | Returns state, proponent, and chronological stage timelines. |
| `get_arenas(start)` | View | Returns paged list of active dialectics (newest first). |
| `get_ledger(start)` | View | Returns paged circular ledger log records (newest first). |

---

### Operating Instructions

#### Linter Auditing
Ensure the intelligent contract conforms to the validator interpreter:
```bash
pip install genvm-linter
genvm-lint contracts/elenchus.py
```

#### Executing Integration Tests
Run the test runner to deploy and verify transactions locally:
```bash
gltest tests/integration/ -v -s --network studionet
```

#### Frontend Development Server
Configure environment variables in `frontend/.env.local` and launch:
```bash
cd frontend
npm install
npm run dev
```

---

### Licensing
Distributed under the MIT License. Developed and maintained by **k_bee**.
