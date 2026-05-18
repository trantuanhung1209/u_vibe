# BÁO CÁO DỰ ÁN: USIDE VIBE

## Nền tảng sinh mã nguồn tự động bằng AI

---

## MỤC LỤC

1. [Giới thiệu tổng quan](#1-giới-thiệu-tổng-quan)
2. [Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
3. [Công nghệ sử dụng](#3-công-nghệ-sử-dụng)
4. [Cơ sở dữ liệu](#4-cơ-sở-dữ-liệu)
5. [Luồng dữ liệu](#5-luồng-dữ-liệu)
6. [Các chức năng chính](#6-các-chức-năng-chính)
7. [Cấu trúc thư mục dự án](#7-cấu-trúc-thư-mục-dự-án)
8. [Xử lý bảo mật và phân quyền](#8-xử-lý-bảo-mật-và-phân-quyền)
9. [Triển khai và vận hành](#9-triển-khai-và-vận-hành)
10. [Tổng kết](#10-tổng-kết)

---

## 1. Giới thiệu tổng quan

**Uside Vibe** là một nền tảng web cho phép người dùng tạo ứng dụng web (Next.js) thông qua giao tiếp bằng ngôn ngữ tự nhiên với AI. Người dùng chỉ cần mô tả ý tưởng bằng lời hoặc tải ảnh thiết kế — hệ thống sẽ tự động sinh mã nguồn, chạy trong sandbox và hiển thị kết quả trực tiếp.

### Tính năng nổi bật:
- **Chat-to-Code**: Mô tả bằng lời → AI sinh code Next.js hoàn chỉnh
- **Image-to-Code**: Tải ảnh thiết kế → AI chuyển thành code
- **Live Preview**: Xem kết quả trực tiếp trong trình duyệt qua E2B Sandbox
- **Hỗ trợ đa ngôn ngữ**: AI trả lời theo ngôn ngữ người dùng sử dụng
- **Dừng/Tiếp tục sinh code**: Người dùng có thể dừng quá trình sinh code và tiếp tục bất cứ lúc nào
- **Thanh toán PayOS**: Mua credit một lần, cộng dồn paid credits và xem lịch sử billing
- **Tải xuống dự án**: Xuất code thành file ZIP

---

## 2. Kiến trúc hệ thống

### 2.1 Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                            │
│              (Next.js 15 - App Router)                   │
│                                                          │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Trang   │  │   Trang      │  │    Trang          │  │
│  │  chủ     │  │   Project    │  │    Admin           │  │
│  │ (home)   │  │   (editor)   │  │    (quản trị)     │  │
│  └──────────┘  └──────────────┘  └───────────────────┘  │
│         │              │                  │              │
│         └──────────────┼──────────────────┘              │
│                        │                                 │
│              ┌─────────▼─────────┐                       │
│              │   tRPC Client     │                       │
│              │ (React Query +    │                       │
│              │  httpBatchLink)    │                       │
│              └─────────┬─────────┘                       │
└────────────────────────┼────────────────────────────────┘
                         │ HTTP (Batch)
                         │
┌────────────────────────┼────────────────────────────────┐
│                    BACKEND                               │
│             (Next.js API Routes)                         │
│                        │                                 │
│              ┌─────────▼─────────┐                       │
│              │   tRPC Server     │                       │
│              │   (AppRouter)     │                       │
│              └─────────┬─────────┘                       │
│                        │                                 │
│    ┌───────────┬───────┼───────┬──────────┐              │
│    │           │       │       │          │              │
│    ▼           ▼       ▼       ▼          ▼              │
│ messages  projects  usage     admin                      │
│ Router    Router    Router    Router                     │
│    │           │       │          │                      │
│    └───────────┴───────┼──────────┘                      │
│                        │                                 │
│              ┌─────────▼─────────┐                       │
│              │    Prisma ORM     │                       │
│              │  (PostgreSQL)     │                       │
│              └─────────┬─────────┘                       │
└────────────────────────┼────────────────────────────────┘
                         │
            ┌────────────┼────────────────┐
            │            │                │
            ▼            ▼                ▼
    ┌──────────┐  ┌────────────┐  ┌─────────────┐
    │PostgreSQL│  │  Inngest   │  │ E2B Sandbox │
    │ Database │  │ (Event     │  │ (Code       │
    │          │  │  Queue)    │  │  Execution) │
    └──────────┘  └─────┬──────┘  └──────┬──────┘
                        │                │
                        ▼                │
                 ┌─────────────┐         │
                 │  OpenAI API │         │
                 │ (GPT-4.1 /  │◄────────┘
                 │  GPT-4o)    │
                 └─────────────┘
```

### 2.2 Mô hình giao tiếp

- **Client ↔ Server**: Giao tiếp qua **tRPC** (Type-safe RPC) với batch HTTP requests
- **Server ↔ AI**: Giao tiếp qua **Inngest** (Event-driven queue) đến **OpenAI API**
- **AI ↔ Sandbox**: AI điều khiển **E2B Sandbox** để chạy terminal, đọc/ghi file
- **Server ↔ Database**: Giao tiếp qua **Prisma ORM** với **PostgreSQL**

---

## 3. Công nghệ sử dụng

### 3.1 Frontend

| Công nghệ | Phiên bản | Mục đích |
|---|---|---|
| **Next.js** | 15.3.3 | Framework React với App Router, SSR/SSG |
| **React** | 19.x | Thư viện UI |
| **TypeScript** | 5.x | Ngôn ngữ lập trình type-safe |
| **Tailwind CSS** | 4.x | Utility-first CSS framework |
| **Shadcn UI** | latest | Thư viện component (dựa trên Radix UI) |
| **TanStack React Query** | 5.x | Quản lý state server, caching, polling |
| **tRPC Client** | 11.x | Type-safe API client |
| **React Hook Form** | latest | Quản lý form |
| **Zod** | latest | Schema validation |
| **Lucide React** | latest | Icon library |
| **Sonner** | latest | Toast notifications |
| **React Resizable Panels** | latest | Giao diện chia panel kéo thả |

### 3.2 Backend

| Công nghệ | Phiên bản | Mục đích |
|---|---|---|
| **Next.js API Routes** | 15.x | API endpoints (tRPC + REST) |
| **tRPC Server** | 11.x | Type-safe API layer |
| **Prisma ORM** | 6.x | Database access layer |
| **PostgreSQL** | - | Cơ sở dữ liệu chính |
| **Inngest** | 3.54.x | Event-driven background job queue |
| **@inngest/agent-kit** | 0.13.x | Multi-agent AI framework |
| **OpenAI** | GPT-4.1 / GPT-4o | Mô hình AI sinh code |
| **E2B Sandbox** | 2.x | Môi trường sandbox chạy code |
| **Clerk** | 6.x | Authentication & User management |
| **PayOS** | 2.x | Thanh toán credit một lần tại Việt Nam |
| **rate-limiter-flexible** | latest | Rate limiting / Usage tracking |
| **SuperJSON** | latest | Serialization cho tRPC |

### 3.3 Dịch vụ bên ngoài

| Dịch vụ | Mục đích |
|---|---|
| **Clerk** | Xác thực người dùng (Google, GitHub, Email) |
| **OpenAI API** | Sinh code bằng AI (GPT-4.1 cho text, GPT-4o cho hình ảnh) |
| **Inngest Cloud** | Quản lý event queue và background jobs |
| **E2B** | Sandbox cloud để chạy code an toàn |
| **PayOS** | Tạo link thanh toán, xác thực webhook, ghi nhận đơn mua credit |
| **Vercel** | Hosting và CI/CD |

---

## 4. Cơ sở dữ liệu

### 4.1 Sơ đồ quan hệ (ERD)

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│   Project    │       │     Message      │       │   Fragment   │
├──────────────┤       ├──────────────────┤       ├──────────────┤
│ id       (PK)│◄──────│ projectId   (FK) │       │ id       (PK)│
│ name         │  1:N  │ id          (PK) │──────►│ messageId(FK)│
│ userId       │       │ content          │  1:1  │ sandboxUrl   │
│ createdAt    │       │ role (enum)      │       │ title        │
│ updatedAt    │       │ type (enum)      │       │ files (JSON) │
└──────────────┘       │ metadata (JSON)  │       │ createdAt    │
                       │ imageUrl         │       │ updatedAt    │
                       │ hasImage         │       └──────────────┘
                       │ createdAt        │
                       │ updatedAt        │
                       └──────────────────┘

┌──────────────┐
│    Usage     │
├──────────────┤
│ key      (PK)│   (key = userId, dùng cho free quota)
│ points       │
│ expire       │
└──────────────┘

┌────────────────┐       ┌─────────────────┐
│ CreditBalance  │       │  CreditPayment  │
├────────────────┤       ├─────────────────┤
│ userId     PK  │       │ id          PK  │
│ credits        │       │ orderCode unique│
│ createdAt      │       │ userId          │
│ updatedAt      │       │ amount          │
└────────────────┘       │ credits         │
                         │ status          │
                         │ paymentLinkId   │
                         │ checkoutUrl     │
                         │ rawData         │
                         │ paidAt          │
                         └─────────────────┘
```

### 4.2 Chi tiết các bảng

#### Bảng `Project`
| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `id` | `String (UUID)` | Khóa chính, tự động sinh |
| `name` | `String` | Tên dự án (lấy từ prompt đầu tiên của user) |
| `userId` | `String` | ID người dùng từ Clerk |
| `createdAt` | `DateTime` | Thời gian tạo |
| `updatedAt` | `DateTime` | Thời gian cập nhật gần nhất |

#### Bảng `Message`
| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `id` | `String (UUID)` | Khóa chính |
| `content` | `String` | Nội dung tin nhắn |
| `role` | `Enum (USER/ASSISTANT)` | Vai trò: người dùng hoặc AI |
| `type` | `Enum (RESULT/ERROR)` | Loại: kết quả thành công hoặc lỗi |
| `metadata` | `Json?` | Dữ liệu bổ sung |
| `imageUrl` | `String?` | URL hình ảnh đính kèm (base64) |
| `hasImage` | `Boolean` | Có hình ảnh hay không |
| `projectId` | `String (FK)` | Liên kết đến Project |
| `createdAt` | `DateTime` | Thời gian tạo |
| `updatedAt` | `DateTime` | Thời gian cập nhật |

#### Bảng `Fragment`
| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `id` | `String (UUID)` | Khóa chính |
| `messageId` | `String (FK, unique)` | Liên kết 1:1 đến Message |
| `sandboxUrl` | `String` | URL sandbox E2B để xem demo |
| `title` | `String` | Tiêu đề code fragment (AI sinh) |
| `files` | `Json` | Nội dung các file code (key: path, value: content) |
| `createdAt` | `DateTime` | Thời gian tạo |
| `updatedAt` | `DateTime` | Thời gian cập nhật |

#### Bảng `Usage`
| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `key` | `String (PK)` | User ID — dùng làm khóa chính cho free quota |
| `points` | `Int` | Số free credits đã sử dụng trong chu kỳ |
| `expire` | `DateTime?` | Thời điểm reset chu kỳ free credits |

#### Bảng `CreditBalance`
| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `userId` | `String (PK)` | ID người dùng từ Clerk |
| `credits` | `Int` | Số paid credits còn lại, không tự reset |
| `createdAt` | `DateTime` | Thời gian tạo balance |
| `updatedAt` | `DateTime` | Thời gian cập nhật balance |

#### Bảng `CreditPayment`
| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `id` | `String (UUID)` | Khóa chính |
| `orderCode` | `BigInt (unique)` | Mã đơn hàng gửi sang PayOS |
| `userId` | `String` | ID người mua từ Clerk |
| `amount` | `Int` | Số tiền thanh toán (VND) |
| `credits` | `Int` | Số credit cộng thêm khi thanh toán thành công |
| `description` | `String` | Mô tả đơn hàng PayOS |
| `status` | `Enum` | Trạng thái: PENDING/PAID/CANCELLED/EXPIRED/FAILED |
| `paymentLinkId` | `String?` | ID payment link từ PayOS |
| `checkoutUrl` | `String?` | URL checkout PayOS |
| `payosStatus` | `String?` | Trạng thái/mô tả trả về từ PayOS |
| `rawData` | `Json?` | Payload PayOS để đối soát |
| `paidAt` | `DateTime?` | Thời gian ghi nhận thanh toán thành công |

---

## 5. Luồng dữ liệu

### 5.1 Luồng tạo project mới (Chat-to-Code)

```
Người dùng                   Frontend                     Backend (tRPC)              Inngest                    AI (OpenAI)              E2B Sandbox
    │                           │                              │                        │                           │                        │
    │  1. Nhập prompt           │                              │                        │                           │                        │
    │  "Tạo trang landing"     │                              │                        │                           │                        │
    │ ─────────────────────────►│                              │                        │                           │                        │
    │                           │  2. projects.create          │                        │                           │                        │
    │                           │  {value: "Tạo trang..."}    │                        │                           │                        │
    │                           │ ────────────────────────────►│                        │                           │                        │
    │                           │                              │  3. consumeCredits()   │                           │                        │
    │                           │                              │  (kiểm tra usage)      │                           │                        │
    │                           │                              │                        │                           │                        │
    │                           │                              │  4. prisma.project     │                           │                        │
    │                           │                              │     .create()          │                           │                        │
    │                           │                              │  (tạo Project +        │                           │                        │
    │                           │                              │   Message USER)        │                           │                        │
    │                           │                              │                        │                           │                        │
    │                           │                              │  5. inngest.send()     │                           │                        │
    │                           │                              │  "code-agent/run"      │                           │                        │
    │                           │                              │ ──────────────────────►│                           │                        │
    │                           │                              │                        │                           │                        │
    │                           │  6. Redirect to              │                        │                           │                        │
    │                           │  /projects/{id}              │                        │                           │                        │
    │                           │◄─────────────────────────────│                        │                           │                        │
    │                           │                              │                        │  7. Tạo E2B Sandbox       │                        │
    │  7. Thấy loading          │                              │                        │ ──────────────────────────────────────────────────►│
    │  (polling mỗi 2s)        │                              │                        │                           │                        │
    │                           │                              │                        │  8. Lấy lịch sử           │                        │
    │                           │                              │                        │  tin nhắn (5 msgs)        │                        │
    │                           │                              │                        │                           │                        │
    │                           │                              │                        │  9. Gửi prompt            │                        │
    │                           │                              │                        │  + system prompt          │                        │
    │                           │                              │                        │ ────────────────────────►│                        │
    │                           │                              │                        │                           │                        │
    │                           │                              │                        │                           │  10. AI gọi tools:      │
    │                           │                              │                        │                           │  - terminal (npm install)│
    │                           │                              │                        │                           │  - createOrUpdateFile   │
    │                           │                              │                        │                           │  - readFiles            │
    │                           │                              │                        │                           │ ──────────────────────►│
    │                           │                              │                        │                           │                        │
    │                           │                              │                        │                           │  (lặp lại tối đa       │
    │                           │                              │                        │                           │   15 iterations)       │
    │                           │                              │                        │                           │                        │
    │                           │                              │                        │  11. AI trả về            │                        │
    │                           │                              │                        │  <task_summary>           │                        │
    │                           │                              │                        │◄─────────────────────────│                        │
    │                           │                              │                        │                           │                        │
    │                           │                              │                        │  12. Sinh response        │                        │
    │                           │                              │                        │  + fragment title         │                        │
    │                           │                              │                        │  (GPT-4o, đa ngôn ngữ)   │                        │
    │                           │                              │                        │                           │                        │
    │                           │                              │                        │  13. Lưu Message          │                        │
    │                           │                              │                        │  ASSISTANT + Fragment     │                        │
    │                           │                              │                        │  vào Database             │                        │
    │                           │                              │                        │                           │                        │
    │  14. Polling phát hiện    │  messages.getMany            │                        │                           │                        │
    │  tin nhắn mới             │ ────────────────────────────►│                        │                           │                        │
    │                           │◄─────────────────────────────│                        │                           │                        │
    │                           │                              │                        │                           │                        │
    │  15. Hiển thị kết quả     │                              │                        │                           │                        │
    │  + Preview sandbox        │                              │                        │                           │                        │
    │◄──────────────────────────│                              │                        │                           │                        │
```

### 5.2 Luồng gửi tin nhắn tiếp theo (trong project đã tồn tại)

```
Người dùng          Frontend                Backend (tRPC)           Inngest              Database
    │                  │                         │                      │                     │
    │ 1. Gửi tin nhắn  │                         │                      │                     │
    │ ────────────────►│                         │                      │                     │
    │                  │ 2. messages.create       │                      │                     │
    │                  │ ──────────────────────►│                      │                     │
    │                  │                         │ 3. consumeCredits()  │                     │
    │                  │                         │ ───────────────────────────────────────────►│
    │                  │                         │                      │                     │
    │                  │                         │ 4. Tạo Message USER  │                     │
    │                  │                         │ ───────────────────────────────────────────►│
    │                  │                         │                      │                     │
    │                  │                         │ 5. inngest.send()    │                     │
    │                  │                         │ "code-agent/run"     │                     │
    │                  │                         │ ───────────────────►│                     │
    │                  │                         │                      │                     │
    │                  │ 6. Return message        │                      │                     │
    │                  │◄──────────────────────│                      │                     │
    │                  │                         │                      │                     │
    │ 7. UI hiện       │ 8. Polling mỗi 2s       │                      │ 9. AI xử lý        │
    │ loading +        │ messages.getMany         │                      │ và lưu kết quả     │
    │ nút Stop         │ ──────────────────────►│                      │ ──────────────────►│
    │                  │                         │                      │                     │
    │ 10. Kết quả      │                         │                      │                     │
    │ hiển thị         │◄─────────(khi có message ASSISTANT mới)────────│                     │
```

### 5.3 Luồng Dừng (Stop) và Tiếp tục (Continue)

```
=== LUỒNG DỪNG (STOP) ===

Người dùng          Frontend                Backend (tRPC)           Inngest              Database
    │                  │                         │                      │                     │
    │ 1. Click "Stop"  │                         │                      │                     │
    │ ────────────────►│                         │                      │                     │
    │                  │ 2. messages.stop         │                      │                     │
    │                  │ ──────────────────────►│                      │                     │
    │                  │                         │ 3. Kiểm tra last     │                     │
    │                  │                         │ message = USER       │                     │
    │                  │                         │ ───────────────────────────────────────────►│
    │                  │                         │                      │                     │
    │                  │                         │ 4. inngest.send()    │                     │
    │                  │                         │ "code-agent/cancel"  │                     │
    │                  │                         │ ───────────────────►│                     │
    │                  │                         │                      │ 5. Hủy function     │
    │                  │                         │                      │ đang chạy           │
    │                  │                         │                      │ (cancelOn match     │
    │                  │                         │                      │  projectId)         │
    │                  │                         │                      │                     │
    │                  │                         │ 6. Tạo Message       │                     │
    │                  │                         │ ASSISTANT/ERROR      │                     │
    │                  │                         │ "Generation stopped" │                     │
    │                  │                         │ ───────────────────────────────────────────►│
    │                  │                         │                      │                     │
    │ 7. UI hiện       │◄──────────────────────│                      │                     │
    │ nút "Continue"   │                         │                      │                     │

=== LUỒNG TIẾP TỤC (CONTINUE) ===

Người dùng          Frontend                Backend (tRPC)           Inngest              Database
    │                  │                         │                      │                     │
    │ 1. Click         │                         │                      │                     │
    │ "Continue"       │                         │                      │                     │
    │ ────────────────►│                         │                      │                     │
    │                  │ 2. messages              │                      │                     │
    │                  │ .continueGeneration      │                      │                     │
    │                  │ ──────────────────────►│                      │                     │
    │                  │                         │ 3. Xóa message       │                     │
    │                  │                         │ "Generation stopped" │                     │
    │                  │                         │ ───────────────────────────────────────────►│
    │                  │                         │                      │                     │
    │                  │                         │ 4. Tìm last USER     │                     │
    │                  │                         │ message              │                     │
    │                  │                         │ ───────────────────────────────────────────►│
    │                  │                         │                      │                     │
    │                  │                         │ 5. inngest.send()    │                     │
    │                  │                         │ "code-agent/run"     │                     │
    │                  │                         │ (dùng lại prompt cũ) │                     │
    │                  │                         │ ───────────────────►│                     │
    │                  │                         │                      │                     │
    │ 6. UI hiện       │◄──────────────────────│                      │ 7. AI chạy lại     │
    │ loading +        │                         │                      │ từ đầu             │
    │ nút Stop         │                         │                      │                     │

```

### 5.4 Luồng thanh toán PayOS (mua credit)

```
Người dùng            Frontend                 Backend (API Routes)           PayOS               Database
    │                    │                              │                       │                    │
    │ 1. Click Buy        │                              │                       │                    │
    │ credits (/pricing)  │                              │                       │                    │
    │ ───────────────────►│ 2. POST /api/payments/       │                       │                    │
    │                    │    payos/checkout            │                       │                    │
    │                    │ ────────────────────────────►│ 3. Tạo CreditPayment  │                    │
    │                    │                              │    (PENDING)          │                    │
    │                    │                              │ ─────────────────────►│                    │
    │                    │                              │ 4. Tạo payment link   │                    │
    │                    │                              │    PayOS              │                    │
    │                    │                              │ ─────────────────────►│                    │
    │                    │                              │ 5. Trả checkoutUrl    │                    │
    │                    │◄─────────────────────────────│                       │                    │
    │ 6. Redirect user    │                              │                       │                    │
    │ sang PayOS          │                              │                       │                    │
    │──────────────────────────────────────────────────────────────────────────►│                    │
    │                    │                              │                       │ 7. User thanh toán │
    │                    │                              │                       │                    │
    │                    │                              │ 8. PayOS gọi webhook  │                    │
    │                    │                              │    /api/webhooks/     │                    │
    │                    │                              │    payos              │                    │
    │                    │                              │◄──────────────────────│                    │
    │                    │                              │ 9. Verify webhook,    │                    │
    │                    │                              │    update payment,    │                    │
    │                    │                              │    applyPaidCredit    │                    │
    │                    │                              │    Payment (idempotent)│                   │
    │                    │                              │ ─────────────────────►│                    │
    │                    │                              │                       │                    │
    │ 10. PayOS redirect  │                              │                       │                    │
    │ về /api/payments/   │                              │                       │                    │
    │ payos/return        │                              │                       │                    │
    │──────────────────────────────────────────────────────────────────────────►│                    │
    │                    │                              │ 11. Server gọi PayOS  │                    │
    │                    │                              │     get(orderCode),   │                    │
    │                    │                              │     nếu PAID thì      │                    │
    │                    │                              │     applyPaidCredit   │                    │
    │                    │                              │     Payment           │                    │
    │                    │                              │ 12. Redirect /billing │                    │
    │◄─────────────────────────────────────────────────────────────────────────│                    │
```

**Ghi chú**:
- `applyPaidCreditPayment()` đảm bảo idempotency: cùng `orderCode` chỉ cộng credit một lần.
- Nếu user hủy thanh toán, `GET /api/payments/payos/cancel` cập nhật trạng thái `CANCELLED` và chuyển về `/pricing?payment=cancelled`.

### 5.5 Luồng Upload hình ảnh

```
Người dùng          Frontend                API Route (/api/upload)        Backend (tRPC)
    │                  │                         │                              │
    │ 1. Chọn file     │                         │                              │
    │ hình ảnh         │                         │                              │
    │ ────────────────►│                         │                              │
    │                  │ 2. POST /api/upload      │                              │
    │                  │ (FormData)               │                              │
    │                  │ ──────────────────────►│                              │
    │                  │                         │ 3. Validate file              │
    │                  │                         │ (type: image/*, max 5MB)      │
    │                  │                         │                              │
    │                  │                         │ 4. Convert → base64           │
    │                  │                         │ data:image/...;base64,...      │
    │                  │                         │                              │
    │                  │ 5. Return imageUrl       │                              │
    │                  │◄──────────────────────│                              │
    │                  │                         │                              │
    │ 6. Xem preview   │                         │                              │
    │ ────────────────►│                         │                              │
    │                  │ 7. Gửi message           │                              │
    │                  │ kèm imageUrl             │                              │
    │                  │ ─────────────────────────────────────────────────────►│
    │                  │                         │                              │
    │                  │                         │              8. Inngest nhận │
    │                  │                         │              hasImage=true    │
    │                  │                         │              → dùng GPT-4o   │
    │                  │                         │              + IMAGE_TO_CODE │
    │                  │                         │              _PROMPT         │
```

### 5.6 Luồng xác thực (Authentication)

```
Người dùng          Frontend               Clerk                  Middleware              Backend
    │                  │                      │                       │                      │
    │ 1. Truy cập      │                      │                       │                      │
    │ /projects/xxx    │                      │                       │                      │
    │ ────────────────►│                      │                       │                      │
    │                  │ ─────────────────────────────────────────────►│                      │
    │                  │                      │                       │ 2. clerkMiddleware    │
    │                  │                      │                       │ kiểm tra auth        │
    │                  │                      │ 3. Verify session      │                      │
    │                  │                      │◄──────────────────────│                      │
    │                  │                      │ ─────────────────────►│                      │
    │                  │                      │                       │                      │
    │                  │                      │                       │ 4. Nếu chưa login    │
    │                  │                      │                       │ → auth.protect()     │
    │ 5. Redirect      │◄─────────────────────────────────────────────│                      │
    │ /sign-in         │                      │                       │                      │
    │                  │                      │                       │                      │
    │ 6. Đăng nhập     │                      │                       │                      │
    │ (Google/GitHub/  │                      │                       │                      │
    │  Email)          │                      │                       │                      │
    │ ────────────────►│ ───────────────────►│                       │                      │
    │                  │                      │ 7. Tạo session         │                      │
    │                  │◄─────────────────────│                       │                      │
    │                  │                      │                       │                      │
    │ 8. Truy cập OK   │                      │                       │                      │
    │                  │ ─────────────────────────────────────────────────────────────────────►│
    │                  │                      │                       │       9. ctx.auth     │
    │                  │                      │                       │       .userId có      │
    │                  │                      │                       │       → xử lý request │
```

---

## 6. Các chức năng chính

### 6.1 Chat-to-Code (Sinh code từ chat)

**Mô tả**: Người dùng mô tả ý tưởng bằng ngôn ngữ tự nhiên, AI sẽ tự động sinh code Next.js hoàn chỉnh.

**Xử lý kỹ thuật**:
- Frontend gửi prompt qua `messages.create` (tRPC mutation)
- Backend kiểm tra credits, tạo message USER, gửi event `code-agent/run` đến Inngest
- Inngest tạo E2B Sandbox, load lịch sử 5 tin nhắn gần nhất
- AI Agent (GPT-4.1) nhận system prompt (`PROMPT`) chứa quy tắc coding chi tiết
- AI sử dụng 3 tools: `terminal` (chạy lệnh), `createOrUpdateFile` (ghi file), `readFiles` (đọc file)
- Network router kiểm tra `<task_summary>` sau mỗi iteration (tối đa 15 lần)
- Khi xong, sinh response message (đa ngôn ngữ) + fragment title
- Lưu Message ASSISTANT + Fragment vào database

**Model AI sử dụng**:
- `gpt-4.1`: Cho text prompt (sinh code chính xác hơn)
- `gpt-4o`: Cho image prompt (hỗ trợ vision) và sinh response/title

### 6.2 Image-to-Code (Sinh code từ hình ảnh)

**Mô tả**: Người dùng tải ảnh thiết kế UI, AI phân tích và sinh code tương ứng.

**Xử lý kỹ thuật**:
- Ảnh được upload qua `/api/upload` → chuyển thành base64 data URL
- Khi gửi message, `imageUrl` được lưu trong database (không gửi trực tiếp qua Inngest để tránh giới hạn 256KB)
- Inngest function phát hiện `hasImage=true` → lấy `imageUrl` từ database
- Sử dụng GPT-4o (hỗ trợ vision) với `IMAGE_TO_CODE_PROMPT`
- Gửi message dạng multimodal: `[{type: "text"}, {type: "image_url"}]`

### 6.3 Live Preview (Xem trước trực tiếp)

**Mô tả**: Kết quả code được chạy và hiển thị trực tiếp trong trình duyệt.

**Xử lý kỹ thuật**:
- E2B Sandbox chạy Next.js dev server trên port 3000
- Sau khi AI hoàn thành, lấy sandbox URL: `https://{host}`
- Frontend embed sandbox URL trong iframe (`FragmentWeb` component)
- Hỗ trợ chế độ Preview (xem demo) và Code (xem source code)
- Timeout sandbox: 30 phút

### 6.4 Dừng và Tiếp tục (Stop/Continue)

**Mô tả**: Người dùng có thể dừng quá trình sinh code đang chạy và tiếp tục lại sau.

**Xử lý kỹ thuật**:
- **Stop**: Gửi event `code-agent/cancel` → Inngest `cancelOn` khớp `projectId` → hủy function đang chạy → tạo message ERROR
- **Continue**: Xóa message ERROR → tìm message USER cuối cùng → gửi lại event `code-agent/run` với cùng prompt
- Frontend: Nút Stop hiện khi đang generate, nút Continue hiện khi có message ERROR "stopped"

### 6.5 Hỗ trợ đa ngôn ngữ

**Mô tả**: AI tự động phát hiện ngôn ngữ của người dùng và trả lời bằng ngôn ngữ tương ứng.

**Xử lý kỹ thuật**:
- `RESPONSE_PROMPT` chứa chỉ dẫn: *"Reply in the SAME LANGUAGE as the user's message"*
- `FRAGMENT_TITLE_PROMPT` cũng sinh title theo ngôn ngữ user
- Truyền message gốc của user kèm task summary đến response/title generators
- Prompt chính (`PROMPT` cho code agent) vẫn giữ tiếng Anh để đảm bảo chất lượng code

### 6.6 Quản lý Usage (Giới hạn sử dụng)

**Mô tả**: Hệ thống giới hạn số lần sinh code bằng credit. Mỗi prompt tiêu thụ 1 credit. Free credits reset theo chu kỳ, còn paid credits mua qua PayOS không reset và được dùng trước.

**Xử lý kỹ thuật**:
- Sử dụng `rate-limiter-flexible` với Prisma adapter cho free quota
- **Free quota**: 30 credits / 30 ngày, lưu tại bảng `Usage`
- **Paid credits**: lưu tại bảng `CreditBalance`, không tự reset
- Mỗi lần sinh code tiêu thụ 1 credit
- Hệ thống trừ paid credits trước; khi paid credits về 0, user tự quay về free quota
- Kiểm tra credits trước khi tạo message (`consumeCredits()`)
- Pricing page tạo PayOS checkout link cho gói 20.000 VND = 100 credits
- Trang `/billing` hiển thị tài khoản, số credit còn lại và lịch sử thanh toán

### 6.7 Thanh toán PayOS và Billing

**Mô tả**: Người dùng có thể mua gói credit một lần qua PayOS. Sau khi thanh toán thành công, credit được cộng dồn vào paid balance và không hết hạn theo chu kỳ free quota.

**Xử lý kỹ thuật**:
- API `POST /api/payments/payos/checkout`: tạo `CreditPayment` trạng thái PENDING, gọi PayOS tạo payment link, trả về `checkoutUrl`
- API `GET /api/payments/payos/return`: khi user quay lại từ PayOS, server kiểm tra trạng thái order và chuyển về `/billing`
- API `POST /api/webhooks/payos`: xác thực webhook PayOS, ghi nhận đơn PAID và cộng credit
- Hàm `applyPaidCreditPayment()` đảm bảo idempotency: một `orderCode` chỉ được cộng credit một lần
- `CreditPayment` lưu log thanh toán để admin đối soát
- `CreditBalance` lưu số paid credits còn lại theo user

### 6.8 Tải xuống dự án (Download)

**Mô tả**: Người dùng có thể tải toàn bộ code đã sinh thành file ZIP.

**Xử lý kỹ thuật**:
- API route: `GET /api/projects/{projectId}/download`
- Sử dụng thư viện `jszip` để đóng gói các file từ Fragment
- Trả về file `.zip` cho client tải xuống

### 6.9 Admin Dashboard

**Mô tả**: Trang quản trị cho admin xem thống kê hệ thống.

**Xử lý kỹ thuật**:
- Route `/admin` được bảo vệ bởi middleware (kiểm tra role = "admin")
- Hiển thị: thống kê users, projects, biểu đồ hoạt động
- Tab Payments hiển thị payment logs từ `CreditPayment`: user, email, orderCode, trạng thái, số tiền, credits, thời gian tạo/thanh toán
- Admin có thể filter payment logs theo trạng thái và tìm kiếm theo user/description
- Sử dụng `recharts` cho biểu đồ
- Role được lấy từ Clerk session claims (`metadata.role`)

### 6.10 Scroll thông minh trong chat

**Mô tả**: Chat tự động scroll xuống khi có tin nhắn mới, nhưng giữ nguyên vị trí khi người dùng đang đọc lịch sử.

**Xử lý kỹ thuật**:
- Theo dõi vị trí scroll với `isUserNearBottomRef` (ngưỡng 100px)
- Chỉ auto-scroll khi: có tin nhắn mới thực sự (số lượng tăng) VÀ (user đang ở gần cuối HOẶC vừa gửi tin nhắn)
- Không scroll khi polling refetch mà không có tin nhắn mới

---

## 7. Cấu trúc thư mục dự án

```
u_vibe/
├── prisma/
│   └── schema.prisma              # Schema cơ sở dữ liệu
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (home)/                # Route group trang chủ
│   │   │   ├── page.tsx           # Trang chủ (form + danh sách project)
│   │   │   ├── layout.tsx         # Layout trang chủ
│   │   │   ├── pricing/           # Trang mua credit qua PayOS
│   │   │   ├── billing/           # Trang tài khoản, credit, lịch sử thanh toán
│   │   │   ├── sign-in/           # Trang đăng nhập (Clerk)
│   │   │   └── sign-up/           # Trang đăng ký (Clerk)
│   │   │
│   │   ├── projects/
│   │   │   └── [projectId]/
│   │   │       ├── page.tsx       # Trang editor project
│   │   │       └── metadata.ts    # SEO metadata
│   │   │
│   │   ├── admin/                 # Trang quản trị
│   │   │   ├── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── api/
│   │   │   ├── inngest/route.ts   # Inngest webhook endpoint
│   │   │   ├── trpc/[trpc]/       # tRPC API handler
│   │   │   ├── upload/route.ts    # API upload hình ảnh
│   │   │   ├── payments/payos/    # PayOS checkout/return/cancel
│   │   │   ├── webhooks/payos/    # PayOS webhook endpoint
│   │   │   └── projects/          # API download project
│   │   │
│   │   ├── layout.tsx             # Root layout (providers, themes)
│   │   ├── error.tsx              # Error boundary
│   │   └── sitemap.ts             # SEO sitemap
│   │
│   ├── modules/                   # Feature modules
│   │   ├── home/
│   │   │   ├── components/
│   │   │   │   ├── navbar.tsx
│   │   │   │   ├── project-form.tsx    # Form tạo project
│   │   │   │   └── project-list.tsx    # Danh sách projects
│   │   │   └── constants.ts            # Template prompts
│   │   │
│   │   ├── messages/
│   │   │   └── server/
│   │   │       └── procedures.ts  # tRPC: getMany, create, stop, continue
│   │   │
│   │   ├── projects/
│   │   │   ├── server/
│   │   │   │   └── procedures.ts  # tRPC: getOne, getMany, create
│   │   │   └── ui/
│   │   │       ├── components/
│   │   │       │   ├── messages-container.tsx  # Container chat + Stop/Continue
│   │   │       │   ├── message-card.tsx        # Hiển thị tin nhắn
│   │   │       │   ├── message-form.tsx        # Form gửi tin nhắn
│   │   │       │   ├── message-loading.tsx     # Loading animation
│   │   │       │   ├── fragment-web.tsx        # Iframe preview sandbox
│   │   │       │   ├── project-header.tsx      # Header project
│   │   │       │   └── usage.tsx               # Hiển thị usage
│   │   │       └── views/
│   │   │           └── project-view.tsx        # View chính (resizable panels)
│   │   │
│   │   └── usage/
│   │       └── server/
│   │           └── procedures.ts  # tRPC: status
│   │
│   ├── inngest/                   # Inngest (AI Agent)
│   │   ├── client.ts              # Inngest client
│   │   ├── functions.ts           # Code Agent function (core logic)
│   │   ├── types.ts               # Constants (timeout)
│   │   └── untils.ts              # Utilities (getSandbox, parseOutput)
│   │
│   ├── trpc/                      # tRPC configuration
│   │   ├── init.ts                # tRPC initialization + middleware
│   │   ├── client.tsx             # tRPC React client provider
│   │   ├── server.tsx             # tRPC server caller
│   │   ├── query-client.ts        # React Query client config
│   │   └── routers/
│   │       ├── _app.ts            # Root router (merge all routers)
│   │       ├── admin.ts           # Admin router
│   │       └── billing.ts         # Billing router
│   │
│   ├── lib/                       # Shared utilities
│   │   ├── db.ts                  # Prisma client (singleton)
│   │   ├── auth.ts                # Auth utilities
│   │   ├── usage.ts               # Usage/credits system
│   │   ├── payos.ts               # PayOS SDK client
│   │   ├── payments/              # Credit pack + apply payment utilities
│   │   ├── metadata.ts            # SEO metadata generator
│   │   ├── utils.ts               # General utilities (cn)
│   │   └── download-utils.ts      # ZIP download utilities
│   │
│   ├── components/                # Shared UI components
│   │   ├── ui/                    # Shadcn UI components
│   │   ├── admin/                 # Admin dashboard components
│   │   ├── code-view/             # Code viewer component
│   │   ├── logo.tsx
│   │   ├── file-explorer.tsx      # File tree explorer
│   │   └── ...
│   │
│   ├── contexts/                  # React contexts
│   │   └── theme-context.tsx
│   │
│   ├── hooks/                     # Custom React hooks
│   │   ├── use-mobile.ts
│   │   ├── use-scroll.ts
│   │   └── use-current-theme.ts
│   │
│   ├── promt.ts                   # AI System Prompts
│   ├── middleware.ts              # Clerk auth middleware
│   └── types.ts                   # TypeScript type definitions
│
├── public/                        # Static assets
├── docs/                          # Tài liệu dự án
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

---

## 8. Xử lý bảo mật và phân quyền

### 8.1 Xác thực (Authentication)

- **Provider**: Clerk (hỗ trợ Google, GitHub, Email)
- **Middleware**: `clerkMiddleware` chặn tất cả routes không public
- **Public routes**: `/`, `/sign-in`, `/sign-up`, `/api`, `/pricing`
- **Protected routes**: `/projects/*`, `/admin/*`

### 8.2 Phân quyền (Authorization)

- **User thường**: Truy cập projects của mình, tạo/xem/download
- **Admin**: Truy cập thêm `/admin` dashboard
- **Role check**: Lấy từ Clerk session claims (`metadata.role`)
- **Data isolation**: Mọi query đều filter theo `userId` từ auth context

### 8.3 Bảo vệ API

- **tRPC**: `protectedProcedure` middleware kiểm tra `ctx.auth.userId`
- **API Routes**: Kiểm tra `auth()` từ Clerk
- **Rate Limiting**: `rate-limiter-flexible` giới hạn usage theo user
- **Input Validation**: Zod schema cho tất cả input

### 8.4 Bảo mật dữ liệu

- **Database**: PostgreSQL với Prisma ORM (parameterized queries, chống SQL injection)
- **File upload**: Validate type (image/*) và size (max 5MB)
- **Sandbox isolation**: Code chạy trong E2B Sandbox riêng biệt, không ảnh hưởng server chính
- **Inngest events**: Chỉ xử lý events từ Inngest Cloud (verified webhook)

---

## 9. Triển khai và vận hành

### 9.1 Môi trường triển khai

| Thành phần | Nền tảng |
|---|---|
| Frontend + API | Vercel |
| Database | PostgreSQL (cloud) |
| Background Jobs | Inngest Cloud |
| Code Sandbox | E2B Cloud |
| Authentication | Clerk |
| Payments | PayOS |
| AI Model | OpenAI API |

### 9.2 Biến môi trường cần thiết

| Biến | Mô tả |
|---|---|
| `DATABASE_URL` | Connection string PostgreSQL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `OPENAI_API_KEY` | OpenAI API key |
| `E2B_API_KEY` | E2B Sandbox API key |
| `INNGEST_SIGNING_KEY` | Inngest webhook signing key |
| `INNGEST_EVENT_KEY` | Inngest event key |
| `NEXT_PUBLIC_APP_URL` | URL ứng dụng |
| `NEXT_PUBLIC_SITE_URL` | URL site (SEO) |
| `PAYOS_CLIENT_ID` | PayOS client ID |
| `PAYOS_API_KEY` | PayOS API key |
| `PAYOS_CHECKSUM_KEY` | PayOS checksum key để xác thực webhook |

### 9.3 PayOS Webhook

- Webhook URL production: `https://<domain>/api/webhooks/payos`
- Khi test local cần public tunnel (ví dụ ngrok/cloudflared) vì PayOS phải gọi được endpoint qua internet
- `NEXT_PUBLIC_APP_URL` cần trỏ đúng domain/tunnel để PayOS redirect về `/api/payments/payos/return`
- Thanh toán thành công sẽ đưa user về `/billing` để xem credit và payment history

### 9.4 CI/CD

- **Platform**: Vercel (tự động deploy khi push lên GitHub)
- **Preview**: Mỗi PR tạo preview deployment riêng
- **Production**: Deploy tự động khi merge vào `main`
- **Build**: `next build` (bao gồm `prisma generate` ở postinstall)

---

## 10. Tổng kết

### Điểm mạnh của dự án:
1. **Kiến trúc hiện đại**: Next.js 15 App Router + tRPC + Inngest event-driven
2. **Type-safe toàn bộ**: TypeScript + tRPC + Zod validation từ frontend đến backend
3. **AI đa năng**: Hỗ trợ 2 đầu vào (text, image) với prompt chuyên biệt
4. **Sandbox an toàn**: Code chạy trong E2B isolated sandbox
5. **UX tốt**: Real-time polling, scroll thông minh, stop/continue, đa ngôn ngữ
6. **Thanh toán nội địa**: PayOS credit pack, billing history, admin payment logs
7. **Scalable**: Event-driven architecture cho phép xử lý nhiều request song song

### Công nghệ cốt lõi:
- **Frontend**: Next.js + React + TanStack React Query + Shadcn UI
- **Backend**: tRPC + Prisma + PostgreSQL
- **AI Pipeline**: Inngest + @inngest/agent-kit + OpenAI (GPT-4.1/GPT-4o)
- **Sandbox**: E2B Code Interpreter
- **Auth**: Clerk
- **Payments**: PayOS

---

*Tài liệu được tạo cho mục đích báo cáo dự án.*
