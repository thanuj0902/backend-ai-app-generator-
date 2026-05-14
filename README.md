# Backend — API & Middleware

**Member 1:** Backend API architecture, auth, validation, error handling, logging, rate limiting, project & workflow CRUD.

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Next.js 15 (App Router), Node.js, TypeScript |
| Database | PostgreSQL (Neon) + Prisma ORM |
| Auth | Clerk (webhook sync) + custom auth middleware |

## Project Structure

```
src/
├── api/                        # API handler functions
│   ├── index.ts                # Barrel exports
│   ├── auth.ts                 # GET /api/me, POST /api/webhooks/clerk
│   ├── projects.ts             # CRUD for /api/projects
│   └── workflows.ts            # CRUD for /api/workflows
├── middleware/                  # Middleware layer
│   ├── auth.ts                 # getAuthUser() — Bearer token or x-clerk-user-id
│   ├── errors.ts               # Error classes + handleApiError()
│   ├── logging.ts              # requestLogger, logError
│   ├── rate-limit.ts           # 60 req/min per IP
│   └── validation.ts           # requireFields, parseBody, validateEmail
├── server/                     # Server infrastructure
│   ├── index.ts                # Barrel exports
│   ├── config.ts               # Pagination helpers, response builders
│   ├── db.ts                   # Prisma singleton (Neon)
│   └── utils.ts                # slugify
├── app/api/                    # Next.js route wrappers
│   ├── me/route.ts
│   ├── projects/route.ts + [id]/route.ts
│   ├── workflows/route.ts + [id]/route.ts
│   └── webhooks/clerk/route.ts
└── middleware.ts               # Root Clerk middleware

prisma/schema.prisma            # User, Organization, OrgMember, Project, Workflow
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

## Middleware Pipeline

Every API request runs through this chain:

```
Request → Logging → Rate Limit → Auth → Validation → Handler → Response
```

| Middleware | What it does | Error response |
|------------|-------------|----------------|
| **Logging** | Logs `[timestamp] METHOD /path` to console | — |
| **Rate Limit** | 60 requests/minute per IP | `429 Too Many Requests` |
| **Auth** | Validates `Authorization: Bearer <jwt>` or `x-clerk-user-id` header | `401 Unauthorized` |
| **Validation** | Checks required fields exist and are non-empty | `400 Field "name" is required` |
| **Error Handler** | Catches all errors, returns proper HTTP codes | `400`, `401`, `403`, `404`, `429`, `500` |

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
```

## Database Models

```
User ──┬── OrganizationMember ── Organization
       ├── Project ──── Workflow
       └── Workflow
```

- **User** — linked to Clerk ID, has projects and workflows
- **Organization** — multi-tenant group
- **OrganizationMember** — user membership with role (OWNER, ADMIN, MEMBER)
- **Project** — core entity, belongs to user or organization
- **Workflow** — belongs to project, JSON steps + trigger config

## Build Status

```
✓ Compiled successfully
✓ Linting and type checking passed
✓ 6 API routes generated
✓ 0 errors, 0 warnings
```
