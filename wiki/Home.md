# Spec-Kit Studio Wiki

**Spec-Kit Studio is a local-first workspace for reviewable, specification-driven delivery with coding agents.** It keeps selected scope, repository evidence, reviewed Spec-Kit artifacts, worktree receipts, verification output, and the final handoff in one evidence chain.

> Studio helps people inspect and approve agent-assisted work. It does not claim generated content is correct or replace code review, CI, accessibility testing, or release controls.

## Choose your path

| I want to… | Start here |
| --- | --- |
| Install Studio on Windows, macOS, or Linux | [[Getting Started]] |
| Understand the end-to-end review path | [[Delivery Workflow]] |
| Connect a local repository and coding agent | [[Local Connector]] |
| Understand components and data boundaries | [[Architecture]] |
| Evaluate security and trust assumptions | [[Security and Trust]] |
| Resolve a common setup question | [[FAQ]] |

## How the pieces fit

```text
request or existing artifact
  -> reviewed scope and evidence
  -> specification, plan, and ordered tasks
  -> bounded worktree execution and verification
  -> retained engine handoff and delivery evidence, or an explicit repair decision
```

The web workspace stores project data locally in the browser. An optional loopback connector provides explicit, allowlisted access to local repositories and coding agents. Implementation runs in a linked worktree rather than disturbing the connected checkout.

At completed developer delivery, Studio separates engine artifacts, review
evidence, and repository code. A developer may optionally create a GitHub pull
request only after committing and pushing a clean linked-worktree branch; the
resulting PR record becomes delivery evidence. Studio never creates the commit,
pushes, merges, or deploys. GovCloud and DoD deployments show a persistent
boundary banner and remain operating postures, not certification claims.

## Project links

- [Project site](https://rraviku2-uhg.github.io/spec-kit-studio/)
- [Source repository](https://github.com/rraviku2_uhg/spec-kit-studio)
- [Canonical documentation](https://github.com/rraviku2_uhg/spec-kit-studio/tree/main/docs)
- [Report a bug](https://github.com/rraviku2_uhg/spec-kit-studio/issues/new?template=bug_report.yml)
- [Request a feature](https://github.com/rraviku2_uhg/spec-kit-studio/issues/new?template=feature_request.yml)
- [Security policy](https://github.com/rraviku2_uhg/spec-kit-studio/blob/main/SECURITY.md)
- [Contributing guide](https://github.com/rraviku2_uhg/spec-kit-studio/blob/main/CONTRIBUTING.md)

---

[Project site](https://rraviku2-uhg.github.io/spec-kit-studio/) · [README](https://github.com/rraviku2_uhg/spec-kit-studio#readme) · [Documentation](https://github.com/rraviku2_uhg/spec-kit-studio/tree/main/docs)
