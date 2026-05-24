# PartyGameSDK Agent Dashboard — v1.1.2

**Runtime Console for AI Agent Operations**

A Next.js dashboard providing real-time visibility into the Agent Intelligence Layer: agent status, runtime failures, token costs, RAG retrieval history, build queue, canary status, and runtime artifacts.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| UI Components | shadcn/ui |
| Data | Mock adapters → Prometheus/GitHub API |

## Getting Started

```bash
cd agent-dashboard
npm install
npm run dev
# → http://localhost:3000
```

## Routes

| Route | Page | Description |
|---|---|---|
| `/` | Overview | Agent landscape, key metrics |
| `/agents` | Agent Status | 13 agents, health, tasks |
| `/runtime` | Runtime Failures | RTE codes, trends, recovery |
| `/cost` | Token Cost | Usage, cost, latency, cache |
| `/rag` | RAG Retrieval | Query history, top docs |
| `/builds` | Build Queue | Game builds, gates, screenshots |
| `/release` | Canary / Release | Phase, rollout, gates |
| `/artifacts` | Artifacts | Screenshots, logs, traces |

## Architecture

```
agent-dashboard/
├── app/
│   ├── layout.tsx          ← Root layout (dark theme shell)
│   ├── page.tsx            ← Overview dashboard
│   ├── agents/page.tsx
│   ├── runtime/page.tsx
│   ├── cost/page.tsx
│   ├── rag/page.tsx
│   ├── builds/page.tsx
│   ├── release/page.tsx
│   └── artifacts/page.tsx
├── components/
│   ├── ui/                 ← shadcn/ui primitives
│   ├── AgentCard.tsx
│   ├── StatusBadge.tsx
│   ├── Navbar.tsx
│   ├── MetricsCard.tsx
│   └── GateChecklist.tsx
├── lib/
│   ├── api/
│   │   ├── agents.ts       ← Agent status mock adapter
│   │   ├── cost.ts         ← Token cost metrics adapter
│   │   ├── runtime.ts      ← Runtime failure mock adapter
│   │   ├── rag.ts          ← RAG retrieval mock adapter
│   │   ├── builds.ts       ← Build queue mock adapter
│   │   └── release.ts      ← Release state adapter
│   └── utils.ts
├── public/
├── styles/
│   └── globals.css
├── package.json
├── next.config.js
├── tsconfig.json
└── tailwind.config.ts
```

## Design Language

- **Dark theme** — `#0a0a0f` background, runtime-console aesthetic
- **Accent** — `#51cf66` (PartyGame green), `#ffd43b` (warning), `#ff6b6b` (error)
- **Glass panels** — `backdrop-blur bg-white/5 border-white/10`
- **Monospace data** — `font-mono` for metrics, hashes, IDs
- **Mobile responsive** — All panels stack vertically on mobile

## Current Status

- ✅ Project skeleton
- ✅ 7 pages + layout
- ✅ Mock data adapters
- ✅ Dark theme / glass design
- ⬜ Real Prometheus integration (v1.1.3)
- ⬜ GitHub Actions integration (v1.1.3)
