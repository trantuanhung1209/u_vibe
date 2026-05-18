# API Specification

## Base Information

- **Base URL**: `http://localhost:3000` (development) / `https://vibe.uside.studio` (production)
- **Protocol**: tRPC (type-safe RPC) + REST
- **Authentication**: Clerk (JWT tokens in cookies)
- **Content-Type**: `application/json`

---

## Authentication

All protected endpoints require authentication via Clerk.

**Headers:**
```
Cookie: __session=<clerk_session_token>
```

**Unauthenticated Response:**
```json
{
  "error": {
    "message": "UNAUTHORIZED",
    "code": -32001
  }
}
```

---

## tRPC API Endpoints

### Router Structure

```
/api/trpc/
├── projects.*       # Project management
├── messages.*       # Chat messages
├── usage.*          # Usage tracking
├── billing.*        # Billing summary and payment history
├── admin.*          # Admin analytics and payment logs
└── figma.*          # Figma integration (deprecated)
```

---

## 1. Projects Router

### `projects.getMany` - List User Projects

Get all projects for the authenticated user.

**Type:** `query`

**Input:**
```typescript
// No input required
```

**Output:**
```typescript
{
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}[]
```

**Example Request:**
```typescript
const projects = await trpc.projects.getMany.query();
```

**Example Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "purple-mountain",
    "userId": "user_2a1b3c4d",
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-01-18T14:22:00Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "crimson-river",
    "userId": "user_2a1b3c4d",
    "createdAt": "2026-01-10T08:15:00Z",
    "updatedAt": "2026-01-10T09:45:00Z"
  }
]
```

**Errors:**
- `401 UNAUTHORIZED` - Not authenticated

---

### `projects.getOne` - Get Single Project

Retrieve a specific project by ID.

**Type:** `query`

**Input:**
```typescript
{
  id: string; // Project UUID
}
```

**Output:**
```typescript
{
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Example Request:**
```typescript
const project = await trpc.projects.getOne.query({
  id: "550e8400-e29b-41d4-a716-446655440000"
});
```

**Example Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "purple-mountain",
  "userId": "user_2a1b3c4d",
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-01-18T14:22:00Z"
}
```

**Errors:**
- `401 UNAUTHORIZED` - Not authenticated
- `404 NOT_FOUND` - Project not found or not owned by user
- `400 BAD_REQUEST` - Invalid project ID

---

### `projects.create` - Create New Project

Create a new project with an initial message (and optional image).

**Type:** `mutation`

**Input:**
```typescript
{
  value: string;      // Initial prompt (1-5000 chars)
  imageUrl?: string;  // Optional: base64 image data URI
}
```

**Output:**
```typescript
{
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Example Request:**
```typescript
const project = await trpc.projects.create.mutate({
  value: "Create a modern landing page with hero section",
  imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANS..."
});
```

**Example Response:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "name": "azure-forest",
  "userId": "user_2a1b3c4d",
  "createdAt": "2026-01-20T16:45:00Z",
  "updatedAt": "2026-01-20T16:45:00Z"
}
```

**Side Effects:**
- Creates initial USER message
- Triggers `code-agent/run` Inngest event
- Deducts 1 credit: paid credits first, then free quota

**Errors:**
- `401 UNAUTHORIZED` - Not authenticated
- `400 BAD_REQUEST` - Invalid input (empty message, too long)
- `429 TOO_MANY_REQUESTS` - Usage limit exceeded

---

## 2. Messages Router

### `messages.getMany` - Get Chat History

Retrieve all messages for a specific project.

**Type:** `query`

**Input:**
```typescript
{
  projectId: string; // Project UUID
}
```

**Output:**
```typescript
{
  id: string;
  content: string;
  role: "USER" | "ASSISTANT";
  type: "RESULT" | "ERROR";
  metadata: any | null;
  imageUrl: string | null;
  hasImage: boolean;
  createdAt: Date;
  updatedAt: Date;
  projectId: string;
  fragment: {
    id: string;
    messageId: string;
    sandboxUrl: string;
    title: string;
    files: Record<string, string>;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}[]
```

**Example Request:**
```typescript
const messages = await trpc.messages.getMany.query({
  projectId: "550e8400-e29b-41d4-a716-446655440000"
});
```

**Example Response:**
```json
[
  {
    "id": "msg-001",
    "content": "Create a landing page",
    "role": "USER",
    "type": "RESULT",
    "metadata": null,
    "imageUrl": null,
    "hasImage": false,
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-01-15T10:30:00Z",
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "fragment": null
  },
  {
    "id": "msg-002",
    "content": "I've created a modern landing page with a hero section...",
    "role": "ASSISTANT",
    "type": "RESULT",
    "metadata": {
      "model": "gpt-4",
      "tokens": 1500
    },
    "imageUrl": null,
    "hasImage": false,
    "createdAt": "2026-01-15T10:32:15Z",
    "updatedAt": "2026-01-15T10:32:15Z",
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "fragment": {
      "id": "frag-001",
      "messageId": "msg-002",
      "sandboxUrl": "https://sandbox.e2b.dev/abc123",
      "title": "Landing Page",
      "files": {
        "app/page.tsx": "export default function Home() {...}",
        "components/Hero.tsx": "export function Hero() {...}"
      },
      "createdAt": "2026-01-15T10:32:15Z",
      "updatedAt": "2026-01-15T10:32:15Z"
    }
  }
]
```

**Errors:**
- `401 UNAUTHORIZED` - Not authenticated
- `400 BAD_REQUEST` - Missing or invalid projectId

---

### `messages.create` - Send Message

Add a new message to an existing project and trigger AI code generation.

**Type:** `mutation`

**Input:**
```typescript
{
  value: string;      // Message content (1-5000 chars)
  projectId: string;  // Project UUID
  imageUrl?: string;  // Optional: base64 image data URI
}
```

**Output:**
```typescript
{
  id: string;
  content: string;
  role: "USER";
  type: "RESULT";
  metadata: null;
  imageUrl: string | null;
  hasImage: boolean;
  createdAt: Date;
  updatedAt: Date;
  projectId: string;
}
```

**Example Request:**
```typescript
const message = await trpc.messages.create.mutate({
  value: "Add a dark mode toggle to the navbar",
  projectId: "550e8400-e29b-41d4-a716-446655440000",
  imageUrl: undefined
});
```

**Example Response:**
```json
{
  "id": "msg-003",
  "content": "Add a dark mode toggle to the navbar",
  "role": "USER",
  "type": "RESULT",
  "metadata": null,
  "imageUrl": null,
  "hasImage": false,
  "createdAt": "2026-01-15T11:00:00Z",
  "updatedAt": "2026-01-15T11:00:00Z",
  "projectId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Side Effects:**
- Triggers `code-agent/run` Inngest event
- Deducts 1 credit: paid credits first, then free quota
- AI generates response message asynchronously

**Errors:**
- `401 UNAUTHORIZED` - Not authenticated
- `404 NOT_FOUND` - Project not found
- `400 BAD_REQUEST` - Invalid input
- `429 TOO_MANY_REQUESTS` - Usage limit exceeded

---

## 3. Usage Router

### `usage.status` - Get Usage Status

Check remaining credits and usage limits.

**Type:** `query`

**Input:**
```typescript
// No input required
```

**Output:**
```typescript
{
  remainingPoints: number;
  consumedPoints: number;
  msBeforeNext: number;
  isFirstInDuration: boolean;
  paidCredits: number;
  freeCredits: number;
  isPro: boolean;
}
```

**Example Request:**
```typescript
const usage = await trpc.usage.status.query();
```

**Example Response:**
```json
{
  "remainingPoints": 189,
  "consumedPoints": 11,
  "msBeforeNext": 2052000000,
  "isFirstInDuration": false,
  "paidCredits": 100,
  "freeCredits": 89,
  "isPro": true
}
```

**Errors:**
- `401 UNAUTHORIZED` - Not authenticated

---

## 4. Billing Router

### `billing.summary` - Get Billing Summary

Returns the current user's credit balance and recent PayOS payment history.

**Type:** `query`

**Input:**
```typescript
// No input required
```

**Output:**
```typescript
{
  creditPack: {
    id: string;
    name: string;
    credits: number;
    amount: number;
    currency: "VND";
    description: string;
  };
  usage: {
    consumedPoints: number;
    remainingPoints: number;
    msBeforeNext: number;
    paidCredits: number;
    freeCredits: number;
    isPro: boolean;
    expire: Date | null;
  };
  payments: Array<{
    id: string;
    orderCode: string;
    amount: number;
    credits: number;
    status: "PENDING" | "PAID" | "CANCELLED" | "EXPIRED" | "FAILED";
    payosStatus: string | null;
    createdAt: Date;
    paidAt: Date | null;
  }>;
}
```

**Credit Rules:**
- Each prompt costs 1 credit.
- Paid credits are consumed before free credits.
- Paid credits stack across purchases and do not reset.
- Free credits reset every 30 days.

---

## REST API Endpoints

### `POST /api/upload` - Upload Image

Upload an image for image-to-code generation.

**Authentication:** Required (Clerk)

**Content-Type:** `multipart/form-data`

**Request Body:**
```
FormData:
  image: File (max 5MB, image/*)
```

**Response:**
```typescript
{
  success: boolean;
  imageUrl: string;   // Base64 data URI
  mimeType: string;
}
```

**Example Request (JavaScript):**
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
});

