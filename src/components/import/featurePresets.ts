export interface FeaturePreset { title: string; category: string; summary: string; content: string; }

export const featurePresets: FeaturePreset[] = [
    {
      title: 'OAuth 2.0 & Role-Based Access Control (RBAC)',
      category: 'Security & Auth',
      summary: 'Multi-tenant auth system with Google/GitHub OAuth, JWT access/refresh tokens, and fine-grained RBAC permissions.',
      content: `# Feature: OAuth 2.0 & Role-Based Access Control (RBAC)
      
## Overview
Implement a enterprise-grade authentication and authorization engine for the web app.

## Requirements
1. Support Social OAuth 2.0 login via Google and GitHub with popup flow.
2. Issue secure HTTP-only JWT access tokens (15m expiry) and refresh tokens (7d expiry).
3. Role hierarchy: SuperAdmin, Admin, Manager, Member, Viewer.
4. Support organization workspace invitations with email tokens.
5. Provide UI middleware for route protection and role checking.
6. Audit log all privileged authentication and permission modification events.`
    },
    {
      title: 'Stripe Subscription Billing & Customer Portal',
      category: 'Monetization',
      summary: 'Recurring subscription billing with Stripe Checkout, Webhooks, tiered pricing (Starter, Pro, Enterprise), and customer portal.',
      content: `# Feature: Stripe Subscription Billing & Customer Portal

## Overview
Add multi-tier SaaS billing with automated recurring invoice management.

## Requirements
1. Offer 3 subscription tiers: Starter ($19/mo), Pro ($49/mo), Enterprise ($199/mo).
2. Integrate Stripe Checkout for seamless card and Apple Pay payments.
3. Handle webhook events: invoice.payment_succeeded, customer.subscription.updated, customer.subscription.deleted.
4. Provide a customer portal link for users to update cards, upgrade/downgrade plans, or download invoices.
5. Enforce plan entitlement limits on core application features.`
    },
    {
      title: 'Real-Time Collaborative Comments & WebSockets',
      category: 'Real-Time & Multiplayer',
      summary: 'Live thread comments, typing indicators, user presence badges, and real-time WebSocket notifications.',
      content: `# Feature: Real-Time Collaborative Comments & WebSockets

## Overview
Enable multiplayer real-time collaboration with inline comment threads.

## Requirements
1. WebSockets connection using Socket.io / Native WebSockets for real-time bi-directional streaming.
2. User presence indicators showing who is currently viewing or editing the document.
3. Inline threaded comments with markdown support, @mentions, and emoji reactions.
4. Typing indicators when another user is composing a comment response.
5. Unread notification badges and sound effects for direct mentions.`
    },
    {
      title: 'AI RAG Knowledge Base & Vector Search',
      category: 'AI Capabilities',
      summary: 'Retrieval-Augmented Generation (RAG) system with document vector embeddings, semantic search, and AI assistant Q&A.',
      content: `# Feature: AI RAG Knowledge Base & Vector Search

## Overview
Allow users to upload documentation files and query them using AI vector embeddings.

## Requirements
1. Upload PDF, Markdown, and TXT files to be chunked into 500-token chunks with 50-token overlap.
2. Generate vector embeddings using Gemini Embedding model and store in PgVector / Vector database.
3. Perform cosine similarity vector search on user queries to retrieve context chunks.
4. Synthesize answers using Gemini 3.8 Flash with cited source document references.
5. Provide user feedback buttons (Helpful / Not Helpful) on AI answers.`
    }
  ];

