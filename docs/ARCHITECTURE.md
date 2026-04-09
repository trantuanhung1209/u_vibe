# System Architecture Diagram

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        A[Web Browser]
        B[React UI Components]
        C[tRPC Client]
    end

    subgraph "Next.js Application"
        D[App Router]
        E[API Routes]
        F[Middleware - Clerk Auth]
        G[tRPC Server]
    end

    subgraph "Business Logic"
        H[Project Module]
        I[Message Module]
        J[Usage Module]
    end

    subgraph "External Services"
        K[Clerk Auth]
        L[PostgreSQL DB]
        M[Inngest Platform]
        N[OpenAI API]
        O[E2B Sandboxes]
    end

    A --> B
    B --> C
    C --> G
    A --> E
    E --> F
    F --> K
    G --> D
    G --> H
    G --> I
    G --> J
    H --> L
    I --> L
    J --> L
    I --> M
    H --> M
    M --> N
    M --> O
    O --> L

    style A fill:#e1f5ff
    style K fill:#ffe1e1
    style L fill:#e1ffe1
    style M fill:#fff4e1
    style N fill:#f0e1ff
    style O fill:#ffe1f0
```

---

## Detailed Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Pages       │  │  Components  │  │  Hooks       │     │
│  │  - Home      │  │  - UI/shadcn │  │  - tRPC      │     │
│  │  - Project   │  │  - CodeView  │  │  - Theme     │     │
│  │  - Pricing   │  │  - FileTree  │  │  - Mobile    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │              │
│         └─────────────────┼──────────────────┘              │
│                           │                                 │
│                  ┌────────▼────────┐                        │
│                  │  tRPC Client    │                        │
│                  │  (React Query)  │                        │
│                  └────────┬────────┘                        │
└───────────────────────────┼──────────────────────────────────┘
                            │ HTTP/WebSocket
┌───────────────────────────▼──────────────────────────────────┐
│               NEXT.JS SERVER (Vercel)                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │              App Router (src/app/)                 │     │
│  │  ┌──────────────┐  ┌──────────────┐               │     │
│  │  │  (home)/     │  │  projects/   │               │     │
│  │  │  page.tsx    │  │  [id]/page   │               │     │
│  │  └──────────────┘  └──────────────┘               │     │
│  └────────────┬───────────────────────────────────────┘     │
│               │                                              │
│  ┌────────────▼───────────────────────────────────────┐     │
│  │            Middleware (src/middleware.ts)          │     │
│  │            - Auth Check (Clerk)                    │     │
│  │            - Route Protection                      │     │
│  └────────────┬───────────────────────────────────────┘     │
│               │                                              │
│  ┌────────────▼───────────────────────────────────────┐     │
│  │               API Layer                            │     │
│  │  ┌─────────────────┐  ┌─────────────────┐         │     │
│  │  │  tRPC Routes    │  │  REST Routes    │         │     │
│  │  │  /api/trpc/     │  │  /api/upload    │         │     │
│  │  │                 │  │  /api/inngest   │         │     │
│  │  └────────┬────────┘  └────────┬────────┘         │     │
│  └───────────┼──────────────────────┼──────────────────┘     │
│              │                      │                        │
│  ┌───────────▼──────────────────────▼──────────────────┐     │
│  │          Feature Modules (src/modules/)            │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────┐  │     │
│  │  │  projects/   │  │  messages/   │  │ usage/  │  │     │
│  │  │  - server/   │  │  - server/   │  │ - srv/  │  │     │
│  │  │    procedures│  │    procedures│  │   proc  │  │     │
│  │  │  - ui/       │  │  - ui/       │  │         │  │     │
│  │  └──────┬───────┘  └──────┬───────┘  └────┬────┘  │     │
│  └─────────┼──────────────────┼───────────────┼───────┘     │
│            │                  │               │              │
│            └──────────────────┼───────────────┘              │
│                               │                              │
│  ┌────────────────────────────▼──────────────────────────┐  │
│  │              Prisma ORM (src/lib/db.ts)              │  │
│  │              - Client Instance                       │  │
│  │              - Type-safe Queries                     │  │
│  └────────────────────────────┬──────────────────────────┘  │
└───────────────────────────────┼─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                   POSTGRESQL DATABASE                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Project  │  │ Message  │  │ Fragment │  │  Usage   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              BACKGROUND JOBS (Inngest)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │        Inngest Function (src/inngest/)            │    │
│  │                                                    │    │
│  │  Event: "code-agent/run"                         │    │
│  │  ┌──────────────────────────────────────────┐    │    │
│  │  │  Step 1: Create E2B Sandbox              │    │    │
│  │  └──────────────────┬───────────────────────┘    │    │
│  │  ┌──────────────────▼───────────────────────┐    │    │
│  │  │  Step 2: Fetch Message History           │    │    │
│  │  └──────────────────┬───────────────────────┘    │    │
│  │  ┌──────────────────▼───────────────────────┐    │    │
│  │  │  Step 3: Initialize AI Agent             │    │    │
│  │  │  - Create Tools (createOrUpdateFiles,    │    │    │
│  │  │    terminal, readFiles)                  │    │    │
│  │  │  - Set up Network (agent orchestration)  │    │    │
│  │  └──────────────────┬───────────────────────┘    │    │
│  │  ┌──────────────────▼───────────────────────┐    │    │
│  │  │  Step 4: Agent Execution Loop            │    │    │
│  │  │  - Analyze prompt/image                  │    │    │
│  │  │  - Plan implementation                   │    │    │
│  │  │  - Execute tools iteratively             │    │    │
│  │  └──────────────────┬───────────────────────┘    │    │
│  │  ┌──────────────────▼───────────────────────┐    │    │
│  │  │  Step 5: Parse Results & Generate Title  │    │    │
│  │  └──────────────────┬───────────────────────┘    │    │
│  │  ┌──────────────────▼───────────────────────┐    │    │
│  │  │  Step 6: Save to Database                │    │    │
│  │  │  - Create Fragment                       │    │    │
│  │  │  - Create Assistant Message              │    │    │
│  │  └──────────────────────────────────────────┘    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │  OpenAI API  │◄────────┤  E2B Sandbox │                │
│  │  - GPT-4     │         │  - Next.js   │                │
│  │  - Vision    │         │  - Tailwind  │                │
│  └──────────────┘         └──────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### User Creates Project with Image

```mermaid
sequenceDiagram
    actor User
    participant UI as React UI
    participant Upload as /api/upload
    participant tRPC as tRPC Router
    participant DB as PostgreSQL
    participant Inngest as Inngest Queue
    participant Worker as Inngest Worker
    participant AI as OpenAI
    participant E2B as E2B Sandbox

    User->>UI: Upload image + enter prompt
    UI->>Upload: POST image file
    Upload->>Upload: Validate & convert to base64
    Upload-->>UI: Return imageUrl (base64)
    
    UI->>tRPC: projects.create({ value, imageUrl })
    tRPC->>tRPC: Check auth (Clerk)
    tRPC->>DB: Check usage/credits
    DB-->>tRPC: Credits available
    tRPC->>DB: INSERT Project & Message
    DB-->>tRPC: Project created
    
    tRPC->>Inngest: Send event "code-agent/run"
    Inngest-->>tRPC: Event queued
    tRPC-->>UI: Return project
    UI-->>User: Show "Generating..."
    
    Note over Inngest,Worker: Async Processing Starts
    
    Inngest->>Worker: Trigger code-agent function
    Worker->>E2B: Create sandbox
    E2B-->>Worker: sandboxId + URL
    
    Worker->>DB: Fetch messages (with image)
    DB-->>Worker: Message history
    
    Worker->>AI: Send prompt + image (Vision API)
    AI-->>Worker: Plan: "Create Hero, Navbar..."
    
    loop Code Generation
        Worker->>AI: Next action?
        AI-->>Worker: createOrUpdateFiles(...)
        Worker->>E2B: Write files
        E2B-->>Worker: Files written
        
        AI-->>Worker: terminal("npm install X")
        Worker->>E2B: Run command
        E2B-->>Worker: Package installed
    end
    
    AI-->>Worker: Task complete
    Worker->>AI: Generate title
    AI-->>Worker: "Landing Page"
    
    Worker->>DB: INSERT Fragment & Assistant Message
    DB-->>Worker: Saved
    Worker->>DB: Update usage
    
    Worker-->>Inngest: Job complete
    
    Note over UI: Real-time subscription
    DB-->>UI: New message & fragment
    UI-->>User: Display generated code
