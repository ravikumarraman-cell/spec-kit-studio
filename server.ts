import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing in environment variables.");
    }
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return ai;
}

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Spec AI Generator / Refiner Endpoint
app.post("/api/spec/generate", async (req, res) => {
  try {
    const { topic, existingSpec, focusAreas } = req.body;
    const client = getAiClient();

    const prompt = `You are a Principal Software Architect expert in GitHub Spec-Kit specification-driven development.
Generate or expand a comprehensive, production-ready Feature Specification (.md) for:
"${topic}"

${existingSpec ? `Existing Spec Content to enhance or refine:\n${existingSpec}\n` : ""}
${focusAreas ? `Focus Areas/Constraints: ${focusAreas.join(", ")}\n` : ""}

Provide the output strictly in JSON format conforming to the schema. Include:
1. Title and High-Level Summary
2. User Stories (with priority: High/Medium/Low, user role, goal, benefit, and acceptance criteria)
3. Functional Requirements (FR-1, FR-2...)
4. Non-Functional Requirements (NFR-1, NFR-2... e.g. performance, security, offline)
5. User Flow Steps
6. Edge Cases & Risks
7. Success Metrics
8. Clean formatted Markdown string representing the full spec.md document.`;

    const response = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            userStories: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  priority: { type: Type.STRING },
                  asA: { type: Type.STRING },
                  iWantTo: { type: Type.STRING },
                  soThat: { type: Type.STRING },
                  acceptanceCriteria: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
              },
            },
            functionalRequirements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  category: { type: Type.STRING },
                },
              },
            },
            nonFunctionalRequirements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
              },
            },
            userFlows: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            edgeCases: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            successMetrics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            markdown: { type: Type.STRING },
          },
          required: ["title", "summary", "userStories", "functionalRequirements", "markdown"],
        },
      },
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("Error generating spec:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to generate spec." });
  }
});

// Implementation Plan AI Generator Endpoint
app.post("/api/plan/generate", async (req, res) => {
  try {
    const { specTitle, specSummary, requirements } = req.body;
    const client = getAiClient();

    const prompt = `You are a Principal Software Architect creating an Implementation Plan (plan.md) for GitHub Spec-Kit.
Spec Title: "${specTitle}"
Spec Summary: "${specSummary}"
Requirements: ${JSON.stringify(requirements || [])}

Generate a structured Plan containing:
1. Tech Stack Selection (frontend, backend, database, state management, utilities)
2. Architecture Overview
3. Component Hierarchy
4. API Contracts (Endpoints, Method, Route, Request Body, Response)
5. Data Schema Models (Tables/Collections, Fields, Types)
6. Architectural Decision Records (ADRs) with Context, Decision, and Consequences
7. Valid Mermaid.js diagram definition (graph TD or sequenceDiagram representing system architecture)
8. Complete markdown text of plan.md`;

    const response = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            techStack: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  technology: { type: Type.STRING },
                  justification: { type: Type.STRING },
                },
              },
            },
            architectureSummary: { type: Type.STRING },
            components: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  purpose: { type: Type.STRING },
                  layer: { type: Type.STRING },
                },
              },
            },
            apiContracts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  method: { type: Type.STRING },
                  path: { type: Type.STRING },
                  description: { type: Type.STRING },
                  payload: { type: Type.STRING },
                  response: { type: Type.STRING },
                },
              },
            },
            dataSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  modelName: { type: Type.STRING },
                  fields: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        type: { type: Type.STRING },
                        required: { type: Type.BOOLEAN },
                      },
                    },
                  },
                },
              },
            },
            adrs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  status: { type: Type.STRING },
                  context: { type: Type.STRING },
                  decision: { type: Type.STRING },
                  consequences: { type: Type.STRING },
                },
              },
            },
            mermaidDiagram: { type: Type.STRING },
            markdown: { type: Type.STRING },
          },
          required: ["techStack", "architectureSummary", "mermaidDiagram", "markdown"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("Error generating plan:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to generate plan." });
  }
});

