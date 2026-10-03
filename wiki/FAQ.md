# Frequently Asked Questions

## Does GitHub Pages run the Studio application?

No. The Pages site is the project and documentation front door. Studio uses an Express backend, so run it locally or deploy it using the documented production options.

## Is a cloud AI key required?

No. Gemini-backed generation is optional and disabled until configured. Studio retains local, reviewable drafting paths without it.

## Does Studio modify my connected checkout?

Implementation uses a registered linked worktree. Consequential connector actions require explicit confirmation, and allowed repository paths are confined to configured roots.

## Can Studio create a pull request?

At completed developer delivery, a developer may explicitly create a GitHub
pull request using the existing local `gh` sign-in. The linked-worktree branch
must already be clean, committed, and pushed. Studio records the PR details in
delivery evidence; it does not commit, push, merge, or deploy.

## What does a GovCloud or DoD label mean?

It means the application is operating in a fail-closed regulated deployment
mode: enterprise access is required and external AI egress is disabled unless
an approved in-boundary adapter exists. The visible banner is not a compliance
certification or authorization decision.

## Can I begin with one user story?

Yes. Feature and User story are equal entry points. A story does not need an artificial parent feature.

## Does it work on Windows?

The npm scripts, connector command resolution, managed tools, process cleanup, setup UI, and exported `specify.cmd` support native Windows. Use Node 22 and PowerShell; Git Bash and WSL are not required.

## Where is project data stored?

The browser workspace primarily uses IndexedDB. Export and commit reviewed packages when state must be durable and shared.

## Is generated output automatically approved?

No. Generated specifications, plans, tasks, audits, and code remain review candidates. Studio preserves the evidence needed for a person to decide.

## How do I validate a change?

Run `npm run verify`. Before a deployable release, run `npm run verify:production`.

## How do I report a problem?

- [Report a bug](https://github.com/rraviku2_uhg/spec-kit-studio/issues/new?template=bug_report.yml)
- [Request a feature](https://github.com/rraviku2_uhg/spec-kit-studio/issues/new?template=feature_request.yml)
- [Report a vulnerability privately](https://github.com/rraviku2_uhg/spec-kit-studio/blob/main/SECURITY.md)

---

[Project site](https://rraviku2-uhg.github.io/spec-kit-studio/) · [[Home]] · [[Getting Started]] · [[Local Connector]]
