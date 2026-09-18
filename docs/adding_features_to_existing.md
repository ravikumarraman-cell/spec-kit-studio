# Spec-Kit Studio: Adding Features to an Existing Project

This guide provides a detailed, step-by-step walkthrough on how to leverage **Spec-Kit Studio** to plan, architect, map, and implement new features into an existing codebase (e.g., your `cloud-asset-inventory` project). 

---

```
                                WORKFLOW OVERVIEW
                                
 ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
 │   1. IMPORT     │ ──► │  2. FEAT SPEC   │ ──► │  3. ARCH PLAN   │ ──► │  4. TASK BOARD  │
 │ Align codebase  │     │ Define stories  │     │ Schemas & APIs  │     │ Map trace backlog│
 └─────────────────┘     └─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                                                  │
                                                                                  ▼
 ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
 │   8. VERSION    │ ◄── │   7. EXPORTER   │ ◄── │  6. AGENT PROMPT│ ◄── │   5. QA AUDIT   │
 │ Push local git  │     │ CLI & File sync │     │ Gen AI prompt   │     │ Validate score  │
 └─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Step 1: Import and Align Your Existing Codebase
The first objective is alignment. Spec-Kit Studio must understand your existing stack to contextualize new features.

1. Navigate to **Import Project / Repo** from the left-hand menu.
2. Provide the local path or point to your repository link (e.g., `/workspaces/cloud-asset-inventory`).
3. The **Universal Tech Stack AI Parser** scans your codebase configurations (such as `package.json`, `go.mod`, `requirements.txt`, or Docker configuration files).
4. **Value-Add:** It automatically extracts your technologies and sets up an aligned workspace baseline. This ensures any specifications you generate later remain fully compatible with your existing languages and patterns.

---

## Step 2: Formulate Feature Specifications (`spec.md`)
Now, define "what" needs to be built from a product perspective.

1. Open the **Feature Spec** module.
2. Under **Functional Requirements**, create unique IDs for your requirements (e.g., `REQ-CAI-101: Auto-remediation of public S3 buckets`).
3. Add detailed **User Stories** connected to these requirements:
   * *Format:* "As a [role], I want to [action] so that [business value]."
   * *Example:* "As a Security Admin, I want to toggle an auto-remediate policy so that public storage buckets are shut down instantly."
4. Expand on **Edge Cases & Failure Modes**:
   * *What happens if the scanning API rate limit is exceeded?*
   * *How does the system handle accounts with millions of active resources?*
5. **Value-Add:** Centralizes your expectations. Eliminates communication gaps between product designers and engineers before any code is drafted.

---

## Step 3: Establish the Architecture Plan (`plan.md`)
Translate product specifications into concrete, clean technical structures.

1. Navigate to the **Architecture Plan** module.
2. **Review Tech Stack:** Confirm your scanned dependencies are listed. Add any libraries you intend to introduce (e.g., `@google-cloud/asset` or AWS SDK).
3. **Draft API Contracts:**
   * Declare new endpoints needed for this feature (e.g., `POST /api/v1/remediate`).
   * Explicitly define JSON request bodies, header validation, and response codes (`200 OK`, `400 Bad Request`, `429 Too Many Requests`).
4. **Formulate Data Schemas:** Update database entity relationships, table schemas, or model schemas to persist new features (e.g., adding an `is_auto_remediated` boolean column to your assets table).
5. **Log Architectural Decisions (ADRs):** Write brief ADR logs explaining *why* certain structural choices were made.
6. **Value-Add:** Prevents structural drift. Engineers can integrate components seamlessly without breaking existing tables or services.

---

## Step 4: Map Actionable Phased Tasks (`tasks.md`)
Deconstruct the architectural plan into manageable backlog tasks.

1. Head to the **Phased Task Board**.
2. Create distinct development tasks grouped by phased milestones:
   * **Phase 1 (Database/API):** Core schema migrations and mock API handlers.
   * **Phase 2 (Business Logic):** Core scan-and-remediate workers.
   * **Phase 3 (Dashboard/UI):** Visual toggles and audit tables.
3. **Map the requirements:** For every card you create, select the corresponding Requirement ID (`REQ-CAI-101`) in the card options.
4. **Value-Add:** Any task without an assigned requirement is marked as **Unmapped**. This highlights scope creep instantly and guarantees a perfect traceability matrix.

---

## Step 5: Perform a Spec Quality Audit
Check your specifications for loops, holes, or unassigned modules.

1. Go to the **Spec Quality Audit** dashboard.
2. Analyze the overall **Specification Quality Score** (targeted for 95%+).
3. Review audit cards calling out:
   * Unmapped User Stories
   * Functional requirements missing technical contracts
   * Edge cases without a validation task
4. Address the suggestions until your Quality Score is validated.
5. **Value-Add:** Acts as automated Quality Assurance (QA).Catches planning errors at design-time, saving hundreds of engineering hours during active development.

---

## Step 6: Generate Zero-Hallucination AI Coding Prompts
You are now ready to write code. Spec-Kit Studio bridges the spec directly to AI assistants.

1. Select **AI Agent Prompts** in the left menu.
2. Click **Synthesize Prompts**.
3. The prompt compiler merges your complete technical specification, APIs, database schemas, coding rules, and task lists into a pristine machine-optimized prompt.
4. Copy this prompt and paste it directly into **Google Gemini**, **Cursor**, or your team's AI IDE.
5. **Value-Add:** Because the prompt contains your exact code boundaries, APIs, and rules, the AI coding assistant will generate highly accurate, functional code with **zero hallucinations** and absolute consistency.

---

## Step 7: Export Spec Assets and Synchronize Locally
Bring your specifications directly into your local workspace.

1. Open the **CLI & Repo Exporter** panel.
2. Use the provided single-line terminal command:
   ```bash
   curl -s https://specify.sh | bash
   ```
3. This downloads and updates the physical spec assets (`spec.md`, `plan.md`, `tasks.md`, `rules.md`) directly inside your local repository folder.
4. **Value-Add:** Keeps documentation in perfect sync alongside your functional code.

---

## Step 8: Commit & Track Your Feature Version
1. Review changes locally inside your git shell.
2. Commit your code alongside your fresh Spec-Kit markdown documents:
   ```bash
   git add spec.md plan.md tasks.md src/
   git commit -m "feat: implement public storage bucket auto-remediation"
   git push origin main
   ```
3. **Value-Add:** Your technical documentation, product specifications, and code remain version-controlled together, creating a unified timeline of feature growth.