// Tasks Breakdown AI Generator Endpoint
app.post("/api/tasks/generate", async (req, res) => {
  try {
    const { specTitle, functionalRequirements, techStack } = req.body;
    const client = getAiClient();

    const prompt = `You are a Technical Project Manager breaking down a GitHub Spec-Kit specification into actionable tasks.
Spec Title: "${specTitle}"
Requirements: ${JSON.stringify(functionalRequirements || [])}
Tech Stack: ${JSON.stringify(techStack || [])}

Decompose the work into phased, atomic tasks (tasks.md) following Spec-Kit conventions:
- Phase 1: Setup & Core Infrastructure
- Phase 2: Fundamental Component & API Development
- Phase 3: Feature Integration & State Logic
- Phase 4: Polish, Accessibility, Testing & Verification

For each task, provide:
- id (e.g. TASK-101)
- title
- phase (Phase 1, Phase 2, etc.)
- description
- estimatedHours (number)
- mappedRequirementId (e.g., FR-1)
- dependencies (array of task IDs)
- targetAgentPromptSnippet (A concise prompt for an AI agent to complete this specific task)
- markdown representation of tasks.md.`;

    const response = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  phase: { type: Type.STRING },
                  description: { type: Type.STRING },
                  status: { type: Type.STRING },
                  estimatedHours: { type: Type.NUMBER },
                  mappedRequirementId: { type: Type.STRING },
                  dependencies: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  targetAgentPromptSnippet: { type: Type.STRING },
                },
              },
            },
            markdown: { type: Type.STRING },
          },
          required: ["tasks", "markdown"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("Error generating tasks:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to generate tasks." });
  }
});

// Quality Audit / Spec Health AI Analyzer Endpoint
app.post("/api/audit/analyze", async (req, res) => {
  try {
    const { specContent, planContent, tasksContent, constitutionContent } = req.body;
    const client = getAiClient();

    const prompt = `Analyze this GitHub Spec-Kit specification package for quality, completeness, clarity, testability, and edge cases.
    
Spec Content:
${specContent || "(empty)"}

Plan Content:
${planContent || "(empty)"}

Tasks Content:
${tasksContent || "(empty)"}

Constitution Content:
${constitutionContent || "(empty)"}

Perform a rigorous Spec-Kit Health Check audit:
1. Calculate overall quality score (0 - 100)
2. Grade sub-categories (Completeness, Clarity, Testability, Security, Architecture Traceability)
3. Identify missing requirements or unhandled edge cases (Gaps)
4. Highlight ambiguous wording or contradictory rules
5. Offer 3-5 specific actionable recommendations for improvement.`;

    const response = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER },
            completenessScore: { type: Type.NUMBER },
            clarityScore: { type: Type.NUMBER },
            testabilityScore: { type: Type.NUMBER },
            traceabilityScore: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            gaps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            ambiguities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  suggestion: { type: Type.STRING },
                  impact: { type: Type.STRING },
                },
              },
            },
          },
          required: ["overallScore", "summary", "gaps", "recommendations"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("Error performing audit:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to perform spec audit." });
  }
});

// AI Agent Prompt Studio Generator Endpoint
app.post("/api/prompt/generate", async (req, res) => {
  try {
    const { targetAgent, taskId, taskTitle, specSummary, constitution, techStack } = req.body;
    const client = getAiClient();

    const prompt = `Generate an optimized, highly effective AI Coding Agent Prompt for:
Target Agent: "${targetAgent || "Claude / Gemini / Copilot / Cursor"}"
Task ID & Title: "${taskId}: ${taskTitle}"
Spec Summary: "${specSummary}"
Tech Stack Rules: "${JSON.stringify(techStack || [])}"
Constitution Rules: "${constitution || "Follow best practices"}"

Provide a structured, step-by-step master prompt formatted for copy-pasting directly into an AI coding agent session.
Include system role instructions, task context, strict constraints, acceptance criteria verification, and code structure rules.`;

    const response = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    res.json({ success: true, promptText: response.text });
  } catch (err: any) {
    console.error("Error generating prompt:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to generate AI agent prompt." });
  }
});