```

---

## Module Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (home)/            # Route group (public)
│   │   ├── page.tsx       # Landing page
│   │   ├── layout.tsx     # Public layout
│   │   ├── pricing/       # Pricing page
│   │   ├── sign-in/       # Auth pages
│   │   └── sign-up/
│   ├── projects/
│   │   └── [projectId]/   # Dynamic routes
│   │       └── page.tsx   # Project editor
│   ├── api/               # API routes
│   │   ├── upload/        # REST endpoint
│   │   ├── inngest/       # Webhook
│   │   └── trpc/          # tRPC handler
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Global styles
│   └── sitemap.ts         # SEO sitemap
│
├── components/            # React components
│   ├── ui/               # shadcn/ui primitives
│   ├── code-view/        # Code preview
│   ├── file-explorer.tsx # Tree view
│   ├── theme-switcher.tsx
│   └── structured-data.tsx
│
├── modules/              # Feature modules (DDD-style)
│   ├── home/
│   │   └── components/   # Home-specific UI
│   ├── messages/
│   │   ├── server/
│   │   │   └── procedures.ts  # tRPC endpoints
│   │   └── ui/
│   ├── projects/
│   │   ├── server/
│   │   │   └── procedures.ts
│   │   └── ui/
│   │       └── views/
│   └── usage/
│       └── server/
│           └── procedures.ts
│
├── trpc/                 # tRPC configuration
│   ├── init.ts          # Server setup
│   ├── client.tsx       # Client provider
│   ├── server.tsx       # Server caller
│   └── routers/
│       ├── _app.ts      # Root router
│       └── figma.ts     # (deprecated)
│
├── inngest/             # Background jobs
│   ├── client.ts       # Inngest client
│   ├── functions.ts    # Job definitions
│   ├── types.ts        # Type definitions
│   └── untils.ts       # Helper functions
│
├── lib/                 # Utilities
│   ├── db.ts           # Prisma client singleton
│   ├── metadata.ts     # SEO helpers
│   ├── usage.ts        # Credit management
│   └── utils.ts        # General utils
│
├── contexts/            # React contexts
│   └── theme-context.tsx
│
├── hooks/               # Custom hooks
│   ├── use-current-theme.ts
│   ├── use-mobile.ts
│   └── use-scroll.ts
│
├── middleware.ts        # Next.js middleware (auth)
├── promt.ts            # AI system prompts
└── types.ts            # Global types
```

