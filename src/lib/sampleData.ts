import { SpecKitProject } from '../types/speckit';
import { SPECKIT_VERSION } from './specKitCompliance';

export const SAMPLE_PROJECTS: SpecKitProject[] = [
  {
    id: 'proj-spec-kit-studio',
    name: 'Spec-Kit Studio Workspace',
    description: 'Visual Spec-Driven Development Studio Layer for GitHub Spec-Kit framework',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: SPECKIT_VERSION,
    spec: {
      id: 'spec-1',
      title: 'Spec-Kit Studio Visual Dashboard',
      summary: 'A unified, dark-mode prioritized specification studio offering 100% of GitHub Spec-Kit CLI features in an ultra-intuitive dashboard UI.',
      userStories: [
        {
          id: 'US-101',
          title: 'Interactive Visual Spec Creation',
          priority: 'High',
          asA: 'Product Architect',
          iWantTo: 'create and refine feature specifications using an interactive wizard or visual form',
          soThat: 'I can define requirements fast without manually structuring complex markdown files',
          acceptanceCriteria: [
            'Renders form fields for User Stories, FRs, and NFRs',
            'Auto-compiles input into official spec.md format',
            'Supports AI auto-completion via Gemini backend'
          ]
        },
        {
          id: 'US-102',
          title: 'Phased Task Kanban & Requirement Matrix',
          priority: 'High',
          asA: 'Engineering Lead',
          iWantTo: 'visualize tasks broken down by phase and map them directly to functional requirements',
          soThat: 'I can verify 100% testable requirement coverage before starting implementation',
          acceptanceCriteria: [
            'Filter tasks by Phase 1 to Phase 4',
            'Drag or click tasks to transition between Todo, In Progress, and Done',
            'Display requirement traceability mapping badge'
          ]
        },
        {
          id: 'US-103',
          title: 'AI Coding Agent Prompt Generator',
          priority: 'High',
          asA: 'Developer',
          iWantTo: 'generate agent-ready prompts tailored for Claude, Gemini, Cursor, or Copilot',
          soThat: 'my AI coding assistant has full spec context and zero ambiguity',
          acceptanceCriteria: [
            'Select target agent framework',
            'Inject spec, plan, and constitution context automatically',
            'Provide one-click copy and simulated response preview'
          ]
        }
      ],
      functionalRequirements: [
        {
          id: 'FR-101',
          title: 'Offline-First IndexedDB Persistence',
          description: 'Persist projects in IndexedDB with a localStorage fallback when IndexedDB is unavailable.',
          category: 'Core',
          priority: 'High'
        },
        {
          id: 'FR-102',
          title: 'Architectural Mermaid Diagram Rendering',
          description: 'Render interactive system architecture flowcharts using Mermaid.js.',
          category: 'UI/UX',
          priority: 'High'
        },
        {
          id: 'FR-103',
          title: 'Spec Health Quality Audit Engine',
          description: 'Analyze specs for completeness score, missing requirement gaps, and ambiguity risks.',
          category: 'Security',
          priority: 'High'
        },
        {
          id: 'FR-104',
          title: 'One-Click Spec-Kit CLI Repo Bundler',
          description: 'Export complete .spec-kit file hierarchy and specify.sh scripts in a single ZIP file.',
          category: 'Integration',
          priority: 'Medium'
        }
      ],
      nonFunctionalRequirements: [
        {
          id: 'NFR-101',
          title: 'Fluid Desktop & Mobile Responsiveness',
          description: 'Layout adjusts dynamically across 320px mobile screens to 4K desktop displays.',
          metric: 'Zero horizontal layout overflows'
        },
        {
          id: 'NFR-102',
          title: 'Instant Startup & High Frame Rate',
          description: 'Lightweight client bundle with micro-second state transitions.',
          metric: '<200ms view state load'
        }
      ],
      userFlows: [
        'User opens Spec-Kit Studio -> selects project template or creates new spec',
        'User fills User Stories & Requirements -> triggers AI auto-refinement',
        'System generates Implementation Plan with Tech Stack, Data Schema & Mermaid Diagram',
        'System breaks down tasks into Phase 1-4 Kanban board with requirement trace matrix',
        'User generates AI Agent prompt or exports full .spec-kit repository bundle as ZIP'
      ],
      edgeCases: [
        'User loses internet connectivity while editing -> changes are saved locally in IndexedDB',
        'Spec content contains invalid markdown syntax -> parser fallback prevents dashboard crash',
        'Large project imports use browser-managed IndexedDB capacity rather than the small localStorage quota'
      ],
      successMetrics: [
        '100% feature parity with GitHub Spec-Kit CLI workflow',
        'Spec setup time reduced from 45 minutes to <3 minutes using AI wizard',
        'Zero data loss with continuous background sync'
      ],
      markdown: `# Spec-Kit Studio Visual Dashboard

## Executive Summary
Spec-Kit Studio provides a visual, zero-cognitive-overload studio layer over GitHub's spec-kit specification-driven development standard.

## Functional Requirements
- **FR-101**: Offline-First IndexedDB Persistence
- **FR-102**: Architectural Mermaid Diagram Rendering
- **FR-103**: Spec Health Quality Audit Engine
- **FR-104**: One-Click Spec-Kit CLI Repo Bundler`,
      lastUpdated: new Date().toISOString()
    },
    plan: {
      id: 'plan-1',
      architectureSummary: 'Full-stack Express + Vite React application with client-side reactive state engine, IndexedDB offline persistence, and server-side Gemini 3.8 Flash intelligence proxy.',
      techStack: [
        { category: 'Frontend UI', technology: 'React 19 + Vite + Tailwind CSS v4', justification: 'High performance rendering with zero CSS runtime overhead' },
        { category: 'Animations', technology: 'Motion', justification: 'Fluid layout transitions and interactive UI feedback' },
        { category: 'Icons', technology: 'Lucide React', justification: 'Clean, consistent vector iconography' },
        { category: 'Diagramming', technology: 'Mermaid.js', justification: 'Native rendering of architectural flowcharts and sequence diagrams' },
        { category: 'Export Engine', technology: 'JSZip', justification: 'Client-side ZIP packaging for repository specs and CLI scripts' },
        { category: 'AI Backend', technology: '@google/genai (Gemini 3.8 Flash)', justification: 'Server-side API routes for spec generation and quality audits' }
      ],
      components: [
        { name: 'OverviewDashboard', purpose: 'Central hub showing completion metrics, trace matrix, and phase status', layer: 'Frontend' },
        { name: 'SpecEditor', purpose: 'Form & Markdown studio for managing user stories and requirements', layer: 'Frontend' },
        { name: 'PlanEditor', purpose: 'Architectural plan studio with API specs, ADRs, and Mermaid diagrams', layer: 'Frontend' },
        { name: 'TaskBoard', purpose: 'Phased Kanban board with requirement mapping and prompt triggers', layer: 'Frontend' },
        { name: 'AuditDashboard', purpose: 'Spec health analyzer with radar scores and automated fixes', layer: 'Frontend' }
      ],
      apiContracts: [
        { id: 'API-1', method: 'POST', path: '/api/spec/generate', description: 'AI-assisted feature spec generator', payload: '{ topic: string, focusAreas: string[] }', response: '{ success: true, data: FeatureSpec }' },
        { id: 'API-2', method: 'POST', path: '/api/plan/generate', description: 'Architectural plan and diagram generator', payload: '{ specTitle: string, requirements: [] }', response: '{ success: true, data: ImplementationPlan }' },
        { id: 'API-3', method: 'POST', path: '/api/audit/analyze', description: 'Spec completeness and health score auditor', payload: '{ specContent: string, planContent: string }', response: '{ success: true, data: SpecAuditResult }' }
      ],
      dataSchemas: [
        {
          modelName: 'SpecKitProject',
          fields: [
            { name: 'id', type: 'string', required: true, description: 'Unique project ID' },
            { name: 'name', type: 'string', required: true, description: 'Project title' },
            { name: 'spec', type: 'FeatureSpec', required: true, description: 'Specification payload' },
            { name: 'plan', type: 'ImplementationPlan', required: true, description: 'Technical design plan' },
            { name: 'tasks', type: 'TaskBreakdown', required: true, description: 'Phased task list' }
          ]
        }
      ],
      adrs: [
        {
          id: 'ADR-001',
          title: 'Server-Side Gemini API Proxy Architecture',
          status: 'Accepted',
          context: 'API keys must remain strictly protected on the server side while delivering real-time AI assistance to the browser client.',
          decision: 'Construct dedicated Express server endpoints at /api/* using @google/genai SDK with server environment key injection.',
          consequences: 'Complete security compliance, seamless client experience, and safe execution.',
          date: '2026-09-17'
        },
        {
          id: 'ADR-002',
          title: 'IndexedDB Persistence Strategy',
          status: 'Accepted',
          context: 'Users require uninterrupted workspace usage even when offline or during transient network interruptions.',
          decision: 'Persist the workspace in IndexedDB, migrate legacy localStorage data once, and keep a synchronous in-memory UI cache.',
          consequences: 'Zero reliance on continuous server network ping for basic editing.',
          date: '2026-09-17'
        }
      ],
      mermaidDiagram: `graph TD
    A[User Client UI - Spec-Kit Studio] -->|Reactive State| B[IndexedDB Cache Engine]
    A -->|AI Requests| C[Express Backend Server]
    C -->|"@google/genai SDK"| D[Gemini 3.8 Flash AI Engine]
    A -->|Repo Export| E[JSZip Exporter]
    E -->|.spec-kit ZIP & specify.sh| F[User Local Workspace]`,
      markdown: `# Technical Implementation Plan
## Architecture
Full-stack Express + Vite architecture with client-side offline storage and Gemini server proxy.`,
      lastUpdated: new Date().toISOString()
    },
    tasks: {
      id: 'task-1',
      tasks: [
        {
          id: 'TASK-101',
          title: 'Initialize Workspace Core & IndexedDB Persistence',
          phase: 'Phase 1: Setup',
          description: 'Establish local persistence, project switcher, and state synchronization listeners.',
          status: 'done',
          estimatedHours: 3,
          mappedRequirementId: 'FR-101',
          dependencies: [],
          targetAgentPromptSnippet: 'Implement IndexedDB storage service with localStorage fallback and project seed loader.'
        },
        {
          id: 'TASK-102',
          title: 'Build Visual Spec Editor & AI Enhancement Wizard',
          phase: 'Phase 2: Core Infrastructure',
          description: 'Construct story builder, functional requirement table, and AI prompt refiner.',
          status: 'done',
          estimatedHours: 5,
          mappedRequirementId: 'FR-102',
          dependencies: ['TASK-101'],
          targetAgentPromptSnippet: 'Build React SpecEditor component with interactive user story cards and Gemini AI spec generation modal.'
        },
        {
          id: 'TASK-103',
          title: 'Implement Interactive Architecture Plan & Mermaid Viewer',
          phase: 'Phase 2: Core Infrastructure',
          description: 'Integrate Mermaid.js flowchart renderer, ADR editor, and data schema builder.',
          status: 'done',
          estimatedHours: 4,
          mappedRequirementId: 'FR-102',
          dependencies: ['TASK-102'],
          targetAgentPromptSnippet: 'Construct PlanEditor with dynamic Mermaid.js diagram viewer and interactive API contract table.'
        },
        {
          id: 'TASK-104',
          title: 'Develop Phased Kanban Task Board & Trace Matrix',
          phase: 'Phase 3: Integration',
          description: 'Create phase-grouped task cards, drag/click status transitions, and requirement mapping badges.',
          status: 'in_progress',
          estimatedHours: 6,
          mappedRequirementId: 'FR-103',
          dependencies: ['TASK-103'],
          targetAgentPromptSnippet: 'Build TaskBoard component with Phase 1 to 4 tab filtering, estimation totals, and prompt preview modal.'
        },
        {
          id: 'TASK-105',
          title: 'Integrate Spec Health Audit & AI Agent Prompt Studio',
          phase: 'Phase 3: Integration',
          description: 'Implement audit scoring radar, missing gap detector, and agent-specific prompt formatter.',
          status: 'in_progress',
          estimatedHours: 4,
          mappedRequirementId: 'FR-103',
          dependencies: ['TASK-104'],
          targetAgentPromptSnippet: 'Build AuditDashboard and PromptStudio components linking to /api/audit/analyze and /api/prompt/generate.'
        },
        {
          id: 'TASK-106',
          title: 'Implement Spec-Kit CLI Zip Exporter & Command Palette',
          phase: 'Phase 4: Polish & Testing',
          description: 'Add JSZip packager for specify.sh, .spec-kit repository layout, and Cmd+K quick search.',
          status: 'todo',
          estimatedHours: 3,
          mappedRequirementId: 'FR-104',
          dependencies: ['TASK-105'],
          targetAgentPromptSnippet: 'Construct CliExporter utility to bundle specify.sh, spec.md, plan.md, tasks.md, and constitution.md into a ZIP.'
        }
      ],
      markdown: `# Phased Task Breakdown
- [x] TASK-101 Core Setup
- [x] TASK-102 Visual Spec Editor
- [x] TASK-103 Implementation Plan
- [/] TASK-104 Task Board
- [/] TASK-105 Spec Audit & Prompt Studio
- [ ] TASK-106 CLI Exporter & Zip Packaging`,
      lastUpdated: new Date().toISOString()
    },
    constitution: {
      id: 'const-1',
      title: 'Spec-Kit Studio Governance & Quality Constitution',
      rules: [
        {
          id: 'RULE-01',
          title: 'Zero Direct Client API Key Exposure',
          category: 'Security',
          description: 'All AI model interactions must be proxied through secure server-side routes (/api/*).',
          ruleStatement: 'Never declare or read process.env.GEMINI_API_KEY in client component code.',
          strictness: 'Mandatory'
        },
        {
          id: 'RULE-02',
          title: 'Offline First Data Sovereignty',
          category: 'Architecture',
          description: 'User workspace modifications must commit instantly to client cache before network dispatch.',
          ruleStatement: 'Component state must update optimistically and persist in local cache.',
          strictness: 'Mandatory'
        },
        {
          id: 'RULE-03',
          title: '100% Requirement Traceability',
          category: 'Testing & QA',
          description: 'Every functional task in tasks.md must reference a valid Requirement ID in spec.md.',
          ruleStatement: 'Unmapped tasks trigger an audit warning in the Spec Health Dashboard.',
          strictness: 'Recommended'
        },
        {
          id: 'RULE-04',
          title: 'Accessible & Responsive UI Components',
          category: 'Coding Standard',
          description: 'All dashboard controls must adhere to WCAG AA contrast standards and support keyboard interaction.',
          ruleStatement: 'All touch targets must be at least 44px on mobile and support dark mode natively.',
          strictness: 'Mandatory'
        }
      ],
      markdown: `# Project Constitution
1. **Security**: Zero direct API key exposure.
2. **Architecture**: Offline-first reactive data sovereignty.
3. **Traceability**: Every task mapped to a requirement.
4. **Accessibility**: Dark mode prioritized with fluid mobile touch controls.`,
      lastUpdated: new Date().toISOString()
    },
    audit: {
      lastAudited: new Date().toISOString(),
      overallScore: 94,
      completenessScore: 96,
      clarityScore: 92,
      testabilityScore: 95,
      traceabilityScore: 93,
      summary: 'High-quality specification with comprehensive user stories, phased task mapping, technical plan, and constitution enforcement.',
      gaps: [
        'Consider adding exact load test metrics for offline cache sync when workspace size exceeds 10MB.'
      ],
      ambiguities: [],
      recommendations: [
        {
          category: 'Performance',
          suggestion: 'Add virtualized list support if user stories exceed 50 items.',
          impact: 'Low'
        },
        {
          category: 'Integration',
          suggestion: 'Provide custom shell script generator for Windows PowerShell (.ps1) alongside specify.sh.',
          impact: 'Medium'
        }
      ]
    }
  }
];
