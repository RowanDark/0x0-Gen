# 0x0-Gen

0x0-Gen is a modular, modern web application security testing platform built as a set of standalone tools connected through a shared gateway and contracts.

## Milestone 0 Scope

This repository currently provides the runtime spine only:

- Turborepo + pnpm monorepo workspace
- Shared TypeScript, ESLint, and Prettier configuration
- Contracts package as schema source-of-truth
- SDK package for typed gateway communication
- Gateway service with health + WebSocket event stream + stub service routing
- Hub app wired to gateway `/healthz` and `/events`
- Desktop runtime wrapper with Tauri

No security tool business logic is implemented in this milestone.

## Repository Layout

```txt
apps/
  hub
  proxy-ui
  repeater-ui
  decoder-ui
  intruder-ui
  desktop
services/
  gateway
  proxy
  replay
  decoder
  intruder
packages/
  contracts
  sdk
  ui
  config
  logger
```

## Development

Install dependencies:

```bash
pnpm install
```

Run gateway + hub development flow:

```bash
pnpm dev
```

Run the desktop runtime (gateway + hub + tauri shell):

```bash
pnpm desktop
```

## Validation Commands

```bash
pnpm --filter @0x0-gen/gateway test
pnpm validate:workspace-build
```
