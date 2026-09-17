# Spec-Kit Studio: Left Workflow Panel Architecture

Welcome to the **Spec-Kit Studio** Left Workflow Panel. This sidebar serves as your unified command center for translating raw concepts or existing repositories into fully structured, bulletproof, and AI-executable feature specifications.

Below is a detailed guide outlining what each workflow menu does, how it works, and the massive value-add it provides to your product specification pipeline.

---

```
  ┌────────────────────────────────────────────────────────┐
  │ 1. Workspace Hub (Overview Dashboard)                  │ ◄── Landing Hub
  └───────────────────────────┬────────────────────────────┘
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 2. Import Project / Repo (Automated Parser)            │ ◄── Automated Code Base Alignment
  └───────────────────────────┬────────────────────────────┘
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 3. Feature Spec (Functional & Non-Functional Core)     │ ◄── Dynamic Requirements (spec.md)
  └───────────────────────────┬────────────────────────────┘
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 4. Architecture Plan (Tech Stack, ADR, API, Schemas)   │ ◄── Software Architecture (plan.md)
  └───────────────────────────┬────────────────────────────┘
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 5. Phased Task Board (Actionable Kanban & Matrix)      │ ◄── Implementation Path (tasks.md)
  └───────────────────────────┬────────────────────────────┘
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 6. Constitution Rules (Governance & Standard Guards)   │ ◄── Project Rules & Compliance
  └───────────────────────────┬────────────────────────────┘
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 7. AI Agent Prompts (System Instructions Builder)      │ ◄── Zero-Hallucination Prompts
  └───────────────────────────┬────────────────────────────┘
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 8. Spec Quality Audit (Automated Validation Score)     │ ◄── Verification & Quality Check
  └───────────────────────────┬────────────────────────────┘
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 9. CLI & Repo Exporter (Direct CLI / Git Exporter)     │ ◄── Shell Deployment Command
  └───────────────────────────┴────────────────────────────┘
```

---

## 1. Workspace Hub (Overview Dashboard)
* **What it does:** The global workspace dashboard and control center. It summarizes project statistics, current version milestones, and presents your system's overall **Traceability Matrix**—visually connecting Functional Requirements, Architectural decisions, and Task coverage.
* **Value-Add:** Instantly inspect your project's health, track total tasks, and observe trace coverage. It provides high-level alignment, making it perfect for status checkups and keeping stakeholders aligned.

---

## 2. Import Project / Repo
* **What it does:** The **Universal Tech Stack AI Parser**. Lets you point Spec-Kit Studio at an existing Git repository, code-bundle, or file structure (Node.js, Python, Rust, Go, Java, Docker, etc.).
* **Value-Add:** Saves dozens of hours of manual entry. It automatically scans your directory, extracts dependencies, detects backend frameworks, databases, and structural libraries, and aligns your Specification Workspaces directly with what has already been written.

---

## 3. Feature Spec (`spec.md`)
* **What it does:** Manages your product core. Houses functional and non-functional requirements alongside structured user stories, edge cases, and acceptance criteria.
* **Value-Add:** Gives you a centralized, interactive matrix to add, edit, and link requirements to user stories. Your team gets crystal-clear guidelines, ensuring developers never have to guess "what to build."

---

## 4. Architecture Plan (`plan.md`)
* **What it does:** Bridges product spec with software engineering. Houses your official **Tech Stack**, **Architectural Decision Records (ADRs)**, **API Contracts**, and database **Data Schemas**.
* **Value-Add:** Allows you to formalize architectural choices (e.g., choosing PostgreSQL over DynamoDB) and design API payloads cleanly before writing a single line of code. Cuts down code-integration failures to zero.

---

## 5. Phased Task Board (`tasks.md`)
* **What it does:** An interactive, agile Kanban Board and backlog breakdown. Automatically phases tasks into Milestones (e.g., Phase 1: Core, Phase 2: Security, etc.) and tracks implementation status.
* **Value-Add:** Dynamically identifies **unmapped tasks** (tasks without associated product requirements) to prevent scope creep. Ensures 100% trace coverage from business idea to functional task.

---

## 6. Constitution Rules (`rules.md` / `rules.txt`)
* **What it does:** The governance layer of your project. Defines non-negotiable coding conventions, architectural invariants, security rules, and framework preferences.
* **Value-Add:** Acts as a compliance baseline. AI models and developers parse this file first, preventing standard style guide drift, configuration errors, and structural degradation in legacy codebases.

---

## 7. AI Agent Prompts
* **What it does:** Generates fully synthesized, contextual system instructions for Google Gemini, Antigravity, or other AI coding agents. 
* **Value-Add:** **Zero-Hallucination Engineering**. Instead of copy-pasting code, this module compiles your requirements, ADRs, database structures, and constitutional rules into a highly polished, machine-optimized context prompt. The AI codes perfectly with the exact context of your project.

---

## 8. Spec Quality Audit
* **What it does:** An automated diagnostic audit panel that scores your workspace (out of 100%). It validates traceability, identifies broken API links, calls out missing edge cases, and flags unmapped user stories.
* **Value-Add:** Immediate automated Quality Assurance (QA). Flags loopholes *before* shipping your product plan to devs, ensuring you only build complete, watertight architectures.

---

## 9. CLI & Repo Exporter
* **What it does:** The local development and shell integrator. Generates instant single-line export scripts (`specify.sh`) and packages your entire workspace into standalone Markdown assets.
* **Value-Add:** Portable and version-controlled. Allows you to run `curl https://specify.sh | bash` to sync your local environment, export full specifications into your Git branches, or build clean ZIP exports for external delivery.

---

*Spec-Kit Studio turns documentation into your application's absolute source of truth. Choose a module from the left to start specifying.*
