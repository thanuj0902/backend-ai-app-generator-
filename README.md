# App Generator Platform

Config-driven AI app generator with runtime deployment orchestration. A monorepo containing two services that work together to generate, deploy, and manage full-stack web applications from JSON configuration.

## Packages

| Package | Description | Stack |
|---------|-------------|-------|
| [`@appgen/api`](packages/api/) | Core API — config parsing, AI code generation, workflow management | Next.js 15, Prisma, Neon (PostgreSQL), Clerk Auth, Gemini AI |
| [`@appgen/runtime-deployment`](packages/runtime-deployment/) | Deployment orchestration — Vercel deployment, preview URLs, subdomain management, retry logic | Next.js 15, Prisma, Vercel API |

## Architecture

```
User Config (JSON) → API (packages/api)
                         ├── Config Parser → validates & normalizes
                         ├── Schema Factory → creates DB models
                         ├── Route Factory → generates REST endpoints
                         ├── AI Service → generates application code
                         └── Generation → stores generated output
                                              │
                                              ▼
                         Runtime Deployment (packages/runtime-deployment)
                              ├── Deploy → Vercel API
                              ├── Preview → generates preview URL
                              ├── Subdomain → assigns subdomain
                              └── Retry → handles failures
```

## Quick Start

```bash
# Install all dependencies
npm install

# Generate Prisma clients & push schemas
npm run db:generate
npm run db:push

# Start API service
npm run dev:api

# Start runtime-deployment service (new terminal)
npm run dev:runtime
```

## Environment Variables

### packages/api
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |

### packages/runtime-deployment
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `VERCEL_TOKEN` | No | Vercel API token (required for live deployment) |

## Features

### API (packages/api)
- **Config Parser** — Accepts partial/incomplete configs, fills defaults, logs warnings
- **Dynamic Route Factory** — Creates Express-like routes from config definition
- **Dynamic Schema Factory** — Generates Prisma models from config definition
- **AI Code Generation** — Uses Gemini 2.0 Flash / Groq (Llama 3.3) to generate full apps
- **Auth** — Clerk integration with JWT, orgs, multi-tenancy
- **Middleware Pipeline** — Logging → Rate Limit → Auth → Validation → Handler
- **CSV Import** — Import data with column mapping
- **i18n** — Multi-language support with config-driven translations
- **Notifications** — Event-based mock email notifications
- **ETag Support** — Conditional requests for API optimization

### Runtime Deployment (packages/runtime-deployment)
- **Deploy** — Deploy generated apps to Vercel via API
- **Preview URLs** — Generate preview deployments per PR/version
- **Subdomain Management** — Assign and resolve subdomains
- **Retry Logic** — Automatic retry with backoff for failed deployments
- **Status Tracking** — Real-time deployment status updates
- **Runtime Config** — Per-project environment variables and feature flags
- **Queue System** — Background job processing for deployments