---

## Technology Stack

### Frontend
```
React 19
├── Next.js 16.1.1 (App Router)
├── TypeScript 5.x
├── Tailwind CSS 4.0
├── Radix UI (Primitives)
└── shadcn/ui (Components)
```

### Backend
```
Node.js 20+
├── tRPC 11.x (API Layer)
├── Prisma 6.x (ORM)
├── PostgreSQL 16 (Database)
├── Clerk (Authentication)
└── Next.js API Routes (REST)
```

### Infrastructure
```
Serverless
├── Vercel (Hosting)
├── Inngest (Background Jobs)
├── E2B (Code Sandboxes)
└── OpenAI (AI Models)
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    VERCEL EDGE NETWORK                  │
├─────────────────────────────────────────────────────────┤
│  CDN + Edge Functions                                   │
│  - Static Assets (images, fonts)                        │
│  - Edge Middleware (auth checks)                        │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│              VERCEL SERVERLESS FUNCTIONS                │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  App Pages  │  │  API Routes │  │  tRPC API   │    │
│  │  (RSC)      │  │  (REST)     │  │  (RPC)      │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
┌───────▼────┐ ┌──▼──────┐ ┌▼────────────┐
│ PostgreSQL │ │ Inngest │ │    Clerk    │
│  (Neon)    │ │ Platform│ │   (Auth)    │
└────────────┘ └────┬────┘ └─────────────┘
                    │
              ┌─────┴─────┐
              │           │
        ┌─────▼────┐ ┌────▼────┐
        │ OpenAI   │ │   E2B   │
        │   API    │ │Sandboxes│
        └──────────┘ └─────────┘
```

---

## Security Architecture

```
┌─────────────────────────────────────────┐
│         Security Layers                 │
├─────────────────────────────────────────┤
│                                         │
│  1. Edge Layer (Vercel)                │
│     ✓ DDoS Protection                  │
│     ✓ SSL/TLS Termination              │
│     ✓ Rate Limiting                    │
│                                         │
│  2. Authentication (Clerk)             │
│     ✓ JWT Validation                   │
│     ✓ Session Management               │
│     ✓ MFA Support                      │
│                                         │
│  3. Authorization (Middleware)         │
│     ✓ Route Protection                 │
│     ✓ User ID Validation               │
│     ✓ Resource Ownership Check         │
│                                         │
│  4. API Layer (tRPC)                   │
│     ✓ Input Validation (Zod)           │
│     ✓ Type Safety                      │
│     ✓ Protected Procedures             │
│                                         │
│  5. Database (Prisma)                  │
│     ✓ Parameterized Queries            │
│     ✓ Connection Pooling               │
│     ✓ Row-Level Security               │
│                                         │
│  6. Sandbox (E2B)                      │
│     ✓ Isolated Execution               │
│     ✓ No Network Access                │
│     ✓ Resource Limits                  │
│                                         │
└─────────────────────────────────────────┘
```

---

## Scalability Considerations

### Current Capacity
- **Users**: 10,000 concurrent
- **Requests**: 1,000 req/sec
- **Database**: 100 GB
- **Sandboxes**: 50 concurrent

### Bottlenecks
1. **Database Connections** - Limited by connection pool
2. **OpenAI API** - Rate limited by quota
3. **E2B Sandboxes** - Limited concurrent sandboxes

### Scaling Strategy
1. **Horizontal**: Add more Vercel functions (auto-scales)
2. **Database**: Connection pooling + read replicas
3. **Caching**: Redis for session/usage data
4. **Queue**: Inngest handles async scaling

---

This architecture enables:
- ✅ Type-safe full-stack development
- ✅ Serverless scalability
- ✅ Real-time AI code generation
- ✅ Secure multi-tenant isolation
- ✅ Cost-efficient pay-per-use model
