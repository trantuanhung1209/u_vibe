# Uside Vibe

An AI-powered code generation platform that transforms your ideas and images into production-ready React applications. Chat with AI to build full-stack web apps instantly.

## 🎯 What is Uside Vibe?

Uside Vibe is a full-stack serverless application built with Next.js that lets you create web applications through natural conversation. Simply describe what you want to build or upload an image of a design, and our AI agents will generate complete, working code in an isolated sandbox environment.

## ✨ Key Features

- **💬 Chat-to-Code**: Describe your app in plain English and watch it come to life
- **🖼️ Image-to-Code**: Upload screenshots or mockups and get pixel-perfect React components
- **🤖 AI Agents**: Powered by OpenAI with autonomous coding capabilities
- **🔒 Secure Sandboxes**: Code runs in isolated E2B environments with Next.js pre-installed
- **⚡ Real-time Updates**: See your app build in real-time with live streaming
- **📝 Project Management**: Save, edit, and iterate on multiple projects
- **💳 PayOS Credits**: Buy one-time credit packs; paid credits stack and do not reset
- **📊 Billing Dashboard**: Users can view account, credits, and payment history
- **🎨 Beautiful UI**: Modern interface built with shadcn/ui components
- **💾 Persistent Storage**: PostgreSQL database for projects and chat history

## 🏗️ Architecture Overview

Uside Vibe uses a **hybrid serverless architecture** with distributed execution:

## 🏗️ Architecture Overview

Uside Vibe uses a **hybrid serverless architecture** with distributed execution:

```
┌─────────────────────────────────────────────┐
│  User Interface (Next.js + React)          │
│  • Project creation & chat interface       │
│  • Real-time code preview                  │
│  • Image upload & display                  │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  API Layer (tRPC + REST)                    │
│  • Type-safe mutations & queries            │
│  • Image upload API (/api/upload)          │
│  • PayOS checkout & webhook APIs           │
│  • Authentication middleware (Clerk)       │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Background Jobs (Inngest)                  │
│  • code-agent/run - AI code generation     │
│  • Async processing with streaming         │
│  • E2B sandbox lifecycle management        │
└─────────────────┬───────────────────────────┘
                  │
    ┌─────────────┴──────────────┐
    │                            │
┌───▼────────────┐    ┌──────────▼──────────┐
│  AI Engine     │    │  Code Execution     │
│  • OpenAI GPT  │    │  • E2B Sandboxes    │
│  • Vision API  │    │  • Next.js runtime  │
│  • Agent tools │    │  • Isolated env     │
└───┬────────────┘    └──────────┬──────────┘
    │                            │
    └─────────────┬──────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Data Layer (PostgreSQL + Prisma)          │
│  • Projects, Messages, Credits, Payments   │
│  • Image metadata storage                  │
└─────────────────────────────────────────────┘
```

### Core Flow: AI Code Generation

```mermaid
sequenceDiagram
    participant User
    participant UI as React UI
    participant tRPC as tRPC API
    participant Inngest as Inngest Job
    participant AI as OpenAI Agent
    participant E2B as E2B Sandbox
    participant DB as Database
    
    User->>UI: Create project / Send message
    UI->>UI: Optional: Upload image (base64)
    UI->>tRPC: messages.create({ content, imageUrl })
    tRPC->>DB: Save message & image metadata
    tRPC->>Inngest: Trigger "code-agent/run" event
    tRPC-->>UI: Return messageId
    
    Inngest->>E2B: Create isolated sandbox
    E2B-->>Inngest: Return sandboxId
    Inngest->>DB: Fetch conversation history
    DB-->>Inngest: Messages (with images)
    
    Inngest->>AI: Send messages + system prompt
    AI->>AI: Analyze text/image input
    AI->>AI: Plan code structure
    
    loop Code Generation
        AI->>E2B: createOrUpdateFiles(code)
        E2B-->>AI: File created
        AI->>E2B: terminal("npm install package")
        E2B-->>AI: Package installed
        AI->>E2B: readFiles("path")
        E2B-->>AI: File contents
    end
    
    AI-->>Inngest: Task complete with summary
    Inngest->>DB: Save generated code & results
    DB-->>UI: Stream updates (via tRPC subscription)
    UI-->>User: Display generated app
```

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16.1.1 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **Components**: shadcn/ui + Radix UI
- **State Management**: TanStack Query
- **Type Safety**: TypeScript

### Backend
- **API Layer**: tRPC (type-safe APIs)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: Clerk
- **Payments**: PayOS
- **Background Jobs**: Inngest
- **File Upload**: Next.js API Routes (base64)