// Repository Analysis & Technology Detection Endpoint
app.post("/api/repo/analyze", async (req, res) => {
  try {
    const { repoUrl, manifestContent, files } = req.body;
    const client = getAiClient();

    const prompt = `You are a Senior Principal Software Architect and Repository Analyzer.
Analyze the provided repository information, configuration files, manifests, or file tree structure.

${repoUrl ? `GitHub Repository URL: "${repoUrl}"\n` : ""}
${manifestContent ? `Manifest / File Content / Tree:\n${manifestContent}\n` : ""}
${files && Array.isArray(files) ? `Files Payload: ${JSON.stringify(files.slice(0, 10))}\n` : ""}

Perform a thorough technology stack detection and repository analysis:
1. Infer or extract the Project Name and concise Description.
2. Identify the Primary Programming Language (e.g., TypeScript, Python, Go, Rust, Java, C#, PHP, Kotlin, Swift).
3. Identify ALL technologies used across categories:
   - Frontend (e.g. React, Next.js App Router, Vue, Svelte, Angular)
   - Backend (e.g. Express, Node.js, FastAPI, Django, Go Fiber, Spring Boot, Actix-web)
   - Database (e.g. PostgreSQL, MongoDB, SQLite, Redis, Prisma ORM, Drizzle ORM, SQLAlchemy)
   - State (e.g. Redux Toolkit, Zustand, TanStack Query, Pinia)
   - Styling (e.g. Tailwind CSS, CSS Modules, Material UI, Shadcn/ui)
   - Testing (e.g. Jest, Vitest, Cypress, Pytest)
   - Infra/DevOps (e.g. Docker, GitHub Actions, Kubernetes, Terraform)
4. For each detected technology, provide category, name, version (if available), confidence (High/Medium/Low), fileEvidence (e.g. "package.json", "requirements.txt", "Dockerfile"), and set selectedForNewFeature to true by default.
5. Provide a summary of the repository architecture.
6. Identify key directories (e.g. "/src", "/components", "/api", "/models").
7. Suggest 3 to 5 high-value feature ideas that fit naturally into this repository.`;

    const response = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            repoName: { type: Type.STRING },
            description: { type: Type.STRING },
            primaryLanguage: { type: Type.STRING },
            detectedTechStack: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  category: { type: Type.STRING },
                  name: { type: Type.STRING },
                  version: { type: Type.STRING },
                  confidence: { type: Type.STRING },
                  fileEvidence: { type: Type.STRING },
                  selectedForNewFeature: { type: Type.BOOLEAN },
                },
              },
            },
            architectureSummary: { type: Type.STRING },
            keyDirectories: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            suggestedNewFeatures: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["repoName", "description", "primaryLanguage", "detectedTechStack", "architectureSummary"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("Error analyzing repository:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to analyze repository." });
  }
});

