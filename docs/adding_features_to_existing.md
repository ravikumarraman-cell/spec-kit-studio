# Adding a feature to an existing repository

This guide describes the workflow the current Studio supports. It is a planning and evidence tool; it does not replace repository review, tests, CI, or approval.

## 1. Connect the repository

Use **Connected Workspace** with the optional local connector to scan a local repository. The scan collects a bounded file inventory, manifests, Git state, detected commands, and technology evidence. Studio does not clone a URL or infer private repository contents from a repository URL alone.

Configure the connector with an intentionally narrow `STUDIO_ALLOWED_ROOTS` value. Review the displayed baseline before continuing.

## 2. Start a delivery item

Choose **Feature** for the existing feature-first flow, or **User story** for one selected story. Feature remains the default, but a user story is a complete entry point; it does not need a parent feature.

In **Start delivery work → User story**, choose either **Write or import** or **Choose existing**. The first path accepts pasted text and `.md`, `.txt`, or `.json` uploads, then lets the reviewer edit the title, persona, desired outcome, value, priority, and acceptance criteria. The second path searches workspace stories and requires the reviewer to select only the functional requirements that the use case needs. Story scope owns one primary story and those selected requirements; related stories remain context, not planned work.

Review the imported or entered scope, acceptance criteria, compatibility boundaries, and mapped requirements before accepting it.

## 3. Review the planning artifacts

The guided journey has stages for impact, design, task planning, and audit. Use them to record relevant code paths, contracts, test conventions, constraints, and risks.

Generated artifacts are candidates for review. An audit score or generated plan is not proof that the repository behavior is correct or complete.

## 4. Implement in isolation

Before local-agent implementation, create a linked Git worktree through the connector and confirm its registered repository, branch, and path. Studio's local-agent action requires explicit confirmation and performs preflight checks. It does not commit, push, open a pull request, or deploy.

Run one approved task at a time. Inspect changed files and focused checks before retaining a receipt.

## 5. Verify and preserve the result

Run the relevant repository verification command, review the result, and use the handoff view to identify remaining work. Export the package and commit the reviewed, repository-relative artifacts with the implementation. Browser state is local convenience data, not the durable team record.
