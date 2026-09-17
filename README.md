# 🚀 Spec-Kit Studio
> **Powered natively by `spec-kit` (GitHub Spec-Kit)**  
> *The Official Visual & Interactive Studio for GitHub `spec-kit` and Spec-Driven Development (SDD)*  
> *Transform ambiguous ideas into deterministic software architecture. Seamlessly bridge high-level product intent, structural plans, AI agent execution, and existing legacy codebases across any technology stack using the official `spec-kit` standard.*

---

> 🌟 **CORE HIGHLIGHT: Built on `spec-kit`**  
> **Spec-Kit Studio** is natively powered by **`spec-kit`** — the official GitHub framework for Spec-Driven Development. Every specification, architecture plan, task board, and constitution rule managed in this studio conforms 100% to the standard `.spec-kit` repository structure (`spec.md`, `plan.md`, `tasks.md`, `rules.md`, and `specify.sh`), providing seamless interoperability with the `spec-kit` CLI, GitHub workflows, and AI coding assistants (Cursor, Claude Code, Windsurf, Copilot, Gemini).

---

> ⚡ **ENTERPRISE SCALE: Powered by TanStack & Deep GitHub/Jira Integrations**  
> Spec-Kit Studio incorporates the **TanStack Stack** (`@tanstack/react-query` & `@tanstack/react-table`) for background caching, optimistic state updates, and high-density matrix views. It integrates directly with **GitHub REST APIs** (PAT authentication, repo browsing, direct `.spec-kit` commits) and **Jira Cloud** (project search, ticket creation, user story syncing).

---

