# 0x0-Gen

**0x0-Gen** is a modular, modern web application security testing platform designed as a next-generation alternative to legacy intercepting proxy suites.

Instead of a monolithic tool, 0x0-Gen is built around **standalone security apps** connected through a shared hub runtime.

---

# Vision

Traditional testing suites bundle all tooling into a single interface.

0x0-Gen takes a different approach:

- Each tool is its own application.
- Tools can run standalone or interconnected.
- Desktop and cloud runtimes share the same modules.
- Contracts and eventing unify the ecosystem.

---

# Core Modules

| Tool | Function |
|------|----------|
| Proxy | Traffic interception + capture |
| Repeater | Request replay + diffing |
| Decoder | Encoding/decoding pipelines |
| Intruder | Payload fuzzing engine |
| Hub | Project + event control plane |

---

# Architecture

Apps (UI)
↓
Gateway
↓
Services
↓
Contracts + SDK


All communication flows through the gateway and shared contracts.

---

# Monorepo Structure

/apps
/services
/packages


See CONTRIBUTING.md for architectural rules.

---

# Development

Install dependencies:

```bash
pnpm install
Run dev environment:

pnpm dev
Launch desktop runtime:

pnpm desktop
Contribution Rules
Before contributing, read:

👉 CONTRIBUTING.md

Key rules:

No new frameworks

Contracts are source of truth

No placeholder UI

No scope expansion

Roadmap
Milestone progression:

Repo spine + runtime

Hub control plane

Proxy (perfected)

Repeater (perfected)

Decoder (perfected)

Intruder (perfected)

Security Notice
This platform handles sensitive testing traffic.

Contributors must:

Avoid logging secrets

Avoid storing credentials insecurely

Follow responsible disclosure practices

License
TBD

Status
🚧 Early architecture phase
Skeleton + core runtime in development
