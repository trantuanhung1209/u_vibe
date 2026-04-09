# Sprint 2: Core Features - Projects & E2B Integration

**Duration:** Week 3-4 (Jan 15-28, 2026)  
**Goal:** Implement project creation, E2B sandbox integration, and basic chat functionality

---

## 📋 Sprint Overview

### Sprint Goal
Enable users to create projects, send messages, and execute code in isolated E2B sandboxes with background job processing.

### Team Members
- Full-stack Developer: [@trantuanhung1209](https://github.com/trantuanhung1209)
- Full-stack Developer: [@DangKhoaGit](https://github.com/DangKhoaGit)

---

## 🎯 User Stories Completed

### 1. Project Management
**Story:** As a user, I want to create and view my projects

**Tasks:**
- [x] Create projects.create tRPC mutation
- [x] Implement project name generation (random-word-slugs)
- [x] Create projects.getMany query (user's projects)
- [x] Create projects.getOne query (single project)
- [x] Build project list UI component
- [x] Add route protection for /projects/:id

**Implementation:**
```typescript
create: protectedProcedure
  .input(z.object({
    value: z.string().min(1).max(5000),
  }))
  .mutation(async ({ input, ctx }) => {
    const project = await prisma.project.create({
      data: {
        userId: ctx.auth.userId,
        name: generateSlug(2, { format: "kebab" }),
        messages: {
          create: {
            content: input.value,
            role: "USER",
            type: "RESULT",
          },
        },
      },
    });
    return project;
  });
```

**Acceptance Criteria:**
- ✅ Users can create projects with initial message
- ✅ Project names are auto-generated (e.g., "purple-mountain")
- ✅ Users see only their own projects
- ✅ Project details page loads correctly

**Time:** 8 hours

---

### 2. Message System
**Story:** As a user, I want to send messages within a project

**Tasks:**
- [x] Create messages.create mutation
- [x] Create messages.getMany query
- [x] Add Fragment model to schema
- [x] Run database migration
- [x] Build chat interface component
- [x] Implement message display with role differentiation

**Schema Addition:**
```prisma
model Fragment {
  id         String   @id @default(uuid())
  messageId  String   @unique
  message    Message  @relation(...)
  sandboxUrl String
  title      String
  files      Json
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

**Acceptance Criteria:**
- ✅ Users can send messages in a project
- ✅ Messages are associated with correct project
- ✅ Chat history displays in chronological order
- ✅ User vs Assistant messages are visually distinct

**Time:** 6 hours

---

### 3. E2B Sandbox Integration
**Story:** As the system, I need to execute code in isolated sandboxes

**Tasks:**
- [x] Set up E2B account and API key
- [x] Install @e2b/code-interpreter
- [x] Create custom sandbox template with Next.js
- [x] Build getSandbox utility function
- [x] Implement sandbox creation and connection
- [x] Test code execution in sandbox
- [x] Configure sandbox timeout (15 minutes)

**Sandbox Template:**
```dockerfile
# e2b.Dockerfile
FROM node:20-slim
RUN npm install -g create-next-app@latest
WORKDIR /home/user
RUN npx create-next-app@latest . --typescript --tailwind --app
```

**Implementation:**
```typescript
export async function getSandbox(sandboxId?: string) {
  if (sandboxId) {
    return await Sandbox.connect(sandboxId);
  }
  const sandbox = await Sandbox.create("uside-vibe-test-2");
  await sandbox.setTimeout(900_000); // 15 min
  return sandbox;
}
```

**Acceptance Criteria:**
- ✅ Sandboxes are created on demand
- ✅ Code executes in isolated environment
- ✅ Sandbox URLs are accessible
- ✅ Sandboxes timeout after 15 minutes
- ✅ Can write and read files in sandbox

**Time:** 12 hours

---

### 4. Inngest Background Jobs
**Story:** As the system, I need to process AI code generation in the background

**Tasks:**
- [x] Set up Inngest account
- [x] Install inngest package
- [x] Create Inngest client
- [x] Implement code-agent function
- [x] Create /api/inngest webhook endpoint
- [x] Configure event sending from tRPC
- [x] Test job execution and monitoring

**Inngest Function:**
```typescript
export const codeAgentFunction = inngest.createFunction(
  { id: "code-agent" },
  { event: "code-agent/run" },
  async ({ event, step }) => {
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("uside-vibe-test-2");
      return sandbox.sandboxId;
    });
    
    // ... AI agent logic
    
    return { success: true };
  }
);
```

**Acceptance Criteria:**
- ✅ Events are sent to Inngest on message creation
- ✅ Webhook receives events correctly
- ✅ Functions execute asynchronously
- ✅ Can monitor jobs in Inngest dashboard
- ✅ Errors are logged and handled

**Time:** 10 hours

---

### 5. Basic UI/UX
**Story:** As a user, I want an intuitive interface

**Tasks:**
- [x] Create home page with project form
- [x] Build project editor layout
- [x] Add loading states for async operations
- [x] Implement toast notifications (sonner)
- [x] Add responsive design for mobile
- [x] Create theme switcher component

**Acceptance Criteria:**
- ✅ Home page has clear call-to-action
- ✅ Forms show validation errors
- ✅ Loading spinners during API calls
- ✅ Success/error toasts appear
- ✅ UI works on mobile devices
- ✅ Dark mode toggle functions

**Time:** 9 hours

---

## 🔧 Technical Achievements

### Backend
- ✅ Complete tRPC API for projects and messages
- ✅ Inngest background job processing
- ✅ E2B sandbox integration
- ✅ Database schema with Fragment support

### Frontend
- ✅ Responsive chat interface
- ✅ Real-time loading states
- ✅ Toast notifications
- ✅ Theme system

### DevOps
- ✅ E2B sandbox template deployed
- ✅ Inngest webhook configured
- ✅ Environment variables documented

---

## 📊 Sprint Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Story Points | 25 | 25 | ✅ |
| User Stories | 5 | 5 | ✅ |
| Bugs Found | 2 | 4 | ⚠️ |
| Code Coverage | 0% | 0% | ⏳ |
| Sprint Duration | 2 weeks | 2 weeks | ✅ |

---

## 🐛 Issues & Resolutions

### Issue #1: E2B Sandbox Timeout
**Problem:** Sandboxes were timing out after 5 minutes (default)

**Solution:** Added explicit timeout configuration: `sandbox.setTimeout(900_000)`

**Time Lost:** 3 hours

---

### Issue #2: Inngest Event Size Limit
**Problem:** Events larger than 256KB were rejected (when including images)

**Solution:** Store images in database, only send messageId in event

**Time Lost:** 4 hours

---

### Issue #3: Fragment Unique Constraint
**Problem:** Duplicate fragments being created for same message

**Solution:** Added unique constraint on `Fragment.messageId` in schema

**Time Lost:** 1 hour

---

### Issue #4: Prisma Client Regeneration
**Problem:** Types not updating after schema changes

**Solution:** Added `npx prisma generate` to build process

**Time Lost:** 2 hours

---

## 🎓 Lessons Learned

### What Went Well ✅
- E2B sandboxes work reliably
- Inngest provides excellent job monitoring
- tRPC makes API development fast
- Random slug generation creates memorable project names

### What Could Be Improved 🔄
- Better event size planning (avoided with DB storage)
- More upfront research on E2B limits
- Earlier testing of full flow (UI → API → Job → Sandbox)

### Action Items for Next Sprint 📝
- [ ] Add proper error boundaries in React
- [ ] Implement retry logic for failed jobs
- [ ] Add unit tests for utilities
- [ ] Set up CI/CD pipeline

---

## 📸 Screenshots

### Home Page - Project Creation
*(Form with text input for initial prompt)*

### Chat Interface
*(Message history with user/assistant distinction)*

### Inngest Dashboard
*(Job monitoring and execution logs)*

---

## 🚀 Deployment

### Environment
- **Development:** Local PostgreSQL + E2B sandboxes
- **Background Jobs:** Inngest cloud (free tier)
- **Sandbox Template:** `uside-vibe-test-2` deployed to E2B

### New Environment Variables
```bash
E2B_API_KEY="e2b_..."
INNGEST_EVENT_KEY="..."
INNGEST_SIGNING_KEY="..."
```

---

## 📝 Sprint Retrospective

### Team Feedback
**What went well:**
- Successfully integrated two major external services (E2B, Inngest)
- Core functionality is working end-to-end
- UI is clean and functional

**Challenges:**
- Event size limits required architecture change
- E2B documentation was sometimes unclear
- Debugging async jobs is harder than sync code

**Improvements for next sprint:**
- Add structured logging
- Create better error messages for users
- Document common troubleshooting steps

---

## ✅ Definition of Done

- [x] All user stories completed
- [x] Manual testing passed
- [x] E2B sandboxes working in dev
- [x] Inngest jobs executing successfully
- [x] Database migrations applied
- [x] UI is responsive
- [x] No blocking bugs
- [x] README updated with new setup steps

---

## 📅 Next Sprint Preview

**Sprint 3 Focus:** AI Integration & OpenAI Agent

Planned stories:
1. Integrate OpenAI API
2. Implement AI agent with tools
3. Add code generation logic
4. Support for iterative conversations
5. Usage tracking system

---

**Sprint Completed:** ✅ January 28, 2026  
**Sprint Review Date:** January 28, 2026  
**Retrospective Date:** January 28, 2026
