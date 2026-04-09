# Sprint 1: Project Foundation & Setup

**Duration:** Week 1-2 (Jan 1-14, 2026)  
**Goal:** Initialize project infrastructure and core architecture

---

## 📋 Sprint Overview

### Sprint Goal
Set up the foundational architecture for Uside Vibe, including database, authentication, and basic project structure.

### Team Members
- Full-stack Developer: [@trantuanhung1209](https://github.com/trantuanhung1209)
- Full-stack Developer: [@DangKhoaGit](https://github.com/DangKhoaGit)

---

## 🎯 User Stories Completed

### 1. Project Initialization
**Story:** As a developer, I need to set up the Next.js project structure

**Tasks:**
- [x] Initialize Next.js 16 with App Router
- [x] Configure TypeScript and ESLint
- [x] Set up Tailwind CSS 4.0
- [x] Install and configure shadcn/ui components
- [x] Create folder structure (app/, components/, lib/, etc.)

**Acceptance Criteria:**
- ✅ Project builds successfully
- ✅ TypeScript compiles without errors
- ✅ Tailwind classes work correctly
- ✅ shadcn/ui button component renders

**Time:** 8 hours

---

### 2. Database Setup
**Story:** As a system, I need a database to store user projects and messages

**Tasks:**
- [x] Install and configure Prisma ORM
- [x] Design initial database schema
- [x] Create Project model
- [x] Create Message model
- [x] Set up PostgreSQL connection
- [x] Run initial migrations

**Schema Created:**
```prisma
model Project {
  id        String   @id @default(uuid())
  name      String
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  messages  Message[]
}

model Message {
  id        String      @id @default(uuid())
  content   String
  role      MessageRole
  type      MessageType
  projectId String
  project   Project     @relation(...)
  createdAt DateTime    @default(now())
}
```

**Acceptance Criteria:**
- ✅ Database schema is normalized
- ✅ Migrations run successfully
- ✅ Can create and query projects
- ✅ Foreign keys work correctly

**Time:** 6 hours

---

### 3. Authentication Integration
**Story:** As a user, I need to sign up and log in to use the platform

**Tasks:**
- [x] Set up Clerk account
- [x] Install @clerk/nextjs
- [x] Create ClerkProviderWrapper component
- [x] Configure sign-in and sign-up pages
- [x] Implement middleware for route protection
- [x] Test authentication flow

**Implementation:**
```typescript
// middleware.ts
export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});
```

**Acceptance Criteria:**
- ✅ Users can sign up with email
- ✅ Users can log in
- ✅ Protected routes redirect to sign-in
- ✅ User ID is available in API routes

**Time:** 5 hours

---

### 4. tRPC Setup
**Story:** As a developer, I need type-safe API endpoints

**Tasks:**
- [x] Install @trpc/server and @trpc/client
- [x] Create tRPC initialization file
- [x] Set up context with Clerk auth
- [x] Create root router
- [x] Configure client provider
- [x] Create protected procedure middleware

**Implementation:**
```typescript
// trpc/init.ts
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.auth.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx });
});

export const protectedProcedure = t.procedure.use(isAuthed);
```

**Acceptance Criteria:**
- ✅ tRPC endpoints are type-safe
- ✅ Protected procedures check authentication
- ✅ Client can call procedures
- ✅ React Query integration works

**Time:** 7 hours

---

## 🔧 Technical Achievements

### Infrastructure
- ✅ Next.js 16.1.1 with App Router
- ✅ TypeScript 5.x configuration
- ✅ Prisma ORM with PostgreSQL
- ✅ Clerk authentication
- ✅ tRPC for API layer

### Code Quality
- ✅ ESLint configuration
- ✅ TypeScript strict mode enabled
- ✅ Git repository initialized
- ✅ .gitignore configured

---

## 📊 Sprint Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Story Points | 20 | 20 | ✅ |
| User Stories | 4 | 4 | ✅ |
| Bugs Found | 0 | 2 | ⚠️ |
| Code Coverage | N/A | N/A | - |
| Sprint Duration | 2 weeks | 2 weeks | ✅ |

---

## 🐛 Issues & Resolutions

### Issue #1: Prisma Client Generation Path
**Problem:** Generated Prisma client not found by TypeScript

**Solution:** Updated `output` path in schema.prisma to `../src/generated/prisma`

**Time Lost:** 2 hours

---

### Issue #2: Clerk Middleware Conflict
**Problem:** Middleware blocking API routes

**Solution:** Updated route matcher to allow `/api/trpc/*` and `/api/inngest`

**Time Lost:** 1 hour

---

## 🎓 Lessons Learned

### What Went Well ✅
- Next.js App Router is intuitive and powerful
- Clerk integration was straightforward
- tRPC provides excellent type safety
- Prisma migrations worked smoothly

### What Could Be Improved 🔄
- Better initial planning of database schema
- More time allocated for middleware configuration
- Earlier testing of authentication flow

### Action Items for Next Sprint 📝
- [ ] Add more comprehensive error handling
- [ ] Set up logging infrastructure
- [ ] Create development environment documentation

---

## 📸 Screenshots

### Database Schema Visualization
*(ERD diagram showing Project and Message tables)*

### Authentication Flow
*(Screenshots of sign-in/sign-up pages)*

---

## 🚀 Deployment

### Environment
- **Development:** Local PostgreSQL
- **Authentication:** Clerk development instance
- **Hosting:** Local (port 3000)

### Configuration
```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
```

---

## 📝 Sprint Retrospective

### Team Feedback
**What went well:**
- Project setup completed on schedule
- All technical dependencies integrated successfully
- Good foundation for future features

**Challenges:**
- Learning curve with Prisma's generated client
- Clerk middleware configuration took longer than expected

**Improvements for next sprint:**
- Start with clearer acceptance criteria
- Allocate buffer time for integration issues
- Set up automated testing earlier

---

## ✅ Definition of Done

- [x] All user stories completed
- [x] Code reviewed (self-review)
- [x] No critical bugs remaining
- [x] Database migrations successful
- [x] Authentication working in dev environment
- [x] tRPC endpoints tested manually
- [x] Documentation updated (README)

---

## 📅 Next Sprint Preview

**Sprint 2 Focus:** Core Features - Projects & Messages

Planned stories:
1. Create project functionality
2. Chat interface implementation
3. Message history display
4. Basic UI/UX improvements

---

**Sprint Completed:** ✅ January 14, 2026  
**Sprint Review Date:** January 14, 2026  
**Retrospective Date:** January 14, 2026