## 📖 Table of Contents
1. [The Philosophy: Why Spec-Driven Development (SDD)?](#-the-philosophy-why-spec-driven-development-sdd)
2. [Core Architecture: The 4 Pillars of SDD](#-core-architecture-the-4-pillars-of-sdd)
3. [End-to-End Process Flow](#-end-to-end-process-flow)
4. [Importing an Existing Project or Repository](#-importing-an-existing-project-or-repository)
5. [Generating New Functionality & Feature Merging](#-generating-new-functionality--feature-merging)
6. [Tech Stack Independence & Agnostic Execution](#-tech-stack-independence--agnostic-execution)
7. [AI Agent Orchestration & Prompt Snippets](#-ai-agent-orchestration--prompt-snippets)
8. [Spec Quality Audit & Governance](#-spec-quality-audit--governance)
9. [CLI & Spec Export Engine](#-cli--spec-export-engine)
10. [Quick Start Guide](#-quick-start-guide)

---

## 🧠 The Philosophy: Why Spec-Driven Development (SDD)?

In the era of modern AI coding agents (Cursor, Claude Code, Windsurf, Copilot, Gemini), software development bottleneck has shifted from **writing syntax** to **architectural intent and context precision**. 

When AI agents are given loose prompts or unstructured issue tickets, software inevitably suffers from:
* **Context Drift & Hallucination**: AI agents invent unrequested libraries, break API contracts, or write code that violates existing architecture.
* **Refactoring Nightmares**: New features inadvertently break non-functional requirements, security boundaries, or existing database schemas.
* **Loss of Requirement Traceability**: Product specifications live in Google Docs, tasks live in Jira, code lives in GitHub, and zero connection ties them together.

### The Spec-Kit Solution
**Spec-Kit Studio** introduces a rigorous, human-in-the-loop, **Spec-Driven Development (SDD)** layer. By establishing a single source of truth (`spec.md`, `plan.md`, `tasks.md`, `rules.md`), Spec-Kit Studio enforces deterministic alignment between human product vision and AI agent code generation.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SPEC-KIT STUDIO                               │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────┐ │
│  │ Constitution │ ── │ Feature Spec │ ── │ Architect    │ ── │ Phased │ │
│  │ Rules        │    │ User Stories │    │ Plan & API   │    │ Tasks  │ │
│  └──────────────┘    └──────────────┘    └──────────────┘    └────────┘ │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
      ┌──────────────────────────────────────────────────────────────┐
      │               DETERMINISTIC CONTEXT PROMPT                   │
      │   Targeted for Cursor, Claude Code, Windsurf, Copilot, etc.  │
      └──────────────────────────────┬───────────────────────────────┘
                                     │
                                     ▼
      ┌──────────────────────────────────────────────────────────────┐
      │                EXISTING CODEBASE INTEGRATION                 │
      │      React / Next / Python / Go / Rust / Java / Rails / etc. │
      └──────────────────────────────────────────────────────────────┘
```

---

## 🏛 Core Architecture: The 4 Pillars of SDD

Spec-Kit Studio models every software workspace using four synchronized specification artifacts:

| Pillar | File | Primary Responsibility | Key Elements |
| :--- | :--- | :--- | :--- |
| **1. Constitution** | `rules.md` | Non-negotiable engineering invariants & governance | Tech constraints, security policies, coding standards, performance SLAs |
| **2. Feature Spec** | `spec.md` | Product requirements & user stories | `As a... I want to... So that...`, Acceptance Criteria (Given/When/Then) |
| **3. Architecture Plan** | `plan.md` | System design & technical contracts | Tech stack, DB schemas, REST/gRPC API contracts, component boundaries |
| **4. Phased Tasks** | `tasks.md` | Actionable, step-by-step implementation tasks | Phased breakdown, dependencies, requirement mapping (`US-101` $\rightarrow$ `TASK-201`) |

---

## 🔄 End-to-End Process Flow

Spec-Kit Studio guides software development through a deterministic 5-stage lifecycle:

```
  ┌─────────────────┐
  │ 1. INTROSPECT   │  Import existing repo zips, manifests, or raw PRD features
  └────────┬────────┘
           │
  ┌────────┴────────┐
  │ 2. SPECIFY      │  Synthesize structured User Stories, FRs, and Acceptance Criteria
  └────────┬────────┘
           │
  ┌────────┴────────┐
  │ 3. ARCHITECT    │  Define data schemas, API contracts, and technology stack boundaries
  └────────┬────────┘
           │
  ┌────────┴────────┐
  │ 4. DECOMPOSE    │  Generate dependency-mapped tasks grouped by implementation phases
  └────────┬────────┘
           │
  ┌────────┴────────┐
  │ 5. ORCHESTRATE  │  Export AI agent prompts, CLI scripts, and sync with IDE agents
  └─────────────────┘
```

---

## 📦 Importing an Existing Project or Repository

One of the greatest capabilities of Spec-Kit Studio is its ability to **reverse-engineer existing codebases** into structured Spec-Kit specifications—regardless of age, scale, or language.

### How Existing Repo Import Works
1. **Navigate to Import Studio**: Click **"Import Project / Repo"** from the sidebar menu or workspace dropdown.
2. **Choose Your Source**:
   * **GitHub Repo / Issue URL**: Paste a repository or issue URL (e.g. `https://github.com/org/repo`).
   * **Manifest & Config Upload**: Upload existing dependency files (`package.json`, `Cargo.toml`, `go.mod`, `requirements.txt`, `pom.xml`, `Gemfile`, `Dockerfile`).
   * **Raw Source Code**: Paste existing source code snippets or structural trees.
3. **Automated AI Introspection**:
   * Spec-Kit Studio inspects your manifests to auto-detect frameworks, ORMs, database layers, and API standards.
   * It reverse-engineers existing capabilities into standardized `spec.md` user stories and `plan.md` architectural components.
4. **Instant Workspace Creation**: A new Spec-Kit Studio workspace is initialized with complete traceability mapped to your legacy codebase.

---

## ✨ Generating New Functionality & Feature Merging

When you need to add new capabilities to an existing project (e.g., adding OAuth 2.0, Stripe Subscriptions, or AI Vector Search), Spec-Kit Studio guarantees **zero disruption** to existing architecture.

### Step-by-Step Feature Integration Flow

```
   [ Raw Feature / PRD / Jira Ticket ]
                   │
                   ▼
       [ Feature Import Studio ]
                   │
  ┌────────────────┴────────────────┐
  │ AI Extraction & Story Engine    │
  │ • User Stories (As a...)        │
  │ • Acceptance Criteria (G/W/T)   │
  │ • Functional Requirements       │
  │ • Phased Implementation Tasks   │
  └────────────────┬────────────────┘
                   │
      ┌────────────┴────────────┐
      ▼                         ▼
 [ Create New Spec ]   [ Merge into Active Project ]
                         • Appends new user stories
                         • Preserves existing IDs (US-101, TASK-301)
                         • Updates Architecture Plan contracts
                         • Maintains Traceability Matrix
```

### The Merging Algorithm
When you choose **"Merge Feature into Active Workspace"**:
1. **Requirement ID Preservation**: Existing requirement IDs (e.g., `FR-101` through `FR-108`) remain untouched. New requirements are assigned incremental IDs (`FR-109`, `FR-110`).
2. **Schema & API Contract Expansion**: The active `plan.md` is updated with new database fields and endpoint routes without overwriting existing contracts.
3. **Phased Task Injection**: New tasks are categorized into incremental implementation phases (e.g., `Phase 3: OAuth 2.0 Integration`) with dependency links mapped back to prerequisite tasks.

---

## ⚡ Tech Stack Independence & Agnostic Execution

Spec-Kit Studio is strictly **tech-stack agnostic**. It operates at the architectural definition layer, making it equally powerful for any software stack:

| Technology Stack | Manifest Detected | Spec & Plan Output |
| :--- | :--- | :--- |
| **Node.js / TypeScript** | `package.json`, `tsconfig.json` | Express/Fastify routes, Prisma/Drizzle schemas, React/Vue components |
| **Python** | `requirements.txt`, `pyproject.toml` | FastAPI/Django endpoints, Pydantic models, SQLAlchemy schemas |
| **Go** | `go.mod` | Gin/Fiber handlers, GORM models, Go struct interfaces |
| **Rust** | `Cargo.toml` | Axum/Actix endpoints, Diesel/SQLx models, Serde structs |
| **Java / Kotlin** | `pom.xml`, `build.gradle` | Spring Boot controllers, JPA entities, DTO mapping |
| **Ruby** | `Gemfile` | Rails active-record models, controller actions, RSpec tests |
| **Flutter / Dart** | `pubspec.yaml` | Bloc/Riverpod states, Flutter widgets, REST clients |

---

## 🤖 AI Agent Orchestration & Prompt Snippets

Once your specification is defined or merged, Spec-Kit Studio converts your architectural artifacts into **battle-tested AI Agent Prompt Snippets**.

### Targeted Agent Prompts
From the **AI Agent Prompts** tab, you can copy pre-formatted, context-rich prompts tailored for:
* **Cursor**: Optimized with `@files` references and precise inline editing instructions.
* **Claude Code**: Tailored for terminal-based agent execution with bash boundary checks.
* **Windsurf**: Formatted for Cascade multi-file generation flows.
* **GitHub Copilot Workspace**: Optimized for issue-driven task plans.
* **Gemini Studio**: Formatted for high-context architectural reasoning.

### Sample Generated Prompt Snippet
```markdown
# TASK PROMPT: Implement Task TASK-204 (OAuth 2.0 Refresh Token Endpoint)

## Context & Invariants
- Project: Spec-Kit Studio Workspace
- Version: v1.0.7
- Constitution Rules: Follow non-negotiable security invariants in `rules.md` (JWT expiry <= 15m, Refresh token rotated in HttpOnly cookie).

## Target User Story
- Story ID: US-103 (User Token Refresh)
- User Story: As an authenticated user, I want my session seamlessly refreshed so that I do not experience mid-workflow logouts.

## Acceptance Criteria
- Given a valid refresh token cookie when calling POST /api/v1/auth/refresh then return a new access token (200 OK).
- Given an expired or revoked refresh token when calling POST /api/v1/auth/refresh then return 401 Unauthorized and clear auth cookies.

## Technical Requirements & File Boundaries
- Endpoint: POST /api/v1/auth/refresh
- Schema: Refer to Data Schema in `plan.md` section 3.2.
```

---

## 🛡 Spec Quality Audit & Governance

Spec-Kit Studio includes an automated **Spec Quality Audit** engine that scores your specifications across 5 dimensions:

1. **Completeness Score (0-100%)**: Detects unmapped requirements, missing acceptance criteria, or orphaned tasks.
2. **Acceptance Criteria Validation**: Ensures all user stories follow formal `Given / When / Then` formatting.
3. **Traceability Index**: Verifies that 100% of tasks in `tasks.md` map to at least one user story in `spec.md`.
4. **Architecture Drift Protection**: Highlights mismatches between specified technology packages and architecture plans.
5. **Security & Governance Checklist**: Validates that constitution rules (`rules.md`) are explicitly referenced in high-risk task prompts.

---

## 🛠 CLI & Spec Export Engine

Spec-Kit Studio provides seamless export options for local command-line usage and Git version control:

### One-Click Exporters
* **Export `.spec-kit` Zip**: Download a complete, standardized folder structure ready to commit directly to your Git repository:
  ```
  .spec-kit/
  ├── spec.md        # Feature Specifications & User Stories
  ├── plan.md        # Architecture Plan & Data Schemas
  ├── tasks.md       # Phased Implementation Task Board
  ├── rules.md       # Governance & Constitution Rules
  └── specify.sh     # Executable local CLI helper script
  ```
* **Export `spec.json`**: Machine-readable JSON representation for custom CI/CD automation and tooling.

---

## ⚡ Quick Start Guide

### 1. Launch Spec-Kit Studio
Open Spec-Kit Studio in your browser. The app defaults to the latest stable release (**v1.0.7**).

### 2. Choose Your Workflow
* **Option A (New Project)**: Click **"AI Spec Generator"** on the dashboard, describe your idea in natural language, and let the AI generate the entire 4-pillar specification.
* **Option B (Existing Project)**: Click **"Import Project / Repo"**, upload your project manifest or paste your GitHub URL, and generate your specification layer.
* **Option C (Add Feature)**: Click **"Import Feature / User Stories"**, paste a PRD or ticket description, and click **"Merge into Active Workspace"**.

### 3. Review & Refine
Use the **Feature Spec**, **Architecture Plan**, **Phased Task Board**, and **Constitution Rules** tabs to inspect and edit your specification.

### 4. Execute with AI Agents
Navigate to **AI Agent Prompts**, copy the prompt snippet for your active task, and paste it into Cursor, Claude Code, or Windsurf to build feature with 100% precision!

---

*Built for software engineers, product architects, and AI-first engineering teams.*  
**Spec-Kit Studio — Turning Ambiguity into Software.**
