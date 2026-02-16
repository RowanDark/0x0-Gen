# 📄 PR Template

Create:

`.github/PULL_REQUEST_TEMPLATE.md`

```markdown
# Pull Request — 0x0-Gen

## Issue Reference

Closes: #

---

# Summary

Describe what this PR implements.

- What feature/service/UI was added or modified?
- What problem does it solve?

---

# Scope Confirmation

- [ ] I implemented ONLY what the issue describes.
- [ ] I did NOT expand scope beyond the issue.
- [ ] I did NOT introduce unrequested features.

---

# Architecture Compliance

- [ ] No new frameworks introduced.
- [ ] No new infrastructure introduced.
- [ ] No new state managers introduced.
- [ ] No duplicate contract types created.
- [ ] All shared types live in `packages/contracts`.
- [ ] Services consume contracts via the SDK.

---

# UI Compliance (if applicable)

- [ ] No placeholder panels.
- [ ] No stubbed buttons.
- [ ] No fake/mock data states.
- [ ] UI is wired to real functionality.

---

# Testing

- [ ] Unit tests added/updated.
- [ ] Integration tests added/updated.
- [ ] Playwright smoke tests added (if UI routing/workflows changed).

Describe test coverage:

---

# Logging

- [ ] Logging implemented via `packages/logger`.

---

# Documentation

- [ ] Service README updated (if applicable).
- [ ] Root README updated (if applicable).
- [ ] Contracts documentation updated (if schemas changed).

---

# Screenshots / Evidence (if UI)

Add screenshots or recordings showing functionality.

---

# Security Checklist

- [ ] No secrets logged.
- [ ] No credentials stored insecurely.
- [ ] Sensitive traffic handled appropriately.

---

# Final Confirmation

- [ ] PR follows CONTRIBUTING.md rules.
- [ ] CI passes.
- [ ] Ready for review.
