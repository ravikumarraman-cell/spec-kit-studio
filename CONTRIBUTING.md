# Contributing to Spec-Kit Studio

Thank you for improving Spec-Kit Studio. This project is local-first and safety-sensitive: a polished interface must never imply that an unreviewed plan, agent result, or local action is safe.

## Before you begin

1. Read the [README](README.md) and the relevant guide in `docs/`.
2. Search existing issues and pull requests once the repository is published.
3. For a substantial change, open an issue first so maintainers and contributors can agree on scope.
4. Do not include credentials, repository contents you are not authorized to share, customer data, or generated secrets in an issue, commit, test fixture, or screenshot.

## Development setup

Use Node.js 22.12 through 22.x, npm, and Git.

```bash
npm install
npm run dev
```

Run the complete local gate before opening a pull request:

```bash
npm run verify
```

`verify` runs TypeScript checking, the Node test suite, and a production build.

## Change expectations

- Keep a pull request focused on one outcome.
- Preserve explicit confirmation for writes, worktree creation, tool installation, checks, local-agent execution, remote publication, and credential use.
- Never make Studio auto-advance a human approval gate.
- Add or update focused tests for workflow rules, persistence migrations, or connector behavior that you change.
- Update user-facing docs when actual behavior, limits, or safety boundaries change.
- Use semantic theme roles rather than adding a hard-coded color or a theme-specific contrast exception.

## Pull requests

Explain the user-visible outcome, constraints, tests run, and any remaining limitations. Include before/after screenshots for visual changes when practical. Maintainers may ask for a smaller change, additional tests, or documentation before merging.

## Contributor license agreement

No contributor license agreement is currently required. By submitting a contribution, you confirm that you have the right to submit it under the license selected for this repository when one is added. Do not submit third-party code or assets unless their license permits the intended use and attribution is included.
