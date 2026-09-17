# 🚀 Spec-Kit Studio
> **The Official Visual & Interactive Studio for GitHub `spec-kit` and Spec-Driven Development (SDD)**  
> *Transform ambiguous product intent into deterministic software architecture. Seamlessly bridge high-level vision, technical plans, AI agent execution, and legacy codebases across any technology stack.*

---

[![GitHub Spec-Kit Version](https://img.shields.io/badge/spec--kit-v1.0.7-cyan?style=for-the-badge&logo=github)](https://github.com/github/spec-kit)
[![React Version](https://img.shields.io/badge/React-19.0-blue?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![TanStack](https://img.shields.io/badge/TanStack-Query_%26_Table-FF4154?style=for-the-badge&logo=reactquery)](https://tanstack.com)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)

---

> 🌟 **CORE HIGHLIGHT: Powered Natively by GitHub `spec-kit`**  
> **Spec-Kit Studio** is natively powered by **`spec-kit`** — the official framework for Spec-Driven Development. Every specification, architecture plan, task board, and constitution rule managed in this studio conforms 100% to the official `.spec-kit` repository structure (`spec.md`, `plan.md`, `tasks.md`, `rules.md`, and `specify.sh`), providing complete interoperability with the `spec-kit` CLI, GitHub Actions, and AI coding assistants (Cursor, Claude Code, Windsurf, Copilot, Gemini).

---

> ⚡ **ENTERPRISE SCALE: Powered by TanStack & Deep GitHub/Jira Integrations**  
> Spec-Kit Studio incorporates the **TanStack Stack** (`@tanstack/react-query` & `@tanstack/react-table`) for background state caching, optimistic UI updates, and high-density matrix views. It connects directly with **GitHub REST APIs** (PAT authentication, repository browsing, direct `.spec-kit` commits) and **Jira Cloud** (project search, ticket creation, user story synchronization).

---

## 📖 Table of Contents
1. [The Executive Summary: Why Spec-Driven Development (SDD)?](#-the-executive-summary-why-spec-driven-development-sdd)
2. [Core Architecture: The 4 Pillars of SDD](#-core-architecture-the-4-pillars-of-sdd)
3. [End-to-End Operational Lifecycle](#-end-to-end-operational-lifecycle)
4. [Enterprise Capabilities & Highlights](#-enterprise-capabilities--highlights)
   - [Native Spec-Kit v1.0.7 Core Engine](#1-native-spec-kit-v107-core-engine)
   - [TanStack Powered High-Density Matrix](#2-tanstack-powered-high-density-matrix)
   - [Direct GitHub Repository Synchronization](#3-direct-github-repository-synchronization)
   - [Jira Cloud Project & Ticket Sync](#4-jira-cloud-project--ticket-sync)
   - [Legacy Codebase Introspection & Import](#5-legacy-codebase-introspection--import)
   - [Zero-Disruption Feature Merging](#6-zero-disruption-feature-merging)
   - [AI Coding Agent Prompt Studio](#7-ai-coding-agent-prompt-studio)
   - [Spec Quality Audit & Governance Matrix](#8-spec-quality-audit--governance-matrix)
5. [Tech Stack Independence & Capability Matrix](#-tech-stack-independence--capability-matrix)
6. [Local Environment & Configuration](#-local-environment--configuration)
7. [Quick Start Guide](#-quick-start-guide)
8. [License & Ecosystem](#-license--ecosystem)

---

## 🧠 The Executive Summary: Why Spec-Driven Development (SDD)?

In the era of modern AI coding assistants (Cursor, Claude Code, Windsurf, Copilot Workspace, Gemini Studio), software development bottleneck has fundamentally shifted from **syntax authoring** to **architectural context precision**.

When AI agents are given unstructured prompts or loose Jira tickets, software projects inevitably suffer from:
* **Context Drift & Hallucinations**: AI agents invent unrequested packages, break API contracts, or write code that violates existing architecture.
* **Refactoring Nightmares**: New features inadvertently break non-functional requirements, security policies, or database schemas.
* **Fragmented Traceability**: Product specifications live in Google Docs, tasks live in Jira, code lives in GitHub, and zero connection ties them together.

### The Spec-Kit Studio Solution
**Spec-Kit Studio** introduces a human-in-the-loop, **Spec-Driven Development (SDD)** control plane. By establishing a single source of truth across four synchronized files (`spec.md`, `plan.md`, `tasks.md`, `rules.md`), Spec-Kit Studio enforces deterministic alignment between product vision, technical architecture, and AI agent execution.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                               SPEC-KIT STUDIO                                    │
├──────────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐    ┌───────────┐ │
│  │  Constitution  │ ── │  Feature Spec  │ ── │ Architecture   │ ── │  Phased   │ │
│  │   (rules.md)   │    │   (spec.md)    │    │ Plan (plan.md) │    │  Tasks    │ │
│  └────────────────┘    └────────────────┘    └────────────────┘    └───────────┘ │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
         ┌────────────────────────────────────────────────────────────────┐
         │             DETERMINISTIC CONTEXT PROMPT GENERATOR             │
         │     Optimized for Cursor, Claude Code, Windsurf, Copilot, etc. │
         └───────────────────────────────┬────────────────────────────────┘
                                         │
                                         ▼
         ┌────────────────────────────────────────────────────────────────┐
         │                  DIRECT GITHUB & JIRA SYNC                     │
         │    Commits .spec-kit files & creates Jira Stories automatically│
         └───────────────────────────────┬────────────────────────────────┘
                                         │
                                         ▼
         ┌────────────────────────────────────────────────────────────────┐
         │                 MULTI-STACK CODEBASE EXECUTION                 │
         │     TypeScript / Python / Go / Rust / Java / C# / Flutter      │
         └────────────────────────────────────────────────────────────────┘
```

---

## 🏛 Core Architecture: The 4 Pillars of SDD

Spec-Kit Studio models every software workspace using four synchronized specification artifacts conforming 100% to GitHub `spec-kit`:

| Pillar | Artifact File | Primary Responsibility | Key Elements |
| :--- | :--- | :--- | :--- |
| **1. Constitution** | `rules.md` | Non-negotiable engineering invariants & governance | Tech constraints, security policies, coding standards, performance SLAs |
| **2. Feature Spec** | `spec.md` | Product requirements & user stories | `As a... I want to... So that...`, Acceptance Criteria (Given/When/Then) |
| **3. Architecture Plan** | `plan.md` | System design & technical contracts | Tech stack, DB schemas, REST/gRPC API contracts, component boundaries |
| **4. Phased Tasks** | `tasks.md` | Actionable, step-by-step implementation tasks | Phased breakdown, dependencies, requirement mapping (`US-101` $\rightarrow$ `TASK-201`) |

### Standardized Directory Structure
When exported or committed to GitHub, Spec-Kit Studio generates the official `.spec-kit` repository bundle:
```
my-project/
├── .spec-kit/
│   ├── spec.md          # Product Requirements & User Stories
│   ├── plan.md          # Architecture Plan & Technical Contracts
│   ├── tasks.md         # Actionable Phased Implementation Tasks
│   ├── rules.md         # Constitution & Engineering Governance
│   └── specify.sh       # Executable local CLI helper script
├── src/                 # Application Source Code
└── package.json         # Project Dependencies
```

---

## 🔄 End-to-End Operational Lifecycle

Spec-Kit Studio guides software development through a deterministic 5-stage lifecycle:

```
  ┌───────────────────┐
  │ 1. INTROSPECT     │  Import existing repo zips, manifests, or raw PRD features
  └─────────┬─────────┘
            │
  ┌─────────┴─────────┐
  │ 2. SPECIFY        │  Synthesize structured User Stories, FRs, and Acceptance Criteria
  └─────────┬─────────┘
            │
  ┌─────────┴─────────┐
  │ 3. ARCHITECT      │  Define data schemas, API contracts, and technology stack boundaries
  └─────────┬─────────┘
            │
  ┌─────────┴─────────┐
  │ 4. DECOMPOSE      │  Generate dependency-mapped tasks grouped by implementation phases
  └─────────┬─────────┘
            │
  ┌─────────┴─────────┐
  │ 5. ORCHESTRATE    │  Sync with GitHub, push Jira tickets, and generate AI agent prompts
  └───────────────────┘
```

---

## ⚡ Enterprise Capabilities & Highlights

### 1. Native Spec-Kit v1.0.7 Core Engine
Spec-Kit Studio embeds the native GitHub `spec-kit` v1.0.7 engine under `vendor/spec-kit/`. It provides instant access to official preset catalogs, community extensions, and standardized markdown templates for `spec.md`, `plan.md`, `tasks.md`, and `rules.md`.

### 2. TanStack Powered High-Density Matrix
* **`@tanstack/react-query`**: Manages background asynchronous requests, query caching, stale-time policies, and optimistic UI states.
* **`@tanstack/react-table`**: Powers the **TanStack Matrix** view mode in the Spec Editor and Task Board, providing multi-column sorting, global search filtering, pagination, and dense tabular displays for hundreds of requirements.

### 3. Direct GitHub Repository Synchronization
Connect your GitHub Personal Access Token (PAT) to:
* Browse user repositories directly inside the studio.
* Select target branches (`main`, `develop`, feature branches).
* Commit generated `.spec-kit/` files (`spec.md`, `plan.md`, `tasks.md`, `rules.md`) directly to your remote repository with zero command-line friction.

### 4. Jira Cloud Project & Ticket Sync
Integrate Atlassian Jira Cloud (`company.atlassian.net`) to:
* Query Jira projects and boards automatically.
* Export Spec-Kit User Stories and Tasks directly into Jira as real Stories or Epics.
* Maintain bi-directional alignment between Jira ticket keys and Spec-Kit requirement IDs (`US-101` $\leftrightarrow$ `PROJ-142`).

### 5. Legacy Codebase Introspection & Import
Reverse-engineer existing repositories across any technology stack:
* **Manifest Parser**: Upload dependency manifests (`package.json`, `Cargo.toml`, `go.mod`, `requirements.txt`, `pom.xml`, `Gemfile`, `Dockerfile`).
* **Framework Introspection**: Automatically detects ORMs, database drivers, API frameworks, and styling engines.
* **Auto-Spec Generation**: Converts detected architecture into structured `spec.md` user stories and `plan.md` architectural components.

### 6. Zero-Disruption Feature Merging
When adding a new capability (e.g. OAuth 2.0, Stripe Payments, Vector Search) to an active project:
* **ID Preservation**: Existing requirement IDs (`FR-101` through `FR-108`) remain untouched. New requirements receive incremental IDs (`FR-109`).
* **Contract Expansion**: Automatically updates `plan.md` database models and API routes without overwriting existing contracts.
* **Phased Injection**: Inserts new implementation tasks into designated feature phases.

### 7. AI Coding Agent Prompt Studio
Converts specification items into copy-pasteable, context-rich prompt snippets tailored for specific AI coding assistants:
* **Cursor**: Formatted with `@files` directives and precise file boundaries.
* **Claude Code**: Optimized for terminal agent execution with bash verification checks.
* **Windsurf**: Structured for Cascade multi-file generation flows.
* **GitHub Copilot Workspace**: Tailored for issue-driven task plans.
* **Gemini Studio**: Optimized for high-context architectural reasoning.

### 8. Spec Quality Audit & Governance Matrix
Includes an automated spec health auditor that scores specifications across 5 criteria:
* **Completeness Score (0-100%)**: Detects unmapped requirements or orphaned tasks.
* **Given/When/Then Validation**: Verifies formal acceptance criteria formatting.
* **Traceability Index**: Guarantees 100% mapping between tasks and user stories.
* **Architecture Drift Protection**: Identifies conflicts between chosen packages and architecture plans.
* **Governance Checklist**: Ensures non-negotiable security invariants in `rules.md` are enforced.

---

## ⚡ Tech Stack Independence & Capability Matrix

Spec-Kit Studio operates at the specification layer, making it 100% stack-agnostic:

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

## 🛠 Local Environment & Configuration

Environment variables are managed via `.env` (see `.env.example`):

```env
# GEMINI_API_KEY: Required for Gemini AI specification generation
GEMINI_API_KEY="your-gemini-api-key"

# GITHUB_TOKEN: Optional GitHub PAT with repo scope for direct commits
GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# JIRA CONFIGURATION: Optional Jira Cloud credentials
JIRA_DOMAIN="company.atlassian.net"
JIRA_EMAIL="developer@company.com"
JIRA_API_TOKEN="ATATT3xFfGF0..."
```

---

## ⚡ Quick Start Guide

### 1. Launch Spec-Kit Studio
Start the development server:
```bash
npm run dev
```
Navigate to `http://localhost:3000` in your browser.

### 2. Choose Your Workflow
* **Option A (New Project)**: Click **"AI Spec Generator"**, describe your idea in natural language, and let Gemini generate the 4-pillar specification package.
* **Option B (Existing Codebase)**: Click **"Import Project / Repo"**, paste a GitHub URL or upload your project manifest, and generate an architectural specification layer.
* **Option C (Add Feature)**: Click **"Import Feature / User Stories"**, paste a PRD or ticket description, and click **"Merge into Active Workspace"**.

### 3. Review & Refine
Use the **Feature Spec**, **Architecture Plan**, **Task Board**, and **Constitution Rules** tabs to inspect, edit, or view the **TanStack Matrix**.

### 4. Sync & Execute
* Click **"GitHub & Jira Sync"** in the top navigation bar to commit `.spec-kit/` files directly to GitHub or push stories to Jira.
* Copy targeted prompt snippets from **AI Agent Prompts** into Cursor, Claude Code, or Windsurf to write code with 100% precision!

---

## 📜 License & Ecosystem

Licensed under the **MIT License**.  
Powered natively by **[GitHub `spec-kit`](https://github.com/github/spec-kit)**.

*Built for software engineers, product architects, and AI-first engineering teams.*  
**Spec-Kit Studio — Turning Ambiguity into Deterministic Software.**