// Generate Feature Specification & Plan for Imported Repo Endpoint
app.post("/api/repo/generate-feature-for-imported", async (req, res) => {
  try {
    const { importedRepo, selectedTechStack, newFeatureTitle, newFeatureGoal } = req.body;
    const client = getAiClient();

    const prompt = `You are a Principal Software Architect creating a GitHub Spec-Kit specification package for adding a NEW FEATURE to an existing imported codebase.

Imported Repository: "${importedRepo?.repoName || "Imported Repo"}"
Repository Architecture Summary: "${importedRepo?.architectureSummary || "Existing architecture"}"
Selected Technology Stack for New Feature Development:
${JSON.stringify(selectedTechStack || [])}

New Feature Title: "${newFeatureTitle}"
New Feature Goal / Description: "${newFeatureGoal}"

Generate a complete GitHub Spec-Kit specification package tailored specifically to adding this feature into the imported repository:
1. Feature Title and Summary
2. User Stories (id, title, priority, asA, iWantTo, soThat, acceptanceCriteria)
3. Functional Requirements (FR-1, FR-2... mapped to existing repository modules where appropriate)
4. Non-Functional Requirements
5. Tech Stack Selection (incorporating selected technologies)
6. API Contracts (endpoints matching existing server conventions)
7. Phased Task Breakdown (Phase 1: Integration & Setup in existing repo, Phase 2: Core Feature Dev, Phase 3: UI & API integration, Phase 4: Testing & Verification)
8. Constitution Rules enforcing repository coding standards and technology usage
9. Valid Mermaid.js architecture flow diagram.`;

    const response = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            userStories: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  priority: { type: Type.STRING },
                  asA: { type: Type.STRING },
                  iWantTo: { type: Type.STRING },
                  soThat: { type: Type.STRING },
                  acceptanceCriteria: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
              },
            },
            functionalRequirements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  category: { type: Type.STRING },
                  priority: { type: Type.STRING },
                },
              },
            },
            techStack: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  technology: { type: Type.STRING },
                  justification: { type: Type.STRING },
                },
              },
            },
            apiContracts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  method: { type: Type.STRING },
                  path: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
              },
            },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  phase: { type: Type.STRING },
                  description: { type: Type.STRING },
                  status: { type: Type.STRING },
                  estimatedHours: { type: Type.NUMBER },
                  mappedRequirementId: { type: Type.STRING },
                },
              },
            },
            mermaidDiagram: { type: Type.STRING },
            constitutionRules: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  category: { type: Type.STRING },
                  description: { type: Type.STRING },
                  ruleStatement: { type: Type.STRING },
                  strictness: { type: Type.STRING },
                },
              },
            },
          },
          required: ["title", "summary", "userStories", "functionalRequirements", "techStack", "tasks", "mermaidDiagram"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("Error generating feature for imported repo:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to generate feature spec for imported repo." });
  }
});

// Import Feature & Extract User Stories + Spec-Kit Endpoint
app.post("/api/feature/import", async (req, res) => {
  try {
    const { featureContent, featureTitle, sourceType } = req.body;
    const client = getAiClient();

    const prompt = `You are an expert Lead Product Manager and Software Architect specializing in GitHub Spec-Kit specification-driven development (SDD).
You have been given raw feature input, a PRD, user story draft, Jira issue description, or feature request.

Feature Source Type: "${sourceType || "text"}"
${featureTitle ? `Feature Title / Context: "${featureTitle}"\n` : ""}
Raw Feature Content / PRD Document:
"""
${featureContent}
"""

Analyze this feature input thoroughly. Extract and auto-generate a comprehensive, production-ready Spec-Kit package including:
1. Title and High-Level Executive Summary
2. Comprehensive User Stories (minimum 3-6 stories) formatted with:
   - id (e.g. US-101, US-102)
   - title
   - priority ("High", "Medium", "Low")
   - asA (role/persona e.g., "Developer", "Admin", "End User")
   - iWantTo (action/capability)
   - soThat (business value/outcome)
   - acceptanceCriteria (array of Given/When/Then or verification statements)
3. Functional Requirements (FR-101, FR-102... with title, description, category: Core/UI/UX/API/Database/Security/Performance/Integration, priority: High/Medium/Low)
4. Non-Functional Requirements (NFR-101... with title, description)
5. Recommended Tech Stack Selection (category, technology, justification)
6. API Contracts (id, method: GET/POST/PUT/DELETE, path, description, payload, response)
7. Phased Task Breakdown (Phase 1: Setup, Phase 2: Core Infrastructure, Phase 3: Integration, Phase 4: Polish & Testing with id, title, phase, description, estimatedHours, mappedRequirementId, targetAgentPromptSnippet)
8. Constitution & Governance Rules (id, title, category, description, ruleStatement, strictness: Mandatory/Recommended/Optional)
9. Mermaid.js architectural flow diagram string.`;

    const response = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            userStories: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  priority: { type: Type.STRING },
                  asA: { type: Type.STRING },
                  iWantTo: { type: Type.STRING },
                  soThat: { type: Type.STRING },
                  acceptanceCriteria: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
              },
            },
            functionalRequirements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  category: { type: Type.STRING },
                  priority: { type: Type.STRING },
                },
              },
            },
            nonFunctionalRequirements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
              },
            },
            techStack: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  technology: { type: Type.STRING },
                  justification: { type: Type.STRING },
                },
              },
            },
            apiContracts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  method: { type: Type.STRING },
                  path: { type: Type.STRING },
                  description: { type: Type.STRING },
                  payload: { type: Type.STRING },
                  response: { type: Type.STRING },
                },
              },
            },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  phase: { type: Type.STRING },
                  description: { type: Type.STRING },
                  status: { type: Type.STRING },
                  estimatedHours: { type: Type.NUMBER },
                  mappedRequirementId: { type: Type.STRING },
                  targetAgentPromptSnippet: { type: Type.STRING },
                },
              },
            },
            constitutionRules: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  category: { type: Type.STRING },
                  description: { type: Type.STRING },
                  ruleStatement: { type: Type.STRING },
                  strictness: { type: Type.STRING },
                },
              },
            },
            mermaidDiagram: { type: Type.STRING },
          },
          required: [
            "title",
            "summary",
            "userStories",
            "functionalRequirements",
            "techStack",
            "tasks",
            "constitutionRules",
            "mermaidDiagram",
          ],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("Error importing feature:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to import feature and generate Spec-Kit." });
  }
});

