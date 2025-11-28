## yama-agent - The Graph DeFi & NFT Analytics

Advanced blockchain data analytics agent powered by The Graph Protocol.

### 🚀 Quick Start

See [QUICKSTART.md](./QUICKSTART.md) for 5-minute setup guide.

**TL;DR:**
```sh
# 1. Configure
cp .env.example .env
# Add your THE_GRAPH_API_KEY

# 2. Start with Docker
bun run docker:up

# 3. Test
curl http://localhost:3001/health
```

### 📖 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Get started in 5 minutes
- **[THE_GRAPH_INTEGRATION.md](./THE_GRAPH_INTEGRATION.md)** - Complete integration guide
- **[AGENTS.md](./AGENTS.md)** - AxLLM Flow agent patterns
- **[../../THE_GRAPH_PROJECT_SUMMARY.md](../../THE_GRAPH_PROJECT_SUMMARY.md)** - Full project overview

### 🎯 What's Included

#### Analytics Entrypoints
1. **analyze-top-pools** - DeFi pool analysis with efficiency metrics
2. **analyze-pool-activity** - Anomaly detection in trading activity
3. **track-whale-activity** - Smart money tracking
4. **analyze-lending-health** - Protocol stress index (Aave)

#### Feature Engineering
- Protocol Stress Index (PSI)
- Liquidity Efficiency Score
- Whale Activity Score
- Smart Money Momentum Indicator (SMMI)
- ML-powered Anomaly Detection

#### Infrastructure
- Redis caching layer
- BullMQ job scheduler
- Python analytics service (FastAPI)
- TimescaleDB for time-series data

### 🏗️ Project Structure

```
apps/yama-agent/
├── src/
│   ├── lib/
│   │   ├── agent.ts              # Main agent definition
│   │   ├── graphClient.ts        # The Graph client
│   │   ├── subgraph-queries.ts   # Pre-built queries
│   │   ├── graph-entrypoints.ts  # Analytics handlers
│   │   ├── cache.ts              # Redis caching
│   │   └── scheduler.ts          # Job scheduling
│   └── index.ts                  # Server entry point
├── docker-compose.yml            # Full stack setup
├── Dockerfile                    # Agent container
└── .env.example                  # Configuration template
```

### 🛠️ Available Scripts

- `bun run dev` – start in development mode (watch)
- `bun run start` – start in production mode
- `bun run build` – build for production
- `bun run docker:up` – start all services with Docker
- `bun run docker:down` – stop all services
- `bun run docker:logs` – view logs
- `bun run type-check` – TypeScript type checking

### 🔧 Configuration

**Required environment variables:**

```bash
# The Graph API
THE_GRAPH_API_KEY=your_api_key_here

# Redis (optional but recommended)
REDIS_URL=redis://localhost:6379

# Python Analytics
PYTHON_ANALYTICS_URL=http://localhost:8000

# Agent settings
AGENT_NAME=yama-agent
AGENT_VERSION=0.1.0
YAMA_AGENT_PORT=3001
```

See [.env.example](./.env.example) for complete configuration.

### 📊 Example Usage

**Analyze top DeFi pools:**
```bash
curl -X POST http://localhost:3001/entrypoints/analyze-top-pools/invoke \
  -H "Content-Type: application/json" \
  -d '{"input": {"network": "ethereum", "limit": 10}}'
```

**Track whale activity:**
```bash
curl -X POST http://localhost:3001/entrypoints/track-whale-activity/invoke \
  -H "Content-Type: application/json" \
  -d '{"input": {"network": "ethereum", "minValueUSD": 100000}}'
```

See [THE_GRAPH_INTEGRATION.md](./THE_GRAPH_INTEGRATION.md) for more examples.

### 🐳 Docker Deployment

**Full stack (Agent + Python + Redis + PostgreSQL):**
```sh
docker-compose up -d
```

Services:
- yama-agent: http://localhost:3001
- python-analytics: http://localhost:8000
- redis: localhost:6379
- postgres: localhost:5432

### 🤝 Integration

**With Python Analytics:**
```typescript
const response = await fetch(
  `${process.env.PYTHON_ANALYTICS_URL}/api/v1/features/whale-activity-score`,
  {
    method: 'POST',
    body: JSON.stringify({ positions, timeframe_hours: 24 })
  }
);
```

**With The Graph:**
```typescript
import { getGraphClient } from './lib/graphClient';

const client = getGraphClient();
const result = await client.query('UNISWAP_V3_ETHEREUM', QUERY);
```

### 🚀 Next Steps

1. Get The Graph API key: https://thegraph.com/studio/
2. Read [QUICKSTART.md](./QUICKSTART.md) to get running
3. Explore [THE_GRAPH_INTEGRATION.md](./THE_GRAPH_INTEGRATION.md) for advanced usage
4. Check [Python Analytics README](../../services/python-analytics/README.md) for ML features

### 📝 Migration from Twitter Analytics

Migrating from Twitter-based analytics? See [README_THE_GRAPH_MIGRATION.md](../../README_THE_GRAPH_MIGRATION.md) for migration guide.

---

Built with [Lucid Dreams Agent Kit](https://github.com/daydreamsai/lucid-dreams) and [The Graph Protocol](https://thegraph.com/)