### AI & Infrastructure
- **AI Model**: OpenAI GPT-4 with Vision
- **Agent Framework**: @inngest/agent-kit
- **Code Execution**: E2B Code Interpreter
- **Sandbox Template**: Custom Next.js environment

## 🚀 Getting Started

### Prerequisites

- Node.js 20 or higher
- PostgreSQL database
- OpenAI API key
- E2B API key
- Inngest account (free tier available)
- Clerk account for authentication
- PayOS merchant account for payments

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/trantuanhung1209/uside-vibe.git
cd uside-vibe
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables**:

Create a `.env.local` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/uside_vibe"

# OpenAI
OPENAI_API_KEY="sk-..."

# E2B Sandbox
E2B_API_KEY="e2b_..."

# Inngest
INNGEST_EVENT_KEY="your-inngest-event-key"
INNGEST_SIGNING_KEY="your-inngest-signing-key"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# PayOS Payments
PAYOS_CLIENT_ID="..."
PAYOS_API_KEY="..."
PAYOS_CHECKSUM_KEY="..."

# Site URL (for production)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="https://vibe.uside.studio"
```

4. **Set up the database**:
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Optional: Seed sample data
npm run db:seed
```

5. **Build the E2B sandbox template**:
```bash
cd sandbox-templates/nextjs
e2b template build --name uside-vibe-test-2
```

6. **Start the development server**:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### First Time Setup

1. Sign up for a new account
2. Create your first project
3. Try these prompts:
   - "Create a landing page with a hero section"
   - "Build a todo app with local storage"
   - Upload a screenshot: "Recreate this design"

## 📁 Project Structure

```
uside-vibe/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── sandbox-templates/
│   └── nextjs/               # E2B sandbox config
│       ├── e2b.Dockerfile
│       └── e2b.toml
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (home)/          # Public routes
│   │   │   ├── page.tsx     # Landing page
│   │   │   ├── pricing/     # PayOS credit purchase
│   │   │   ├── billing/     # Account, credits, payment history
│   │   │   ├── sign-in/     # Auth pages
│   │   │   └── sign-up/
│   │   ├── projects/
│   │   │   └── [projectId]/ # Dynamic project pages
│   │   ├── api/
│   │   │   ├── upload/      # Image upload endpoint
│   │   │   ├── inngest/     # Inngest webhook
│   │   │   ├── payments/    # PayOS checkout/return/cancel
│   │   │   ├── webhooks/    # PayOS webhook
│   │   │   └── trpc/        # tRPC handler
│   │   ├── layout.tsx       # Root layout
│   │   └── globals.css      # Global styles
│   ├── components/           # React components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── code-view/       # Code preview
│   │   ├── file-explorer.tsx
│   │   └── theme-switcher.tsx
│   ├── modules/             # Feature modules
│   │   ├── home/
│   │   ├── messages/
│   │   │   └── server/
│   │   │       └── procedures.ts  # tRPC endpoints
│   │   ├── projects/
│   │   │   ├── server/
│   │   │   └── ui/
│   │   └── usage/
│   ├── inngest/             # Background jobs
│   │   ├── client.ts
│   │   ├── functions.ts     # AI agent logic
│   │   └── types.ts
│   ├── trpc/                # tRPC setup
│   │   ├── init.ts          # tRPC config
│   │   ├── client.tsx       # Client provider
│   │   └── routers/
│   │       ├── _app.ts      # Root router
│   │       ├── admin.ts     # Admin analytics and payment logs
│   │       └── billing.ts   # Billing summary
│   ├── lib/
│   │   ├── db.ts            # Prisma client
│   │   ├── usage.ts         # Free/paid credit consumption
│   │   ├── payos.ts         # PayOS SDK client
│   │   ├── payments/        # Credit pack and payment utilities
│   │   ├── metadata.ts      # SEO helpers
│   │   └── utils.ts
│   ├── contexts/
│   │   └── theme-context.tsx
│   ├── hooks/
│   ├── promt.ts             # AI system prompts
│   ├── types.ts
│   └── middleware.ts        # Clerk auth
├── public/
│   ├── favicon.svg
│   └── og-image.png         # Social preview
├── docs/                    # Documentation
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

## 🎨 Key Features Explained

### 1. Image-to-Code Generation

Upload any design screenshot and the AI will:
- Analyze the image using GPT-4 Vision
- Extract layout, colors, components
- Generate pixel-perfect React code
- Install required dependencies
- Create working implementation

**Example Flow**:
```
Upload mockup.png → AI analyzes → Generates components → Installs packages → Live preview
```

### 2. Chat-Based Development

Describe your app naturally:
- "Create a dashboard with charts"
- "Add a dark mode toggle"
- "Make it responsive for mobile"

The AI agent:
- Understands context from previous messages
- Plans the implementation
- Writes modular, clean code
- Follows Next.js best practices

### 3. Secure Code Execution

Every project runs in an isolated E2B sandbox:
- ✅ Pre-configured Next.js 15 environment
- ✅ Tailwind CSS + shadcn/ui installed
- ✅ Hot reload enabled
- ✅ No risk to main system
- ✅ Automatic cleanup

### 4. Real-time Collaboration

- Live streaming of AI actions
- See files being created in real-time
- Watch package installations
- Instant preview of changes

## 🧪 Example Use Cases

### Landing Page
```
Prompt: "Create a modern SaaS landing page with pricing cards"
Result: Hero section, features, pricing table, footer, responsive design
```

### Dashboard
```
Prompt: "Build an admin dashboard with sidebar navigation"
Result: Layout, navigation, stats cards, charts (using recharts)
```

### From Image
```
Upload: Screenshot of Airbnb homepage
Result: Pixel-perfect recreation with grid layout, cards, filters
```

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript checking

# Database
npx prisma studio    # Open Prisma Studio
npx prisma migrate dev  # Create migration
npx prisma generate  # Regenerate client

# E2B
cd sandbox-templates/nextjs
e2b template build   # Rebuild sandbox template
```

