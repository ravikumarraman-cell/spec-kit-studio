import { Router } from "express";
import { Type } from "@google/genai";
import { asyncRoute } from '../middleware/errorHandling';
import { getGeminiClient } from '../services/geminiClient';

export function createRepositoryRouter() {
  const router = Router();

// Repository Analysis & Technology Detection Endpoint
router.post("/api/repo/analyze", asyncRoute(async (req, res) => {
    const { repoUrl, manifestContent, files } = req.body;
    const client = getGeminiClient();

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
}));

// Generate Feature Specification & Plan for Imported Repo Endpoint
router.post("/api/repo/generate-feature-for-imported", asyncRoute(async (req, res) => {
    const { importedRepo, selectedTechStack, newFeatureTitle, newFeatureGoal } = req.body;
    const client = getGeminiClient();

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
}));

// Import Feature & Extract User Stories + Spec-Kit Endpoint
router.post("/api/feature/import", asyncRoute(async (req, res) => {
    const { featureContent, featureTitle, sourceType } = req.body;
    const client = getGeminiClient();

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
}));

  return router;
}

