### Out of Scope

1.  Anything not explicitly listed in Actions.

### Codex Execution Constraints

1.  Implement ONLY what this issue describes.
2.  Do NOT introduce additional frameworks or infrastructure.
3.  Use existing monorepo tooling and configs.
4.  All shared types must live in packages/contracts.
5.  Services must consume contracts via the SDK.
6.  Add feature flags if required, but no placeholder functionality.
7.  Update documentation and service README.
8.  Add logging via packages/logger.

### Testing

1.  Add/extend tests for any new logic (unit + integration where applicable).
2.  Add Playwright only when UI routing or core user flows change. 