### Debugging

**View Inngest dashboard**:
```bash
npx inngest-cli dev
```
Open http://localhost:8288

**Check database**:
```bash
npx prisma studio
```

**View logs**:
- Client: Browser console
- Server: Terminal running `npm run dev`
- Inngest: Inngest dashboard
- E2B: E2B console logs

## 🌐 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

Make sure to set all variables from `.env.local` in your deployment platform.

### Database

- Use hosted PostgreSQL (e.g., Neon, Supabase, Railway)
- Run migrations: `npx prisma migrate deploy`

### E2B Sandbox

Production sandboxes are automatically managed by E2B.

## 📊 Usage Tracking

The app uses a credit system:
- Each prompt consumes 1 credit
- Free users receive 30 free credits that reset every 30 days
- Paid credits are purchased through PayOS, stack across purchases, and do not reset
- Paid credits are consumed before free credits
- When paid credits reach 0, the user automatically falls back to the free quota

Users can view credit balance and payment history at `/billing`. Admins can view PayOS payment logs in `/admin`.

## 🔐 Security

- **Authentication**: Clerk handles all auth securely
- **API Protection**: All tRPC procedures check auth
- **Sandboxing**: Code runs isolated from main system
- **File Upload**: Validated, size-limited, base64 encoded
- **Rate Limiting**: Built into Inngest and OpenAI

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

MIT License - feel free to use this project for learning or commercial purposes.

## 🆘 Troubleshooting

**Issue**: "Sandbox timeout"
- Increase `SANDBOX_TIMEOUT` in inngest/types.ts
- Check E2B quota

**Issue**: "AI not responding"
- Verify OPENAI_API_KEY is valid
- Check credit balance at `/billing`
- View Inngest logs

**Issue**: "PayOS webhook not detected"
- Deploy the webhook route or expose local dev with a public tunnel
- Set PayOS webhook URL to `/api/webhooks/payos`
- Ensure `NEXT_PUBLIC_APP_URL` points to the current domain/tunnel

**Issue**: "Database connection failed"
- Check DATABASE_URL format
- Ensure PostgreSQL is running
- Run migrations

**Issue**: "Image upload fails"
- Max size: 5MB
- Supported: image/* types
- Check file permissions

## 📚 Learn More

### Documentation
- [Next.js](https://nextjs.org/docs) - React framework
- [tRPC](https://trpc.io/docs) - Type-safe APIs
- [Prisma](https://www.prisma.io/docs) - Database ORM
- [E2B](https://e2b.dev/docs) - Code sandboxes
- [Inngest](https://www.inngest.com/docs) - Background jobs
- [Clerk](https://clerk.com/docs) - Authentication
- [PayOS](https://payos.vn/docs/) - Payments
- [shadcn/ui](https://ui.shadcn.com) - UI components

### Related Projects
- [v0.dev](https://v0.dev) - Vercel's AI UI generator
- [bolt.new](https://bolt.new) - StackBlitz's AI coding
- [Cursor](https://cursor.sh) - AI code editor

## 👨‍💻 Author

Built by [@trantuanhung1209](https://github.com/trantuanhung1209)

---

**⭐ Star this repo if you find it useful!**
