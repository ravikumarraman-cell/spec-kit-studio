# Getting Started

Studio runs on Windows, macOS, and Linux. It requires Node.js `>=22.6.0`, npm, and Git. Cloud AI and local coding-agent CLIs are optional.

## Install

### macOS and Linux

```bash
git clone https://github.com/rraviku2_uhg/spec-kit-studio.git
cd spec-kit-studio
npm install
npm run dev
```

### Windows PowerShell

```powershell
git clone https://github.com/rraviku2_uhg/spec-kit-studio.git
Set-Location spec-kit-studio
npm install
npm run dev
```

Open the URL printed by the server. Git Bash and WSL are not required on Windows.

## Validate your checkout

```bash
npm run verify
```

This runs TypeScript checking, the complete Node test suite, connector packaging, the Vite production build, bundle-budget checks, and server bundles. Before a deployable release, run:

```bash
npm run verify:production
```

That additionally starts the built server and probes production behavior.

## First useful run

1. Open **Connected Workspace**.
2. Start the optional connector and scan one repository.
3. Review detected Git and technology evidence.
4. Start delivery from a **Feature** or **User story**.
5. Review scope, impact, design, tasks, and audit findings.
6. Create a linked worktree before implementation.
7. Run one approved task and inspect its changed files and verification receipt.
8. At handoff, choose the strict engine package or Studio delivery-evidence
   package. After committing and pushing the clean feature branch, optionally
   create a GitHub PR through the developer's local `gh` session.

Continue with [[Delivery Workflow]] or configure [[Local Connector]].

## Canonical references

- [Complete README and environment variables](https://github.com/rraviku2_uhg/spec-kit-studio#quick-start)
- [Documentation index](https://github.com/rraviku2_uhg/spec-kit-studio/blob/main/docs/README.md)
- [Regulated deployment](https://github.com/rraviku2_uhg/spec-kit-studio/blob/main/docs/regulated-deployment.md)

---

[Project site](https://rraviku2-uhg.github.io/spec-kit-studio/) · [[Home]] · [[FAQ]]
