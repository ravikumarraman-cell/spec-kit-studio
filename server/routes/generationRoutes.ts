import { Router } from "express";
import { Type } from "@google/genai";
import { asyncRoute } from '../middleware/errorHandling';
import { getGeminiClient } from '../services/geminiClient';

export function createGenerationRouter() {
  const router = Router();

// Spec AI Generator / Refiner Endpoint
router.post("/api/spec/generate", asyncRoute(async (req, res) => {
    const { topic, existingSpec, focusAreas } = req.body;
    const client = getGeminiClient();

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
}));

// Implementation Plan AI Generator Endpoint
router.post("/api/plan/generate", asyncRoute(async (req, res) => {
    const { specTitle, specSummary, requirements } = req.body;
    const client = getGeminiClient();

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
}));

// Tasks Breakdown AI Generator Endpoint
router.post("/api/tasks/generate", asyncRoute(async (req, res) => {
    const { specTitle, functionalRequirements, techStack } = req.body;
    const client = getGeminiClient();

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
}));

  return router;
}
