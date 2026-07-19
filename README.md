# 🎨 Figma Context Cache MCP

🇧🇷 **Leia em português:** [README.pt-BR.md](README.pt-BR.md)

> **Persistent design context for AI coding agents.**
>
> *Build once. Cache locally. Reuse everywhere.*

An MCP (Model Context Protocol) server that provides **cached, refreshable and structured Figma context** for AI coding assistants such as **Codex**, **Claude Code**, and other MCP-compatible clients.

Instead of querying the Figma API on every request, this server stores node responses locally and exposes tools to retrieve, inspect, synchronize and manage cached design context.

---

# Why?

AI coding assistants frequently need information from Figma while implementing or maintaining frontend applications.

Without a cache layer, every request:

- calls the Figma API
- consumes rate limits
- increases latency
- downloads the same information repeatedly

This project introduces a persistent cache with explicit synchronization capabilities, making Figma context:

- ⚡ Faster
- ♻️ Reusable
- 📦 Persistent
- 🤖 AI-friendly

---

# Architecture

```text
                 AI Agent
        (Codex / Claude Code)

                     │
                     ▼

               MCP Server

                     │

         ┌───────────┴───────────┐
         │                       │

         ▼                       ▼

 Local JSON Cache        Figma REST API

         │

         ▼

  Persistent Design Context
```

---

# Features

- ✅ Persistent local cache
- ✅ Configurable cache TTL
- ✅ Explicit cache synchronization
- ✅ Cache inspection
- ✅ Selective cache clearing
- ✅ Strongly typed
- ✅ Automated tests with Vitest
- ✅ MCP compatible

---

# MCP Tools

| Tool | Description |
|------|-------------|
| `health_check` | Verifies that the MCP server is running |
| `get_figma_node` | Retrieves a node from cache or directly from Figma |
| `sync_figma_node` | Forces a fresh request to Figma and updates the cache |
| `list_cached_figma_nodes` | Lists cached nodes and their current status |
| `clear_figma_cache` | Removes cache entries selectively |

---

# Cache Lifecycle

```text
get_figma_node

        │

        ▼

Cache Hit?
   │
   ├── Yes ───────────────► Return cached node
   │
   └── No
        │
        ▼

Query Figma API

        │

        ▼

Store locally

        │

        ▼

Return response


sync_figma_node

        │

        ▼

Always query Figma

        │

        ▼

Update cache

        │

        ▼

Return fresh response
```

---

# Example

Synchronize a node:

```text
Use sync_figma_node with:

fileKey: wdva3WcsFmz54Sg5e6OWJl
nodeId: 4510-5941
depth: 1
```

Example response:

```json
{
  "message": "Node synchronized successfully.",
  "metadata": {
    "source": "figma",
    "cacheUpdated": true
  }
}
```

Subsequent requests:

```text
Use get_figma_node...
```

Response:

```json
{
  "metadata": {
    "source": "cache"
  }
}
```

---

# Project Structure

```text
src/
├── cache/
├── figma/
├── server/
├── tools/
└── sync/

tests/
├── cache/
└── figma/
```

---

# Testing

This project uses **Vitest**.

Current test coverage:

| Component | Coverage |
|-----------|----------|
| CacheService | 90%+ |
| FigmaContextService | 100% |
| FigmaClient | In progress |

Run the test suite:

```bash
npm test
```

Generate coverage:

```bash
npm run test:coverage
```

---

# Installation

```bash
git clone https://github.com/AysllaGomes/figma-context-cache-mcp.git

cd figma-context-cache-mcp

npm install
```

Configure your environment:

```text
FIGMA_API_KEY=your-token
CACHE_TTL_SECONDS=3600
STORAGE_PATH=./storage
```

Start the server:

```bash
npm run dev
```

---

# Roadmap

- [x] Persistent cache
- [x] Cache inspection
- [x] Cache synchronization
- [x] Automated unit tests
- [ ] Structured node metadata
- [ ] Component relationship graph
- [ ] Storybook integration
- [ ] Angular component mapping
- [ ] Design token indexing
- [ ] Semantic search

---

# Vision

This project started as a cache for the Figma API.

Its long-term goal is to evolve into a **Frontend Context Engine**, capable of providing AI coding agents with rich, structured knowledge about design systems, frontend components and software architecture.

Instead of simply retrieving JSON from Figma, the server aims to understand relationships between components, design tokens, Storybook stories and frontend implementations, enabling AI agents to make better architectural and implementation decisions.

---

# License

[MIT](LICENSE)