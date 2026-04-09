# Sprint 3: AI Agent & Image-to-Code Feature

**Duration:** Week 5-6 (Jan 29 - Feb 11, 2026)  
**Goal:** Implement OpenAI-powered AI agent with vision capabilities for image-to-code generation

---

## 📋 Sprint Overview

### Sprint Goal

Integrate OpenAI GPT-4 with Vision API, implement autonomous AI agent with tools, and enable image upload for design-to-code conversion.

### Team Members

- Full-stack Developer: [@trantuanhung1209](https://github.com/trantuanhung1209)
- Full-stack Developer: [@DangKhoaGit](https://github.com/DangKhoaGit)

---

## 🎯 User Stories Completed

### 1. OpenAI Integration

**Story:** As the system, I need to communicate with OpenAI's GPT-4 API

**Tasks:**

- [x] Set up OpenAI account and API key
- [x] Install @inngest/agent-kit
- [x] Configure OpenAI client
- [x] Create system prompts for code generation
- [x] Implement token usage tracking
- [x] Test API calls with streaming

**Implementation:**

```typescript
import { openai } from "@inngest/agent-kit";

const model = openai({
  model: "gpt-4",
  apiKey: process.env.OPENAI_API_KEY,
});
```

**Acceptance Criteria:**

- ✅ Can call OpenAI API successfully
- ✅ System prompts guide AI correctly
- ✅ Token usage is tracked per request
- ✅ Streaming responses work
- ✅ Error handling for API failures

**Time:** 6 hours

---

### 2. AI Agent with Tools

**Story:** As an AI, I need tools to interact with the sandbox

**Tasks:**

- [x] Install @inngest/agent-kit
- [x] Create createOrUpdateFiles tool
- [x] Create terminal tool
- [x] Create readFiles tool
- [x] Implement agent network
- [x] Configure tool execution flow
- [x] Add error handling for tool failures

**Tools Created:**

```typescript
const createOrUpdateFilesTool = createTool({
  name: "createOrUpdateFiles",
  description: "Create or update multiple files in the sandbox",
  parameters: z.object({
    files: z.array(
      z.object({
        path: z.string(),
        content: z.string(),
      }),
    ),
  }),
  handler: async ({ files }, { network }) => {
    for (const file of files) {
      await sandbox.filesystem.write(file.path, file.content);
    }
    return { success: true };
  },
});
```

**Acceptance Criteria:**

- ✅ AI can create/update files in sandbox
- ✅ AI can run terminal commands
- ✅ AI can read file contents
- ✅ Tools return structured results
- ✅ Error messages are clear

**Time:** 12 hours

---

### 3. System Prompts

**Story:** As a developer, I need comprehensive prompts to guide the AI

**Tasks:**

- [x] Write PROMPT for general code generation
- [x] Write IMAGE_TO_CODE_PROMPT for vision tasks
- [x] Write RESPONSE_PROMPT for user-facing messages
- [x] Write FRAGMENT_TITLE_PROMPT for code titles
- [x] Document prompt engineering decisions
- [x] Test prompts with various inputs

**Key Prompt Sections:**

```typescript
export const PROMPT = `
You are a senior software engineer working in a Next.js 15 sandbox.

Environment:
- Writable file system
- Command execution via terminal
- Shadcn components pre-installed
- Tailwind CSS configured
- NO CSS files allowed - use Tailwind only

Rules:
- ALWAYS add "use client" to files using hooks
- NEVER run npm run dev (already running)
- Use relative paths only
- @ symbol only for imports, not file operations
...
`;
```

**Acceptance Criteria:**

- ✅ AI follows Next.js best practices
- ✅ AI uses Tailwind instead of CSS files
- ✅ AI adds "use client" where needed
- ✅ AI provides helpful error messages
- ✅ Generated code is production-quality

**Time:** 8 hours

---

### 4. Image Upload & Processing

**Story:** As a user, I want to upload images for design-to-code generation

**Tasks:**

- [x] Create /api/upload REST endpoint
- [x] Add image validation (type, size)
- [x] Convert images to base64 data URI
- [x] Update Message model with imageUrl fields
- [x] Run database migration
- [x] Build image upload UI component
- [x] Add image preview in chat

**API Implementation:**

```typescript
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("image") as File;

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "File must be an image" },
      { status: 400 },
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Image must be less than 5MB" },
      { status: 400 },
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = buffer.toString("base64");

  return NextResponse.json({
    success: true,
    imageUrl: `data:${file.type};base64,${base64}`,
  });
}
```

**Schema Update:**

```prisma
model Message {
  // ... existing fields
  imageUrl  String?
  hasImage  Boolean   @default(false)
}
```

**Acceptance Criteria:**

- ✅ Users can upload PNG/JPEG/WebP images
- ✅ Images are validated (type, size)
- ✅ Images are stored as base64 in database
- ✅ Images display in chat history
- ✅ AI receives images in Vision API format

**Time:** 10 hours

---

### 5. Vision API Integration

**Story:** As an AI, I need to analyze images to generate code

**Tasks:**

- [x] Format messages for Vision API
- [x] Include image_url in message content
- [x] Handle both text-only and image messages
- [x] Test with various design screenshots
- [x] Optimize prompt for design analysis
- [x] Handle vision API errors

**Message Formatting:**

```typescript
if (msg.hasImage && msg.imageUrl) {
  formattedMessages.push({
    type: "text",
    role: msg.role === "USER" ? "user" : "assistant",
    content: [
      {
        type: "text",
        text: msg.content || "Generate code from this design",
      },
      {
        type: "image_url",
        image_url: {
          url: msg.imageUrl,
        },
      },
    ],
  } as Message);
}
```

**Acceptance Criteria:**

- ✅ AI can analyze design images
- ✅ AI generates accurate HTML/CSS/React code
- ✅ AI extracts colors, layouts, typography
- ✅ Vision API errors are handled gracefully
- ✅ Works with both high and low quality images

**Time:** 9 hours

---

### 6. Usage Tracking System

**Story:** As the system, I need to track and limit API usage per user

**Tasks:**

- [x] Create Usage model in database
- [x] Implement consumeCredits() function
- [x] Create getUsageStatus() function
- [x] Add usage.status tRPC query
- [x] Integrate credit checks before API calls
- [x] Add error handling for exceeded limits

**Usage Model:**

```prisma
model Usage {
  key    String    @id
  points Int
  expire DateTime?
}
```

**Implementation:**

```typescript
export async function consumeCredits(cost: number = 150) {
  const { userId } = await auth();

  const usage = await prisma.usage.findUnique({
    where: { key: userId },
  });

  if (!usage || usage.points < cost) {
    throw new Error("Insufficient credits");
  }

  await prisma.usage.update({
    where: { key: userId },
    data: { points: usage.points - cost },
  });
}
```

**Acceptance Criteria:**

- ✅ Users start with allocated credits
- ✅ Credits are deducted per API call
- ✅ Users can check remaining credits
- ✅ Requests fail when credits exhausted
- ✅ Expiry date is enforced

**Time:** 7 hours

---

## 🔧 Technical Achievements

### AI & ML

- ✅ OpenAI GPT-4 integration
- ✅ Vision API for image analysis
- ✅ Autonomous agent with tool use
- ✅ Custom prompts for code generation

### Features

- ✅ Image upload and processing
- ✅ Image-to-code generation
- ✅ Usage tracking and limits
- ✅ Multi-turn conversations with context

### Data

- ✅ Message metadata storage
- ✅ Image URL storage (base64)
- ✅ Usage tracking database

---

## 📊 Sprint Metrics

| Metric          | Target  | Actual  | Status |
| --------------- | ------- | ------- | ------ |
| Story Points    | 30      | 30      | ✅     |
| User Stories    | 6       | 6       | ✅     |
| Bugs Found      | 3       | 5       | ⚠️     |
| AI Success Rate | 80%     | 75%     | ⚠️     |
| Code Coverage   | 10%     | 5%      | ❌     |
| Sprint Duration | 2 weeks | 2 weeks | ✅     |

---

## 🐛 Issues & Resolutions

### Issue #1: Image Size Limits

**Problem:** Large images (>10MB) caused 413 errors

**Solution:** Added client-side compression and 5MB limit

**Time Lost:** 3 hours

---

### Issue #2: Vision API Token Costs

**Problem:** Vision API consumed more tokens than expected

**Solution:** Adjusted credit deduction amounts and added warnings

**Time Lost:** 2 hours

---

### Issue #3: Tool Execution Order

**Problem:** AI tried to run commands before creating files

**Solution:** Improved system prompt to guide execution order

**Time Lost:** 5 hours

---

### Issue #4: Base64 Storage Performance

**Problem:** Large base64 strings slowed down database queries

**Solution:** Added indexes and considered moving to object storage (future)

**Time Lost:** 4 hours

---

### Issue #5: Context Window Limits

**Problem:** Long conversations exceeded GPT-4 context window

**Solution:** Limited message history to last 5 messages

**Time Lost:** 3 hours

---

## 🎓 Lessons Learned

### What Went Well ✅

- Vision API works better than expected for design analysis
- Agent-kit simplifies tool orchestration
- Users love the image-to-code feature
- Usage tracking prevents runaway costs

### What Could Be Improved 🔄

- Image storage should use S3/Cloudinary in production
- Need better prompt testing framework
- AI sometimes generates overly complex code
- Credit system UX needs improvement

### Action Items for Next Sprint 📝

- [ ] Migrate images to external storage
- [ ] Add AI response quality scoring
- [ ] Implement prompt versioning
- [ ] Create usage dashboard for users
- [ ] Add retry mechanism for failed generations

---

## 📸 Screenshots

### Image Upload UI

_(Drag-and-drop image upload component)_

### Image-to-Code Result

_(Before/after showing design screenshot and generated code)_

### Usage Dashboard

_(Credits remaining and usage history)_

---

## 🚀 Deployment

### Environment

- **AI Model:** GPT-4 with Vision (OpenAI)
- **Image Storage:** Base64 in PostgreSQL (temporary)
- **Usage Tracking:** PostgreSQL

### New Environment Variables

```bash
OPENAI_API_KEY="sk-..."
NEXT_PUBLIC_MAX_IMAGE_SIZE=5242880  # 5MB
DEFAULT_USER_CREDITS=10000
```

---

## 📝 Sprint Retrospective

### Team Feedback

**What went well:**

- Successfully integrated cutting-edge AI technology
- Image-to-code feature is a game-changer
- Agent tools work reliably
- Users are excited about the product

**Challenges:**

- Vision API debugging is difficult (black box)
- Prompt engineering is time-consuming and iterative
- Token costs are higher than anticipated
- AI occasionally "hallucinates" incorrect code

**Improvements for next sprint:**

- Add telemetry for AI decision-making
- Create test suite for prompts
- Implement cost monitoring alerts
- Add human-in-the-loop for verification

---

## 🎯 Key Metrics

### AI Performance

- **Success Rate:** 75% (target: 80%)
- **Avg Generation Time:** 45 seconds
- **Avg Token Usage:** 3,500 tokens/request
- **User Satisfaction:** 4.2/5 (from internal testing)

### Technical Metrics

- **API Latency:** p95 < 60s
- **Error Rate:** 5%
- **Image Upload Success:** 98%
- **Credit Exhaustion:** 2 users hit limit

---

## ✅ Definition of Done

- [x] All user stories completed
- [x] AI generates working code 75% of the time
- [x] Image upload works reliably
- [x] Vision API integrated and tested
- [x] Usage tracking prevents overuse
- [x] Manual testing with 10+ images passed
- [x] Error handling for common failures
- [x] Documentation updated

---

## 📅 Next Sprint Preview

**Sprint 4 Focus:** Polish, SEO, and Production Readiness

Planned stories:

1. Add comprehensive SEO metadata
2. Implement sitemap and robots.txt
3. Create documentation (README, API spec, Architecture)
4. Add error boundaries and loading states
5. Performance optimizations
6. Prepare for production deployment

---

**Sprint Completed:** ✅ February 11, 2026  
**Sprint Review Date:** February 11, 2026  
**Retrospective Date:** February 11, 2026  
**Next Sprint Starts:** February 12, 2026