const data = await response.json();
console.log(data.imageUrl); // "data:image/png;base64,..."
```

**Example Response:**
```json
{
  "success": true,
  "imageUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "mimeType": "image/png"
}
```

**Errors:**
```json
// 401 Unauthorized
{
  "error": "Unauthorized"
}

// 400 No file
{
  "error": "No file uploaded"
}

// 400 Invalid type
{
  "error": "File must be an image"
}

// 400 Too large
{
  "error": "Image must be less than 5MB"
}

// 500 Server error
{
  "error": "Upload failed"
}
```

---

### `POST /api/inngest` - Inngest Webhook

Internal endpoint for Inngest event processing. Not for direct use.

**Authentication:** Inngest signing key

---

### `POST /api/payments/payos/checkout` - Create PayOS Checkout

Creates a PayOS payment link for the fixed credit pack.

**Authentication:** Required (Clerk)

**Response:**
```typescript
{
  checkoutUrl: string;
}
```

**Credit Pack:**
- Amount: `20,000 VND`
- Credits: `100`
- Purchase type: one-time, stackable

---

### `GET /api/payments/payos/return` - PayOS Return URL

PayOS redirects the user here after checkout. The server checks the PayOS order status and redirects to `/billing`.

**Redirects:**
- `/billing?payment=success` when PayOS confirms the order is paid
- `/billing?payment=pending` when confirmation is not available yet

---

### `GET /api/payments/payos/cancel` - PayOS Cancel URL

Marks a pending local payment as cancelled when the user cancels checkout, then redirects to `/pricing?payment=cancelled`.

---

### `POST /api/webhooks/payos` - PayOS Webhook

Receives PayOS payment notifications, verifies the signature, marks the `CreditPayment` as PAID, and adds credits to `CreditBalance`.

**Authentication:** PayOS checksum signature

**Idempotency:** A given `orderCode` is applied only once, even if PayOS retries the webhook or the return URL is visited multiple times.

---

## WebSocket / Subscriptions

tRPC supports subscriptions for real-time updates. Currently not implemented but can be added:

```typescript
// Future implementation
messages.onUpdate.subscribe(
  { projectId: "..." },
  {
    onData: (message) => {
      console.log('New message:', message);
    }
  }
);
```

---

## Rate Limiting

### Usage-Based Limits
- Each generation mutation deducts 1 credit
- Paid credits are consumed before free credits
- Paid credits do not reset; free credits reset every 30 days
- Check remaining credits via `usage.status`
- Queries (getMany, getOne) are free

### Technical Limits
- Max message length: 5000 characters
- Max image size: 5MB
- Max requests: 100/minute per user

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | Not authenticated or invalid token |
| `FORBIDDEN` | 403 | Authenticated but no permission |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `BAD_REQUEST` | 400 | Invalid input or malformed request |
| `TOO_MANY_REQUESTS` | 429 | Rate limit or usage limit exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

---

## Client Usage (TypeScript)

### Setup tRPC Client
```typescript
import { trpc } from '@/trpc/client';

