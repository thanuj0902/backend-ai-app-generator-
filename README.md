# Backend — API & Middleware

**Member 1:** Backend API architecture, auth, validation, error handling, structured logging, rate limiting, project/workflow/generation CRUD, AI integration, frontend API client.

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Next.js 15 (App Router), Node.js, TypeScript |
| Database | PostgreSQL (Neon) + Prisma ORM |
| Auth | Clerk (webhook sync) + custom auth middleware |
| AI | Gemini 2.0 Flash / Groq (Llama 3.3) |

## Project Structure

```
src/
├── api/                        # API handler functions
│   ├── index.ts                # Barrel exports
│   ├── auth.ts                 # GET /api/me, POST /api/webhooks/clerk
│   ├── projects.ts             # CRUD for /api/projects
│   ├── workflows.ts            # CRUD for /api/workflows
│   ├── generation.ts           # POST /api/generate, GET /api/generate/:id
│   └── client.ts               # Typed frontend API client
├── services/
│   └── ai.ts                   # AI provider (Gemini / Groq) with code generation
├── middleware/                  # Middleware pipeline
│   ├── auth.ts                 # getAuthUser() — Bearer token or x-clerk-user-id
│   ├── errors.ts               # Error classes + handleApiError()
│   ├── logging.ts              # Structured JSON logging with levels
│   ├── rate-limit.ts           # Tiered rate limiting (per-user, per-IP, per-endpoint)
│   └── validation.ts           # requireFields, parseBody, sanitize
├── server/                     # Server infrastructure
│   ├── index.ts                # Barrel exports
│   ├── config.ts               # Pagination, response builders, ETag
│   ├── db.ts                   # Prisma singleton (Neon)
│   └── utils.ts                # slugify
├── app/api/                    # Next.js route wrappers
│   ├── me/route.ts
│   ├── projects/route.ts + [id]/route.ts
│   ├── workflows/route.ts + [id]/route.ts
│   ├── generate/route.ts + [id]/route.ts
│   └── webhooks/clerk/route.ts
└── middleware.ts               # Root Clerk middleware

prisma/schema.prisma            # User, Organization, OrgMember, Project, Workflow, Generation
```

## API Endpoints

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/me` | Current user profile + stats |
| `POST` | `/api/webhooks/clerk` | Clerk webhook (sync users, orgs, memberships) |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | List projects (paginated, `?search=&page=&limit=`) |
| `POST` | `/api/projects` | Create project (`name` required) |
| `GET` | `/api/projects/:id` | Get project details |
| `PATCH` | `/api/projects/:id` | Update project (name, description, status) |
| `DELETE` | `/api/projects/:id` | Delete project |

### Workflows

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/workflows` | List workflows (`?projectId=` filter) |
| `POST` | `/api/workflows` | Create workflow (`projectId`, `name`, `steps` required) |
| `GET` | `/api/workflows/:id` | Get workflow details |
| `PATCH` | `/api/workflows/:id` | Update workflow |
| `DELETE` | `/api/workflows/:id` | Delete workflow |

### Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/generate` | Start AI generation (`projectId`, `prompt` required) |
| `GET` | `/api/generate` | List generations (`?projectId=` filter) |
| `GET` | `/api/generate/:id` | Get generation status + result |

## Middleware Pipeline

Every API request runs through this chain:

```
Request → Logging → Rate Limit → Auth → Validation → Handler → Response
```

| Middleware | What it does | Error response |
|------------|-------------|----------------|
| **Logging** | Structured JSON logs with level, timestamp | — |
| **Rate Limit** | Tiered: 60/min default, 20/min auth, 5/min generate, 120/min webhook | `429 Too Many Requests` |
| **Auth** | Validates `Authorization: Bearer <jwt>` or `x-clerk-user-id` header | `401 Unauthorized` |
| **Validation** | Checks required fields exist and are non-empty | `400 Field "name" is required` |
| **Error Handler** | Catches all errors, returns proper HTTP codes | `400`, `401`, `403`, `404`, `429`, `500` |

## AI Code Generation

The generation API uses either **Gemini 2.0 Flash** or **Groq (Llama 3.3 70B)** to generate full application code from a text prompt. Responses include:

- `files` — Array of `{ path, content, language }` for the generated project
- `dependencies` — Required npm packages
- `structure` — Architecture summary and entry point

Generation runs asynchronously — `POST /api/generate` returns immediately with a `202` and a generation ID. Poll `GET /api/generate/:id` for status (`PENDING → GENERATING → COMPLETE | ERROR`).

## Frontend API Client

`src/api/client.ts` provides a typed `ApiClient` class with methods for every endpoint:

```typescript
import { api } from "@/api/client"

api.setToken("jwt-token")
const { data } = await api.listProjects({ page: 1 })
const project = await api.createProject({ name: "My App" })
const gen = await api.startGeneration({ projectId: "id", prompt: "A todo app" })
```

## API Optimization

- **ETag support** — List endpoints return `ETag` headers; clients can send `If-None-Match` for `304 Not Modified`
- **Pagination** — Consistent paginated responses across all list endpoints
- **Structured logging** — JSON-formatted logs with levels

## How to Run

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Server starts at `http://localhost:3000`.

## Testing

Create a test user (one-time):

```powershell
$body = '{"type":"user.created","data":{"id":"dev-user","email_addresses":[{"email_address":"test@test.com"}],"first_name":"Dev","last_name":"User"}}'
Invoke-RestMethod -Uri "http://localhost:3000/api/webhooks/clerk" -Method Post -ContentType "application/json" -Body $body
```

Test all endpoints:

```powershell
$headers = @{"x-clerk-user-id"="dev-user"}

# Create project
Invoke-RestMethod -Uri "http://localhost:3000/api/projects" -Method Post -ContentType "application/json" -Headers $headers -Body '{"name":"My App"}'

# List projects
Invoke-RestMethod -Uri "http://localhost:3000/api/projects" -Headers $headers

# Get current user
Invoke-RestMethod -Uri "http://localhost:3000/api/me" -Headers $headers

# Create workflow
Invoke-RestMethod -Uri "http://localhost:3000/api/workflows" -Method Post -ContentType "application/json" -Headers $headers -Body '{"projectId":"<project-id>","name":"Deploy Flow","steps":[{"action":"build"},{"action":"deploy"}]}'

# Start generation
Invoke-RestMethod -Uri "http://localhost:3000/api/generate" -Method Post -ContentType "application/json" -Headers $headers -Body '{"projectId":"<project-id>","prompt":"A React todo app with local storage"}'
```

## Database Models

```
User ──┬── OrganizationMember ── Organization
       ├── Project ──── Workflow
       ├── Project ──── Generation
       └── Workflow
```

- **User** — linked to Clerk ID, has projects and workflows
- **Organization** — multi-tenant group
- **OrganizationMember** — user membership with role (OWNER, ADMIN, MEMBER)
- **Project** — core entity, belongs to user or organization
- **Workflow** — belongs to project, JSON steps + trigger config
- **Generation** — tracks AI generation jobs (PENDING → GENERATING → COMPLETE | ERROR)

## Build Status

```
✓ Compiled successfully
✓ Linting and type checking passed
✓ 8 API routes generated
✓ 0 errors, 0 warnings
```