// ==========================================
// GitHub & Jira Integration API Endpoints
// ==========================================

// GitHub: Fetch User Repositories or Repo Details
app.post("/api/github/repos", async (req, res) => {
  try {
    const token = req.body.token || process.env.GITHUB_TOKEN;
    if (!token) {
      return res.status(400).json({ success: false, error: "GitHub Personal Access Token is required." });
    }

    const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=30", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "spec-kit-studio",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`GitHub API error (${response.status}): ${errText}`);
    }

    const repos = await response.json();
    const formatted = repos.map((r: any) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      private: r.private,
      description: r.description,
      htmlUrl: r.html_url,
      defaultBranch: r.default_branch,
      language: r.language,
      updatedAt: r.updated_at,
    }));

    res.json({ success: true, repos: formatted });
  } catch (err: any) {
    console.error("GitHub repos error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GitHub: Fetch Repo Issues
app.post("/api/github/issues", async (req, res) => {
  try {
    const { token: reqToken, owner, repo } = req.body;
    const token = reqToken || process.env.GITHUB_TOKEN;
    if (!owner || !repo) {
      return res.status(400).json({ success: false, error: "Owner and Repo name are required." });
    }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "spec-kit-studio",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=30`, { headers });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`GitHub API error (${response.status}): ${errText}`);
    }

    const issues = await response.json();
    const formatted = issues.map((i: any) => ({
      id: i.id,
      number: i.number,
      title: i.title,
      body: i.body,
      state: i.state,
      htmlUrl: i.html_url,
      labels: i.labels.map((l: any) => l.name),
      user: i.user?.login,
      createdAt: i.created_at,
    }));

    res.json({ success: true, issues: formatted });
  } catch (err: any) {
    console.error("GitHub issues error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GitHub: Commit .spec-kit files directly to a repository branch
app.post("/api/github/commit-spec", async (req, res) => {
  try {
    const { token: reqToken, owner, repo, branch, files, commitMessage } = req.body;
    const token = reqToken || process.env.GITHUB_TOKEN;
    if (!token) {
      return res.status(400).json({ success: false, error: "GitHub PAT Token is required to commit files." });
    }
    if (!owner || !repo || !files || typeof files !== "object") {
      return res.status(400).json({ success: false, error: "Owner, Repo, and files object are required." });
    }

    const targetBranch = branch || "main";
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "spec-kit-studio",
    };

    const commitedResults: any[] = [];

    // For each file in the .spec-kit directory, check if it exists (to get sha) and commit it
    for (const [filePath, content] of Object.entries(files)) {
      const pathInRepo = filePath.startsWith(".spec-kit/") ? filePath : `.spec-kit/${filePath}`;
      let existingSha: string | undefined = undefined;

      // Check existing file
      const getFileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${pathInRepo}?ref=${targetBranch}`, { headers });
      if (getFileRes.ok) {
        const fileData = await getFileRes.json();
        existingSha = fileData.sha;
      }

      // Create or update file
      const bodyPayload: any = {
        message: commitMessage || `docs(spec-kit): update ${pathInRepo} via Spec-Kit Studio`,
        content: Buffer.from(content as string).toString("base64"),
        branch: targetBranch,
      };
      if (existingSha) {
        bodyPayload.sha = existingSha;
      }

      const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${pathInRepo}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(bodyPayload),
      });

      if (!putRes.ok) {
        const errText = await putRes.text();
        throw new Error(`Failed to commit ${pathInRepo}: ${errText}`);
      }

      const putData = await putRes.json();
      commitedResults.push({ path: pathInRepo, sha: putData.content?.sha, htmlUrl: putData.content?.html_url });
    }

    res.json({ success: true, message: `Successfully committed ${commitedResults.length} files to ${owner}/${repo} (${targetBranch}).`, results: commitedResults });
  } catch (err: any) {
    console.error("GitHub commit error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Jira: Verify & Fetch Projects
app.post("/api/jira/projects", async (req, res) => {
  try {
    const domain = req.body.domain || process.env.JIRA_DOMAIN;
    const email = req.body.email || process.env.JIRA_EMAIL;
    const apiToken = req.body.apiToken || process.env.JIRA_API_TOKEN;

    if (!domain || !email || !apiToken) {
      return res.status(400).json({ success: false, error: "Jira Domain, Email, and API Token are required." });
    }

    const normalizedDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`;

    const response = await fetch(`https://${normalizedDomain}/rest/api/3/project`, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Jira API error (${response.status}): ${errText}`);
    }

    const projects = await response.json();
    const formatted = projects.map((p: any) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      projectTypeKey: p.projectTypeKey,
      avatarUrl: p.avatarUrls?.["48x48"],
    }));

    res.json({ success: true, projects: formatted });
  } catch (err: any) {
    console.error("Jira projects error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Jira: Fetch Issues for a Project
app.post("/api/jira/issues", async (req, res) => {
  try {
    const { domain: reqDomain, email: reqEmail, apiToken: reqToken, projectKey } = req.body;
    const domain = reqDomain || process.env.JIRA_DOMAIN;
    const email = reqEmail || process.env.JIRA_EMAIL;
    const apiToken = reqToken || process.env.JIRA_API_TOKEN;

    if (!domain || !email || !apiToken || !projectKey) {
      return res.status(400).json({ success: false, error: "Jira Domain, Email, API Token, and Project Key are required." });
    }

    const normalizedDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`;

    const jql = encodeURIComponent(`project = "${projectKey}" ORDER BY updated DESC`);
    const response = await fetch(`https://${normalizedDomain}/rest/api/3/search?jql=${jql}&maxResults=30`, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Jira API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const formatted = (data.issues || []).map((i: any) => ({
      id: i.id,
      key: i.key,
      summary: i.fields.summary,
      descriptionText: i.fields.description?.content?.[0]?.content?.[0]?.text || "No description",
      status: i.fields.status?.name,
      issueType: i.fields.issuetype?.name,
      priority: i.fields.priority?.name,
      assignee: i.fields.assignee?.displayName,
      htmlUrl: `https://${normalizedDomain}/browse/${i.key}`,
    }));

    res.json({ success: true, issues: formatted });
  } catch (err: any) {
    console.error("Jira issues error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Jira: Create Issue from Spec-Kit User Story or Task
app.post("/api/jira/create-issue", async (req, res) => {
  try {
    const { domain: reqDomain, email: reqEmail, apiToken: reqToken, projectKey, issueType, summary, description } = req.body;
    const domain = reqDomain || process.env.JIRA_DOMAIN;
    const email = reqEmail || process.env.JIRA_EMAIL;
    const apiToken = reqToken || process.env.JIRA_API_TOKEN;

    if (!domain || !email || !apiToken || !projectKey || !summary) {
      return res.status(400).json({ success: false, error: "Jira Domain, Email, API Token, Project Key, and Summary are required." });
    }

    const normalizedDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`;

    const bodyPayload = {
      fields: {
        project: { key: projectKey },
        summary: summary,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: description || "Created via Spec-Kit Studio",
                },
              ],
            },
          ],
        },
        issuetype: { name: issueType || "Story" },
      },
    };

    const response = await fetch(`https://${normalizedDomain}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Jira Create Issue API error (${response.status}): ${errText}`);
    }

    const issueData = await response.json();
    res.json({
      success: true,
      key: issueData.key,
      id: issueData.id,
      htmlUrl: `https://${normalizedDomain}/browse/${issueData.key}`,
    });
  } catch (err: any) {
    console.error("Jira create issue error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Spec-Kit v1.0.7 Native Core Engine API Endpoints
const SPEC_KIT_VENDOR_PATH = path.join(process.cwd(), "vendor", "spec-kit");

app.get("/api/speckit/v107/info", (req, res) => {
  try {
    const isInstalled = fs.existsSync(SPEC_KIT_VENDOR_PATH);
    let presetCatalog: any = null;
    let extensionCatalog: any = null;

    if (isInstalled) {
      const presetPath = path.join(SPEC_KIT_VENDOR_PATH, "presets", "catalog.json");
      const extPath = path.join(SPEC_KIT_VENDOR_PATH, "extensions", "catalog.json");
      if (fs.existsSync(presetPath)) {
        presetCatalog = JSON.parse(fs.readFileSync(presetPath, "utf-8"));
      }
      if (fs.existsSync(extPath)) {
        extensionCatalog = JSON.parse(fs.readFileSync(extPath, "utf-8"));
      }
    }

    res.json({
      success: true,
      specKitVersion: "1.0.7",
      releaseTag: "v1.0.7",
      installed: isInstalled,
      vendorPath: SPEC_KIT_VENDOR_PATH,
      presetsCount: presetCatalog?.presets ? Object.keys(presetCatalog.presets).length : 0,
      extensionsCount: extensionCatalog?.extensions ? Object.keys(extensionCatalog.extensions).length : 0,
      workflowStages: ["constitution", "specify", "plan", "tasks", "implement"],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/speckit/v107/templates", (req, res) => {
  try {
    const templatesDir = path.join(SPEC_KIT_VENDOR_PATH, "templates");
    if (!fs.existsSync(templatesDir)) {
      return res.status(404).json({ success: false, error: "Spec-Kit v1.0.7 templates directory not found." });
    }

    const files = fs.readdirSync(templatesDir);
    const templates: Record<string, string> = {};
    for (const file of files) {
      if (file.endsWith(".md") || file.endsWith(".json")) {
        templates[file] = fs.readFileSync(path.join(templatesDir, file), "utf-8");
      }
    }

    res.json({ success: true, version: "1.0.7", templates });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/speckit/v107/catalogs", (req, res) => {
  try {
    const presetsPath = path.join(SPEC_KIT_VENDOR_PATH, "presets", "catalog.json");
    const presetsCommunityPath = path.join(SPEC_KIT_VENDOR_PATH, "presets", "catalog.community.json");
    const extensionsPath = path.join(SPEC_KIT_VENDOR_PATH, "extensions", "catalog.json");
    const extensionsCommunityPath = path.join(SPEC_KIT_VENDOR_PATH, "extensions", "catalog.community.json");

    const catalogs = {
      version: "1.0.7",
      presets: fs.existsSync(presetsPath) ? JSON.parse(fs.readFileSync(presetsPath, "utf-8")) : null,
      presetsCommunity: fs.existsSync(presetsCommunityPath) ? JSON.parse(fs.readFileSync(presetsCommunityPath, "utf-8")) : null,
      extensions: fs.existsSync(extensionsPath) ? JSON.parse(fs.readFileSync(extensionsPath, "utf-8")) : null,
      extensionsCommunity: fs.existsSync(extensionsCommunityPath) ? JSON.parse(fs.readFileSync(extensionsCommunityPath, "utf-8")) : null,
    };

    res.json({ success: true, data: catalogs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve frontend assets or Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Spec-Kit Studio Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
