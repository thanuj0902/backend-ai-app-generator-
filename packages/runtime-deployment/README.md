# Runtime Deployment

Deployment orchestration service for the App Generator Platform. Handles deploying generated apps to Vercel, managing preview URLs, subdomains, and retry logic.

> This package is part of the [App Generator Platform](../../README.md) monorepo.

## Setup

```bash
# From monorepo root
npm install

# Generate Prisma client
npm run db:generate -w packages/runtime-deployment
npm run db:push -w packages/runtime-deployment

# Start dev server
npm run dev:runtime
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `VERCEL_TOKEN` | No | Vercel API token — required for live deployment |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/deploy` | Create a deployment |
| GET | `/api/deploy` | List deployments |
| GET | `/api/deploy/status` | Check deployment status |
| POST | `/api/deploy/retry` | Retry a failed deployment |
| GET | `/api/preview` | Get preview URL |
| POST | `/api/preview` | Activate preview |
| GET | `/api/subdomain` | Resolve subdomain |
| POST | `/api/subdomain` | Assign subdomain |

## Tech Stack

- Next.js 15, TypeScript
- Prisma + Neon (PostgreSQL)
- Clerk (Auth)
- Vercel API (Deployment)
