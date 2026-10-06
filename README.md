# IQX CLI (⚡)
**Autonomous Agentic Terminal Assistant & Accure Enterprise AI Gateway**

IQX CLI is a standalone, cross-platform pair-programming agent built to deliver the developer agility of AI, with native integration to Accure  Unified Context Graph (UCG), Agentic Workflows, and Panel of Experts (POE).

---

## Quick Start

```bash
# Run interactive pair programming session
iqx chat

# Execute a one-shot coding task
iqx "Run tests in runtime/worker.py and fix any failures"
```

---

## Authentication: Developer Hub API Token

To connect IQX CLI with your AccureIQ enterprise instance:

1. Open your browser to **AccureIQ**.
2. Navigate to **Developer Hub -> API Key Manager** (/developer-hub?tab=tokens).
3. Click **Generate API Key** and copy your token (ak-...).
4. Authenticate in your terminal:

```bash
iqx auth login
# Enter your token: ak-********************
```

Or set an environment variable:
```bash
export IQX_API_TOKEN="ak-..."
export IQX_API_URL="http://localhost:8000"
```

Verify status:
```bash
iqx auth whoami
```

---

## Core Commands

- `iqx [prompt...]`: Execute an autonomous pair-programming task with permission checks
- `iqx chat`: Start an interactive TUI session with slash command shortcuts
- `iqx auth login`: Store your Developer Hub API Key
- `iqx auth whoami`: Check active connection status and token validity
- `iqx config list`: View local configuration (~/.iqx/config.json)
- `iqx config set <k> <v>`: Update preferences (sandbox_mode, default_model)
- `iqx ucg query <prompt>`: Query corporate Milvus collections and enterprise documents

---

## Building from Source

```bash
bun install
bun run build
```

---
Apache 2.0. Copyright (c) 2026 Accure Inc.
