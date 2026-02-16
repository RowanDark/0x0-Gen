# Contributing to 0x0-Gen

Thanks for contributing to **0x0-Gen** — a modular, modern webapp security testing platform designed around standalone tools + an interconnected hub runtime.

This document defines the **source-of-truth development rules** for all contributors (human or AI).

---

# Project Architecture Principles

0x0-Gen is built on the following design philosophy:

- Each tool (Proxy, Repeater, Decoder, Intruder, etc.) is a **standalone app**.
- Tools can run:
  - Standalone
  - Attached to the Hub
  - Inside the Desktop runtime
  - Inside a future Cloud runtime
- All tools communicate via the **Gateway service**.
- All shared contracts originate from a single source of truth.

---

# Monorepo Structure

/apps
/hub
/proxy-ui
/repeater-ui
/decoder-ui
/intruder-ui
/desktop

/services
/gateway
/proxy
/replay
/decoder
/intruder

/packages
/contracts
/sdk
/ui
/config
/logger


Do **not** introduce new top-level directories without approval.

---

# Source of Truth Rules

### Contracts
- All shared types must live in:  
  `packages/contracts`
- No duplicate or ad-hoc types inside services or apps.
- Contracts must be consumed via the generated SDK.

### SDK
- All service communication must use the SDK.
- Direct service calls or custom clients are not allowed.

---

# Framework & Infrastructure Rules

To maintain consistency and reduce tech debt:

- Do **NOT** introduce new frameworks.
- Do **NOT** introduce new state managers.
- Do **NOT** introduce new UI libraries.
- Do **NOT** introduce new service frameworks.
- Do **NOT** add new databases or brokers.

If a framework change is required, open an RFC issue first.

---

# Scope Control Rules

When working an issue:

- Implement **ONLY** what the issue describes.
- Do **NOT** expand scope.
- Do **NOT** add “helpful extras.”
- Do **NOT** build future features early.

If something is missing, create a new issue instead.

---

# UI Rules

- No placeholder panels.
- No stubbed buttons.
- No fake data states.
- All UI must be wired to real functionality.

Feature flags are allowed **only if functionality exists behind them**.

---

# Logging

All services must log via:

packages/logger


No custom logging implementations.

---

# Testing Requirements

Required when applicable:

### Unit Tests
- Pure logic
- Parsers
- Transformers
- Utilities

### Integration Tests
- Service ↔ Gateway communication
- Event emission flows

### UI Smoke Tests (Playwright)
Required when:
- Routing changes
- Core workflows added
- Tool launch flows modified

---

# Documentation Requirements

When modifying or adding functionality:

Update:

- Service README (if service touched)
- Root README (if user-facing behavior changes)
- Contracts documentation (if schemas change)

---

# Local Development

Install dependencies:

```bash
pnpm install
Run dev environment:

pnpm dev
Run desktop runtime:

pnpm desktop
Pull Request Requirements
All PRs must:

Follow issue scope strictly

Include tests where applicable

Update docs

Pass CI checks

Avoid introducing new frameworks

See PR template for checklist.

Security Note
This project handles sensitive traffic and testing workflows.

Contributors must:

Avoid logging secrets

Avoid storing credentials in plaintext

Respect responsible disclosure principles

Final Rule
If you're unsure:

Open an issue.
Do not guess.
Do not expand scope.

Ship tight. Ship modular. Ship clean.