// Queries (GET)
const projects = await trpc.projects.getMany.query();
const project = await trpc.projects.getOne.query({ id: '...' });
const usage = await trpc.usage.status.query();
const billing = await trpc.billing.summary.query();

// Mutations (POST/PUT/DELETE)
const newProject = await trpc.projects.create.mutate({
  value: 'Create a todo app',
});

const newMessage = await trpc.messages.create.mutate({
  value: 'Add a search feature',
  projectId: project.id,
});
```

### React Hooks
```typescript
import { trpc } from '@/trpc/client';

function ProjectList() {
  const { data, isLoading } = trpc.projects.getMany.useQuery();
  const createProject = trpc.projects.create.useMutation();
  
  const handleCreate = () => {
    createProject.mutate({
      value: 'Build a dashboard',
    });
  };
  
  return <div>{/* ... */}</div>;
}
```

---

## Postman Collection

Import this JSON to Postman:

```json
{
  "info": {
    "name": "Uside Vibe API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Upload Image",
      "request": {
        "method": "POST",
        "header": [],
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "image",
              "type": "file",
              "src": "/path/to/image.png"
            }
          ]
        },
        "url": {
          "raw": "{{baseUrl}}/api/upload",
          "host": ["{{baseUrl}}"],
          "path": ["api", "upload"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    }
  ]
}
```

---

## Testing

### Example cURL Commands

**Upload Image:**
```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Cookie: __session=<clerk_token>" \
  -F "image=@/path/to/design.png"
```

**Create Project (via tRPC HTTP):**
```bash
curl -X POST http://localhost:3000/api/trpc/projects.create \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=<clerk_token>" \
  -d '{
    "value": "Create a landing page"
  }'
```

---

## Versioning

Current version: **v1** (no versioning in URLs yet)

Future: `/api/v2/...` when breaking changes are introduced.
