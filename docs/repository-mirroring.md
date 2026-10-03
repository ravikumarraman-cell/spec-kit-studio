# Studio mirror in Cloud Asset Inventory

Spec-Kit Studio has one canonical source repository:
[`rraviku2_uhg/spec-kit-studio`](https://github.com/rraviku2_uhg/spec-kit-studio).
The Cloud Asset Inventory repository hosts read-only mirrors so teams working
there can inspect the exact Studio source associated with a release or branch.

| Canonical Studio branch | Cloud Asset Inventory mirror | Purpose |
| --- | --- | --- |
| `main` | `skstudio/main` | Reviewed Studio release line |
| `develop` | `skstudio/develop` | Integration line before release |

## What the mirror is—and is not

The mirror is a one-way, commit-preserving copy of Studio source. It is useful
for discoverability, audit, source review, and incident investigation from the
Cloud Asset Inventory organization.

It is not a second development repository, a bidirectional synchronization
mechanism, a Git submodule, or an application dependency. Cloud Asset
Inventory contributors must not make direct changes on `skstudio/*` branches.
All Studio issues, pull requests, releases, and security remediation begin in
the canonical Studio repository.

This separation prevents two repositories from independently changing the
same history, which would make provenance and security review ambiguous.

## Security and verification coverage

Dependabot is configured only in the canonical Studio repository. It owns the
dependency-update pull requests for Studio's npm packages and GitHub Actions.
This keeps remediation review, ownership, and history in one place.

Every mirrored commit still receives Studio-owned checks. The mirrored source
contains the same workflows, and they explicitly recognize these target refs:

| Target mirror branch | Checks run from the Studio source |
| --- | --- |
| `skstudio/main` | Production verification, exact-lockfile `npm audit`, Studio CodeQL |
| `skstudio/develop` | Production verification, exact-lockfile `npm audit`, Studio CodeQL |

The audit gate evaluates the `package-lock.json` that was actually mirrored;
it fails on low-or-higher npm advisories. This deliberately covers a mirror
push even though Dependabot version-update pull requests are managed from the
canonical repository rather than each mirror branch.

Studio CodeQL is intentionally a small, source-owned JavaScript/TypeScript
analysis workflow. It never imports or invokes Cloud Asset Inventory build,
deployment, infrastructure, or credential workflows. Target repository
administrators must enable Actions and code scanning for `skstudio/*`, and
allow `github/codeql-action@v4` under their Actions policy. If code scanning
is not licensed or enabled for the target repository, CodeQL reports that
configuration problem; it must be enabled by an administrator rather than
bypassed.

## Automated synchronization

The canonical repository contains
[`mirror-cloud-asset-inventory.yml`](../.github/workflows/mirror-cloud-asset-inventory.yml).
It runs after a push to `main` or `develop`, or manually for one of those two
explicit branches. It maps only these approved branch names; arbitrary refs
cannot be mirrored.

The workflow uses a secret named `CLOUD_ASSET_INVENTORY_MIRROR_TOKEN` rather
than the canonical repository's `GITHUB_TOKEN`. Configure it as either:

- a fine-grained personal access token restricted to
  `optum-eeps/cloud-asset-inventory`, with **Contents: Read and write** only;
  or
- preferably, a GitHub App installation token limited to that same repository
  and permission.

Do not grant organization-wide administration, workflow, pull-request,
secrets, or packages permissions. Rotate the credential through normal
organization procedures. The workflow never prints the credential.

The push is intentionally non-force. If someone has changed a target mirror
branch directly, the workflow fails instead of overwriting that history.
Treat that failure as a provenance incident: inspect the target branch, retain
its evidence, remove or revert the unauthorized change through review, then
rerun the workflow. Do not add `--force` to make the failure disappear.

## Initial setup

An administrator with access to both repositories should:

1. Create `skstudio/main` and `skstudio/develop` from their corresponding
   canonical source branch through the workflow's first run or a reviewed
   bootstrap push.
2. Add `CLOUD_ASSET_INVENTORY_MIRROR_TOKEN` as an Actions secret in the
   canonical Studio repository.
3. Protect both target branches. Require pull-request review for human users,
   block force pushes and deletions, and allow only the designated GitHub App
   or mirror automation identity to bypass protection for the push.
4. Run the workflow manually once for `main` and once for `develop`.
5. Confirm each target SHA matches its source SHA with `git ls-remote` or the
   workflow log. Record the result in the release/change record when required.

For a local, reviewed bootstrap only, add the target as a separate remote and
push each explicit mapping. Never use this pattern as a standing bidirectional
sync:

```bash
git remote add cloud-asset-inventory https://github.com/optum-eeps/cloud-asset-inventory.git
git push cloud-asset-inventory main:skstudio/main
git push cloud-asset-inventory develop:skstudio/develop
```

## Operating and recovery rules

- Make Studio changes in `spec-kit-studio`, not in the mirror.
- Promote `develop` to `main` through the canonical repository's normal
  review and verification process. The mirror follows each branch separately.
- A failed mirror must not block a security fix in the canonical repository;
  repair target authorization or target-branch drift, then rerun the mirror.
- Never copy production credentials, connector pairing tokens, `.env.local`,
  or repository-local application data into either mirrored branch.
- The mirror does not give Studio repository access to Cloud Asset Inventory.
  Local connector access remains governed by `STUDIO_ALLOWED_ROOTS`, the
  connector's pairing policy, and explicit human confirmation.

## Consuming Studio from Cloud Asset Inventory

Use the mirror for inspection. If Cloud Asset Inventory needs to execute or
package Studio, pin a canonical Studio release, commit SHA, or published
artifact in that repository's own dependency/release process. Do not tell a
developer to switch their Cloud Asset Inventory checkout to `skstudio/*`; that
would replace their application branch instead of integrating a supported
Studio version.
