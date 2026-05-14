# Backend — API & Middleware

**Member 1:** Backend API architecture, auth, validation, error handling, logging, rate limiting, project & workflow CRUD.

## Stack

- **Runtime:** Next.js 15 (App Router), Node.js, TypeScript
- **Database:** PostgreSQL (Neon) + Prisma ORM
- **Auth:** Clerk (webhook sync) + custom auth middleware

## Project Structure

```
src/
├── api/                        # API handler functions
│   ├── auth.ts                 # GET /api/me, POST /api/webhooks/clerk
│   ├── projects.ts             # CRUD for /api/projects
│   └── workflows.ts            # CRUD for /api/workflows
├── middleware/                  # Middleware layer
│   ├── auth.ts                 # getAuthUser() — Bearer token or x-clerk-user-id
│   ├── errors.ts               # AppError classes + handleApiError()
│   ├── logging.ts              # requestLogger, logError
│   ├── rate-limit.ts           # rateLimitMiddleware (60 req/min per IP)
│   └── validation.ts           # requireFields, parseBody, validateEmail
├── server/                     # Server infrastructure
│   ├── config.ts               # Pagination helpers, response builders
│   ├── db.ts                   # Prisma singleton client
│   ├── index.ts                # Barrel exports
│   └── utils.ts                # slugify
├── app/api/                    # Next.js route wrappers (thin, delegates to src/api/)
│   ├── me/route.ts
│   ├── projects/route.ts + [id]/route.ts
│   ├── workflows/route.ts + [id]/route.ts
│   └── webhooks/clerk/route.ts
└── middleware.ts               # Root Clerk middleware (API routes are public)

prisma/schema.prisma            # User, Organization, OrganizationMember, Project, Workflow
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
| `GET` | `/api/projects` | List projects (paginated, searchable) |
| `POST` | `/api/projects` | Create project (`name` required) |
| `GET` | `/api/projects/:id` | Get project details |
| `PATCH` | `/api/projects/:id` | Update project |
| `DELETE` | `/api/projects/:id` | Delete project |

### Workflows

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/workflows` | List workflows (filterable by `?projectId=`) |
| `POST` | `/api/workflows` | Create workflow (`projectId`, `name`, `steps` required) |
| `GET` | `/api/workflows/:id` | Get workflow details |
| `PATCH` | `/api/workflows/:id` | Update workflow |
| `DELETE` | `/api/workflows/:id` | Delete workflow |

## Middleware

Every API handler runs through:

1. **Logging** — logs `[timestamp] METHOD /path` to console
2. **Rate limiting** — 60 requests/minute per IP, returns `429` when exceeded
3. **Auth** — validates via `Authorization: Bearer <jwt>` or `x-clerk-user-id` header, returns `401` if invalid
4. **Validation** — checks required fields, returns `400` with field name
5. **Error handling** — catches all errors, returns proper HTTP status codes (`400`, `401`, `403`, `404`, `429`, `500`)

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

Test endpoints:

```powershell
$headers = @{"x-clerk-user-id"="dev-user"}

# Create project
Invoke-RestMethod -Uri "http://localhost:3000/api/projects" -Method Post -ContentType "application/json" -Headers $headers -Body '{"name":"My App"}'

# List projects
Invoke-RestMethod -Uri "http://localhost:3000/api/projects" -Headers $headers

# Get current user
Invoke-RestMethod -Uri "http://localhost:3000/api/me" -Headers $headers
```

## Database Models

- **User** — linked to Clerk, has projects and workflows
- **Organization** — multi-tenant groups
- **OrganizationMember** — user-org membership with roles (OWNER, ADMIN, MEMBER)
- **Project** — core entity, belongs to user/org
- **Workflow** — belongs to project, stores JSON steps + trigger config
