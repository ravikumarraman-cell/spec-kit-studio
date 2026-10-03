# Open-source publishing checklist

Spec-Kit Studio is licensed for collaborative source development under the Apache License 2.0. It also has a documented local setup, an automated verification command, contributor guidance, a code of conduct, a security-policy template, issue forms, and dependency-update configuration.

Licensing does not by itself make a repository ready for a supported public release. The remaining work includes a public URL and release process, configured private security reporting, history review, and named maintainers.

## Maintainer decisions required before publishing

1. Confirm ownership of all source code, assets, dependencies, and contributed material covered by the Apache License 2.0. Obtain legal guidance where ownership is uncertain.
2. Publish the repository under its final organization/account and add its canonical clone URL to the README.
3. Configure GitHub private vulnerability reporting or a monitored security email, then replace the placeholder language in `SECURITY.md` and `CODE_OF_CONDUCT.md`.
4. Enable branch protection for the default branch: pull-request review, passing `npm run verify`, and resolved conversations.
5. Configure the repository's issue labels, discussions, release notes, and maintainers.
6. Perform a clean-clone verification with Node 22, including `npm ci` and `npm run verify`.
7. Review git history for credentials, private repository paths, customer names, and proprietary material before making it public.

## Recommended first release

Tag the first public release only after the checklist is complete. Its notes should state what Studio actually does, its local-first and human-review boundaries, supported Node version, known limitations, and how security reports are handled. Do not promise hosted synchronization, agent correctness, remote GitHub/Jira access, or support levels that have not been implemented and staffed.
