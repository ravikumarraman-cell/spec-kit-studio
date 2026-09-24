# Open-source publishing checklist

Spec-Kit Studio is ready for collaborative source development in several practical ways: it has a documented local setup, an automated verification command, contributor guidance, a code of conduct, a security-policy template, issue forms, and dependency-update configuration.

It is not yet an open-source release. The repository currently has no license file, public URL, release process, or configured private security-reporting channel. Those omissions are deliberate to avoid making claims the project cannot support.

## Maintainer decisions required before publishing

1. Choose a license after confirming ownership of all source code, assets, dependencies, and contributed material. Common choices have different patent, attribution, and copyleft consequences; obtain legal guidance if needed.
2. Add the selected license as `LICENSE` at the repository root and update the package metadata only if npm publication is intended.
3. Publish the repository under its final organization/account and add its canonical clone URL to the README.
4. Configure GitHub private vulnerability reporting or a monitored security email, then replace the placeholder language in `SECURITY.md` and `CODE_OF_CONDUCT.md`.
5. Enable branch protection for the default branch: pull-request review, passing `npm run verify`, and resolved conversations.
6. Configure the repository's issue labels, discussions, release notes, and maintainers.
7. Perform a clean-clone verification with Node 22, including `npm ci` and `npm run verify`.
8. Review git history for credentials, private repository paths, customer names, and proprietary material before making it public.

## Recommended first release

Tag the first public release only after the checklist is complete. Its notes should state what Studio actually does, its local-first and human-review boundaries, supported Node version, known limitations, and how security reports are handled. Do not promise hosted synchronization, agent correctness, remote GitHub/Jira access, or support levels that have not been implemented and staffed.
